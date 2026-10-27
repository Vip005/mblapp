# FreshMart Mobile App — Test Coverage Matrix

**Date:** October 25, 2026  
**Auditor:** Senior React Native QA Automation Engineer & Mobile Test Architect  
**Scope:** 18 Core Customer Journeys & ASP.NET Core API Contract Mapping  

---

## 1. 18 Core Customer Journeys Matrix

| # | Customer Journey | Feature in App? | Test Exists? | Test Executes? | Implementation Tested | Test Result | Missing Coverage / Uncovered Scenarios |
| :-: | :--- | :---: | :---: | :---: | :--- | :---: | :--- |
| **1** | **App Launch & Route Resolution** | Yes (`App.tsx`, `determineNextAppRoute.ts`) | Yes (`customerJourneys.test.ts` Journey 1, `storeSelectionFlow.test.ts`) | Yes | **Real** `determineNextAppRoute()` with in-memory storage mock | **PASSED** | Hardware back-button navigation, cold-start deep linking, splash screen dismissal delay. |
| **2** | **Mobile Number Login & OTP** | Yes (`LoginScreen.tsx`, `OtpScreen.tsx`, `authService.ts`) | Yes (`unitValidationAndAuth.test.ts`, `apiContractIntegration.test.ts`) | Yes | **Real** validator & authService with mocked `apiClient.post` | **PASSED** | OTP resend 30s countdown timer, auto-read SMS permissions, 429 rate limiting on repeated OTP requests. |
| **3** | **Token Persistence & Session Restore** | Yes (`AuthContext.tsx`, `storage.ts`, `SecureStore`) | Yes (`customerJourneys.test.ts`, `unitValidationAndAuth.test.ts`) | Yes | **Real** `storage.ts` with in-memory SecureStore polyfill | **PASSED** | Hardware Keystore/Keychain access failure, biometric authentication prompt, secure storage quota errors. |
| **4** | **Session Expiration & 401 Interception** | Yes (`apiClient.ts` interceptor, `isTokenExpired`) | Yes (`unitValidationAndAuth.test.ts`, `tokenRefreshConcurrency.test.ts`, `customerJourneys.test.ts` Journey 10) | Yes | **Real** `isTokenExpired()` (5-min buffer) & single-flight refresh mutex | **PASSED** | Tested 5 parallel 401 requests with single-flight mutex. Backend token reuse revocation verified. |
| **5** | **Store Selection & Catalog Loading** | Yes (`StoreSelectionScreen.tsx`, `storeService.ts`) | Yes (`storeSelectionFlow.test.ts`, `customerJourneys.test.ts` Journey 3) | Yes | **Real** `storeService.ts` with mocked `apiClient.get` | **PASSED** | Geolocation permission denial, distance radius calculation, confirmation dialog when switching stores with active cart. |
| **6** | **Category & Product Listing** | Yes (`CategoryScreen.tsx`, `ProductListScreen.tsx`, `categoryService.ts`, `productService.ts`) | Yes (`apiContractIntegration.test.ts` Group 4, `customerJourneys.test.ts` Journey 4) | Yes | **Real** adapters & services with mocked network | **PASSED** | Infinite scroll pagination (`pageNumber`, `pageSize`), subcategory drill-down accordion, sorting by price/rating. |
| **7** | **Product Details & Quantity Selector** | Yes (`ProductDetailScreen.tsx`, `QuantitySelector.tsx`) | Yes (`productDetailsCartQuantity.test.ts`) | Yes | **Real** `src/utils/productDetailsHelper.ts` extracted from `ProductDetailsScreen.tsx` | **PASSED** | Real component layout rendering on native Android device (pending Maestro unblock). |
| **8** | **Cart Addition, Removal & Quantity Updates** | Yes (`CartScreen.tsx`, `cartService.ts`, `CartContext.tsx`) | Yes (`addToCartResilience.test.ts`, `pricingAndCheckout.test.ts`, `offersAndProductCardLayout.test.ts`) | Yes | **Real** `cartService` normalization and Set-based cart item addition mutex | **PASSED** | Offline cart synchronization conflict resolution (when local cached cart differs from server cart upon reconnect). |
| **9** | **Stock Availability & Quantity Limits** | Yes (`ProductCard.tsx`, `ProductDetailScreen.tsx`, `cartService.ts`) | Yes (`addToCartResilience.test.ts`, `checkoutStockExhaustion.test.ts`, `customerJourneys.test.ts` Journey 5) | Yes | **Real** `cartService` validation rules & 7 stock exhaustion edge cases | **PASSED** | Verified: pre-checkout exhaustion, post-payment depletion (`STOCK_DEPLETED_POST_PAYMENT`), and duplicate verification idempotency. |
| **10** | **Address Creation & Selection** | Yes (`AddressManageScreen.tsx`, `addressService.ts`) | Yes (`apiContractIntegration.test.ts` Group 2) | Yes | **Real** `addressService` with mocked network | **PASSED** | Geocoding lat/long autocomplete, address validation on missing pincode or invalid phone, default address toggle. |
| **11** | **Delivery Fee & Platform Fee Calculations** | Yes (`cartService.calculateSummary`, `pricingAndCheckout.test.ts`) | Yes (`pricingAndCheckout.test.ts` Tests 1-4) | Yes | **Real** `cartService.calculateSummary()` | **PASSED** | Store-specific surge pricing, late-night delivery surcharges, multi-tier delivery fees (e.g., 0-2km vs 2-5km). |
| **12** | **Coupon Validation & Discount Calculations** | Yes (`couponService.ts`, `cartService.ts`, `CheckoutModal.tsx`) | Yes (`pricingAndCheckout.test.ts` Tests 5-7) | Yes | **Real** `cartService.calculateSummary()` | **PASSED** | Category-restricted coupons, first-time user only coupons, coupon usage limit exhaustion. |
| **13** | **COD Checkout & Order Creation** | Yes (`CheckoutScreen.tsx`, `orderService.ts`, `/api/OrderMaster/checkout`) | Yes (`apiContractIntegration.test.ts` Group 7, `customerJourneys.test.ts` Journey 7) | Yes | **Real** `orderService` with mocked network | **PASSED** | Maximum order value threshold for Cash on Delivery, OTP confirmation on high-value COD orders. |
| **14** | **Razorpay Checkout-Session Creation** | Yes (`paymentService.createCheckoutSession`, `CheckoutScreen.tsx`) | Yes (`paymentFirstCheckout.test.ts`, `apiContractIntegration.test.ts` Group 6, `checkoutStockExhaustion.test.ts` Scenario 7) | Yes | **Real** `paymentService` with mocked network | **PASSED** | Server authoritative pricing rejection (400) when client grand total diverges from authoritative total (verified in Scenario 7). |
| **15** | **Razorpay Payment Verification & Failure** | Yes (`paymentService.verifyCheckoutPayment`, `recordPaymentFailure`, `RazorpayCheckoutModal.tsx`) | Yes (`paymentFirstCheckout.test.ts`, `razorpayIntegration.test.ts`, `checkoutStockExhaustion.test.ts`) | Yes | **Real** `paymentService` with mocked network and mocked native SDK | **PASSED** | User closing WebView modal before gateway completes, webhook arriving before client verify call completes. |
| **16** | **Order History & Order Details** | Yes (`OrdersScreen.tsx`, `OrderDetailScreen.tsx`, `orderService.ts`) | Yes (`apiContractIntegration.test.ts` Group 9, `customerJourneys.test.ts` Journey 9) | Yes | **Real** `orderService` and `mapOrder` adapter with mocked network | **PASSED** | Customer order cancellation within grace period, reorder action (copying previous items to current cart). |
| **17** | **Order Status Tracking** | Yes (`OrderTrackingScreen.tsx`, `orderHub.ts` SignalR, `adapters.ts`) | Yes (`unitValidationAndAuth.test.ts` Group 6) | Yes | **Real** `getUpdatedTrackingSteps` and `mapBackendStatusToOrderStatus` | **PASSED** | Real-time SignalR `orderHub` connection lifecycle (connect, reconnect, message parsing, group joining). |
| **18** | **Network Errors, Retries & API Failures** | Yes (`apiClient.ts`, `apiError.ts`) | Yes (`globalErrorHandling.test.ts`, `checkoutDatabaseErrorDiagnostics.test.ts`, `customerJourneys.test.ts` Journey 10) | Yes | **Real** `apiClient.ts` error extraction and `apiError.ts` | **PASSED** | Automatic exponential backoff retry in `apiClient.ts` on network drops. |

