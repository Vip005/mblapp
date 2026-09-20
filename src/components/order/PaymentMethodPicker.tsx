import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethodOption, PaymentMethodType } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface PaymentMethodPickerProps {
  methods: PaymentMethodOption[];
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  style?: ViewStyle;
}

export const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = ({
  methods,
  selectedMethod,
  onSelectMethod,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {methods.map((method) => {
        const isSelected = method.id === selectedMethod;

        return (
          <TouchableOpacity
            key={method.id}
            activeOpacity={0.75}
            onPress={() => onSelectMethod(method.id)}
            style={[
              styles.methodCard,
              {
                backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.card,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.borderRadius.md,
              },
            ]}
          >
            <View style={styles.leftRow}>
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[styles.radioDot, { backgroundColor: theme.colors.primary }]}
                  />
                )}
              </View>

              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isSelected ? theme.colors.surface : theme.colors.background,
                    borderRadius: theme.borderRadius.sm,
                  },
                ]}
              >
                <Ionicons
                  name={method.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>

              <View style={styles.textCol}>
                <Text
                  style={[
                    styles.methodTitle,
                    {
                      color: isSelected ? theme.colors.primaryDarker : theme.colors.textPrimary,
                      fontSize: theme.typography.size.sm,
                      fontWeight: isSelected ? theme.typography.weight.bold : theme.typography.weight.semibold,
                    },
                  ]}
                >
                  {method.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.methodDesc,
                    {
                      color: isSelected ? theme.colors.primaryDark : theme.colors.textMuted,
                      fontSize: theme.typography.size.xs,
                    },
                  ]}
                >
                  {method.description}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1.5,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  methodTitle: {
    marginBottom: 2,
  },
  methodDesc: {},
});
