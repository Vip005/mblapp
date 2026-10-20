function assert(condition: any, message?: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message || ''}`);
  }
}
assert.strictEqual = function (actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ''}`);
  }
};

declare const Buffer: any;

import { storeService } from '../services/api/storeService';
import { determineNextAppRoute } from '../utils/onboardingProgression';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { apiClient } from '../services/api/apiClient';
import { Store, User } from '../types';

console.log('--- Starting FreshMart Store Selection Flow Tests ---\n');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(testName: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  -> PASSED: ${testName}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  -> FAILED: ${testName}`);
    console.error(`     Error: ${err?.message || err}`);
    testsFailed++;
  }
}

// In-memory mock storage backing
const mockStorageMap = new Map<string, any>();
(storage as any).get = async <T>(key: string, defaultValue?: T): Promise<T> => {
  return mockStorageMap.has(key) ? mockStorageMap.get(key) : (defaultValue as T);
};
(storage as any).set = async (key: string, value: any): Promise<void> => {
  mockStorageMap.set(key, value);
};
(storage as any).remove = async (key: string): Promise<void> => {
  mockStorageMap.delete(key);
};
(storage as any).getAuthToken = async (): Promise<string | null> => {
  return mockStorageMap.get(STORAGE_KEYS.AUTH_TOKEN) || null;
};

// Helper mock valid JWT generator
function createMockValidJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      nameid: 'cust-10',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');
  return `${header}.${payload}.mockSignature12345`;
}

// Helper mock store generator
const createMockStoreDto = (id: number, name: string, isActive = true, pincode = '600001') => ({
  storeID: id,
  storeCode: `STR-${id}`,
  storeName: name,
  addressLine1: `${id} Market Road`,
  district: 'Chennai',
  state: 'Tamil Nadu',
  pincode,
  isActive,
});

async function main() {
  // ============================================================================
  // Group 1: Single Active Store Auto-Selection (Rule 3)
  // ============================================================================
  console.log('[Group 1: Single Active Store Auto-Selection]');

  await runTest('Rule 3: Auto-selects store and persists selection when exactly 1 active store is returned', async () => {
    mockStorageMap.clear();

    // Mock API returning exactly 1 active store
    const originalGet = apiClient.get;
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [createMockStoreDto(101, 'FreshMart Hub Central', true)];
      }
      return null;
    };

    try {
      const resolution = await storeService.validateAndResolveSelectedStore({ throwOnError: true });
      assert.strictEqual(resolution.apiSuccess, true, 'API call must succeed');
      assert.strictEqual(resolution.activeStores.length, 1, 'Should find 1 active store');
      assert.strictEqual(resolution.autoSelected, true, 'autoSelected flag must be true');
      assert(resolution.selectedStore !== null, 'selectedStore must be resolved');
      assert.strictEqual(resolution.selectedStore?.id, 101, 'Selected store ID must be 101');

      // Verify persisted in storage
      const persistedId = await storeService.getSelectedStoreId();
      assert.strictEqual(persistedId, 101, 'Persisted store ID must be 101');
    } finally {
      apiClient.get = originalGet;
    }
  });

  // ============================================================================
  // Group 2: Multiple Active Stores Manual Selection (Rule 4)
  // ============================================================================
  console.log('\n[Group 2: Multiple Active Stores Manual Selection]');

  await runTest('Rule 4: Does NOT auto-select when multiple active stores are available', async () => {
    mockStorageMap.clear();

    const originalGet = apiClient.get;
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [
          createMockStoreDto(101, 'FreshMart Central', true),
          createMockStoreDto(102, 'FreshMart North', true),
        ];
      }
      return null;
    };

    try {
      const resolution = await storeService.validateAndResolveSelectedStore({ throwOnError: true });
      assert.strictEqual(resolution.activeStores.length, 2, 'Should find 2 active stores');
      assert.strictEqual(resolution.autoSelected, false, 'Must not auto-select when multiple stores are present');
      assert.strictEqual(resolution.selectedStore, null, 'selectedStore must remain null');

      const persistedId = await storeService.getSelectedStoreId();
      assert.strictEqual(persistedId, null, 'No store ID should be persisted in storage');
    } finally {
      apiClient.get = originalGet;
    }
  });

  // ============================================================================
  // Group 3: Zero Active Stores Handling (Rule 2)
  // ============================================================================
  console.log('\n[Group 3: Zero Active Stores Empty State Handling]');

  await runTest('Rule 2: Handles zero active stores correctly without false auto-selection', async () => {
    mockStorageMap.clear();

    const originalGet = apiClient.get;
    // API returns stores, but all are inactive
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [
          createMockStoreDto(101, 'FreshMart Closed Hub', false),
          createMockStoreDto(102, 'FreshMart Inactive Hub', false),
        ];
      }
      return null;
    };

    try {
      const resolution = await storeService.validateAndResolveSelectedStore({ throwOnError: true });
      assert.strictEqual(resolution.allStores.length, 2, 'Total stores returned is 2');
      assert.strictEqual(resolution.activeStores.length, 0, 'Active stores count must be 0');
      assert.strictEqual(resolution.autoSelected, false, 'Must not auto-select when 0 stores active');
      assert.strictEqual(resolution.selectedStore, null, 'selectedStore must be null');

      const persistedId = await storeService.getSelectedStoreId();
      assert.strictEqual(persistedId, null, 'No store ID should be persisted');
    } finally {
      apiClient.get = originalGet;
    }
  });

  // ============================================================================
  // Group 4: Stale Store Inactivation & Replacement (Rule 5)
  // ============================================================================
  console.log('\n[Group 4: Stale Store Inactivation & Safe Replacement / Clearing]');

  await runTest('Rule 5: Preserves already-selected store when it remains active', async () => {
    mockStorageMap.clear();
    await storage.set(STORAGE_KEYS.SELECTED_STORE_ID, 101);

    const originalGet = apiClient.get;
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [
          createMockStoreDto(101, 'FreshMart Central', true),
          createMockStoreDto(102, 'FreshMart North', true),
        ];
      }
      return null;
    };

    try {
      const resolution = await storeService.validateAndResolveSelectedStore({ throwOnError: true });
      assert.strictEqual(resolution.clearedStale, false, 'clearedStale should be false');
      assert.strictEqual(resolution.selectedStore?.id, 101, 'Should keep Store 101 selected');

      const persistedId = await storeService.getSelectedStoreId();
      assert.strictEqual(persistedId, 101, 'Stored ID must remain 101');
    } finally {
      apiClient.get = originalGet;
    }
  });

  await runTest('Rule 5: Safely replaces inactive selected store with single active store', async () => {
    mockStorageMap.clear();
    // User had Store 101 selected
    await storage.set(STORAGE_KEYS.SELECTED_STORE_ID, 101);

    const originalGet = apiClient.get;
    // Store 101 is now inactive; only Store 102 is active
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [
          createMockStoreDto(101, 'FreshMart Central (Closed)', false),
          createMockStoreDto(102, 'FreshMart North', true),
        ];
      }
      return null;
    };

    try {
      const resolution = await storeService.validateAndResolveSelectedStore({ throwOnError: true });
      assert.strictEqual(resolution.clearedStale, true, 'clearedStale must be true');
      assert.strictEqual(resolution.autoSelected, true, 'autoSelected must be true for replacing with single active store');
      assert.strictEqual(resolution.selectedStore?.id, 102, 'Must replace with Store 102');

      const persistedId = await storeService.getSelectedStoreId();
      assert.strictEqual(persistedId, 102, 'Storage must be safely updated to Store 102');
    } finally {
      apiClient.get = originalGet;
    }
  });

  await runTest('Rule 5: Safely clears inactive selected store when multiple active stores remain', async () => {
    mockStorageMap.clear();
    await storage.set(STORAGE_KEYS.SELECTED_STORE_ID, 101);

    const originalGet = apiClient.get;
    // Store 101 is inactive; Store 102 and Store 103 are active
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [
          createMockStoreDto(101, 'FreshMart Central (Closed)', false),
          createMockStoreDto(102, 'FreshMart North', true),
          createMockStoreDto(103, 'FreshMart South', true),
        ];
      }
      return null;
    };

    try {
      const resolution = await storeService.validateAndResolveSelectedStore({ throwOnError: true });
      assert.strictEqual(resolution.clearedStale, true, 'clearedStale must be true');
      assert.strictEqual(resolution.selectedStore, null, 'Must clear selected store to null');

      const persistedId = await storeService.getSelectedStoreId();
      assert.strictEqual(persistedId, null, 'Storage must be safely cleared to null');
    } finally {
      apiClient.get = originalGet;
    }
  });

  // ============================================================================
  // Group 5: Network & API Failure Resilience (Rule 1)
  // ============================================================================
  console.log('\n[Group 5: Network & API Failure Resilience]');

  await runTest('Rule 1: Does NOT clear existing stored selection on transient network failure', async () => {
    mockStorageMap.clear();
    await storage.set(STORAGE_KEYS.SELECTED_STORE_ID, 101);

    const originalGet = apiClient.get;
    apiClient.get = async () => {
      throw new Error('Network request failed');
    };

    try {
      const resolution = await storeService.validateAndResolveSelectedStore({ throwOnError: false });
      assert.strictEqual(resolution.apiSuccess, false, 'apiSuccess should be false');
      assert.strictEqual(resolution.clearedStale, false, 'clearedStale must NOT be true on network failure');

      // Stored ID should NOT have been wiped
      const persistedId = await storeService.getSelectedStoreId();
      assert.strictEqual(persistedId, 101, 'Stored ID must be preserved during network failure');
    } finally {
      apiClient.get = originalGet;
    }
  });

  // ============================================================================
  // Group 6: Customer Onboarding Progression Integration (Rule 8)
  // ============================================================================
  console.log('\n[Group 6: Customer Onboarding Progression]');

  await runTest('Rule 8: Returning onboarding progression with 1 active store routes directly to MAIN', async () => {
    mockStorageMap.clear();

    const mockUser: User = {
      id: 'cust-10',
      name: 'Sheik Fresh',
      phone: '9876543210',
      email: 'sheik@example.com',
      createdAt: new Date().toISOString(),
    };

    // Customer has auth and valid address, but no store selected yet
    mockStorageMap.set(STORAGE_KEYS.AUTH_TOKEN, createMockValidJwt());
    mockStorageMap.set(STORAGE_KEYS.USER, mockUser);
    mockStorageMap.set(STORAGE_KEYS.customerAddresses('cust-10'), [
      {
        id: '1',
        name: 'Sheik',
        phone: '9876543210',
        doorFlat: '10',
        street: 'Main Road',
        area: 'Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        type: 'Home',
        isDefault: true,
      },
    ]);

    const originalGet = apiClient.get;
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [createMockStoreDto(101, 'FreshMart Hub Central', true)];
      }
      return null;
    };

    try {
      const nextRoute = await determineNextAppRoute(mockUser);
      assert.strictEqual(nextRoute.type, 'MAIN', 'Should directly navigate to MAIN when 1 store exists');

      // Check customer onboarding flag marked complete
      const isComplete = await storage.get(STORAGE_KEYS.customerOnboarding('cust-10'), false);
      assert.strictEqual(isComplete, true, 'Customer onboarding flag must be set to true');

      const storeId = await storeService.getSelectedStoreId();
      assert.strictEqual(storeId, 101, 'Store ID 101 must be persisted');
    } finally {
      apiClient.get = originalGet;
    }
  });

  await runTest('Rule 8: Onboarding progression with multiple stores routes to StoreSelection screen', async () => {
    mockStorageMap.clear();

    const mockUser: User = {
      id: 'cust-10',
      name: 'Sheik Fresh',
      phone: '9876543210',
      email: 'sheik@example.com',
      createdAt: new Date().toISOString(),
    };

    mockStorageMap.set(STORAGE_KEYS.AUTH_TOKEN, createMockValidJwt());
    mockStorageMap.set(STORAGE_KEYS.USER, mockUser);
    mockStorageMap.set(STORAGE_KEYS.customerAddresses('cust-10'), [
      {
        id: '1',
        name: 'Sheik',
        phone: '9876543210',
        doorFlat: '10',
        street: 'Main Road',
        area: 'Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        type: 'Home',
        isDefault: true,
      },
    ]);

    const originalGet = apiClient.get;
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [
          createMockStoreDto(101, 'FreshMart Central', true),
          createMockStoreDto(102, 'FreshMart North', true),
        ];
      }
      return null;
    };

    try {
      const nextRoute = await determineNextAppRoute(mockUser);
      assert.strictEqual(nextRoute.type, 'AUTH_STEP', 'Should route to AUTH_STEP');
      if (nextRoute.type === 'AUTH_STEP') {
        assert.strictEqual(nextRoute.screen, 'StoreSelection', 'AUTH_STEP screen must be StoreSelection');
      }
    } finally {
      apiClient.get = originalGet;
    }
  });

  // ============================================================================
  // Group 7: Downstream Store Consumption & Unified Source of Truth (Rule 7)
  // ============================================================================
  console.log('\n[Group 7: Downstream Store Consumption]');

  await runTest('Rule 7: Downstream features consume the unified selectedStoreId without divergence', async () => {
    mockStorageMap.clear();

    const originalGet = apiClient.get;
    (apiClient as any).get = async (url: string) => {
      if (url === '/api/Stores') {
        return [createMockStoreDto(101, 'FreshMart Central', true)];
      }
      return null;
    };

    try {
      await storeService.validateAndResolveSelectedStore({ throwOnError: true });
      const currentSelectedId = await storeService.getSelectedStoreId();
      const currentSelectedStore = await storeService.getSelectedStore();

      assert.strictEqual(currentSelectedId, 101, 'Resolved store ID must be 101');
      assert.strictEqual(currentSelectedStore?.id, 101, 'Resolved store must have ID 101');
      assert.strictEqual(currentSelectedStore?.name, 'FreshMart Central', 'Resolved store name must match');
    } finally {
      apiClient.get = originalGet;
    }
  });

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('\n======================================================');
  console.log(`Test Execution Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('ALL STORE SELECTION FLOW TESTS PASSED SUCCESSFULLY!\n');
  }
}

main().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
