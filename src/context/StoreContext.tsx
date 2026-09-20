import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Store } from '../types';
import { storeService } from '../services/api/storeService';

export interface StoreContextType {
  stores: Store[];
  selectedStore: Store | null;
  selectedStoreId: number | null;
  isLoading: boolean;
  selectStore: (store: Store) => Promise<void>;
  selectStoreById: (storeId: number) => Promise<void>;
  clearSelectedStore: () => Promise<void>;
  refreshStores: () => Promise<void>;
}

export const StoreContext = createContext<StoreContextType>({
  stores: [],
  selectedStore: null,
  selectedStoreId: null,
  isLoading: true,
  selectStore: async () => {},
  selectStoreById: async () => {},
  clearSelectedStore: async () => {},
  refreshStores: async () => {},
});

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadStoresAndSelection = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedStores, currentStore] = await Promise.all([
        storeService.getStores(),
        storeService.getSelectedStore(),
      ]);

      setStores(fetchedStores);

      if (currentStore) {
        setSelectedStore(currentStore);
        setSelectedStoreId(currentStore.id);
      } else {
        const storedId = await storeService.getSelectedStoreId();
        if (storedId) {
          const match = fetchedStores.find((s) => s.id === storedId);
          if (match) {
            setSelectedStore(match);
            setSelectedStoreId(match.id);
          } else {
            setSelectedStoreId(storedId);
          }
        }
      }
    } catch (e) {
      console.warn('[StoreContext] Failed to load stores:', e);
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
        await storeService.setSelectedStore({
          id: storeId,
          name: `Store #${storeId}`,
          storeCode: `STORE-${storeId}`,
          addressLine1: '',
          district: '',
          state: '',
          pincode: '',
          phone: '',
          isActive: true,
        });
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
        selectedStore,
        selectedStoreId,
        isLoading,
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
