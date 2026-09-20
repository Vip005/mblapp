import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { ProductVariant } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId: string;
  onSelectVariant: (variant: ProductVariant) => void;
  showPrice?: boolean;
  style?: ViewStyle;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariantId,
  onSelectVariant,
  showPrice = false,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {variants.map((v) => {
        const isSelected = v.id === selectedVariantId;

        return (
          <TouchableOpacity
            key={v.id}
            activeOpacity={0.7}
            onPress={() => onSelectVariant(v)}
            style={[
              styles.chip,
              {
                borderRadius: theme.borderRadius.md,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected ? theme.colors.primaryDarker : theme.colors.textPrimary,
                  fontWeight: isSelected ? theme.typography.weight.bold : theme.typography.weight.medium,
                  fontSize: theme.typography.size.sm,
                },
              ]}
            >
              {v.name}
            </Text>
            {showPrice && (
              <Text
                style={[
                  styles.priceText,
                  {
                    color: isSelected ? theme.colors.primaryDark : theme.colors.textMuted,
                    fontSize: theme.typography.size.xs,
                  },
                ]}
              >
                {formatCurrency(v.price)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  chipText: {
    textAlign: 'center',
  },
  priceText: {
    marginTop: 2,
    textAlign: 'center',
  },
});
