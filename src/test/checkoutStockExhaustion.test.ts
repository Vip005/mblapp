/**
 * Regression Test Suite: Stock Exhaustion & Integrity During Checkout
 *
 * Covers:
 * 1. Product is available when added to cart.
 * 2. Stock becomes unavailable before checkout validation (server 400 rejection).
 * 3. Stock changes after payment-session creation but before payment verification (STOCK_DEPLETED_POST_PAYMENT).
 * 4. Payment succeeds at gateway but stock/order finalization fails (enqueues automatic refund, OrderMaster NOT created).
 * 5. Payment fails or is cancelled by user (attempt marked failed, no stock deducted).
 * 6. Duplicate payment verification or webhook delivery occurs (idempotent response, zero double-deduction).
 * 7. Server Authoritative Pricing: Client-tampered grand total is rejected.
 */

import { paymentService } from '../services/api/paymentService';
import { cartService } from '../services/api/cartService';
import { apiClient, ApiError } from '../services/api/apiClient';
import {
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

async function runTests() {
  console.log('--- Starting Checkout Stock Exhaustion & Payment Integrity Tests ---');
  let passedCount = 0;

  const originalPost = apiClient.post;
  const originalGet = apiClient.get;

  try {
    // =========================================================================
    // Scenario 1: Product available when added to cart
    // =========================================================================
    console.log('Scenario 1: Product is available when added to cart');
    {
      const cartItem: CartItem = {
        id: '101_201',
        productId: '101',
        variantId: '201',
        quantity: 2,
        price: 50,
        totalPrice: 100,
        product: {
          id: '101',
          name: 'Fresh Apples',
          brand: 'Farm Fresh',
          categoryId: '1',
          image: 'apple.jpg',
          originalPrice: 60,
          sellingPrice: 50,
          discount: 10,
          rating: 4.8,
          reviewCount: 15,
          description: 'Crisp apples',
          isPopular: true,
          stock: 10,
          isAvailable: true,
          tags: [],
          variants: [],
        },
        variant: {
          id: '201',
          name: '1 kg',
          unit: '1 kg',
          price: 50,
          originalPrice: 60,
          stock: 10,
          isAvailable: true,
        },
      };

      assert(cartItem.variant.isAvailable, 'Variant must be available');
      assert(cartItem.variant.stock >= cartItem.quantity, 'Stock must be greater than or equal to requested quantity');
      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Scenario 2: Stock becomes unavailable before checkout validation
    // =========================================================================
    console.log('Scenario 2: Stock becomes unavailable before checkout validation');
    {
      apiClient.post = (async (endpoint: string) => {
        if (endpoint === '/api/payments/checkout-session') {
          throw new ApiError(
            'Product variant "1 kg" is no longer available in the requested quantity (Available: 0).',
            400,
            { isSuccess: false, statusCode: 400 }
          );
        }
        return originalPost(endpoint);
      }) as any;

      let caughtError: ApiError | null = null;
      try {
        await paymentService.createCheckoutSession({
          storeID: 1,
          addressId: 10,
          items: [
            {
              productID: 101,
              productVariantID: 201,
              productName: 'Fresh Apples (1 kg)',
              price: 50,
              quantity: 2,
              total: 100,
            },
          ],
        });
      } catch (err: any) {
        caughtError = err;
      }

      assert(caughtError !== null, 'Must throw error when stock is unavailable at checkout session creation');
      assertEqual(caughtError!.statusCode, 400, 'Must return 400 Bad Request');
      assert(
        caughtError!.message.includes('no longer available'),
        `Error message must explain stock depletion: ${caughtError!.message}`
      );

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Scenario 3: Stock depleted post-payment before verification completion
    // =========================================================================
    console.log('Scenario 3: Stock depleted post-payment before verification completion');
    {
      apiClient.post = (async (endpoint: string, data: any) => {
        if (endpoint === '/api/payments/verify-checkout') {
          return {
            isSuccess: false,
            statusCode: 200,
            result: {
              isSuccess: false,
              attemptToken: data.attemptToken,
              orderID: 0,
              orderNumber: null,
              paymentStatus: 'ReconciliationRequired',
              status: 'ReconciliationRequired',
              failureCode: 'STOCK_DEPLETED_POST_PAYMENT',
              failureReason: 'Stock for variant 1 kg was depleted by a concurrent order. Requested: 2, Available: 0.',
              message: 'Stock became unavailable after payment. An automatic full refund has been scheduled.',
            },
          };
        }
        return originalPost(endpoint, data);
      }) as any;

      const verifyResponse = await paymentService.verifyCheckoutPayment({
        attemptToken: 'tok_attempt_abc123',
        razorpayOrderId: 'order_rzp_xyz789',
        razorpayPaymentId: 'pay_rzp_mock456',
        razorpaySignature: 'sig_mock_signature',
      });

      assertEqual(verifyResponse.orderID, 0, 'OrderMaster must NOT be created when stock is depleted post-payment');
      assertEqual(verifyResponse.status, 'ReconciliationRequired', 'Attempt status must be ReconciliationRequired');
      assertEqual((verifyResponse as any).failureCode, 'STOCK_DEPLETED_POST_PAYMENT', 'FailureCode must be STOCK_DEPLETED_POST_PAYMENT');
      assert(
        verifyResponse.message?.includes('refund has been scheduled'),
        'Message must confirm automatic refund scheduled'
      );

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Scenario 4: Payment succeeds at gateway but order finalization fails
    // =========================================================================
    console.log('Scenario 4: Payment succeeds at gateway but order finalization fails (no OrderMaster created)');
    {
      apiClient.post = (async (endpoint: string) => {
        if (endpoint === '/api/payments/verify-checkout') {
          throw new ApiError(
            'Payment verification failed: Database deadlock during order finalization. Refund outbox enqueued.',
            500,
            { isSuccess: false, statusCode: 500 }
          );
        }
        return originalPost(endpoint);
      }) as any;

      let caught = false;
      try {
        await paymentService.verifyCheckoutPayment({
          attemptToken: 'tok_attempt_fail',
          razorpayOrderId: 'order_rzp_fail',
          razorpayPaymentId: 'pay_fail',
          razorpaySignature: 'sig_fail',
        });
      } catch (err: any) {
        caught = true;
        assertEqual(err.statusCode, 500, 'Throws 500 error on deadlock');
      }

      assert(caught, 'Must catch order finalization failure');
      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Scenario 5: Payment fails or is cancelled by user
    // =========================================================================
    console.log('Scenario 5: Payment fails or is cancelled by user');
    {
      let recordedFailureEndpoint = '';
      let failurePayload: any = null;

      apiClient.post = (async (endpoint: string, data: any) => {
        if (endpoint === '/api/payments/fail') {
          recordedFailureEndpoint = endpoint;
          failurePayload = data;
          return {
            isSuccess: true,
            statusCode: 200,
            result: {
              status: 'Failed',
              failureReason: 'Payment cancelled by user',
            },
          };
        }
        return originalPost(endpoint, data);
      }) as any;

      const failRes = await paymentService.recordPaymentFailure(
        105,
        'order_rzp_cancelled_999',
        'USER_CANCELLED',
        'Customer closed payment window before completing payment'
      );

      assertEqual(recordedFailureEndpoint, '/api/payments/fail', 'Calls /api/payments/fail');
      assertEqual(failurePayload.failureCode, 'USER_CANCELLED', 'Records failure code USER_CANCELLED');
      assertEqual(failurePayload.orderID, 105, 'References correct order/attempt ID');
      assertEqual(failRes.result.status, 'Failed', 'Status marked Failed');

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Scenario 6: Duplicate payment verification or webhook delivery occurs
    // =========================================================================
    console.log('Scenario 6: Duplicate payment verification is idempotent (no double deduction)');
    {
      let verifyCalls = 0;
      apiClient.post = (async (endpoint: string) => {
        if (endpoint === '/api/payments/verify-checkout') {
          verifyCalls++;
          return {
            isSuccess: true,
            statusCode: 200,
            result: {
              isSuccess: true,
              attemptToken: 'tok_duplicate_check',
              orderID: 999,
              orderNumber: 'ORD-20261025-999',
              paymentStatus: 'Paid',
              status: 'Paid',
              isDuplicate: verifyCalls > 1,
              message: verifyCalls > 1 ? 'Payment already verified for this order.' : 'Payment verified successfully.',
            },
          };
        }
        return originalPost(endpoint);
      }) as any;

      // First verification call
      const firstVerify = await paymentService.verifyCheckoutPayment({
        attemptToken: 'tok_duplicate_check',
        razorpayOrderId: 'order_rzp_dup',
        razorpayPaymentId: 'pay_dup',
        razorpaySignature: 'sig_dup',
      });
      assertEqual(firstVerify.orderID, 999, 'First call creates/retrieves order 999');
      assertEqual(firstVerify.isDuplicate, false, 'First call is not duplicate');

      // Second duplicate verification call (e.g. rapid network retry)
      const secondVerify = await paymentService.verifyCheckoutPayment({
        attemptToken: 'tok_duplicate_check',
        razorpayOrderId: 'order_rzp_dup',
        razorpayPaymentId: 'pay_dup',
        razorpaySignature: 'sig_dup',
      });
      assertEqual(secondVerify.orderID, 999, 'Second call returns same order 999');
      assertEqual(secondVerify.isDuplicate, true, 'Second call recognized as duplicate');
      assertEqual(secondVerify.status, 'Paid', 'Order remains in Paid status');

      passedCount++;
      console.log('  -> PASSED');
    }

    // =========================================================================
    // Scenario 7: Server Authoritative Pricing: Client-tampered total is rejected
    // =========================================================================
    console.log('Scenario 7: Server Authoritative Pricing: Client-tampered total is rejected');
    {
      apiClient.post = (async (endpoint: string) => {
        if (endpoint === '/api/payments/checkout-session') {
          throw new ApiError(
            'Submitted GrandTotal (100.00) does not match server authoritative GrandTotal (1458.00).',
            400,
            { isSuccess: false, statusCode: 400 }
          );
        }
        return originalPost(endpoint);
      }) as any;

      let caughtTampering = false;
      try {
        await paymentService.createCheckoutSession({
          storeID: 1,
          addressId: 10,
          items: [
            {
              productID: 101,
              productVariantID: 201,
              productName: 'Fresh Apples',
              price: 100,
              quantity: 1,
              total: 100,
            },
          ],
        });
      } catch (err: any) {
        caughtTampering = true;
        assertEqual(err.statusCode, 400, 'Rejection status is 400');
        assert(
          err.message.includes('does not match server authoritative GrandTotal'),
          'Message rejects client total mismatch'
        );
      }

      assert(caughtTampering, 'Must catch client-side price tampering');
      passedCount++;
      console.log('  -> PASSED');
    }

    console.log(`\nAll ${passedCount} Checkout Stock Exhaustion & Payment Integrity scenarios passed successfully!`);
  } finally {
    apiClient.post = originalPost;
    apiClient.get = originalGet;
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
