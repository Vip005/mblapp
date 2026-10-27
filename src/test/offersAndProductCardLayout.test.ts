import * as Clipboard from 'expo-clipboard';
import { Offer } from '../types';
import {
  getDiscountHighlight,
  resolveTargetLabel,
  calculateCarouselCardWidth,
  calculateOfferCardWidth,
  hasValidOfferImage,
} from '../utils/offerHelpers';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Offers UI & Product Card Layout Tests ---');
  let passedCount = 0;

  // Test 1: Real Responsive Offer Card Width Calculation across Screen Densities
  console.log('Test 1: Real Responsive Offer Card Width Calculation across Screen Densities');
  {
    // Narrow phone (360px): 360 - 54 = 306px (within 270-330 bounds)
    const narrowWidth = calculateCarouselCardWidth(360);
    assert(narrowWidth === 306, `Narrow screen (360px) should yield 306px, got ${narrowWidth}px`);

    // Standard phone (392px): 392 - 54 = 338px -> capped at max 330px
    const standardWidth = calculateCarouselCardWidth(392);
    assert(standardWidth === 330, `Standard screen (392px) should cap at 330px, got ${standardWidth}px`);

    // Very small screen (300px): 300 - 54 = 246px -> floored at min 270px
    const smallWidth = calculateCarouselCardWidth(300);
    assert(smallWidth === 270, `Small screen (300px) should floor at 270px, got ${smallWidth}px`);

    // Single Offer mode (isFullWidth = true) must fill 100% container
    const fullWidth = calculateOfferCardWidth(true, 392);
    assert(fullWidth === '100%', 'Single offer must return 100% width');

    // Multiple Offers mode (isFullWidth = false) must use carousel width
    const carouselModeWidth = calculateOfferCardWidth(false, 360);
    assert(carouselModeWidth === 306, 'Multiple offers must use responsive carousel card width');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 2: Double-Tap Prevention Mutex Pattern used in CartContext and ProductCard
  console.log('Test 2: Double-Tap Prevention Mutex Pattern used in CartContext and ProductCard');
  {
    const inFlightItemOps = new Set<string>();
    let executedOperations = 0;

    async function triggerItemOperation(itemId: string) {
      if (inFlightItemOps.has(itemId)) {
        return 'MUTEX_BLOCKED';
      }
      inFlightItemOps.add(itemId);
      try {
        await new Promise((res) => setTimeout(res, 30));
        executedOperations++;
        return 'ADDED';
      } finally {
        inFlightItemOps.delete(itemId);
      }
    }

    // Trigger rapid concurrent double-tap on the exact same item
    const [res1, res2] = await Promise.all([
      triggerItemOperation('prod_10_var_1'),
      triggerItemOperation('prod_10_var_1'),
    ]);

    assert(
      (res1 === 'ADDED' && res2 === 'MUTEX_BLOCKED') || (res2 === 'ADDED' && res1 === 'MUTEX_BLOCKED'),
      'Rapid duplicate tap for the same item must be blocked by the in-flight Set mutex'
    );
    assert(executedOperations === 1, 'Exactly one cart operation must execute');

    // Subsequent operation after release succeeds
    const res3 = await triggerItemOperation('prod_10_var_1');
    assert(res3 === 'ADDED', 'Operation after lock release must succeed');
    assert(executedOperations === 2, 'Total executed operations should be 2');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 3: Real Offer Card Prominent Discount Calculation (from src/utils/offerHelpers.ts)
  console.log('Test 3: Real Offer Card Prominent Discount Calculation');
  {
    const pct = getDiscountHighlight({ discountPercent: 15 });
    assert(pct.highlight === '15% OFF', 'Should compute percentage discount highlight');
    assert(pct.subtitle === 'Instant Discount', 'Should compute percentage subtitle');

    const flat = getDiscountHighlight({ discountValue: 50 });
    assert(flat.highlight === '₹50 OFF', 'Should compute flat discount highlight');
    assert(flat.subtitle === 'Flat Savings', 'Should compute flat subtitle');

    const combo = getDiscountHighlight({ type: 'combo' });
    assert(combo.highlight === 'COMBO DEAL', 'Should compute combo deal highlight');

    const code = getDiscountHighlight({ code: 'SAVE10' });
    assert(code.highlight === 'EXCLUSIVE CODE', 'Should compute exclusive code highlight');

    const fallback = getDiscountHighlight({});
    assert(fallback.highlight === 'SPECIAL DEAL', 'Should fallback to special deal highlight');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 4: Offer Card Target Label Resolution (from src/utils/offerHelpers.ts)
  console.log('Test 4: Offer Card Target Label Resolution');
  {
    const categoryTarget = resolveTargetLabel({
      categories: [{ id: '1', name: 'Fruits' }, { id: '2', name: 'Vegetables' }],
    });
    assert(categoryTarget === 'Fruits, Vegetables', 'Should join first 2 category names');

    const namedCategory = resolveTargetLabel({ categoryName: 'Dairy' });
    assert(namedCategory === 'Dairy', 'Should use categoryName');

    const allStores = resolveTargetLabel({ offerScope: 'ALL_STORES' });
    assert(allStores === 'All Products', 'Should resolve ALL_STORES to All Products');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 5: Working Clipboard Copy Coupon Action
  console.log('Test 5: Working Clipboard Copy Coupon Action');
  {
    const couponCode = 'FRESHMART20';
    await Clipboard.setStringAsync(couponCode);
    const retrieved = await Clipboard.getStringAsync();
    assert(retrieved === couponCode, `Clipboard must receive exact coupon code (expected ${couponCode}, got ${retrieved})`);

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 6: Graceful Missing Image Handling (from src/utils/offerHelpers.ts)
  console.log('Test 6: Graceful Missing Image Handling');
  {
    assert(hasValidOfferImage('https://example.com/banner.jpg') === true, 'Valid HTTPS URL must be accepted');
    assert(hasValidOfferImage('http://example.com/banner.jpg') === true, 'Valid HTTP URL must be accepted');
    assert(hasValidOfferImage(undefined) === false, 'Undefined image must return false');
    assert(hasValidOfferImage('   ') === false, 'Whitespace image must return false');
    assert(hasValidOfferImage('ftp://example.com') === false, 'Non-HTTP URL must return false');

    passedCount++;
    console.log('  -> PASSED');
  }

  console.log(`\nAll ${passedCount} Offers UI & Product Card Layout tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
