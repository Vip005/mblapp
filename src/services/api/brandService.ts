import { apiClient } from './apiClient';
import { Brand } from '../../types';
import { mapBrand } from './adapters';
import { storeService } from './storeService';

export const brandService = {
  /**
   * Fetches brands belonging to the specified store ID (or currently selected store).
   * Backend endpoint: GET /api/Brands?storeId={storeId}
   */
  async getBrands(storeId?: number): Promise<Brand[]> {
    const activeStoreId = storeId ?? (await storeService.getSelectedStoreId());
    if (!activeStoreId) {
      return [];
    }

    try {
      const res = await apiClient.get(`/api/Brands?storeId=${activeStoreId}`);
      const items = Array.isArray(res) ? res : res?.result || [];
      return items.map(mapBrand);
    } catch (e: any) {
      console.warn('[brandService.getBrands] Backend error:', e.message);
      return [];
    }
  },
};
