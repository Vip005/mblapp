import { apiClient } from './apiClient';
import { Offer, OfferMasterDto } from '../../types';
import { mapOffer } from './adapters';
import { storeService } from './storeService';

export const offerService = {
  /**
   * Fetches promotional offers belonging to the specified store ID (or currently selected store).
   * Backend endpoint: GET /api/Offers?storeId={storeId}&isActive=true
   * Strictly filters only active and non-expired offers.
   */
  async getOffers(storeId?: number): Promise<Offer[]> {
    const activeStoreId = storeId ?? (await storeService.getSelectedStoreId());
    if (!activeStoreId) {
      return [];
    }

    try {
      const res = await apiClient.get<OfferMasterDto[]>(`/api/Offers?storeId=${activeStoreId}&isActive=true`);
      const items: any[] = Array.isArray(res) ? res : (res as any)?.result || [];

      const now = new Date().getTime();
      return items
        .filter((item) => {
          // Strictly filter out inactive or expired offers
          if (item.isActive === false || item.isExpired === true) {
            return false;
          }
          if (item.validTo) {
            const expiryTime = new Date(item.validTo).getTime();
            if (!isNaN(expiryTime) && expiryTime < now) {
              return false;
            }
          }
          if (item.validFrom) {
            const startTime = new Date(item.validFrom).getTime();
            if (!isNaN(startTime) && startTime > now) {
              return false;
            }
          }
          return true;
        })
        .map(mapOffer);
    } catch (e: any) {
      console.warn('[offerService.getOffers] Backend error:', e.message);
      return [];
    }
  },

  /**
   * Fetches a single offer by ID from the backend.
   * Backend endpoint: GET /api/Offers/{id}
   */
  async getOfferById(id: number | string): Promise<Offer | null> {
    try {
      const res = await apiClient.get<OfferMasterDto>(`/api/Offers/${id}`);
      const item = (res as any)?.result ?? res;
      if (!item) return null;
      return mapOffer(item);
    } catch (e: any) {
      console.warn(`[offerService.getOfferById] Backend error for ID ${id}:`, e.message);
      return null;
    }
  },
};
