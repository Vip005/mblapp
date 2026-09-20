import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useCart } from '../../hooks/useCart';
import { QuantitySelector } from '../product/QuantitySelector';
import { formatCurrency } from '../../utils/formatters';

interface CartItemCardProps {
  item: CartItem;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';

export const CartItemCard: React.FC<CartItemCardProps> = ({ item }) => {
  const { theme } = useTheme();
  const { updateQuantity, removeItem } = useCart();
  const [imgError, setImgError] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.borderLight,
          borderRadius: theme.borderRadius.lg,
          ...theme.shadows.sm,
        },
      ]}
    >
      <View style={styles.imageBox}>
        <Image
          source={{ uri: imgError ? FALLBACK_IMAGE : item.product.image }}
          onError={() => setImgError(true)}
          style={[styles.image, { borderRadius: theme.borderRadius.md }]}
          resizeMode="cover"
        />
      </View>

      <View style={styles.infoBox}>
        <View style={styles.topRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.name,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.sm,
                fontWeight: theme.typography.weight.semibold,
              },
            ]}
          >
            {item.product.name}
          </Text>

          <TouchableOpacity
            onPress={() => removeItem(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.variantText,
            { color: theme.colors.textSecondary, fontSize: theme.typography.size.xs },
          ]}
        >
          {item.variant.name} ({formatCurrency(item.price)} each)
        </Text>

        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.totalPrice,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.md,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            {formatCurrency(item.totalPrice)}
          </Text>

          <QuantitySelector
            quantity={item.quantity}
            onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
            onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
            size="sm"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  imageBox: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoBox: {
    flex: 1,
    marginLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    paddingRight: 6,
  },
  deleteBtn: {
    padding: 2,
  },
  variantText: {
    marginTop: 2,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalPrice: {
    letterSpacing: -0.2,
  },
});
