import { apiClient } from './apiClient';
import { API_CONFIG } from './config';
import { Store } from '../../types';
import { mapStore } from './adapters';
import { storage, STORAGE_KEYS } from '../../utils/storage';

export const storeService = {
  /**
   * Fetches all stores from GET /api/Stores.
   * Returns empty array if backend is unreachable or returns empty.
   */
  async getStores(): Promise<Store[]> {
    try {
      const res = await apiClient.get('/api/Stores');
      const items = Array.isArray(res) ? res : res?.result || [];

      if (items.length > 0) {
        const mappedStores = items.map(mapStore);
        return mappedStores;
      }
    } catch (e: any) {
      console.warn('[storeService.getStores] Backend error:', e.message);
    }

    return [];
  },

  /**
   * Returns the currently selected store ID from storage.
   * Returns null if not yet chosen.
   */
  async getSelectedStoreId(): Promise<number | null> {
    const savedId = await storage.get<number | null>(STORAGE_KEYS.SELECTED_STORE_ID, null);
    if (savedId != null && typeof savedId === 'number' && savedId > 0) {
      return savedId;
    }
    return null;
  },

  /**
   * Checks whether the customer has explicitly chosen a store.
   */
  async hasSelectedStore(): Promise<boolean> {
    const savedId = await storage.get<number | null>(STORAGE_KEYS.SELECTED_STORE_ID, null);
    return savedId != null && typeof savedId === 'number' && savedId > 0;
  },

  /**
   * Persists the customer's chosen store ID.
   */
  async setSelectedStore(store: Store): Promise<void> {
    await storage.set(STORAGE_KEYS.SELECTED_STORE_ID, store.id);
  },

  /**
   * Resolves the full Store object for the currently selected store ID.
   */
  async getSelectedStore(): Promise<Store | null> {
    const storeId = await this.getSelectedStoreId();
    if (!storeId) return null;
    const all = await this.getStores();
    const found = all.find((s) => s.id === storeId);
    return found || null;
  },

  /**
   * Clears the selected store ID (e.g., on logout).
   */
  async clearSelectedStore(): Promise<void> {
    await storage.remove(STORAGE_KEYS.SELECTED_STORE_ID);
  },
};
