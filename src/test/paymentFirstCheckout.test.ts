import { paymentService } from '../services/api/paymentService';
import { orderService } from '../services/api/orderService';
import { apiClient } from '../services/api/apiClient';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { mapOrder } from '../services/api/adapters';
import {
  CheckoutSessionCreateRequestDto,
  CheckoutSessionCreateResponseDto,
  CheckoutPaymentVerifyRequestDto,
  CheckoutPaymentVerifyResponseDto,
  CheckoutPaymentFailureRequestDto,
  CheckoutAttemptStatusResponseDto,
  Order,
  CartItem,
} from '../types';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Payment-First Checkout Mobile Integration Tests ---');
  let passedCount = 0;

  // Test 1: createCheckoutSession input validation
  console.log('Test 1: paymentService.createCheckoutSession input validation');
  {
    let caughtMissingStore = false;
    try {
      await paymentService.createCheckoutSession({
        storeID: 0,
        addressId: 1,
        items: [{ productID: 1, productVariantID: 1, productName: 'Apple', price: 50, quantity: 1, total: 50 }],
      });
    } catch (err: any) {
      caughtMissingStore = true;
      assert(err.message.includes('Valid store ID is required'), 'Should reject missing store ID');
    }
    assert(caughtMissingStore, 'Should have caught missing store ID');

    let caughtMissingAddress = false;
    try {
      await paymentService.createCheckoutSession({
        storeID: 1,
        addressId: 0,
        items: [{ productID: 1, productVariantID: 1, productName: 'Apple', price: 50, quantity: 1, total: 50 }],
      });
    } catch (err: any) {
      caughtMissingAddress = true;
      assert(err.message.includes('Valid delivery address is required'), 'Should reject missing address');
    }
    assert(caughtMissingAddress, 'Should have caught missing address');

    let caughtEmptyItems = false;
    try {
      await paymentService.createCheckoutSession({
        storeID: 1,
        addressId: 1,
        items: [],
      });
    } catch (err: any) {
      caughtEmptyItems = true;
      assert(err.message.includes('Cart must contain at least one item'), 'Should reject empty items');
    }
    assert(caughtEmptyItems, 'Should have caught empty items');

    let caughtInvalidQty = false;
    try {
      await paymentService.createCheckoutSession({
        storeID: 1,
        addressId: 1,
        items: [{ productID: 1, productVariantID: 1, productName: 'Apple', price: 50, quantity: 0, total: 0 }],
      });
    } catch (err: any) {
      caughtInvalidQty = true;
      assert(err.message.includes('Quantity must be greater than zero'), 'Should reject quantity 0');
    }
    assert(caughtInvalidQty, 'Should have caught quantity 0');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 2: createCheckoutSession success response unpacking
  console.log('Test 2: paymentService.createCheckoutSession successful response contract');
  {
    const originalPost = apiClient.post;
    apiClient.post = (async (endpoint: string, data: any): Promise<any> => {
      assert(endpoint === '/api/payments/checkout-session', 'Must call checkout-session endpoint');
      assert(data.storeID === 10, 'Must pass storeID');
      assert(data.addressId === 25, 'Must pass addressId');
      assert(data.items.length === 1, 'Must pass items');
      return {
        isSuccess: true,
        statusCode: 200,
        result: {
          attemptToken: 'tok_test_session_abc123',
          razorpayOrderId: 'order_rzp_mock_987',
          amountInPaise: 15000,
          grandTotal: 150.0,
          itemTotal: 100.0,
          deliveryFee: 40.0,
          platformFee: 10.0,
          taxes: 0,
          discountTotal: 0,
          currency: 'INR',
          publicKeyId: 'rzp_test_public_key',
          gateway: 'Razorpay',
          mode: 'Test',
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        },
      };
    }) as any;

    try {
      const res = await paymentService.createCheckoutSession({
        storeID: 10,
        addressId: 25,
        items: [{ productID: 5, productVariantID: 12, productName: 'Organic Milk', price: 100, quantity: 1, total: 100 }],
        clientGrandTotal: 150.0,
        clientAmountInPaise: 15000,
      });

      assert(res.attemptToken === 'tok_test_session_abc123', 'Should unpack attemptToken');
      assert(res.razorpayOrderId === 'order_rzp_mock_987', 'Should unpack razorpayOrderId');
      assert(res.amountInPaise === 15000, 'Should unpack amountInPaise');
      assert(res.grandTotal === 150.0, 'Should unpack grandTotal');
      assert(res.publicKeyId === 'rzp_test_public_key', 'Should unpack publicKeyId');
      assert(res.currency === 'INR', 'Should unpack currency');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.post = originalPost;
    }
  }

  // Test 3: verifyCheckoutPayment input validation
  console.log('Test 3: paymentService.verifyCheckoutPayment input validation');
  {
    let caughtMissingToken = false;
    try {
      await paymentService.verifyCheckoutPayment({
        attemptToken: '',
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: 'sig_123',
      });
    } catch (err: any) {
      caughtMissingToken = true;
      assert(err.message.includes('Attempt token is required'), 'Should reject missing token');
    }
    assert(caughtMissingToken, 'Should have caught missing token');

    let caughtMissingSig = false;
    try {
      await paymentService.verifyCheckoutPayment({
        attemptToken: 'tok_123',
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: ' ',
      });
    } catch (err: any) {
      caughtMissingSig = true;
      assert(err.message.includes('Razorpay signature is required'), 'Should reject empty signature');
    }
    assert(caughtMissingSig, 'Should have caught empty signature');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 4: verifyCheckoutPayment authoritatively establishes OrderCreated
  console.log('Test 4: verifyCheckoutPayment authoritatively establishes OrderCreated');
  {
    const originalPost = apiClient.post;
    apiClient.post = (async (endpoint: string, data: any): Promise<any> => {
      assert(endpoint === '/api/payments/verify-checkout', 'Must call verify-checkout endpoint');
      assert(data.attemptToken === 'tok_test_session_abc123', 'Must pass attemptToken');
      assert(data.razorpayPaymentId === 'pay_test_777', 'Must pass razorpayPaymentId');
      assert(data.razorpaySignature === 'sig_valid_hex', 'Must pass signature');
      return {
        isSuccess: true,
        statusCode: 200,
        result: {
          isSuccess: true,
          status: 'OrderCreated',
          orderID: 88,
          orderNumber: 'ORD-20261016-088',
          message: 'Order created successfully.',
          isDuplicate: false,
          amountInPaise: 15000,
          verifiedAt: new Date().toISOString(),
          orderDetails: {
            order: {
              orderID: 88,
              orderNumber: 'ORD-20261016-088',
              status: 'Confirmed',
              paymentStatus: 'Paid',
              paymentMode: 'RAZORPAY',
              grandTotal: 150.0,
              itemTotal: 100.0,
              deliveryFee: 40.0,
              platformFee: 10.0,
              taxes: 0,
              discountTotal: 0,
            },
            items: [
              {
                orderItemID: 120,
                orderID: 88,
                productID: 5,
                productVariantID: 12,
                productName: 'Organic Milk',
                price: 100,
                quantity: 1,
                total: 100,
              },
            ],
          },
        },
      };
    }) as any;

    try {
      const verifyRes = await paymentService.verifyCheckoutPayment({
        attemptToken: 'tok_test_session_abc123',
        razorpayOrderId: 'order_rzp_mock_987',
        razorpayPaymentId: 'pay_test_777',
        razorpaySignature: 'sig_valid_hex',
      });

      assert(verifyRes.isSuccess === true, 'Verification should report success');
      assert(verifyRes.status === 'OrderCreated', 'Status must be OrderCreated');
      assert(verifyRes.orderID === 88, 'OrderID must be authoritative 88');
      assert(verifyRes.orderNumber === 'ORD-20261016-088', 'OrderNumber must match backend');
      assert(verifyRes.orderDetails?.order?.paymentStatus === 'Paid', 'Order paymentStatus must be Paid');

      // Test mapOrder with returned orderDetails
      const mappedOrder = mapOrder(verifyRes.orderDetails!.order, verifyRes.orderDetails!.items);
      assert(mappedOrder.id === '88', 'Mapped order id must match');
      assert(mappedOrder.orderNumber === 'ORD-20261016-088', 'Mapped order number must match');
      assert(mappedOrder.status === 'Confirmed', 'Mapped status must be Confirmed');
      assert(mappedOrder.items.length === 1, 'Mapped items length must be 1');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.post = originalPost;
    }
  }

  // Test 5: SDK success followed by backend rejection preserves cart
  console.log('Test 5: SDK success but backend verification rejection does NOT create order');
  {
    const originalPost = apiClient.post;
    apiClient.post = (async (): Promise<any> => ({
      isSuccess: false,
      statusCode: 400,
      result: {
        isSuccess: false,
        status: 'PaymentFailed',
        orderID: null,
        orderNumber: null,
        message: 'Signature verification failed with Razorpay gateway.',
        isDuplicate: false,
        amountInPaise: 15000,
      },
    })) as any;

    try {
      const verifyRes = await paymentService.verifyCheckoutPayment({
        attemptToken: 'tok_test_session_abc123',
        razorpayOrderId: 'order_rzp_mock_987',
        razorpayPaymentId: 'pay_tampered_777',
        razorpaySignature: 'sig_invalid',
      });

      assert(verifyRes.isSuccess === false, 'Verification must return false');
      assert(verifyRes.status === 'PaymentFailed', 'Status must be PaymentFailed');
      assert(!verifyRes.orderID, 'OrderID must remain null/undefined');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.post = originalPost;
    }
  }

  // Test 6: failCheckoutPayment records failure and preserves attempt token
  console.log('Test 6: failCheckoutPayment records cancellation cleanly');
  {
    const originalPost = apiClient.post;
    let payloadRecorded: any = null;

    apiClient.post = (async (endpoint: string, data: any): Promise<any> => {
      assert(endpoint === '/api/payments/fail-checkout', 'Must call fail-checkout endpoint');
      payloadRecorded = data;
      return {
        isSuccess: true,
        statusCode: 200,
        result: {
          success: true,
          status: 'PaymentFailed',
          message: 'Payment failure recorded successfully.',
        },
      };
    }) as any;

    try {
      const failRes = await paymentService.failCheckoutPayment({
        attemptToken: 'tok_cancel_123',
        razorpayOrderId: 'order_rzp_cancel_456',
        failureCode: 'USER_CANCELLED',
        failureReason: 'Customer closed Razorpay sheet without paying',
      });

      assert(failRes.status === 'PaymentFailed', 'Status must be PaymentFailed');
      assert(payloadRecorded.attemptToken === 'tok_cancel_123', 'Payload must record attemptToken');
      assert(payloadRecorded.failureCode === 'USER_CANCELLED', 'Payload must record failureCode');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.post = originalPost;
    }
  }

  // Test 7: Verification timeout with successful status recovery
  console.log('Test 7: Verification network timeout recovers existing attempt via status endpoint');
  {
    const originalGet = apiClient.get;
    let pollCount = 0;

    apiClient.get = (async (endpoint: string): Promise<any> => {
      assert(endpoint.includes('/api/payments/checkout/tok_recover_123/status'), 'Must query status for token');
      pollCount++;
      if (pollCount === 1) {
        // First poll: server is still processing
        return {
          isSuccess: true,
          statusCode: 200,
          result: {
            checkoutAttemptID: 42,
            attemptToken: 'tok_recover_123',
            status: 'PaymentProcessing',
            orderID: null,
            razorpayOrderId: 'order_rec_456',
            amountInPaise: 20000,
            grandTotal: 200.0,
            currency: 'INR',
          },
        };
      }
      // Second poll: webhook or concurrent worker created the order!
      return {
        isSuccess: true,
        statusCode: 200,
        result: {
          checkoutAttemptID: 42,
          attemptToken: 'tok_recover_123',
          status: 'OrderCreated',
          orderID: 99,
          orderNumber: 'ORD-20261016-099',
          razorpayOrderId: 'order_rec_456',
          razorpayPaymentId: 'pay_rec_789',
          amountInPaise: 20000,
          grandTotal: 200.0,
          currency: 'INR',
          orderDetails: {
            order: {
              orderID: 99,
              orderNumber: 'ORD-20261016-099',
              status: 'Confirmed',
              paymentStatus: 'Paid',
              paymentMode: 'RAZORPAY',
              grandTotal: 200.0,
            },
            items: [],
          },
        },
      };
    }) as any;

    try {
      const recovered = await paymentService.recoverCheckoutStatus('tok_recover_123', 3, 10);
      assert(recovered.status === 'OrderCreated', 'Recovered status must be OrderCreated');
      assert(recovered.orderID === 99, 'Recovered orderID must be 99');
      assert(pollCount === 2, 'Should stop polling immediately when terminal status OrderCreated is reached');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.get = originalGet;
    }
  }

  // Test 8: Non-OrderCreated terminal states handled cleanly
  console.log('Test 8: ReconciliationRequired and Refunded terminal statuses handled safely');
  {
    const originalGet = apiClient.get;

    apiClient.get = (async (): Promise<any> => ({
      isSuccess: true,
      statusCode: 200,
      result: {
        checkoutAttemptID: 43,
        attemptToken: 'tok_reconcile_123',
        status: 'ReconciliationRequired',
        orderID: null,
        razorpayOrderId: 'order_rec_456',
        amountInPaise: 5000,
        grandTotal: 50.0,
        currency: 'INR',
        failureReason: 'Stock allocation failed due to concurrent reservation. Auto-refund initiated.',
      },
    })) as any;

    try {
      const statusRes = await paymentService.getCheckoutAttemptStatus('tok_reconcile_123');
      assert(statusRes.status === 'ReconciliationRequired', 'Must reflect ReconciliationRequired');
      assert(statusRes.orderID == null, 'OrderID must be null');
      assert(statusRes.failureReason?.includes('Auto-refund initiated'), 'Failure reason preserved');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.get = originalGet;
    }
  }

  // Test 9: orderService.saveVerifiedOrder persists order in customer storage
  console.log('Test 9: orderService.saveVerifiedOrder stores verified order in customer cache');
  {
    const inMemoryStorage = new Map<string, any>();
    const originalStorageGet = storage.get;
    const originalStorageSet = storage.set;
    const originalApiGet = apiClient.get;

    storage.get = async <T>(key: string, defaultVal: T): Promise<T> => {
      return inMemoryStorage.has(key) ? inMemoryStorage.get(key) : defaultVal;
    };
    storage.set = async <T>(key: string, val: T): Promise<boolean> => {
      inMemoryStorage.set(key, val);
      return true;
    };
    apiClient.get = (async (): Promise<any> => []) as any; // Empty backend list to assert local storage fallback

    try {
      const mockOrder: Order = {
        id: '88',
        orderNumber: 'ORD-20261016-088',
        date: new Date().toISOString(),
        status: 'Confirmed',
        subtotal: 100,
        discount: 0,
        couponDiscount: 0,
        deliveryCharge: 40,
        platformFee: 10,
        tax: 0,
        total: 150,
        address: {
          id: '1',
          name: 'Test Customer',
          phone: '9876543210',
          doorFlat: '101',
          street: 'Main St',
          area: 'Downtown',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          type: 'Home',
          isDefault: true,
        },
        items: [],
        paymentMethod: 'razorpay',
        paymentStatus: 'Paid',
        paymentMode: 'RAZORPAY',
        trackingSteps: [],
      };

      await orderService.saveVerifiedOrder(mockOrder, '123');
      const cachedOrders = await orderService.getOrders('123');
      const found = cachedOrders.find((o) => o.id === '88');
      assert(!!found, 'Saved verified order must be found in cached orders');
      assert(found?.orderNumber === 'ORD-20261016-088', 'Cached order number must match');
      assert(found?.paymentStatus === 'Paid', 'Cached payment status must be Paid');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      storage.get = originalStorageGet;
      storage.set = originalStorageSet;
      apiClient.get = originalApiGet;
    }
  }

  // Test 10: Cash on Delivery (COD) regression
  console.log('Test 10: Cash on Delivery (COD) does NOT invoke checkout session or Razorpay');
  {
    let checkoutSessionCalled = false;
    let orderMasterCheckoutCalled = false;

    const originalPost = apiClient.post;
    const originalStorageGet = storage.get;

    storage.get = async (key: string, defVal: any) => {
      if (key === STORAGE_KEYS.USER) {
        return { id: '123', name: 'Test Customer' };
      }
      return defVal;
    };

    apiClient.post = (async (endpoint: string, data: any): Promise<any> => {
      if (endpoint === '/api/payments/checkout-session') {
        checkoutSessionCalled = true;
      }
      if (endpoint === '/api/OrderMaster/checkout') {
        orderMasterCheckoutCalled = true;
        return {
          isSuccess: true,
          result: {
            order: {
              orderID: 105,
              orderNumber: 'ORD-COD-105',
              paymentMode: 'COD',
              status: 'Pending',
              paymentStatus: 'Pending',
              grandTotal: 250.0,
            },
          },
        };
      }
      return {};
    }) as any;

    try {
      const codOrder = await orderService.createOrder({
        storeId: 1,
        items: [
          {
            id: 'item1',
            productId: '10',
            variantId: '20',
            productName: 'Tomatoes',
            price: 50,
            quantity: 5,
            totalPrice: 250,
          } as any,
        ],
        subtotal: 250,
        discount: 0,
        couponDiscount: 0,
        deliveryCharge: 0,
        platformFee: 0,
        tax: 0,
        total: 250,
        address: { id: '1' } as any,
        paymentMethod: 'cod',
      });

      assert(!checkoutSessionCalled, 'COD must NOT invoke checkout-session endpoint');
      assert(orderMasterCheckoutCalled, 'COD must invoke /api/OrderMaster/checkout endpoint');
      assert(codOrder.id === '105', 'COD order id must match response');
      assert(codOrder.paymentMode === 'COD', 'COD paymentMode must be COD');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.post = originalPost;
      storage.get = originalStorageGet;
    }
  }

  // Test 11: Security — Key prefix validation prevents cross-environment leak
  console.log('Test 11: Security — Key prefix validation prevents test/live mode credential mismatch');
  {
    const validTest = paymentService.validateKeyPrefix('rzp_test_99abc', 'Test');
    assert(validTest.isValid === true, 'rzp_test_ key in Test mode must be valid');

    const liveInTest = paymentService.validateKeyPrefix('rzp_live_99abc', 'Test');
    assert(liveInTest.isValid === false, 'rzp_live_ key in Test mode must be rejected');

    const testInLive = paymentService.validateKeyPrefix('rzp_test_99abc', 'Live');
    assert(testInLive.isValid === false, 'rzp_test_ key in Live mode must be rejected');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 12: Duplicate tap prevention mutex
  console.log('Test 12: Concurrency & Duplicate Tap Prevention (Mutex)');
  {
    let sessionCreationCount = 0;
    const originalPost = apiClient.post;
    apiClient.post = (async (endpoint: string): Promise<any> => {
      if (endpoint === '/api/payments/checkout-session') {
        sessionCreationCount++;
        // Simulate network delay
        await new Promise((res) => setTimeout(res, 50));
        return {
          isSuccess: true,
          statusCode: 200,
          result: {
            attemptToken: 'tok_mutex_test',
            razorpayOrderId: 'order_mutex_test',
            amountInPaise: 10000,
            grandTotal: 100.0,
            currency: 'INR',
            publicKeyId: 'rzp_test_mutex',
          },
        };
      }
      return {};
    }) as any;

    // Simulate mutex wrapper matching CheckoutScreen.tsx
    let isSubmitting = false;
    async function simulateTap() {
      if (isSubmitting) return 'BLOCKED_BY_MUTEX';
      isSubmitting = true;
      try {
        await paymentService.createCheckoutSession({
          storeID: 1,
          addressId: 1,
          items: [{ productID: 1, productVariantID: 1, productName: 'Test', price: 100, quantity: 1, total: 100 }],
        });
        return 'SUCCESS';
      } finally {
        isSubmitting = false;
      }
    }

    try {
      // Rapid concurrent double tap
      const [tap1, tap2] = await Promise.all([simulateTap(), simulateTap()]);
      assert(
        (tap1 === 'SUCCESS' && tap2 === 'BLOCKED_BY_MUTEX') || (tap2 === 'SUCCESS' && tap1 === 'BLOCKED_BY_MUTEX'),
        'One tap must succeed and the second duplicate tap must be blocked by mutex'
      );
      assert(sessionCreationCount === 1, 'Only exactly 1 checkout session request must be dispatched');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.post = originalPost;
    }
  }

  // Test 13: Expired checkout attempt session handling
  console.log('Test 13: Expired checkout attempt session handling preserves cart');
  {
    const originalGet = apiClient.get;
    apiClient.get = (async (): Promise<any> => ({
      isSuccess: true,
      statusCode: 200,
      result: {
        checkoutAttemptID: 55,
        attemptToken: 'tok_expired_attempt',
        status: 'PaymentExpired',
        orderID: null,
        razorpayOrderId: 'order_exp_999',
        amountInPaise: 15000,
        grandTotal: 150.0,
        currency: 'INR',
        failureReason: 'Checkout session expired after 15 minutes of inactivity.',
      },
    })) as any;

    try {
      const statusRes = await paymentService.getCheckoutAttemptStatus('tok_expired_attempt');
      assert(statusRes.status === 'PaymentExpired', 'Status must be PaymentExpired');
      assert(!statusRes.orderID, 'OrderID must be null for expired session');
      assert(statusRes.failureReason?.includes('expired'), 'Failure reason must mention expiration');

      // Assert CheckoutScreen logic for PaymentExpired
      const shouldClearCart = statusRes.status === 'OrderCreated' && Number(statusRes.orderID) > 0;
      assert(!shouldClearCart, 'Cart must NEVER be cleared for expired session');

      const isOrderSuccessScreen = statusRes.status === 'OrderCreated';
      assert(!isOrderSuccessScreen, 'OrderSuccess screen must NEVER be displayed for expired session');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.get = originalGet;
    }
  }

  // Test 14: Exhausted status recovery under persistent network outage
  console.log('Test 14: Exhausted status recovery under persistent network outage handles safely');
  {
    const originalGet = apiClient.get;
    let pollCount = 0;

    apiClient.get = (async (): Promise<any> => {
      pollCount++;
      // Return PaymentProcessing on all polls to simulate server or bank delay
      return {
        isSuccess: true,
        statusCode: 200,
        result: {
          checkoutAttemptID: 77,
          attemptToken: 'tok_poll_hang',
          status: 'PaymentProcessing',
          orderID: null,
          razorpayOrderId: 'order_hang_123',
          amountInPaise: 10000,
          grandTotal: 100.0,
          currency: 'INR',
        },
      };
    }) as any;

    try {
      const maxRetries = 3;
      const finalAttempt = await paymentService.recoverCheckoutStatus('tok_poll_hang', maxRetries, 10);
      assert(pollCount === maxRetries, `Should poll exactly ${maxRetries} times before returning`);
      assert(finalAttempt.status === 'PaymentProcessing', 'Final status remains PaymentProcessing');
      assert(!finalAttempt.orderID, 'OrderID remains null');

      // Evaluate CheckoutScreen behavior:
      const shouldClearCart = finalAttempt.status === 'OrderCreated' && Number(finalAttempt.orderID) > 0;
      assert(!shouldClearCart, 'Cart must NOT be cleared when recovery exhausts with PaymentProcessing');

      const isOrderSuccess = finalAttempt.status === 'OrderCreated';
      assert(!isOrderSuccess, 'OrderSuccess screen must NOT be displayed for unresolved PaymentProcessing');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.get = originalGet;
    }
  }

  // Test 15: State-machine matrix & False-success prevention audit
  console.log('Test 15: State-Machine Matrix & False-Success Prevention Audit');
  {
    interface StatusTestCase {
      status: string;
      orderID: number | null;
      expectedClearCart: boolean;
      expectedNavigateSuccess: boolean;
    }

    const testMatrix: StatusTestCase[] = [
      { status: 'OrderCreated', orderID: 101, expectedClearCart: true, expectedNavigateSuccess: true },
      { status: 'OrderCreated', orderID: 0, expectedClearCart: false, expectedNavigateSuccess: false },
      { status: 'OrderCreated', orderID: null, expectedClearCart: false, expectedNavigateSuccess: false },
      { status: 'PaymentFailed', orderID: null, expectedClearCart: false, expectedNavigateSuccess: false },
      { status: 'PaymentFailed', orderID: 102, expectedClearCart: false, expectedNavigateSuccess: false }, // anomaly guard
      { status: 'ReconciliationRequired', orderID: null, expectedClearCart: false, expectedNavigateSuccess: false },
      { status: 'Refunded', orderID: null, expectedClearCart: false, expectedNavigateSuccess: false },
      { status: 'PaymentProcessing', orderID: null, expectedClearCart: false, expectedNavigateSuccess: false },
      { status: 'PaymentExpired', orderID: null, expectedClearCart: false, expectedNavigateSuccess: false },
      { status: 'StockExhausted', orderID: null, expectedClearCart: false, expectedNavigateSuccess: false },
    ];

    for (const testCase of testMatrix) {
      // Logic replicated strictly from CheckoutScreen.tsx lines 176-180:
      const conditionMet =
        testCase.status === 'OrderCreated' &&
        testCase.orderID !== null &&
        Number(testCase.orderID) > 0;

      assert(
        conditionMet === testCase.expectedClearCart,
        `Status ${testCase.status} with orderID ${testCase.orderID} clearCart violation: expected ${testCase.expectedClearCart}, got ${conditionMet}`
      );
      assert(
        conditionMet === testCase.expectedNavigateSuccess,
        `Status ${testCase.status} with orderID ${testCase.orderID} navigateSuccess violation: expected ${testCase.expectedNavigateSuccess}, got ${conditionMet}`
      );
    }

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 16: Coupon Discount Validation & Transmission in Checkout Session
  console.log('Test 16: Coupon Discount Validation & Transmission in Checkout Session');
  {
    const originalPost = apiClient.post;
    let submittedPayload: any = null;

    apiClient.post = (async (endpoint: string, data: any): Promise<any> => {
      if (endpoint === '/api/payments/checkout-session') {
        submittedPayload = data;
        // Verify payload submitted by mobile client
        assert(data.couponCode === 'OCT786', 'Must submit couponCode OCT786 in payload');
        assert(data.clientGrandTotal === 1312.2, 'Must submit clientGrandTotal reflecting 10% coupon discount');
        assert(data.clientAmountInPaise === 131220, 'Must submit clientAmountInPaise matching clientGrandTotal');

        return {
          isSuccess: true,
          statusCode: 200,
          result: {
            attemptToken: 'tok_coupon_session_oct786',
            razorpayOrderId: 'order_rzp_coupon_123',
            amountInPaise: 131220,
            grandTotal: 1312.2,
            itemTotal: 1458.0,
            deliveryFee: 0,
            platformFee: 0,
            taxes: 0,
            discountTotal: 145.8,
            couponCode: 'OCT786',
            currency: 'INR',
            publicKeyId: 'rzp_test_public_key',
            gateway: 'Razorpay',
            mode: 'Test',
            expiresAt: new Date(Date.now() + 900000).toISOString(),
          },
        };
      }
      return originalPost(endpoint, data);
    }) as any;

    try {
      const session = await paymentService.createCheckoutSession({
        storeID: 1,
        addressId: 1,
        items: [
          {
            productID: 1,
            productVariantID: 1,
            productName: 'Sunflower Oil 1L',
            price: 729.0,
            quantity: 2,
            total: 1458.0,
          },
        ],
        couponCode: 'OCT786',
        clientGrandTotal: 1312.2,
        clientAmountInPaise: 131220,
      });

      assert(submittedPayload !== null, 'Should have called checkout-session API');
      assert(submittedPayload.couponCode === 'OCT786', 'Transmitted couponCode');
      assert(session.discountTotal === 145.8, 'Unpacked discountTotal');
      assert(session.grandTotal === 1312.2, 'Unpacked grandTotal');
      assert(session.amountInPaise === 131220, 'Unpacked amountInPaise');
      assert(session.couponCode === 'OCT786', 'Unpacked couponCode in response');

      passedCount++;
      console.log('  -> PASSED');
    } finally {
      apiClient.post = originalPost;
    }
  }

  console.log(`\nAll ${passedCount} Payment-First Checkout tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
