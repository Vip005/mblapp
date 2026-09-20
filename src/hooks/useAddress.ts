import { useContext } from 'react';
import { AddressContext } from '../context/AddressContext';

export const useAddress = () => {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
};
