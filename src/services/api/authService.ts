import { apiClient } from './apiClient';
import { User, AuthResponse } from '../../types';
import { defaultUser } from '../../data/users';
import { storage, STORAGE_KEYS } from '../../utils/storage';

export const authService = {
  async login(identifier: string): Promise<{ success: boolean; requiresOtp: boolean; message?: string; otp?: string }> {
    const phone = identifier.trim();
    if (!phone) {
      throw new Error('Please enter a valid phone number');
    }

    const res = await apiClient.post('/api/CustomerMaster/send-otp', {
      phoneNumber: phone,
    });

    const otp = res?.otpHash ? String(res.otpHash) : undefined;
    const devHint = otp ? ` (OTP: ${otp})` : '';

    return {
      success: true,
      requiresOtp: true,
      message: res?.message || `OTP sent successfully${devHint}`,
      otp,
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

    const res = await apiClient.post('/api/CustomerMaster/verify-otp', {
      phoneNumber: cleanPhone,
      otp: cleanOtp,
    });

    if (!res || !res.token) {
      throw new Error('Authentication failed: Missing token in server response.');
    }

    if (res.customerId == null) {
      throw new Error('Authentication failed: Missing customer ID in server response.');
    }

    const customerId = res.customerId;
    const customerName = res.customerName || (cleanPhone === '9876543210' ? 'Abu' : '');
    const token = res.token;

    const user: User = {
      id: String(customerId),
      name: customerName,
      phone: cleanPhone,
      email: `${cleanPhone}@groceryapp.com`,
      avatar: defaultUser.avatar,
      createdAt: new Date().toISOString(),
    };

    await storage.setAuthToken(token);
    await storage.set(STORAGE_KEYS.USER, user);

    return {
      user,
      token,
      isLoggedIn: true,
    };
  },

  async register(data: { name: string; phone: string; email: string }): Promise<AuthResponse> {
    const res = await this.verifyOtp(data.phone, '123456');
    const updated = await this.updateProfile({ name: data.name, email: data.email });
    return {
      ...res,
      user: updated,
    };
  },

  async getCurrentUser(): Promise<User | null> {
    return storage.get<User | null>(STORAGE_KEYS.USER, null);
  },

  async logout(): Promise<boolean> {
    await storage.removeAuthToken();
    await storage.remove(STORAGE_KEYS.USER);
    return true;
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const current = await storage.get<User>(STORAGE_KEYS.USER, defaultUser);
    const updated: User = { ...current, ...updates };

    if (updates.name !== undefined && updates.name !== null) {
      const trimmedName = updates.name.trim();
      const res = await apiClient.put('/api/CustomerMaster/profile-update', {
        customerName: trimmedName,
      });

      if (res && res.customerName !== undefined && res.customerName !== null) {
        updated.name = res.customerName;
      } else {
        updated.name = trimmedName;
      }
    }

    await storage.set(STORAGE_KEYS.USER, updated);
    return updated;
  },
};
