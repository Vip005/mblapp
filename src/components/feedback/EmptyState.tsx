import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from '../common/AppButton';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'basket-outline',
  title,
  description,
  buttonLabel,
  onButtonPress,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: theme.colors.primaryLight,
            borderRadius: theme.borderRadius.round,
          },
        ]}
      >
        <Ionicons name={iconName} size={48} color={theme.colors.primary} />
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.xl,
            fontWeight: theme.typography.weight.bold,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.description,
          {
            color: theme.colors.textSecondary,
            fontSize: theme.typography.size.sm,
            lineHeight: theme.typography.lineHeight.sm,
          },
        ]}
      >
        {description}
      </Text>

      {buttonLabel && onButtonPress && (
        <View style={styles.buttonWrapper}>
          <AppButton
            title={buttonLabel}
            onPress={onButtonPress}
            size="md"
            style={{ minWidth: 160 }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    flex: 1,
  },
  iconCircle: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
});
