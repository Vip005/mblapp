import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethodOption, PaymentMethodType } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface PaymentMethodPickerProps {
  methods: PaymentMethodOption[];
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  style?: ViewStyle;
  isOnlineDisabled?: boolean;
  onlineDisabledMessage?: string;
  modeBadge?: string; // e.g. "Test Mode"
}

export const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = ({
  methods,
  selectedMethod,
  onSelectMethod,
  style,
  isOnlineDisabled = false,
  onlineDisabledMessage = 'Online payments are currently unavailable. Please choose Cash on Delivery.',
  modeBadge,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {methods.map((method) => {
        const isOnline = method.id !== 'cod';
        const isDisabled = isOnline && isOnlineDisabled;
        const isSelected = method.id === selectedMethod && !isDisabled;

        const handlePress = () => {
          if (isDisabled) {
            Alert.alert('Payment Unavailable', onlineDisabledMessage);
            return;
          }
          onSelectMethod(method.id);
        };

        return (
          <TouchableOpacity
            key={method.id}
            activeOpacity={isDisabled ? 0.9 : 0.75}
            onPress={handlePress}
            style={[
              styles.methodCard,
              {
                backgroundColor: isSelected
                  ? theme.colors.primaryLight
                  : isDisabled
                  ? theme.colors.background
                  : theme.colors.card,
                borderColor: isSelected
                  ? theme.colors.primary
                  : isDisabled
                  ? theme.colors.borderLight
                  : theme.colors.border,
                borderRadius: theme.borderRadius.md,
                opacity: isDisabled ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.leftRow}>
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isSelected
                      ? theme.colors.primary
                      : isDisabled
                      ? theme.colors.borderLight
                      : theme.colors.border,
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
                    backgroundColor: isSelected
                      ? theme.colors.surface
                      : isDisabled
                      ? theme.colors.borderLight
                      : theme.colors.background,
                    borderRadius: theme.borderRadius.sm,
                  },
                ]}
              >
                <Ionicons
                  name={method.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={
                    isSelected
                      ? theme.colors.primary
                      : isDisabled
                      ? theme.colors.textMuted
                      : theme.colors.textSecondary
                  }
                />
              </View>

              <View style={styles.textCol}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.methodTitle,
                      {
                        color: isSelected
                          ? theme.colors.primaryDarker
                          : isDisabled
                          ? theme.colors.textMuted
                          : theme.colors.textPrimary,
                        fontSize: theme.typography.size.sm,
                        fontWeight: isSelected
                          ? theme.typography.weight.bold
                          : theme.typography.weight.semibold,
                      },
                    ]}
                  >
                    {method.title}
                  </Text>

                  {/* Mode Badge (e.g. Test Mode) */}
                  {isOnline && !isDisabled && !!modeBadge && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{modeBadge}</Text>
                    </View>
                  )}
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.methodDesc,
                    {
                      color: isSelected
                        ? theme.colors.primaryDark
                        : isDisabled
                        ? theme.colors.textMuted
                        : theme.colors.textMuted,
                      fontSize: theme.typography.size.xs,
                    },
                  ]}
                >
                  {isDisabled ? 'Currently unavailable for this store' : method.description}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingRight: 4,
  },
  methodTitle: {
    flexShrink: 1,
  },
  badgeContainer: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  badgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  methodDesc: {},
});
