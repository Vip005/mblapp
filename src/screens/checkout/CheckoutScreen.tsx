import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RootStackParamList,
  Address,
  DeliverySlot,
  PaymentMethodType,
  OrderItem,
} from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useStore } from '../../hooks/useStore';
import { useAddress } from '../../hooks/useAddress';
import { useOrders } from '../../hooks/useOrders';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { DeliverySlotPicker } from '../../components/order/DeliverySlotPicker';
import { PaymentMethodPicker } from '../../components/order/PaymentMethodPicker';
import { BillBreakdownCard } from '../../components/cart/BillBreakdownCard';
import { AddressFormModal } from '../../components/modals/AddressFormModal';
import { deliverySlots } from '../../data/deliverySlots';
import { paymentMethods } from '../../data/paymentMethods';
import { formatCurrency } from '../../utils/formatters';

const STEPS = [
  { id: 1, title: 'Address', icon: 'location-outline' },
  { id: 2, title: 'Delivery', icon: 'time-outline' },
  { id: 3, title: 'Payment', icon: 'card-outline' },
  { id: 4, title: 'Summary', icon: 'receipt-outline' },
];

export const CheckoutScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      navigation.replace('Auth');
    }
  }, [isLoggedIn, navigation]);

  const { items, summary, clearCart, cartStoreId } = useCart();
  const { selectedStoreId } = useStore();
  const { addresses, selectedAddress, selectAddress, addAddress } = useAddress();
  const { placeOrder } = useOrders();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot>(deliverySlots[0]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>('cod');
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const handleNextStep = () => {
    if (isPlacingOrder) return;
    if (currentStep === 1 && !selectedAddress) {
      Alert.alert('Address Required', 'Please select or add a delivery address.');
      return;
    }
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
    } else {
      handlePlaceOrder();
    }
  };

  const handlePlaceOrder = async () => {
    if (isPlacingOrder) return;
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select or add a delivery address.');
      return;
    }
    if (selectedPayment !== 'cod') {
      Alert.alert(
        'Payment Unavailable',
        'Online payment is currently unavailable. Please choose Cash on Delivery.'
      );
      return;
    }
    if (!items || items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items before checkout.');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderItems: OrderItem[] = items.map((i) => ({
        id: `oi-${Date.now()}-${i.productId}`,
        productId: i.productId,
        variantId: i.variantId || i.variant?.id,
        productName: i.product.name,
        brand: i.product.brand,
        image: i.product.image,
        variantName: i.variant.name,
        quantity: i.quantity,
        price: i.price,
        totalPrice: i.totalPrice,
      }));

      const newOrder = await placeOrder({
        items: orderItems,
        subtotal: summary.subtotal,
        discount: summary.productDiscount,
        couponDiscount: summary.couponDiscount,
        deliveryCharge: summary.deliveryCharge,
        tax: summary.tax,
        total: summary.total,
        address: selectedAddress,
        deliverySlot: selectedSlot,
        paymentMethod: selectedPayment,
        appliedCoupon: summary.appliedCoupon,
        storeId: cartStoreId || selectedStoreId || undefined,
      });

      // Clear the cart strictly AFTER the complete order placement has succeeded
      try {
        await clearCart();
      } catch (cartErr: any) {
        console.warn('[ORDER DEBUG] Cart clear warning:', cartErr.message);
      }

      // Navigate to order success screen with navigation error tagging
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'OrderSuccess', params: { orderId: newOrder.id } }],
        });
      } catch (navErr: any) {
        throw new Error(
          `Order placement succeeded (Order #${newOrder.orderNumber || newOrder.id}), but failed at navigation: ${navErr.message}`
        );
      }
    } catch (e: any) {
      console.warn('Failed to place order:', e);
      Alert.alert(
        'Order Failed',
        e?.message || 'Failed to place your order. Please try again. Your cart has been preserved.'
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Checkout"
        subtitle={`Step ${currentStep} of 4: ${STEPS[currentStep - 1].title}`}
        onBack={() => {
          if (currentStep > 1) {
            setCurrentStep((s) => s - 1);
          } else {
            navigation.goBack();
          }
        }}
      />

      {/* Stepper Header Tabs */}
      <View style={[styles.stepperContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
        {STEPS.map((step) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <TouchableOpacity
              key={step.id}
              disabled={step.id > currentStep}
              onPress={() => setCurrentStep(step.id)}
              style={styles.stepItem}
            >
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: isDone
                      ? theme.colors.primary
                      : isCurrent
                      ? theme.colors.primaryLight
                      : theme.colors.background,
                    borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      {
                        color: isCurrent ? theme.colors.primaryDark : theme.colors.textMuted,
                        fontWeight: isCurrent ? '700' : '500',
                      },
                    ]}
                  >
                    {step.id}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  {
                    color: isCurrent ? theme.colors.primaryDarker : isDone ? theme.colors.textPrimary : theme.colors.textMuted,
                    fontWeight: isCurrent ? '700' : '500',
                  },
                ]}
              >
                {step.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: ADDRESS SELECTION */}
        {currentStep === 1 && (
          <View style={styles.stepSection}>
            <View style={styles.sectionTitleRow}>
              <Text
                style={[
                  styles.sectionHeading,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.md,
                    fontWeight: theme.typography.weight.bold,
                  },
                ]}
              >
                Select Delivery Address
              </Text>

              <TouchableOpacity
                onPress={() => setAddressModalVisible(true)}
                style={styles.addNewAddressBtn}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.addNewAddressText, { color: theme.colors.primary }]}>
                  Add New
                </Text>
              </TouchableOpacity>
            </View>

            {addresses.map((addr) => {
              const isSelected = selectedAddress?.id === addr.id;

              return (
                <TouchableOpacity
                  key={addr.id}
                  activeOpacity={0.8}
                  onPress={() => selectAddress(addr)}
                  style={[
                    styles.addressCard,
                    {
                      backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      borderRadius: theme.borderRadius.lg,
                      ...theme.shadows.sm,
                    },
                  ]}
                >
                  <View style={styles.addressHeaderRow}>
                    <View style={styles.addressTypeBadge}>
                      <Ionicons
                        name={addr.type === 'Home' ? 'home' : addr.type === 'Work' ? 'briefcase' : 'location'}
                        size={14}
                        color={theme.colors.primaryDark}
                      />
                      <Text style={[styles.addressTypeText, { color: theme.colors.primaryDark }]}>
                        {addr.type.toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioDot, { backgroundColor: theme.colors.primary }]} />
                      )}
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.addrName,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.size.sm,
                        fontWeight: theme.typography.weight.bold,
                      },
                    ]}
                  >
                    {addr.name} • {addr.phone}
                  </Text>

                  <Text
                    style={[
                      styles.addrDetails,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.size.xs,
                      },
                    ]}
                  >
                    {addr.doorFlat}, {addr.street}, {addr.area}, {addr.city} - {addr.pincode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* STEP 2: DELIVERY SLOT */}
        {currentStep === 2 && (
          <View style={styles.stepSection}>
            <Text
              style={[
                styles.sectionHeading,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.md,
                  fontWeight: theme.typography.weight.bold,
                  marginBottom: 12,
                },
              ]}
            >
              Choose Delivery Slot
            </Text>

            <DeliverySlotPicker
              slots={deliverySlots}
              selectedSlotId={selectedSlot.id}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
            />
          </View>
        )}

        {/* STEP 3: PAYMENT METHOD */}
        {currentStep === 3 && (
          <View style={styles.stepSection}>
            <Text
              style={[
                styles.sectionHeading,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.md,
                  fontWeight: theme.typography.weight.bold,
                  marginBottom: 12,
                },
              ]}
            >
              Select Payment Method
            </Text>

            <PaymentMethodPicker
              methods={paymentMethods}
              selectedMethod={selectedPayment}
              onSelectMethod={(m) => {
                if (m !== 'cod') {
                  Alert.alert(
                    'Payment Unavailable',
                    'Online payment is currently unavailable. Please choose Cash on Delivery.'
                  );
                  setSelectedPayment('cod');
                } else {
                  setSelectedPayment(m);
                }
              }}
            />
          </View>
        )}

        {/* STEP 4: ORDER REVIEW & SUMMARY */}
        {currentStep === 4 && (
          <View style={styles.stepSection}>
            <Text
              style={[
                styles.sectionHeading,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.md,
                  fontWeight: theme.typography.weight.bold,
                  marginBottom: 12,
                },
              ]}
            >
              Review Your Order
            </Text>

            {/* Address & Slot summary card */}
            <View
              style={[
                styles.summaryMetaCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                  borderRadius: theme.borderRadius.lg,
                  ...theme.shadows.sm,
                },
              ]}
            >
              <View style={styles.summaryMetaRow}>
                <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.summaryMetaTitle, { color: theme.colors.textPrimary }]}>
                    Delivering to {selectedAddress?.type} ({selectedAddress?.name})
                  </Text>
                  <Text style={[styles.summaryMetaSub, { color: theme.colors.textSecondary }]}>
                    {selectedAddress?.doorFlat}, {selectedAddress?.street}, {selectedAddress?.city}
                  </Text>
                </View>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.summaryMetaRow}>
                <Ionicons name="time-outline" size={18} color={theme.colors.secondary} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.summaryMetaTitle, { color: theme.colors.textPrimary }]}>
                    Delivery Slot: {selectedSlot.dateLabel}
                  </Text>
                  <Text style={[styles.summaryMetaSub, { color: theme.colors.textSecondary }]}>
                    {selectedSlot.timeWindow}
                  </Text>
                </View>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.summaryMetaRow}>
                <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.summaryMetaTitle, { color: theme.colors.textPrimary }]}>
                    Payment: {paymentMethods.find((p) => p.id === selectedPayment)?.title}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bill Details */}
            <BillBreakdownCard summary={summary} showCouponInput={false} />
          </View>
        )}

        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderLight,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            ...theme.shadows.lg,
          },
        ]}
      >
        <View style={styles.totalBox}>
          <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}>Total to Pay</Text>
          <Text
            style={[
              styles.totalVal,
              {
                color: theme.colors.primaryDarker,
                fontSize: theme.typography.size.lg,
                fontWeight: theme.typography.weight.extrabold,
              },
            ]}
          >
            {formatCurrency(summary.total)}
          </Text>
        </View>

        <View style={styles.btnBox}>
          <AppButton
            title={currentStep === 4 ? 'Place Order' : 'Continue'}
            onPress={handleNextStep}
            loading={isPlacingOrder}
            disabled={isPlacingOrder}
            size="lg"
            variant="primary"
            rightIcon={
              currentStep === 4 ? (
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              ) : (
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              )
            }
          />
        </View>
      </View>

      {/* Add New Address Modal */}
      <AddressFormModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSubmit={async (data) => {
          await addAddress(data);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNumber: {
    fontSize: 12,
  },
  stepTitle: {
    fontSize: 11,
  },
  bodyContent: {
    padding: 16,
  },
  stepSection: {},
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeading: {},
  addNewAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addNewAddressText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  addressCard: {
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#D1FAE5',
    borderRadius: 4,
  },
  addressTypeText: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  addrName: {
    marginBottom: 4,
  },
  addrDetails: {
    lineHeight: 18,
  },
  summaryMetaCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 10,
  },
  summaryMetaTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryMetaSub: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalBox: {
    marginRight: 16,
  },
  totalLabel: {
    fontSize: 11,
  },
  totalVal: {
    marginTop: 2,
  },
  btnBox: {
    flex: 1,
  },
});
