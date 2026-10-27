import { Product, ProductVariant, CartItem } from '../types';

/**
 * Pure calculation and state resolution helpers for Product Details screen.
 * Extracted to ensure exact parity between production rendering and automated tests.
 */

export function resolveCartItem(
  items: CartItem[],
  productId: string,
  variantId?: string
): CartItem | undefined {
  if (!productId) return undefined;
  return items.find((i) => {
    const prodMatch = String(i.productId) === String(productId);
    if (!prodMatch) return false;
    if (variantId) {
      return String(i.variantId) === String(variantId);
    }
    return true;
  });
}

export function resolveCurrentCartQty(
  cartItem: CartItem | undefined,
  getItemQuantity: (productId: string, variantId?: string) => number,
  productId: string,
  variantId?: string
): number {
  if (cartItem && typeof cartItem.quantity === 'number') {
    return cartItem.quantity;
  }
  if (typeof getItemQuantity === 'function') {
    return getItemQuantity(productId, variantId);
  }
  return 0;
}

export function resolveAvailableStock(
  selectedVariant: ProductVariant | null,
  product: Product
): number {
  if (selectedVariant && selectedVariant.stock != null) {
    return selectedVariant.stock;
  }
  return product?.stock ?? 0;
}

export function resolveIsOutOfStock(
  product: Product,
  selectedVariant: ProductVariant | null
): boolean {
  if (!product || !product.isAvailable) {
    return true;
  }
  if (selectedVariant) {
    return !selectedVariant.isAvailable || (selectedVariant.stock != null && selectedVariant.stock <= 0);
  }
  return (product.stock != null && product.stock <= 0);
}

export function resolveUnitPrice(
  selectedVariant: ProductVariant | null,
  product: Product
): number {
  return selectedVariant?.price ?? product?.sellingPrice ?? 0;
}

export function resolveBottomTotalPrice(
  currentCartQty: number,
  unitPrice: number
): number {
  return currentCartQty > 0 ? unitPrice * currentCartQty : unitPrice;
}

export function resolveBottomPriceLabel(currentCartQty: number): string {
  return currentCartQty > 0 ? 'Total Price' : 'Price';
}

export type BottomActionMode = 'OUT_OF_STOCK' | 'QUANTITY_SELECTOR' | 'ADD_TO_CART';

export function resolveBottomActionMode(
  isOutOfStock: boolean,
  currentCartQty: number
): {
  mode: BottomActionMode;
  buttonTitle?: string;
  quantity?: number;
  disabled?: boolean;
} {
  if (isOutOfStock) {
    return {
      mode: 'OUT_OF_STOCK',
      buttonTitle: 'Out of Stock',
      disabled: true,
    };
  }

  if (currentCartQty > 0) {
    return {
      mode: 'QUANTITY_SELECTOR',
      quantity: currentCartQty,
      disabled: false,
    };
  }

  return {
    mode: 'ADD_TO_CART',
    buttonTitle: 'Add to Cart',
    disabled: false,
  };
}
