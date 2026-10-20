import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Store } from '../types';
import { storeService } from '../services/api/storeService';

export interface StoreContextType {
  stores: Store[];
  activeStores: Store[];
  selectedStore: Store | null;
  selectedStoreId: number | null;
  isLoading: boolean;
  error: string | null;
  selectStore: (store: Store) => Promise<void>;
  selectStoreById: (storeId: number) => Promise<void>;
  clearSelectedStore: () => Promise<void>;
  refreshStores: () => Promise<void>;
}

export const StoreContext = createContext<StoreContextType>({
  stores: [],
  activeStores: [],
  selectedStore: null,
  selectedStoreId: null,
  isLoading: true,
  error: null,
  selectStore: async () => {},
  selectStoreById: async () => {},
  clearSelectedStore: async () => {},
  refreshStores: async () => {},
});

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStores, setActiveStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStoresAndSelection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const resolution = await storeService.validateAndResolveSelectedStore({ throwOnError: true });

      setStores(resolution.allStores);
      setActiveStores(resolution.activeStores);
      setSelectedStore(resolution.selectedStore);
      setSelectedStoreId(resolution.selectedStore?.id ?? null);
    } catch (e: any) {
      console.warn('[StoreContext] Failed to load stores:', e);
      setError(e?.message || 'Failed to load stores');
      // If error occurred during network fetch, retain stored selection if available
      const storedId = await storeService.getSelectedStoreId();
      if (storedId) {
        setSelectedStoreId(storedId);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoresAndSelection();
  }, [loadStoresAndSelection]);

  const selectStore = useCallback(async (store: Store) => {
    await storeService.setSelectedStore(store);
    setSelectedStore(store);
    setSelectedStoreId(store.id);
  }, []);

  const selectStoreById = useCallback(
    async (storeId: number) => {
      const match = stores.find((s) => s.id === storeId);
      if (match) {
        await selectStore(match);
      } else {
        const dummyStore: Store = {
          id: storeId,
          name: `Store #${storeId}`,
          storeCode: `STORE-${storeId}`,
          addressLine1: '',
          district: '',
          state: '',
          pincode: '',
          phone: '',
          isActive: true,
        };
        await storeService.setSelectedStore(dummyStore);
        setSelectedStore(dummyStore);
        setSelectedStoreId(storeId);
      }
    },
    [stores, selectStore]
  );

  const clearSelectedStore = useCallback(async () => {
    await storeService.clearSelectedStore();
    setSelectedStore(null);
    setSelectedStoreId(null);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStores,
        selectedStore,
        selectedStoreId,
        isLoading,
        error,
        selectStore,
        selectStoreById,
        clearSelectedStore,
        refreshStores: loadStoresAndSelection,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
