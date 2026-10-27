# FreshMart Mobile App — Test Execution Results

**Execution Timestamp:** October 25, 2026, 17:45:12 IST  
**Environment:** Windows 11 x64, Node.js v24.19.0, Expo SDK 58.0.19, React Native 0.88.0, TypeScript 6.0.3, .NET 8.0.402  
**Mobile Repository:** `D:\Sheik\mblApp\GroceriesUIApp`  
**Backend API Repository:** `D:\Sheik\Grocery\HapGroceriesAPI\GroceriesAPI`  

---

## 1. Summary of Commands Executed

| # | Command | Working Directory | Exit Code | Elapsed Time | Verdict |
| :-: | :--- | :--- | :-: | :-: | :--- |
| 1 | `npm test` | `D:\Sheik\mblApp\GroceriesUIApp` | `0` | 45.55s | **15 Passed, 0 Failed, 1 Blocked** |
| 2 | `npx tsc --noEmit` | `D:\Sheik\mblApp\GroceriesUIApp` | `0` | 18.24s | **0 Type Errors (Clean)** |
| 3 | `adb devices` | `D:\Sheik\mblApp\GroceriesUIApp` | `0` | 0.05s | **0 Devices Attached (BLOCKED)** |
| 4 | `dotnet test GroceryApp.Tests.csproj` | `D:\Sheik\Grocery\HapGroceriesAPI\GroceriesAPI` | `0` | 24.12s | **388 Passed, 0 Failed (Clean)** |

---

## 2. Detailed Execution Log: `npm test`

```
> groceriesuiapp@1.0.0 test
> npx tsx --import ./src/test/setupMock.ts ./src/test/runAllTests.ts

======================================================================
  FreshMart Mobile App — Automated Testing Execution Suite
  Technology: Expo React Native 0.88, React 19, TypeScript 6.0
======================================================================

Executing [TS-01] Unit: Validation, JWT & Formatter Utilities... [PASSED] (2743ms)
Executing [TS-02] Unit: Dynamic Pricing, Taxes & Platform Fees... [PASSED] (3206ms)
Executing [TS-03] Unit: Global Error Shielding & HTML Sanitization... [PASSED] (3010ms)
Executing [TS-04] Component: Store Selection Flow & Persistence... [PASSED] (2682ms)
Executing [TS-05] Component: Special Offers Responsive Layout... [PASSED] (3064ms)
Executing [TS-06] Component: Product Card & Quantity Selector... [PASSED] (3082ms)
Executing [TS-07] Component: Add to Cart Resilience & Concurrency Mutex... [PASSED] (4646ms)
Executing [TS-08] Component: Razorpay Gateway & Key Mode Security... [PASSED] (2386ms)
Executing [TS-09] API: Payment-First Checkout Session & Verifications... [PASSED] (4116ms)
Executing [TS-10] API: Full Backend Contracts (Auth, Cart, Store, Catalog, Orders)... [PASSED] (4469ms)
Executing [TS-11] E2E: All 10 Core Customer Journeys (State Machine)... [PASSED] (4135ms)
Executing [TS-12] Component: Offer Helpers & Product Card Mutex Regression... [PASSED] (2023ms)
Executing [TS-13] API: Checkout Database Error Diagnostics & Extraction... [PASSED] (1980ms)
Executing [TS-14] Auth: Token Refresh Single-Flight Mutex & Race Condition Prevention... [PASSED] (2056ms)
Executing [TS-15] API: Checkout Stock Exhaustion & Gateway Depletion Integrity... [PASSED] (1953ms)
Executing [TS-16] Mobile UI: Native Maestro Flow Automation (Journeys 1-10)... [BLOCKED]

======================================================================
  AUTOMATED TEST EXECUTION SUMMARY REPORT
======================================================================
Total Test Suites   : 16
Passed Suites       : 15
Failed Suites       : 0
Blocked Suites      : 1 (Native Emulator / Device unavailable)
Skipped Suites      : 0
Total Execution Time: 45.55s
======================================================================
```

---

## 3. Suite-by-Suite Breakdown & Realism Analysis

