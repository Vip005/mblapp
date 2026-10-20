import { paymentService } from '../services/api/paymentService';
import { isNativeRazorpayAvailable } from '../services/payment/razorpayGateway';
import { paymentMethods } from '../data/paymentMethods';
import { mapOrder } from '../services/api/adapters';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Razorpay Integration Tests ---');
  let passedCount = 0;

  // Test 1: validateKeyPrefix for Test Mode
  console.log('Test 1: Key prefix validation for Test Mode');
  {
    const validTest = paymentService.validateKeyPrefix('rzp_test_1DP5mmOlF5G5ag', 'Test');
    assert(validTest.isValid === true, 'Valid test key should return isValid: true');
    assert(!validTest.error, 'Valid test key should have no error');

    const invalidLiveInTest = paymentService.validateKeyPrefix('rzp_live_1DP5mmOlF5G5ag', 'Test');
    assert(invalidLiveInTest.isValid === false, 'Live key in Test mode should return isValid: false');
    assert(invalidLiveInTest.error?.includes("starts with 'rzp_test_'") || invalidLiveInTest.error?.includes("Mode is set to 'Test'"), 'Error should mention mode mismatch');

    const emptyKeyTest = paymentService.validateKeyPrefix('', 'Test');
    assert(emptyKeyTest.isValid === false, 'Empty key in Test mode should return isValid: false');

    const nonPrefixedKey = paymentService.validateKeyPrefix('key_12345', 'Test');
    assert(nonPrefixedKey.isValid === false, 'Non-prefixed key in Test mode should return isValid: false');
    passedCount++;
  }

  // Test 2: validateKeyPrefix for Live Mode
  console.log('Test 2: Key prefix validation for Live Mode');
  {
    const validLive = paymentService.validateKeyPrefix('rzp_live_abcdef12345678', 'Live');
    assert(validLive.isValid === true, 'Valid live key should return isValid: true');

    const invalidTestInLive = paymentService.validateKeyPrefix('rzp_test_abcdef12345678', 'Live');
    assert(invalidTestInLive.isValid === false, 'Test key in Live mode should return isValid: false');
    assert(invalidTestInLive.error?.includes("Mode is set to 'Live'"), 'Error should mention Live mode mismatch');

    const emptyKeyLive = paymentService.validateKeyPrefix('', 'Live');
    assert(emptyKeyLive.isValid === false, 'Empty key in Live mode should return isValid: false');
    passedCount++;
  }

  // Test 3: validateKeyPrefix for Unsupported Modes
  console.log('Test 3: Key prefix validation for unsupported modes');
  {
    const stagingMode = paymentService.validateKeyPrefix('rzp_test_123', 'Staging');
    assert(stagingMode.isValid === false, 'Unsupported mode should return isValid: false');
    assert(stagingMode.error?.includes('Unsupported payment gateway mode'), 'Error should state unsupported mode');
    passedCount++;
  }

  // Test 4: Dual-Engine Runtime Detection
  console.log('Test 4: Dual-Engine runtime detection');
  {
    const hasNative = isNativeRazorpayAvailable();
    assert(typeof hasNative === 'boolean', 'isNativeRazorpayAvailable should return a boolean');
    // In Node.js / non-compiled environment, native should safely be false without crashing
    assert(hasNative === false, 'In Node/Expo Go environment, isNativeRazorpayAvailable should be false');
    passedCount++;
  }

  // Test 5: Input Validation on paymentService.createPaymentOrder
  console.log('Test 5: Validation on paymentService.createPaymentOrder');
  {
    let caughtZero = false;
    try {
      await paymentService.createPaymentOrder(0, 100);
    } catch (err: any) {
      caughtZero = true;
      assert(err.message.includes('Valid order ID is required'), 'Should reject orderId 0');
    }
    assert(caughtZero, 'Should have caught orderId 0');

    let caughtNaN = false;
    try {
      await paymentService.createPaymentOrder(NaN, 100);
    } catch (err: any) {
      caughtNaN = true;
    }
    assert(caughtNaN, 'Should have caught orderId NaN');
    passedCount++;
  }

  // Test 6: Input Validation on paymentService.verifyPayment
  console.log('Test 6: Validation on paymentService.verifyPayment');
  {
    let caughtMissingSig = false;
    try {
      await paymentService.verifyPayment({
        orderID: 10,
        razorpayOrderId: 'order_test_123',
        razorpayPaymentId: 'pay_test_456',
        razorpaySignature: '',
      });
    } catch (err: any) {
      caughtMissingSig = true;
      assert(err.message.includes('Incomplete payment response'), 'Should reject missing signature');
    }
    assert(caughtMissingSig, 'Should have caught missing signature');

    let caughtMissingId = false;
    try {
      await paymentService.verifyPayment({
        orderID: 0,
        razorpayOrderId: 'order_test_123',
        razorpayPaymentId: 'pay_test_456',
        razorpaySignature: 'sig_test_789',
      });
    } catch (err: any) {
      caughtMissingId = true;
      assert(err.message.includes('Valid order ID is required'), 'Should reject orderID 0');
    }
    assert(caughtMissingId, 'Should have caught orderID 0');
    passedCount++;
  }

  // Test 7: Input Validation on paymentService.getOrderPaymentStatus
  console.log('Test 7: Validation on paymentService.getOrderPaymentStatus');
  {
    let caughtInvalidId = false;
    try {
      await paymentService.getOrderPaymentStatus(-1);
    } catch (err: any) {
      caughtInvalidId = true;
      assert(err.message.includes('Valid order ID is required'), 'Should reject negative orderId');
    }
    assert(caughtInvalidId, 'Should have caught negative orderId');
    passedCount++;
  }

  // Test 8: paymentMethods dataset
  console.log('Test 8: Payment methods dataset configuration');
  {
    const razorpayOpt = paymentMethods.find((p) => p.id === 'razorpay');
    assert(!!razorpayOpt, 'Razorpay online payment option must be configured');
    assert(razorpayOpt?.title.includes('Online') || razorpayOpt?.title.includes('Razorpay'), 'Title should describe online payment');

    const codOpt = paymentMethods.find((p) => p.id === 'cod');
    assert(!!codOpt, 'Cash on Delivery option must be configured');
    passedCount++;
  }

  // Test 9: mapOrder Adapter payment fields
  console.log('Test 9: mapOrder Adapter mapping for paymentMode and paymentStatus');
  {
    const mockOrderDto = {
      orderID: 55,
      orderNumber: 'ORD-20261014-055',
      paymentMode: 'RAZORPAY',
      paymentStatus: 'Paid',
      paymentTransactionID: 'order_OPWk123456',
      status: 'Confirmed',
      itemTotal: 450,
      grandTotal: 450,
    };
    const mapped = mapOrder(mockOrderDto, []);
    assert(mapped.id === '55', 'ID should map');
    assert(mapped.paymentMode === 'RAZORPAY', 'paymentMode should map to RAZORPAY');
    assert(mapped.paymentStatus === 'Paid', 'paymentStatus should map to Paid');
    assert(mapped.razorpayOrderId === 'order_OPWk123456', 'razorpayOrderId should map transaction ID');
    assert(mapped.status === 'Confirmed', 'Order status should map to Confirmed');
    passedCount++;
  }

  // Test 10: getPaymentConfig Caching and Store Isolation
  console.log('Test 10: paymentService.getPaymentConfig TTL caching and store isolation');
  {
    const { apiClient } = require('../services/api/apiClient');
    let apiCallCount = 0;
    const originalGet = apiClient.get;

    apiClient.get = async (endpoint: string) => {
      apiCallCount++;
      if (endpoint.includes('storeId=1')) {
        return {
          gateway: 'Razorpay',
          mode: 'Test',
          isEnabled: true,
          publicKeyId: 'rzp_test_store1',
          currency: 'INR',
        };
      }
      if (endpoint.includes('storeId=2')) {
        return {
          gateway: 'Razorpay',
          mode: 'Live',
          isEnabled: true,
          publicKeyId: 'rzp_live_store2',
          currency: 'INR',
        };
      }
      return {
        gateway: 'Razorpay',
        mode: 'Test',
        isEnabled: false,
        publicKeyId: '',
        currency: 'INR',
      };
    };

    try {
      paymentService.clearConfigCache();

      // First call for store 1 -> hits API
      const config1 = await paymentService.getPaymentConfig(1);
      assert(config1.publicKeyId === 'rzp_test_store1', 'Store 1 config returned');
      assert(apiCallCount === 1, 'API called once for store 1');

      // Second call for store 1 -> served from cache
      const config1Cached = await paymentService.getPaymentConfig(1);
      assert(config1Cached.publicKeyId === 'rzp_test_store1', 'Store 1 cached config returned');
      assert(apiCallCount === 1, 'API not called again; served from cache');

      // Call for store 2 -> isolated, hits API
      const config2 = await paymentService.getPaymentConfig(2);
      assert(config2.publicKeyId === 'rzp_live_store2', 'Store 2 config returned');
      assert(apiCallCount === 2, 'API called for different store 2');

      // Clear cache and call store 1 -> hits API again
      paymentService.clearConfigCache();
      await paymentService.getPaymentConfig(1);
      assert(apiCallCount === 3, 'API called again after cache clear');

      passedCount++;
    } finally {
      apiClient.get = originalGet;
    }
  }

  // Test 11: orderService.createOrder Payment Validation
  console.log('Test 11: orderService.createOrder payment method validation');
  {
    const { orderService } = require('../services/api/orderService');
    const { storage } = require('../utils/storage');
    storage.get = async () => ({ id: '123', name: 'Test Customer' });

    let caughtInvalidMethod = false;
    try {
      await orderService.createOrder({
        storeId: 1,
        items: [],
        subtotal: 100,
        discount: 0,
        couponDiscount: 0,
        deliveryCharge: 0,
        tax: 0,
        total: 100,
        address: { id: '1' } as any,
        paymentMethod: 'bitcoin' as any,
        trackingSteps: [],
      });
    } catch (err: any) {
      caughtInvalidMethod = true;
      assert(err.message.includes('Invalid payment method "bitcoin"'), 'Should reject invalid payment method');
    }
    assert(caughtInvalidMethod, 'Should have caught invalid payment method');
    passedCount++;
  }

  console.log(`\nAll ${passedCount} tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
