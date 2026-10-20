let NativeModules: any;
let Platform: any;

try {
  const rn = require('react-native');
  NativeModules = rn.NativeModules;
  Platform = rn.Platform;
} catch {
  Platform = { OS: 'unknown' };
  NativeModules = {};
}

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayTheme {
  color?: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number | string; // in paise (e.g. 10000 for ₹100.00)
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string; // Razorpay Order ID (e.g. order_OPWk...)
  prefill?: RazorpayPrefill;
  theme?: RazorpayTheme;
  notes?: Record<string, string>;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayErrorResponse {
  code: number | string;
  description: string;
}

/**
 * Checks whether native react-native-razorpay module is compiled and available in the current runtime.
 * Returns false in Expo Go or Web, true in Custom Development Clients and production APK builds.
 */
export function isNativeRazorpayAvailable(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const hasNativeModule = !!(
      NativeModules?.RNRazorpayCheckout ||
      // @ts-ignore - runtime check for TurboModule
      global?.__turboModuleProxy?.('NativeRazorpayCheckout') ||
      // @ts-ignore - runtime check for TurboModuleRegistry
      (global?.TurboModuleRegistry && global.TurboModuleRegistry.get('NativeRazorpayCheckout'))
    );
    return hasNativeModule;
  } catch {
    return false;
  }
}

/**
 * Open native Razorpay checkout sheet.
 * Only call if `isNativeRazorpayAvailable()` returns true.
 */
export async function openNativeRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpaySuccessResponse> {
  if (!isNativeRazorpayAvailable()) {
    throw new Error('Native Razorpay module is not linked in this runtime (Expo Go). Please use WebView checkout modal.');
  }

  // Lazy-load to prevent top-level NativeEventEmitter crash in unlinked environments
  const RazorpayCheckout = require('react-native-razorpay').default;

  return new Promise((resolve, reject) => {
    RazorpayCheckout.open(options)
      .then((data: any) => {
        resolve({
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id || options.order_id,
          razorpay_signature: data.razorpay_signature,
        });
      })
      .catch((err: any) => {
        reject({
          code: err?.code ?? 'PAYMENT_FAILED',
          description: err?.description ?? err?.message ?? 'Payment was cancelled or failed.',
        });
      });
  });
}
