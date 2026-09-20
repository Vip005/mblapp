import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeliverySlot } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface DeliverySlotPickerProps {
  slots: DeliverySlot[];
  selectedSlotId: string;
  onSelectSlot: (slot: DeliverySlot) => void;
  style?: ViewStyle;
}

export const DeliverySlotPicker: React.FC<DeliverySlotPickerProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {slots.map((slot) => {
        const isSelected = slot.id === selectedSlotId;

        return (
          <TouchableOpacity
            key={slot.id}
            activeOpacity={0.75}
            onPress={() => onSelectSlot(slot)}
            style={[
              styles.slotCard,
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

              <View style={styles.textCol}>
                <View style={styles.badgeRow}>
                  <Text
                    style={[
                      styles.dateBadge,
                      {
                        color: isSelected ? theme.colors.primaryDark : theme.colors.secondary,
                        fontWeight: theme.typography.weight.bold,
                        fontSize: theme.typography.size.xs,
                      },
                    ]}
                  >
                    {slot.dateLabel.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.timeText,
                    {
                      color: isSelected ? theme.colors.primaryDarker : theme.colors.textPrimary,
                      fontSize: theme.typography.size.sm,
                      fontWeight: isSelected ? theme.typography.weight.bold : theme.typography.weight.medium,
                    },
                  ]}
                >
                  {slot.timeWindow}
                </Text>
              </View>
            </View>

            <Ionicons
              name={isSelected ? 'time' : 'time-outline'}
              size={20}
              color={isSelected ? theme.colors.primary : theme.colors.textMuted}
            />
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
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1.5,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textCol: {},
  badgeRow: {
    marginBottom: 2,
  },
  dateBadge: {
    letterSpacing: 0.5,
  },
  timeText: {},
});
