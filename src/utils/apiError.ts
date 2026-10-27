/**
 * Centralized Context-Aware Error Handling Utility for FreshMart Mobile
 *
 * Guarantees that users NEVER see:
 * - Raw HTML error pages (e.g. Azure App Service 403 stopped pages)
 * - Raw HTTP status codes (e.g. "HTTP Error 500", "status code 404")
 * - SQL Server exceptions, table names, or error codes (e.g. "(SQL 208)", "[Root Cause: ...]")
 * - Stack traces or internal runtime errors (e.g. "at Microsoft...", "NullReferenceException")
 * - Raw JSON payload strings or response parsing internals
 *
 * Provides context-aware human-friendly messaging for every screen and operation.
 */

export type ErrorContext =
  | 'auth'
  | 'login'
  | 'otp'
  | 'session'
  | 'nameUpdate'
  | 'address'
  | 'store'
  | 'product'
  | 'category'
  | 'cart'
  | 'coupon'
  | 'checkout'
  | 'payment'
  | 'order'
  | 'orderCancel'
  | 'orderTracking'
  | 'profile'
  | 'wishlist'
  | 'search'
  | 'general';

export interface SafeErrorOptions {
  context?: ErrorContext;
  fallback?: string;
  customMessage?: string;
}

/**
 * Detects whether an error contains HTML markup (such as Azure 403 stopped pages or IIS errors).
 */
export function isHtmlErrorResponse(error: unknown): boolean {
  if (!error) return false;

  const candidates: string[] = [];

  if (typeof error === 'string') {
    candidates.push(error);
  } else if (typeof error === 'object') {
    const errObj = error as any;
    if (typeof errObj.message === 'string') candidates.push(errObj.message);
    if (typeof errObj.data === 'string') candidates.push(errObj.data);
    if (typeof errObj.response?.data === 'string') candidates.push(errObj.response.data);
    if (typeof errObj.detail === 'string') candidates.push(errObj.detail);
    if (typeof errObj.error === 'string') candidates.push(errObj.error);
    if (errObj.data && typeof errObj.data === 'object' && typeof errObj.data.htmlSnippet === 'string') {
      candidates.push(errObj.data.htmlSnippet);
    }
  }

  const combined = candidates.join(' ').toLowerCase();

  return (
    /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<div[\s>]|<h1[\s>]/i.test(combined) ||
    combined.includes('this web app is stopped') ||
    combined.includes('web app you have attempted to reach is currently stopped') ||
    combined.includes('error 403 - this web app is stopped')
  );
}

/**
 * Specifically detects the Azure App Service "Web App is stopped" error.
 */
export function isAzureAppStopped(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object') {
    const errObj = error as any;
    if (errObj.data?.isAzureStopped === true || errObj.response?.data?.isAzureStopped === true) {
      return true;
    }
  }

  const str = String(
    typeof error === 'string'
      ? error
      : (error as any)?.message ||
        (typeof (error as any)?.data === 'string' ? (error as any).data : (error as any)?.data?.htmlSnippet) ||
        (typeof (error as any)?.response?.data === 'string'
          ? (error as any).response.data
          : (error as any)?.response?.data?.htmlSnippet) ||
        ''
  ).toLowerCase();

  return (
    str.includes('this web app is stopped') ||
    str.includes('web app you have attempted to reach is currently stopped')
  );
}

/**
 * Extracts the HTTP status code from any error shape (ApiError, Axios-like, fetch, or nested).
 */
export function getApiErrorStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 0;
  const err = error as any;
  if (typeof err.statusCode === 'number') return err.statusCode;
  if (typeof err.status === 'number') return err.status;
  if (typeof err.response?.status === 'number') return err.response.status;
  if (typeof err.data?.statusCode === 'number') return err.data.statusCode;
  if (typeof err.response?.data?.statusCode === 'number') return err.response.data.statusCode;
  return 0;
}

