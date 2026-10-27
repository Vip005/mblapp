import { Offer } from '../types';

/**
 * Pure calculation and display helpers for Special Offer cards and carousels.
 * Shared between OfferCard.tsx and automated testing suites to prevent hollow duplicate logic.
 */

export interface DiscountHighlightResult {
  highlight: string;
  subtitle: string;
}

export function getDiscountHighlight(offer: Partial<Offer>): DiscountHighlightResult {
  if (offer.discountPercent && offer.discountPercent > 0) {
    return {
      highlight: `${offer.discountPercent}% OFF`,
      subtitle: 'Instant Discount',
    };
  }
  if (offer.discountValue && offer.discountValue > 0) {
    return {
      highlight: `₹${offer.discountValue} OFF`,
      subtitle: 'Flat Savings',
    };
  }
  if (offer.type === 'combo') {
    return {
      highlight: 'COMBO DEAL',
      subtitle: 'Special Bundle',
    };
  }
  if (offer.code) {
    return {
      highlight: 'EXCLUSIVE CODE',
      subtitle: 'Use Coupon',
    };
  }
  return {
    highlight: 'SPECIAL DEAL',
    subtitle: 'Save on Groceries',
  };
}

export function resolveTargetLabel(offer: Partial<Offer>): string {
  if (offer.categories && offer.categories.length > 0) {
    return offer.categories
      .map((c) => c.name)
      .slice(0, 2)
      .join(', ');
  }
  if (offer.categoryName) {
    return offer.categoryName;
  }
  if (offer.products && offer.products.length > 0) {
    return offer.products
      .map((p) => p.name)
      .slice(0, 2)
      .join(', ');
  }
  if (offer.productName) {
    return offer.productName;
  }
  if (offer.offerScope === 'ALL_STORES') {
    return 'All Products';
  }
  if (offer.applicableDaysReadable) {
    return offer.applicableDaysReadable;
  }
  return '';
}

export function calculateCarouselCardWidth(screenWidth: number): number {
  return Math.min(330, Math.max(270, screenWidth - 54));
}

export function calculateOfferCardWidth(
  isFullWidth: boolean,
  screenWidth: number,
  customWidth?: number
): number | string {
  if (isFullWidth) {
    return '100%';
  }
  return customWidth ?? calculateCarouselCardWidth(screenWidth);
}

export function hasValidOfferImage(img?: string): boolean {
  return Boolean(img && typeof img === 'string' && img.trim().length > 0 && img.startsWith('http'));
}
