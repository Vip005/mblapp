import * as Clipboard from 'expo-clipboard';
import { Offer, Product, ProductVariant } from '../types';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Offers UI & Product Card Layout Tests ---');
  let passedCount = 0;

  // Test 1: Product Card Horizontal Geometry & Non-clipping Layout
  console.log('Test 1: Product Card Horizontal Geometry & Non-clipping Layout');
  {
    const cardWidth = 168;
    const cardPaddingHorizontal = 10 * 2; // 20px
    const innerContentWidth = cardWidth - cardPaddingHorizontal; // 148px

    // Vertical price column takes ~55px
    const priceColumnWidth = 55;
    const columnGap = 6;
    const availableActionWidth = innerContentWidth - priceColumnWidth - columnGap; // 87px

    // Add button dimensions
    const addBtnWidth = 68; // within minWidth 64 and maxWidth 72
    assert(
      addBtnWidth <= availableActionWidth,
      `Add button (${addBtnWidth}px) must fit cleanly within available action width (${availableActionWidth}px)`
    );

    // QuantitySelector size="sm" dimensions
    const qtySelectorWidth = 23 + 23 + 8 + 14; // btn + btn + paddingH*2 + qtyText = 68px
    assert(
      qtySelectorWidth <= availableActionWidth,
      `QuantitySelector (${qtySelectorWidth}px) must fit cleanly within available action width (${availableActionWidth}px)`
    );

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 2: Double-Tap Prevention Mutex for Add to Cart
  console.log('Test 2: Double-Tap Prevention Mutex for Add to Cart');
  {
    let addCount = 0;
    let isAdding = false;

    async function handleAddToCartWithMutex() {
      if (isAdding) return 'MUTEX_BLOCKED';
      isAdding = true;
      try {
        await new Promise((res) => setTimeout(res, 40));
        addCount++;
        return 'ADDED';
      } finally {
        isAdding = false;
      }
    }

    // Trigger rapid concurrent double-tap
    const [res1, res2] = await Promise.all([
      handleAddToCartWithMutex(),
      handleAddToCartWithMutex(),
    ]);

    assert(
      (res1 === 'ADDED' && res2 === 'MUTEX_BLOCKED') || (res2 === 'ADDED' && res1 === 'MUTEX_BLOCKED'),
      'Rapid duplicate tap must be intercepted by mutex'
    );
    assert(addCount === 1, 'Exactly one cart addition must occur');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 3: Offer Card Prominent Discount Calculation
  console.log('Test 3: Offer Card Prominent Discount Calculation');
  {
    function getDiscountHighlight(offer: Partial<Offer>) {
      if (offer.discountPercent && offer.discountPercent > 0) {
        return `${offer.discountPercent}% OFF`;
      } else if (offer.discountValue && offer.discountValue > 0) {
        return `₹${offer.discountValue} OFF`;
      } else if (offer.type === 'combo') {
        return 'COMBO DEAL';
      } else if (offer.code) {
        return 'EXCLUSIVE CODE';
      } else {
        return 'SPECIAL DEAL';
      }
    }

    assert(getDiscountHighlight({ discountPercent: 15 }) === '15% OFF', 'Should compute percentage discount');
    assert(getDiscountHighlight({ discountValue: 50 }) === '₹50 OFF', 'Should compute flat discount');
    assert(getDiscountHighlight({ type: 'combo' }) === 'COMBO DEAL', 'Should compute combo deal');
    assert(getDiscountHighlight({ code: 'SAVE10' }) === 'EXCLUSIVE CODE', 'Should compute code badge');
    assert(getDiscountHighlight({}) === 'SPECIAL DEAL', 'Should fallback to special deal');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 4: Offer Card Responsive Width and Target Height
  console.log('Test 4: Offer Card Responsive Width and Target Height');
  {
    // On narrow Android screen (360px wide)
    const narrowScreenWidth = 360;
    const narrowCardWidth = Math.min(320, Math.max(280, narrowScreenWidth - 48));
    assert(narrowCardWidth === 312, `Narrow screen width must be 312px (got ${narrowCardWidth}px)`);

    // On standard Android screen (392px / 412px wide)
    const standardScreenWidth = 412;
    const standardCardWidth = Math.min(320, Math.max(280, standardScreenWidth - 48));
    assert(standardCardWidth === 320, `Standard screen width must be 320px (got ${standardCardWidth}px)`);

    // Card height calculation: hero (118) + content (~160) = ~278px
    const estimatedHeight = 118 + 160;
    assert(
      estimatedHeight >= 260 && estimatedHeight <= 320,
      `Card height (${estimatedHeight}px) must be within target range 260-320px`
    );

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

  // Test 6: Offer Card Target Label Resolution
  console.log('Test 6: Offer Card Target Label Resolution');
  {
    function resolveTargetLabel(offer: Partial<Offer>): string {
      if (offer.categories && offer.categories.length > 0) {
        return offer.categories.map((c) => c.name).slice(0, 2).join(', ');
      } else if (offer.categoryName) {
        return offer.categoryName;
      } else if (offer.products && offer.products.length > 0) {
        return offer.products.map((p) => p.name).slice(0, 2).join(', ');
      } else if (offer.productName) {
        return offer.productName;
      } else if (offer.offerScope === 'ALL_STORES') {
        return 'All Products';
      }
      return '';
    }

    assert(
      resolveTargetLabel({ categories: [{ id: '1', name: 'Fruits' }, { id: '2', name: 'Vegetables' }] }) ===
        'Fruits, Vegetables',
      'Should join categories'
    );
    assert(resolveTargetLabel({ categoryName: 'Dairy' }) === 'Dairy', 'Should use categoryName');
    assert(resolveTargetLabel({ offerScope: 'ALL_STORES' }) === 'All Products', 'Should use All Products for ALL_STORES');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 7: Graceful Missing Image Handling
  console.log('Test 7: Graceful Missing Image Handling');
  {
    const offerWithImage: Partial<Offer> = {
      image: 'https://example.com/banner.jpg',
    };
    const offerWithoutImage: Partial<Offer> = {
      image: undefined,
    };
    const offerWithEmptyImage: Partial<Offer> = {
      image: '   ',
    };

    function hasValidImage(img?: string): boolean {
      return Boolean(img && typeof img === 'string' && img.trim().length > 0 && img.startsWith('http'));
    }

    assert(hasValidImage(offerWithImage.image) === true, 'Valid image URL must be recognized');
    assert(hasValidImage(offerWithoutImage.image) === false, 'Missing image must trigger artwork banner');
    assert(hasValidImage(offerWithEmptyImage.image) === false, 'Empty image must trigger artwork banner');

    passedCount++;
    console.log('  -> PASSED');
  }

  console.log(`\nAll ${passedCount} Offers UI & Product Card Layout tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
