import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface QuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: 'sm' | 'md' | 'lg';
  maxQuantity?: number;
  style?: ViewStyle;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onIncrement,
  onDecrement,
  size = 'md',
  maxQuantity = 20,
  style,
}) => {
  const { theme } = useTheme();

  const getSizes = () => {
    switch (size) {
      case 'sm':
        return { height: 28, btnWidth: 26, iconSize: 14, fontSize: 12, paddingH: 6 };
      case 'lg':
        return { height: 42, btnWidth: 40, iconSize: 18, fontSize: 16, paddingH: 12 };
      case 'md':
      default:
        return { height: 34, btnWidth: 32, iconSize: 16, fontSize: 14, paddingH: 8 };
    }
  };

  const s = getSizes();

  return (
    <View
      style={[
        styles.container,
        {
          height: s.height,
          backgroundColor: theme.colors.primary,
          borderRadius: theme.borderRadius.sm,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onDecrement}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[styles.btn, { width: s.btnWidth }]}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name={quantity === 1 ? 'trash-outline' : 'remove'} size={s.iconSize} color={theme.colors.white} />
      </TouchableOpacity>

      <View style={[styles.textWrapper, { paddingHorizontal: s.paddingH }]}>
        <Text
          style={[
            styles.qtyText,
            {
              color: theme.colors.white,
              fontSize: s.fontSize,
              fontWeight: theme.typography.weight.bold,
            },
          ]}
        >
          {quantity}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onIncrement}
        disabled={quantity >= maxQuantity}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[styles.btn, { width: s.btnWidth }, quantity >= maxQuantity && styles.btnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={s.iconSize} color={theme.colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btn: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  textWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
  },
  qtyText: {
    textAlign: 'center',
  },
});
