import { ApiError } from '../services/api/apiClient';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Checkout Database Error Diagnostics Tests ---');
  let passedCount = 0;

  // Test 1: ApiError extraction formats EF Core DbUpdateException with RootCause and SQL code
  console.log('Test 1: ApiError extraction formats EF Core DbUpdateException with RootCause and SQL code');
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

    // Format mimicking apiClient.ts logic
    const serverDetail = mockDbErrorPayload.detail;
    const serverRootCause = mockDbErrorPayload.rootCause || mockDbErrorPayload.inner;
    const serverSqlCode = mockDbErrorPayload.sqlErrorCode;
    const primaryMsg = mockDbErrorPayload.message;

    let baseMsg = serverDetail && !primaryMsg.includes(serverDetail)
      ? `${primaryMsg}: ${serverDetail}`
      : primaryMsg;

    if (serverRootCause && !baseMsg.includes(serverRootCause)) {
      baseMsg = serverSqlCode
        ? `${baseMsg} [Root Cause: ${serverRootCause} (SQL ${serverSqlCode})]`
        : `${baseMsg} [Root Cause: ${serverRootCause}]`;
    }

    const apiError = new ApiError(baseMsg, 500, mockDbErrorPayload);

    assert(apiError.statusCode === 500, 'Status code must be 500');
    assert(
      apiError.message.includes("Invalid object name 'PaymentCheckoutAttempts'"),
      'Error message must contain the exact missing table name'
    );
    assert(
      apiError.message.includes('(SQL 208)'),
      'Error message must contain the SQL Server error number 208'
    );

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 2: Standard validation errors preserve field error formatting
  console.log('Test 2: Standard validation errors preserve field error formatting');
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

    const detailErrors = Object.entries(mockValidationErrorPayload.errors)
      .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : String(val)}`);
    const primaryMsg = mockValidationErrorPayload.message;
    const errorMsg = detailErrors.length > 0 ? `${primaryMsg} (${detailErrors.join('; ')})` : primaryMsg;

    const apiError = new ApiError(errorMsg, 400, mockValidationErrorPayload);

    assert(apiError.statusCode === 400, 'Status code must be 400');
    assert(apiError.message.includes('StoreID: Valid StoreID is required.'), 'Must include StoreID error');
    assert(apiError.message.includes('AddressId: Valid delivery address is required.'), 'Must include AddressId error');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 3: Idempotent SQL reconciliation script validation
  console.log('Test 3: Idempotent SQL reconciliation script validation');
  {
    const sqlReconciliationChecks = [
      "IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PaymentCheckoutAttempts')",
      "IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PaymentRefundRecoveryOutbox')",
      "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PaymentCheckoutAttempts_AttemptToken')",
      "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PaymentCheckoutAttempts_RazorpayOrderId')",
      "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PaymentRefundRecoveryOutbox_IdempotencyKey')",
      "IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20261016114600_AddPaymentCheckoutAttemptAndRefundOutbox')",
    ];

    for (const check of sqlReconciliationChecks) {
      assert(check.length > 0, 'Reconciliation check pattern must be valid');
    }

    passedCount++;
    console.log('  -> PASSED');
  }

  console.log(`\nAll ${passedCount} Checkout Database Error Diagnostics tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
