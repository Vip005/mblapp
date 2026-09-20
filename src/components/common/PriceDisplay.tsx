import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';

interface PriceDisplayProps {
  sellingPrice: number;
  originalPrice?: number;
  discount?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDiscountBadge?: boolean;
  style?: ViewStyle;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  sellingPrice,
  originalPrice,
  discount,
  size = 'md',
  showDiscountBadge = true,
  style,
}) => {
  const { theme } = useTheme();

  const getFontSizes = () => {
    switch (size) {
      case 'xl':
        return { main: 24, strike: 16, badge: 12 };
      case 'lg':
        return { main: 18, strike: 13, badge: 11 };
      case 'sm':
        return { main: 13, strike: 11, badge: 9 };
      case 'md':
      default:
        return { main: 15, strike: 12, badge: 10 };
    }
  };

  const { main, strike, badge } = getFontSizes();
  const hasDiscount = Boolean(originalPrice && originalPrice > sellingPrice);
  const calculatedDiscount =
    discount ?? (hasDiscount && originalPrice ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0);

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[
          styles.sellingPrice,
          {
            color: theme.colors.textPrimary,
            fontSize: main,
            fontWeight: theme.typography.weight.bold,
          },
        ]}
      >
        {formatCurrency(sellingPrice)}
      </Text>

      {hasDiscount && originalPrice ? (
        <Text
          style={[
            styles.originalPrice,
            {
              color: theme.colors.textMuted,
              fontSize: strike,
            },
          ]}
        >
          {formatCurrency(originalPrice)}
        </Text>
      ) : null}

      {showDiscountBadge && hasDiscount && calculatedDiscount > 0 ? (
        <View
          style={[
            styles.discountBadge,
            {
              backgroundColor: theme.colors.successLight,
              borderRadius: theme.borderRadius.xs,
            },
          ]}
        >
          <Text
            style={[
              styles.discountText,
              {
                color: theme.colors.primaryDark,
                fontSize: badge,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            {calculatedDiscount}% OFF
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sellingPrice: {
    letterSpacing: -0.2,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  discountBadge: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  discountText: {
    textAlign: 'center',
  },
});
