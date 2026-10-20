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
import {
  isHtmlErrorResponse,
  isAzureAppStopped,
  getApiErrorStatus,
  isNetworkError,
  isTimeoutError,
  isTechnicalOrUnsafeMessage,
  extractSafeFieldValidation,
  getSafeUserErrorMessage,
  sanitizeDevLog,
  ErrorContext,
} from '../utils/apiError';
import { ApiError } from '../services/api/apiClient';

console.log('--- Starting Global Context-Aware Error Handling Tests ---\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName: string, fn: () => void) {
  try {
    fn();
    console.log(`  -> PASSED: ${testName}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  -> FAILED: ${testName}`);
    console.error(`     Error: ${err?.message || err}`);
    testsFailed++;
  }
}

// ============================================================================
// Group 1: HTML & Azure App Service Detection & Shielding
// ============================================================================
console.log('[Group 1: HTML & Azure App Service Outage Shielding]');

runTest('Detects full <!DOCTYPE html> document and maps to friendly outage message', () => {
  const htmlDoc = `
    <!DOCTYPE html>
    <html lang="en">
      <head><title>500 Internal Server Error</title></head>
      <body><h1>Server Error</h1><p>Stack trace at Microsoft.AspNetCore...</p></body>
    </html>
  `;

  assert.strictEqual(isHtmlErrorResponse(htmlDoc), true);
  assert.strictEqual(isTechnicalOrUnsafeMessage(htmlDoc), true);

  const error = new ApiError('HTML error', 500, {
    isHtml: true,
    htmlSnippet: htmlDoc.slice(0, 100),
  });

  const safeMsg = getSafeUserErrorMessage(error, 'checkout');
  assert.strictEqual(safeMsg, 'Our service is temporarily unavailable. Please try again in a few minutes.');
  assert.strictEqual(safeMsg.includes('<html'), false);
  assert.strictEqual(safeMsg.includes('Microsoft'), false);
});

