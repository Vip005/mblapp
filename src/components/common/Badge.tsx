import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface BadgeProps {
  label?: string | number;
  variant?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'muted';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  style,
}) => {
  const { theme } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: theme.colors.primaryLight, text: theme.colors.primaryDark };
      case 'secondary':
        return { bg: theme.colors.secondaryLight, text: theme.colors.secondary };
      case 'error':
        return { bg: theme.colors.errorLight, text: theme.colors.error };
      case 'success':
        return { bg: theme.colors.successLight, text: theme.colors.success };
      case 'warning':
        return { bg: theme.colors.warningLight, text: theme.colors.warning };
      case 'muted':
      default:
        return { bg: theme.colors.borderLight, text: theme.colors.textSecondary };
    }
  };

  const { bg, text } = getColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          paddingHorizontal: isSm ? 6 : 8,
          paddingVertical: isSm ? 2 : 4,
          borderRadius: theme.borderRadius.sm,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: isSm ? 10 : 12,
            fontWeight: theme.typography.weight.semibold,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
