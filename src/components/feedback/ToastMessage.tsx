import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface ToastMessageProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  duration?: number;
  style?: ViewStyle;
}

export const ToastMessage: React.FC<ToastMessageProps> = ({
  visible,
  message,
  type = 'success',
  onDismiss,
  duration = 3000,
  style,
}) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getThemeProps = () => {
    switch (type) {
      case 'error':
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          icon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
          iconColor: '#DC2626',
        };
      case 'info':
        return {
          bg: '#E0F2FE',
          text: '#075985',
          icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
          iconColor: '#0284C7',
        };
      case 'success':
      default:
        return {
          bg: '#D1FAE5',
          text: '#065F46',
          icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
          iconColor: '#059669',
        };
    }
  };

  const { bg, text, icon, iconColor } = getThemeProps();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          borderRadius: theme.borderRadius.md,
          opacity,
          ...theme.shadows.md,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={20} color={iconColor} style={styles.icon} />
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: theme.typography.size.sm,
            fontWeight: theme.typography.weight.medium,
          },
        ]}
      >
        {message}
      </Text>
      <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={18} color={text} style={styles.closeIcon} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    flex: 1,
  },
  closeIcon: {
    marginLeft: 10,
  },
});
