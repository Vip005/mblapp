# FreshMart Mobile App — Automated Test Cases Specification

**Document Version:** 1.0  
**Date:** October 2026  
**Project:** FreshMart Grocery Mobile Application (`GroceriesUIApp`)  

---

## Summary Matrix

| Category | ID Range | Total Cases | Automated Status | Pass Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Validation & Auth** | TC-001 to TC-015 | 15 | Automated (TypeScript / tsx) | 100% Passed |
| **Pricing, Fees & Cart** | TC-016 to TC-030 | 15 | Automated (TypeScript / tsx) | 100% Passed |
| **React Native Components** | TC-031 to TC-055 | 25 | Automated (TypeScript / tsx) | 100% Passed |
| **API Contract Integration** | TC-056 to TC-080 | 25 | Automated (TypeScript / tsx) | 100% Passed |
| **E2E Customer Journeys** | TC-081 to TC-100 | 20 | Automated (TypeScript / tsx) | 100% Passed |
| **Native Mobile UI (Maestro)** | TC-101 to TC-115 | 15 | Automated (Maestro YAML Flows) | 100% Spec / BLOCKED on Device |
| **Total Test Cases** | | **115** | | **100 Passed / 15 Device Blocked** |

---

## 1. Unit Validation, Auth & Formatters (TC-001 to TC-015)

### TC-001: Mobile Phone Number Validator
- **Category:** Unit
- **Precondition:** Validator loaded from `src/utils/validation.ts`.
- **Test Steps:**
  1. Test valid 10-digit Indian mobile numbers starting with 6, 7, 8, 9 (`9876543210`, `6123456789`).
  2. Test invalid numbers: `< 10` digits (`98765`), `> 10` digits (`98765432101`), non-digits (`98765abcde`), starting with 0-5 (`5123456789`).
- **Expected Result:** Returns `true` only for valid numbers; `false` otherwise.
- **Status:** **PASSED**

### TC-002: Email Address Validator
- **Category:** Unit
- **Precondition:** Validator loaded.
- **Test Steps:**
  1. Test standard emails (`user@freshmart.com`, `john.doe+test@domain.co.in`).
  2. Test invalid strings: missing `@`, missing domain, spaces, empty string.
- **Expected Result:** Correct RFC-compliant boolean evaluation.
- **Status:** **PASSED**

### TC-003: Indian Pincode Validator
- **Category:** Unit
- **Precondition:** Validator loaded.
- **Test Steps:**
  1. Test valid 6-digit postal codes (`600001`, `560034`).
  2. Test invalid codes: 5 digits (`60000`), 7 digits (`6000001`), leading zero (`012345`), letters.
- **Expected Result:** Rejects non-6-digit codes and non-digit characters.
- **Status:** **PASSED**

### TC-004: Currency Formatter (INR)
- **Category:** Unit
- **Precondition:** `formatCurrency` utility loaded.
- **Test Steps:**
  1. Format integer amount `1458` -> expected `₹1,458.00` or `₹1,458`.
  2. Format decimal amount `1312.20` -> expected `₹1,312.20`.
  3. Format zero amount `0` -> expected `₹0.00`.
- **Expected Result:** Includes ₹ symbol, comma grouping, and exact decimal rounding.
- **Status:** **PASSED**

### TC-005: Date & Delivery Slot Formatter
- **Category:** Unit
- **Precondition:** Date utilities loaded.
- **Test Steps:**
  1. Supply ISO timestamp `2026-10-25T14:30:00Z`.
  2. Verify user-facing string formatting matches locale standards.
- **Expected Result:** Formats into readable date and time slot without timezone drift.
- **Status:** **PASSED**

### TC-006: JWT Payload Decoder
- **Category:** Unit
- **Precondition:** `jwtDecode` helper loaded.
- **Test Steps:**
  1. Encode mock JWT containing `{ nameid: "42", role: "Customer", exp: 1792944000 }`.
  2. Call decoder.
- **Expected Result:** Accurately extracts customer identifier, role, and expiration timestamp.
- **Status:** **PASSED**

### TC-007: JWT Expiration Guard with 5-Minute Safety Buffer
- **Category:** Unit
- **Precondition:** `isTokenExpired` helper loaded.
- **Test Steps:**
  1. Check token expiring in 10 minutes -> expected `false`.
  2. Check token expiring in 3 minutes with 5-minute buffer -> expected `true`.
  3. Check already expired token -> expected `true`.
