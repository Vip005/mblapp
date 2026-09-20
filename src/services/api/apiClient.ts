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

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
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

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_CONFIG.BASE_URL}${normalizedEndpoint}`;

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
      await storage.removeAuthToken();
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
      const baseMsg =
        (typeof json === 'object' && (json?.message || json?.title || json?.error)) ||
        (typeof json === 'string' && json) ||
        `HTTP Error ${response.status}`;
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
