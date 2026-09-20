import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from '../common/AppButton';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again.',
  onRetry,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: theme.colors.errorLight,
            borderRadius: theme.borderRadius.round,
          },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.lg,
            fontWeight: theme.typography.weight.bold,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.message,
          {
            color: theme.colors.textSecondary,
            fontSize: theme.typography.size.sm,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <View style={styles.buttonWrapper}>
          <AppButton
            title="Try Again"
            onPress={onRetry}
            size="md"
            variant="primary"
            style={{ minWidth: 140 }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 20,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
});
