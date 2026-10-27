import { apiClient, ApiError } from '../services/api/apiClient';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Checkout Database Error Diagnostics Tests ---');
  let passedCount = 0;

  const originalFetch = global.fetch;

  try {
    // =========================================================================
    // Test 1: Real apiClient.ts extraction of EF Core DbUpdateException
    // =========================================================================
    console.log('Test 1: Real apiClient.ts extraction of EF Core DbUpdateException with RootCause & SQL code');
    {
      const mockDbErrorPayload = {
        isSuccess: false,
        statusCode: 500,
        message: 'A database error occurred while saving entity changes.',
        detail: 'An error occurred while saving the entity changes. See the inner exception for details.',
        inner: "Invalid object name 'PaymentCheckoutAttempts'.",
        rootCause: "Invalid object name 'PaymentCheckoutAttempts'.",
        sqlErrorCode: 208,
      };

      // Mock global fetch to return server 500 response with database error payload
      global.fetch = (async () => ({
        ok: false,
        status: 500,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: async () => JSON.stringify(mockDbErrorPayload),
      })) as any;

      let caughtError: ApiError | null = null;
      try {
        await apiClient.post('/api/payments/checkout-session', { storeID: 1 });
      } catch (err: any) {
        caughtError = err;
      }

      assert(caughtError !== null, 'apiClient.post must throw ApiError on HTTP 500');
      assert(caughtError instanceof ApiError, 'Thrown error must be an instance of ApiError');
      assert(caughtError!.statusCode === 500, 'Status code must be 500');
      assert(
        caughtError!.message.includes("Invalid object name 'PaymentCheckoutAttempts'"),
        `apiClient must authoritatively parse and include the Root Cause table name in message: ${caughtError!.message}`
      );
      assert(
        caughtError!.message.includes('(SQL 208)'),
        `apiClient must authoritatively parse and format the SQL Server error code 208 in message: ${caughtError!.message}`
      );

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Test 2: Real apiClient.ts validation errors parsing with field details
    // =========================================================================
    console.log('Test 2: Real apiClient.ts validation errors parsing with field details');
    {
      const mockValidationErrorPayload = {
        isSuccess: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          StoreID: ['Valid StoreID is required.'],
          AddressId: ['Valid delivery address is required.'],
        },
      };

      global.fetch = (async () => ({
        ok: false,
        status: 400,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: async () => JSON.stringify(mockValidationErrorPayload),
      })) as any;

      let caughtError: ApiError | null = null;
      try {
        await apiClient.post('/api/payments/checkout-session', {});
      } catch (err: any) {
        caughtError = err;
      }

      assert(caughtError !== null, 'apiClient.post must throw ApiError on HTTP 400');
      assert(caughtError!.statusCode === 400, 'Status code must be 400');
      assert(
        caughtError!.message.includes('StoreID: Valid StoreID is required.'),
        `apiClient must format validation dictionary errors: ${caughtError!.message}`
      );
      assert(
        caughtError!.message.includes('AddressId: Valid delivery address is required.'),
        `apiClient must format validation dictionary errors: ${caughtError!.message}`
      );

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Test 3: Real apiClient.ts network timeout / connection abort handling
    // =========================================================================
    console.log('Test 3: Real apiClient.ts network timeout and failure handling');
    {
      global.fetch = (async () => {
        const error = new Error('Network request failed');
        (error as any).name = 'AbortError';
        throw error;
      }) as any;

      let caughtError: ApiError | null = null;
      try {
        await apiClient.get('/api/Stores');
      } catch (err: any) {
        caughtError = err;
      }

      assert(caughtError !== null, 'apiClient.get must throw ApiError on network abort');
      assert(caughtError instanceof ApiError, 'Must be ApiError instance');
      assert(
        caughtError!.message.includes('too long') || caughtError!.message.includes('Unable to connect') || caughtError!.statusCode === 408,
        `Must provide safe user-facing message on abort: ${caughtError!.message}`
      );

      passedCount++;
      console.log('  -> PASSED');
    }

    console.log(`\nAll ${passedCount} Checkout Database Error Diagnostics tests passed successfully!`);
  } finally {
    global.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
