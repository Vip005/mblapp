import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useOrders } from '../../hooks/useOrders';
import { AppButton } from '../../components/common/AppButton';
import { formatCurrency } from '../../utils/formatters';

export const OrderSuccessScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderSuccess'>>();
  const { orderId } = route.params;

  const { getOrderById } = useOrders();
  const order = getOrderById(orderId);

  const handleViewOrder = () => {
    navigation.replace('OrderDetails', { orderId });
  };

  const handleContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.centerCard}>
        {/* Animated Celebration Icon */}
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="checkmark-done" size={60} color={theme.colors.primary} />
        </View>

        <Text
          style={[
            styles.title,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.xxl,
              fontWeight: theme.typography.weight.bold,
            },
          ]}
        >
          🎉 Order Placed Successfully!
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.sm,
            },
          ]}
        >
          Thank you for choosing FreshMart! Your groceries are being packed with care.
        </Text>

        {/* Order Details Card */}
        <View
          style={[
            styles.metaBox,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
            },
          ]}
        >
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Order Number</Text>
            <Text style={[styles.metaVal, { color: theme.colors.textPrimary }]}>
              {order?.orderNumber || orderId}
            </Text>
          </View>

          {/* <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Estimated Delivery</Text>
            <Text style={[styles.metaVal, { color: theme.colors.primaryDark }]}>
              {order?.estimatedDelivery || 'Today within 2 hours'}
            </Text>
          </View> */}

          {order && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Total Amount</Text>
              <Text style={[styles.metaVal, { color: theme.colors.textPrimary }]}>
                {formatCurrency(order.total)}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.buttonsContainer}>
          {/* <AppButton
            title="View Order Details"
            onPress={handleViewOrder}
            size="lg"
            variant="primary"
            style={{ marginBottom: 12 }}
          /> */}

          <AppButton
            title="Continue Shopping"
            onPress={handleContinueShopping}
            size="lg"
            variant="outline"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerCard: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 24,
  },
  metaBox: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  metaLabel: {
    fontSize: 12,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  buttonsContainer: {
    width: '100%',
  },
});