| Suite ID | File Name | Category | Duration | Status | Implementation Tested | Test Realism Notes |
| :---: | :--- | :--- | :-: | :-: | :--- | :--- |
| **TS-01** | `unitValidationAndAuth.test.ts` | Unit & Security | 2,743ms | **PASSED** | Real `src/utils/` & `src/services/api/adapters.ts` | **GENUINE**: Tests real phone/email/pincode validators, JWT decode, expiry buffer, image URL CDN resolvers, and Razorpay `rzp_test_` prefix checks. |
| **TS-02** | `pricingAndCheckout.test.ts` | Unit / Pricing | 3,206ms | **PASSED** | Real `cartService.calculateSummary` | **GENUINE**: Tests delivery fee rules (₹40 under ₹500, ₹0 at ₹500+), platform fees (₹5), percentage coupon (OCT786 10%), flat coupons, and paise conversion. |
| **TS-03** | `globalErrorHandling.test.ts` | Unit / Security | 3,010ms | **PASSED** | Real `src/utils/apiError.ts` | **GENUINE**: Tests HTML error response stripping, Azure outage detection, and safe human-readable translation. |
| **TS-04** | `storeSelectionFlow.test.ts` | Component / Logic | 2,682ms | **PASSED** | Real `storeService.ts` & `determineNextAppRoute` | **GENUINE LOGIC**: Tests single store auto-selection logic with in-memory storage mock and store persistence. |
| **TS-05** | `specialOffersResponsiveLayout.test.ts` | Component / Layout | 3,064ms | **PASSED** | Real `offerService.ts`, simulated layout | **GENUINE LOGIC**: Tests dynamic layout mode switching (1 offer vs multiple offers vs 0 offers). |
| **TS-06** | `productDetailsCartQuantity.test.ts` | Component / Logic | 3,082ms | **PASSED** | Real `src/utils/productDetailsHelper.ts` | **GENUINE**: Refactored to import real extracted helpers used directly by `ProductDetailsScreen.tsx`. Verifies quantity transitions, stock boundaries, and price formatting. |
| **TS-07** | `addToCartResilience.test.ts` | Component / Cart | 4,646ms | **PASSED** | Real `cartService.ts` normalization & batching | **GENUINE LOGIC**: Tests case-insensitive cart normalization (.NET PascalCase vs camelCase) and Mutex lock on rapid quantity additions. |
| **TS-08** | `razorpayIntegration.test.ts` | Component / Gateway | 2,386ms | **PASSED** | Real `paymentService.ts` & `razorpayGateway.ts` | **GENUINE LOGIC**: Tests key prefix enforcement (`rzp_test_`), native module presence detection (`isNativeRazorpayAvailable`), and parameter validation. |
| **TS-09** | `paymentFirstCheckout.test.ts` | API Contract | 4,116ms | **PASSED** | Real `paymentService.ts` with mocked network | **MOCKED TRANSPORT**: Tests client parameter validation and response unpacking against mocked `POST /api/payments/checkout-session`. |
| **TS-10** | `apiContractIntegration.test.ts` | API Contract | 4,469ms | **PASSED** | Real API services with mocked network | **MOCKED TRANSPORT**: Tests 10 service contracts against in-memory mock responses. No live HTTP traffic reaches ASP.NET Core backend. |
| **TS-11** | `customerJourneys.test.ts` | Customer Journey | 4,135ms | **PASSED** | Real route resolver & state progression | **SIMULATED STATE**: Simulates 10 user workflows programmatically via TypeScript. Does not render React Native UI components. |
| **TS-12** | `offersAndProductCardLayout.test.ts` | Component / Helpers | 2,023ms | **PASSED** | Real `src/utils/offerHelpers.ts` & Set Mutex | **GENUINE**: Verifies real offer card width calculations, discount highlights, and genuine Set-based item addition mutex. |
| **TS-13** | `checkoutDatabaseErrorDiagnostics.test.ts` | API Error Diagnostics | 1,980ms | **PASSED** | Real `apiClient.ts` error extraction | **GENUINE**: Verifies real error parser extracts `serverDetail`, `serverRootCause`, SQL error code 208, and validation dictionaries. |
| **TS-14** | `tokenRefreshConcurrency.test.ts` | Auth Concurrency | 2,056ms | **PASSED** | Real `apiClient.ts` single-flight mutex | **GENUINE**: Verifies 5 parallel 401s trigger only 1 refresh call, prevents refresh token rotation race condition, and handles revocation cleanly. |
| **TS-15** | `checkoutStockExhaustion.test.ts` | Checkout Integrity | 1,953ms | **PASSED** | Real `paymentService.ts` & checkout rules | **GENUINE**: Verifies 7 edge cases: pre-checkout exhaustion, post-payment stock depletion (`STOCK_DEPLETED_POST_PAYMENT`), gateway error, duplicate verification idempotency, and authoritative pricing tamper rejection. |
| **TS-16** | `.maestro/*.yaml` | Mobile UI (E2E) | 0ms | **BLOCKED** | Native UI on Android / iOS | **BLOCKED**: Requires connected Android emulator or physical device via ADB. |

---

## 4. Static Verification: `npx tsc --noEmit`

- **Command:** `npx tsc --noEmit`
- **Result:** Exited with code `0`.
- **Diagnostic Output:** None (clean compilation).
- **TypeScript Configuration:** `tsconfig.json` with `"strict": true` and `"types": ["node"]`.
- **Coverage:** Validates strict type correctness across all screens, navigation param lists, hooks, API services, DTOs, and test suites.

---

## 5. Device Verification: `adb devices`

- **Command:** `adb devices`
- **Output:**
  ```
  List of devices attached
  (empty)
  ```
- **Finding:** No Android Virtual Device (AVD) or physical handset is currently connected to ADB on this development machine.
- **Impact:** In strict accordance with QA standards, Suite TS-16 (`.maestro/*.yaml`) is reported as **BLOCKED**, rather than claiming an unexecuted test passed.
