import { Store } from '../types';

export interface StoreMatchResult {
  matchingStores: Store[];
  otherStores: Store[];
  hasMatch: boolean;
}

/**
 * Normalizes an Indian pincode by trimming whitespace and extracting digits.
 * Treats pincode strictly as a string to preserve any leading zeroes.
 */
export const normalizePincode = (pincode?: string | null): string => {
  if (!pincode) return '';
  return pincode.toString().trim().replace(/\D/g, '');
};

/**
 * Pure function to match customer pincode against available stores.
 *
 * Requirements:
 * 1. Exact customer pincode match (normalized string comparison).
 * 2. If one or more stores match: matchingStores contains all matches, otherStores contains the rest, hasMatch is true.
 * 3. If no store matches: matchingStores is empty, otherStores contains all stores, hasMatch is false.
 * 4. Does not depend on React or native APIs.
 */
export const findMatchingStores = (
  customerPincode: string,
  stores: Store[]
): StoreMatchResult => {
  const normalizedCustomerPin = normalizePincode(customerPincode);

  if (!normalizedCustomerPin || !Array.isArray(stores) || stores.length === 0) {
    return {
      matchingStores: [],
      otherStores: Array.isArray(stores) ? [...stores] : [],
      hasMatch: false,
    };
  }

  const matchingStores: Store[] = [];
  const otherStores: Store[] = [];

  for (const store of stores) {
    const storePin = normalizePincode(store.pincode);

    // Exact string match on normalized 6-digit pincode
    if (storePin && storePin === normalizedCustomerPin) {
      matchingStores.push(store);
    } else {
      otherStores.push(store);
    }
  }

  return {
    matchingStores,
    otherStores,
    hasMatch: matchingStores.length > 0,
  };
};
