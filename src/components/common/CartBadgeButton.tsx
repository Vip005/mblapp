import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useCart } from '../../hooks/useCart';

export interface CartBadgeButtonProps {
  onPress?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  size?: number;
  buttonSize?: number;
  iconColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  badgeBackgroundColor?: string;
  badgeTextColor?: string;
  style?: StyleProp<ViewStyle>;
  badgeStyle?: StyleProp<ViewStyle>;
}

export const CartBadgeButton: React.FC<CartBadgeButtonProps> = ({
  onPress,
  iconName = 'cart-outline',
  size = 22,
  buttonSize,
  iconColor,
  backgroundColor,
  borderColor,
  borderWidth,
  borderRadius,
  badgeBackgroundColor,
  badgeTextColor,
  style,
  badgeStyle,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { itemCount } = useCart();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('Main', { screen: 'CartTab' });
    }
  };

  const resolvedBgColor = backgroundColor ?? theme.colors.background;
  const resolvedIconColor = iconColor ?? theme.colors.textPrimary;
  const resolvedBadgeBg = badgeBackgroundColor ?? theme.colors.primary;
  const resolvedBadgeText = badgeTextColor ?? '#FFFFFF';

  const containerDynamicStyle: ViewStyle = buttonSize
    ? {
        width: buttonSize,
        height: buttonSize,
        borderRadius: borderRadius ?? buttonSize / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: resolvedBgColor,
        borderWidth: borderWidth ?? (borderColor ? 1 : 0),
        borderColor: borderColor ?? 'transparent',
      }
    : {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: backgroundColor ?? 'transparent',
        borderWidth: borderWidth ?? 0,
        borderColor: borderColor ?? 'transparent',
        borderRadius: borderRadius ?? theme.borderRadius.sm,
      };

  const badgeDisplay = itemCount > 99 ? '99+' : String(itemCount);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.container, containerDynamicStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={itemCount > 0 ? `View Cart, ${itemCount} items` : 'View Cart'}
    >
      <Ionicons name={iconName} size={size} color={resolvedIconColor} />

      {itemCount > 0 && (
        <View
          style={[
            styles.badge,
            { backgroundColor: resolvedBadgeBg },
            badgeStyle,
          ]}
          pointerEvents="none"
        >
          <Text
            style={[styles.badgeText, { color: resolvedBadgeText }]}
            numberOfLines={1}
          >
            {badgeDisplay}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 12,
  },
});
