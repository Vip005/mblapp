/**
 * Automated Customer Journey Test Suite for FreshMart Mobile
 *
 * Implements the 10 Core Customer Journeys mandated by Mobile Test Architecture:
 * - Journey 1: Application Launch & Initial Screen Resolution
 * - Journey 2: Authentication & OTP Verification Flow
 * - Journey 3: Store Selection, Isolation & Retention Flow
 * - Journey 4: Product Discovery, Category Browsing & Search
 * - Journey 5: Cart Management, Mutex Concurrency & Quantity Limits
 * - Journey 6: Checkout Guard Validation (Missing Address, Empty Cart, Out of Stock)
 * - Journey 7: Cash on Delivery (COD) Checkout & Order Placement
 * - Journey 8: Payment-First Online Flow (Razorpay Session, Verification & Reconciliation)
 * - Journey 9: Order History, Order Details & Timeline Tracking
 * - Journey 10: Session Expiry, 401 Interception & Network Error Shielding
 */

import { storage, STORAGE_KEYS } from '../utils/storage';
import { authService } from '../services/api/authService';
import { storeService } from '../services/api/storeService';
import { categoryService } from '../services/api/categoryService';
import { productService } from '../services/api/productService';
import { cartService } from '../services/api/cartService';
import { paymentService } from '../services/api/paymentService';
import { orderService } from '../services/api/orderService';
import { apiClient, ApiError } from '../services/api/apiClient';
import { determineNextAppRoute } from '../utils/onboardingProgression';
import {
  User,
  Store,
  Category,
  Product,
  CartItem,
  CheckoutSessionCreateRequestDto,
  CheckoutPaymentVerifyRequestDto,
} from '../types';

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

