import { apiClient } from './apiClient';
import {
  CartItem,
  CartSummary,
  Coupon,
  BackendCartMaster,
  BackendCartItemMaster,
  StorePricingConfigDto,
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

/**
 * Normalizes backend CartMaster responses across different JSON property casing conventions
 * (.NET camelCase vs PascalCase: cartID / cartId / CartID, storeID / storeId / StoreID, etc.)
 */
export function normalizeCartMaster(raw: any): BackendCartMaster {
  if (!raw || typeof raw !== 'object') {
    return {
      cartID: 0,
      storeID: 0,
      customerId: 0,
      deliveryFee: null,
      platformFee: null,
      taxPercentage: null,
    };
  }

  const cartID = Number(raw.cartID ?? raw.cartId ?? raw.CartID ?? raw.CartId ?? 0);
  const storeID = Number(raw.storeID ?? raw.storeId ?? raw.StoreID ?? raw.StoreId ?? 0);
  const customerId = Number(
    raw.customerId ?? raw.CustomerId ?? raw.customerID ?? raw.CustomerID ?? raw.UserID ?? raw.userId ?? 0
  );
  const deliveryFee = raw.deliveryFee ?? raw.DeliveryFee ?? null;
  const platformFee = raw.platformFee ?? raw.PlatformFee ?? null;
  const taxPercentage = raw.taxPercentage ?? raw.TaxPercentage ?? null;

  return {
    cartID: isNaN(cartID) ? 0 : cartID,
    storeID: isNaN(storeID) ? 0 : storeID,
    customerId: isNaN(customerId) ? 0 : customerId,
    deliveryFee: deliveryFee != null ? Number(deliveryFee) : null,
    platformFee: platformFee != null ? Number(platformFee) : null,
    taxPercentage: taxPercentage != null ? Number(taxPercentage) : null,
    createdDate: raw.createdDate ?? raw.CreatedDate ?? null,
    modifiedDate: raw.modifiedDate ?? raw.ModifiedDate ?? null,
  };
}

/**
 * Normalizes backend CartItemMaster responses across different JSON property casing conventions
 */
export function normalizeCartItemMaster(raw: any): BackendCartItemMaster {
  if (!raw || typeof raw !== 'object') {
    return {
      cartItemID: 0,
      cartID: 0,
      productVariantID: 0,
      productID: 0,
      quantity: 0,
      price: 0,
    };
  }

  const cartItemID = Number(raw.cartItemID ?? raw.cartItemId ?? raw.CartItemID ?? raw.CartItemId ?? 0);
  const cartID = Number(raw.cartID ?? raw.cartId ?? raw.CartID ?? raw.CartId ?? 0);
  const productVariantID = Number(
    raw.productVariantID ?? raw.productVariantId ?? raw.ProductVariantID ?? raw.ProductVariantId ?? 0
  );
  const productID = Number(raw.productID ?? raw.productId ?? raw.ProductID ?? raw.ProductId ?? 0);
  const quantity = Number(raw.quantity ?? raw.Quantity ?? 0);
  const price = Number(raw.price ?? raw.Price ?? 0);

  return {
    cartItemID: isNaN(cartItemID) ? 0 : cartItemID,
    cartID: isNaN(cartID) ? 0 : cartID,
    productVariantID: isNaN(productVariantID) ? 0 : productVariantID,
    productID: isNaN(productID) ? 0 : productID,
    quantity: isNaN(quantity) ? 0 : quantity,
    price: isNaN(price) ? 0 : price,
    createdBy: raw.createdBy ?? raw.CreatedBy ?? null,
    modifiedBy: raw.modifiedBy ?? raw.ModifiedBy ?? null,
    createdDate: raw.createdDate ?? raw.CreatedDate ?? null,
    modifiedDate: raw.modifiedDate ?? raw.ModifiedDate ?? null,
  };
}

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
      const res = await apiClient.get<any>(`/api/CartMaster${queryStr}`);
      const rawList: any[] = Array.isArray(res) ? res : res?.result || [];
      const normalized = rawList.map(normalizeCartMaster).filter((c) => c.cartID > 0);
      // Sort descending by cartID so latest active cart is always first
      normalized.sort((a, b) => b.cartID - a.cartID);
      return normalized;
    } catch (e: any) {
      console.warn('[cartService.getCartMasters] Failed to fetch cart masters:', e.message);
      return [];
    }
  },

  /**
   * Clear cached in-flight promise for customer and store.
   */
  clearInFlightCartMaster(customerId: number, storeId: number): void {
    const key = `${customerId}_${storeId}`;
    inFlightCartMasterPromises.delete(key);
  },

  /**
   * Find existing CartMaster for (customerId, storeId) or create a new one.
   * Uses backend response as source of truth for all fee and tax values.
   * Uses in-flight promise caching to prevent race conditions from creating duplicate carts.
   */
  async getOrCreateCartMaster(
    customerId: number,
    storeId: number,
    forceFresh = false
  ): Promise<BackendCartMaster | null> {
    const key = `${customerId}_${storeId}`;
    if (!forceFresh && inFlightCartMasterPromises.has(key)) {
      return inFlightCartMasterPromises.get(key)!;
    }

    const promise = (async () => {
      try {
        if (!forceFresh) {
          const allCarts = await this.getCartMasters(customerId, storeId);
          const existing = allCarts.find(
            (c) => Number(c.customerId) === Number(customerId) && Number(c.storeID) === Number(storeId) && c.cartID > 0
          );
          if (existing) {
            return existing;
          }
        }

        // Backend requires an array payload: [{ cartID: 0, storeID, customerId }]
        const payload = [
          {
            cartID: 0,
            CartID: 0,
            storeID: storeId,
            StoreID: storeId,
            customerId: customerId,
            CustomerId: customerId,
          },
        ];

        const res = await apiClient.post<any>('/api/CartMaster', payload);
        let rawItem: any = null;
        if (Array.isArray(res) && res.length > 0) {
          rawItem = res[0];
        } else if (res?.result && Array.isArray(res.result) && res.result.length > 0) {
          rawItem = res.result[0];
        } else if (res && typeof res === 'object') {
          rawItem = res;
        }

        if (rawItem) {
          const normalized = normalizeCartMaster(rawItem);
          if (normalized.cartID > 0) {
            return normalized;
          }
        }

        // Fallback: re-query backend to fetch newly created cart
        const refreshed = await this.getCartMasters(customerId, storeId);
        const matched = refreshed.find(
          (c) => Number(c.customerId) === Number(customerId) && Number(c.storeID) === Number(storeId) && c.cartID > 0
        );
        if (matched) {
          return matched;
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
    if (!cartId || isNaN(cartId) || cartId <= 0) {
      return [];
    }
    try {
      const res = await apiClient.get<any>('/api/CartItemMaster');
      const allItems: any[] = Array.isArray(res) ? res : res?.result || [];
      return allItems
        .map(normalizeCartItemMaster)
        .filter((i) => i.cartID === cartId && i.cartItemID > 0);
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
    if (!cartId || isNaN(cartId) || cartId <= 0) {
      throw new Error('Invalid cart ID for adding item.');
    }

    const payload = [
      {
        cartItemID: 0,
        CartItemID: 0,
        cartID: cartId,
        CartID: cartId,
        productVariantID: productVariantId,
        ProductVariantID: productVariantId,
        productID: productId,
        ProductID: productId,
        quantity,
        Quantity: quantity,
        price,
        Price: price,
      },
    ];

    const res = await apiClient.post<any>('/api/CartItemMaster', payload);
    let rawItem: any = null;
    if (Array.isArray(res) && res.length > 0) {
      rawItem = res[0];
    } else if (res?.result && Array.isArray(res.result) && res.result.length > 0) {
      rawItem = res.result[0];
    } else if (res && typeof res === 'object') {
      rawItem = res;
    }

    return rawItem ? normalizeCartItemMaster(rawItem) : null;
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
    if (!cartItemId || isNaN(cartItemId) || cartItemId <= 0) {
      throw new Error('Invalid cart item ID.');
    }
    if (!cartId || isNaN(cartId) || cartId <= 0) {
      throw new Error('Invalid cart ID for updating item.');
    }

    const payload = [
      {
        cartItemID: cartItemId,
        CartItemID: cartItemId,
        cartID: cartId,
        CartID: cartId,
        productVariantID: productVariantId,
        ProductVariantID: productVariantId,
        productID: productId,
        ProductID: productId,
        quantity,
        Quantity: quantity,
        price,
        Price: price,
      },
    ];

    const res = await apiClient.put<any>('/api/CartItemMaster', payload);
    let rawItem: any = null;
    if (Array.isArray(res) && res.length > 0) {
      rawItem = res[0];
    } else if (res?.result && Array.isArray(res.result) && res.result.length > 0) {
      rawItem = res.result[0];
    } else if (res && typeof res === 'object') {
      rawItem = res;
    }

    return rawItem ? normalizeCartItemMaster(rawItem) : null;
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
    appliedCoupon?: Coupon | null,
    cartMaster?: BackendCartMaster | null,
    pricingConfig?: StorePricingConfigDto | null
  ): CartSummary {
    // Subtotal under SellingPrice contract: sum of (SellingPrice * Quantity)
    const subtotal = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));

    // Informational MRP savings already built into SellingPrice (must NOT be subtracted again from subtotal)
    const originalSubtotal = Number(
      items
        .reduce((sum, item) => {
          const origPrice = item.variant?.originalPrice || item.product?.originalPrice || item.price;
          return sum + origPrice * item.quantity;
        }, 0)
        .toFixed(2)
    );
    const productDiscount = Number(Math.max(0, originalSubtotal - subtotal).toFixed(2));

    // Order-level coupon discount calculation
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
    couponDiscount = Number(Math.min(subtotal, Math.max(0, couponDiscount)).toFixed(2));

    // Dynamic fees from backend CartMaster
    const backendDeliveryFee = Number((cartMaster?.deliveryFee ?? 0).toFixed(2));
    const backendPlatformFee = Number((cartMaster?.platformFee ?? 0).toFixed(2));
    const backendTaxPercentage = Number((cartMaster?.taxPercentage ?? 0).toFixed(2));

    // Resolve base fees and thresholds from dynamic store pricing config (or fallback to CartMaster)
    let baseDeliveryCharge = backendDeliveryFee;
    let freeDeliveryAbove = 0;
    let basePlatformFee = backendPlatformFee;
    let freePlatformFeeAbove = 0;

    if (pricingConfig && pricingConfig.isActive) {
      baseDeliveryCharge = Number((pricingConfig.deliveryCharge ?? 0).toFixed(2));
      freeDeliveryAbove = Number((pricingConfig.freeDeliveryAbove ?? 0).toFixed(2));
      basePlatformFee = Number((pricingConfig.platformFee ?? 0).toFixed(2));
      freePlatformFeeAbove = Number((pricingConfig.freePlatformFeeAbove ?? 0).toFixed(2));
    }

    // Delivery fee rule matching backend OrderCheckout:
    // 0 if empty cart, or FREEDEL coupon, or (freeDeliveryAbove > 0 and subtotal >= freeDeliveryAbove)
    let deliveryCharge = baseDeliveryCharge;
    if (
      subtotal === 0 ||
      (appliedCoupon && appliedCoupon.code === 'FREEDEL') ||
      (freeDeliveryAbove > 0 && subtotal >= freeDeliveryAbove)
    ) {
      deliveryCharge = 0;
    }

    // Platform fee rule matching backend OrderCheckout:
    // 0 if empty cart, or (freePlatformFeeAbove > 0 and subtotal >= freePlatformFeeAbove)
    let platformFee = basePlatformFee;
    if (
      subtotal === 0 ||
      (freePlatformFeeAbove > 0 && subtotal >= freePlatformFeeAbove)
    ) {
      platformFee = 0;
    }

    // Calculate progress towards free thresholds
    const freeDeliveryThreshold = freeDeliveryAbove;
    const freeDeliveryRemaining =
      freeDeliveryAbove > 0 && subtotal > 0 && subtotal < freeDeliveryAbove
        ? Number((freeDeliveryAbove - subtotal).toFixed(2))
        : 0;

    const freePlatformFeeThreshold = freePlatformFeeAbove;
    const freePlatformFeeRemaining =
      freePlatformFeeAbove > 0 && subtotal > 0 && subtotal < freePlatformFeeAbove
        ? Number((freePlatformFeeAbove - subtotal).toFixed(2))
        : 0;

    // SellingPrice subtotal contract:
    // ItemTotal = SellingPrice * Quantity; DiscountTotal includes only valid coupon/order-level discounts
    const taxableAmount = Number(Math.max(0, subtotal - couponDiscount).toFixed(2));
    const tax = subtotal === 0 ? 0 : Number(((taxableAmount * backendTaxPercentage) / 100).toFixed(2));

    // Grand total = Subtotal - CouponDiscount + DeliveryFee + PlatformFee + Taxes
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
      appliedCoupon: appliedCoupon ?? null,
      freeDeliveryThreshold,
      freeDeliveryRemaining,
      freePlatformFeeThreshold,
      freePlatformFeeRemaining,
    };
  },
};
