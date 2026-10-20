import { PaymentMethodOption } from '../types';

export const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'razorpay',
    title: 'Pay Online (Razorpay)',
    description: 'UPI, Credit/Debit Cards, NetBanking, Wallets',
    icon: 'card-outline',
  },
  {
    id: 'cod',
    title: 'Cash on Delivery (COD)',
    description: 'Pay with cash or UPI QR at your doorstep upon delivery',
    icon: 'cash-outline',
  },
];
