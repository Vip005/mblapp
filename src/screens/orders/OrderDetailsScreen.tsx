import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Order, OrderStatus, OrderStatusStep, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useOrders } from '../../hooks/useOrders';
import { AppHeader } from '../../components/common/AppHeader';
import { Badge } from '../../components/common/Badge';
import { AppButton } from '../../components/common/AppButton';
import { SafeImage } from '../../components/common/SafeImage';
import { OrderStatusTimeline } from '../../components/order/OrderStatusTimeline';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';
import { ToastMessage } from '../../components/feedback/ToastMessage';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { orderHub, OrderStatusUpdatedEvent, OrderPaymentUpdatedEvent } from '../../services/realtime/orderHub';
import { mapBackendStatusToOrderStatus, getUpdatedTrackingSteps } from '../../services/api/adapters';
import { orderService } from '../../services/api/orderService';
import { paymentService } from '../../services/api/paymentService';
import {
  getSafeUserErrorMessage,
  sanitizeDevLog,
  isTechnicalOrUnsafeMessage,
} from '../../utils/apiError';
import {
  isNativeRazorpayAvailable,
  openNativeRazorpayCheckout,
  RazorpayCheckoutOptions,
  RazorpaySuccessResponse,
  RazorpayErrorResponse,
} from '../../services/payment/razorpayGateway';
import { RazorpayCheckoutModal } from '../../components/payment/RazorpayCheckoutModal';

