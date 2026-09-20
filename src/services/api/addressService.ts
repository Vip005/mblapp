import { apiClient } from './apiClient';
import { Address, User } from '../../types';
import { mapAddress, mapAddressToDto } from './adapters';
import { initialAddresses } from '../../data/addresses';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { storeService } from './storeService';

export const addressService = {
  async getAddresses(): Promise<Address[]> {
    const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
    const customerId = user?.id || null;

    try {
      const res = await apiClient.get('/api/CustomerAddressMaster');
      const items = Array.isArray(res) ? res : res?.result || [];

      if (customerId) {
        // Multi-user security: filter addresses for current logged-in customer
        const userAddresses = items
          .filter((a: any) => String(a.customerId) === String(customerId))
          .map(mapAddress);

        await storage.set(STORAGE_KEYS.ADDRESSES, userAddresses);
        return userAddresses;
      }
    } catch (e: any) {
      console.warn('[addressService.getAddresses] Backend error, using storage:', e.message);
    }

    const saved = await storage.get<Address[] | null>(STORAGE_KEYS.ADDRESSES, null);
    if (!saved) {
      // For authenticated users, default to empty list. For guest/demo, use initialAddresses.
      if (customerId) {
        return [];
      }
      await storage.set(STORAGE_KEYS.ADDRESSES, initialAddresses);
      return [...initialAddresses];
    }
    return saved;
  },

  async addAddress(data: Omit<Address, 'id'>): Promise<Address> {
    const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
    if (!user?.id) {
      throw new Error('Authentication required. Please log in to manage addresses.');
    }
    const customerId = user.id;
    const selectedStoreId = await storeService.getSelectedStoreId();

    const tempId = `addr-${Date.now()}`;
    const newAddress: Address = {
      ...data,
      id: tempId,
    };

    try {
      const dto = mapAddressToDto(newAddress, customerId, selectedStoreId);
      const res = await apiClient.post('/api/CustomerAddressMaster', dto);
      const createdDto = res?.result || res;
      if (createdDto && createdDto.addressId) {
        newAddress.id = String(createdDto.addressId);
      }
    } catch (e: any) {
      console.warn('[addressService.addAddress] Backend failed, saving locally:', e.message);
    }

    const current = await this.getAddresses();
    let updatedList = [...current];
    if (newAddress.isDefault) {
      updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
    }
    updatedList.unshift(newAddress);

    await storage.set(STORAGE_KEYS.ADDRESSES, updatedList);
    return newAddress;
  },

  async updateAddress(id: string, updates: Partial<Address>): Promise<Address> {
    const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
    if (!user?.id) {
      throw new Error('Authentication required. Please log in to manage addresses.');
    }
    const customerId = user.id;

    const current = await this.getAddresses();
    const existing = current.find((a) => a.id === id);
    if (!existing) {
      throw new Error('Address not found');
    }

    const updatedTarget: Address = { ...existing, ...updates };

    if (/^\d+$/.test(id)) {
      try {
        const dto = mapAddressToDto(updatedTarget, customerId);
        await apiClient.put('/api/CustomerAddressMaster', dto);
      } catch (e: any) {
        console.warn('[addressService.updateAddress] Backend failed:', e.message);
      }
    }

    let updatedList = current.map((a) => {
      if (a.id === id) {
        return updatedTarget;
      }
      if (updates.isDefault) {
        return { ...a, isDefault: false };
      }
      return a;
    });

    await storage.set(STORAGE_KEYS.ADDRESSES, updatedList);
    return updatedTarget;
  },

  async deleteAddress(id: string): Promise<boolean> {
    if (/^\d+$/.test(id)) {
      try {
        await apiClient.delete(`/api/CustomerAddressMaster/${id}`);
      } catch (e: any) {
        console.warn('[addressService.deleteAddress] Backend failed:', e.message);
      }
    }

    const current = await this.getAddresses();
    const filtered = current.filter((a) => a.id !== id);

    if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
      filtered[0].isDefault = true;
    }

    await storage.set(STORAGE_KEYS.ADDRESSES, filtered);
    return true;
  },

  async setDefaultAddress(id: string): Promise<Address[]> {
    return this.updateAddress(id, { isDefault: true }).then(() => this.getAddresses());
  },
};
