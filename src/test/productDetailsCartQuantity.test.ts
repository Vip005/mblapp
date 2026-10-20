import { Product, ProductVariant, CartItem } from '../types';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Pure state transition & logic models matching ProductDetailsScreen.tsx exactly
 */
interface ProductDetailsState {
  product: Product;
  selectedVariant: ProductVariant;
  cartItems: CartItem[];
  isAdding: boolean;
  isAddingRef: { current: boolean };
}

function resolveCartItem(state: ProductDetailsState): CartItem | undefined {
  return state.cartItems.find(
    (i) =>
      String(i.productId) === String(state.product.id) &&
      String(i.variantId) === String(state.selectedVariant.id)
  );
}

function resolveCurrentCartQty(state: ProductDetailsState): number {
  const item = resolveCartItem(state);
  return item ? item.quantity : 0;
}

function resolveIsOutOfStock(state: ProductDetailsState): boolean {
  if (!state.product.isAvailable) return true;
  if (state.selectedVariant) {
    return !state.selectedVariant.isAvailable || state.selectedVariant.stock <= 0;
  }
  return state.product.stock <= 0;
}

function resolveAvailableStock(state: ProductDetailsState): number {
  return state.selectedVariant?.stock != null ? state.selectedVariant.stock : state.product.stock;
}

function resolveUnitPrice(state: ProductDetailsState): number {
  return state.selectedVariant?.price ?? state.product?.sellingPrice ?? 0;
}

function resolveBottomTotalPrice(state: ProductDetailsState): number {
  const currentCartQty = resolveCurrentCartQty(state);
  const unitPrice = resolveUnitPrice(state);
  return currentCartQty > 0 ? unitPrice * currentCartQty : unitPrice;
}

function resolveBottomPriceLabel(state: ProductDetailsState): string {
  const currentCartQty = resolveCurrentCartQty(state);
  return currentCartQty > 0 ? 'Total Price' : 'Price';
}

type BottomActionMode = 'OUT_OF_STOCK' | 'QUANTITY_SELECTOR' | 'ADD_TO_CART';

function resolveBottomActionMode(state: ProductDetailsState): {
  mode: BottomActionMode;
  buttonTitle?: string;
  quantity?: number;
  disabled?: boolean;
} {
  const isOutOfStock = resolveIsOutOfStock(state);
  const currentCartQty = resolveCurrentCartQty(state);

  if (isOutOfStock) {
    return {
      mode: 'OUT_OF_STOCK',
      buttonTitle: 'Out of Stock',
      disabled: true,
    };
  }

  if (currentCartQty > 0) {
    return {
      mode: 'QUANTITY_SELECTOR',
      quantity: currentCartQty,
      disabled: false,
    };
  }

  return {
    mode: 'ADD_TO_CART',
    buttonTitle: 'Add to Cart',
    disabled: false,
  };
}

// Handlers mimicking ProductDetailsScreen
async function handleAddToCart(state: ProductDetailsState): Promise<string> {
  const isOutOfStock = resolveIsOutOfStock(state);
  if (isOutOfStock || state.isAdding || state.isAddingRef.current || !state.selectedVariant || !state.product) {
    return 'BLOCKED';
  }

  try {
    state.isAddingRef.current = true;
    state.isAdding = true;
    await new Promise((r) => setTimeout(r, 20));

    const itemId = `${state.product.id}_${state.selectedVariant.id}`;
    const unitPrice = resolveUnitPrice(state);
    const existingIndex = state.cartItems.findIndex((i) => i.id === itemId);

    if (existingIndex > -1) {
      state.cartItems[existingIndex].quantity += 1;
      state.cartItems[existingIndex].totalPrice = state.cartItems[existingIndex].quantity * unitPrice;
    } else {
      state.cartItems.push({
        id: itemId,
        productId: state.product.id,
        variantId: state.selectedVariant.id,
        product: state.product,
        variant: state.selectedVariant,
        quantity: 1,
        price: unitPrice,
        totalPrice: unitPrice,
      });
    }
    return 'SUCCESS';
  } finally {
    state.isAddingRef.current = false;
    state.isAdding = false;
  }
}

