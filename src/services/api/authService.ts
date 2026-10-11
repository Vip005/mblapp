import { apiClient, refreshCustomerSession } from './apiClient';
import { User, AuthResponse } from '../../types';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { IS_TESTING_ENVIRONMENT } from './config';
import { orderHub } from '../realtime/orderHub';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';

export const authService = {
  async login(identifier: string): Promise<{ success: boolean; requiresOtp: boolean; message?: string; otp?: string }> {
    const phone = identifier.trim();
    if (!phone) {
      throw new Error('Please enter a valid phone number');
    }

    const res = await apiClient.post('/api/CustomerMaster/send-otp', {
      phoneNumber: phone,
    });

    const apiOtp =
      res?.otpHash ??
      res?.result?.otpHash ??
      res?.otp ??
      res?.result?.otp ??
      res?.code ??
      res?.result?.code;
    const extractedOtp = (apiOtp !== undefined && apiOtp !== null) ? String(apiOtp).trim() : undefined;

    if (IS_TESTING_ENVIRONMENT && extractedOtp) {
      await storage.set('@grocery_dev_last_server_otp', extractedOtp);
    }

    return {
      success: true,
      requiresOtp: true,
      message: res?.message || 'OTP sent successfully.',
      otp: IS_TESTING_ENVIRONMENT ? extractedOtp : undefined,
    };
  },

  async verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();

    if (!cleanPhone) {
      throw new Error('Phone number is required');
    }
    if (!cleanOtp) {
      throw new Error('OTP is required');
    }

    let otpToVerify = cleanOtp;

    // In testing environment, if user enters '123456',
    // substitute the active server OTP from send-otp so the backend verifies and returns real JWT.
    if (IS_TESTING_ENVIRONMENT) {
      if (cleanOtp === '123456') {
        const lastServerOtp = await storage.get<string | null>('@grocery_dev_last_server_otp', null);
        if (lastServerOtp) {
          otpToVerify = lastServerOtp;
        }
      }
    }

    const res = await apiClient.post('/api/CustomerMaster/verify-otp', {
      phoneNumber: cleanPhone,
      otp: otpToVerify,
    });

    if (!res || !res.token) {
      throw new Error('Authentication failed: Missing token in server response.');
    }

    if (res.customerId == null) {
      throw new Error('Authentication failed: Missing customer ID in server response.');
    }

    const customerId = res.customerId;
    const customerName = (res.customerName && typeof res.customerName === 'string') ? res.customerName.trim() : '';
    const token = res.token || res.accessToken;
    const refreshToken = res.refreshToken;

    const user: User = {
      id: String(customerId),
      name: customerName,
      phone: cleanPhone,
      email: res.email || '',
      avatar: DEFAULT_AVATAR,
      createdAt: new Date().toISOString(),
    };

    await storage.saveAuthToken(token);
    if (refreshToken) {
      await storage.saveRefreshToken(refreshToken);
    }
    await storage.set(STORAGE_KEYS.USER, user);

    return {
      user,
      token,
      isLoggedIn: true,
    };
  },

  async register(data: { name: string; phone: string; email: string }): Promise<AuthResponse> {
    throw new Error('Direct registration without OTP is deprecated. Please use the mobile number verification flow.');
  },

  async getCurrentUser(): Promise<User | null> {
    return storage.get<User | null>(STORAGE_KEYS.USER, null);
  },

  async logout(): Promise<boolean> {
    const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
    try {
      const refreshToken = await storage.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/api/CustomerMaster/logout', { refreshToken });
      }
    } catch (e) {
      console.warn('[authService.logout] Remote logout failed, continuing local cleanup:', e);
    } finally {
      try {
        await orderHub.disconnect();
      } catch (hubErr) {
        console.warn('[authService.logout] Failed to disconnect SignalR hub:', hubErr);
      }
      await storage.clearAuthSession(user?.id);
    }
    return true;
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const current = await storage.get<User | null>(STORAGE_KEYS.USER, null);
    if (!current) {
      throw new Error('No authenticated user session found to update.');
    }
    const updated: User = { ...current, ...updates };

    if (updates.name !== undefined && updates.name !== null) {
      const trimmedName = updates.name.trim();
      updated.name = trimmedName;

      try {
        const res = await apiClient.put('/api/CustomerMaster/profile-update', {
          customerName: trimmedName,
        });

        if (res && res.customerName && typeof res.customerName === 'string' && res.customerName.trim().length >= 2) {
          updated.name = res.customerName.trim();
        }
      } catch (e: any) {
        console.warn('[authService.updateProfile] Remote sync failed, keeping local update:', e.message);
      }
    }

    await storage.set(STORAGE_KEYS.USER, updated);
    return updated;
  },

  async refreshSession(): Promise<{ accessToken: string; refreshToken: string } | null> {
    return refreshCustomerSession();
  },
};
