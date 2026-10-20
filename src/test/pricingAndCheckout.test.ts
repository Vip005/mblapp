import { cartService } from '../services/api/cartService';
import { mapOrder } from '../services/api/adapters';
import { storeService } from '../services/api/storeService';
import { CartItem, Coupon, StorePricingConfigDto, BackendCartMaster } from '../types';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Got: ${actual}`);
  }
}

async function runPricingAndCheckoutTests() {
  console.log('--- Starting Dynamic Pricing & Checkout Tests ---');

  const createMockItem = (id: string, price: number, qty: number, origPrice?: number): CartItem => ({
    id,
    productId: `prod-${id}`,
    variantId: `var-${id}`,
    quantity: qty,
    price,
    totalPrice: price * qty,
    product: {
      id: `prod-${id}`,
      name: `Product ${id}`,
      brand: 'FreshMart',
      categoryId: '1',
      image: 'test.jpg',
      originalPrice: origPrice || price,
      sellingPrice: price,
      discount: 0,
      rating: 4.5,
      reviewCount: 10,
      description: 'Desc',
      isPopular: true,
      stock: 100,
      isAvailable: true,
      tags: [],
      variants: [],
    },
    variant: {
      id: `var-${id}`,
      name: '1 kg',
      unit: '1 kg',
      price,
      originalPrice: origPrice || price,
      stock: 100,
      isAvailable: true,
    },
  });

  // =========================================================================
  // Test 1: Delivery fee charged when below free delivery threshold
  // =========================================================================
  console.log('Test 1: Delivery fee charged when subtotal is below free delivery threshold');
  {
    const items = [createMockItem('1', 200, 1)]; // Subtotal = 200
    const pricingConfig: StorePricingConfigDto = {
      storePricingConfigurationID: 1,
      storeID: 10,
      deliveryCharge: 40,
      freeDeliveryAbove: 500,
      platformFee: 5,
      freePlatformFeeAbove: 0,
      isActive: true,
    };

    const summary = cartService.calculateSummary(items, null, null, pricingConfig);
    assertEqual(summary.subtotal, 200, 'Subtotal should be 200');
    assertEqual(summary.deliveryCharge, 40, 'Delivery charge should be 40');
    assertEqual(summary.platformFee, 5, 'Platform fee should be 5');
    assertEqual(summary.freeDeliveryThreshold, 500, 'Free delivery threshold should be 500');
    assertEqual(summary.freeDeliveryRemaining, 300, 'Free delivery remaining should be 300 (500 - 200)');
    assertEqual(summary.total, 245, 'Grand total should be 200 + 40 + 5 = 245');
  }

  // =========================================================================
  // Test 2: Free delivery triggered when subtotal meets or exceeds threshold
  // =========================================================================
  console.log('Test 2: Free delivery applied when subtotal meets or exceeds threshold');
  {
    const items = [createMockItem('1', 500, 1)]; // Subtotal = 500
    const pricingConfig: StorePricingConfigDto = {
      storePricingConfigurationID: 1,
      storeID: 10,
      deliveryCharge: 40,
      freeDeliveryAbove: 500,
      platformFee: 5,
      freePlatformFeeAbove: 0,
      isActive: true,
    };

    const summary = cartService.calculateSummary(items, null, null, pricingConfig);
    assertEqual(summary.subtotal, 500, 'Subtotal should be 500');
    assertEqual(summary.deliveryCharge, 0, 'Delivery charge should be waived to 0');
    assertEqual(summary.freeDeliveryRemaining, 0, 'Free delivery remaining should be 0');
    assertEqual(summary.platformFee, 5, 'Platform fee remains 5');
    assertEqual(summary.total, 505, 'Grand total should be 500 + 0 + 5 = 505');
  }

  // =========================================================================
  // Test 3: Free platform fee threshold support
  // =========================================================================
  console.log('Test 3: Free platform fee applied when subtotal reaches freePlatformFeeAbove');
  {
    const pricingConfig: StorePricingConfigDto = {
      storePricingConfigurationID: 2,
      storeID: 20,
      deliveryCharge: 30,
      freeDeliveryAbove: 400,
      platformFee: 10,
      freePlatformFeeAbove: 1000,
      isActive: true,
    };

    // Subtotal below platform fee threshold
    const itemsBelow = [createMockItem('1', 600, 1)]; // Subtotal = 600 (Free delivery, but platform fee applies)
    const summaryBelow = cartService.calculateSummary(itemsBelow, null, null, pricingConfig);
    assertEqual(summaryBelow.deliveryCharge, 0, 'Delivery fee waived at 600 >= 400');
    assertEqual(summaryBelow.platformFee, 10, 'Platform fee charged at 600 < 1000');
    assertEqual(summaryBelow.freePlatformFeeRemaining, 400, '1000 - 600 = 400 remaining for free platform fee');
    assertEqual(summaryBelow.total, 610, 'Grand total = 600 + 0 + 10 = 610');

    // Subtotal above platform fee threshold
    const itemsAbove = [createMockItem('1', 1050, 1)]; // Subtotal = 1050
    const summaryAbove = cartService.calculateSummary(itemsAbove, null, null, pricingConfig);
    assertEqual(summaryAbove.deliveryCharge, 0, 'Delivery fee waived at 1050 >= 400');
    assertEqual(summaryAbove.platformFee, 0, 'Platform fee waived at 1050 >= 1000');
    assertEqual(summaryAbove.freePlatformFeeRemaining, 0, 'No remaining amount needed');
    assertEqual(summaryAbove.total, 1050, 'Grand total = 1050 + 0 + 0 = 1050');
  }

  // =========================================================================
  // Test 4: Per-store dynamic pricing isolation
  // =========================================================================
  console.log('Test 4: Per-store pricing configuration isolation');
  {
    const items = [createMockItem('1', 300, 1)];

    const storeAConfig: StorePricingConfigDto = {
      storePricingConfigurationID: 101,
      storeID: 1,
      deliveryCharge: 25,
      freeDeliveryAbove: 350,
      platformFee: 3,
      freePlatformFeeAbove: 500,
      isActive: true,
    };

    const storeBConfig: StorePricingConfigDto = {
      storePricingConfigurationID: 102,
      storeID: 2,
      deliveryCharge: 60,
      freeDeliveryAbove: 250, // Qualifies for free delivery in Store B!
      platformFee: 8,
      freePlatformFeeAbove: 600,
      isActive: true,
    };

    const summaryA = cartService.calculateSummary(items, null, null, storeAConfig);
    const summaryB = cartService.calculateSummary(items, null, null, storeBConfig);

    // Store A: 300 < 350 -> Delivery = 25, Platform = 3 -> Total = 328
    assertEqual(summaryA.deliveryCharge, 25, 'Store A delivery fee should be 25');
    assertEqual(summaryA.platformFee, 3, 'Store A platform fee should be 3');
    assertEqual(summaryA.total, 328, 'Store A total should be 328');

    // Store B: 300 >= 250 -> Delivery = 0, Platform = 8 -> Total = 308
    assertEqual(summaryB.deliveryCharge, 0, 'Store B delivery fee should be waived');
    assertEqual(summaryB.platformFee, 8, 'Store B platform fee should be 8');
    assertEqual(summaryB.total, 308, 'Store B total should be 308');
  }

  // =========================================================================
  // Test 5: Avoid double-deduction of MRP discounts (SellingPrice contract)
  // =========================================================================
  console.log('Test 5: SellingPrice contract prevents double-deduction of MRP discounts');
  {
    // Product has MRP 150 but selling price 100 (MRP savings = 50 per item)
    const items = [createMockItem('1', 100, 2, 150)]; // SellingPrice subtotal = 200, MRP = 300
    const pricingConfig: StorePricingConfigDto = {
      storePricingConfigurationID: 1,
      storeID: 1,
      deliveryCharge: 30,
      freeDeliveryAbove: 500,
      platformFee: 5,
      freePlatformFeeAbove: 0,
      isActive: true,
    };

    const summary = cartService.calculateSummary(items, null, null, pricingConfig);
    assertEqual(summary.subtotal, 200, 'Subtotal is SellingPrice * Quantity = 200');
    assertEqual(summary.productDiscount, 100, 'Informational MRP discount savings is 100');
    // Crucial: productDiscount is NOT subtracted from subtotal (200 + 30 + 5 = 235, NOT 200 - 100 + 35 = 135)
    assertEqual(summary.total, 235, 'Grand total must be 200 + 30 + 5 = 235');
  }

  // =========================================================================
  // Test 6: Order-level coupon discount applied without affecting fees
  // =========================================================================
  console.log('Test 6: Order-level coupon discount correctly subtracted once');
  {
    const items = [createMockItem('1', 100, 3)]; // Subtotal = 300
    const coupon: Coupon = {
      code: 'SAVE50',
      title: 'Flat 50 Off',
      description: 'Get 50 off',
      discountType: 'flat',
      discountValue: 50,
      minOrderValue: 200,
    };
    const pricingConfig: StorePricingConfigDto = {
      storePricingConfigurationID: 1,
      storeID: 1,
      deliveryCharge: 40,
      freeDeliveryAbove: 500,
      platformFee: 5,
      freePlatformFeeAbove: 0,
      isActive: true,
    };

    const summary = cartService.calculateSummary(items, coupon, null, pricingConfig);
    assertEqual(summary.subtotal, 300, 'Subtotal is 300');
    assertEqual(summary.couponDiscount, 50, 'Coupon discount is 50');
    assertEqual(summary.deliveryCharge, 40, 'Delivery fee is 40');
    assertEqual(summary.platformFee, 5, 'Platform fee is 5');
    // Total = (300 - 50) + 40 + 5 = 295
    assertEqual(summary.total, 295, 'Grand total is 295');
  }

  // =========================================================================
  // Test 7: Fallback to CartMaster when pricingConfig is absent
  // =========================================================================
  console.log('Test 7: Fallback to CartMaster fees when store pricing configuration is not provided');
  {
    const items = [createMockItem('1', 150, 1)];
    const mockCartMaster: BackendCartMaster = {
      cartID: 1,
      customerId: 5,
      storeID: 1,
      deliveryFee: 35,
      platformFee: 4,
      taxPercentage: 5,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
    };

    const summary = cartService.calculateSummary(items, null, mockCartMaster, null);
    assertEqual(summary.deliveryCharge, 35, 'Falls back to CartMaster.deliveryFee');
    assertEqual(summary.platformFee, 4, 'Falls back to CartMaster.platformFee');
    assertEqual(summary.taxPercentage, 5, 'Taxes percentage is 5%');
    assertEqual(summary.tax, 7.5, 'Tax is 5% of 150 = 7.5');
    // Total = 150 + 35 + 4 + 7.5 = 196.5
    assertEqual(summary.total, 196.5, 'Grand total = 196.5');
  }

  // =========================================================================
  // Test 8: Empty cart fees reset to zero
  // =========================================================================
  console.log('Test 8: Empty cart fees and totals correctly reset to 0');
  {
    const pricingConfig: StorePricingConfigDto = {
      storePricingConfigurationID: 1,
      storeID: 1,
      deliveryCharge: 40,
      freeDeliveryAbove: 500,
      platformFee: 5,
      freePlatformFeeAbove: 0,
      isActive: true,
    };

    const summary = cartService.calculateSummary([], null, null, pricingConfig);
    assertEqual(summary.subtotal, 0, 'Subtotal is 0');
    assertEqual(summary.deliveryCharge, 0, 'Delivery fee is 0 for empty cart');
    assertEqual(summary.platformFee, 0, 'Platform fee is 0 for empty cart');
    assertEqual(summary.total, 0, 'Total is 0 for empty cart');
  }

  // =========================================================================
  // Test 9: mapOrder Adapter maps platformFee and preserves authoritative GrandTotal
  // =========================================================================
  console.log('Test 9: mapOrder maps backend platformFee and computes fallback total including platformFee');
  {
    const mockMasterDto = {
      orderID: 999,
      orderNumber: 'ORD-TEST-999',
      itemTotal: 500,
      discountTotal: 50,
      deliveryFee: 40,
      platformFee: 6,
      taxes: 25,
      grandTotal: 521,
      status: 'Processing',
      paymentMode: 'RAZORPAY',
      paymentStatus: 'Paid',
      paymentTransactionID: 'pay_test123',
      storeID: 3,
    };

    const order = mapOrder(mockMasterDto, []);
    assertEqual(order.subtotal, 500, 'Subtotal mapped');
    assertEqual(order.discount, 50, 'Discount mapped');
    assertEqual(order.deliveryCharge, 40, 'DeliveryCharge mapped');
    assertEqual(order.platformFee, 6, 'PlatformFee mapped');
    assertEqual(order.tax, 25, 'Taxes mapped');
    assertEqual(order.total, 521, 'Authoritative grandTotal 521 preserved');

    // Test fallback when grandTotal is null: (500 - 50 + 40 + 6 + 25 = 521)
    const mockNoGrandTotal = { ...mockMasterDto, grandTotal: null };
    const orderFallback = mapOrder(mockNoGrandTotal, []);
    assertEqual(orderFallback.total, 521, 'Fallback total calculation includes platformFee: 521');
  }

  // =========================================================================
  // Test 10: storeService dynamic pricing cache and isolation
  // =========================================================================
  console.log('Test 10: storeService.getStorePricingConfig invalid storeId guard and cache clearing');
  {
    const invalidZero = await storeService.getStorePricingConfig(0);
    assertEqual(invalidZero, null, 'Invalid storeId <= 0 returns null immediately');

    storeService.clearPricingConfigCache();
    // Cache clearing succeeds without error
    assert(true, 'Pricing config cache cleared cleanly');
  }

  console.log('\nAll 10 Pricing & Checkout tests passed successfully!');
}

runPricingAndCheckoutTests().catch((err) => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
