import { User, Address } from '../types';
import { addressService } from '../services/api/addressService';
import { storeService } from '../services/api/storeService';
import { storage, STORAGE_KEYS } from './storage';
import { isTokenExpired } from './jwt';
import { refreshCustomerSession } from '../services/api/apiClient';

export type AppProgressionTarget =
  | { type: 'AUTH'; screen: 'Login' }
  | { type: 'AUTH_STEP'; screen: 'NameUpdate' | 'PrimaryAddress' | 'StoreSelection' }
  | { type: 'MAIN' };

/**
 * Evaluates the 4 onboarding milestones in strict order:
 * 1. Authenticated? (valid JWT + user with id) -> If no: Login
 * 2. Name set? (trimmed length >= 2) -> If no: NameUpdate
 * 3. Primary address added? (>= 1 address in customer cache or server) -> If no: PrimaryAddress
 * 4. Store selected? (valid selectedStoreId > 0) -> If no: StoreSelection
 * 5. All complete -> Main/Home
 */
export async function determineNextAppRoute(user: User | null): Promise<AppProgressionTarget> {
  // 1. Authenticated check
  let token = await storage.getAuthToken();
  const activeUser = user || (await storage.get<User | null>(STORAGE_KEYS.USER, null));

  if (!token || isTokenExpired(token)) {
    const refreshResult = await refreshCustomerSession();
    if (refreshResult && refreshResult.accessToken) {
      token = refreshResult.accessToken;
    }
  }

  if (!token || isTokenExpired(token) || !activeUser || !activeUser.id) {
    if (token && isTokenExpired(token)) {
      console.log('[onboardingProgression] Detected expired or invalid JWT token.');
    }
    return { type: 'AUTH', screen: 'Login' };
  }

  // Fast path for returning user who completed onboarding:
  // Check customer-scoped onboarding completion flag (never bypasses auth above)
  const isCompleted = await storage.get<boolean>(
    STORAGE_KEYS.customerOnboarding(activeUser.id),
    false
  );

  const selectedStoreId = await storeService.getSelectedStoreId();

  if (isCompleted) {
    if (selectedStoreId && selectedStoreId > 0) {
      // Rule 5: Validate that the selected store is actually active
      const resolution = await storeService.validateAndResolveSelectedStore().catch(() => null);
      if (resolution?.selectedStore) {
        return { type: 'MAIN' };
      }
      if (resolution && resolution.activeStores.length === 1) {
        return { type: 'MAIN' };
      }
    } else {
      // Completed onboarding before, but no store selected: check if exactly 1 store is available
      const resolution = await storeService.validateAndResolveSelectedStore().catch(() => null);
      if (resolution?.selectedStore && resolution.activeStores.length === 1) {
        return { type: 'MAIN' };
      }
    }
    return { type: 'AUTH_STEP', screen: 'StoreSelection' };
  }

  // 2. Name check: any valid non-empty name of at least 2 characters
  const trimmedName = (activeUser.name || '').trim();
  if (trimmedName.length < 2) {
    return { type: 'AUTH_STEP', screen: 'NameUpdate' };
  }

  // 3. Primary Address check:
  // First check local customer-scoped storage for instant response without network race condition
  let hasAddress = false;
  const cachedAddresses = await storage.get<Address[] | null>(
    STORAGE_KEYS.customerAddresses(activeUser.id),
    null
  );

  if (Array.isArray(cachedAddresses) && cachedAddresses.length > 0) {
    hasAddress = true;
  } else {
    try {
      const addresses = await addressService.getAddresses(activeUser.id);
      if (Array.isArray(addresses) && addresses.length > 0) {
        hasAddress = true;
      }
    } catch (err) {
      console.warn('[onboardingProgression] Error checking addresses:', err);
    }
  }

  if (!hasAddress) {
    return { type: 'AUTH_STEP', screen: 'PrimaryAddress' };
  }

  // 4. Selected Store check:
  // Validate and resolve selected store (auto-selects if exactly 1 active store exists)
  const resolution = await storeService.validateAndResolveSelectedStore().catch(() => null);
  const currentStore = resolution?.selectedStore;
  if (!currentStore || currentStore.id <= 0) {
    return { type: 'AUTH_STEP', screen: 'StoreSelection' };
  }

  // 5. All complete -> Mark onboarding complete for this specific customer
  await storage.set(STORAGE_KEYS.customerOnboarding(activeUser.id), true);
  return { type: 'MAIN' };
}
