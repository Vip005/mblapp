import { User } from '../types';
import { addressService } from '../services/api/addressService';
import { storeService } from '../services/api/storeService';

export type OnboardingRoute = 'NameUpdate' | 'PrimaryAddress' | 'StoreSelection' | 'Main';

/**
 * Determines the next screen in the onboarding journey:
 * 1. NameUpdate: if user's name is empty or missing.
 * 2. PrimaryAddress: if user has no saved addresses.
 * 3. StoreSelection: if user hasn't selected a store yet.
 * 4. Main: onboarding complete.
 */
export async function getNextOnboardingRoute(user: User | null): Promise<OnboardingRoute> {
  if (!user) {
    return 'Main';
  }

  // 1. Check Name
  if (!user.name || user.name.trim().length === 0) {
    return 'NameUpdate';
  }

  // 2. Check Primary Address
  try {
    const addresses = await addressService.getAddresses();
    if (!addresses || addresses.length === 0) {
      return 'PrimaryAddress';
    }
  } catch (err) {
    console.warn('[onboardingHelper] Error checking addresses:', err);
    return 'PrimaryAddress';
  }

  // 3. Check Selected Store
  try {
    const selectedStoreId = await storeService.getSelectedStoreId();
    if (!selectedStoreId) {
      return 'StoreSelection';
    }
  } catch (err) {
    console.warn('[onboardingHelper] Error checking selected store:', err);
    return 'StoreSelection';
  }

  // 4. Completed
  return 'Main';
}