async function handleIncrement(state: ProductDetailsState): Promise<string> {
  const isOutOfStock = resolveIsOutOfStock(state);
  if (isOutOfStock || state.isAdding || state.isAddingRef.current || !state.selectedVariant || !state.product) {
    return 'BLOCKED';
  }

  const currentCartQty = resolveCurrentCartQty(state);
  const availableStock = resolveAvailableStock(state);

  if (currentCartQty >= availableStock) {
    return 'STOCK_LIMIT_REACHED';
  }

  try {
    state.isAddingRef.current = true;
    state.isAdding = true;
    await new Promise((r) => setTimeout(r, 20));

    const itemId = `${state.product.id}_${state.selectedVariant.id}`;
    const unitPrice = resolveUnitPrice(state);
    const cartItem = resolveCartItem(state);

    if (cartItem) {
      cartItem.quantity += 1;
      cartItem.totalPrice = cartItem.quantity * unitPrice;
    } else {
      state.cartItems.push({
        id: itemId,
        productId: state.product.id,
        variantId: state.selectedVariant.id,
        product: state.product,
        variant: state.selectedVariant,
        quantity: 1,
        price: unitPrice,
        totalPrice: unitPrice,
      });
    }
    return 'SUCCESS';
  } finally {
    state.isAddingRef.current = false;
    state.isAdding = false;
  }
}

async function handleDecrement(state: ProductDetailsState): Promise<string> {
  if (state.isAdding || state.isAddingRef.current) {
    return 'BLOCKED';
  }

  const cartItem = resolveCartItem(state);
  if (!cartItem) return 'NOT_IN_CART';

  try {
    state.isAddingRef.current = true;
    state.isAdding = true;
    await new Promise((r) => setTimeout(r, 20));

    const unitPrice = resolveUnitPrice(state);
    if (cartItem.quantity > 1) {
      cartItem.quantity -= 1;
      cartItem.totalPrice = cartItem.quantity * unitPrice;
      return 'DECREMENTED';
    } else {
      state.cartItems = state.cartItems.filter((i) => i.id !== cartItem.id);
      return 'REMOVED';
    }
  } finally {
    state.isAddingRef.current = false;
    state.isAdding = false;
  }
}

// Mock test data
const mockVariant500g: ProductVariant = {
  id: 'var_500g',
  name: '500g Pack',
  price: 45,
  originalPrice: 50,
  unit: '500g',
  isAvailable: true,
  stock: 10,
};

const mockVariant1kg: ProductVariant = {
  id: 'var_1kg',
  name: '1kg Pack',
  price: 80,
  originalPrice: 90,
  unit: '1kg',
  isAvailable: true,
  stock: 5,
};

const mockVariantOutOfStock: ProductVariant = {
  id: 'var_oos',
  name: '2kg Pack (Out of Stock)',
  price: 150,
  originalPrice: 170,
  unit: '2kg',
  isAvailable: false,
  stock: 0,
};

const mockProduct: Product = {
  id: 'prod_tomatoes',
  name: 'Fresh Farm Tomatoes',
  brand: 'FarmFresh',
  description: 'Organic juicy red tomatoes fresh from local farms.',
  image: 'https://cdn.freshmart.com/tomatoes.png',
  categoryId: 'cat_veggies',
  originalPrice: 50,
  sellingPrice: 45,
  discount: 10,
  stock: 15,
  isAvailable: true,
  rating: 4.8,
  reviewCount: 124,
  tags: ['fresh', 'organic'],
  variants: [mockVariant500g, mockVariant1kg, mockVariantOutOfStock],
};

