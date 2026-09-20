import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Address } from '../types';
import { addressService } from '../services/api/addressService';

interface AddressContextType {
  addresses: Address[];
  selectedAddress: Address | null;
  isLoading: boolean;
  selectAddress: (address: Address) => void;
  addAddress: (address: Omit<Address, 'id'>) => Promise<Address>;
  updateAddress: (id: string, updates: Partial<Address>) => Promise<Address>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<void>;
  refreshAddresses: () => Promise<void>;
}

export const AddressContext = createContext<AddressContextType>({
  addresses: [],
  selectedAddress: null,
  isLoading: true,
  selectAddress: () => {},
  addAddress: async () => ({} as Address),
  updateAddress: async () => ({} as Address),
  deleteAddress: async () => false,
  setDefaultAddress: async () => {},
  refreshAddresses: async () => {},
});

export const AddressProvider = ({ children }: { children: ReactNode }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const list = await addressService.getAddresses();
      setAddresses(list);
      const defaultAddr = list.find((a) => a.isDefault) || list[0] || null;
      setSelectedAddress((prev) => prev || defaultAddr);
    } catch (e) {
      console.warn('Failed to load addresses:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const selectAddress = (address: Address) => {
    setSelectedAddress(address);
  };

  const addAddress = async (data: Omit<Address, 'id'>) => {
    const newAddr = await addressService.addAddress(data);
    await loadAddresses();
    if (newAddr.isDefault || !selectedAddress) {
      setSelectedAddress(newAddr);
    }
    return newAddr;
  };

  const updateAddress = async (id: string, updates: Partial<Address>) => {
    const updated = await addressService.updateAddress(id, updates);
    await loadAddresses();
    if (selectedAddress?.id === id) {
      setSelectedAddress(updated);
    }
    return updated;
  };

  const deleteAddress = async (id: string) => {
    const res = await addressService.deleteAddress(id);
    await loadAddresses();
    if (selectedAddress?.id === id) {
      const remaining = addresses.filter((a) => a.id !== id);
      setSelectedAddress(remaining[0] || null);
    }
    return res;
  };

  const setDefaultAddress = async (id: string) => {
    const updated = await addressService.setDefaultAddress(id);
    setAddresses(updated);
    const def = updated.find((a) => a.id === id);
    if (def) setSelectedAddress(def);
  };

  return (
    <AddressContext.Provider
      value={{
        addresses,
        selectedAddress,
        isLoading,
        selectAddress,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        refreshAddresses: loadAddresses,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};