---

## 2. API Contract Verification Matrix

Comparison of mobile API services (`src/services/api/`) against ASP.NET Core controllers (`GroceryApp.API/Controllers/`):

| Mobile API Service | Mobile Method | HTTP | Endpoint URL | Backend Controller Action | Request DTO Match? | Response DTO Match? | Scoping & Auth Header | Contract Verdict |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| `authService.ts` | `login` | `POST` | `/api/CustomerMaster/send-otp` | `CustomerMasterController.SendOtp` | `{ phoneNumber }` -> `CustomerOtpSendDto` | `{ otp, message }` | Anonymous | **MATCH** |
| `authService.ts` | `verifyOtp` | `POST` | `/api/CustomerMaster/verify-otp` | `CustomerMasterController.VerifyOtp` | `{ phoneNumber, otp }` -> `CustomerOtpVerificationDto` | `{ token, refreshToken, customerId }` | Anonymous | **MATCH** |
| `authService.ts` | `refresh` | `POST` | `/api/CustomerMaster/refresh` | `CustomerMasterController.Refresh` | `{ refreshToken }` -> `CustomerRefreshRequestDto` | `{ token, refreshToken }` | Anonymous | **MATCH** |
| `addressService.ts` | `getAddresses` | `GET` | `/api/CustomerAddressMaster` | `CustomerAddressMasterController.GetAll` | `[FromQuery] int? customerId, storeId` | `List<CustomerAddressMasterDto>` | Bearer JWT; customer-scoped | **MATCH** |
| `addressService.ts` | `createAddress` | `POST` | `/api/CustomerAddressMaster` | `CustomerAddressMasterController.Create` | `CustomerAddressMasterDto` | `CustomerAddressMasterDto` | Bearer JWT; customer-scoped | **MATCH** |
| `addressService.ts` | `updateAddress` | `PUT` | `/api/CustomerAddressMaster` | `CustomerAddressMasterController.Update` | `CustomerAddressMasterDto` | `CustomerAddressMasterDto` | Bearer JWT; customer-scoped | **MATCH** |
| `addressService.ts` | `deleteAddress` | `DELETE` | `/api/CustomerAddressMaster/{id}` | `CustomerAddressMasterController.Delete` | `id: long` route parameter | `{ isSuccess, message }` | Bearer JWT; customer-scoped | **MATCH** |
| `storeService.ts` | `getStores` | `GET` | `/api/Stores` | `StoresController.GetAll` | None | `List<StoreDto>` | Anonymous | **MATCH** |
| `storeService.ts` | `getStorePricingConfig` | `GET` | `/api/stores/{id}/pricing-config` | `StorePricingController.GetByStoreId` | `id: int` route parameter | `StorePricingConfigDto` | Anonymous | **MATCH** |
| `categoryService.ts` | `getCategories` | `GET` | `/api/Categories?storeId={id}` | `CategoriesController.GetAll` | `[FromQuery] int? storeId` | `List<CategoryDto>` | Anonymous | **MATCH** |
| `productService.ts` | `getProducts` | `GET` | `/api/Products?storeId={id}` | `ProductsController.GetAll` | `[FromQuery] int? storeId` | `List<ProductDto>` | Anonymous | **MATCH** |
| `cartService.ts` | `getCartMasters` | `GET` | `/api/CartMaster?customerId={c}&storeId={s}` | `CartMasterController.GetAll` | `[FromQuery] int? customerId, storeId` | `List<BackendCartMaster>` | Bearer JWT; customer-scoped | **MATCH** |
| `cartService.ts` | `updateCartItems` | `PUT` | `/api/CartItemMaster` | `CartItemMasterController.BatchUpdate` | `List<BackendCartItemMaster>` | `List<BackendCartItemMaster>` | Bearer JWT; customer-scoped | **MATCH** |
| `paymentService.ts` | `getPaymentConfig` | `GET` | `/api/payments/config?storeId={s}&gateway=Razorpay` | `PaymentsController.GetPublicConfig` | `[FromQuery] int? storeId, string gateway` | `PaymentPublicConfigDto` | Anonymous (No secrets exposed) | **MATCH** |
| `paymentService.ts` | `createCheckoutSession`| `POST` | `/api/payments/checkout-session` | `PaymentsController.CreateCheckoutSession` | `CheckoutSessionCreateRequestDto` | `CheckoutSessionCreateResponseDto` | Bearer JWT; customer-scoped | **MATCH** |
| `paymentService.ts` | `verifyCheckoutPayment`| `POST` | `/api/payments/verify-checkout` | `PaymentsController.VerifyCheckoutPayment` | `CheckoutPaymentVerifyRequestDto` | `CheckoutPaymentVerifyResponseDto` | Bearer JWT; customer-scoped | **MATCH** |
| `paymentService.ts` | `recordPaymentFailure` | `POST` | `/api/payments/fail` | `PaymentsController.RecordFailure` | `RecordPaymentFailureRequestDto` | `{ isSuccess, statusCode }` | Bearer JWT; customer-scoped | **MATCH** |
| `orderService.ts` | `checkout` | `POST` | `/api/OrderMaster/checkout` | `OrderMasterController.Checkout` | `OrderCheckoutDto { order, items }` | `OrderCheckoutResultDto` | Bearer JWT; customer-scoped | **MATCH** |
| `orderService.ts` | `getCustomerOrders` | `GET` | `/api/OrderMaster?customerId={id}` | `OrderMasterController.GetAll` | `[FromQuery] int? customerId` | `List<OrderMasterDto>` | Bearer JWT; customer-scoped | **MATCH** |
| `orderService.ts` | `getOrderById` | `GET` | `/api/OrderMaster/{id}` | `OrderMasterController.GetById` | `id: int` route parameter | `OrderMasterDetailsDto` | Bearer JWT; customer-scoped | **MATCH** |

---

## 3. Testing Layer Distribution Summary

| Testing Layer | Number of Features Covered | Genuinely Verified | Mocked / Simulated | Blocked / Untested |
| :--- | :---: | :---: | :---: | :---: |
| **Unit Layer (Validators, Formatters, Adapters, Helpers)** | 8 | 8 (100%) | 0 (0%) | 0 (0%) |
| **Pricing & Business Rules Layer** | 3 | 3 (100%) | 0 (0%) | 0 (0%) |
| **Concurrency & Mutex Layer** | 2 | 2 (100%) | 0 (0%) | 0 (0%) |
| **Checkout Stock Exhaustion & Integrity Layer** | 7 scenarios | 7 (100%) | 0 (0%) | 0 (0%) |
| **API Contract & DTO Layer** | 20 endpoints | 20 DTOs matched | 20 (100% Mock Transport) | 0 live HTTP calls |
| **Customer Journey State Machines** | 10 journeys | 10 state flows | 10 (In-memory storage) | 0 UI component renders |
| **Native Mobile UI (Maestro E2E)** | 10 flows | 0 (0%) | 0 (0%) | 10 (100% BLOCKED on Device) |
