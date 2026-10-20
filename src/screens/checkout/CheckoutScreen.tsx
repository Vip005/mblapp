import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RootStackParamList,
  Address,
  PaymentMethodType,
  OrderItem,
  Order,
  PaymentPublicConfigDto,
  CheckoutSessionCreateResponseDto,
  CheckoutSessionItemDto,
  CheckoutPaymentVerifyResponseDto,
} from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useStore } from '../../hooks/useStore';
import { useAddress } from '../../hooks/useAddress';
import { useOrders } from '../../hooks/useOrders';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { PaymentMethodPicker } from '../../components/order/PaymentMethodPicker';
import { BillBreakdownCard } from '../../components/cart/BillBreakdownCard';
import { AddressFormModal } from '../../components/modals/AddressFormModal';
import { RazorpayCheckoutModal } from '../../components/payment/RazorpayCheckoutModal';
import {
  isNativeRazorpayAvailable,
  openNativeRazorpayCheckout,
  RazorpayCheckoutOptions,
  RazorpaySuccessResponse,
  RazorpayErrorResponse,
} from '../../services/payment/razorpayGateway';
import { paymentService } from '../../services/api/paymentService';
import {
  getSafeUserErrorMessage,
  sanitizeDevLog,
  isTechnicalOrUnsafeMessage,
} from '../../utils/apiError';
import { orderService } from '../../services/api/orderService';
import { mapOrder } from '../../services/api/adapters';
import { paymentMethods } from '../../data/paymentMethods';
import { formatCurrency } from '../../utils/formatters';

const STEPS = [
  { id: 1, title: 'Address', icon: 'location-outline' },
  { id: 2, title: 'Payment', icon: 'card-outline' },
  { id: 3, title: 'Summary', icon: 'receipt-outline' },
];