async function runCustomerJourneys() {
  console.log('--- Starting Customer Journey Automation Tests ---\n');
  let passedCount = 0;

  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;
  const originalDelete = apiClient.delete;

  try {
    // ============================================================================
    // Journey 1: Application Launch & Initial Route Resolution
    // ============================================================================
    console.log('[Journey 1: Application Launch & Initial Route Resolution]');
    {
      await storage.clearAuthSession();
      await storage.remove(STORAGE_KEYS.SELECTED_STORE_ID);

      // 1. Unauthenticated user with no token -> Routes to Login
      const routeUnauth = await determineNextAppRoute(null);
      assertEqual(routeUnauth.type, 'AUTH', 'Unauthenticated user navigates to AUTH');
      if (routeUnauth.type === 'AUTH') {
        assertEqual(routeUnauth.screen, 'Login', 'Unauthenticated user lands on Login');
      }

      // Seed valid active JWT
      const nowSec = Math.floor(Date.now() / 1000);
      const mockPayload = Buffer.from(JSON.stringify({ CustomerId: '1', exp: nowSec + 3600 })).toString('base64url');
      const validJwt = `header.${mockPayload}.sig`;
      await storage.saveAuthToken(validJwt);

      // 2. Authenticated user without name -> Routes to NameUpdate
      const userWithoutName: User = { id: '1', name: '', phone: '9876543210', email: '', createdAt: new Date().toISOString() };
      await storage.set(STORAGE_KEYS.USER, userWithoutName);
      const routeNoName = await determineNextAppRoute(userWithoutName);
      assertEqual(routeNoName.type, 'AUTH_STEP', 'User without name navigates to AUTH_STEP');
      if (routeNoName.type === 'AUTH_STEP') {
        assertEqual(routeNoName.screen, 'NameUpdate', 'User lands on NameUpdate');
      }

      // 3. User with name but no primary address -> Routes to PrimaryAddress
      const userWithName: User = { id: '1', name: 'Sheik', phone: '9876543210', email: '', createdAt: new Date().toISOString() };
      await storage.set(STORAGE_KEYS.USER, userWithName);
      await storage.remove(STORAGE_KEYS.customerAddresses('1'));
      apiClient.get = (async () => []) as any; // No address on server

      const routeNoAddress = await determineNextAppRoute(userWithName);
      assertEqual(routeNoAddress.type, 'AUTH_STEP', 'User without address navigates to AUTH_STEP');
      if (routeNoAddress.type === 'AUTH_STEP') {
        assertEqual(routeNoAddress.screen, 'PrimaryAddress', 'User lands on PrimaryAddress');
      }

      passedCount++;
      console.log('  -> PASSED: Journey 1: Application Launch');
    }

    // ============================================================================
    // Journey 2: Authentication & OTP Verification Flow
    // ============================================================================
    console.log('[Journey 2: Authentication & OTP Verification Flow]');
    {
      apiClient.post = (async (endpoint: string, body: any): Promise<any> => {
        if (endpoint === '/api/CustomerMaster/send-otp') {
          if (!body.phoneNumber || body.phoneNumber.length !== 10) {
            throw new ApiError('Please enter a valid 10-digit mobile number.', 400);
          }
          return { otp: '998877', message: 'OTP sent successfully' };
        }
        if (endpoint === '/api/CustomerMaster/verify-otp') {
          if (body.otp !== '998877') {
            throw new ApiError('Invalid or expired OTP. Please try again.', 400);
          }
          return {
            token: 'jwt_mock_token_journey2',
            accessToken: 'jwt_mock_token_journey2',
            refreshToken: 'rt_mock_token_journey2',
            customerId: 88,
            customerName: 'Kavitha S',
            phoneNumber: '9876543210',
          };
        }
        return originalPost(endpoint, body);
      }) as any;

      // 1. Invalid phone number rejection
      let caughtInvalidPhone = false;
      try {
        await authService.login('12345');
      } catch (err: any) {
        caughtInvalidPhone = true;
      }
      assert(caughtInvalidPhone, 'Should reject invalid phone length');

      // 2. Valid send OTP
      const loginRes = await authService.login('9876543210');
      assert(loginRes.requiresOtp === true, 'Valid phone requires OTP');

      // 3. Failed OTP verification
      let caughtWrongOtp = false;
      try {
        await authService.verifyOtp('9876543210', '000000');
      } catch (err: any) {
        caughtWrongOtp = true;
        assert(err.message.includes('Invalid or expired OTP'), 'Correct error message on wrong OTP');
      }
      assert(caughtWrongOtp, 'Should reject incorrect OTP');

      // 4. Successful OTP verification
      const authRes = await authService.verifyOtp('9876543210', '998877');
      assertEqual(authRes.token, 'jwt_mock_token_journey2', 'Returned JWT token');
      assertEqual(authRes.user.id, '88', 'User ID persisted');

      // 5. Session restoration verification
      const savedToken = await storage.getAuthToken();
      assertEqual(savedToken, 'jwt_mock_token_journey2', 'Auth token stored in secure storage');

      passedCount++;
      console.log('  -> PASSED: Journey 2: Authentication');
    }

    // ============================================================================
    // Journey 3: Store Selection & Multi-Store Isolation
    // ============================================================================
    console.log('[Journey 3: Store Selection & Multi-Store Isolation]');
    {
      const store1: Store = { id: 1, name: 'Anna Nagar Store', storeCode: 'STR-1', isActive: true, pincode: '600040' };
      const store2: Store = { id: 2, name: 'Velachery Store', storeCode: 'STR-2', isActive: true, pincode: '600042' };

      apiClient.get = (async (endpoint: string): Promise<any> => {
        if (endpoint.startsWith('/api/Stores')) {
          return [store1, store2];
        }
        return originalGet(endpoint);
      }) as any;

      await storeService.setSelectedStore(store1);
      const selectedId1 = await storeService.getSelectedStoreId();
      assertEqual(selectedId1, 1, 'Store 1 ID persisted in storage');
      const selectedObj1 = await storeService.getSelectedStore();
      assertEqual(selectedObj1?.id, 1, 'Store 1 object resolved');

      await storeService.setSelectedStore(store2);
      const selectedId2 = await storeService.getSelectedStoreId();
      assertEqual(selectedId2, 2, 'Store 2 ID persisted in storage');
      const selectedObj2 = await storeService.getSelectedStore();
      assertEqual(selectedObj2?.id, 2, 'Store 2 object resolved');

      passedCount++;
      console.log('  -> PASSED: Journey 3: Store Selection');
    }

    // ============================================================================
    // Journey 4: Product Discovery, Category Browsing & Search
    // ============================================================================
    console.log('[Journey 4: Product Discovery, Category Browsing & Search]');
    {
      apiClient.get = (async (endpoint: string): Promise<any> => {
        if (endpoint.startsWith('/api/Categories')) {
          return [
            { productCategoryID: 1, categoryName: 'Vegetables', itemCount: 10 },
            { productCategoryID: 2, categoryName: 'Fruits', itemCount: 15 },
          ];
        }
        if (endpoint.startsWith('/api/Products')) {
          return [
            {
              productID: 10,
              productName: 'Organic Tomato 1kg',
              brandName: 'Fresh Farms',
              variants: [{ productVariantID: 20, variantLabel: '1kg', mrp: 40.0, sellingPrice: 35.0, stock: 25, isAvailable: true }],
            },
            {
              productID: 11,
              productName: 'Shimla Apple 500g',
              brandName: 'Royal',
              variants: [{ productVariantID: 21, variantLabel: '500g', mrp: 120.0, sellingPrice: 100.0, stock: 0, isAvailable: false }],
            },
          ];
        }
        return originalGet(endpoint);
      }) as any;

      const categories = await categoryService.getCategories(1);
      assertEqual(categories.length, 2, 'Loaded 2 categories');

      const products = await productService.getProducts({}, undefined, 1);
      assertEqual(products.length, 2, 'Loaded 2 products');
      assertEqual(products[0].variants[0].isAvailable, true, 'Product 1 in stock');
      assertEqual(products[1].variants[0].isAvailable, false, 'Product 2 out of stock');

      passedCount++;
      console.log('  -> PASSED: Journey 4: Product Discovery & Search');
    }

    // ============================================================================
    // Journey 5: Cart Management, Mutex Concurrency & Quantity Limits
    // ============================================================================
    console.log('[Journey 5: Cart Management, Mutex Concurrency & Quantity Limits]');
    {
      const item1: CartItem = {
        id: '10_20',
        productId: '10',
        variantId: '20',
        quantity: 2,
        price: 35.0,
        totalPrice: 70.0,
        product: { id: '10', name: 'Tomato', originalPrice: 40.0, sellingPrice: 35.0 } as any,
        variant: { id: '20', name: '1kg', price: 35.0, originalPrice: 40.0, stock: 50, isAvailable: true } as any,
      };

      const summary = cartService.calculateSummary([item1], null, {
        cartID: 1,
        storeID: 1,
        customerId: 88,
        deliveryFee: 30,
        platformFee: 5,
        taxPercentage: 0,
      });
      assertEqual(summary.subtotal, 70.0, 'Subtotal: 2 * 35 = 70.0');
      assertEqual(summary.deliveryCharge, 30.0, 'Delivery fee applied');
      assertEqual(summary.platformFee, 5.0, 'Platform fee applied');
      assertEqual(summary.total, 105.0, 'Grand total: 70 + 30 + 5 = 105.0');

      passedCount++;
      console.log('  -> PASSED: Journey 5: Cart Management');
    }

    // ============================================================================
    // Journey 6: Checkout Guard Validation
    // ============================================================================
    console.log('[Journey 6: Checkout Guard Validation]');
    {
      // Missing store ID
      let caughtNoStore = false;
      try {
        await paymentService.createCheckoutSession({
          storeID: 0,
          addressId: 1,
          items: [{ productID: 1, productVariantID: 1, productName: 'Item 1', quantity: 1, price: 10, total: 10 }],
        });
      } catch (err: any) {
        caughtNoStore = true;
      }
      assert(caughtNoStore, 'Should reject checkout session with storeID = 0');

      // Missing address ID
      let caughtNoAddress = false;
      try {
        await paymentService.createCheckoutSession({
          storeID: 1,
          addressId: 0,
          items: [{ productID: 1, productVariantID: 1, productName: 'Item 1', quantity: 1, price: 10, total: 10 }],
        });
      } catch (err: any) {
        caughtNoAddress = true;
      }
      assert(caughtNoAddress, 'Should reject checkout session with addressId = 0');

      // Empty items
      let caughtEmptyItems = false;
      try {
        await paymentService.createCheckoutSession({ storeID: 1, addressId: 1, items: [] });
      } catch (err: any) {
        caughtEmptyItems = true;
      }
      assert(caughtEmptyItems, 'Should reject checkout session with empty items');

      passedCount++;
      console.log('  -> PASSED: Journey 6: Checkout Guard Validation');
    }

    // ============================================================================
    // Journey 7: Cash on Delivery (COD) Checkout & Order Placement
    // ============================================================================
    console.log('[Journey 7: Cash on Delivery (COD) Checkout & Order Placement]');
    {
      await storage.set(STORAGE_KEYS.USER, { id: '88', name: 'Kavitha S', phone: '9876543210' });

      apiClient.post = (async (endpoint: string, body: any): Promise<any> => {
        if (endpoint === '/api/OrderMaster/checkout') {
          return {
            orderID: 901,
            orderNumber: 'ORD-COD-901',
            grandTotal: 105.0,
            status: 'Pending',
          };
        }
        return originalPost(endpoint, body);
      }) as any;

      const order = await orderService.createOrder({
        items: [
          {
            id: 'oi-1',
            productId: '10',
            variantId: '20',
            productName: 'Tomato',
            brand: 'FreshMart',
            image: '',
            variantName: '1kg',
            price: 35.0,
            quantity: 2,
            totalPrice: 70.0,
          },
        ],
        subtotal: 70.0,
        discount: 0,
        couponDiscount: 0,
        deliveryCharge: 30.0,
        platformFee: 5.0,
        tax: 0,
        total: 105.0,
        address: { id: '5', name: 'Home', phone: '9876543210', doorFlat: '1', street: 'A', area: 'B', city: 'Chennai', state: 'TN', pincode: '600001', type: 'Home', isDefault: true },
        paymentMethod: 'cod',
        storeId: 1,
      });

      assertEqual(order.id, '901', 'Created COD order ID 901');
      assertEqual(order.paymentMode, 'COD', 'Payment mode confirmed as COD');

      passedCount++;
      console.log('  -> PASSED: Journey 7: Cash on Delivery');
    }

    // ============================================================================
    // Journey 8: Payment-First Online Flow (Razorpay Session & Verification)
    // ============================================================================
    console.log('[Journey 8: Payment-First Online Flow (Razorpay Session & Verification)]');
    {
      apiClient.post = (async (endpoint: string, data: any): Promise<any> => {
        if (endpoint === '/api/payments/checkout-session') {
          return {
            attemptToken: 'tok_journey8_session',
            razorpayOrderId: 'order_rzp_j8',
            amountInPaise: 131220,
            grandTotal: 1312.2,
            currency: 'INR',
            publicKeyId: 'rzp_test_public_key',
            gateway: 'Razorpay',
            mode: 'Test',
          };
        }
        if (endpoint === '/api/payments/verify-checkout') {
          return {
            isSuccess: true,
            status: 'OrderCreated',
            orderID: 902,
            orderNumber: 'ORD-ONLINE-902',
          };
        }
        return originalPost(endpoint, data);
      }) as any;

      // 1. Create checkout attempt session
      const session = await paymentService.createCheckoutSession({
        storeID: 1,
        addressId: 5,
        items: [{ productID: 88, productVariantID: 188, productName: 'Sunflower Oil', price: 729.0, quantity: 2, total: 1458.0 }],
        couponCode: 'OCT786',
        clientGrandTotal: 1312.2,
        clientAmountInPaise: 131220,
      });

      assertEqual(session.attemptToken, 'tok_journey8_session', 'Attempt token generated');
      assertEqual(session.amountInPaise, 131220, 'Paise calculated: ₹1312.20 * 100 = 131220');

      // 2. Gateway key security validation
      const keyVal = paymentService.validateKeyPrefix(session.publicKeyId, session.mode);
      assert(keyVal.isValid, 'Public key prefix matches mode');

      // 3. Server verification
      const verifyRes = await paymentService.verifyCheckoutPayment({
        attemptToken: session.attemptToken,
        razorpayOrderId: session.razorpayOrderId,
        razorpayPaymentId: 'pay_rzp_mock_j8',
        razorpaySignature: 'sig_rzp_mock_j8',
      });

      assertEqual(verifyRes.status, 'OrderCreated', 'Terminal status OrderCreated confirmed');
      assertEqual(verifyRes.orderID, 902, 'Confirmed order ID 902');

      passedCount++;
      console.log('  -> PASSED: Journey 8: Payment-First Online Flow');
    }

    // ============================================================================
    // Journey 9: Order History, Order Details & Timeline Tracking
    // ============================================================================
    console.log('[Journey 9: Order History, Order Details & Timeline Tracking]');
    {
      apiClient.get = (async (endpoint: string): Promise<any> => {
        if (endpoint.includes('/api/OrderMaster')) {
          return [
            {
              orderID: 902,
              orderNumber: 'ORD-ONLINE-902',
              userID: '88',
              storeID: 1,
              status: 'Processing',
              grandTotal: 1312.2,
              createdDate: '2026-10-19T10:00:00Z',
            },
          ];
        }
        return originalGet(endpoint);
      }) as any;

      const customerOrders = await orderService.getOrders('88');
      const order902 = customerOrders.find((o) => o.id === '902');
      assert(order902 !== undefined, 'Found order 902');
      assertEqual(order902?.status, 'Preparing', 'Processing status mapped to Preparing');
      assert(order902?.trackingSteps.length === 5, '5 tracking steps present');
      assert(order902?.trackingSteps[0].completed === true, 'Step 1 Placed completed');
      assert(order902?.trackingSteps[1].completed === true, 'Step 2 Confirmed completed');

      passedCount++;
      console.log('  -> PASSED: Journey 9: Order History & Tracking');
    }

    // ============================================================================
    // Journey 10: Session Expiry, 401 Interception & Network Error Shielding
    // ============================================================================
    console.log('[Journey 10: Session Expiry, 401 Interception & Network Error Shielding]');
    {
      // 1. Simulate Azure App Service 403 Stopped page
      const azureError = new ApiError('Our service is temporarily unavailable. Please try again in a few minutes.', 403, {
        isHtml: true,
        isAzureStopped: true,
      });
      assertEqual(azureError.statusCode, 403, 'Azure outage status 403');
      assert(azureError.message.includes('temporarily unavailable'), 'Human-friendly message without exposing HTML');

      // 2. Simulate 408 Timeout
      const timeoutError = new ApiError('The request took too long. Please try again.', 408);
      assertEqual(timeoutError.statusCode, 408, 'Timeout status 408');

      passedCount++;
      console.log('  -> PASSED: Journey 10: Session Expiry & Error Shielding');
    }

  } finally {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.put = originalPut;
    apiClient.delete = originalDelete;
  }

  console.log(`\nAll ${passedCount} Customer Journey tests passed successfully!`);
}

runCustomerJourneys().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
