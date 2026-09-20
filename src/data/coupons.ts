import { Coupon } from '../types';

export const coupons: Coupon[] = [
  {
    code: 'WELCOME50',
    title: 'Welcome First Order',
    description: 'Flat ₹50 OFF on orders above ₹299 for new users',
    discountType: 'flat',
    discountValue: 50,
    minOrderValue: 299,
  },
  {
    code: 'SAVE100',
    title: 'Super Saver ₹100',
    description: 'Flat ₹100 OFF on grocery orders above ₹999',
    discountType: 'flat',
    discountValue: 100,
    minOrderValue: 999,
  },
  {
    code: 'GROCERY20',
    title: '20% Mega Discount',
    description: '20% OFF on all items up to a maximum of ₹150',
    discountType: 'percentage',
    discountValue: 20,
    minOrderValue: 399,
    maxDiscount: 150,
  },
  {
    code: 'FREEDEL',
    title: 'Free Express Delivery',
    description: '100% Free delivery on any order above ₹199',
    discountType: 'flat',
    discountValue: 40,
    minOrderValue: 199,
  },
];
