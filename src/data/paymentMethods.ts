import { PaymentMethodOption } from '../types';

export const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'cod',
    title: 'Cash on Delivery (COD)',
    description: 'Pay with cash or UPI QR at your doorstep upon delivery',
    icon: 'cash-outline',
  },
  {
    id: 'upi',
    title: 'UPI (GPay / PhonePe / Paytm)',
    description: 'Instant zero-fee payment via any UPI app',
    icon: 'flash-outline',
  },
  {
    id: 'card',
    title: 'Credit / Debit Card',
    description: 'Visa, Mastercard, RuPay & Amex accepted',
    icon: 'card-outline',
  },
  {
    id: 'wallet',
    title: 'Grocery Wallet / Netbanking',
    description: 'Fast 1-click checkout with available balance',
    icon: 'wallet-outline',
  },
];
