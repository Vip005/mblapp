import { apiClient } from './apiClient';
import {
  CartItem,
  CartSummary,
  Coupon,
  BackendCartMaster,
  BackendCartItemMaster,
} from '../../types';

/**
 * ============================================================================
 * BACKEND SECURITY / API SCOPING ISSUE:
 * ============================================================================
 * The backend endpoints:
 *   - GET /api/CartMaster
 *   - GET /api/CartItemMaster
 * currently return ALL records across all customers and stores.
 * Query parameters such as `?customerId=X` or `?cartId=Y` are ignored by the ASP.NET Core API.
 *
 * CLIENT-SIDE MITIGATION:
 * The mobile app applies strict client-side filtering matching the authenticated
 * `customerId` and active `storeID` as a temporary mitigation ONLY.
 *
 * RECOMMENDED FUTURE BACKEND ARCHITECTURE:
 * 1. Scope CartMaster retrieval to the authenticated customer from JWT claims.
 * 2. Scope CartItemMaster by verifying the Cart belongs to the authenticated customer.
 * 3. Enforce store validation and access control on the server side.
 * ============================================================================
 */

const inFlightCartMasterPromises = new Map<string, Promise<BackendCartMaster | null>>();

export const cartService = {
  /**
   * Fetch cart master records from backend scoped to customer and store.
   */
  async getCartMasters(customerId?: number | string, storeId?: number | string): Promise<BackendCartMaster[]> {
    try {
      const params = new URLSearchParams();
      if (customerId !== undefined && customerId !== null) {
        params.append('customerId', String(customerId));
      }
      if (storeId !== undefined && storeId !== null) {
        params.append('storeId', String(storeId));
      }
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient.get<BackendCartMaster[]>(`/api/CartMaster${queryStr}`);
      return Array.isArray(res) ? res : (res as any)?.result || [];
    } catch (e: any) {
      console.warn('[cartService.getCartMasters] Failed to fetch cart masters:', e.message);
      return [];
    }
  },

  /**
   * Find existing CartMaster for (customerId, storeId) or create a new one.
   * Uses backend response as source of truth for all fee and tax values.
   * Uses in-flight promise caching to prevent race conditions from creating duplicate carts.
   */
  async getOrCreateCartMaster(customerId: number, storeId: number): Promise<BackendCartMaster | null> {
    const key = `${customerId}_${storeId}`;
    if (inFlightCartMasterPromises.has(key)) {
      return inFlightCartMasterPromises.get(key)!;
    }

    const promise = (async () => {
      try {
        const allCarts = await this.getCartMasters(customerId, storeId);
        const existing = allCarts.find((c) => Number(c.customerId) === Number(customerId) && Number(c.storeID) === Number(storeId));
        if (existing) {
          return existing;
        }

        // Backend requires an array payload: [{ cartID: 0, storeID, customerId }]
        const payload = [
          {
            cartID: 0,
            storeID: storeId,
            customerId: customerId,
          },
        ];

        const res = await apiClient.post<BackendCartMaster[]>('/api/CartMaster', payload);
        if (Array.isArray(res) && res.length > 0) {
          return res[0];
        }
        if ((res as any)?.result && Array.isArray((res as any).result) && (res as any).result.length > 0) {
          return (res as any).result[0];
        }
        if (res && (res as any).cartID) {
          return res as any;
        }
        return null;
      } catch (e: any) {
        console.warn('[cartService.getOrCreateCartMaster] Failed:', e.message);
        throw e;
      } finally {
        inFlightCartMasterPromises.delete(key);
      }
    })();

    inFlightCartMasterPromises.set(key, promise);
    return promise;
  },

  /**
   * Fetch items for a specific cart ID.
   * Applies client-side filtering on cartID due to backend scoping limitation.
   */
  async getCartItems(cartId: number): Promise<BackendCartItemMaster[]> {
    try {
      const res = await apiClient.get<BackendCartItemMaster[]>('/api/CartItemMaster');
      const allItems = Array.isArray(res) ? res : [];
      return allItems.filter((i) => i.cartID === cartId);
    } catch (e: any) {
      console.warn('[cartService.getCartItems] Failed to fetch cart items:', e.message);
      return [];
    }
  },

  /**
   * Add a new item to the backend cart.
   * Backend requires an array payload.
   */
  async addCartItem(
    cartId: number,
    productVariantId: number,
    productId: number,
    quantity: number,
    price: number
  ): Promise<BackendCartItemMaster | null> {
    const payload = [
      {
        cartItemID: 0,
        cartID: cartId,
        productVariantID: productVariantId,
        productID: productId,
        quantity,
        price,
      },
    ];

    const res = await apiClient.post<BackendCartItemMaster[]>('/api/CartItemMaster', payload);
    if (Array.isArray(res) && res.length > 0) {
      return res[0];
    }
    if ((res as any)?.result && Array.isArray((res as any).result) && (res as any).result.length > 0) {
      return (res as any).result[0];
    }
    if (res && (res as any).cartItemID) {
      return res as any;
    }
    return null;
  },

  /**
   * Update quantity of an existing item in backend cart.
   * Backend requires an array payload.
   */
  async updateCartItem(
    cartItemId: number,
    cartId: number,
    productVariantId: number,
    productId: number,
    quantity: number,
    price: number
  ): Promise<BackendCartItemMaster | null> {
    const payload = [
      {
        cartItemID: cartItemId,
        cartID: cartId,
        productVariantID: productVariantId,
        productID: productId,
        quantity,
        price,
      },
    ];

    const res = await apiClient.put<BackendCartItemMaster[]>('/api/CartItemMaster', payload);
    if (Array.isArray(res) && res.length > 0) {
      return res[0];
    }
    if ((res as any)?.result && Array.isArray((res as any).result) && (res as any).result.length > 0) {
      return (res as any).result[0];
    }
    if (res && (res as any).cartItemID) {
      return res as any;
    }
    return null;
  },

  /**
   * Delete a single cart item by cartItemID.
   */
  async deleteCartItem(cartItemId: number): Promise<boolean> {
    try {
      await apiClient.delete(`/api/CartItemMaster/${cartItemId}`);
      return true;
    } catch (e: any) {
      console.warn(`[cartService.deleteCartItem] Failed for ID ${cartItemId}:`, e.message);
      throw e;
    }
  },

  /**
   * Clear all items belonging to a cart on the backend.
   */
  async clearBackendCart(cartId: number, itemIds?: number[]): Promise<void> {
    try {
      let idsToDelete = itemIds;
      if (!idsToDelete || idsToDelete.length === 0) {
        const items = await this.getCartItems(cartId);
        idsToDelete = items.map((i) => i.cartItemID);
      }

      await Promise.all(
        idsToDelete.map((id) =>
          this.deleteCartItem(id).catch((err) => {
            console.warn(`[cartService.clearBackendCart] Failed deleting item ${id}:`, err.message);
          })
        )
      );
    } catch (e: any) {
      console.warn('[cartService.clearBackendCart] Error clearing cart items:', e.message);
      throw e;
    }
  },

  /**
   * Delete entire CartMaster record.
   */
  async deleteCartMaster(cartId: number): Promise<boolean> {
    try {
      await apiClient.delete(`/api/CartMaster/${cartId}`);
      return true;
    } catch (e: any) {
      console.warn(`[cartService.deleteCartMaster] Failed for ID ${cartId}:`, e.message);
      return false;
    }
  },

  /**
   * Dynamic Cart Total Calculation.
   * Driven strictly by backend CartMaster values without hardcoded business fees.
   */
  calculateSummary(
    items: CartItem[],
    appliedCoupon: Coupon | null,
    cartMaster?: BackendCartMaster | null
  ): CartSummary {
    const subtotal = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));

    // Product discount from original vs selling price
    const originalSubtotal = Number(
      items
        .reduce((sum, item) => {
          const origPrice = item.variant?.originalPrice || item.product?.originalPrice || item.price;
          return sum + origPrice * item.quantity;
        }, 0)
        .toFixed(2)
    );
    const productDiscount = Number(Math.max(0, originalSubtotal - subtotal).toFixed(2));

    // Coupon discount calculation
    let couponDiscount = 0;
    if (appliedCoupon && subtotal >= appliedCoupon.minOrderValue) {
      if (appliedCoupon.code === 'FREEDEL') {
        couponDiscount = 0;
      } else if (appliedCoupon.discountType === 'flat') {
        couponDiscount = appliedCoupon.discountValue;
      } else {
        const disc = (subtotal * appliedCoupon.discountValue) / 100;
        couponDiscount = appliedCoupon.maxDiscount ? Math.min(disc, appliedCoupon.maxDiscount) : disc;
      }
    }
    couponDiscount = Number(couponDiscount.toFixed(2));
    const totalDiscount = Number((productDiscount + couponDiscount).toFixed(2));

    // Dynamic fees from backend CartMaster
    const backendDeliveryFee = Number((cartMaster?.deliveryFee ?? 0).toFixed(2));
    const backendPlatformFee = Number((cartMaster?.platformFee ?? 0).toFixed(2));
    const backendTaxPercentage = Number((cartMaster?.taxPercentage ?? 0).toFixed(2));

    // Delivery fee (0 if empty cart or FREEDEL coupon applied)
    let deliveryCharge = backendDeliveryFee;
    if (subtotal === 0 || (appliedCoupon && appliedCoupon.code === 'FREEDEL')) {
      deliveryCharge = 0;
    }

    // Platform fee (0 if empty cart)
    let platformFee = backendPlatformFee;
    if (subtotal === 0) {
      platformFee = 0;
    }

    // Formula: Grand Total = Item Subtotal - Discount + Delivery Fee + Platform Fee + Taxes
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const tax = subtotal === 0 ? 0 : Number(((taxableAmount * backendTaxPercentage) / 100).toFixed(2));

    // Grand total
    const total = Number(Math.max(0, taxableAmount + deliveryCharge + platformFee + tax).toFixed(2));

    return {
      subtotal,
      productDiscount,
      couponDiscount,
      deliveryCharge,
      platformFee,
      taxPercentage: backendTaxPercentage,
      tax,
      total,
      appliedCoupon,
      freeDeliveryThreshold: 0,
      freeDeliveryRemaining: 0,
    };
  },
};