runTest('Detects Azure App Service 403 "Web App is stopped" error page', () => {
  const azureStoppedHtml = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head><title>Error 403 - This web app is stopped.</title></head>
    <body><h2>Error 403 - This web app is stopped.</h2>
    <p>The web app you have attempted to reach is currently stopped and does not accept any requests.</p>
    </body></html>
  `;

  assert.strictEqual(isAzureAppStopped(azureStoppedHtml), true);
  assert.strictEqual(isHtmlErrorResponse(azureStoppedHtml), true);

  const apiError = new ApiError('Server returned an HTML error response (HTTP 403).', 403, {
    isHtml: true,
    isAzureStopped: true,
    htmlSnippet: azureStoppedHtml.slice(0, 150),
  });

  const safeLoginMsg = getSafeUserErrorMessage(apiError, 'login');
  assert.strictEqual(safeLoginMsg, 'Our service is temporarily unavailable. Please try again in a few minutes.');

  const safeCartMsg = getSafeUserErrorMessage(apiError, 'cart');
  assert.strictEqual(safeCartMsg, 'Our service is temporarily unavailable. Please try again in a few minutes.');
});

// ============================================================================
// Group 2: SQL Server & Technical Exception Shielding
// ============================================================================
console.log('\n[Group 2: SQL Server & Technical Exception Shielding]');

runTest('Blocks SQL table names, error numbers, and EF Core DbUpdateException leaks', () => {
  const sqlErrorString = 'HTTP Error 500: An error occurred while saving the entity changes. [Root Cause: Invalid object name \'VendorBulkMaterialMaster\'. (SQL 208)]';

  assert.strictEqual(isTechnicalOrUnsafeMessage(sqlErrorString), true);

  const error = new ApiError(sqlErrorString, 500, {
    Detail: 'An error occurred while saving the entity changes.',
    RootCause: 'Invalid object name \'VendorBulkMaterialMaster\'.',
    SqlErrorCode: 208,
  });

  const safeUserMsg = getSafeUserErrorMessage(error, 'checkout');
  assert.strictEqual(safeUserMsg, 'Something went wrong on our side. Please try again shortly.');
  assert.strictEqual(safeUserMsg.includes('SQL'), false);
  assert.strictEqual(safeUserMsg.includes('VendorBulkMaterialMaster'), false);
  assert.strictEqual(safeUserMsg.includes('500'), false);
});

runTest('Blocks stack traces and runtime null reference leaks', () => {
  const runtimeError = 'NullReferenceException at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.Execute';
  assert.strictEqual(isTechnicalOrUnsafeMessage(runtimeError), true);

  const error = new Error(runtimeError);
  const safeMsg = getSafeUserErrorMessage(error, 'product');
  assert.strictEqual(safeMsg, 'Unable to load product details. Please try again.');
  assert.strictEqual(safeMsg.includes('NullReferenceException'), false);
  assert.strictEqual(safeMsg.includes('Microsoft'), false);
});

// ============================================================================
// Group 3: HTTP Status Codes & Context-Aware Messaging
// ============================================================================
console.log('\n[Group 3: HTTP Status Codes & Context-Aware Messaging]');

runTest('Extracts clean field validation on 400 Bad Request if provided by backend', () => {
  const validationError = new ApiError('Validation failure', 400, {
    errors: {
      PhoneNumber: ['Mobile number must be exactly 10 digits.'],
    },
  });

  const extracted = extractSafeFieldValidation(validationError);
  assert.strictEqual(extracted, 'Mobile number must be exactly 10 digits.');

  const userMsg = getSafeUserErrorMessage(validationError, 'login');
  assert.strictEqual(userMsg, 'Mobile number must be exactly 10 digits.');
});

runTest('Provides context-specific fallbacks for 400/422 when backend validation is technical', () => {
  const generic400 = new ApiError('HTTP Error 400: Bad Request', 400);

  assert.strictEqual(getSafeUserErrorMessage(generic400, 'login'), 'Please enter a valid mobile number.');
  assert.strictEqual(getSafeUserErrorMessage(generic400, 'otp'), 'The OTP is incorrect. Please check it and try again.');
  assert.strictEqual(getSafeUserErrorMessage(generic400, 'nameUpdate'), 'Please enter a valid name (at least 2 characters).');
  assert.strictEqual(getSafeUserErrorMessage(generic400, 'address'), 'Please check your delivery address details and try again.');
  assert.strictEqual(getSafeUserErrorMessage(generic400, 'coupon'), 'This coupon code is invalid or has expired.');
  assert.strictEqual(getSafeUserErrorMessage(generic400, 'cart'), 'Unable to update cart with the selected quantity.');
  assert.strictEqual(getSafeUserErrorMessage(generic400, 'checkout'), 'Please check your delivery details and order items before proceeding.');
});

runTest('Status 401 Unauthorized provides appropriate context guidance', () => {
  const err401 = new ApiError('Unauthorized', 401);

  assert.strictEqual(getSafeUserErrorMessage(err401, 'otp'), 'The OTP is incorrect. Please check it and try again.');
  assert.strictEqual(getSafeUserErrorMessage(err401, 'login'), 'Authentication failed. Please verify your phone number.');
  assert.strictEqual(getSafeUserErrorMessage(err401, 'checkout'), 'Your session has expired. Please log in again.');
  assert.strictEqual(getSafeUserErrorMessage(err401, 'session'), 'Your session has expired. Please log in again.');
});

runTest('Status 404 Not Found resolves context-aware entity messages', () => {
  const err404 = new ApiError('Request failed with status code 404', 404);

  assert.strictEqual(getSafeUserErrorMessage(err404, 'product'), 'Product not found. It may have been removed or is no longer available.');
  assert.strictEqual(getSafeUserErrorMessage(err404, 'category'), 'This category is no longer available.');
  assert.strictEqual(getSafeUserErrorMessage(err404, 'store'), 'This store could not be found. Please select another store.');
  assert.strictEqual(getSafeUserErrorMessage(err404, 'address'), 'This address could not be found. Please select another address.');
  assert.strictEqual(getSafeUserErrorMessage(err404, 'order'), 'We couldn’t find this order. Please refresh and try again.');
  assert.strictEqual(getSafeUserErrorMessage(err404, 'cart'), 'We couldn’t find your cart. Please try adding the items again.');
});

runTest('Status 409 Conflict resolves state-change guidance', () => {
  const err409 = new ApiError('Conflict', 409);

  assert.strictEqual(getSafeUserErrorMessage(err409, 'checkout'), 'This checkout attempt is no longer valid. Please start a new checkout session.');
  assert.strictEqual(getSafeUserErrorMessage(err409, 'cart'), 'Your cart was updated in another session. Please refresh and try again.');
  assert.strictEqual(getSafeUserErrorMessage(err409, 'orderCancel'), 'This order status has already changed and cannot be cancelled.');
});

runTest('Status 429 Too Many Requests resolves rate limit guidance', () => {
  const err429 = new ApiError('Rate limit exceeded', 429);
  assert.strictEqual(getSafeUserErrorMessage(err429, 'login'), 'Too many attempts. Please wait a moment and try again.');
  assert.strictEqual(getSafeUserErrorMessage(err429, 'otp'), 'Too many attempts. Please wait a moment and try again.');
});

runTest('Status 500, 502, 503 server error family resolves safe server message and 504 resolves timeout message', () => {
  for (const code of [500, 502, 503]) {
    const serverErr = new ApiError(`HTTP Error ${code}`, code);
    const msg = getSafeUserErrorMessage(serverErr, 'checkout');
    assert.strictEqual(msg, 'Something went wrong on our side. Please try again shortly.');
    assert.strictEqual(msg.includes(String(code)), false);
  }
  const timeout504 = new ApiError('HTTP Error 504', 504);
  const msg504 = getSafeUserErrorMessage(timeout504, 'checkout');
  assert.strictEqual(msg504, 'The request took too long. Please try again.');
  assert.strictEqual(msg504.includes('504'), false);
});

// ============================================================================
// Group 4: Network Connectivity & Timeout Failures
// ============================================================================
console.log('\n[Group 4: Network Connectivity & Timeout Failures]');

runTest('Detects offline network drop, DNS failures, and fetch aborts', () => {
  const fetchFailed = new Error('Network request failed');
  assert.strictEqual(isNetworkError(fetchFailed), true);
  assert.strictEqual(
    getSafeUserErrorMessage(fetchFailed, 'general'),
    'Unable to connect. Please check your internet connection and try again.'
  );

  const dnsFailed = new Error('getaddrinfo ENOTFOUND freshmart-api.azurewebsites.net');
  assert.strictEqual(isNetworkError(dnsFailed), true);
  assert.strictEqual(
    getSafeUserErrorMessage(dnsFailed, 'general'),
    'Unable to connect. Please check your internet connection and try again.'
  );
});

runTest('Detects AbortController timeout and HTTP 408/504 timeouts', () => {
  const abortErr = new Error('The user aborted a request.');
  (abortErr as any).name = 'AbortError';

  assert.strictEqual(isTimeoutError(abortErr), true);
  assert.strictEqual(
    getSafeUserErrorMessage(abortErr, 'general'),
    'The request took too long. Please try again.'
  );

  const timeout408 = new ApiError('Request timed out', 408);
  assert.strictEqual(isTimeoutError(timeout408), true);
  assert.strictEqual(
    getSafeUserErrorMessage(timeout408, 'checkout'),
    'The request took too long. Please try again.'
  );
});

// ============================================================================
// Group 5: Developer Diagnostics Sanitization & Cart Safety
// ============================================================================
console.log('\n[Group 5: Developer Diagnostics & Cart Safety Guarantees]');

runTest('sanitizeDevLog safely executes without crashing and logs concise diagnostics', () => {
  let loggedOutput = '';
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    loggedOutput = args.join(' ');
  };

  try {
    const errorWithHtml = new ApiError('Server error', 500, {
      isHtml: true,
      htmlSnippet: '<html><body>Error</body></html>',
    });
    sanitizeDevLog('TestContext', errorWithHtml);
    assert.strictEqual(loggedOutput.includes('[TestContext] Sanitized Diagnostic:'), true);
    assert.strictEqual(loggedOutput.includes('<html>'), false);

    const errorWithAzure = new ApiError('Azure stopped', 403, {
      isAzureStopped: true,
    });
    sanitizeDevLog('AzureContext', errorWithAzure);
    assert.strictEqual(loggedOutput.includes('Azure App Service is currently STOPPED'), true);
  } finally {
    console.warn = originalWarn;
  }
});

runTest('Checkout failure default fallback guarantees cart preservation notice', () => {
  const technicalErr = new ApiError('DbUpdateException [Root Cause: table missing (SQL 208)]', 0);
  const checkoutMsg = getSafeUserErrorMessage(technicalErr, 'checkout');
  assert.strictEqual(checkoutMsg.includes('cart has been preserved'), true);

  const paymentMsg = getSafeUserErrorMessage(technicalErr, 'payment');
  assert.strictEqual(paymentMsg.includes('cart has been preserved'), true);
});

console.log(`\n======================================================`);
console.log(`Test Execution Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
console.log(`======================================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('ALL 13 GLOBAL ERROR HANDLING TEST SUITES PASSED SUCCESSFULLY!\n');
}
