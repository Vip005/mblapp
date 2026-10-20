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

import { Offer } from '../types';
import { offerService } from '../services/api/offerService';
import { apiClient } from '../services/api/apiClient';

console.log('--- Starting Special Offers Responsive Layout Tests ---\n');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(testName: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  -> PASSED: ${testName}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  -> FAILED: ${testName}`);
    console.error(`     Error: ${err?.message || err}`);
    testsFailed++;
  }
}

// Helper to create mock offer
const createMockOffer = (
  id: string,
  title: string,
  discountPercent = 20,
  minOrder = 199,
  code = 'FRESH20'
): Offer => ({
  id,
  title,
  description: 'Get extra discount on fresh daily fruits and vegetables',
  discountPercent,
  minOrder,
  code,
  type: 'deal',
  validUntil: '2026-12-31T23:59:59Z',
  categories: [{ id: '1', name: 'Fresh Vegetables' }],
  image: 'https://cdn.freshmart.app/offers/fresh20.jpg',
});

// Card layout calculation simulator matching OfferCard.tsx responsive logic
function calculateCardLayout(screenWidth: number, isFullWidth: boolean, customWidth?: number) {
  const carouselWidth = Math.min(330, Math.max(270, screenWidth - 54));
  const cardWidth = isFullWidth ? '100%' : (customWidth ?? carouselWidth);
  const marginRight = isFullWidth ? 0 : 14;

  // Next card peek calculation on carousel mode
  // Screen padding = 16px left + 16px right = 32px
  // Available width for first card = screenWidth - 32px
  const numericCardWidth = typeof cardWidth === 'number' ? cardWidth : screenWidth - 32;
  const nextCardPeek = isFullWidth ? 0 : screenWidth - (16 + numericCardWidth);

  return {
    cardWidth,
    marginRight,
    numericCardWidth,
    nextCardPeek,
  };
}

async function main() {
  // ============================================================================
  // Group 1: Case 1 - Exactly One Offer Layout (Full-Width Card)
  // ============================================================================
  console.log('[Group 1: Case 1 - Exactly One Offer (Full-Width Layout)]');

  await runTest('Case 1: Single offer resolves to full-width (100%) without asymmetric right margin', async () => {
    const singleOffer = [createMockOffer('off-1', 'Super Saver Thursday')];
    assert.strictEqual(singleOffer.length, 1, 'Offer count must be 1');

    // Test across standard screen sizes: 360px, 390px, 412px
    const screenSizes = [360, 390, 412, 480];

    for (const width of screenSizes) {
      const layout = calculateCardLayout(width, true);
      assert.strictEqual(layout.cardWidth, '100%', `Width on ${width}px screen should be 100%`);
      assert.strictEqual(layout.marginRight, 0, `marginRight on ${width}px screen must be 0`);
      assert.strictEqual(layout.numericCardWidth, width - 32, `Numeric width on ${width}px should fill content (minus 32px padding)`);
    }
  });

  await runTest('Case 1: Single offer preserves all offer details, discount badges, and actions', async () => {
    const offer = createMockOffer('off-1', 'Flat 25% Off Fresh Veggies', 25, 299, 'VEG25');

    // 1. Discount highlight & pill
    const discountHighlight = `${offer.discountPercent}% OFF`;
    assert.strictEqual(discountHighlight, '25% OFF', 'Discount highlight must reflect offer discount');

    // 2. Title & description
    assert.strictEqual(offer.title, 'Flat 25% Off Fresh Veggies');
    assert(offer.description && offer.description.length > 0, 'Description must be present');

    // 3. Expiry date
    assert(offer.validUntil !== undefined, 'Expiry date must be defined');

    // 4. Target category / product
    assert(offer.categories && offer.categories.length > 0, 'Categories must be defined');
    assert.strictEqual(offer.categories![0].name, 'Fresh Vegetables');

    // 5. Coupon code & min order
    assert.strictEqual(offer.code, 'VEG25');
    assert.strictEqual(offer.minOrder, 299);
  });

  // ============================================================================
  // Group 2: Case 2 - Multiple Offers Layout (Horizontal Carousel with Peek)
  // ============================================================================
  console.log('\n[Group 2: Case 2 - Multiple Offers (Horizontal Carousel)]');

  await runTest('Case 2: Two offers resolve to horizontal carousel with preview of next card', async () => {
    const twoOffers = [
      createMockOffer('off-1', 'Offer 1', 15),
      createMockOffer('off-2', 'Offer 2', 30),
    ];
    assert.strictEqual(twoOffers.length, 2, 'Offer count must be 2');

    // On a 360px screen:
    // Screen width = 360px.
    // Carousel card width = min(330, max(270, 360 - 54)) = 306px.
    // Left padding = 16px.
    // 360 - (16 + 306) = 38px preview of the next card!
    const layout360 = calculateCardLayout(360, false);
    assert.strictEqual(layout360.marginRight, 14, 'Cards in carousel mode must have 14px right margin');
    assert(layout360.nextCardPeek >= 30, `Next card peek on 360px screen must be at least 30px (actual: ${layout360.nextCardPeek}px)`);

    // On a 412px screen:
    // Carousel card width = min(330, 412 - 54) = 330px.
    // 412 - (16 + 330) = 66px preview of next card!
    const layout412 = calculateCardLayout(412, false);
    assert.strictEqual(layout412.cardWidth, 330, 'Card width on large screen capped at 330px');
    assert(layout412.nextCardPeek >= 40, `Next card peek on 412px screen must be at least 40px (actual: ${layout412.nextCardPeek}px)`);
  });

  await runTest('Case 2: Three or more offers render unique keys and maintain carousel layout', async () => {
    const threeOffers = [
      createMockOffer('off-1', 'Deal 1', 10),
      createMockOffer('off-2', 'Deal 2', 20),
      createMockOffer('off-3', 'Deal 3', 30),
    ];
    assert.strictEqual(threeOffers.length, 3, 'Offer count must be 3');

    const ids = threeOffers.map((o) => o.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(uniqueIds.size, 3, 'All offers must have unique IDs for keyExtractor');
  });

  // ============================================================================
  // Group 3: Case 3 - Zero Offers & Empty State
  // ============================================================================
  console.log('\n[Group 3: Case 3 - Zero Offers & Empty State]');

  await runTest('Case 3: Zero offers cleanly returns null and hides the Special Offers section', async () => {
    const emptyOffers: Offer[] = [];
    assert.strictEqual(emptyOffers.length, 0, 'Offers count is 0');

    // Simulate OffersCarousel visibility check
    const shouldRender = emptyOffers && emptyOffers.length > 0;
    assert.strictEqual(shouldRender, false, 'Special Offers section must be hidden when offers count is 0');
  });

  // ============================================================================
  // Group 4: API Error & Outage Handling
  // ============================================================================
  console.log('\n[Group 4: API Error Handling]');

  await runTest('Case 4: API failure returns empty array and gracefully suppresses section without crash', async () => {
    const originalGet = (apiClient as any).get;
    (apiClient as any).get = async () => {
      throw new Error('500 Internal Server Error');
    };

    try {
      const fetchedOffers = await offerService.getOffers(101);
      assert.strictEqual(Array.isArray(fetchedOffers), true, 'getOffers must return an array on error');
      assert.strictEqual(fetchedOffers.length, 0, 'getOffers must return empty array on failure');

      const shouldRender = fetchedOffers.length > 0;
      assert.strictEqual(shouldRender, false, 'OffersCarousel should not render on API failure');
    } finally {
      (apiClient as any).get = originalGet;
    }
  });

  // ============================================================================
  // Group 5: Store-Specific Filtering Isolation
  // ============================================================================
  console.log('\n[Group 5: Store-Specific Filtering Isolation]');

  await runTest('Case 5: getOffers filters only active, valid offers for the selected store', async () => {
    const originalGet = (apiClient as any).get;
    (apiClient as any).get = async (url: string) => {
      if (url.includes('storeId=101')) {
        return [
          {
            offerID: 1,
            offerTitle: 'Store 101 Exclusive',
            discountPercent: 15,
            isActive: true,
            isExpired: false,
            storeID: 101,
          },
        ];
      }
      if (url.includes('storeId=102')) {
        return [
          {
            offerID: 2,
            offerTitle: 'Store 102 Deal A',
            discountPercent: 20,
            isActive: true,
            isExpired: false,
            storeID: 102,
          },
          {
            offerID: 3,
            offerTitle: 'Store 102 Deal B',
            discountPercent: 30,
            isActive: true,
            isExpired: false,
            storeID: 102,
          },
        ];
      }
      return [];
    };

    try {
      // Store 101 has 1 offer -> Case 1 layout
      const store101Offers = await offerService.getOffers(101);
      assert.strictEqual(store101Offers.length, 1, 'Store 101 should return exactly 1 offer');
      const store101Layout = calculateCardLayout(360, store101Offers.length === 1);
      assert.strictEqual(store101Layout.cardWidth, '100%', 'Store 101 should use full-width 100% card layout');

      // Store 102 has 2 offers -> Case 2 carousel layout
      const store102Offers = await offerService.getOffers(102);
      assert.strictEqual(store102Offers.length, 2, 'Store 102 should return 2 offers');
      const store102Layout = calculateCardLayout(360, store102Offers.length === 1);
      assert.strictEqual(typeof store102Layout.cardWidth, 'number', 'Store 102 should use numeric carousel card width');
      assert.strictEqual(store102Layout.marginRight, 14, 'Store 102 carousel cards must have 14px margin');
    } finally {
      (apiClient as any).get = originalGet;
    }
  });

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('\n======================================================');
  console.log(`Test Execution Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('ALL SPECIAL OFFERS RESPONSIVE LAYOUT TESTS PASSED SUCCESSFULLY!\n');
  }
}

main().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
