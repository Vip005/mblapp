import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIconName?: keyof typeof Ionicons.glyphMap;
  rightIconName?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  hint,
  leftIconName,
  rightIconName,
  onRightIconPress,
  containerStyle,
  isPassword = false,
  showClearButton = false,
  onClear,
  value,
  onChangeText,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.sm,
              fontWeight: theme.typography.weight.medium,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: hasError
              ? theme.colors.error
              : isFocused
              ? theme.colors.primary
              : theme.colors.border,
            borderRadius: theme.borderRadius.md,
          },
        ]}
      >
        {leftIconName && (
          <Ionicons
            name={leftIconName}
            size={20}
            color={hasError ? theme.colors.error : isFocused ? theme.colors.primary : theme.colors.textMuted}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.md,
            },
          ]}
          {...props}
        />

        {showClearButton && !!value && (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} style={styles.rightIcon} />
          </TouchableOpacity>
        )}

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textMuted}
              style={styles.rightIcon}
            />
          </TouchableOpacity>
        ) : rightIconName ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={rightIconName}
              size={20}
              color={theme.colors.textMuted}
              style={styles.rightIcon}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {hasError ? (
        <Text
          style={[
            styles.errorText,
            {
              color: theme.colors.error,
              fontSize: theme.typography.size.xs,
            },
          ]}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={[
            styles.hintText,
            {
              color: theme.colors.textMuted,
              fontSize: theme.typography.size.xs,
            },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  leftIcon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 8,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 2,
  },
  hintText: {
    marginTop: 4,
    marginLeft: 2,
  },
});