- **Expected Result:** Proactively marks token expired before actual expiry to prevent mid-flight checkout rejections.
- **Status:** **PASSED**

### TC-008: Image CDN URL Resolver
- **Category:** Unit
- **Precondition:** `resolveImageUrl` loaded.
- **Test Steps:**
  1. Test absolute URL (`https://cdn.freshmart.com/img/apple.png`) -> unchanged.
  2. Test relative path (`/images/products/apple.png`) -> prepends base CDN URL.
  3. Test null / undefined / empty string -> returns fallback placeholder image.
- **Expected Result:** Resolves robustly without breaking image renders.
- **Status:** **PASSED**

### TC-009: Category Model Normalization Adapter
- **Category:** Unit
- **Precondition:** `normalizeCategory` adapter loaded.
- **Test Steps:**
  1. Pass PascalCase backend DTO (`CategoryID`, `CategoryName`, `IsActive`).
  2. Normalize to camelCase mobile model (`categoryId`, `categoryName`, `isActive`).
- **Expected Result:** Maps properties correctly and provides sensible defaults for missing fields.
- **Status:** **PASSED**

### TC-010: Product Model Normalization Adapter
- **Category:** Unit
- **Precondition:** `normalizeProduct` adapter loaded.
- **Test Steps:**
  1. Pass backend product object with `StockQuantity`, `Price`, `DiscountPrice`.
  2. Verify calculation of `inStock` boolean, discount percentage, and fallback image URL.
- **Expected Result:** Accurately normalizes data with zero runtime exceptions.
- **Status:** **PASSED**

### TC-011: Store Master Normalization Adapter
- **Category:** Unit
- **Precondition:** `normalizeStore` adapter loaded.
- **Test Steps:**
  1. Test active store with operational hours and lat/long coordinates.
  2. Verify delivery radius and operational status flag mapping.
- **Expected Result:** Returns structured store model.
- **Status:** **PASSED**

### TC-012: Special Offer Banner Normalization
- **Category:** Unit
- **Precondition:** `normalizeOffer` adapter loaded.
- **Test Steps:**
  1. Test banner object with discount percentage, title, valid dates.
  2. Verify active date window check (`validFrom <= now <= validTo`).
- **Expected Result:** Filters out expired offers.
- **Status:** **PASSED**

### TC-013: Order Status Enum & Color Mapping
- **Category:** Unit
- **Precondition:** `getOrderStatusBadge` utility loaded.
- **Test Steps:**
  1. Map status `Placed` -> Info badge.
  2. Map status `Delivered` -> Success badge (Green).
  3. Map status `Cancelled` -> Danger badge (Red).
- **Expected Result:** Correct localized labels and color tokens.
- **Status:** **PASSED**

### TC-014: Razorpay Key Prefix Security Guard
- **Category:** Unit / Security
- **Precondition:** Security check in test suite.
- **Test Steps:**
  1. Inspect Razorpay key configuration used by client.
  2. Verify key starts strictly with `rzp_test_`.
  3. Assert key never starts with `rzp_live_`.
- **Expected Result:** Passes security guard; live keys prohibited.
- **Status:** **PASSED**

### TC-015: Storage Error Sanitizer & Fallback
- **Category:** Unit
- **Precondition:** Storage helpers loaded.
- **Test Steps:**
  1. Simulate `SecureStore.getItemAsync` throwing quota/permission error.
  2. Call wrapped getter.
- **Expected Result:** Catches error safely, logs warning, returns `null` instead of crashing.
- **Status:** **PASSED**

---

## 2. Dynamic Pricing, Fees & Cart Calculations (TC-016 to TC-030)

### TC-016: Cart Subtotal Calculation
- **Category:** Pricing
- **Test Steps:** Add Item A (qty 2 @ ₹150) + Item B (qty 3 @ ₹200). Subtotal = ₹900.
- **Expected Result:** Accurate sum.
- **Status:** **PASSED**

### TC-017: Dynamic Delivery Fee — Below Threshold
- **Category:** Pricing
- **Test Steps:** Store delivery fee = ₹40 for orders under ₹500. Order subtotal = ₹350.
- **Expected Result:** Delivery fee = ₹40.
- **Status:** **PASSED**

### TC-018: Free Delivery Threshold Qualification
- **Category:** Pricing
- **Test Steps:** Free delivery threshold = ₹500. Order subtotal = ₹550.
- **Expected Result:** Delivery fee = ₹0.
- **Status:** **PASSED**

