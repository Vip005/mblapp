/**
 * Unit & Component Utility Test Suite for FreshMart Mobile
 *
 * Covers:
 * - Phone, email, pincode validators
 * - JWT parsing and expiry detection
 * - Currency, date, and order ID formatters
 * - Image URL resolution and fallback
 * - Category, Brand, Store, and Order adapter mappings
 * - Order tracking timeline step transitions
 * - Payment gateway key prefix and mode security
 */

import { isValidPhone, isValidEmail, isValidPincode, isNotEmpty } from '../utils/validators';
import { parseJwt, isTokenExpired, base64UrlDecode } from '../utils/jwt';
import { formatCurrency, formatDate, generateOrderId } from '../utils/formatters';
import {
  resolveImageUrl,
  mapCategory,
  mapBrand,
  mapStore,
  mapOrder,
  getUpdatedTrackingSteps,
  mapBackendStatusToOrderStatus,
  normalizeActionType,
  isBannerDateValid,
} from '../services/api/adapters';
import { paymentService } from '../services/api/paymentService';

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

async function runUnitTests() {
  console.log('--- Starting Unit & Logic Tests ---\n');
  let passedCount = 0;

  // ============================================================================
  // Group 1: Phone Validation
  // ============================================================================
  console.log('[Group 1: Phone Number Validation]');
  {
    assert(isValidPhone('9876543210'), 'Standard 10-digit mobile number should be valid');
    assert(isValidPhone(' 9876543210 '), 'Mobile number with surrounding whitespace should be valid');
    assert(isValidPhone('+91 98765 43210') === false, '+91 prefix makes length 12 digits, strict local validator should reject');
    assert(isValidPhone('98765-43210'), 'Hyphenated 10 digits should clean to 10 digits and be valid');
    assert(!isValidPhone('987654321'), '9 digits should be rejected');
    assert(!isValidPhone('98765432100'), '11 digits should be rejected');
    assert(!isValidPhone(''), 'Empty phone string should be rejected');
    assert(!isValidPhone('abcdefghij'), 'Alphabetic characters should be stripped resulting in 0 digits');
    passedCount++;
    console.log('  -> PASSED: Phone Number Validation');
  }

  // ============================================================================
  // Group 2: Email and Pincode Validation
  // ============================================================================
  console.log('[Group 2: Email and Pincode Validation]');
  {
    assert(isValidEmail('customer@freshmart.com'), 'Standard email should be valid');
    assert(isValidEmail('  customer.name+tag@freshmart.co.in '), 'Email with alias and domain should be valid');
    assert(!isValidEmail('customer@'), 'Incomplete email missing domain should be invalid');
    assert(!isValidEmail('customer.com'), 'Email missing @ should be invalid');
    assert(!isValidEmail(''), 'Empty email should be invalid');

    assert(isValidPincode('600001'), 'Standard 6-digit Indian PIN code should be valid');
    assert(isValidPincode(' 600 001 '), 'PIN code with space should be valid after digit cleaning');
    assert(!isValidPincode('60000'), '5-digit PIN code should be invalid');
    assert(!isValidPincode('6000001'), '7-digit PIN code should be invalid');
    assert(!isValidPincode(''), 'Empty PIN code should be invalid');

    assert(isNotEmpty('Hello'), 'Non-empty string is valid');
    assert(!isNotEmpty('   '), 'Whitespace-only string is considered empty');
    assert(!isNotEmpty(undefined), 'Undefined is considered empty');
    passedCount++;
    console.log('  -> PASSED: Email and Pincode Validation');
  }

  // ============================================================================
  // Group 3: JWT Parsing and Token Expiration
  // ============================================================================
  console.log('[Group 3: JWT Parsing and Expiry Evaluation]');
  {
    // Build a mock JWT
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    
    // Token valid for 1 hour
    const activePayload = Buffer.from(
      JSON.stringify({
        nameid: 'user-101',
        CustomerId: '55',
        role: 'Customer',
        exp: nowSeconds + 3600,
        iat: nowSeconds,
      })
    ).toString('base64url');
    const validToken = `${validHeader}.${activePayload}.mockSignature123`;

    const parsed = parseJwt(validToken);
    assert(parsed !== null, 'Should parse valid token');
    assertEqual(parsed?.CustomerId, '55', 'Parsed CustomerId claim');
    assertEqual(parsed?.nameid, 'user-101', 'Parsed nameid claim');
    assert(!isTokenExpired(validToken, 10), 'Token expiring in 1 hour should NOT be expired');

    // Token expired 1 minute ago
    const expiredPayload = Buffer.from(
      JSON.stringify({
        CustomerId: '55',
        exp: nowSeconds - 60,
      })
    ).toString('base64url');
    const expiredToken = `${validHeader}.${expiredPayload}.mockSignature123`;
    assert(isTokenExpired(expiredToken, 10), 'Token expired in past must evaluate as expired');

    // Token expiring within the buffer margin (e.g. expires in 5s, buffer is 10s)
    const nearExpiryPayload = Buffer.from(
      JSON.stringify({
        CustomerId: '55',
        exp: nowSeconds + 5,
      })
    ).toString('base64url');
    const nearExpiryToken = `${validHeader}.${nearExpiryPayload}.mockSignature123`;
    assert(isTokenExpired(nearExpiryToken, 10), 'Token within buffer margin must evaluate as expired for preemptive refresh');

    // Invalid formats
    assert(parseJwt('not.a.jwt.token') === null, 'Malformed token string returns null');
    assert(parseJwt(null) === null, 'Null token returns null');
    assert(isTokenExpired(null), 'Null token is treated as expired');
    assert(isTokenExpired('corrupted'), 'Corrupted token is treated as expired');

    passedCount++;
    console.log('  -> PASSED: JWT Parsing and Expiry Evaluation');
  }

  // ============================================================================
  // Group 4: Formatters
  // ============================================================================
  console.log('[Group 4: Currency, Date, and Order ID Formatters]');
  {
    assertEqual(formatCurrency(0), '₹0.00', 'Zero amount formatted');
    assertEqual(formatCurrency(1458.5), '₹1,458.50', 'Decimals with commas formatted');
    assertEqual(formatCurrency(null), '₹0.00', 'Null formatted as 0');
    assertEqual(formatCurrency(NaN), '₹0.00', 'NaN formatted as 0');

    const orderId = generateOrderId();
    assert(orderId.startsWith('ORD-'), 'Order ID should begin with ORD-');
    assert(orderId.length >= 14, 'Order ID length includes date prefix and random suffix');

    const formattedDate = formatDate('2026-10-19T10:30:00Z');
    assert(typeof formattedDate === 'string' && formattedDate.length > 0, 'Date formatted cleanly');
    assertEqual(formatDate('invalid-date'), 'invalid-date', 'Invalid date returns original string without crash');

    passedCount++;
    console.log('  -> PASSED: Formatters');
  }

  // ============================================================================
  // Group 5: Image Resolution & CDN Fallback
  // ============================================================================
  console.log('[Group 5: Image URL Resolution & CDN Fallback]');
  {
    assertEqual(resolveImageUrl(''), '', 'Empty image returns empty string');
    assertEqual(resolveImageUrl(null), '', 'Null image returns empty string');
    assertEqual(resolveImageUrl('https://cdn.freshmart.com/img.jpg'), 'https://cdn.freshmart.com/img.jpg', 'Full HTTPS URL preserved');
    assertEqual(resolveImageUrl('http://img.freshmart.com/img.jpg'), 'http://img.freshmart.com/img.jpg', 'Full HTTP URL preserved');
    assertEqual(resolveImageUrl('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=', 'Base64 data URI preserved');

    const relativeResult = resolveImageUrl('/uploads/products/apple.jpg');
    assert(relativeResult.startsWith('http'), 'Relative path should be prefixed with BASE_URL');
    assert(relativeResult.endsWith('/uploads/products/apple.jpg'), 'Relative path should retain subpath');

    passedCount++;
    console.log('  -> PASSED: Image URL Resolution');
  }

  // ============================================================================
  // Group 6: Adapters — Category, Brand, Store, and Banner
  // ============================================================================
  console.log('[Group 6: Model Adapters & Data Normalization]');
  {
    const categoryDto = {
      productCategoryID: 12,
      categoryName: 'Fresh Organic Fruits',
      categoryCode: 'FRUITS_ORGANIC',
      imageUrl: '/images/fruits.png',
      itemCount: 45,
    };
    const cat = mapCategory(categoryDto);
    assertEqual(cat.id, '12', 'Category ID string mapped');
    assertEqual(cat.name, 'Fresh Organic Fruits', 'Category Name mapped');
    assertEqual(cat.slug, 'fruits_organic', 'Category Slug normalized');
    assert(cat.image.endsWith('/images/fruits.png'), 'Category image resolved');

    const storeDto = {
      storeID: 4,
      storeCode: 'STORE-04',
      storeName: 'FreshMart Velachery',
      pincode: 600042,
      isActive: true,
    };
    const store = mapStore(storeDto);
    assertEqual(store.id, 4, 'Store ID mapped');
    assertEqual(store.name, 'FreshMart Velachery', 'Store name mapped');
    assertEqual(store.pincode, '600042', 'Store pincode normalized to string');
    assert(store.isActive === true, 'Store isActive mapped');

    const brandDto = {
      productBrandMasterID: 8,
      productBrandName: 'Aashirvaad',
      brandCode: 'AASH',
      storeID: 4,
      isActive: true,
    };
    const brand = mapBrand(brandDto);
    assertEqual(brand.id, '8', 'Brand ID mapped');
    assertEqual(brand.name, 'Aashirvaad', 'Brand name mapped');

    assertEqual(normalizeActionType('category'), 'CATEGORY', 'Banner action type uppercase normalized');
    assertEqual(normalizeActionType('INVALID_TYPE'), 'NONE', 'Unknown banner action fallback to NONE');

    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    assert(isBannerDateValid(pastDate, futureDate), 'Active banner date is valid');
    assert(!isBannerDateValid(futureDate, undefined), 'Future starting banner is not yet valid');
    assert(!isBannerDateValid(undefined, pastDate), 'Past expired banner is no longer valid');

    passedCount++;
    console.log('  -> PASSED: Model Adapters & Data Normalization');
  }

  // ============================================================================
  // Group 7: Order Status Mapping & Tracking Steps
  // ============================================================================
  console.log('[Group 7: Order Status Mapping & Tracking Steps]');
  {
    assertEqual(mapBackendStatusToOrderStatus('Pending'), 'Placed', 'Pending maps to Placed');
    assertEqual(mapBackendStatusToOrderStatus('Processing'), 'Preparing', 'Processing maps to Preparing');
    assertEqual(mapBackendStatusToOrderStatus('Shipped'), 'Out for Delivery', 'Shipped maps to Out for Delivery');
    assertEqual(mapBackendStatusToOrderStatus('Delivered'), 'Delivered', 'Delivered maps to Delivered');
    assertEqual(mapBackendStatusToOrderStatus('Cancelled'), 'Cancelled', 'Cancelled maps to Cancelled');

    const stepsPlaced = getUpdatedTrackingSteps('Placed');
    assert(stepsPlaced[0].completed && stepsPlaced[0].current, 'Step 0 is current and completed for Placed');
    assert(!stepsPlaced[1].completed, 'Step 1 is not completed for Placed');

    const stepsDelivered = getUpdatedTrackingSteps('Delivered');
    for (const step of stepsDelivered) {
      assert(step.completed, `Step ${step.label} should be completed when status is Delivered`);
    }

    passedCount++;
    console.log('  -> PASSED: Order Status Mapping & Tracking Steps');
  }

  // ============================================================================
  // Group 8: Payment Gateway Key Prefix Security
  // ============================================================================
  console.log('[Group 8: Payment Security & Key Prefix Validation]');
  {
    const validTest = paymentService.validateKeyPrefix('rzp_test_1234567890abcdef', 'Test');
    assert(validTest.isValid === true, 'rzp_test_ prefix is valid in Test mode');

    const invalidTest = paymentService.validateKeyPrefix('rzp_live_1234567890abcdef', 'Test');
    assert(invalidTest.isValid === false, 'rzp_live_ prefix must be rejected in Test mode');

    const validLive = paymentService.validateKeyPrefix('rzp_live_1234567890abcdef', 'Live');
    assert(validLive.isValid === true, 'rzp_live_ prefix is valid in Live mode');

    const invalidLive = paymentService.validateKeyPrefix('rzp_test_1234567890abcdef', 'Live');
    assert(invalidLive.isValid === false, 'rzp_test_ prefix must be rejected in Live mode');

    const missingKey = paymentService.validateKeyPrefix('', 'Test');
    assert(missingKey.isValid === false, 'Missing key must be rejected');

    passedCount++;
    console.log('  -> PASSED: Payment Security & Key Prefix Validation');
  }

  console.log(`\nAll ${passedCount} unit test groups passed successfully!`);
}

runUnitTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
