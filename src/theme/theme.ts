import { Platform, ViewStyle } from 'react-native';
import { colors, darkColors, ColorTheme } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';

export interface Shadows {
  none: ViewStyle;
  sm: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
  xl: ViewStyle;
}

export const shadows: Shadows = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  md: {
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  lg: {
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  xl: {
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
};

export interface AppTheme {
  isDark: boolean;
  colors: ColorTheme;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: Shadows;
}

export const lightTheme: AppTheme = {
  isDark: false,
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export const darkTheme: AppTheme = {
  isDark: true,
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows: {
    ...shadows,
    sm: { ...shadows.sm, shadowOpacity: 0.2 },
    md: { ...shadows.md, shadowOpacity: 0.3 },
    lg: { ...shadows.lg, shadowOpacity: 0.4 },
  },
};
