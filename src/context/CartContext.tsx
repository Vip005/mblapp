import React, { createContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import {
  CartItem,
  CartSummary,
  Coupon,
  Product,
  ProductVariant,
  BackendCartMaster,
} from '../types';
import { cartService } from '../services/api/cartService';
import { couponService } from '../services/api/couponService';
import { productService } from '../services/api/productService';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../hooks/useStore';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface CartContextType {
  items: CartItem[];
  summary: CartSummary;
  itemCount: number;
  cartStoreId: number | null;
  activeCartMaster: BackendCartMaster | null;
  appliedCoupon: Coupon | null;
  isLoading: boolean;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  getItemQuantity: (productId: string, variantId?: string) => number;
  isInCart: (productId: string, variantId?: string) => boolean;
  refreshCart: () => Promise<void>;
  isItemPending: (itemId: string) => boolean;
  pendingItemIds: Set<string>;
}

const EMPTY_SUMMARY: CartSummary = {
  subtotal: 0,
  productDiscount: 0,
  couponDiscount: 0,
  deliveryCharge: 0,
  platformFee: 0,
  taxPercentage: 0,
  tax: 0,
  total: 0,
  appliedCoupon: null,
  freeDeliveryThreshold: 0,
  freeDeliveryRemaining: 0,
};

