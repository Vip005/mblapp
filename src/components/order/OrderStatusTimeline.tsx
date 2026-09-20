import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderStatusStep } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface OrderStatusTimelineProps {
  steps: OrderStatusStep[];
}

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({ steps }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <View key={index} style={styles.stepRow}>
            {/* Step Icon and Connector Line */}
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: step.completed
                      ? theme.colors.primary
                      : step.current
                      ? theme.colors.secondary
                      : theme.colors.border,
                    borderColor: step.current ? theme.colors.secondaryLight : 'transparent',
                    borderWidth: step.current ? 3 : 0,
                  },
                ]}
              >
                {step.completed ? (
                  <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                ) : step.current ? (
                  <View style={[styles.pulseDot, { backgroundColor: theme.colors.white }]} />
                ) : (
                  <View style={[styles.inactiveDot, { backgroundColor: theme.colors.textMuted }]} />
                )}
              </View>

              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    {
                      backgroundColor: step.completed ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                />
              )}
            </View>

            {/* Step Content */}
            <View style={[styles.contentCol, !isLast && { paddingBottom: 24 }]}>
              <Text
                style={[
                  styles.label,
                  {
                    color: step.completed || step.current ? theme.colors.textPrimary : theme.colors.textMuted,
                    fontSize: theme.typography.size.sm,
                    fontWeight: step.current || step.completed ? theme.typography.weight.bold : theme.typography.weight.medium,
                  },
                ]}
              >
                {step.label}
              </Text>

              {step.date && (
                <Text
                  style={[
                    styles.date,
                    {
                      color: step.current ? theme.colors.secondary : theme.colors.textMuted,
                      fontSize: theme.typography.size.xs,
                    },
                  ]}
                >
                  {step.date}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepRow: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  contentCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-start',
  },
  label: {
    lineHeight: 20,
  },
  date: {
    marginTop: 2,
  },
});
