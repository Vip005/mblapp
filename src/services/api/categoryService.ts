import { apiClient } from './apiClient';
import { storeService } from './storeService';
import { Category } from '../../types';
import { mapCategory } from './adapters';

export const categoryService = {
  async getCategories(storeId?: number): Promise<Category[]> {
    const targetStoreId = storeId ?? (await storeService.getSelectedStoreId());
    if (!targetStoreId) {
      return [];
    }

    try {
      const res = await apiClient.get(
        `/api/Categories?storeId=${targetStoreId}`
      );

      const items = Array.isArray(res) ? res : res?.result || [];
      return items.map(mapCategory);
    } catch (e: any) {
      console.warn('[categoryService.getCategories] Backend error:', e.message);
      return [];
    }
  },

  async getCategoryById(id: string, storeId?: number): Promise<Category | null> {
    const all = await this.getCategories(storeId);
    const found = all.find((c) => c.id === id || c.slug === id);
    return found ? { ...found } : null;
  },
};
