import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import { authService } from '../services/api/authService';
import { setOnUnauthorizedCallback } from '../services/api/apiClient';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (identifier: string) => Promise<{ success: boolean; requiresOtp: boolean; message?: string; otp?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<AuthResponse>;
  register: (data: { name: string; phone: string; email: string }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => ({ success: false, requiresOtp: false }),
  verifyOtp: async () => ({ user: {} as User, token: '', isLoggedIn: false }),
  register: async () => ({ user: {} as User, token: '', isLoggedIn: false }),
  logout: async () => {},
  updateProfile: async () => ({} as User),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout cleanup errors
    } finally {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    // Listen for 401 Unauthorized from apiClient
    setOnUnauthorizedCallback(() => {
      logout();
    });

    const bootstrapAsync = async () => {
      try {
        const savedToken = await storage.getAuthToken();
        const savedUser = await storage.get<User | null>(STORAGE_KEYS.USER, null);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      } catch (e) {
        console.warn('Failed to restore auth session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, [logout]);

  const login = async (identifier: string) => {
    return authService.login(identifier);
  };

  const verifyOtp = async (phone: string, otp: string) => {
    const res = await authService.verifyOtp(phone, otp);
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const register = async (data: { name: string; phone: string; email: string }) => {
    const res = await authService.register(data);
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const updateProfile = async (data: Partial<User>) => {
    const updated = await authService.updateProfile(data);
    setUser(updated);
    return updated;
  };

  const isLoggedIn = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn,
        isLoading,
        login,
        verifyOtp,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