async function runTests() {
  console.log('--- Starting Product Details Cart Quantity Tests ---');
  let passedCount = 0;

  // Test 1: Initial state - "Add to Cart" button is visible when item is not in cart
  console.log('Test 1: Initial state - "Add to Cart" button visible when item is not in cart');
  {
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariant500g,
      cartItems: [],
      isAdding: false,
      isAddingRef: { current: false },
    };

    assert(resolveCurrentCartQty(state) === 0, 'Cart quantity must initially be 0');
    assert(resolveUnitPrice(state) === 45, 'Unit price must be ₹45 for 500g variant');
    assert(resolveBottomTotalPrice(state) === 45, 'Total price summary must display single-unit price (₹45)');
    assert(resolveBottomPriceLabel(state) === 'Price', 'Price label should be Price when not in cart');

    const action = resolveBottomActionMode(state);
    assert(action.mode === 'ADD_TO_CART', 'Action button mode must be ADD_TO_CART');
    assert(action.buttonTitle === 'Add to Cart', 'Button title must be Add to Cart');
    assert(action.disabled === false, 'Add to Cart button must be enabled');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 2: After adding to cart - Quantity selector is visible with quantity 1
  console.log('Test 2: After adding to cart - Quantity selector is visible with quantity 1');
  {
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariant500g,
      cartItems: [],
      isAdding: false,
      isAddingRef: { current: false },
    };

    const addResult = await handleAddToCart(state);
    assert(addResult === 'SUCCESS', 'handleAddToCart must succeed');
    assert(resolveCurrentCartQty(state) === 1, 'Cart quantity must update to 1');
    assert(resolveBottomTotalPrice(state) === 45, 'Total price must be ₹45 for 1 unit');
    assert(resolveBottomPriceLabel(state) === 'Total Price', 'Price label should be Total Price');

    const action = resolveBottomActionMode(state);
    assert(action.mode === 'QUANTITY_SELECTOR', 'Action mode must transition to QUANTITY_SELECTOR');
    assert(action.quantity === 1, 'Quantity selector must display quantity 1');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 3: Increment - Quantity increments to 2, total price doubles
  console.log('Test 3: Increment - Quantity increments to 2, total price doubles');
  {
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariant500g,
      cartItems: [
        {
          id: 'prod_tomatoes_var_500g',
          productId: 'prod_tomatoes',
          variantId: 'var_500g',
          product: mockProduct,
          variant: mockVariant500g,
          quantity: 1,
          price: 45,
          totalPrice: 45,
        },
      ],
      isAdding: false,
      isAddingRef: { current: false },
    };

    const incResult = await handleIncrement(state);
    assert(incResult === 'SUCCESS', 'handleIncrement must succeed');
    assert(resolveCurrentCartQty(state) === 2, 'Cart quantity must increment to 2');
    assert(resolveBottomTotalPrice(state) === 90, 'Total price must double to ₹90 (45 * 2)');

    const action = resolveBottomActionMode(state);
    assert(action.mode === 'QUANTITY_SELECTOR', 'Action mode must remain QUANTITY_SELECTOR');
    assert(action.quantity === 2, 'Quantity selector must display quantity 2');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 4: Decrement to 1 - Quantity decrements back to 1, total price returns to ₹45
  console.log('Test 4: Decrement to 1 - Quantity decrements back to 1, total price returns to ₹45');
  {
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariant500g,
      cartItems: [
        {
          id: 'prod_tomatoes_var_500g',
          productId: 'prod_tomatoes',
          variantId: 'var_500g',
          product: mockProduct,
          variant: mockVariant500g,
          quantity: 2,
          price: 45,
          totalPrice: 90,
        },
      ],
      isAdding: false,
      isAddingRef: { current: false },
    };

    const decResult = await handleDecrement(state);
    assert(decResult === 'DECREMENTED', 'handleDecrement must decrement quantity');
    assert(resolveCurrentCartQty(state) === 1, 'Cart quantity must decrement to 1');
    assert(resolveBottomTotalPrice(state) === 45, 'Total price must return to ₹45');

    const action = resolveBottomActionMode(state);
    assert(action.mode === 'QUANTITY_SELECTOR', 'Action mode must remain QUANTITY_SELECTOR');
    assert(action.quantity === 1, 'Quantity selector must display quantity 1');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 5: Decrement to 0 - Item is removed, "Add to Cart" button reappears, price resets to 1 unit
  console.log('Test 5: Decrement to 0 - Item removed, "Add to Cart" reappears, price resets to 1 unit');
  {
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariant500g,
      cartItems: [
        {
          id: 'prod_tomatoes_var_500g',
          productId: 'prod_tomatoes',
          variantId: 'var_500g',
          product: mockProduct,
          variant: mockVariant500g,
          quantity: 1,
          price: 45,
          totalPrice: 45,
        },
      ],
      isAdding: false,
      isAddingRef: { current: false },
    };

    const decResult = await handleDecrement(state);
    assert(decResult === 'REMOVED', 'handleDecrement must remove item when quantity is 1');
    assert(resolveCurrentCartQty(state) === 0, 'Cart quantity must drop to 0');
    assert(resolveBottomTotalPrice(state) === 45, 'Total price must reset to single-unit price (₹45)');
    assert(resolveBottomPriceLabel(state) === 'Price', 'Price label should be Price');

    const action = resolveBottomActionMode(state);
    assert(action.mode === 'ADD_TO_CART', 'Action button mode must immediately revert to ADD_TO_CART');
    assert(action.buttonTitle === 'Add to Cart', 'Button title must be Add to Cart');
    assert(action.disabled === false, 'Add to Cart button must be enabled');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 6: Variant switch - 500g (in cart qty 2) and 1kg (not in cart qty 0)
  console.log('Test 6: Variant switch - 500g (in cart) vs 1kg (not in cart) updates button and price');
  {
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariant500g,
      cartItems: [
        {
          id: 'prod_tomatoes_var_500g',
          productId: 'prod_tomatoes',
          variantId: 'var_500g',
          product: mockProduct,
          variant: mockVariant500g,
          quantity: 2,
          price: 45,
          totalPrice: 90,
        },
      ],
      isAdding: false,
      isAddingRef: { current: false },
    };

    // When 500g is selected:
    assert(resolveCurrentCartQty(state) === 2, '500g variant must have cart quantity 2');
    assert(resolveBottomTotalPrice(state) === 90, '500g total price must be ₹90');
    assert(resolveBottomActionMode(state).mode === 'QUANTITY_SELECTOR', '500g action must be QUANTITY_SELECTOR');
    assert(resolveBottomActionMode(state).quantity === 2, '500g quantity must be 2');

    // Switch to 1kg pack (₹80, not in cart)
    state.selectedVariant = mockVariant1kg;
    assert(resolveCurrentCartQty(state) === 0, '1kg variant must have cart quantity 0');
    assert(resolveUnitPrice(state) === 80, '1kg unit price must be ₹80');
    assert(resolveBottomTotalPrice(state) === 80, '1kg bottom total price must display ₹80');

    const action1kg = resolveBottomActionMode(state);
    assert(action1kg.mode === 'ADD_TO_CART', '1kg action button must be ADD_TO_CART');
    assert(action1kg.buttonTitle === 'Add to Cart', '1kg button title must be Add to Cart');

    // Switch back to 500g pack
    state.selectedVariant = mockVariant500g;
    assert(resolveCurrentCartQty(state) === 2, 'Returning to 500g variant must restore cart quantity 2');
    assert(resolveBottomTotalPrice(state) === 90, 'Returning to 500g must restore total price ₹90');
    assert(resolveBottomActionMode(state).mode === 'QUANTITY_SELECTOR', 'Returning to 500g must restore QUANTITY_SELECTOR');
    assert(resolveBottomActionMode(state).quantity === 2, 'Returning to 500g must restore quantity 2');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 7: Out of stock - Button shows "Out of Stock" and is disabled
  console.log('Test 7: Out of stock - Button shows "Out of Stock" and is disabled');
  {
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariantOutOfStock,
      cartItems: [],
      isAdding: false,
      isAddingRef: { current: false },
    };

    assert(resolveIsOutOfStock(state) === true, 'Variant must be resolved as out of stock');
    const action = resolveBottomActionMode(state);
    assert(action.mode === 'OUT_OF_STOCK', 'Action mode must be OUT_OF_STOCK');
    assert(action.buttonTitle === 'Out of Stock', 'Button title must be Out of Stock');
    assert(action.disabled === true, 'Button must be disabled');

    // Attempting Add to Cart on out of stock variant must be blocked
    const addResult = await handleAddToCart(state);
    assert(addResult === 'BLOCKED', 'handleAddToCart must be blocked when out of stock');
    assert(state.cartItems.length === 0, 'No cart items should be added');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 8: Stock Limit Enforcement on Increment
  console.log('Test 8: Stock Limit Enforcement on Increment');
  {
    // Variant 1kg has stock: 5
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariant1kg,
      cartItems: [
        {
          id: 'prod_tomatoes_var_1kg',
          productId: 'prod_tomatoes',
          variantId: 'var_1kg',
          product: mockProduct,
          variant: mockVariant1kg,
          quantity: 5,
          price: 80,
          totalPrice: 400,
        },
      ],
      isAdding: false,
      isAddingRef: { current: false },
    };

    const incResult = await handleIncrement(state);
    assert(incResult === 'STOCK_LIMIT_REACHED', 'Incrementing past stock limit must be blocked');
    assert(resolveCurrentCartQty(state) === 5, 'Cart quantity must not exceed available stock (5)');
    assert(resolveBottomTotalPrice(state) === 400, 'Total price must remain at 5 units (₹400)');

    passedCount++;
    console.log('  -> PASSED');
  }

  // Test 9: Rapid Double-Tap Mutex Protection
  console.log('Test 9: Rapid Double-Tap Mutex Protection');
  {
    const state: ProductDetailsState = {
      product: mockProduct,
      selectedVariant: mockVariant500g,
      cartItems: [],
      isAdding: false,
      isAddingRef: { current: false },
    };

    // Trigger two simultaneous additions
    const [res1, res2] = await Promise.all([
      handleAddToCart(state),
      handleAddToCart(state),
    ]);

    assert(
      (res1 === 'SUCCESS' && res2 === 'BLOCKED') || (res2 === 'SUCCESS' && res1 === 'BLOCKED'),
      'Rapid duplicate tap must be intercepted by isAddingRef mutex'
    );
    assert(state.cartItems.length === 1, 'Only exactly 1 cart item should exist');
    assert(state.cartItems[0].quantity === 1, 'Cart quantity must be exactly 1, not 2');

    passedCount++;
    console.log('  -> PASSED');
  }

  console.log(`\nAll ${passedCount} Product Details Cart Quantity tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