export const CartContext = createContext<CartContextType>({
  items: [],
  summary: EMPTY_SUMMARY,
  itemCount: 0,
  cartStoreId: null,
  activeCartMaster: null,
  appliedCoupon: null,
  isLoading: false,
  addItem: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  applyCoupon: async () => ({ success: false, message: '' }),
  removeCoupon: () => {},
  getItemQuantity: () => 0,
  isInCart: () => false,
  refreshCart: async () => {},
  isItemPending: () => false,
  pendingItemIds: new Set<string>(),
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { selectedStoreId } = useStore();

  const [items, setItems] = useState<CartItem[]>([]);
  const [activeCartMaster, setActiveCartMaster] = useState<BackendCartMaster | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // In-flight mutex to prevent duplicate concurrent operations per item
  const inFlightItemOps = useRef<Set<string>>(new Set());
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set());

  const isItemPending = useCallback(
    (itemId: string) => pendingItemIds.has(itemId),
    [pendingItemIds]
  );

  // Track active customer & store to prevent stale operations
  const currentCustomerId = useMemo(() => {
    return user?.id ? parseInt(user.id, 10) : null;
  }, [user?.id]);

  // Load authoritative cart from backend for (customerId, selectedStoreId)
  const loadAuthoritativeCart = useCallback(async () => {
    // If not logged in or no store selected:
    // When customer logs out or is unauthenticated, do NOT display previous customer's cart
    if (!currentCustomerId || !selectedStoreId) {
      if (!currentCustomerId) {
        setItems([]);
        setActiveCartMaster(null);
        await storage.remove(STORAGE_KEYS.CART);
      }
      setIsInitialized(true);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch or create backend CartMaster for this (customerId, selectedStoreId)
      const cartMaster = await cartService.getOrCreateCartMaster(currentCustomerId, selectedStoreId);
      if (!cartMaster) {
        setItems([]);
        setActiveCartMaster(null);
        return;
      }
      setActiveCartMaster(cartMaster);

      // 2. Fetch backend CartItemMaster records for this cart
      const backendItems = await cartService.getCartItems(cartMaster.cartID);

      // 3. Hydrate backend items with catalog product details
      const hydratedItems: CartItem[] = [];
      for (const bItem of backendItems) {
        try {
          const product = await productService.getProductById(String(bItem.productID), selectedStoreId);
          if (product) {
            const variant =
              product.variants.find((v) => String(v.id) === String(bItem.productVariantID)) ||
              product.variants[0];

            hydratedItems.push({
              id: `${product.id}_${variant.id}`,
              backendCartItemId: bItem.cartItemID,
              backendCartId: bItem.cartID,
              productId: product.id,
              variantId: variant.id,
              product,
              variant,
              quantity: bItem.quantity,
              price: bItem.price,
              totalPrice: bItem.quantity * bItem.price,
              storeId: product.storeId ?? selectedStoreId,
            });
          } else {
            // Fallback product structure if product details are temporarily unavailable
            hydratedItems.push({
              id: `${bItem.productID}_${bItem.productVariantID}`,
              backendCartItemId: bItem.cartItemID,
              backendCartId: bItem.cartID,
              productId: String(bItem.productID),
              variantId: String(bItem.productVariantID),
              product: {
                id: String(bItem.productID),
                name: `Product #${bItem.productID}`,
                brand: '',
                categoryId: '',
                description: '',
                image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
                rating: 0,
                reviewCount: 0,
                stock: 99,
                isAvailable: true,
                tags: [],
                originalPrice: bItem.price,
                sellingPrice: bItem.price,
                discount: 0,
                variants: [],
                storeId: selectedStoreId,
              },
              variant: {
                id: String(bItem.productVariantID),
                name: 'Standard',
                unit: '1 unit',
                price: bItem.price,
                originalPrice: bItem.price,
                stock: 99,
                isAvailable: true,
              },
              quantity: bItem.quantity,
              price: bItem.price,
              totalPrice: bItem.quantity * bItem.price,
              storeId: selectedStoreId,
            });
          }
        } catch (itemErr) {
          console.warn('[CartContext] Failed hydrating cart item:', itemErr);
        }
      }

      setItems(hydratedItems);
      await storage.set(STORAGE_KEYS.CART, hydratedItems);
    } catch (e: any) {
      console.warn('[CartContext.loadAuthoritativeCart] Error fetching cart:', e.message);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [currentCustomerId, selectedStoreId]);

  // Re-sync authoritative cart whenever customer or store changes
  useEffect(() => {
    loadAuthoritativeCart();
  }, [loadAuthoritativeCart]);

  // Persist items to storage on changes after initialization
  useEffect(() => {
    if (isInitialized) {
      storage.set(STORAGE_KEYS.CART, items);
    }
  }, [items, isInitialized]);

  // Dynamic summary calculation driven by CartMaster backend values
  const summary = useMemo(() => {
    return cartService.calculateSummary(items, appliedCoupon, activeCartMaster);
  }, [items, appliedCoupon, activeCartMaster]);

  // Cart badge: SUM of all CartItem quantities
  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  // Active store associated with cart
  const cartStoreId = useMemo(() => {
    if (activeCartMaster?.storeID) return activeCartMaster.storeID;
    const itemWithStore = items.find((i) => i.storeId != null || i.product?.storeId != null);
    if (itemWithStore) {
      return itemWithStore.storeId ?? itemWithStore.product?.storeId ?? null;
    }
    return selectedStoreId ?? null;
  }, [activeCartMaster, items, selectedStoreId]);

  /**
   * ADD ITEM:
   * 1. Mutex guard: immediately prevent concurrent duplicate taps for the same item.
   * 2. Mark item as pending so the UI immediately enters a loading/disabled state.
   * 3. Await backend success (getOrCreateCartMaster + addCartItem / updateCartItem).
   * 4. Update local cart state strictly AFTER backend confirmation.
   * 5. Surface any backend/network errors instead of silently swallowing them.
   * 6. Restore in-flight lock in finally block.
   */
  const addItem = async (product: Product, variant?: ProductVariant, quantity = 1) => {
    const selectedVariant = variant || product.variants[0];
    const itemId = `${product.id}_${selectedVariant.id}`;
    const price = selectedVariant.price;

    if (inFlightItemOps.current.has(itemId)) {
      return;
    }
    inFlightItemOps.current.add(itemId);
    setPendingItemIds(new Set(inFlightItemOps.current));

    try {
      if (!currentCustomerId) {
        throw new Error('Please log in to add items to your cart.');
      }
      if (!selectedStoreId) {
        throw new Error('Please select a store to add items to your cart.');
      }

      // Ensure active CartMaster exists
      let cartMaster = activeCartMaster;
      if (
        !cartMaster ||
        Number(cartMaster.customerId) !== Number(currentCustomerId) ||
        Number(cartMaster.storeID) !== Number(selectedStoreId)
      ) {
        cartMaster = await cartService.getOrCreateCartMaster(currentCustomerId, selectedStoreId);
        if (cartMaster) {
          setActiveCartMaster(cartMaster);
        }
      }

      if (!cartMaster) {
        throw new Error('Failed to obtain CartMaster from server.');
      }

      const prodId = parseInt(product.id, 10);
      const varId = parseInt(selectedVariant.id, 10);
      if (isNaN(prodId) || prodId <= 0 || isNaN(varId) || varId <= 0) {
        throw new Error(`Invalid product or variant ID for ${product.name}.`);
      }

      // Read current state from items
      const existingItem = items.find((item) => item.id === itemId);
      let backendCartItemId: number | undefined;
      let backendCartId: number = cartMaster.cartID;
      let finalQty = quantity;

      if (existingItem && existingItem.backendCartItemId) {
        // Existing item: PUT update quantity
        finalQty = existingItem.quantity + quantity;
        await cartService.updateCartItem(
          existingItem.backendCartItemId,
          cartMaster.cartID,
          varId,
          prodId,
          finalQty,
          price
        );
        backendCartItemId = existingItem.backendCartItemId;
      } else {
        // Check if item already exists on backend to avoid duplicate rows
        const backendItems = await cartService.getCartItems(cartMaster.cartID);
        const duplicateOnBackend = backendItems.find(
          (b) => Number(b.productID) === prodId && Number(b.productVariantID) === varId
        );

        if (duplicateOnBackend) {
          finalQty = duplicateOnBackend.quantity + quantity;
          await cartService.updateCartItem(
            duplicateOnBackend.cartItemID,
            cartMaster.cartID,
            varId,
            prodId,
            finalQty,
            price
          );
          backendCartItemId = duplicateOnBackend.cartItemID;
        } else {
          // New item: POST add item
          const createdBackendItem = await cartService.addCartItem(
            cartMaster.cartID,
            varId,
            prodId,
            quantity,
            price
          );
          if (!createdBackendItem) {
            throw new Error(`Failed to add ${product.name} to cart.`);
          }
          backendCartItemId = createdBackendItem.cartItemID;
          backendCartId = createdBackendItem.cartID;
        }
      }

      // Update local cart state strictly AFTER backend confirmation
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === itemId);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            quantity: finalQty,
            totalPrice: finalQty * price,
            backendCartItemId: backendCartItemId ?? updated[idx].backendCartItemId,
            backendCartId,
          };
          return updated;
        } else {
          const newItem: CartItem = {
            id: itemId,
            backendCartItemId,
            backendCartId,
            productId: product.id,
            variantId: selectedVariant.id,
            product,
            variant: selectedVariant,
            quantity: finalQty,
            price,
            totalPrice: finalQty * price,
            storeId: product.storeId ?? selectedStoreId ?? undefined,
          };
          return [...prev, newItem];
        }
      });
    } catch (e: any) {
      console.warn('[CartContext.addItem] Backend sync failed:', e.message);
      // Surface actual error to caller
      throw e;
    } finally {
      inFlightItemOps.current.delete(itemId);
      setPendingItemIds(new Set(inFlightItemOps.current));
    }
  };

  /**
   * UPDATE QUANTITY:
   * In-flight guarded quantity update with backend confirmation.
   */
  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    if (inFlightItemOps.current.has(itemId)) {
      return;
    }
    inFlightItemOps.current.add(itemId);
    setPendingItemIds(new Set(inFlightItemOps.current));

    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) {
      inFlightItemOps.current.delete(itemId);
      setPendingItemIds(new Set(inFlightItemOps.current));
      return;
    }

    try {
      if (!currentCustomerId || !selectedStoreId) return;

      let cartMaster = activeCartMaster;
      if (
        !cartMaster ||
        Number(cartMaster.customerId) !== Number(currentCustomerId) ||
        Number(cartMaster.storeID) !== Number(selectedStoreId)
      ) {
        cartMaster = await cartService.getOrCreateCartMaster(currentCustomerId, selectedStoreId);
        if (cartMaster) setActiveCartMaster(cartMaster);
      }

      if (!cartMaster) throw new Error('Missing CartMaster');

      let backendItemId = targetItem.backendCartItemId;
      const prodId = parseInt(targetItem.productId, 10) || 1;
      const varId = parseInt(targetItem.variantId, 10) || 1;

      if (!backendItemId) {
        const backendItems = await cartService.getCartItems(cartMaster.cartID);
        const match = backendItems.find(
          (b) => Number(b.productID) === prodId && Number(b.productVariantID) === varId
        );
        if (match) {
          backendItemId = match.cartItemID;
        }
      }

      if (backendItemId) {
        await cartService.updateCartItem(
          backendItemId,
          cartMaster.cartID,
          varId,
          prodId,
          quantity,
          targetItem.price
        );
      } else {
        const created = await cartService.addCartItem(
          cartMaster.cartID,
          varId,
          prodId,
          quantity,
          targetItem.price
        );
        if (created) {
          backendItemId = created.cartItemID;
        }
      }

      // Update state strictly after backend confirmation
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity,
                totalPrice: quantity * item.price,
                backendCartItemId: backendItemId ?? item.backendCartItemId,
              }
            : item
        )
      );
    } catch (e: any) {
      console.warn('[CartContext.updateQuantity] Failed:', e.message);
      throw e;
    } finally {
      inFlightItemOps.current.delete(itemId);
      setPendingItemIds(new Set(inFlightItemOps.current));
    }
  };

  /**
   * REMOVE ITEM:
   * Optimistically remove item -> DELETE /api/CartItemMaster/{cartItemID}.
   * Rollback on error.
   */
  const removeItem = async (itemId: string) => {
    const previousItems = [...items];
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    // 1. Optimistic removal
    setItems((prev) => prev.filter((item) => item.id !== itemId));

    // 2. Synchronize with backend
    if (!currentCustomerId || !selectedStoreId) return;

    try {
      let cartMaster = activeCartMaster;
      if (!cartMaster) {
        cartMaster = await cartService.getOrCreateCartMaster(currentCustomerId, selectedStoreId);
        if (cartMaster) setActiveCartMaster(cartMaster);
      }

      let backendItemId = targetItem.backendCartItemId;
      if (!backendItemId && cartMaster) {
        const prodId = parseInt(targetItem.productId, 10) || 1;
        const varId = parseInt(targetItem.variantId, 10) || 1;
        const backendItems = await cartService.getCartItems(cartMaster.cartID);
        const match = backendItems.find((b) => b.productID === prodId && b.productVariantID === varId);
        if (match) {
          backendItemId = match.cartItemID;
        }
      }

      if (backendItemId) {
        await cartService.deleteCartItem(backendItemId);
      }
    } catch (e: any) {
      console.warn('[CartContext.removeItem] Failed, rolling back:', e.message);
      setItems(previousItems);
      await loadAuthoritativeCart();
    }
  };

  /**
   * CLEAR CART:
   * Optimistically clear local cart and storage -> delete all CartItemMaster records for active cart.
   */
  const clearCart = async () => {
    const previousItems = [...items];
    const cartMaster = activeCartMaster;

    // 1. Optimistic clear
    setItems([]);
    setAppliedCoupon(null);
    await storage.remove(STORAGE_KEYS.CART);

    // 2. Synchronize with backend
    if (cartMaster?.cartID) {
      try {
        const itemIds = previousItems
          .map((i) => i.backendCartItemId)
          .filter((id): id is number => typeof id === 'number');

        await cartService.clearBackendCart(cartMaster.cartID, itemIds);
      } catch (e: any) {
        console.warn('[CartContext.clearCart] Backend clear error:', e.message);
        await loadAuthoritativeCart();
      }
    }
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    const validation = await couponService.validateCoupon(code, summary.subtotal);
    if (!validation.isValid || !validation.coupon) {
      return {
        success: false,
        message: validation.error || 'Invalid coupon code',
      };
    }

    setAppliedCoupon(validation.coupon);
    return {
      success: true,
      message: `Coupon "${validation.coupon.code}" applied! You saved ₹${validation.discountAmount || 0}`,
    };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const getItemQuantity = (productId: string, variantId?: string): number => {
    if (variantId) {
      const item = items.find((i) => i.productId === productId && i.variantId === variantId);
      return item ? item.quantity : 0;
    }
    const matchingItems = items.filter((i) => i.productId === productId);
    return matchingItems.reduce((acc, curr) => acc + curr.quantity, 0);
  };

  const isInCart = (productId: string, variantId?: string): boolean => {
    return getItemQuantity(productId, variantId) > 0;
  };

  const refreshCart = async () => {
    await loadAuthoritativeCart();
  };

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        itemCount,
        cartStoreId,
        activeCartMaster,
        appliedCoupon,
        isLoading,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        getItemQuantity,
        isInCart,
        refreshCart,
        isItemPending,
        pendingItemIds,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
