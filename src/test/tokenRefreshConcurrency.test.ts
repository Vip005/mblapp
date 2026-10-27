/**
 * Regression Test Suite: Token Refresh Concurrency & Session Expiration
 *
 * Verifies:
 * 1. Single-Flight Mutex: Concurrent 401 requests share exactly ONE refresh call.
 * 2. Successful Refresh: All concurrent requests retry with the new token and resolve.
 * 3. Controlled Session Expiration: When refresh fails, auth is evicted safely.
 * 4. Token Security: Access and refresh tokens are never printed in logs.
 * 5. Recursion Protection: 401 on auth endpoints never triggers an infinite refresh loop.
 */

import { apiClient, ApiError, setOnUnauthorizedCallback } from '../services/api/apiClient';
import { storage } from '../utils/storage';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

async function runTests() {
  console.log('--- Starting Token Refresh Concurrency & Security Tests ---');
  let passedCount = 0;

  const originalFetch = global.fetch;

  try {
    // =========================================================================
    // Test 1: Single-flight refresh mutex under 5 concurrent 401 requests
    // =========================================================================
    console.log('Test 1: Single-flight refresh mutex under 5 concurrent 401 requests');
    {
      await storage.saveAuthToken('expired_access_token_aaa');
      await storage.saveRefreshToken('valid_refresh_token_bbb');

      let refreshCallCount = 0;
      let initialRequestCount = 0;
      let retriedRequestCount = 0;

      global.fetch = (async (url: string, init?: RequestInit) => {
        const urlStr = String(url);

        // Intercept refresh call
        if (urlStr.includes('/api/CustomerMaster/refresh')) {
          refreshCallCount++;
          // Simulate network latency during refresh
          await new Promise((r) => setTimeout(r, 40));
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            text: async () =>
              JSON.stringify({
                isSuccess: true,
                statusCode: 200,
                result: {
                  accessToken: 'new_fresh_access_token_ccc',
                  refreshToken: 'new_fresh_refresh_token_ddd',
                },
              }),
            json: async () => ({
              isSuccess: true,
              statusCode: 200,
              result: {
                accessToken: 'new_fresh_access_token_ccc',
                refreshToken: 'new_fresh_refresh_token_ddd',
              },
            }),
          };
        }

        // Intercept regular API call
        const authHeader = (init?.headers as any)?.Authorization || (init?.headers as any)?.authorization;
        if (authHeader === 'Bearer expired_access_token_aaa') {
          initialRequestCount++;
          return {
            ok: false,
            status: 401,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            text: async () => JSON.stringify({ message: 'Token expired' }),
            json: async () => ({ message: 'Token expired' }),
          };
        }

        if (authHeader === 'Bearer new_fresh_access_token_ccc') {
          retriedRequestCount++;
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            text: async () => JSON.stringify({ isSuccess: true, result: { cartCount: 3 } }),
            json: async () => ({ isSuccess: true, result: { cartCount: 3 } }),
          };
        }

        return {
          ok: false,
          status: 400,
          text: async () => 'Unexpected call',
        };
      }) as any;

      // Fire 5 concurrent requests with expired token
      const results = await Promise.all([
        apiClient.get('/api/CartMaster'),
        apiClient.get('/api/CartMaster'),
        apiClient.get('/api/CartMaster'),
        apiClient.get('/api/CartMaster'),
        apiClient.get('/api/CartMaster'),
      ]);

      assertEqual(refreshCallCount, 1, 'Refresh endpoint must be called EXACTLY ONCE for all concurrent 401s');
      assertEqual(initialRequestCount, 5, 'All 5 initial requests must have hit 401');
      assertEqual(retriedRequestCount, 5, 'All 5 requests must have retried with the new token');
      assertEqual(results.length, 5, 'All 5 requests must resolve successfully');

      // Verify that new tokens are stored
      const savedToken = await storage.getAuthToken();
      assertEqual(savedToken, 'new_fresh_access_token_ccc', 'New access token must be saved to storage');

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Test 2: Controlled session expiration when refresh fails
    // =========================================================================
    console.log('Test 2: Controlled session expiration when refresh token is invalid / revoked');
    {
      await storage.saveAuthToken('expired_access_token_xxx');
      await storage.saveRefreshToken('revoked_refresh_token_yyy');

      let unauthorizedCallbackCount = 0;
      setOnUnauthorizedCallback(() => {
        unauthorizedCallbackCount++;
      });

      let refreshAttemptCount = 0;

      global.fetch = (async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/CustomerMaster/refresh')) {
          refreshAttemptCount++;
          return {
            ok: false,
            status: 401,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            text: async () => JSON.stringify({ message: 'Compromised refresh token reused' }),
            json: async () => ({ message: 'Compromised refresh token reused' }),
          };
        }

        return {
          ok: false,
          status: 401,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          text: async () => JSON.stringify({ message: 'Token expired' }),
          json: async () => ({ message: 'Token expired' }),
        };
      }) as any;

      // Start 3 concurrent requests
      const promises = [
        apiClient.get('/api/CustomerAddressMaster'),
        apiClient.get('/api/CustomerAddressMaster'),
        apiClient.get('/api/CustomerAddressMaster'),
      ];

      const errors: ApiError[] = [];
      for (const p of promises) {
        try {
          await p;
        } catch (err: any) {
          errors.push(err);
        }
      }

      assertEqual(errors.length, 3, 'All 3 concurrent requests must be rejected when refresh fails');
      for (const err of errors) {
        assertEqual(err.statusCode, 401, 'Rejected error must have status 401');
        assert(err.message.includes('Session expired'), 'Error message must notify session expired');
      }

      assertEqual(refreshAttemptCount, 1, 'Refresh endpoint must be attempted only once');
      assert(unauthorizedCallbackCount >= 1, 'Unauthorized callback must be triggered to navigate user to login');

      // Verify that tokens were cleared from storage
      const tokenAfterExpiry = await storage.getAuthToken();
      assert(tokenAfterExpiry === null, 'Auth token must be cleared from storage');

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Test 3: Security - Tokens must never appear in console logs
    // =========================================================================
    console.log('Test 3: Security - Access and refresh tokens must never be logged');
    {
      const loggedMessages: string[] = [];
      const originalWarn = console.warn;
      const originalLog = console.log;
      const originalError = console.error;

      const testAccessToken = 'super_secret_jwt_access_token_12345';
      const testRefreshToken = 'super_secret_rt_refresh_token_67890';

      console.warn = (...args: any[]) => loggedMessages.push(args.map(String).join(' '));
      console.log = (...args: any[]) => loggedMessages.push(args.map(String).join(' '));
      console.error = (...args: any[]) => loggedMessages.push(args.map(String).join(' '));

      try {
        await storage.saveAuthToken(testAccessToken);
        await storage.saveRefreshToken(testRefreshToken);

        global.fetch = (async () => ({
          ok: false,
          status: 401,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          text: async () => JSON.stringify({ message: 'Unauthorized' }),
          json: async () => ({ message: 'Unauthorized' }),
        })) as any;

        try {
          await apiClient.get('/api/Stores');
        } catch {
          // Expected 401
        }

        const logDump = loggedMessages.join(' | ');
        assert(!logDump.includes(testAccessToken), 'Access token must NEVER appear in console logs');
        assert(!logDump.includes(testRefreshToken), 'Refresh token must NEVER appear in console logs');
      } finally {
        console.warn = originalWarn;
        console.log = originalLog;
        console.error = originalError;
      }

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Test 4: Auth endpoints exclusion - 401 on login/refresh never recurses
    // =========================================================================
    console.log('Test 4: Auth endpoints exclusion - 401 on login/refresh never recurses');
    {
      let refreshCalled = false;
      global.fetch = (async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/CustomerMaster/refresh')) {
          refreshCalled = true;
        }
        return {
          ok: false,
          status: 401,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          text: async () => JSON.stringify({ message: 'Invalid OTP' }),
          json: async () => ({ message: 'Invalid OTP' }),
        };
      }) as any;

      let caught = false;
      try {
        await apiClient.post('/api/CustomerMaster/verify-otp', { phoneNumber: '9876543210', otp: '000000' });
      } catch (err: any) {
        caught = true;
        assertEqual(err.statusCode, 401, 'Status code must be 401');
      }

      assert(caught, 'Must reject on 401');
      assert(!refreshCalled, 'Must NOT attempt session refresh on verify-otp 401 response');

      passedCount++;
      console.log('  -> PASSED');
    }

    console.log(`\nAll ${passedCount} Token Refresh Concurrency & Security tests passed successfully!`);
  } finally {
    global.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