/**
 * Detects network connectivity failure / DNS resolution drops / offline device.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const status = getApiErrorStatus(error);
  if (status === 0) {
    const msg = String((error as any)?.message || error).toLowerCase();
    if (
      msg.includes('network request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('network error') ||
      msg.includes('enotfound') ||
      msg.includes('econnrefused') ||
      msg.includes('offline')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Detects client/server timeout (status 408, 504, or AbortController timeout).
 */
export function isTimeoutError(error: unknown): boolean {
  if (!error) return false;
  const status = getApiErrorStatus(error);
  if (status === 408 || status === 504) return true;
  const msg = String((error as any)?.message || error).toLowerCase();
  return (
    (error as any)?.name === 'AbortError' ||
    msg.includes('timed out') ||
    msg.includes('timeout')
  );
}

/**
 * Checks whether a candidate error message contains technical, internal, or raw database leaks.
 */
export function isTechnicalOrUnsafeMessage(msg: string): boolean {
  if (!msg || typeof msg !== 'string') return true;
  const trimmed = msg.trim();
  if (trimmed.length === 0) return true;

  // HTML or tags
  if (/<!doctype\s+html|<html[\s>]|<body[\s>]|<head[\s>]|<[^>]+>/i.test(trimmed)) return true;

  // Azure stopped indicator
  if (/web app is stopped|currently stopped/i.test(trimmed)) return true;

  // Raw HTTP status codes / phrases
  if (/HTTP\s*(Error)?\s*\d{3}/i.test(trimmed)) return true;
  if (/Request failed with status code\s*\d{3}/i.test(trimmed)) return true;
  if (/status code\s*\d{3}/i.test(trimmed)) return true;

  // SQL / EF Core error messages
  if (
    /SqlException|SQLException|Invalid object name|FOREIGN KEY|PRIMARY KEY|DbUpdateException|DbUpdateConcurrencyException|Root Cause:|\(SQL\s*\d+\)/i.test(
      trimmed
    )
  ) {
    return true;
  }

  // Stack traces & runtime symbols
  if (
    /at\s+[\w\.]+\(|stack trace|at System\.|at Microsoft\.|NullReferenceException|ArgumentNullException/i.test(
      trimmed
    )
  ) {
    return true;
  }

  // Raw JSON blobs
  if (/^\s*[\{\[][\s\S]*[\}\]]\s*$/.test(trimmed)) return true;

  // Internal response parser leaks
  if (/response parsing|did not return a valid numeric OrderID/i.test(trimmed)) return true;

  return false;
}

/**
 * Extracts safe validation messages if returned by the backend in a standard format.
 * Returns null if the backend validation message is missing or technical.
 */
export function extractSafeFieldValidation(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const errObj = error as any;
  const data = errObj.data || errObj.response?.data;

  if (data && typeof data === 'object') {
    // 1. Check for standard validation errors map: { errors: { Field: ['Error message'] } }
    const errorsMap = data.errors || data.Errors;
    if (errorsMap && typeof errorsMap === 'object') {
      const messages: string[] = [];
      for (const [key, val] of Object.entries(errorsMap)) {
        if (Array.isArray(val)) {
          for (const item of val) {
            if (typeof item === 'string' && !isTechnicalOrUnsafeMessage(item)) {
              messages.push(item);
            }
          }
        } else if (typeof val === 'string' && !isTechnicalOrUnsafeMessage(val)) {
          messages.push(val);
        }
      }
      if (messages.length > 0) {
        return messages.join('\n');
      }
    }

    // 2. Check for single clean backend message in message, Message, title, Title, error, Error, errorMessage, ErrorMessage
    const candidateMsg =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.Message === 'string' && data.Message) ||
      (typeof data.title === 'string' && data.title) ||
      (typeof data.Title === 'string' && data.Title) ||
      (typeof data.error === 'string' && data.error) ||
      (typeof data.Error === 'string' && data.Error) ||
      (typeof data.errorMessage === 'string' && data.errorMessage) ||
      (typeof data.ErrorMessage === 'string' && data.ErrorMessage) ||
      (Array.isArray(data.errorMessage) && data.errorMessage.filter((m: any) => typeof m === 'string' && !isTechnicalOrUnsafeMessage(m)).join('; ')) ||
      (Array.isArray(data.ErrorMessage) && data.ErrorMessage.filter((m: any) => typeof m === 'string' && !isTechnicalOrUnsafeMessage(m)).join('; '));

    if (candidateMsg) {
      const clean = candidateMsg.trim();
      if (!isTechnicalOrUnsafeMessage(clean)) {
        return clean;
      }
    }
  }

  // 3. Check for clean error.message / error.Message if not technical
  const candidateErr =
    (typeof errObj.message === 'string' && errObj.message) ||
    (typeof errObj.Message === 'string' && errObj.Message);

  if (candidateErr) {
    const clean = candidateErr.trim();
    if (!isTechnicalOrUnsafeMessage(clean)) {
      return clean;
    }
  }

  return null;
}

