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
} as const;

// SecureStore requires alphanumeric characters, '.', '-', and '_' (no '@')
const SECURE_TOKEN_KEY = 'grocery_auth_token';

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

  /**
   * Secure Auth Token Management
   * Uses expo-secure-store on native platforms with legacy migration.
   */
  async getAuthToken(): Promise<string | null> {
    try {
      const secureToken = await secureStorage.getItem(SECURE_TOKEN_KEY);
      if (secureToken) {
        return secureToken;
      }

      // Legacy migration: check if token was previously stored in AsyncStorage
      const legacyToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (legacyToken) {
        try {
          const parsed = JSON.parse(legacyToken);
          const tokenStr = typeof parsed === 'string' ? parsed : legacyToken;
          await secureStorage.setItem(SECURE_TOKEN_KEY, tokenStr);
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          return tokenStr;
        } catch {
          await secureStorage.setItem(SECURE_TOKEN_KEY, legacyToken);
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          return legacyToken;
        }
      }

      return null;
    } catch {
      return null;
    }
  },

  async setAuthToken(token: string): Promise<boolean> {
    // Also remove from AsyncStorage if present
    AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN).catch(() => {});
    return secureStorage.setItem(SECURE_TOKEN_KEY, token);
  },

  async removeAuthToken(): Promise<boolean> {
    AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN).catch(() => {});
    return secureStorage.deleteItem(SECURE_TOKEN_KEY);
  },
};