### TC-019: Fixed Platform Fee Application
- **Category:** Pricing
- **Test Steps:** Store platform fee = ₹5. Cart subtotal = ₹600.
- **Expected Result:** Platform fee = ₹5 added to bill total.
- **Status:** **PASSED**

### TC-020: Percentage Coupon Discount (OCT786 - 10%)
- **Category:** Pricing / Coupon
- **Test Steps:** Subtotal = ₹1,458. Apply coupon `OCT786` (10% discount).
- **Expected Result:** Discount = ₹145.80; Grand Total = ₹1,312.20.
- **Status:** **PASSED**

### TC-021: Fixed Value Coupon Discount
- **Category:** Pricing / Coupon
- **Test Steps:** Subtotal = ₹800. Apply coupon `FLAT50` (₹50 discount).
- **Expected Result:** Discount = ₹50.00; Grand Total = ₹750.00.
- **Status:** **PASSED**

### TC-022: Maximum Coupon Discount Cap
- **Category:** Pricing / Coupon
- **Test Steps:** Coupon 20% with max discount cap ₹100. Subtotal = ₹1,000 (calculated 20% = ₹200).
- **Expected Result:** Discount capped at ₹100.00.
- **Status:** **PASSED**

### TC-023: Minimum Cart Value for Coupon Eligibility
- **Category:** Pricing / Coupon
- **Test Steps:** Coupon requires minimum subtotal ₹500. Cart subtotal = ₹450.
- **Expected Result:** Coupon rejected with validation message.
- **Status:** **PASSED**

### TC-024: Expired Coupon Code Validation
- **Category:** Pricing / Coupon
- **Test Steps:** Attempt applying coupon with `expiryDate < now`.
- **Expected Result:** Rejected by validation rules.
- **Status:** **PASSED**

### TC-025: Grand Total Multi-Fee Summation
- **Category:** Pricing
- **Test Steps:** Subtotal ₹1,458 − Discount ₹145.80 + Delivery ₹0 + Platform ₹5.
- **Expected Result:** Authoritative Grand Total = ₹1,317.20.
- **Status:** **PASSED**

### TC-026: Paise Currency Conversion for Razorpay
- **Category:** Pricing / Gateway
- **Test Steps:** Grand Total = ₹1,312.20. Convert to integer paise for Razorpay.
- **Expected Result:** `Math.round(1312.20 * 100) = 131220` paise.
- **Status:** **PASSED**

### TC-027: Stock Boundary Enforcement (Max Available)
- **Category:** Cart / Stock
- **Test Steps:** Product has stock = 5. Current cart qty = 5. Attempt incrementing.
- **Expected Result:** Increment blocked; error alert displayed.
- **Status:** **PASSED**

### TC-028: Stock Boundary Enforcement (Min Quantity)
- **Category:** Cart / Stock
- **Test Steps:** Product cart qty = 1. User taps decrement `-`.
- **Expected Result:** Decrements to 0 and removes item from cart.
- **Status:** **PASSED**

### TC-029: Mutex Concurrency on Rapid Add/Subtract
- **Category:** Cart / Concurrency
- **Test Steps:** Fire 5 rapid concurrent quantity increments within 100ms.
- **Expected Result:** Mutex queues updates sequentially; final quantity equals exactly initial + 5 without lost updates.
- **Status:** **PASSED**

### TC-030: Store Isolation Cart Clearance Rule
- **Category:** Cart / Multi-Store
- **Test Steps:** User switches from Store 1 to Store 2 with items in cart.
- **Expected Result:** Prompts user or automatically flushes Store 1 items to prevent cross-store fulfillment error.
- **Status:** **PASSED**

---

## 3. React Native Components & UI State (TC-031 to TC-055)

### TC-031: ProductGrid Rendering with Multi-Column Layout
- **Category:** Component
- **Expected Result:** Renders items with 2 columns, proper spacing, and keys.
- **Status:** **PASSED**

### TC-032: ProductGrid Empty State Display
- **Category:** Component
- **Expected Result:** Shows empty icon, clear message, and refresh button when items = [].
- **Status:** **PASSED**

### TC-033: ProductGrid Loading Spinner
- **Category:** Component
- **Expected Result:** Shows activity indicator while `isLoading = true`.
- **Status:** **PASSED**

### TC-034: ProductCard Out-of-Stock Badge
- **Category:** Component
- **Expected Result:** Disables `Add to Cart` button and shows `Out of Stock` badge when `stockQuantity === 0`.
- **Status:** **PASSED**

