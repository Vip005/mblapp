export const colors = {
  primary: '#10B981', // Fresh emerald green
  primaryDark: '#059669',
  primaryDarker: '#047857',
  primaryLight: '#ECFDF5',
  primaryMuted: '#D1FAE5',

  secondary: '#F59E0B', // Warm amber / orange accent
  secondaryLight: '#FEF3C7',

  accent: '#3B82F6', // Crisp blue for info/links
  accentLight: '#EFF6FF',

  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',

  // Neutrals (Light Mode)
  white: '#FFFFFF',
  black: '#000000',
  background: '#F8FAFC',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#EDF2F7',

  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textLight: '#CBD5E1',
  textInverse: '#FFFFFF',

  // Shadows / Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  shadow: '#0F172A',
  badgeRed: '#DC2626',
};

export const darkColors = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryDarker: '#047857',
  primaryLight: '#064E3B',
  primaryMuted: '#065F46',

  secondary: '#F59E0B',
  secondaryLight: '#78350F',

  accent: '#60A5FA',
  accentLight: '#1E3A8A',

  success: '#10B981',
  successLight: '#064E3B',
  warning: '#F59E0B',
  warningLight: '#78350F',
  error: '#F87171',
  errorLight: '#7F1D1D',
  info: '#60A5FA',

  // Neutrals (Dark Mode)
  white: '#FFFFFF',
  black: '#000000',
  background: '#0F172A',
  card: '#1E293B',
  surface: '#1E293B',
  border: '#334155',
  borderLight: '#1E293B',
  divider: '#334155',

  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textLight: '#475569',
  textInverse: '#0F172A',

  // Shadows / Overlays
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
  badgeRed: '#EF4444',
};

export type ColorTheme = typeof colors;
