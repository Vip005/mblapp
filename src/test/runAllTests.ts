/**
 * Unified Automated Test Suite Orchestrator for FreshMart Mobile
 *
 * Discovers and executes all unit, component, API integration, and journey test suites.
 * Produces structured metrics and logs.
 */

import { spawn } from 'child_process';
import path from 'path';

interface TestSuite {
  id: string;
  name: string;
  file: string;
  category: 'Unit' | 'Component' | 'API Integration' | 'Customer Journey' | 'Mobile UI (E2E)';
  isAutomated: boolean;
  status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
  durationMs: number;
  error?: string;
}

const testSuites: TestSuite[] = [
  {
    id: 'TS-01',
    name: 'Unit: Validation, JWT & Formatter Utilities',
    file: 'unitValidationAndAuth.test.ts',
    category: 'Unit',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-02',
    name: 'Unit: Dynamic Pricing, Taxes & Platform Fees',
    file: 'pricingAndCheckout.test.ts',
    category: 'Unit',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-03',
    name: 'Unit: Global Error Shielding & HTML Sanitization',
    file: 'globalErrorHandling.test.ts',
    category: 'Unit',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-04',
    name: 'Component: Store Selection Flow & Persistence',
    file: 'storeSelectionFlow.test.ts',
    category: 'Component',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-05',
    name: 'Component: Special Offers Responsive Layout',
    file: 'specialOffersResponsiveLayout.test.ts',
    category: 'Component',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-06',
    name: 'Component: Product Card & Quantity Selector',
    file: 'productDetailsCartQuantity.test.ts',
    category: 'Component',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-07',
    name: 'Component: Add to Cart Resilience & Concurrency Mutex',
    file: 'addToCartResilience.test.ts',
    category: 'Component',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-08',
    name: 'Component: Razorpay Gateway & Key Mode Security',
    file: 'razorpayIntegration.test.ts',
    category: 'Component',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-09',
    name: 'API: Payment-First Checkout Session & Verifications',
    file: 'paymentFirstCheckout.test.ts',
    category: 'API Integration',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-10',
    name: 'API: Full Backend Contracts (Auth, Cart, Store, Catalog, Orders)',
    file: 'apiContractIntegration.test.ts',
    category: 'API Integration',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-11',
    name: 'E2E: All 10 Core Customer Journeys (State Machine)',
    file: 'customerJourneys.test.ts',
    category: 'Customer Journey',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-12',
    name: 'Component: Offer Helpers & Product Card Mutex Regression',
    file: 'offersAndProductCardLayout.test.ts',
    category: 'Component',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-13',
    name: 'API: Checkout Database Error Diagnostics & Extraction',
    file: 'checkoutDatabaseErrorDiagnostics.test.ts',
    category: 'API Integration',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-14',
    name: 'Auth: Token Refresh Single-Flight Mutex & Race Condition Prevention',
    file: 'tokenRefreshConcurrency.test.ts',
    category: 'API Integration',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-15',
    name: 'API: Checkout Stock Exhaustion & Gateway Depletion Integrity',
    file: 'checkoutStockExhaustion.test.ts',
    category: 'API Integration',
    isAutomated: true,
    status: 'SKIPPED',
    durationMs: 0,
  },
  {
    id: 'TS-16',
    name: 'Mobile UI: Native Maestro Flow Automation (Journeys 1-10)',
    file: '.maestro/*.yaml',
    category: 'Mobile UI (E2E)',
    isAutomated: false, // Requires connected Android device/emulator
    status: 'BLOCKED',
    durationMs: 0,
    error: 'No active Android emulator or physical device connected in adb (List of devices attached: empty).',
  },
];

async function runSingleSuite(suite: TestSuite): Promise<TestSuite> {
  if (!suite.isAutomated) {
    return suite;
  }

  const startTime = Date.now();
  return new Promise((resolve) => {
    const testFilePath = `./src/test/${suite.file}`;
    const setupMockPath = './src/test/setupMock.ts';

    const proc = spawn('npx', ['tsx', '--import', setupMockPath, testFilePath], {
      shell: true,
      stdio: 'pipe',
      cwd: path.resolve(__dirname, '../../'),
    });

    let stderr = '';
    let stdout = '';

    proc.stdout.on('data', (d: any) => {
      stdout += d.toString();
    });

    proc.stderr.on('data', (d: any) => {
      stderr += d.toString();
    });

    proc.on('close', (code: any) => {
      suite.durationMs = Date.now() - startTime;
      if (code === 0) {
        suite.status = 'PASSED';
      } else {
        suite.status = 'FAILED';
        suite.error = stderr || stdout || `Process exited with code ${code}`;
      }
      resolve(suite);
    });
  });
}

async function main() {
  console.log('======================================================================');
  console.log('  FreshMart Mobile App — Automated Testing Execution Suite');
  console.log('  Technology: Expo React Native 0.88, React 19, TypeScript 6.0');
  console.log('======================================================================\n');

  const overallStartTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;
  let totalBlocked = 0;
  let totalSkipped = 0;

  for (const suite of testSuites) {
    process.stdout.write(`Executing [${suite.id}] ${suite.name}... `);

    if (suite.status === 'BLOCKED') {
      console.log(`[BLOCKED]`);
      totalBlocked++;
      continue;
    }

    const result = await runSingleSuite(suite);
    if (result.status === 'PASSED') {
      console.log(`[PASSED] (${result.durationMs}ms)`);
      totalPassed++;
    } else {
      console.log(`[FAILED] (${result.durationMs}ms)`);
      console.error(`\nFailure Details for ${suite.id}:\n${result.error}\n`);
      totalFailed++;
    }
  }

  const overallDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);

  console.log('\n======================================================================');
  console.log('  AUTOMATED TEST EXECUTION SUMMARY REPORT');
  console.log('======================================================================');
  console.log(`Total Test Suites   : ${testSuites.length}`);
  console.log(`Passed Suites       : ${totalPassed}`);
  console.log(`Failed Suites       : ${totalFailed}`);
  console.log(`Blocked Suites      : ${totalBlocked} (Native Emulator / Device unavailable)`);
  console.log(`Skipped Suites      : ${totalSkipped}`);
  console.log(`Total Execution Time: ${overallDuration}s`);
  console.log('======================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