export const CheckoutScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      navigation.replace('Auth');
    }
  }, [isLoggedIn, navigation]);

  const { items, summary, clearCart, cartStoreId } = useCart();
  const { selectedStoreId } = useStore();
  const { addresses, selectedAddress, selectAddress, addAddress } = useAddress();
  const { placeOrder, updateOrder, addOrder } = useOrders();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>('razorpay');
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [isRecoveringStatus, setIsRecoveringStatus] = useState(false);

  // Runtime Payment Gateway State
  const [paymentConfig, setPaymentConfig] = useState<PaymentPublicConfigDto | null>(null);
  const [isLoadingPaymentConfig, setIsLoadingPaymentConfig] = useState(false);

  // Guard against rapid duplicate taps
  const isSubmittingRef = useRef(false);

  // WebView Fallback Modal State (Expo Go / Standard environment)
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [activeCheckoutOptions, setActiveCheckoutOptions] = useState<RazorpayCheckoutOptions | null>(null);
  const [activeCheckoutSession, setActiveCheckoutSession] = useState<CheckoutSessionCreateResponseDto | null>(null);

  const currentStoreId = cartStoreId || selectedStoreId || null;

  // Load public payment gateway configuration dynamically from backend
  const loadPaymentConfig = useCallback(async () => {
    try {
      setIsLoadingPaymentConfig(true);
      const config = await paymentService.getPaymentConfig(currentStoreId);
      setPaymentConfig(config);

      // If gateway is disabled, fallback immediately to COD
      if (!config.isEnabled) {
        setSelectedPayment('cod');
      } else {
        setSelectedPayment('razorpay');
      }
    } catch (err: any) {
      console.warn('[Checkout] Failed to load payment config:', err?.message || err);
      setPaymentConfig(null);
      setSelectedPayment('cod');
    } finally {
      setIsLoadingPaymentConfig(false);
    }
  }, [currentStoreId]);

  useEffect(() => {
    loadPaymentConfig();
  }, [loadPaymentConfig]);

  const handleNextStep = () => {
    if (isPlacingOrder || isVerifyingPayment || isRecoveringStatus) return;
    if (currentStep === 1 && !selectedAddress) {
      Alert.alert('Address Required', 'Please select or add a delivery address.');
      return;
    }
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
    } else {
      handlePlaceOrder();
    }
  };

  /**
   * Handle payment verification after Razorpay success callback.
   * Treats backend verification response as authoritative.
   * OrderMaster is created on backend during verify-checkout.
   */
  const handlePaymentSuccess = async (
    razorpayData: RazorpaySuccessResponse,
    session: CheckoutSessionCreateResponseDto
  ) => {
    setIsVerifyingPayment(true);
    setCheckoutModalVisible(false);

    try {
      let verifyResult: CheckoutPaymentVerifyResponseDto;

      try {
        verifyResult = await paymentService.verifyCheckoutPayment({
          attemptToken: session.attemptToken,
          razorpayOrderId: session.razorpayOrderId,
          razorpayPaymentId: razorpayData.razorpay_payment_id,
          razorpaySignature: razorpayData.razorpay_signature,
        });
      } catch (verifyErr: any) {
        // Network timeout / offline interruption during verify:
        // Do NOT fail immediately! Poll the authoritative status endpoint to recover.
        console.warn('[Checkout] Verification network exception, attempting status recovery:', verifyErr?.message);
        setIsRecoveringStatus(true);
        const recoveredAttempt = await paymentService.recoverCheckoutStatus(session.attemptToken, 3, 2000);

        verifyResult = {
          isSuccess: recoveredAttempt.status === 'OrderCreated',
          status: recoveredAttempt.status,
          orderID: recoveredAttempt.orderID,
          orderNumber: recoveredAttempt.orderNumber,
          message: recoveredAttempt.failureReason || null,
          isDuplicate: false,
          orderDetails: recoveredAttempt.orderDetails,
          amountInPaise: recoveredAttempt.amountInPaise,
        };
      }

      // Authoritative Backend Status Evaluation
      if (
        verifyResult.status === 'OrderCreated' &&
        verifyResult.orderID &&
        Number(verifyResult.orderID) > 0
      ) {
        // 1. Construct or map Order object
        let confirmedOrder: Order;
        if (verifyResult.orderDetails?.order) {
          confirmedOrder = mapOrder(
            verifyResult.orderDetails.order,
            verifyResult.orderDetails.items || []
          );
        } else {
          // Construct local Order from cart data and verified IDs
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

          confirmedOrder = {
            id: String(verifyResult.orderID),
            orderNumber: verifyResult.orderNumber || `ORD-${verifyResult.orderID}`,
            date: new Date().toISOString(),
            status: 'Confirmed',
            subtotal: summary.subtotal,
            discount: 0,
            couponDiscount: summary.couponDiscount,
            deliveryCharge: session.deliveryFee,
            platformFee: session.platformFee,
            tax: session.taxes,
            total: session.grandTotal,
            address: selectedAddress!,
            items: orderItems,
            paymentMethod: 'razorpay',
            paymentStatus: 'Paid',
            paymentMode: 'RAZORPAY',
            appliedCoupon: summary.appliedCoupon,
            storeId: currentStoreId ? Number(currentStoreId) : undefined,
            trackingSteps: [
              { status: 'Placed', label: 'Order Placed', date: 'Just now', completed: true, current: false },
              { status: 'Confirmed', label: 'Order Confirmed', date: 'Just now', completed: true, current: true },
              { status: 'Preparing', label: 'Packed & Dispatched', completed: false, current: false },
              { status: 'Out for Delivery', label: 'Out for Delivery', completed: false, current: false },
              { status: 'Delivered', label: 'Delivered', completed: false, current: false },
            ],
          };
        }

        // 2. Persist order in customer storage & context
        await orderService.saveVerifiedOrder(confirmedOrder, user?.id);
        addOrder(confirmedOrder);

        // 3. Clear cart strictly after verified OrderCreated confirmation
        try {
          await clearCart();
        } catch (cartErr: any) {
          console.warn('[Checkout] Cart clear warning:', cartErr?.message);
        }

        // 4. Navigate to OrderSuccess
        navigation.reset({
          index: 0,
          routes: [{ name: 'OrderSuccess', params: { orderId: String(verifyResult.orderID) } }],
        });
      } else if (verifyResult.status === 'ReconciliationRequired') {
        // Payment was captured by gateway, but order creation encountered a concurrency or inventory issue.
        // Backend recovery worker will issue a full refund or order will be reconciled.
        // Cart is PRESERVED.
        Alert.alert(
          'Order Under Verification',
          'Your payment was received, but stock reservation could not complete immediately. Our system has automatically enqueued a full refund or our support team will fulfill your order shortly. Your cart has been preserved.',
          [
            {
              text: 'View Orders',
              onPress: () => navigation.replace('Main', { screen: 'OrdersTab' } as any),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else if (verifyResult.status === 'Refunded') {
        // Attempt was refunded because items could not be fulfilled
        Alert.alert(
          'Payment Refunded',
          'Your payment has been refunded as the requested items could not be reserved. Your cart has been preserved for you to try again.',
          [{ text: 'OK', style: 'cancel' }]
        );
      } else if (verifyResult.status === 'PaymentProcessing') {
        Alert.alert(
          'Payment Processing',
          'Your payment is currently being confirmed with the bank. Please check your Orders page in a moment. Your cart is preserved.',
          [
            {
              text: 'Check Orders',
              onPress: () => navigation.replace('Main', { screen: 'OrdersTab' } as any),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        // PaymentFailed or other error
        const safeReason =
          verifyResult.message && !isTechnicalOrUnsafeMessage(verifyResult.message)
            ? verifyResult.message
            : 'Payment verification could not be confirmed. Your cart has been preserved.';
        Alert.alert(
          'Payment Not Completed',
          safeReason,
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    } catch (err: any) {
      sanitizeDevLog('CheckoutScreen.handlePaymentSuccess', err);
      Alert.alert(
        'Payment Verification Pending',
        'We were unable to confirm order creation right now due to a network interruption. Your cart has been preserved. Please check your Orders list before attempting to pay again.',
        [
          {
            text: 'Check Orders',
            onPress: () => navigation.replace('Main', { screen: 'OrdersTab' } as any),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } finally {
      setIsVerifyingPayment(false);
      setIsRecoveringStatus(false);
      setIsPlacingOrder(false);
      isSubmittingRef.current = false;
    }
  };

  /**
   * Handle payment failure or dismissal callback
   */
  const handlePaymentError = async (
    error: RazorpayErrorResponse,
    session: CheckoutSessionCreateResponseDto
  ) => {
    setCheckoutModalVisible(false);
    setIsPlacingOrder(false);
    isSubmittingRef.current = false;

    try {
      await paymentService.failCheckoutPayment({
        attemptToken: session.attemptToken,
        razorpayOrderId: session.razorpayOrderId,
        failureCode: String(error.code),
        failureReason: error.description,
      });
    } catch (recordErr: any) {
      sanitizeDevLog('CheckoutScreen.failCheckoutPayment', recordErr);
    }

    const safeDescription =
      error.description && !isTechnicalOrUnsafeMessage(error.description)
        ? error.description
        : 'Payment was cancelled or could not be processed.';

    Alert.alert(
      'Payment Not Completed',
      `${safeDescription}\n\nYour cart has been preserved.`,
      [
        {
          text: 'Switch to COD',
          onPress: () => {
            setSelectedPayment('cod');
            setCurrentStep(2);
          },
        },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  /**
   * Main order submission handler
   */
  const handlePlaceOrder = async () => {
    if (isSubmittingRef.current || isPlacingOrder || isVerifyingPayment || isRecoveringStatus) {
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select or add a delivery address.');
      return;
    }

    if (!items || items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items before checkout.');
      return;
    }

    isSubmittingRef.current = true;
    setIsPlacingOrder(true);

    try {
      const isOnline = selectedPayment !== 'cod';

      // ==========================================
      // CASH ON DELIVERY (COD) FLOW
      // ==========================================
      if (!isOnline) {
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
          discount: 0,
          couponDiscount: summary.couponDiscount,
          deliveryCharge: summary.deliveryCharge,
          platformFee: summary.platformFee,
          tax: summary.tax,
          total: summary.total,
          address: selectedAddress,
          paymentMethod: 'cod',
          appliedCoupon: summary.appliedCoupon,
          storeId: currentStoreId ? Number(currentStoreId) : undefined,
        });

        // Clear cart strictly after verified order placement
        try {
          await clearCart();
        } catch (cartErr: any) {
          console.warn('[Checkout] Cart clear warning:', cartErr.message);
        }

        navigation.reset({
          index: 0,
          routes: [{ name: 'OrderSuccess', params: { orderId: newOrder.id } }],
        });
        return;
      }

      // ==========================================
      // PAYMENT-FIRST ONLINE FLOW (RAZORPAY)
      // ==========================================
      if (!paymentConfig || !paymentConfig.isEnabled) {
        Alert.alert(
          'Online Payment Unavailable',
          'Online payments are currently unavailable for this store. Please select Cash on Delivery.'
        );
        setSelectedPayment('cod');
        return;
      }

      const keyValidation = paymentService.validateKeyPrefix(
        paymentConfig.publicKeyId,
        paymentConfig.mode
      );
      if (!keyValidation.isValid) {
        Alert.alert(
          'Payment Gateway Configuration Error',
          keyValidation.error || 'Invalid payment credentials configured on server.'
        );
        return;
      }

      // 1. Prepare checkout session items
      const sessionItems: CheckoutSessionItemDto[] = items.map((i) => ({
        productID: parseInt(i.productId, 10),
        productVariantID: parseInt(i.variantId || (i.variant?.id ?? '0'), 10),
        productName: i.product.name,
        variantLabel: i.variant?.name || 'Standard',
        price: Number(i.price),
        quantity: i.quantity,
        total: Number((Number(i.price) * i.quantity).toFixed(2)),
      }));

      // 2. Create payment-first checkout session (OrderMaster is NOT created here)
      const session = await paymentService.createCheckoutSession({
        storeID: Number(currentStoreId),
        addressId: parseInt(selectedAddress.id, 10),
        items: sessionItems,
        clientGrandTotal: summary.total,
        clientAmountInPaise: Math.round(summary.total * 100),
        couponCode: summary.appliedCoupon?.code || null,
      });

      setActiveCheckoutSession(session);

      // Validate runtime key consistency
      const createdKeyVal = paymentService.validateKeyPrefix(
        session.publicKeyId,
        session.mode
      );
      if (!createdKeyVal.isValid) {
        throw new Error(createdKeyVal.error || 'Invalid public key received from checkout session.');
      }

      // 3. Prepare Razorpay Options
      const options: RazorpayCheckoutOptions = {
        key: session.publicKeyId,
        amount: session.amountInPaise,
        currency: session.currency || 'INR',
        name: 'FreshMart',
        description: `Order Checkout (${session.attemptToken.substring(0, 8)})`,
        order_id: session.razorpayOrderId,
        prefill: {
          name: user?.name || selectedAddress.name || '',
          contact: user?.phone || selectedAddress.phone || '',
          email: user?.email || '',
        },
        theme: {
          color: '#059669',
        },
      };

      // 4. Launch Razorpay
      if (isNativeRazorpayAvailable()) {
        try {
          const nativeRes = await openNativeRazorpayCheckout(options);
          await handlePaymentSuccess(nativeRes, session);
        } catch (err: any) {
          await handlePaymentError(err, session);
        }
      } else {
        setActiveCheckoutOptions(options);
        setCheckoutModalVisible(true);
        // Release placing flag so modal interactions are active
        setIsPlacingOrder(false);
        isSubmittingRef.current = false;
      }
    } catch (e: any) {
      sanitizeDevLog('CheckoutScreen.initiateSession', e);
      setIsPlacingOrder(false);
      isSubmittingRef.current = false;
      Alert.alert(
        'Checkout Failed',
        getSafeUserErrorMessage(e, 'checkout')
      );
    }
  };

  const isOnlineSelected = selectedPayment !== 'cod';
  const isOnlineDisabled = !paymentConfig || !paymentConfig.isEnabled;
  const modeBadge =
    paymentConfig?.isEnabled && paymentConfig.mode.toLowerCase() === 'test'
      ? 'Test Mode'
      : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Checkout"
        subtitle={`Step ${currentStep} of 3: ${STEPS[currentStep - 1].title}`}
        onBack={() => {
          if (currentStep > 1) {
            setCurrentStep((s) => s - 1);
          } else {
            navigation.goBack();
          }
        }}
      />

      {/* Stepper Header Tabs */}
      <View
        style={[
          styles.stepperContainer,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
        ]}
      >
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
                    color: isCurrent
                      ? theme.colors.primaryDarker
                      : isDone
                      ? theme.colors.textPrimary
                      : theme.colors.textMuted,
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
                    {addr.name} - {addr.phone}
                  </Text>
                  <Text
                    style={[
                      styles.addrDetails,
                      { color: theme.colors.textSecondary, fontSize: theme.typography.size.xs },
                    ]}
                  >
                    {addr.doorFlat}, {addr.street}, {addr.area}, {addr.city} - {addr.pincode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* STEP 2: PAYMENT METHOD SELECTION */}
        {currentStep === 2 && (
          <View style={styles.stepSection}>
            <View style={styles.sectionTitleRow}>
              <Text
                style={[
                  styles.sectionHeading,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.md,
                    fontWeight: theme.typography.weight.bold,
                    marginBottom: 4,
                  },
                ]}
              >
                Select Payment Method
              </Text>

              {isLoadingPaymentConfig && (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              )}
            </View>

            <PaymentMethodPicker
              methods={paymentMethods}
              selectedMethod={selectedPayment}
              onSelectMethod={(m) => setSelectedPayment(m)}
              isOnlineDisabled={isOnlineDisabled}
              onlineDisabledMessage="Online payments are currently unavailable. Please choose Cash on Delivery."
              modeBadge={modeBadge}
            />
          </View>
        )}

        {/* STEP 3: ORDER REVIEW & SUMMARY */}
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
              Review Your Order
            </Text>

            {/* Address & Payment summary card */}
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
                <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
                <View style={{ marginLeft: 10, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.summaryMetaTitle, { color: theme.colors.textPrimary }]}>
                    Payment: {paymentMethods.find((p) => p.id === selectedPayment)?.title || selectedPayment.toUpperCase()}
                  </Text>
                  {isOnlineSelected && modeBadge && (
                    <View style={styles.summaryBadge}>
                      <Text style={styles.summaryBadgeText}>{modeBadge}</Text>
                    </View>
                  )}
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
            title={
              isRecoveringStatus
                ? 'Confirming Status...'
                : isVerifyingPayment
                ? 'Verifying Payment...'
                : isPlacingOrder
                ? 'Processing...'
                : currentStep === 3
                ? isOnlineSelected
                  ? 'Proceed to Pay'
                  : 'Place Order (COD)'
                : 'Continue'
            }
            onPress={handleNextStep}
            loading={isPlacingOrder || isVerifyingPayment || isRecoveringStatus}
            disabled={isPlacingOrder || isVerifyingPayment || isRecoveringStatus}
            size="lg"
            variant="primary"
            rightIcon={
              currentStep === 3 ? (
                <Ionicons
                  name={isOnlineSelected ? 'shield-checkmark' : 'checkmark-circle'}
                  size={18}
                  color="#FFF"
                />
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

      {/* Dual-Engine Razorpay In-App Checkout Modal */}
      <RazorpayCheckoutModal
        visible={checkoutModalVisible}
        options={activeCheckoutOptions}
        onSuccess={(data) => {
          if (activeCheckoutSession) {
            handlePaymentSuccess(data, activeCheckoutSession);
          }
        }}
        onError={(err) => {
          if (activeCheckoutSession) {
            handlePaymentError(err, activeCheckoutSession);
          }
        }}
        onClose={() => {
          setCheckoutModalVisible(false);
          setIsPlacingOrder(false);
          isSubmittingRef.current = false;
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
  summaryBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  summaryBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
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
