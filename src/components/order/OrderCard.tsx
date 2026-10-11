import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Order, OrderStatus, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from '../common/Badge';
import { SafeImage } from '../common/SafeImage';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return <Badge label="Delivered" variant="success" size="sm" />;
      case 'Out for Delivery':
        return <Badge label="Out for Delivery" variant="secondary" size="sm" />;
      case 'Cancelled':
        return <Badge label="Cancelled" variant="error" size="sm" />;
      case 'Preparing':
        return <Badge label="Preparing" variant="warning" size="sm" />;
      case 'Confirmed':
        return <Badge label="Confirmed" variant="primary" size="sm" />;
      case 'Placed':
      default:
        return <Badge label="Placed" variant="primary" size="sm" />;
    }
  };

  const handlePress = () => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
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
      <View style={styles.topRow}>
        <View>
          <Text
            style={[
              styles.orderNumber,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.sm,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            {order.orderNumber}
          </Text>
          <Text
            style={[
              styles.date,
              { color: theme.colors.textMuted, fontSize: theme.typography.size.xs },
            ]}
          >
            {formatDate(order.date)}
          </Text>
        </View>

        {getStatusBadge(order.status)}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

      {/* Items Preview */}
      <View style={styles.itemsPreviewRow}>
        <View style={styles.imagesRow}>
          {order.items.slice(0, 3).map((item, idx) => (
            <SafeImage
              key={idx}
              uri={item.image}
              style={[
                styles.itemThumb,
                { borderColor: theme.colors.surface, marginLeft: idx > 0 ? -12 : 0 },
              ]}
              resizeMode="cover"
              fallbackIcon="basket-outline"
              fallbackIconSize={16}
            />
          ))}
          {order.items.length > 3 && (
            <View
              style={[
                styles.moreItemsBadge,
                {
                  backgroundColor: theme.colors.primaryLight,
                  borderColor: theme.colors.surface,
                },
              ]}
            >
              <Text style={[styles.moreItemsText, { color: theme.colors.primaryDark }]}>
                +{order.items.length - 3}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.itemsSummaryCol}>
          <Text
            numberOfLines={1}
            style={[
              styles.itemsCount,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.xs,
              },
            ]}
          >
            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.firstItemName,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.sm,
                fontWeight: theme.typography.weight.medium,
              },
            ]}
          >
            {order.items[0]?.productName}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}>Total Amount</Text>
          <Text
            style={[
              styles.totalValue,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.md,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            {formatCurrency(order.total)}
          </Text>
        </View>

        <View style={styles.detailsBtnRow}>
          <Text
            style={[
              styles.detailsBtnText,
              {
                color: theme.colors.primary,
                fontSize: theme.typography.size.xs,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            VIEW DETAILS
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    letterSpacing: 0.2,
  },
  date: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  itemsPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: '#F1F5F9',
  },
  moreItemsBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
  },
  moreItemsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemsSummaryCol: {
    flex: 1,
  },
  itemsCount: {
    marginBottom: 2,
  },
  firstItemName: {},
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
  },
  totalValue: {
    marginTop: 2,
  },
  detailsBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsBtnText: {
    marginRight: 2,
    letterSpacing: 0.5,
  },
});
