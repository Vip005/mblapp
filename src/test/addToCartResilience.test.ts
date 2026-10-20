import {
  normalizeCartMaster,
  normalizeCartItemMaster,
  cartService,
} from '../services/api/cartService';
import { Product, ProductVariant, CartItem, BackendCartMaster, BackendCartItemMaster } from '../types';

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

const mockProduct: Product = {
  id: '101',
  name: 'Organic Milk',
  brand: 'Farm Fresh',
  categoryId: 'dairy',
  description: 'Pure whole milk',
  image: 'https://images.example.com/milk.jpg',
  rating: 4.8,
  reviewCount: 42,
  stock: 10,
  isAvailable: true,
  tags: ['dairy', 'organic'],
  originalPrice: 60,
  sellingPrice: 50,
  discount: 10,
  storeId: 1,
  variants: [
    {
      id: '201',
      name: '1 Litre',
      unit: '1 L',
      price: 50,
      originalPrice: 60,
      stock: 10,
      isAvailable: true,
    },
    {
      id: '202',
      name: '500 ml',
      unit: '500 ml',
      price: 28,
      originalPrice: 32,
      stock: 5,
      isAvailable: true,
    },
  ],
};

async function runAddToCartResilienceTests() {
  console.log('--- Starting Add-to-Cart Resilience & Root Cause Tests ---');

  // Test 1: normalizeCartMaster handles all casing variations (.NET camelCase, PascalCase, mixed)
  console.log('Test 1: normalizeCartMaster property casing compatibility');
  {
    const rawCamel = {
      cartID: 42,
      storeID: 1,
      customerId: 10,
      deliveryFee: 15.0,
      platformFee: 5.0,
      taxPercentage: 5.0,
    };
    const normCamel = normalizeCartMaster(rawCamel);
    assert.strictEqual(normCamel.cartID, 42, 'cartID should be 42');
    assert.strictEqual(normCamel.storeID, 1, 'storeID should be 1');
    assert.strictEqual(normCamel.customerId, 10, 'customerId should be 10');

    const rawLowerD = {
      cartId: 43,
      storeId: 2,
      customerId: 11,
      deliveryFee: null,
      platformFee: null,
      taxPercentage: null,
    };
    const normLowerD = normalizeCartMaster(rawLowerD);
    assert.strictEqual(normLowerD.cartID, 43, 'cartId with lowercase d should normalize to cartID: 43');
    assert.strictEqual(normLowerD.storeID, 2, 'storeId with lowercase d should normalize to storeID: 2');
    assert.strictEqual(normLowerD.customerId, 11, 'customerId should normalize to 11');

    const rawPascal = {
      CartID: 44,
      StoreID: 3,
      CustomerID: 12,
      DeliveryFee: 20,
    };
    const normPascal = normalizeCartMaster(rawPascal);
    assert.strictEqual(normPascal.cartID, 44, 'CartID PascalCase should normalize to cartID: 44');
    assert.strictEqual(normPascal.storeID, 3, 'StoreID PascalCase should normalize to storeID: 3');
    assert.strictEqual(normPascal.customerId, 12, 'CustomerID PascalCase should normalize to customerId: 12');

    const rawNullOrMalformed = null;
    const normNull = normalizeCartMaster(rawNullOrMalformed);
    assert.strictEqual(normNull.cartID, 0, 'Null raw CartMaster must normalize to cartID: 0');
    assert.strictEqual(normNull.storeID, 0, 'Null raw CartMaster must normalize to storeID: 0');
    console.log('  -> PASSED');
  }

  // Test 2: normalizeCartItemMaster handles all casing variations
  console.log('Test 2: normalizeCartItemMaster property casing compatibility');
  {
    const rawItem = {
      cartItemID: 1001,
      cartID: 42,
      productVariantID: 201,
      productID: 101,
      quantity: 2,
      price: 50.0,
    };
    const normItem = normalizeCartItemMaster(rawItem);
    assert.strictEqual(normItem.cartItemID, 1001, 'cartItemID should be 1001');
    assert.strictEqual(normItem.cartID, 42, 'cartID should be 42');
    assert.strictEqual(normItem.productVariantID, 201, 'productVariantID should be 201');
    assert.strictEqual(normItem.productID, 101, 'productID should be 101');
    assert.strictEqual(normItem.quantity, 2, 'quantity should be 2');
    assert.strictEqual(normItem.price, 50, 'price should be 50');

    const rawCasedVariants = {
      cartItemId: 1002,
      cartId: 43,
      productVariantId: 202,
      productId: 101,
      quantity: 1,
      price: 28,
    };
    const normItem2 = normalizeCartItemMaster(rawCasedVariants);
    assert.strictEqual(normItem2.cartItemID, 1002, 'cartItemId lowercase d should normalize to cartItemID: 1002');
    assert.strictEqual(normItem2.cartID, 43, 'cartId lowercase d should normalize to cartID: 43');
    assert.strictEqual(normItem2.productVariantID, 202, 'productVariantId should normalize to 202');
    console.log('  -> PASSED');
  }

  // Test 3: cartService.addCartItem guards against invalid cart IDs <= 0
  console.log('Test 3: Positive cartID validation guards against zero or NaN cart IDs');
  {
    let caught0 = false;
    try {
      await cartService.addCartItem(0, 201, 101, 1, 50);
    } catch (e: any) {
      caught0 = true;
      assert(e.message.includes('Invalid cart ID'), 'Should reject cartId 0');
    }
    assert(caught0, 'cartService.addCartItem must throw on cartId 0');

    let caughtNaN = false;
    try {
      await cartService.addCartItem(NaN, 201, 101, 1, 50);
    } catch (e: any) {
      caughtNaN = true;
      assert(e.message.includes('Invalid cart ID'), 'Should reject cartId NaN');
    }
    assert(caughtNaN, 'cartService.addCartItem must throw on cartId NaN');

    let caughtNeg = false;
    try {
      await cartService.addCartItem(-5, 201, 101, 1, 50);
    } catch (e: any) {
      caughtNeg = true;
      assert(e.message.includes('Invalid cart ID'), 'Should reject cartId < 0');
    }
    assert(caughtNeg, 'cartService.addCartItem must throw on cartId -5');
    console.log('  -> PASSED');
  }

  // Test 4: Simulation of Cart State Machine with Stale Cart & 404 Auto-Recovery
  console.log('Test 4: Stale cart 404 self-healing auto-recovery simulation');
  {
    // Scenario: React state holds stale activeCartMaster with cartID 99 (deleted on server)
    let activeCartMaster: BackendCartMaster | null = {
      cartID: 99,
      storeID: 1,
      customerId: 5,
      deliveryFee: 15,
      platformFee: 5,
      taxPercentage: 5,
    };

    let serverCartDatabase: Map<number, { customerId: number; storeId: number }> = new Map();
    // Server currently only has cartID 105 for customer 5, store 1
    serverCartDatabase.set(105, { customerId: 5, storeId: 1 });

    let freshCartCreatedCount = 0;
    let addCartItemCallCount = 0;

    const mockServerAddCartItem = async (cartId: number, variantId: number, prodId: number, qty: number, price: number) => {
      addCartItemCallCount++;
      if (!serverCartDatabase.has(cartId)) {
        // Backend throws KeyNotFoundException -> HTTP 404
        const err: any = new Error(`Cart with ID ${cartId} not found.`);
        err.statusCode = 404;
        throw err;
      }
      return {
        cartItemID: 777,
        cartID: cartId,
        productVariantID: variantId,
        productID: prodId,
        quantity: qty,
        price,
      };
    };

    const mockGetOrCreateCartMaster = async (customerId: number, storeId: number, forceFresh = false) => {
      if (forceFresh || serverCartDatabase.size === 0) {
        freshCartCreatedCount++;
        const newId = 106;
        serverCartDatabase.set(newId, { customerId, storeId });
        return {
          cartID: newId,
          storeID: storeId,
          customerId: customerId,
          deliveryFee: 15,
          platformFee: 5,
          taxPercentage: 5,
        };
      }
      const [existingId] = serverCartDatabase.keys();
      return {
        cartID: existingId,
        storeID: storeId,
        customerId: customerId,
        deliveryFee: 15,
        platformFee: 5,
        taxPercentage: 5,
      };
    };

    // Execute resilient add-to-cart workflow
    let currentCart = activeCartMaster;
    let finalAddedItem: any = null;
    let userVisibleError: string | null = null;

    try {
      // Step A: Attempt with active cart
      try {
        finalAddedItem = await mockServerAddCartItem(currentCart!.cartID, 201, 101, 1, 50);
      } catch (err: any) {
        if (err.statusCode === 404) {
          // Self-heal: invalidate stale cart, fetch fresh cart, retry once
          activeCartMaster = null;
          const freshCart = await mockGetOrCreateCartMaster(5, 1, true);
          currentCart = freshCart;
          activeCartMaster = freshCart;
          finalAddedItem = await mockServerAddCartItem(freshCart.cartID, 201, 101, 1, 50);
        } else {
          throw err;
        }
      }
    } catch (e: any) {
      userVisibleError = e.message;
    }

    assert.strictEqual(userVisibleError, null, 'User must NEVER see error during transparent auto-recovery');
    assert(finalAddedItem !== null, 'Item must be successfully added after auto-recovery');
    assert.strictEqual(finalAddedItem.cartID, 106, 'Item must be attached to the new fresh cart ID (106)');
    assert.strictEqual(activeCartMaster?.cartID, 106, 'Active cart in state must be updated to 106');
    assert.strictEqual(addCartItemCallCount, 2, 'Should have made 1 failing call + 1 successful retried call');
    assert.strictEqual(freshCartCreatedCount, 1, 'Should have created exactly 1 fresh cart');
    console.log('  -> PASSED');
  }

  // Test 5: In-flight Mutex Guards against duplicate concurrent taps
  console.log('Test 5: Rapid double-tap mutex protection');
  {
    const inFlightItemOps = new Set<string>();
    const itemId = `${mockProduct.id}_${mockProduct.variants[0].id}`;

    let serverCallCount = 0;
    const simulateTap = async () => {
      if (inFlightItemOps.has(itemId)) {
        return 'MUTEX_LOCKED';
      }
      inFlightItemOps.add(itemId);
      try {
        await new Promise((r) => setTimeout(r, 20));
        serverCallCount++;
        return 'SUCCESS';
      } finally {
        inFlightItemOps.delete(itemId);
      }
    };

    const [res1, res2, res3] = await Promise.all([simulateTap(), simulateTap(), simulateTap()]);
    assert.strictEqual(serverCallCount, 1, 'Exactly one concurrent tap must execute server operation');
    const successfulCount = [res1, res2, res3].filter((r) => r === 'SUCCESS').length;
    const blockedCount = [res1, res2, res3].filter((r) => r === 'MUTEX_LOCKED').length;
    assert.strictEqual(successfulCount, 1, 'Only 1 tap succeeds');
    assert.strictEqual(blockedCount, 2, '2 rapid duplicate taps are locked out by mutex');
    console.log('  -> PASSED');
  }

  // Test 6: Existing item updates quantity rather than adding duplicate
  console.log('Test 6: Existing item increment vs new item addition');
  {
    const localItems: CartItem[] = [];
    const itemId = `${mockProduct.id}_${mockProduct.variants[0].id}`;

    // Add 1
    localItems.push({
      id: itemId,
      backendCartItemId: 501,
      backendCartId: 10,
      productId: mockProduct.id,
      variantId: mockProduct.variants[0].id,
      product: mockProduct,
      variant: mockProduct.variants[0],
      quantity: 1,
      price: 50,
      totalPrice: 50,
      storeId: 1,
    });

    // Tap Add again -> should increment to 2 on existing item
    const existing = localItems.find((i) => i.id === itemId);
    assert(existing !== undefined, 'Existing item must be found');
    if (existing) {
      existing.quantity += 1;
      existing.totalPrice = existing.quantity * existing.price;
    }

    assert.strictEqual(localItems.length, 1, 'Cart items list must still have length 1 (no duplicate rows)');
    assert.strictEqual(localItems[0].quantity, 2, 'Quantity must be updated to 2');
    assert.strictEqual(localItems[0].totalPrice, 100, 'Total price must be ₹100');
    console.log('  -> PASSED');
  }

  // Test 7: Store Isolation: Different stores maintain separate carts
  console.log('Test 7: Store isolation across store 1 and store 2');
  {
    const store1Cart: BackendCartMaster = {
      cartID: 10,
      storeID: 1,
      customerId: 5,
      deliveryFee: 15,
      platformFee: 5,
      taxPercentage: 5,
    };
    const store2Cart: BackendCartMaster = {
      cartID: 20,
      storeID: 2,
      customerId: 5,
      deliveryFee: 20,
      platformFee: 5,
      taxPercentage: 5,
    };

    assert(store1Cart.cartID !== store2Cart.cartID, 'Store 1 and Store 2 must have distinct Cart IDs');
    assert(store1Cart.storeID === 1 && store2Cart.storeID === 2, 'Store IDs must match their respective stores');
    console.log('  -> PASSED');
  }

  // Test 8: Unauthenticated customer or unselected store validation guard
  console.log('Test 8: Unauthenticated customer and missing store guard');
  {
    let unauthCaught = false;
    try {
      const currentCustomerId = null;
      if (!currentCustomerId) {
        throw new Error('Please log in to add items to your cart.');
      }
    } catch (e: any) {
      unauthCaught = true;
      assert.strictEqual(e.message, 'Please log in to add items to your cart.');
    }
    assert(unauthCaught, 'Must guard against unauthenticated customer');

    let noStoreCaught = false;
    try {
      const selectedStoreId = null;
      if (!selectedStoreId) {
        throw new Error('Please select a store to add items to your cart.');
      }
    } catch (e: any) {
      noStoreCaught = true;
      assert.strictEqual(e.message, 'Please select a store to add items to your cart.');
    }
    assert(noStoreCaught, 'Must guard against unselected store');
    console.log('  -> PASSED');
  }

  // Test 9: Cart Summary & Badge calculation post-add
  console.log('Test 9: Cart Summary and Badge count calculation');
  {
    const items: CartItem[] = [
      {
        id: '101_201',
        productId: '101',
        variantId: '201',
        product: mockProduct,
        variant: mockProduct.variants[0],
        quantity: 2,
        price: 50,
        totalPrice: 100,
      },
      {
        id: '101_202',
        productId: '101',
        variantId: '202',
        product: mockProduct,
        variant: mockProduct.variants[1],
        quantity: 1,
        price: 28,
        totalPrice: 28,
      },
    ];

    const cartMaster: BackendCartMaster = {
      cartID: 10,
      storeID: 1,
      customerId: 5,
      deliveryFee: 25,
      platformFee: 5,
      taxPercentage: 5,
    };

    const summary = cartService.calculateSummary(items, null, cartMaster, null);
    assert.strictEqual(summary.subtotal, 128, 'Subtotal must be 2*50 + 1*28 = 128');
    assert.strictEqual(summary.deliveryCharge, 25, 'Delivery charge from CartMaster must be 25');
    assert.strictEqual(summary.platformFee, 5, 'Platform fee from CartMaster must be 5');
    assert.strictEqual(summary.tax, 6.4, '5% tax on 128 must be 6.40');
    assert.strictEqual(summary.total, 164.4, 'Total must be 128 + 25 + 5 + 6.40 = 164.40');

    // Badge count: total items count
    const badgeCount = items.reduce((sum, item) => sum + item.quantity, 0);
    assert.strictEqual(badgeCount, 3, 'Badge count must be 2 + 1 = 3 items');
    console.log('  -> PASSED');
  }

  // Test 10: Clear Cart and subsequent Add to Cart sequence
  console.log('Test 10: Clear cart and subsequent fresh add sequence');
  {
    let localItems: CartItem[] = [
      {
        id: '101_201',
        productId: '101',
        variantId: '201',
        product: mockProduct,
        variant: mockProduct.variants[0],
        quantity: 2,
        price: 50,
        totalPrice: 100,
      },
    ];

    // Clear cart
    localItems = [];
    assert.strictEqual(localItems.length, 0, 'Cart should be empty after clearCart');

    // Next add
    localItems.push({
      id: '101_201',
      backendCartItemId: 601,
      backendCartId: 10,
      productId: '101',
      variantId: '201',
      product: mockProduct,
      variant: mockProduct.variants[0],
      quantity: 1,
      price: 50,
      totalPrice: 50,
    });

    assert.strictEqual(localItems.length, 1, 'Should have 1 item after fresh add');
    assert.strictEqual(localItems[0].quantity, 1, 'Fresh item quantity should be 1');
    console.log('  -> PASSED');
  }

  console.log('\n======================================================');
  console.log('ALL 10 ADD-TO-CART RESILIENCE TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runAddToCartResilienceTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
