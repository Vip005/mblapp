import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
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
import { orderHub, OrderStatusUpdatedEvent } from '../../services/realtime/orderHub';
import { mapBackendStatusToOrderStatus, getUpdatedTrackingSteps } from '../../services/api/adapters';
import { orderService } from '../../services/api/orderService';

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
            }
          : contextOrder
      );
    }
  }, [contextOrder]);

  // Initial REST fetch to guarantee authoritative and fresh order state
  useEffect(() => {
    let isMounted = true;

    const loadAuthoritativeOrder = async () => {
      try {
        if (!contextOrder) {
          setIsLoadingOrder(true);
        }
        const fetched = await orderService.getOrderById(orderId);
        if (isMounted && fetched) {
          setOrder(fetched);
          updateOrder(fetched);
        }
      } catch (err: any) {
        console.warn('[OrderTracking] Initial REST order fetch failed:', err?.message ?? err);
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

  // SignalR real-time updates lifecycle
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

    let isSubscribed = true;

    const initSignalR = async () => {
      try {
        await orderHub.connect();
        if (!isSubscribed) return;

        orderHub.onStatusUpdated(handleStatusUpdate);
        await orderHub.joinOrder(numericOrderId);
      } catch (err: any) {
        console.warn('[OrderTracking] SignalR subscription error:', err?.message ?? err);
      }
    };

    initSignalR();

    return () => {
      isSubscribed = false;
      orderHub.offStatusUpdated(handleStatusUpdate);
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

  const canCancel = order.status === 'Placed' || order.status === 'Confirmed';

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await cancelOrder(order.id);
      setCancelModalVisible(false);
      setToastMessage('Order has been cancelled successfully');
    } catch (e) {
      console.warn('Failed to cancel order:', e);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={`Order #${order.orderNumber}`} subtitle={formatDate(order.date)} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              {/* <Text style={[styles.estimatedText, { color: theme.colors.primaryDark }]}>
                {order.estimatedDelivery}
              </Text> */}
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
            Items in Order ({order.items.length})
          </Text>

          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <SafeImage
                uri={item.image}
                style={styles.itemImage}
                resizeMode="cover"
                fallbackIcon="basket-outline"
                fallbackIconSize={20}
              />
              <View style={styles.itemInfo}>
                <Text numberOfLines={1} style={[styles.itemName, { color: theme.colors.textPrimary }]}>
                  {item.productName}
                </Text>
                <Text style={[styles.itemVariant, { color: theme.colors.textSecondary }]}>
                  {item.variantName} • Qty: {item.quantity}
                </Text>
                <Text style={[styles.itemPrice, { color: theme.colors.textPrimary }]}>
                  {formatCurrency(item.price)} each
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: theme.colors.primaryDarker }]}>
                {formatCurrency(item.totalPrice)}
              </Text>
            </View>
          ))}
        </View>

        {/* Shipping Address & Slot */}
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
            Delivery Details
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

          {/* <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={theme.colors.secondary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.detailTitle, { color: theme.colors.textPrimary }]}>
                Slot: {order.deliverySlot.dateLabel} ({order.deliverySlot.timeWindow})
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} /> */}

          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.detailTitle, { color: theme.colors.textPrimary }]}>
                Payment Mode: {order.paymentMethod.toUpperCase()}
              </Text>
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

          {order.discount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: theme.colors.primaryDark }]}>Product Discount</Text>
              <Text style={[styles.billValue, { color: theme.colors.primaryDark }]}>
                -{formatCurrency(order.discount)}
              </Text>
            </View>
          )}

          {order.couponDiscount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: theme.colors.primaryDark }]}>
                Coupon Discount {order.appliedCoupon?.code ? `(${order.appliedCoupon.code})` : ''}
              </Text>
              <Text style={[styles.billValue, { color: theme.colors.primaryDark }]}>
                -{formatCurrency(order.couponDiscount)}
              </Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: theme.colors.textSecondary }]}>Delivery Charges</Text>
            <Text style={[styles.billValue, { color: theme.colors.textPrimary }]}>
              {order.deliveryCharge === 0 ? 'FREE' : formatCurrency(order.deliveryCharge)}
            </Text>
          </View>

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
              Total Paid
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

      <ToastMessage
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="info"
        onDismiss={() => setToastMessage(null)}
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
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  estimatedText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  sectionTitle: {},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemVariant: {
    fontSize: 11,
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 11,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailSub: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
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

export const OrderTrackingScreen = OrderDetailsScreen;
