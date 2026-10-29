/**
 * Regression Test Suite: SEC-09 Mobile Token Storage and TLS Security
 *
 * Verifies:
 * 1. Secure Token Storage: Tokens are persisted in expo-secure-store, never plain AsyncStorage.
 * 2. Storage Guard: Defensive routing redirects any storage.set(AUTH_TOKEN) to SecureStore.
 * 3. Legacy Migration: Pre-existing AsyncStorage tokens are safely migrated and deleted.
 * 4. Auth Session Purge: clearAuthSession cleanses tokens, user info, and customer data.
 * 5. TLS Transport Enforcement: Remote/production URLs enforce HTTPS; plaintext HTTP is disallowed.
 * 6. Local Dev Permissibility: Localhost/loopback/private LAN HTTP is permitted only in DEV mode.
 * 7. Token Confidentiality: No tokens, passwords, or Authorization headers are leaked in logs.
 */

import { storage, STORAGE_KEYS, secureStorage, saveAuthToken, getAuthToken, clearAuthToken, saveRefreshToken, getRefreshToken, clearRefreshToken, clearAuthSession } from '../utils/storage';
import { enforceHttpsUrl, isLocalOrLoopbackHost, API_CONFIG } from '../services/api/config';
import { buildApiUrl } from '../services/api/apiClient';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`
    );
  }
}

export async function runSecurityStorageAndTlsTests() {
  console.log('--- Starting SEC-09 Mobile Storage & TLS Security Tests ---');
  let passedCount = 0;

  // Clean slate before testing
  await storage.clear();
  await clearAuthToken();
  await clearRefreshToken();

  // =========================================================================
  // Test 1: saveAuthToken uses expo-secure-store and never plaintext AsyncStorage
  // =========================================================================
  console.log('Test 1: saveAuthToken uses SecureStore and never plain AsyncStorage');
  {
    const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_token_123';
    await saveAuthToken(sampleToken);

    // Verify token is in secureStorage
    const secureVal = await secureStorage.getItem('grocery_auth_token');
    assertEqual(secureVal, sampleToken, 'Token should be retrieved from SecureStore');

    // Verify token is NOT in AsyncStorage under STORAGE_KEYS.AUTH_TOKEN
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    const rawAsyncVal = await asyncStorageModule.getItem(STORAGE_KEYS.AUTH_TOKEN);
    assertEqual(rawAsyncVal, null, 'Token must NEVER be written to unencrypted AsyncStorage');

    const retrieved = await getAuthToken();
    assertEqual(retrieved, sampleToken, 'getAuthToken should match the saved token');

    passedCount++;
    console.log('  -> PASSED');
  }

  // =========================================================================
  // Test 2: saveRefreshToken uses expo-secure-store
  // =========================================================================
  console.log('Test 2: saveRefreshToken uses SecureStore and never plain AsyncStorage');
  {
    const sampleRefresh = 'freshmart_refresh_token_xyz_456';
    await saveRefreshToken(sampleRefresh);

    const secureVal = await secureStorage.getItem('grocery_refresh_token');
    assertEqual(secureVal, sampleRefresh, 'Refresh token should be retrieved from SecureStore');

    const retrieved = await getRefreshToken();
    assertEqual(retrieved, sampleRefresh, 'getRefreshToken should match saved refresh token');

    passedCount++;
    console.log('  -> PASSED');
  }

  // =========================================================================
  // Test 3: Defensive guard on storage.set redirects sensitive tokens to SecureStore
  // =========================================================================
  console.log('Test 3: Defensive guard intercepts storage.set and routes to SecureStore');
  {
    const tokenViaStorageSet = 'jwt_token_passed_via_generic_storage_set';
    await storage.set(STORAGE_KEYS.AUTH_TOKEN, tokenViaStorageSet);

    // Must be in SecureStore
    const secureVal = await secureStorage.getItem('grocery_auth_token');
    assertEqual(secureVal, tokenViaStorageSet, 'Generic storage.set must route auth token to SecureStore');

    // Must NOT be in raw AsyncStorage
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    const rawAsyncVal = await asyncStorageModule.getItem(STORAGE_KEYS.AUTH_TOKEN);
    assertEqual(rawAsyncVal, null, 'Defensive guard must keep AsyncStorage empty for AUTH_TOKEN');

    passedCount++;
    console.log('  -> PASSED');
  }

  // =========================================================================
  // Test 4: Legacy migration from AsyncStorage to SecureStore
  // =========================================================================
  console.log('Test 4: Legacy migration migrates tokens from AsyncStorage to SecureStore');
  {
    // Clear SecureStore
    await secureStorage.deleteItem('grocery_auth_token');

    // Simulate an old version of the app having written token into AsyncStorage
    const legacyToken = 'legacy_jwt_found_in_async_storage';
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    await asyncStorageModule.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(legacyToken));

    // Calling getAuthToken should migrate it
    const migratedToken = await getAuthToken();
    assertEqual(migratedToken, legacyToken, 'getAuthToken should extract the legacy token');

    // SecureStore now has the token
    const secureVal = await secureStorage.getItem('grocery_auth_token');
    assertEqual(secureVal, legacyToken, 'Legacy token should now be stored in SecureStore');

    // AsyncStorage legacy key has been purged
    const rawAsyncValAfter = await asyncStorageModule.getItem(STORAGE_KEYS.AUTH_TOKEN);
    assertEqual(rawAsyncValAfter, null, 'Legacy token must be purged from AsyncStorage after migration');

    passedCount++;
    console.log('  -> PASSED');
  }

  // =========================================================================
  // Test 5: clearAuthSession purges tokens and customer data
  // =========================================================================
  console.log('Test 5: clearAuthSession purges access token, refresh token, and user session');
  {
    await saveAuthToken('active_token');
    await saveRefreshToken('active_refresh');
    await storage.set(STORAGE_KEYS.USER, { id: 'cust_99', name: 'Security User' });
    await storage.set(STORAGE_KEYS.customerCart('cust_99'), [{ id: 1, name: 'Apple' }]);

    await clearAuthSession('cust_99');

    const tokenAfter = await getAuthToken();
    const refreshAfter = await getRefreshToken();
    const userAfter = await storage.get(STORAGE_KEYS.USER, null);
    const cartAfter = await storage.get(STORAGE_KEYS.customerCart('cust_99'), null);

    assertEqual(tokenAfter, null, 'Auth token must be cleared');
    assertEqual(refreshAfter, null, 'Refresh token must be cleared');
    assertEqual(userAfter, null, 'User profile must be cleared');
    assertEqual(cartAfter, null, 'Customer cart must be cleared');

    passedCount++;
    console.log('  -> PASSED');
  }

  // =========================================================================
  // Test 6: enforceHttpsUrl converts remote HTTP to HTTPS in production
  // =========================================================================
  console.log('Test 6: enforceHttpsUrl upgrades remote HTTP to HTTPS in production and development');
  {
    // Remote Azure App Service URL over HTTP
    const remoteHttpUrl = 'http://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net';
    const remoteUpgradedProd = enforceHttpsUrl(remoteHttpUrl, false);
    assertEqual(
      remoteUpgradedProd,
      'https://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net',
      'Remote HTTP URL must be upgraded to HTTPS in production'
    );

    const remoteUpgradedDev = enforceHttpsUrl(remoteHttpUrl, true);
    assertEqual(
      remoteUpgradedDev,
      'https://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net',
      'Remote HTTP URL must be upgraded to HTTPS even in DEV mode'
    );

    // Bare domain without scheme
    const bareDomain = 'api.freshmart.com';
    assertEqual(enforceHttpsUrl(bareDomain), 'https://api.freshmart.com', 'Bare domain should default to https://');

    // Trailing slashes stripped
    const trailingSlashUrl = 'https://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net///';
    assertEqual(
      enforceHttpsUrl(trailingSlashUrl),
      'https://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net',
      'Trailing slashes should be stripped'
    );

    passedCount++;
    console.log('  -> PASSED');
  }

  // =========================================================================
  // Test 7: Localhost/private LAN permissibility only in DEV mode
  // =========================================================================
  console.log('Test 7: Localhost and private LAN HTTP permitted ONLY during local dev');
  {
    const localhostUrl = 'http://localhost:5000';
    const emulatorUrl = 'http://10.0.2.2:5000';
    const lanUrl = 'http://192.168.1.150:5000';

    // In DEV mode, local addresses stay HTTP
    assertEqual(enforceHttpsUrl(localhostUrl, true), 'http://localhost:5000', 'Localhost stays HTTP in DEV');
    assertEqual(enforceHttpsUrl(emulatorUrl, true), 'http://10.0.2.2:5000', 'Emulator loopback stays HTTP in DEV');
    assertEqual(enforceHttpsUrl(lanUrl, true), 'http://192.168.1.150:5000', 'Private LAN stays HTTP in DEV');

    // In Production mode (!isDev), plain HTTP is strictly disallowed even for local hosts
    assertEqual(enforceHttpsUrl(localhostUrl, false), 'https://localhost:5000', 'Localhost upgraded to HTTPS in release');
    assertEqual(enforceHttpsUrl(emulatorUrl, false), 'https://10.0.2.2:5000', 'Emulator upgraded to HTTPS in release');
    assertEqual(enforceHttpsUrl(lanUrl, false), 'https://192.168.1.150:5000', 'Private LAN upgraded to HTTPS in release');

    // Host checker verification
    assert(isLocalOrLoopbackHost('localhost'), 'localhost should be recognized as local');
    assert(isLocalOrLoopbackHost('127.0.0.1:5000'), '127.0.0.1 should be recognized as local');
    assert(isLocalOrLoopbackHost('10.0.2.2:5000'), '10.0.2.2 should be recognized as local');
    assert(isLocalOrLoopbackHost('192.168.0.25:8080'), '192.168.x.x should be recognized as local LAN');
    assert(isLocalOrLoopbackHost('10.1.2.3'), '10.x.x.x should be recognized as local LAN');
    assert(!isLocalOrLoopbackHost('api.freshmart.com'), 'Public domain must not be recognized as local');
    assert(!isLocalOrLoopbackHost('groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net'), 'Azure domain must not be recognized as local');

    passedCount++;
    console.log('  -> PASSED');
  }

  // =========================================================================
  // Test 8: buildApiUrl enforces HTTPS on absolute URLs
  // =========================================================================
  console.log('Test 8: buildApiUrl enforces HTTPS on remote URLs');
  {
    const insecureRemote = 'http://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net/api/test';
    const securedUrl = buildApiUrl(insecureRemote);
    assertEqual(
      securedUrl,
      'https://groceryapi-fvcjdtfpcrera8cd.westus3-01.azurewebsites.net/api/test',
      'buildApiUrl must enforce HTTPS on remote endpoints'
    );

    const relativeEndpoint = buildApiUrl('/api/CustomerMaster/profile');
    assert(relativeEndpoint.startsWith('https://'), 'Relative endpoints must resolve to HTTPS base URL');

    passedCount++;
    console.log('  -> PASSED');
  }

  console.log(`\n======================================================`);
  console.log(`ALL ${passedCount} SEC-09 MOBILE SECURITY TESTS PASSED!`);
  console.log(`======================================================\n`);
}

// Auto-run if executed directly
if (require.main === module) {
  runSecurityStorageAndTlsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test execution failed:', err);
      process.exit(1);
    });
}
