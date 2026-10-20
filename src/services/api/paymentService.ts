import { apiClient } from './apiClient';
import {
  PaymentPublicConfigDto,
  CreatePaymentOrderRequestDto,
  CreatePaymentOrderResponseDto,
  VerifyPaymentRequestDto,
  VerifyPaymentResponseDto,
  RecordPaymentFailureRequestDto,
  OrderPaymentStatusResponseDto,
  CheckoutSessionCreateRequestDto,
  CheckoutSessionCreateResponseDto,
  CheckoutPaymentVerifyRequestDto,
  CheckoutPaymentVerifyResponseDto,
  CheckoutPaymentFailureRequestDto,
  CheckoutPaymentFailureResponseDto,
  CheckoutAttemptStatusResponseDto,
} from '../../types';

interface CachedConfig {
  config: PaymentPublicConfigDto;
  timestamp: number;
}

const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const configCache = new Map<string, CachedConfig>();

export const paymentService = {
  /**
   * Validate that Razorpay Key ID prefix matches the gateway operational mode.
   * Prevents accidental usage of live credentials in test mode or vice-versa.
   */
  validateKeyPrefix(keyId: string, mode: string): { isValid: boolean; error?: string } {
    const cleanKey = (keyId || '').trim();
    const cleanMode = (mode || '').trim();

    if (!cleanKey) {
      return { isValid: false, error: 'Razorpay Public Key ID is missing.' };
    }

    if (cleanMode.toLowerCase() === 'test') {
      if (!cleanKey.startsWith('rzp_test_')) {
        return {
          isValid: false,
          error: `Configuration mismatch: Mode is set to 'Test' but key ID does not start with 'rzp_test_'. Got: ${cleanKey.slice(0, 8)}...`,
        };
      }
      return { isValid: true };
    }

    if (cleanMode.toLowerCase() === 'live') {
      if (!cleanKey.startsWith('rzp_live_')) {
        return {
          isValid: false,
          error: `Configuration mismatch: Mode is set to 'Live' but key ID does not start with 'rzp_live_'. Got: ${cleanKey.slice(0, 8)}...`,
        };
      }
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `Unsupported payment gateway mode: '${mode}'. Mode must be either 'Test' or 'Live'.`,
    };
  },

  /**
   * Fetch public payment configuration from backend.
   * GET /api/payments/config?storeId={storeId}&gateway={gateway}
   * Cached in memory for 5 minutes per store unless forceRefresh is true.
   */
  async getPaymentConfig(
    storeId?: number | null,
    gateway: string = 'Razorpay',
    forceRefresh: boolean = false
  ): Promise<PaymentPublicConfigDto> {
    const cacheKey = `${storeId ?? 'default'}_${gateway}`;
    const cached = configCache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() - cached.timestamp < CONFIG_CACHE_TTL_MS) {
      return cached.config;
    }

    const queryParams = new URLSearchParams();
    if (storeId != null && !isNaN(Number(storeId)) && Number(storeId) > 0) {
      queryParams.append('storeId', String(storeId));
    }
    if (gateway) {
      queryParams.append('gateway', gateway);
    }

    const endpoint = `/api/payments/config${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await apiClient.get<PaymentPublicConfigDto | { result?: PaymentPublicConfigDto }>(endpoint);

    const config =
      res && typeof res === 'object' && 'result' in res && res.result
        ? res.result
        : (res as PaymentPublicConfigDto);

    if (!config || typeof config.isEnabled !== 'boolean') {
      throw new Error('Failed to retrieve valid payment gateway configuration from server.');
    }

    configCache.set(cacheKey, {
      config,
      timestamp: Date.now(),
    });

    return config;
  },

  /**
   * Invalidate cached payment configuration.
   */
  clearConfigCache(): void {
    configCache.clear();
  },

  /**
   * Create or retrieve an existing server-authoritative Razorpay order.
   * POST /api/payments/create-order
   */
  async createPaymentOrder(
    orderId: number,
    clientAmount?: number,
    forceNewAttempt: boolean = false
  ): Promise<CreatePaymentOrderResponseDto> {
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      throw new Error('Valid order ID is required to create a payment order.');
    }

    const payload: CreatePaymentOrderRequestDto = {
      orderID: orderId,
      clientAmount: clientAmount != null ? Number(clientAmount.toFixed(2)) : undefined,
      clientAmountInPaise: clientAmount != null ? Math.round(clientAmount * 100) : undefined,
      forceNewAttempt,
    };

    const res = await apiClient.post<CreatePaymentOrderResponseDto | { result?: CreatePaymentOrderResponseDto }>(
      '/api/payments/create-order',
      payload
    );

    const result =
      res && typeof res === 'object' && 'result' in res && res.result
        ? res.result
        : (res as CreatePaymentOrderResponseDto);

    if (!result || !result.razorpayOrderId) {
      throw new Error('Payment gateway order creation failed: Server did not return a Razorpay order ID.');
    }

    return result;
  },

  /**
   * Verify Razorpay payment signature after customer completes payment.
   * POST /api/payments/verify
   */
  async verifyPayment(dto: VerifyPaymentRequestDto): Promise<VerifyPaymentResponseDto> {
    if (!dto.orderID || dto.orderID <= 0) {
      throw new Error('Valid order ID is required to verify payment.');
    }
    if (!dto.razorpayOrderId || !dto.razorpayPaymentId || !dto.razorpaySignature) {
      throw new Error('Incomplete payment response received from Razorpay. Cannot verify signature.');
    }

    const res = await apiClient.post<VerifyPaymentResponseDto | { result?: VerifyPaymentResponseDto }>(
      '/api/payments/verify',
      dto
    );

    const result =
      res && typeof res === 'object' && 'result' in res && res.result
        ? res.result
        : (res as VerifyPaymentResponseDto);

    if (!result || !result.paymentStatus) {
      throw new Error('Payment verification failed: Invalid response from server.');
    }

    return result;
  },

  /**
   * Record a payment failure or cancellation on the server.
   * POST /api/payments/fail
   */
  async recordPaymentFailure(
    orderId: number,
    razorpayOrderId: string,
    failureCode?: string,
    failureReason?: string
  ): Promise<any> {
    const payload: RecordPaymentFailureRequestDto = {
      orderID: orderId,
      razorpayOrderId,
      failureCode: failureCode || 'USER_CANCELLED',
      failureReason: failureReason || 'Payment was not completed by user',
    };

    return apiClient.post('/api/payments/fail', payload);
  },

  /**
   * Fetch current payment status for an order.
   * GET /api/payments/{orderId}/status
   */
  async getOrderPaymentStatus(orderId: number): Promise<OrderPaymentStatusResponseDto> {
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      throw new Error('Valid order ID is required to fetch payment status.');
    }

    const res = await apiClient.get<OrderPaymentStatusResponseDto | { result?: OrderPaymentStatusResponseDto }>(
      `/api/payments/${orderId}/status`
    );

    const result =
      res && typeof res === 'object' && 'result' in res && res.result
        ? res.result
        : (res as OrderPaymentStatusResponseDto);

    if (!result || !result.orderID) {
      throw new Error(`Failed to fetch payment status for order ${orderId}.`);
    }

    return result;
  },

  // ==========================================
  // Payment-First Checkout Architecture APIs
  // ==========================================

  /**
   * Create a server-authoritative checkout attempt session and Razorpay order.
   * OrderMaster is NOT created in the database during this step.
   * POST /api/payments/checkout-session
   */
  async createCheckoutSession(
    dto: CheckoutSessionCreateRequestDto
  ): Promise<CheckoutSessionCreateResponseDto> {
    if (!dto.storeID || dto.storeID <= 0) {
      throw new Error('Valid store ID is required to initiate checkout session.');
    }
    if (!dto.addressId || dto.addressId <= 0) {
      throw new Error('Valid delivery address is required to initiate checkout session.');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new Error('Cart must contain at least one item to initiate checkout session.');
    }

    // Validate items integrity
    for (const item of dto.items) {
      if (!item.productID || item.productID <= 0) {
        throw new Error(`Invalid product ID in checkout session.`);
      }
      if (!item.productVariantID || item.productVariantID <= 0) {
        throw new Error(`Invalid variant ID for product "${item.productName || item.productID}".`);
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Quantity must be greater than zero for "${item.productName || item.productID}".`);
      }
    }

    const res = await apiClient.post<
      CheckoutSessionCreateResponseDto | { result?: CheckoutSessionCreateResponseDto }
    >('/api/payments/checkout-session', dto);

    const result =
      res && typeof res === 'object' && 'result' in res && res.result
        ? res.result
        : (res as CheckoutSessionCreateResponseDto);

    if (!result || !result.attemptToken || !result.razorpayOrderId) {
      throw new Error('Checkout session creation failed: Invalid response received from server.');
    }

    return result;
  },

  /**
   * Authoritatively verify Razorpay payment signature, reserve FEFO inventory batches,
   * and create OrderMaster in a single atomic SQL transaction on the backend.
   * POST /api/payments/verify-checkout
   */
  async verifyCheckoutPayment(
    dto: CheckoutPaymentVerifyRequestDto
  ): Promise<CheckoutPaymentVerifyResponseDto> {
    if (!dto.attemptToken || !dto.attemptToken.trim()) {
      throw new Error('Attempt token is required for payment verification.');
    }
    if (!dto.razorpayOrderId || !dto.razorpayOrderId.trim()) {
      throw new Error('Razorpay order ID is required for payment verification.');
    }
    if (!dto.razorpayPaymentId || !dto.razorpayPaymentId.trim()) {
      throw new Error('Razorpay payment ID is required for payment verification.');
    }
    if (!dto.razorpaySignature || !dto.razorpaySignature.trim()) {
      throw new Error('Razorpay signature is required for payment verification.');
    }

    const res = await apiClient.post<
      CheckoutPaymentVerifyResponseDto | { result?: CheckoutPaymentVerifyResponseDto }
    >('/api/payments/verify-checkout', dto);

    const result =
      res && typeof res === 'object' && 'result' in res && res.result
        ? res.result
        : (res as CheckoutPaymentVerifyResponseDto);

    if (!result || typeof result.isSuccess !== 'boolean' || !result.status) {
      throw new Error('Payment verification failed: Incomplete response received from server.');
    }

    return result;
  },

  /**
   * Record client-reported payment cancellation or failure for a checkout attempt.
   * POST /api/payments/fail-checkout
   */
  async failCheckoutPayment(
    dto: CheckoutPaymentFailureRequestDto
  ): Promise<CheckoutPaymentFailureResponseDto> {
    if (!dto.attemptToken || !dto.attemptToken.trim()) {
      throw new Error('Attempt token is required to record checkout failure.');
    }
    if (!dto.razorpayOrderId || !dto.razorpayOrderId.trim()) {
      throw new Error('Razorpay order ID is required to record checkout failure.');
    }

    const payload: CheckoutPaymentFailureRequestDto = {
      attemptToken: dto.attemptToken.trim(),
      razorpayOrderId: dto.razorpayOrderId.trim(),
      failureCode: dto.failureCode || 'USER_CANCELLED',
      failureReason: dto.failureReason || 'Payment cancelled or dismissed by user.',
    };

    const res = await apiClient.post<
      CheckoutPaymentFailureResponseDto | { result?: CheckoutPaymentFailureResponseDto }
    >('/api/payments/fail-checkout', payload);

    const result =
      res && typeof res === 'object' && 'result' in res && res.result
        ? res.result
        : (res as CheckoutPaymentFailureResponseDto);

    return result;
  },

  /**
   * Query the authoritative status of a checkout attempt.
   * GET /api/payments/checkout/{token}/status
   */
  async getCheckoutAttemptStatus(
    tokenOrOrderId: string
  ): Promise<CheckoutAttemptStatusResponseDto> {
    const cleanToken = (tokenOrOrderId || '').trim();
    if (!cleanToken) {
      throw new Error('Valid checkout attempt token or Razorpay Order ID is required.');
    }

    const res = await apiClient.get<
      CheckoutAttemptStatusResponseDto | { result?: CheckoutAttemptStatusResponseDto }
    >(`/api/payments/checkout/${encodeURIComponent(cleanToken)}/status`);

    const result =
      res && typeof res === 'object' && 'result' in res && res.result
        ? res.result
        : (res as CheckoutAttemptStatusResponseDto);

    if (!result || !result.attemptToken || !result.status) {
      throw new Error(`Failed to retrieve status for checkout attempt "${cleanToken}".`);
    }

    return result;
  },

  /**
   * Status recovery helper for uncertain network outcomes (timeouts or disconnects).
   * Polls the checkout status endpoint up to `maxPolls` times with bounded backoff
   * to determine if server or webhook completed the order.
   */
  async recoverCheckoutStatus(
    tokenOrOrderId: string,
    maxPolls: number = 3,
    intervalMs: number = 2000
  ): Promise<CheckoutAttemptStatusResponseDto> {
    let lastStatus: CheckoutAttemptStatusResponseDto | null = null;

    for (let poll = 1; poll <= maxPolls; poll++) {
      try {
        lastStatus = await this.getCheckoutAttemptStatus(tokenOrOrderId);

        // Definitive terminal states where order or resolution is established
        if (
          lastStatus.status === 'OrderCreated' ||
          lastStatus.status === 'ReconciliationRequired' ||
          lastStatus.status === 'Refunded' ||
          lastStatus.status === 'PaymentFailed' ||
          lastStatus.status === 'Expired'
        ) {
          return lastStatus;
        }
      } catch (pollErr: any) {
        console.warn(`[paymentService.recoverCheckoutStatus] Poll ${poll}/${maxPolls} error:`, pollErr?.message);
      }

      if (poll < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    if (!lastStatus) {
      throw new Error('Unable to recover payment status from server. Please check your order history.');
    }

    return lastStatus;
  },
};

