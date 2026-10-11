import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Product } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';

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
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadWishlist = async () => {
      if (!user?.id) {
        setWishlist([]);
        setIsInitialized(true);
        return;
      }
      const saved = await storage.get<Product[]>(STORAGE_KEYS.customerWishlist(user.id), []);
      setWishlist(saved);
      setIsInitialized(true);
    };
    loadWishlist();
  }, [user?.id]);

  useEffect(() => {
    if (isInitialized && user?.id) {
      storage.set(STORAGE_KEYS.customerWishlist(user.id), wishlist);
    }
  }, [wishlist, isInitialized, user?.id]);

  const isInWishlist = (productId: string): boolean => {
    return wishlist.some((item) => item.id === productId);
  };

  const toggleWishlist = (product: Product) => {
    if (!user?.id) return;
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

  const clearWishlist = useCallback(() => {
    setWishlist([]);
    if (user?.id) {
      storage.remove(STORAGE_KEYS.customerWishlist(user.id));
    }
    storage.remove(STORAGE_KEYS.WISHLIST);
  }, [user?.id]);

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