### TC-035: ProductCard Discount Percentage Badge
- **Category:** Component
- **Expected Result:** Renders `15% OFF` badge when regular price = ₹100 and discount price = ₹85.
- **Status:** **PASSED**

### TC-036: ProductCard Direct Quantity Selector
- **Category:** Component
- **Expected Result:** Replaces `Add` button with `[- 1 +]` counter when item is already in cart.
- **Status:** **PASSED**

### TC-037: CartItemRow Title, Unit, and Price Rendering
- **Category:** Component
- **Expected Result:** Displays product name, pack unit (`1 kg`), unit price, and total row price.
- **Status:** **PASSED**

### TC-038: CartItemRow Quantity Increment Callback
- **Category:** Component
- **Expected Result:** Triggers `onIncrement(item)` when `+` button is pressed.
- **Status:** **PASSED**

### TC-039: CartItemRow Quantity Decrement Callback
- **Category:** Component
- **Expected Result:** Triggers `onDecrement(item)` when `-` button is pressed.
- **Status:** **PASSED**

### TC-040: CartItemRow Remove Item Action
- **Category:** Component
- **Expected Result:** Triggers `onRemove(item)` when delete icon is pressed.
- **Status:** **PASSED**

### TC-041: CheckoutModal Delivery Address Guard
- **Category:** Component
- **Expected Result:** Disables `Proceed to Pay` button when no address is selected.
- **Status:** **PASSED**

### TC-042: CheckoutModal Payment Method Toggle
- **Category:** Component
- **Expected Result:** Switching between `Online (Razorpay)` and `Cash on Delivery` updates UI and action handlers.
- **Status:** **PASSED**

### TC-043: CheckoutModal Bill Breakdown Rendering
- **Category:** Component
- **Expected Result:** Correctly renders Subtotal, Discount, Delivery Fee, Platform Fee, and Grand Total.
- **Status:** **PASSED**

### TC-044: Responsive Special Offers — Exactly 1 Offer
- **Category:** Component / Responsive
- **Expected Result:** Renders as full-width banner card without unused horizontal carousel space.
- **Status:** **PASSED**

### TC-045: Responsive Special Offers — Multiple Offers
- **Category:** Component / Responsive
- **Expected Result:** Renders horizontal swipeable carousel with preview of next card.
- **Status:** **PASSED**

### TC-046: Responsive Special Offers — Zero Offers
- **Category:** Component / Responsive
- **Expected Result:** Hides banner section completely without rendering empty container.
- **Status:** **PASSED**

### TC-047 to TC-055: Navigation & Transition Tests
- **Category:** Component / Navigation
- **Expected Result:** Seamless screen transitions and safe back-stack unwinding.
- **Status:** **PASSED**

---

## 4. Backend API Contract Integration (TC-056 to TC-080)

### TC-056: Send OTP Endpoint Contract (`POST /api/Customer/send-otp`)
- **Status:** **PASSED**

### TC-057: Verify OTP & Issue Token (`POST /api/Customer/verify-otp`)
- **Status:** **PASSED**

### TC-058: Customer Profile Retrieval (`GET /api/Customer/profile`)
- **Status:** **PASSED**

### TC-059: Customer Address Book Retrieval (`GET /api/CustomerAddressMaster`)
- **Status:** **PASSED**

### TC-060: Create Customer Address (`POST /api/CustomerAddressMaster`)
- **Status:** **PASSED**

### TC-061: Update Customer Address (`PUT /api/CustomerAddressMaster`)
- **Status:** **PASSED**

### TC-062: Delete Customer Address (`DELETE /api/CustomerAddressMaster/{id}`)
- **Status:** **PASSED**

### TC-063: Active Stores Catalog (`GET /api/Stores`)
- **Status:** **PASSED**

### TC-064: Store Pricing & Delivery Configuration (`GET /api/stores/{id}/pricing-config`)
- **Status:** **PASSED**

### TC-065: Categories Scoped to Store (`GET /api/Categories?storeId={id}`)
- **Status:** **PASSED**

### TC-066: Products Scoped to Store (`GET /api/Products?storeId={id}`)
- **Status:** **PASSED**

### TC-067: Get Cart Master & Items (`GET /api/CartMaster?customerId={id}&storeId={id}`)
- **Status:** **PASSED**

### TC-068: Create Cart Master (`POST /api/CartMaster`)
- **Status:** **PASSED**

### TC-069: Batch Update Cart Items (`PUT /api/CartItemMaster`)
- **Status:** **PASSED**

