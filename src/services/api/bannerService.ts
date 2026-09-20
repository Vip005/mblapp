import { apiClient } from './apiClient';
import { Banner, BannerMasterDto } from '../../types';
import { mapBanner, isBannerDateValid } from './adapters';

export const bannerService = {
  /**
   * Fetches active banners for the specified store.
   * Endpoint: GET /api/BannerMaster?storeId={storeId}&isActive=true
   *
   * Safeguards:
   * - Does NOT execute if storeId is missing, null, or undefined.
   * - No hardcoded fallback store ID.
   * - Returns empty array on network/API failure without throwing.
   * - Filters out expired/inactive banners defensively.
   * - Sorts by displayOrder ascending.
   */
  async getBanners(storeId?: number | null): Promise<Banner[]> {
    if (!storeId || isNaN(storeId) || storeId <= 0) {
      return [];
    }

    try {
      const res = await apiClient.get<BannerMasterDto[] | { result?: BannerMasterDto[] }>(
        `/api/BannerMaster?storeId=${storeId}&isActive=true`
      );

      const rawItems: BannerMasterDto[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.result)
        ? res.result
        : [];

      return rawItems
        .map(mapBanner)
        .filter((b) => b.isActive && isBannerDateValid(b.startDate, b.endDate))
        .sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
    } catch (error: any) {
      if (__DEV__) {
        console.warn(`[bannerService.getBanners] Failed to fetch banners for store ${storeId}:`, error?.message || error);
      }
      return [];
    }
  },
};
