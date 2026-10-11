import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import { authService } from '../services/api/authService';
import { setOnUnauthorizedCallback } from '../services/api/apiClient';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { isTokenExpired } from '../utils/jwt';
import { navigateToLogin } from '../navigation/navigationRef';

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
    setOnUnauthorizedCallback(async () => {
      console.warn('[AuthContext] 401 Unauthorized received. Logging out and redirecting to Login.');
      await logout();
      navigateToLogin();
    });

    const bootstrapAsync = async () => {
      try {
        let activeToken = await storage.getAuthToken();
        const savedUser = await storage.get<User | null>(STORAGE_KEYS.USER, null);

        // Check if user info is missing
        if (!savedUser || !savedUser.id) {
          await logout();
          return;
        }

        // Check if access token is missing or expired
        if (!activeToken || isTokenExpired(activeToken)) {
          console.log('[AuthContext] Access token expired or missing. Attempting refresh token...');
          const refreshResult = await authService.refreshSession();
          if (refreshResult && refreshResult.accessToken) {
            console.log('[AuthContext] Silent refresh token succeeded during startup.');
            activeToken = refreshResult.accessToken;
          } else {
            console.log('[AuthContext] Refresh token failed or expired. Logging out.');
            await logout();
            return;
          }
        }

        setToken(activeToken);
        setUser(savedUser);
      } catch (e) {
        console.warn('[AuthContext] Failed to restore auth session:', e);
        await logout();
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
