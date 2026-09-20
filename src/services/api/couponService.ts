import { apiClient } from './apiClient';
import { Coupon } from '../../types';
import { mapOfferToCoupon } from './adapters';
import { coupons as mockCoupons } from '../../data/coupons';
import { storeService } from './storeService';

export const couponService = {
  async getCoupons(storeId?: number): Promise<Coupon[]> {
    const activeStoreId = storeId ?? (await storeService.getSelectedStoreId());
    try {
      const endpoint = activeStoreId
        ? `/api/Offers?storeId=${activeStoreId}&isActive=true`
        : '/api/Offers?isActive=true';
      const res = await apiClient.get(endpoint);
      const items = Array.isArray(res) ? res : res?.result || [];

      if (items.length > 0) {
        const backendCoupons = items
          .filter((o: any) => o.isActive && !o.isExpired && (o.couponCode || o.offerType === 'COUPON'))
          .map(mapOfferToCoupon);

        if (backendCoupons.length > 0) {
          return backendCoupons;
        }
      }

      if (activeStoreId) {
        return [];
      }
    } catch (e: any) {
      console.warn('[couponService.getCoupons] Backend error:', e.message);
      if (activeStoreId) {
        return [];
      }
    }
    return [...mockCoupons];
  },

  async validateCoupon(
    code: string,
    subtotal: number,
    storeId?: number
  ): Promise<{ isValid: boolean; coupon?: Coupon; error?: string; discountAmount?: number }> {
    const cleanCode = code.trim().toUpperCase();
    const all = await this.getCoupons(storeId);
    const coupon = all.find((c) => c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      return {
        isValid: false,
        error: `Coupon "${code}" is invalid or expired`,
      };
    }

    if (subtotal < coupon.minOrderValue) {
      return {
        isValid: false,
        error: `Minimum order amount for ${coupon.code} is ₹${coupon.minOrderValue}. Add items worth ₹${coupon.minOrderValue - subtotal} more.`,
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'flat') {
      discountAmount = coupon.discountValue;
    } else {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    }

    return {
      isValid: true,
      coupon,
      discountAmount: Math.round(discountAmount),
    };
  },
};
