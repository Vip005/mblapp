import { Notification } from '../types';

export const initialNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Order Out for Delivery! 🚚',
    message: 'Your order #ORD-20260914-108 is out for delivery with delivery partner Suresh. Expect delivery before 07:30 PM.',
    date: '2026-09-14T17:30:00.000Z',
    isRead: false,
    type: 'order',
    orderId: 'ord-001',
  },
  {
    id: 'notif-2',
    title: '₹100 Weekend Coupon Available! 🎟️',
    message: 'Use code SAVE100 to get ₹100 instant discount on orders above ₹999. Valid till Sunday midnight!',
    date: '2026-09-13T10:00:00.000Z',
    isRead: false,
    type: 'offer',
  },
  {
    id: 'notif-3',
    title: 'Order Delivered Successfully! 🎉',
    message: 'Your order #ORD-20260910-042 has been safely delivered. Thank you for shopping fresh with us!',
    date: '2026-09-10T13:20:00.000Z',
    isRead: true,
    type: 'order',
    orderId: 'ord-002',
  },
  {
    id: 'notif-4',
    title: 'Fresh Fruits Season is Live! 🍎🥭',
    message: 'Himachal Apples and Ratnagiri Alphonso Mangoes are back in stock with up to 30% savings.',
    date: '2026-09-08T09:00:00.000Z',
    isRead: true,
    type: 'promo',
  },
];