### TC-070: Clear Cart Items (`DELETE /api/CartItemMaster/{cartId}`)
- **Status:** **PASSED**

### TC-071: Payment-First Checkout Session (`POST /api/payments/checkout-session`)
- **Status:** **PASSED**

### TC-072: Cash on Delivery Atomic Order (`POST /api/OrderMaster/checkout`)
- **Status:** **PASSED**

### TC-073: Online Payment Verification (`POST /api/payments/verify-checkout`)
- **Status:** **PASSED**

### TC-074: Customer Order History (`GET /api/OrderMaster/customer/{id}`)
- **Status:** **PASSED**

### TC-075: Order Details & Item Breakdown (`GET /api/OrderMaster/{id}`)
- **Status:** **PASSED**

### TC-076: Order Timeline Tracking (`GET /api/OrderMaster/{id}/tracking`)
- **Status:** **PASSED**

### TC-077: 401 Session Expiry Interceptor & Auto-Logout
- **Status:** **PASSED**

### TC-078: Network Timeout & Retry Handling
- **Status:** **PASSED**

### TC-079: Server Error (500) Shielding
- **Status:** **PASSED**

### TC-080: Authoritative Price Mismatch Rejection
- **Status:** **PASSED**

---

## 5. End-to-End Customer Journeys (TC-081 to TC-100)

| Journey ID | Title | Coverage | Automated Status |
| :--- | :--- | :--- | :--- |
| **TC-081** | Journey 1: App Launch & Route Resolution | Splash -> Onboarding / Login / MainTabs | **PASSED** |
| **TC-082** | Journey 2: Authentication & OTP Verification | Phone input -> OTP verify -> Token persist | **PASSED** |
| **TC-083** | Journey 3: Store Selection & Auto-Select Rule | Single store auto-nav / Multi-store list | **PASSED** |
| **TC-084** | Journey 4: Catalog Browsing & Search | Categories -> Search filter -> Product details | **PASSED** |
| **TC-085** | Journey 5: Cart Concurrency & Stock Limits | Add items -> Rapid + / - -> Mutex safety | **PASSED** |
| **TC-086** | Journey 6: Checkout Guard Validation | Block checkout if no store/address/items | **PASSED** |
| **TC-087** | Journey 7: Cash on Delivery Checkout | Select COD -> Atomic order checkout | **PASSED** |
| **TC-088** | Journey 8: Payment-First Razorpay Flow | Create session -> Verify signature -> Confirm | **PASSED** |
| **TC-089** | Journey 9: Order History & Tracking | View past orders -> Itemized receipt -> Timeline | **PASSED** |
| **TC-090** | Journey 10: Session Expiry & Fault Tolerance | Expired JWT -> 401 interceptor -> Clean logout | **PASSED** |
| **TC-091 to TC-100** | Multi-Store & Address Switching | Address CRUD -> Store auto-switch -> Cart sync | **PASSED** |

---

## 6. Native Mobile UI Automation (Maestro Flows) (TC-101 to TC-115)

| Flow ID | File | Target Scenario | Automated Status |
| :--- | :--- | :--- | :--- |
| **TC-101** | `01_app_launch.yaml` | App launch, splash render, route resolution | BLOCKED (No attached device) |
| **TC-102** | `02_authentication.yaml` | Phone entry, OTP fill, login button tap | BLOCKED (No attached device) |
| **TC-103** | `03_store_selection.yaml` | Store list render, store card tap, navigation | BLOCKED (No attached device) |
| **TC-104** | `04_product_browsing.yaml` | Category carousel scroll, search input, details tap | BLOCKED (No attached device) |
| **TC-105** | `05_cart_management.yaml` | Add to cart, quantity increment, bill view | BLOCKED (No attached device) |
| **TC-106** | `06_checkout_validation.yaml` | Address picker, delivery instructions, guards | BLOCKED (No attached device) |
| **TC-107** | `07_cash_on_delivery.yaml` | Select COD, place order, success screen | BLOCKED (No attached device) |
| **TC-108** | `08_razorpay_payment.yaml` | Razorpay modal open, mock success callback | BLOCKED (No attached device) |
| **TC-109** | `09_order_history_tracking.yaml` | Orders tab, order card tap, tracking timeline | BLOCKED (No attached device) |
| **TC-110** | `10_session_and_network_faults.yaml` | Airplane mode toggle, offline banner, retry | BLOCKED (No attached device) |
| **TC-111 to TC-115** | Component Gestures | Carousel swipe, modal dismiss, pull-to-refresh | BLOCKED (No attached device) |
