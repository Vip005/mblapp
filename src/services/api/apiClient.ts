import { API_CONFIG } from './config';
import { storage, STORAGE_KEYS } from '../../utils/storage';

export interface ApiResponse<T = any> {
  isSuccess?: boolean;
  success?: boolean;
  statusCode?: number;
  result?: T;
  data?: T;
  message?: string;
}

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    return `${baseUrl}${cleanEndpoint.slice(4)}`;
  }

  return `${baseUrl}${cleanEndpoint}`;
}

// Single-flight refresh token promise so concurrent 401 requests share exactly one refresh call
let refreshPromise: Promise<string | null> | null = null;

export async function refreshCustomerSession(): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const storedRefreshToken = await storage.getRefreshToken();
    if (!storedRefreshToken) {
      return null;
    }

    const refreshUrl = buildApiUrl('/api/CustomerMaster/refresh');
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const res = data?.result;
    if (data?.isSuccess && res?.accessToken && res?.refreshToken) {
      await storage.saveAuthToken(res.accessToken);
      await storage.saveRefreshToken(res.refreshToken);
      return {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      };
    }
    return null;
  } catch (err) {
    console.warn('[apiClient] refreshCustomerSession failed:', err);
    return null;
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const token = await storage.getAuthToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = buildApiUrl(endpoint);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn(`[API] 401 Unauthorized for ${endpoint}`);

      const isAuthEndpoint =
        endpoint.includes('CustomerMaster/refresh') ||
        endpoint.includes('CustomerMaster/logout') ||
        endpoint.includes('CustomerMaster/verify-otp') ||
        endpoint.includes('CustomerMaster/send-otp');

      // If already a retry or an auth endpoint itself, do not attempt another refresh
      if (isRetry || isAuthEndpoint) {
        if (!isAuthEndpoint) {
          await storage.clearAuthSession();
          if (onUnauthorizedCallback) {
            onUnauthorizedCallback();
          }
        }
        throw new ApiError('Session expired. Please log in again.', 401);
      }

      // Single-flight refresh token mutex
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshResult = await refreshCustomerSession();
            return refreshResult?.accessToken ?? null;
          } catch {
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        // Retry the original request once with new token
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        return request<T>(endpoint, { ...options, headers: retryHeaders }, true);
      }

      // Refresh failed / expired / revoked
      await storage.clearAuthSession();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      throw new ApiError('Session expired. Please log in again.', 401);
    }

    const text = await response.text();
    let json: any = null;

    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }

    if (!response.ok) {
      let detailErrors: string[] = [];
      if (typeof json === 'object' && json?.errors && typeof json.errors === 'object') {
        detailErrors = Object.entries(json.errors)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : String(val)}`);
      }
      const serverDetail = typeof json === 'object' ? (json?.Detail || json?.detail) : null;
      const primaryMsg =
        (typeof json === 'object' && (json?.message || json?.title || json?.error)) ||
        (typeof json === 'string' && json) ||
        `HTTP Error ${response.status}`;
      const baseMsg = serverDetail && !primaryMsg.includes(serverDetail)
        ? `${primaryMsg}: ${serverDetail}`
        : primaryMsg;
      const errorMsg = detailErrors.length > 0 ? `${baseMsg} (${detailErrors.join('; ')})` : baseMsg;
      throw new ApiError(errorMsg, response.status, json);
    }

    // Unpack standard backend response envelope if present
    if (json && typeof json === 'object') {
      if ('isSuccess' in json) {
        if (!json.isSuccess && json.statusCode >= 400) {
          throw new ApiError(json.message || 'API operation failed', json.statusCode, json);
        }
        return (json.result !== undefined ? json.result : json) as T;
      }
      if ('success' in json && 'data' in json) {
        return json.data as T;
      }
    }

    return json as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Network request timed out. Please check backend connection.', 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error. Please check your connection.', 0);
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', headers }),

  post: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};