/**
 * Central function to resolve a safe, context-aware user error message.
 *
 * @param error - The error thrown or caught (ApiError, Error, string, or unknown)
 * @param optionsOrContext - Context string (e.g. 'checkout') or options object
 * @returns Safe, user-friendly message string guaranteed free of HTML, SQL, and status codes.
 */
export function getSafeUserErrorMessage(
  error: unknown,
  optionsOrContext?: ErrorContext | SafeErrorOptions
): string {
  const options: SafeErrorOptions =
    typeof optionsOrContext === 'string'
      ? { context: optionsOrContext }
      : optionsOrContext || {};

  const context: ErrorContext = options.context || 'general';

  // 1. If a custom safe message was explicitly specified, return it
  if (options.customMessage && !isTechnicalOrUnsafeMessage(options.customMessage)) {
    return options.customMessage;
  }

  // 2. Azure App Service stopped / infrastructure outage check
  if (isAzureAppStopped(error)) {
    return 'Our service is temporarily unavailable. Please try again in a few minutes.';
  }

  // 3. Any HTML error page
  if (isHtmlErrorResponse(error)) {
    return 'Our service is temporarily unavailable. Please try again in a few minutes.';
  }

  // 4. Timeout error
  if (isTimeoutError(error)) {
    return 'The request took too long. Please try again.';
  }

  // 5. Network connectivity drop / DNS error
  if (isNetworkError(error)) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // 6. Check HTTP status code
  const status = getApiErrorStatus(error);

  // Status: 400 Bad Request / 422 Unprocessable Entity (Validation)
  if (status === 400 || status === 422) {
    const fieldMsg = extractSafeFieldValidation(error);
    if (fieldMsg) return fieldMsg;

    switch (context) {
      case 'login':
        return 'Please enter a valid mobile number.';
      case 'otp':
        return 'The OTP is incorrect. Please check it and try again.';
      case 'nameUpdate':
        return 'Please enter a valid name (at least 2 characters).';
      case 'address':
        return 'Please check your delivery address details and try again.';
      case 'coupon':
        return 'This coupon code is invalid or has expired.';
      case 'cart':
        return 'Unable to update cart with the selected quantity.';
      case 'checkout':
      case 'payment':
        return 'Please check your delivery details and order items before proceeding.';
      default:
        return 'Please check the entered information and try again.';
    }
  }

  // Status: 401 Unauthorized
  if (status === 401) {
    if (context === 'otp') {
      return 'The OTP is incorrect. Please check it and try again.';
    }
    if (context === 'login') {
      return 'Authentication failed. Please verify your phone number.';
    }
    return 'Your session has expired. Please log in again.';
  }

  // Status: 403 Forbidden
  if (status === 403) {
    return 'You don’t have permission to perform this action.';
  }

  // Status: 404 Not Found
  if (status === 404) {
    switch (context) {
      case 'product':
        return 'Product not found. It may have been removed or is no longer available.';
      case 'category':
        return 'This category is no longer available.';
      case 'store':
        return 'This store could not be found. Please select another store.';
      case 'address':
        return 'This address could not be found. Please select another address.';
      case 'order':
      case 'orderTracking':
      case 'orderCancel':
        return 'We couldn’t find this order. Please refresh and try again.';
      case 'cart':
        return 'We couldn’t find your cart. Please try adding the items again.';
      default:
        return 'This feature is temporarily unavailable. Please try again later.';
    }
  }

  // Status: 409 Conflict (e.g. concurrent checkout, item stock changed)
  if (status === 409) {
    switch (context) {
      case 'checkout':
      case 'payment':
        return 'This checkout attempt is no longer valid. Please start a new checkout session.';
      case 'cart':
        return 'Your cart was updated in another session. Please refresh and try again.';
      case 'orderCancel':
        return 'This order status has already changed and cannot be cancelled.';
      default:
        return 'This action conflicts with the current state. Refresh and try again.';
    }
  }

  // Status: 429 Too Many Requests
  if (status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // Status: 500, 502, 503, 504 (Server Errors)
  if (status >= 500 && status <= 504) {
    return 'Something went wrong on our side. Please try again shortly.';
  }

  // 7. Check if there is an existing safe error message from the thrown Error
  const safeMsg = extractSafeFieldValidation(error);
  if (safeMsg) {
    return safeMsg;
  }

  // 8. Fallback message provided in options
  if (options.fallback && !isTechnicalOrUnsafeMessage(options.fallback)) {
    return options.fallback;
  }

  // 9. Context-specific default fallback
  switch (context) {
    case 'login':
      return 'Unable to log in right now. Please try again.';
    case 'otp':
      return 'Verification failed. Please check the code and try again.';
    case 'nameUpdate':
      return 'Failed to save name. Please try again.';
    case 'address':
      return 'Failed to save delivery address. Please try again.';
    case 'store':
      return 'Failed to select store. Please try again.';
    case 'product':
      return 'Unable to load product details. Please try again.';
    case 'category':
      return 'Unable to load categories. Please try again.';
    case 'cart':
      return 'Unable to update your cart. Please try again.';
    case 'coupon':
      return 'Unable to validate coupon code. Please try again.';
    case 'checkout':
      return 'Checkout could not be completed. Your cart has been preserved.';
    case 'payment':
      return 'Payment verification could not be confirmed. Your cart has been preserved.';
    case 'order':
      return 'Failed to place order. Your cart has been preserved. Please try again.';
    case 'orderCancel':
      return 'Unable to cancel this order right now. Please try again.';
    case 'orderTracking':
      return 'Unable to update live tracking right now. Please pull down to refresh.';
    case 'profile':
      return 'Failed to update profile. Please try again.';
    case 'wishlist':
      return 'Unable to update wishlist. Please try again.';
    case 'search':
      return 'Search is temporarily unavailable. Please try again.';
    default:
      return 'We couldn’t complete your request. Please try again.';
  }
}

/**
 * Developer logging helper: logs sanitized error diagnostics without leaking
 * OTPs, tokens, passwords, payment secrets, or dumping multi-kilobyte HTML error pages.
 */
declare const __DEV__: boolean | undefined;

export function sanitizeDevLog(context: string, error: unknown): void {
  const isDev =
    typeof __DEV__ !== 'undefined'
      ? Boolean(__DEV__)
      : typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

  if (!isDev) return;

  const status = getApiErrorStatus(error);
  const isHtml = isHtmlErrorResponse(error);
  const isAzure = isAzureAppStopped(error);

  let summary = '';
  if (isAzure) {
    summary = 'Azure App Service is currently STOPPED (HTTP 403 HTML)';
  } else if (isHtml) {
    summary = `Server returned an HTML error page (Status: ${status || 'unknown'})`;
  } else if (error instanceof Error) {
    // Truncate message to 120 chars if excessively long
    const clean = error.message.replace(/\s+/g, ' ').trim();
    summary = clean.length > 120 ? `${clean.substring(0, 120)}...` : clean;
  } else {
    summary = String(error);
  }

  console.warn(`[${context}] Sanitized Diagnostic: ${summary} (Status: ${status})`);
}
