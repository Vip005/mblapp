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


const resolveApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net';
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