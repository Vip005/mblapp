import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { AppHeader } from '../../components/common/AppHeader';
import { CartItemCard } from '../../components/cart/CartItemCard';
import { BillBreakdownCard } from '../../components/cart/BillBreakdownCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';
import { AppButton } from '../../components/common/AppButton';
import { formatCurrency } from '../../utils/formatters';

export const CartScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { items, summary, itemCount, clearCart, isLoading, refreshCart } = useCart();

  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCart();
    setRefreshing(false);
  };

  const handleProceedToCheckout = () => {
    if (!isLoggedIn) {
      navigation.navigate('Auth');
      return;
    }
    navigation.navigate('Checkout');
  };

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="My Cart" showBack={false} />
        <LoadingState message="Syncing cart with store..." />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="My Cart" showBack={false} />
        <EmptyState
          iconName="cart-outline"
          title="Your Cart is Empty"
          description="Looks like you haven't added any groceries to your cart yet. Explore our fresh seasonal produce!"
          buttonLabel="Start Shopping"
          onButtonPress={() =>
  navigation.navigate('Main', {
    screen: 'HomeTab',
  })
}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="My Cart"
        subtitle={`${itemCount} items`}
        showBack={false}
        rightAction={
          <TouchableOpacity
            onPress={() => setClearModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Cart Item Cards */}
        <View style={styles.itemsSection}>
          {items.map((item) => (
            <CartItemCard key={item.id} item={item} />
          ))}
        </View>

        {/* Bill Breakdown with Coupons */}
        <BillBreakdownCard summary={summary} showCouponInput />

        {/* Cancellation policy note */}
        <View style={styles.policyCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.policyText, { color: theme.colors.textSecondary }]}>
            100% Quality Guaranteed • Hassle-free returns at delivery doorstep if items are damaged or unsatisfactory.
          </Text>
        </View>

        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      {/* Floating Bottom Checkout Bar */}
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
        <View style={styles.totalCol}>
          <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}>
            Total to Pay
          </Text>
          <Text
            style={[
              styles.totalAmount,
              {
                color: theme.colors.primaryDarker,
                fontSize: theme.typography.size.xl,
                fontWeight: theme.typography.weight.extrabold,
              },
            ]}
          >
            {formatCurrency(summary.total)}
          </Text>
        </View>

        <View style={styles.checkoutBtnWrapper}>
          <AppButton
            title="Proceed to Checkout"
            onPress={handleProceedToCheckout}
            size="lg"
            variant="primary"
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFF" />}
          />
        </View>
      </View>

      {/* Clear Cart Confirmation Modal */}
      <ConfirmationModal
        visible={clearModalVisible}
        title="Clear Entire Cart?"
        message="Are you sure you want to remove all items from your grocery cart?"
        confirmText="Clear Cart"
        confirmVariant="danger"
        onConfirm={() => {
          clearCart();
          setClearModalVisible(false);
        }}
        onCancel={() => setClearModalVisible(false)}
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
  itemsSection: {
    marginBottom: 8,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginTop: 8,
  },
  policyText: {
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
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
  totalCol: {
    marginRight: 16,
  },
  totalLabel: {
    fontSize: 11,
  },
  totalAmount: {
    marginTop: 2,
    letterSpacing: -0.4,
  },
  checkoutBtnWrapper: {
    flex: 1,
  },
});
