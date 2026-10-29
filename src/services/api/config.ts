// import { Platform } from 'react-native';

// /**
//  * Mobile API configuration.
//  *
//  * Can be overridden with EXPO_PUBLIC_API_URL in .env.
//  * For physical devices on local network, set DEV_LAN_IP or EXPO_PUBLIC_API_URL.
//  */
// const DEV_LAN_IP = ''; // e.g. '192.168.1.100'

// const getBaseUrl = (): string => {
//   if (process.env.EXPO_PUBLIC_API_URL) {
//     return process.env.EXPO_PUBLIC_API_URL;
//   }
//   if (DEV_LAN_IP) {
//     return `http://${DEV_LAN_IP}:5000`;
//   }
//   return Platform.select({
//     android: 'http://10.0.2.2:5000',
//     ios: 'http://localhost:5000',
//     default: 'http://localhost:5000',
//   })!;
// };

// export const API_CONFIG = {
//   BASE_URL: getBaseUrl(),
//   DEFAULT_STORE_ID: 4,
//   TIMEOUT_MS: 15000,
//   DEMO_PHONE: __DEV__ ? '9876543210' : '',
//   DEMO_OTP: __DEV__ ? '123456' : '',
// };


/**
 * Checks if a hostname belongs to a local development environment or loopback.
 */
export function isLocalOrLoopbackHost(hostname: string): boolean {
  const cleanHost = hostname.split(':')[0].toLowerCase();
  if (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '10.0.2.2' || // Android emulator loopback alias
    cleanHost.endsWith('.local')
  ) {
    return true;
  }
  // RFC 1918 Private IPv4 address checks for local dev LAN
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;
  return false;
}

/**
 * Enforces HTTPS for all remote network requests.
 * In production/release builds, plain HTTP is strictly disallowed and automatically upgraded to HTTPS.
 * In development, plain HTTP is permitted ONLY for local/loopback/private LAN hosts.
 */
export function enforceHttpsUrl(
  rawUrl: string,
  isDev: boolean = Boolean(typeof __DEV__ !== 'undefined' && __DEV__)
): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return 'https://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net';
  }

  if (trimmed.startsWith('http://')) {
    try {
      const parsed = new URL(trimmed);
      // In production release builds (!isDev), or for remote non-local hosts, upgrade to https://
      if (!isDev || !isLocalOrLoopbackHost(parsed.hostname)) {
        return trimmed.replace(/^http:\/\//i, 'https://');
      }
    } catch {
      // If URL parsing fails, default safely to https
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
  }

  // If no scheme was provided (e.g. "groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net"), prepend https://
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export const resolveApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const defaultUrl = 'https://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net';
  return enforceHttpsUrl(envUrl || defaultUrl);
};

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Controlled testing flag for OTP autofill & DEV conveniences.
 * 
 * - In local development (Expo Go / Metro dev server): __DEV__ is true.
 * - In preview/test APK builds: __DEV__ is false in release mode, so this testing
 *   configuration ensures OTP autofill works on real test devices until SMS provider integration.
 * - In final production: Set to false or toggle via EXPO_PUBLIC_TESTING_MODE.
 */
export const IS_TESTING_ENVIRONMENT: boolean =
  Boolean((typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_TESTING_MODE === 'true');

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT_MS: 15000,
  IS_TESTING_ENVIRONMENT,
};

export const getBaseUrl = (): string => {
  return API_BASE_URL;
};