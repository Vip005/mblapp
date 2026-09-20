import { apiClient } from './apiClient';
import { Offer } from '../../types';
import { mapOffer } from './adapters';
import { storeService } from './storeService';

export const offerService = {
  /**
   * Fetches promotional offers belonging to the specified store ID (or currently selected store).
   * Backend endpoint: GET /api/Offers?storeId={storeId}&isActive=true
   */
  async getOffers(storeId?: number): Promise<Offer[]> {
    const activeStoreId = storeId ?? (await storeService.getSelectedStoreId());
    if (!activeStoreId) {
      return [];
    }

    try {
      const res = await apiClient.get(`/api/Offers?storeId=${activeStoreId}&isActive=true`);
      const items = Array.isArray(res) ? res : res?.result || [];
      return items.map(mapOffer);
    } catch (e: any) {
      console.warn('[offerService.getOffers] Backend error:', e.message);
      return [];
    }
  },
};
