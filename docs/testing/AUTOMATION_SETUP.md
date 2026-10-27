# FreshMart Mobile App — Test Automation Setup Guide

**Author:** Senior Mobile QA Architect & API Test Automation Engineer  
**Last Updated:** October 2026  
**Project:** FreshMart Grocery Mobile Application  
**Directory:** `D:\Sheik\mblApp\GroceriesUIApp`  

---

## 1. Prerequisites & Environment Requirements

Ensure the following runtimes and tools are installed and added to your system `PATH`:

| Requirement | Recommended Version | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` (Tested on `v24.19.0`) | `node -v` |
| **npm** | `>= 10.0.0` | `npm -v` |
| **Expo CLI** | Expo SDK 58 compatible | `npx expo --version` |
| **TypeScript** | `6.0.3` (installed locally) | `npx tsc -v` |
| **Android SDK / ADB** | API Level 34+ (Android 14+) | `adb version` |
| **Maestro CLI** | `>= 1.38.0` (for Native UI E2E) | `maestro --version` |
| **.NET SDK** | `8.0.x` (for backend verification) | `dotnet --version` |

---

## 2. Architecture of the Test Suite

The FreshMart testing architecture is designed to handle **React 19.3.0** and **Expo SDK 58** without depending on deprecated legacy test renderers or fragile native binary mocks.

```
GroceriesUIApp/
├── .maestro/                              # Maestro Native UI E2E Test Flows
│   ├── 01_app_launch.yaml
│   ├── 02_authentication.yaml
│   ├── 03_store_selection.yaml
│   ├── 04_product_browsing.yaml
│   ├── 05_cart_management.yaml
│   ├── 06_checkout_validation.yaml
│   ├── 07_cash_on_delivery.yaml
│   ├── 08_razorpay_payment.yaml
│   ├── 09_order_history_tracking.yaml
│   └── 10_session_and_network_faults.yaml
├── src/test/                              # Executable Automated Test Suites
│   ├── setupMock.ts                       # Stateful in-memory mocks (AsyncStorage, SecureStore, Platform)
│   ├── runAllTests.ts                     # Unified Test Runner Orchestrator
│   ├── unitValidationAndAuth.test.ts      # Unit validators, JWT, CDN resolvers, status adapters
│   ├── pricingAndCartCalculations.test.ts # Cart subtotal, taxes, delivery/platform fees, coupons
│   ├── componentProductGrid.test.ts       # ProductGrid, ProductList, render props
│   ├── componentProductCard.test.ts       # ProductCard badges, discounts, add-to-cart
│   ├── componentCartItemRow.test.ts       # Cart row quantity increment/decrement, subtotal
│   ├── componentCheckoutModal.test.ts     # Checkout guard validation, fee displays, COD trigger
│   ├── apiContractIntegration.test.ts     # 10 ASP.NET Core Web API contracts & endpoints
│   ├── customerJourneys.test.ts           # 10 End-to-end customer journey state machines
│   ├── storeSelectionLogic.test.ts        # Auto-selection logic for single vs multiple stores
│   ├── responsiveSpecialOffers.test.ts    # Responsive banner layout (single card vs carousel)
│   └── couponDiscountValidation.test.ts   # Authoritative coupon calculation & paise conversion
└── docs/testing/                          # Test Documentation Deliverables
```

### In-Memory Stateful Mocking (`src/test/setupMock.ts`)
Instead of static null-returning mocks, `setupMock.ts` implements in-memory `Map<string, string>` storage engines for:
- `@react-native-async-storage/async-storage`
- `expo-secure-store`
- `react-native` (Platform, Dimensions, NativeModules, StyleSheet)

This allows stateful persistence across authentication, store selection, and cart sessions within test runs.

---

## 3. Running Automated Tests

### 3.1 Unified Test Execution (Recommended)

Run all 12 test suites across unit, component, API contract, and customer journeys:

```bash
cd D:\Sheik\mblApp\GroceriesUIApp
npm test
```

This command executes `npx tsx --import ./src/test/setupMock.ts ./src/test/runAllTests.ts`.

Expected output:
```
================================================================================
   FRESHMART MOBILE APP - AUTOMATED TEST SUITE RUNNER
================================================================================
Running: Unit Validation, Formatters & Auth Tests (unitValidationAndAuth.test.ts)...
  -> PASSED (0.95s)
Running: Pricing, Fees & Cart Calculations Tests (pricingAndCartCalculations.test.ts)...
  -> PASSED (0.57s)
Running: ProductGrid Component Tests (componentProductGrid.test.ts)...
  -> PASSED (0.54s)
Running: ProductCard Component Tests (componentProductCard.test.ts)...
  -> PASSED (0.54s)
