import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface WishlistContextType {
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

export const WishlistContext = createContext<WishlistContextType>({
  wishlist: [],
  toggleWishlist: () => {},
  isInWishlist: () => false,
  removeFromWishlist: () => {},
  clearWishlist: () => {},
});

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadWishlist = async () => {
      const saved = await storage.get<Product[]>(STORAGE_KEYS.WISHLIST, []);
      setWishlist(saved);
      setIsInitialized(true);
    };
    loadWishlist();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      storage.set(STORAGE_KEYS.WISHLIST, wishlist);
    }
  }, [wishlist, isInitialized]);

  const isInWishlist = (productId: string): boolean => {
    return wishlist.some((item) => item.id === productId);
  };

  const toggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      if (prev.some((item) => item.id === product.id)) {
        return prev.filter((item) => item.id !== product.id);
      } else {
        return [product, ...prev];
      }
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearWishlist = () => {
    setWishlist([]);
    storage.remove(STORAGE_KEYS.WISHLIST);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        isInWishlist,
        removeFromWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
