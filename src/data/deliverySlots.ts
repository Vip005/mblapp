import { DeliverySlot } from '../types';

export const deliverySlots: DeliverySlot[] = [
  {
    id: 'slot-today-1',
    dateLabel: 'Today',
    timeWindow: '10:00 AM - 12:00 PM',
    isAvailable: true,
  },
  {
    id: 'slot-today-2',
    dateLabel: 'Today',
    timeWindow: '12:00 PM - 02:00 PM',
    isAvailable: true,
  },
  {
    id: 'slot-today-3',
    dateLabel: 'Today',
    timeWindow: '04:00 PM - 06:00 PM',
    isAvailable: true,
  },
  {
    id: 'slot-today-4',
    dateLabel: 'Today',
    timeWindow: '06:00 PM - 08:00 PM',
    isAvailable: true,
  },
  {
    id: 'slot-tmrw-1',
    dateLabel: 'Tomorrow',
    timeWindow: '07:00 AM - 09:00 AM',
    isAvailable: true,
  },
  {
    id: 'slot-tmrw-2',
    dateLabel: 'Tomorrow',
    timeWindow: '10:00 AM - 12:00 PM',
    isAvailable: true,
  },
];
