import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@grocery_auth_token',
  USER: '@grocery_user',
  ONBOARDING_COMPLETED: '@grocery_onboarding_completed',
  CART: '@grocery_cart',
  WISHLIST: '@grocery_wishlist',
  ADDRESSES: '@grocery_addresses',
  ORDERS: '@grocery_orders',
  RECENT_SEARCHES: '@grocery_recent_searches',
  NOTIFICATIONS: '@grocery_notifications',
  SETTINGS: '@grocery_settings',
  SELECTED_STORE_ID: '@grocery_selected_store_id',
  customerAddresses: (id: string | number) => `@grocery_addresses_${id}`,
  customerCart: (id: string | number, storeId?: string | number | null) =>
    storeId ? `@grocery_cart_${id}_${storeId}` : `@grocery_cart_${id}`,
  guestCart: (storeId?: string | number | null) =>
    storeId ? `@grocery_cart_guest_${storeId}` : '@grocery_cart_guest',
  customerWishlist: (id: string | number) => `@grocery_wishlist_${id}`,
  customerNotifications: (id: string | number) => `@grocery_notifications_${id}`,
  customerOrders: (id: string | number) => `@grocery_orders_${id}`,
  customerOnboarding: (id: string | number) => `@grocery_onboarding_completed_${id}`,
} as const;

// SecureStore requires alphanumeric characters, '.', '-', and '_' (no '@')
const SECURE_ACCESS_TOKEN_KEY = 'grocery_auth_token';
const SECURE_REFRESH_TOKEN_KEY = 'grocery_refresh_token';
const SECURE_TOKEN_KEY = SECURE_ACCESS_TOKEN_KEY;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return AsyncStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      // Fallback silently if SecureStore fails
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
        return true;
      }
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch {
      return false;
    }
  },

  async deleteItem(key: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
        return true;
      }
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch {
      return false;
    }
  },
};

export const storage = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (key === STORAGE_KEYS.AUTH_TOKEN || key === SECURE_ACCESS_TOKEN_KEY) {
        const token = await getAuthToken();
        return (token ?? defaultValue) as T;
      }
      if (key === SECURE_REFRESH_TOKEN_KEY) {
        const token = await getRefreshToken();
        return (token ?? defaultValue) as T;
      }
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue !== null) {
        return JSON.parse(jsonValue) as T;
      }
      return defaultValue;
    } catch (e) {
      console.warn(`[Storage] Failed to get key "${key}":`, e);
      return defaultValue;
    }
  },

  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      if (key === STORAGE_KEYS.AUTH_TOKEN || key === SECURE_ACCESS_TOKEN_KEY || key === SECURE_REFRESH_TOKEN_KEY) {
        console.warn(`[Storage] Refusing to store sensitive token under plaintext AsyncStorage key "${key}". Routing to secureStorage.`);
        if (key === SECURE_REFRESH_TOKEN_KEY) {
          return saveRefreshToken(String(value));
        }
        return saveAuthToken(String(value));
      }
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to set key "${key}":`, e);
      return false;
    }
  },

  async remove(key: string): Promise<boolean> {
    try {
      if (key === STORAGE_KEYS.AUTH_TOKEN || key === SECURE_ACCESS_TOKEN_KEY) {
        return clearAuthToken();
      }
      if (key === SECURE_REFRESH_TOKEN_KEY) {
        return clearRefreshToken();
      }
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to remove key "${key}":`, e);
      return false;
    }
  },

  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (e) {
      console.warn('[Storage] Failed to clear storage:', e);
      return false;
    }
  },

  async clearCustomerData(customerId?: string | number | null): Promise<void> {
    try {
      const keysToRemove: string[] = [
        STORAGE_KEYS.CART,
        STORAGE_KEYS.WISHLIST,
        STORAGE_KEYS.ADDRESSES,
        STORAGE_KEYS.NOTIFICATIONS,
        STORAGE_KEYS.ORDERS,
      ];
      if (customerId) {
        keysToRemove.push(
          STORAGE_KEYS.customerAddresses(customerId),
          STORAGE_KEYS.customerCart(customerId),
          STORAGE_KEYS.customerWishlist(customerId),
          STORAGE_KEYS.customerNotifications(customerId),
          STORAGE_KEYS.customerOrders(customerId),
          STORAGE_KEYS.customerOnboarding(customerId)
        );
      }
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (e) {
      console.warn('[Storage] Failed to clear customer data:', e);
    }
  },

  /**
   * Secure Auth Token Management
   * Uses expo-secure-store on native platforms with legacy migration.
   */
  getAuthToken,
  setAuthToken: saveAuthToken,
  saveAuthToken,
  clearAuthToken,
  removeAuthToken: clearAuthToken,

  saveRefreshToken,
  getRefreshToken,
  clearRefreshToken,

  clearAuthSession,
};

export async function saveAuthToken(token: string): Promise<boolean> {
  // Never store in AsyncStorage; remove legacy if present
  AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN).catch(() => {});
  return secureStorage.setItem(SECURE_ACCESS_TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const secureToken = await secureStorage.getItem(SECURE_ACCESS_TOKEN_KEY);
    if (secureToken) {
      return secureToken;
    }

    // Legacy migration: check if token was previously stored in AsyncStorage
    const legacyToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (legacyToken) {
      try {
        const parsed = JSON.parse(legacyToken);
        const tokenStr = typeof parsed === 'string' ? parsed : legacyToken;
        await secureStorage.setItem(SECURE_ACCESS_TOKEN_KEY, tokenStr);
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        return tokenStr;
      } catch {
        await secureStorage.setItem(SECURE_ACCESS_TOKEN_KEY, legacyToken);
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        return legacyToken;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function clearAuthToken(): Promise<boolean> {
  AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN).catch(() => {});
  return secureStorage.deleteItem(SECURE_ACCESS_TOKEN_KEY);
}

export async function saveRefreshToken(token: string): Promise<boolean> {
  return secureStorage.setItem(SECURE_REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await secureStorage.getItem(SECURE_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearRefreshToken(): Promise<boolean> {
  return secureStorage.deleteItem(SECURE_REFRESH_TOKEN_KEY);
}

export async function clearAuthSession(customerId?: string | number | null): Promise<void> {
  try {
    await clearAuthToken();
    await clearRefreshToken();
    await storage.remove(STORAGE_KEYS.USER);
    await storage.remove(STORAGE_KEYS.SELECTED_STORE_ID);
    if (customerId) {
      await storage.clearCustomerData(customerId);
    }
  } catch (e) {
    console.warn('[Storage] clearAuthSession error:', e);
  }
}