export const OrderDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderDetails'>>();
  const { orderId } = route.params;

  const { getOrderById, cancelOrder, updateOrderStatus, updateOrder } = useOrders();
  const contextOrder = getOrderById(orderId);

  const [order, setOrder] = useState<Order | undefined>(contextOrder);
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(!contextOrder);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Payment Retry State
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<RazorpayCheckoutOptions | null>(null);
  const [activeRazorpayOrderId, setActiveRazorpayOrderId] = useState<string>('');

  // Sync with context order when context updates without regressing authoritative totals
  useEffect(() => {
    if (contextOrder) {
      setOrder((prev) =>
        prev
          ? {
              ...contextOrder,
              subtotal: prev.subtotal ?? contextOrder.subtotal,
              discount: prev.discount ?? contextOrder.discount,
              deliveryCharge: prev.deliveryCharge ?? contextOrder.deliveryCharge,
              tax: prev.tax ?? contextOrder.tax,
              total: prev.total ?? contextOrder.total,
              items: prev.items && prev.items.length > 0 ? prev.items : contextOrder.items,
              status: contextOrder.status,
              trackingSteps: contextOrder.trackingSteps,
              paymentStatus: contextOrder.paymentStatus ?? prev.paymentStatus,
              paymentMode: contextOrder.paymentMode ?? prev.paymentMode,
            }
          : contextOrder
      );
    }
  }, [contextOrder]);

  // Initial REST fetch to guarantee authoritative and fresh order state + payment status
  useEffect(() => {
    let isMounted = true;

    const loadAuthoritativeOrder = async () => {
      try {
        if (!contextOrder) {
          setIsLoadingOrder(true);
        }
        const fetched = await orderService.getOrderById(orderId);
        if (isMounted && fetched) {
          const numericId = Number(fetched.id || orderId);
          const isOnline =
            fetched.paymentMode === 'RAZORPAY' ||
            fetched.paymentMethod === 'razorpay' ||
            fetched.paymentMethod === 'online' ||
            fetched.paymentMethod === 'upi' ||
            fetched.paymentMethod === 'card';

          if (!isNaN(numericId) && numericId > 0 && isOnline) {
            try {
              const paymentStatusRes = await paymentService.getOrderPaymentStatus(numericId);
              if (paymentStatusRes.paymentStatus.toLowerCase() === 'paid') {
                fetched.paymentStatus = 'Paid';
                fetched.status = mapBackendStatusToOrderStatus(paymentStatusRes.orderStatus);
                fetched.trackingSteps = getUpdatedTrackingSteps(fetched.status, fetched.trackingSteps);
              }
            } catch (pErr) {
              console.warn('[OrderTracking] Failed to check payment status on load:', pErr);
            }
          }

          setOrder(fetched);
          updateOrder(fetched);
        }
      } catch (err: any) {
        sanitizeDevLog('OrderDetailsScreen.loadAuthoritativeOrder', err);
      } finally {
        if (isMounted) {
          setIsLoadingOrder(false);
        }
      }
    };

    loadAuthoritativeOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // SignalR real-time updates lifecycle (order status & payment status)
  useEffect(() => {
    const rawTargetId = order?.id || orderId;
    const numericOrderId = Number(rawTargetId);

    if (isNaN(numericOrderId) || numericOrderId <= 0) {
      return;
    }

    const handleStatusUpdate = (event: OrderStatusUpdatedEvent) => {
      console.log('[OrderTracking] SignalR status:', {
        orderId: event.orderId,
        status: event.status,
      });

      if (Number(event.orderId) !== numericOrderId) {
        return;
      }

      const mappedStatus = mapBackendStatusToOrderStatus(event.status);

      setOrder((prev) => {
        if (!prev) return prev;
        const updatedSteps = getUpdatedTrackingSteps(mappedStatus, prev.trackingSteps);
        return {
          ...prev,
          status: mappedStatus,
          trackingSteps: updatedSteps,
        };
      });

      updateOrderStatus(
        rawTargetId,
        mappedStatus,
        getUpdatedTrackingSteps(mappedStatus, order?.trackingSteps)
      );
    };

    const handlePaymentUpdate = (event: OrderPaymentUpdatedEvent) => {
      console.log('[OrderTracking] SignalR payment update:', event);

      if (Number(event.orderId) !== numericOrderId) {
        return;
      }

      if (event.paymentStatus.toLowerCase() === 'paid') {
        setOrder((prev) => {
          if (!prev) return prev;
          const mappedStatus =
            prev.status === 'Placed' || prev.status === 'Cancelled' ? 'Confirmed' : prev.status;
          return {
            ...prev,
            paymentStatus: 'Paid',
            status: mappedStatus,
            trackingSteps: getUpdatedTrackingSteps(mappedStatus, prev.trackingSteps),
          };
        });
        setToastMessage('Payment received and verified! Your order is confirmed.');
      }
    };

    let isSubscribed = true;

    const initSignalR = async () => {
      try {
        await orderHub.connect();
        if (!isSubscribed) return;

        orderHub.onStatusUpdated(handleStatusUpdate);
        orderHub.onPaymentUpdated(handlePaymentUpdate);
        await orderHub.joinOrder(numericOrderId);
      } catch (err: any) {
        console.warn('[OrderTracking] SignalR subscription error:', err?.message ?? err);
      }
    };

    initSignalR();

    return () => {
      isSubscribed = false;
      orderHub.offStatusUpdated(handleStatusUpdate);
      orderHub.offPaymentUpdated(handlePaymentUpdate);
      orderHub.leaveOrder(numericOrderId).catch((err: any) => {
        console.warn('[OrderTracking] Failed to leave order group:', err?.message ?? err);
      });
    };
  }, [order?.id, orderId]);

  if (!order) {
    if (isLoadingOrder) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <AppHeader title="Order Details" />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Order Details" />
        <ErrorState
          title="Order Not Found"
          message="We could not find the requested order in your account history."
          onRetry={() => navigation.goBack()}
        />
      </View>
    );
  }

  const isOnlineOrder =
    order.paymentMode?.toUpperCase() === 'RAZORPAY' ||
    order.paymentMethod === 'razorpay' ||
    order.paymentMethod === 'online' ||
    order.paymentMethod === 'upi' ||
    order.paymentMethod === 'card' ||
    order.paymentMethod === 'wallet';

  const isPaymentPaid = order.paymentStatus?.toLowerCase() === 'paid';
  const isUnpaidOnline = isOnlineOrder && !isPaymentPaid && order.status !== 'Cancelled';
  const canCancel = (order.status === 'Placed' || order.status === 'Confirmed') && !isUnpaidOnline;
  const effectiveDiscount = Number(
    (order.couponDiscount > 0 ? order.couponDiscount : order.discount || 0).toFixed(2)
  );

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await cancelOrder(order.id);
      setCancelModalVisible(false);
      setToastMessage('Order has been cancelled successfully');
    } catch (e: any) {
      setCancelModalVisible(false);
      sanitizeDevLog('OrderDetailsScreen.handleCancelOrder', e);
      Alert.alert(
        'Cancellation Failed',
        getSafeUserErrorMessage(e, 'orderCancel')
      );
    } finally {
      setCancelling(false);
    }
  };

  /**
   * Handle Retry / Complete Online Payment
   */
  const handleRetryPayment = async () => {
    if (!order || isRetryingPayment || isVerifyingPayment) return;
    const numericOrderId = Number(order.id);
    if (isNaN(numericOrderId) || numericOrderId <= 0) return;

    setIsRetryingPayment(true);
    try {
      // 1. Fetch public config to validate key & mode
      const config = await paymentService.getPaymentConfig(order.storeId);
      if (!config.isEnabled) {
        Alert.alert(
          'Online Payment Unavailable',
          'Online payments are currently disabled for this store. Please contact support.'
        );
        return;
      }

      const keyCheck = paymentService.validateKeyPrefix(config.publicKeyId, config.mode);
      if (!keyCheck.isValid) {
        Alert.alert('Configuration Error', keyCheck.error || 'Invalid payment gateway credentials.');
        return;
      }

      // 2. Create / retrieve existing Razorpay order for this order ID
      const paymentOrder = await paymentService.createPaymentOrder(numericOrderId, order.total, false);
      const keyVal = paymentService.validateKeyPrefix(paymentOrder.publicKeyId, paymentOrder.mode);
      if (!keyVal.isValid) {
        throw new Error(keyVal.error || 'Invalid key received from payment order creation.');
      }

      const options: RazorpayCheckoutOptions = {
        key: paymentOrder.publicKeyId,
        amount: paymentOrder.amountInPaise,
        currency: paymentOrder.currency || 'INR',
        name: 'FreshMart',
        description: `Order #${order.orderNumber || order.id}`,
        order_id: paymentOrder.razorpayOrderId,
        prefill: {
          name: order.address?.name || '',
          contact: order.address?.phone || '',
        },
        theme: {
          color: '#059669',
        },
      };

      // 3. Launch Dual-Engine Checkout
      if (isNativeRazorpayAvailable()) {
        try {
          const nativeRes = await openNativeRazorpayCheckout(options);
          await handlePaymentSuccess(nativeRes, paymentOrder.razorpayOrderId);
        } catch (err: any) {
          await handlePaymentFailure(err, paymentOrder.razorpayOrderId);
        }
      } else {
        setActiveRazorpayOrderId(paymentOrder.razorpayOrderId);
        setCheckoutOptions(options);
        setCheckoutModalVisible(true);
      }
    } catch (e: any) {
      sanitizeDevLog('OrderDetailsScreen.handleRetryPayment', e);
      Alert.alert(
        'Payment Initiation Failed',
        getSafeUserErrorMessage(e, 'payment')
      );
    } finally {
      setIsRetryingPayment(false);
    }
  };

  const handlePaymentSuccess = async (data: RazorpaySuccessResponse, razorpayOrderId: string) => {
    if (!order) return;
    setIsVerifyingPayment(true);
    setCheckoutModalVisible(false);

    try {
      const numericOrderId = Number(order.id);
      const verifyRes = await paymentService.verifyPayment({
        orderID: numericOrderId,
        razorpayOrderId: data.razorpay_order_id || razorpayOrderId,
        razorpayPaymentId: data.razorpay_payment_id,
        razorpaySignature: data.razorpay_signature,
        amount: order.total,
      });

      if (verifyRes.paymentStatus.toLowerCase() === 'paid') {
        const updatedStatus = mapBackendStatusToOrderStatus(verifyRes.orderStatus || 'Confirmed');
        const updatedOrder: Order = {
          ...order,
          paymentStatus: 'Paid',
          status: updatedStatus,
          trackingSteps: getUpdatedTrackingSteps(updatedStatus, order.trackingSteps),
        };
        setOrder(updatedOrder);
        updateOrder(updatedOrder);
        setToastMessage('Payment completed & verified successfully!');
      } else {
        Alert.alert(
          'Payment Status',
          `Payment submitted with status: ${verifyRes.paymentStatus}. Verifying with bank...`
        );
      }
    } catch (vErr: any) {
      sanitizeDevLog('OrderDetailsScreen.handlePaymentSuccess', vErr);
      Alert.alert(
        'Verification Failed',
        getSafeUserErrorMessage(vErr, 'payment')
      );
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handlePaymentFailure = async (error: RazorpayErrorResponse, razorpayOrderId: string) => {
    if (!order) return;
    setCheckoutModalVisible(false);

    try {
      const numericOrderId = Number(order.id);
      await paymentService.recordPaymentFailure(
        numericOrderId,
        razorpayOrderId,
        String(error.code),
        error.description
      );
    } catch (fErr: any) {
      sanitizeDevLog('OrderDetailsScreen.recordPaymentFailure', fErr);
    }

    const safeDescription =
      error.description && !isTechnicalOrUnsafeMessage(error.description)
        ? error.description
        : 'Payment was cancelled or failed. You can retry whenever you are ready.';

    Alert.alert(
      'Payment Incomplete',
      safeDescription
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={`Order #${order.orderNumber}`} subtitle={formatDate(order.date)} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* UNPAID ONLINE ORDER BANNER & RETRY ACTION */}
        {isUnpaidOnline && (
          <View
            style={[
              styles.pendingPaymentCard,
              {
                backgroundColor: '#FFFBEB',
                borderColor: '#F59E0B',
                ...theme.shadows.sm,
              },
            ]}
          >
            <View style={styles.pendingHeaderRow}>
              <View style={styles.pendingIconBox}>
                <Ionicons name="time" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pendingTitle}>Online Payment Pending</Text>
                <Text style={styles.pendingSub}>
                  Complete your Razorpay payment to confirm this order. Your cart items are reserved.
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <AppButton
                title={
                  isVerifyingPayment
                    ? 'Verifying Payment...'
                    : isRetryingPayment
                    ? 'Connecting to Gateway...'
                    : 'Complete Online Payment'
                }
                onPress={handleRetryPayment}
                loading={isRetryingPayment || isVerifyingPayment}
                disabled={isRetryingPayment || isVerifyingPayment}
                variant="primary"
                size="md"
                leftIcon={<Ionicons name="card-outline" size={18} color="#FFF" />}
              />
            </View>
          </View>
        )}

        {/* Order Status & Tracking Stepper */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={[styles.statusTitle, { color: theme.colors.textPrimary }]}>
                Order Tracking
              </Text>
            </View>
            <Badge
              label={order.status}
              variant={
                order.status === 'Delivered'
                  ? 'success'
                  : order.status === 'Cancelled'
                  ? 'error'
                  : 'primary'
              }
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <OrderStatusTimeline steps={order.trackingSteps} />
        </View>

        {/* Ordered Items List */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.md,
                fontWeight: theme.typography.weight.bold,
                marginBottom: 12,
              },
            ]}
          >
            Items in Order ({order.items?.length || 0})
          </Text>

          {order.items?.map((item, index) => (
            <View key={item.id || `item-${index}`}>
              <View style={styles.itemRow}>
                <View
                  style={[
                    styles.itemImageContainer,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderLight,
                    },
                  ]}
                >
                  <SafeImage
                    uri={item.image}
                    fallbackIcon="cube-outline"
                    width={56}
                    height={56}
                    style={styles.itemImage}
                  />
                </View>

                <View style={styles.itemInfo}>
                  <Text
                    style={[styles.itemBrand, { color: theme.colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.brand}
                  </Text>
                  <Text
                    style={[
                      styles.itemName,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.size.sm,
                        fontWeight: theme.typography.weight.semibold,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.productName}
                  </Text>
                  <Text style={[styles.itemVariant, { color: theme.colors.textMuted }]}>
                    {item.variantName} × {item.quantity}
                  </Text>
                </View>

                <View style={styles.itemPriceCol}>
                  <Text
                    style={[
                      styles.itemTotal,
                      {
                        color: theme.colors.primaryDarker,
                        fontSize: theme.typography.size.sm,
                        fontWeight: theme.typography.weight.bold,
                      },
                    ]}
                  >
                    {formatCurrency(item.totalPrice)}
                  </Text>
                  <Text style={[styles.itemUnitPrice, { color: theme.colors.textMuted }]}>
                    {formatCurrency(item.price)} each
                  </Text>
                </View>
              </View>

              {index < order.items.length - 1 && (
                <View style={[styles.itemDivider, { backgroundColor: theme.colors.borderLight }]} />
              )}
            </View>
          ))}
        </View>

        {/* Shipping Address & Payment Mode */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.md,
                fontWeight: theme.typography.weight.bold,
                marginBottom: 12,
              },
            ]}
          >
            Delivery & Payment Details
          </Text>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.detailTitle, { color: theme.colors.textPrimary }]}>
                {order.address?.name ? `${order.address.name} (${order.address.type || 'Home'})` : 'Delivery Address'}
              </Text>
              {(() => {
                const parts = [
                  order.address?.doorFlat,
                  order.address?.street,
                  order.address?.area,
                  order.address?.city,
                  order.address?.pincode ? `- ${order.address.pincode}` : '',
                ].filter(Boolean);
                const fullText = parts.join(', ').replace(', - ', ' - ');
                return fullText ? (
                  <Text style={[styles.detailSub, { color: theme.colors.textSecondary }]}>
                    {fullText}
                  </Text>
                ) : null;
              })()}
              {order.address?.phone ? (
                <Text style={[styles.detailSub, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                  Phone: +91 {order.address.phone}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
            <View style={{ marginLeft: 10, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.detailTitle, { color: theme.colors.textPrimary }]}>
                Payment Mode: {order.paymentMode || order.paymentMethod.toUpperCase()}
              </Text>
              <Badge
                label={order.paymentStatus || 'Pending'}
                variant={isPaymentPaid ? 'success' : 'warning'}
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* Bill Summary Breakdown */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.md,
                fontWeight: theme.typography.weight.bold,
                marginBottom: 12,
              },
            ]}
          >
            Bill Summary
          </Text>

          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.billValue, { color: theme.colors.textPrimary }]}>
              {formatCurrency(order.subtotal)}
            </Text>
          </View>

          {effectiveDiscount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: theme.colors.primaryDark }]}>
                {order.appliedCoupon?.code ? `Coupon Discount (${order.appliedCoupon.code})` : 'Discount'}
              </Text>
              <Text style={[styles.billValue, { color: theme.colors.primaryDark }]}>
                -{formatCurrency(effectiveDiscount)}
              </Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: theme.colors.textSecondary }]}>Delivery Charges</Text>
            <Text style={[styles.billValue, { color: theme.colors.textPrimary }]}>
              {order.deliveryCharge === 0 ? 'FREE' : formatCurrency(order.deliveryCharge)}
            </Text>
          </View>

          {order.platformFee != null && order.platformFee > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: theme.colors.textSecondary }]}>Platform Fee</Text>
              <Text style={[styles.billValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(order.platformFee)}
              </Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: theme.colors.textSecondary }]}>Taxes & GST</Text>
            <Text style={[styles.billValue, { color: theme.colors.textPrimary }]}>
              {formatCurrency(order.tax)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.billRow}>
            <Text
              style={[
                styles.grandTotalLabel,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.md,
                  fontWeight: theme.typography.weight.bold,
                },
              ]}
            >
              Total {isPaymentPaid ? 'Paid' : 'Payable'}
            </Text>
            <Text
              style={[
                styles.grandTotalVal,
                {
                  color: theme.colors.primaryDarker,
                  fontSize: theme.typography.size.lg,
                  fontWeight: theme.typography.weight.extrabold,
                },
              ]}
            >
              {formatCurrency(order.total)}
            </Text>
          </View>
        </View>

        {/* Cancel Order Button if eligible */}
        {canCancel && (
          <View style={{ marginTop: 8, marginBottom: 24 }}>
            <AppButton
              title="Cancel Order"
              onPress={() => setCancelModalVisible(true)}
              variant="danger"
              size="md"
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel Order Confirmation Modal */}
      <ConfirmationModal
        visible={cancelModalVisible}
        title="Cancel This Order?"
        message="Are you sure you want to cancel this order? This action cannot be reversed."
        confirmText="Yes, Cancel"
        confirmVariant="danger"
        iconName="close-circle-outline"
        onConfirm={handleCancelOrder}
        onCancel={() => setCancelModalVisible(false)}
      />

      {/* Toast Feedback Message */}
      <ToastMessage
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="info"
        onDismiss={() => setToastMessage(null)}
      />

      {/* Dual-Engine Razorpay In-App Checkout Modal */}
      <RazorpayCheckoutModal
        visible={checkoutModalVisible}
        options={checkoutOptions}
        onSuccess={(data) => handlePaymentSuccess(data, activeRazorpayOrderId)}
        onError={(err) => handlePaymentFailure(err, activeRazorpayOrderId)}
        onClose={() => setCheckoutModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  pendingPaymentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  pendingSub: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  sectionTitle: {},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    width: 56,
    height: 56,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemBrand: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemName: {},
  itemVariant: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPriceCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemTotal: {},
  itemUnitPrice: {
    fontSize: 11,
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    marginVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  grandTotalLabel: {},
  grandTotalVal: {},
});
