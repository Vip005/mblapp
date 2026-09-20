import { Address } from '../types';

export const initialAddresses: Address[] = [
  {
    id: 'addr-home-01',
    name: 'Abdul Rahman',
    phone: '9876543210',
    doorFlat: 'Flat 402, Green Meadows',
    street: '12th Main Road, Anna Nagar',
    area: 'Anna Nagar West',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600040',
    type: 'Home',
    isDefault: true,
  },
  {
    id: 'addr-work-02',
    name: 'Abdul Rahman',
    phone: '9876543210',
    doorFlat: 'Level 5, DLF Cybercity',
    street: 'Mount Poonamallee High Rd, Manapakkam',
    area: 'Manapakkam',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600125',
    type: 'Work',
    isDefault: false,
  },
];
