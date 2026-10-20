import { apiClient } from './apiClient';
import { API_CONFIG } from './config';
import { Store, StorePricingConfigDto } from '../../types';
import { mapStore } from './adapters';
import { storage, STORAGE_KEYS } from '../../utils/storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const pricingConfigCache = new Map<number, CacheEntry<StorePricingConfigDto>>();
const PRICING_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export interface StoreResolutionResult {
  selectedStore: Store | null;
  activeStores: Store[];
  allStores: Store[];
  autoSelected: boolean;
  clearedStale: boolean;
  apiSuccess: boolean;
}

export const storeService = {
  /**
   * Fetches raw store list from GET /api/Stores.
   * Accurately reports whether the API call succeeded or encountered a network/server failure.
   */
  async fetchStores(): Promise<{ success: boolean; stores: Store[]; error?: string }> {
    try {
      const res = await apiClient.get('/api/Stores');
      const items = Array.isArray(res) ? res : res?.result || [];
      const mappedStores = items.map(mapStore);
      return { success: true, stores: mappedStores };
    } catch (e: any) {
      console.warn('[storeService.fetchStores] Backend error:', e.message);
      return { success: false, stores: [], error: e.message || 'Failed to fetch stores' };
    }
  },

  /**
   * Fetches all stores from GET /api/Stores.
   * Returns empty array if backend is unreachable or returns empty.
   */
  async getStores(options?: { throwOnError?: boolean }): Promise<Store[]> {
    const res = await this.fetchStores();
    if (!res.success && options?.throwOnError) {
      throw new Error(res.error || 'Failed to fetch stores');
    }
    return res.stores;
  },

  /**
   * Returns all active, available stores.
   */
  async getActiveStores(options?: { throwOnError?: boolean }): Promise<Store[]> {
    const all = await this.getStores(options);
    return all.filter((s) => s.isActive && s.id > 0);
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
   * Checks whether the customer has explicitly chosen an active store.
   */
  async hasSelectedStore(): Promise<boolean> {
    const savedId = await this.getSelectedStoreId();
    return savedId != null && savedId > 0;
  },

  /**
   * Persists the customer's chosen store ID.
   */
  async setSelectedStore(store: Store): Promise<void> {
    await storage.set(STORAGE_KEYS.SELECTED_STORE_ID, store.id);
  },

  /**
   * Resolves the full Store object for the currently selected store ID.
   * Only returns the store if it is active.
   */
  async getSelectedStore(): Promise<Store | null> {
    const storeId = await this.getSelectedStoreId();
    if (!storeId) return null;
    const all = await this.getStores();
    const found = all.find((s) => s.id === storeId && s.isActive);
    return found || null;
  },

  /**
   * Validates the currently selected store against the active stores from the backend.
   * - If the selected store is still active, returns it.
   * - If the selected store is inactive/deleted:
   *     - If exactly 1 active store exists: safely replaces the selection with that store.
   *     - If 0 or >1 active stores exist: safely clears the stale selection and returns null.
   * - If no store was selected:
   *     - If exactly 1 active store exists: automatically selects that store.
   *     - Otherwise returns null.
   * - If the API call fails, avoids clearing existing stored selection.
   */
  async validateAndResolveSelectedStore(options?: { throwOnError?: boolean }): Promise<StoreResolutionResult> {
    const fetchRes = await this.fetchStores();
    if (!fetchRes.success) {
      if (options?.throwOnError) {
        throw new Error(fetchRes.error || 'Failed to fetch stores');
      }
      return {
        selectedStore: null,
        activeStores: [],
        allStores: [],
        autoSelected: false,
        clearedStale: false,
        apiSuccess: false,
      };
    }

    const allStores = fetchRes.stores;
    const activeStores = allStores.filter((s) => s.isActive && s.id > 0);
    const storedId = await this.getSelectedStoreId();

    let selectedStore: Store | null = null;
    let autoSelected = false;
    let clearedStale = false;

    if (storedId) {
      const match = activeStores.find((s) => s.id === storedId);
      if (match) {
        selectedStore = match;
      } else {
        // Store is inactive or no longer returned by the server
        clearedStale = true;
        if (activeStores.length === 1) {
          selectedStore = activeStores[0];
          await this.setSelectedStore(activeStores[0]);
          autoSelected = true;
        } else {
          await this.clearSelectedStore();
          selectedStore = null;
        }
      }
    } else {
      // No store currently selected
      if (activeStores.length === 1) {
        selectedStore = activeStores[0];
        await this.setSelectedStore(activeStores[0]);
        autoSelected = true;
      }
    }

    return {
      selectedStore,
      activeStores,
      allStores,
      autoSelected,
      clearedStale,
      apiSuccess: true,
    };
  },

  /**
   * Fetches the dynamic pricing configuration for a specific store.
   * Calls GET /api/stores/{storeId}/pricing-config.
   * Caches per storeId for 60s to avoid redundant requests.
   */
  async getStorePricingConfig(storeId: number, forceRefresh = false): Promise<StorePricingConfigDto | null> {
    if (!storeId || storeId <= 0) return null;

    if (!forceRefresh) {
      const cached = pricingConfigCache.get(storeId);
      if (cached && Date.now() - cached.timestamp < PRICING_CACHE_TTL_MS) {
        return cached.data;
      }
    }

    try {
      const res = await apiClient.get(`/api/stores/${storeId}/pricing-config`);
      const raw = res?.result !== undefined ? res.result : res;

      if (raw && typeof raw === 'object') {
        const config: StorePricingConfigDto = {
          storePricingConfigurationID: Number(raw.storePricingConfigurationID ?? raw.StorePricingConfigurationID ?? 0),
          storeID: Number(raw.storeID ?? raw.StoreID ?? storeId),
          deliveryCharge: Number(raw.deliveryCharge ?? raw.DeliveryCharge ?? 0),
          freeDeliveryAbove: Number(raw.freeDeliveryAbove ?? raw.FreeDeliveryAbove ?? 0),
          platformFee: Number(raw.platformFee ?? raw.PlatformFee ?? 0),
          freePlatformFeeAbove: Number(raw.freePlatformFeeAbove ?? raw.FreePlatformFeeAbove ?? 0),
          isActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
          createdAt: raw.createdAt ?? raw.CreatedAt,
          updatedAt: raw.updatedAt ?? raw.UpdatedAt,
        };

        pricingConfigCache.set(storeId, { data: config, timestamp: Date.now() });
        return config;
      }
    } catch (e: any) {
      console.warn(`[storeService.getStorePricingConfig] Failed to fetch pricing for store ${storeId}:`, e.message);
    }

    return null;
  },

  /**
   * Clears the in-memory pricing configuration cache.
   */
  clearPricingConfigCache(): void {
    pricingConfigCache.clear();
  },

  /**
   * Clears the selected store ID (e.g., on logout).
   */
  async clearSelectedStore(): Promise<void> {
    await storage.remove(STORAGE_KEYS.SELECTED_STORE_ID);
  },
};