Running: CartItemRow Component Tests (componentCartItemRow.test.ts)...
  -> PASSED (0.53s)
Running: CheckoutModal Component Tests (componentCheckoutModal.test.ts)...
  -> PASSED (0.53s)
Running: API Contract & Integration Tests (apiContractIntegration.test.ts)...
  -> PASSED (0.58s)
Running: End-to-End Customer Journeys (customerJourneys.test.ts)...
  -> PASSED (0.57s)
Running: Store Selection Logic Tests (storeSelectionLogic.test.ts)...
  -> PASSED (0.54s)
Running: Responsive Special Offers Tests (responsiveSpecialOffers.test.ts)...
  -> PASSED (0.54s)
Running: Authoritative Coupon Validation Tests (couponDiscountValidation.test.ts)...
  -> PASSED (0.54s)
Running: Maestro Mobile UI Automation Flows (maestroFlows)...
  -> BLOCKED (0.01s)
     Reason: No active Android emulator or physical device detected via 'adb devices'.

================================================================================
                           TEST EXECUTION SUMMARY
================================================================================
  Total Test Suites:    12
  Suites Passed:        11 (100.0% of executable)
  Suites Failed:        0
  Suites Blocked:       1 (Maestro Native UI on device/emulator)
  Suites Skipped:       0
  Total Elapsed Time:   6.90s
================================================================================
```

### 3.2 Running a Single Test Suite

You can execute any individual test suite using `tsx`:

```bash
# Run API Contract Integration tests
npx tsx --import ./src/test/setupMock.ts ./src/test/apiContractIntegration.test.ts

# Run Customer Journey tests
npx tsx --import ./src/test/setupMock.ts ./src/test/customerJourneys.test.ts

# Run Pricing and Fee calculation tests
npx tsx --import ./src/test/setupMock.ts ./src/test/pricingAndCartCalculations.test.ts
```

### 3.3 TypeScript Static Type Verification

Verify zero compiler errors:

```bash
npx tsc --noEmit
```

---

## 4. Setting Up & Running Maestro Mobile UI Tests

Maestro automates native mobile gesture interactions, text input, and screen assertions on an emulator or physical device.

### 4.1 Install Maestro CLI

- **Windows (via PowerShell):**
  ```powershell
  # Download and install Maestro
  Invoke-WebRequest -Uri https://get.maestro.mobile.dev -UseBasicParsing | iex
  ```
- **macOS / Linux:**
  ```bash
  curl -Ls "https://get.maestro.mobile.dev" | bash
  ```

### 4.2 Start Android Emulator or Connect Physical Device

1. List available Android Virtual Devices (AVDs):
   ```bash
   emulator -list-avds
   ```
2. Start an emulator:
   ```bash
   emulator -avd Pixel_7_API_34
   ```
3. Verify ADB detection:
   ```bash
   adb devices
   # Expected output:
   # List of devices attached
   # emulator-5554   device
   ```

### 4.3 Build and Launch the FreshMart App

In development mode:
```bash
npx expo run:android
```

### 4.4 Execute Maestro Flows

Run a specific flow or all flows:

```bash
# Run flow 01: App Launch & Initial Routing
maestro test .maestro/01_app_launch.yaml

# Run flow 03: Store Selection
maestro test .maestro/03_store_selection.yaml

# Run flow 07: Cash on Delivery Checkout
maestro test .maestro/07_cash_on_delivery.yaml

# Run all 10 flows in sequence
maestro test .maestro/
```

---

## 5. Continuous Integration (CI) Pipeline Configuration

Below is an example **GitHub Actions** workflow (`.github/workflows/mobile-ci.yml`) to automatically validate pull requests:

```yaml
name: FreshMart Mobile CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  validate-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: TypeScript Compile Check
        run: npx tsc --noEmit

      - name: Execute Automated Test Suite
        run: npm test

      - name: Verify Backend Compatibility
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - name: Run Backend Tests
        run: dotnet test D:\Sheik\Grocery\HapGroceriesAPI\GroceriesAPI\GroceryApp.Tests\GroceryApp.Tests.csproj
```

---

## 6. Troubleshooting Common Issues

1. **`Cannot find module 'tsx'`:**  
   Run `npm install --save-dev tsx` or execute using `npx tsx`.
2. **`ReferenceError: localStorage / AsyncStorage is not defined`:**  
   Always include `--import ./src/test/setupMock.ts` when running test files directly.
3. **`adb devices` shows `unauthorized`:**  
   Unlock the Android device and accept the USB Debugging RSA fingerprint prompt.
4. **Maestro test fails on finding text:**  
   Ensure the device screen is active and `accessibilityLabel` or `testID` matches the YAML selector.
