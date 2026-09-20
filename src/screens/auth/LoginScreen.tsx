import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppButton } from '../../components/common/AppButton';
import { isValidPhone } from '../../utils/validators';

export const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { login, isLoggedIn } = useAuth();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handlePhoneChange = (txt: string) => {
    // Normalize phone: strip non-digits, country code (+91), leading 0
    let cleaned = txt.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = cleaned.slice(2);
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    cleaned = cleaned.slice(0, 10);
    setPhone(cleaned);
    if (error) setError('');
  };

  const handleLogin = async () => {
    if (!isValidPhone(phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await login(phone);
      navigation.navigate('Otp', { phone, devOtp: res?.otp });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    if (__DEV__) {
      setPhone('9876543210');
      setError('');
    }
  };

  const isPhoneValid = phone.length === 10;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Top Bar with optional Back button only if authenticated user navigated here */}
      {isLoggedIn && rootNav?.canGoBack() && (
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity
            onPress={() => rootNav.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.backBtn, { backgroundColor: theme.colors.card }]}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: isLoggedIn && rootNav?.canGoBack() ? 8 : Math.max(insets.top + 16, 36),
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Branding Section */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: theme.colors.primary,
                ...theme.shadows.md,
              },
            ]}
          >
            <Ionicons name="basket" size={36} color="#FFFFFF" />
          </View>

          <View style={[styles.deliveryPill, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="flash" size={14} color={theme.colors.primaryDark} />
            <Text style={[styles.deliveryPillText, { color: theme.colors.primaryDarker }]}>
              10-15 Min Delivery
            </Text>
          </View>

          <Text style={[styles.heroHeadline, { color: theme.colors.textPrimary }]}>
            Groceries Delivered{'\n'}in Minutes
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
            Farm-fresh fruits, vegetables, dairy & daily kitchen essentials at your doorstep.
          </Text>

          {/* Quick Commerce Feature Tags */}
          <View style={styles.featureRow}>
            <View style={[styles.featureTag, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
              <Text style={styles.featureTagText}>⚡ Express</Text>
            </View>
            <View style={[styles.featureTag, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
              <Text style={styles.featureTagText}>🥦 Farm Fresh</Text>
            </View>
            <View style={[styles.featureTag, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
              <Text style={styles.featureTagText}>🏷️ Best Prices</Text>
            </View>
          </View>
        </View>

        {/* Modern Authentication Card */}
        <View
          style={[
            styles.authCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              ...theme.shadows.md,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Log in or Sign up
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              Enter your mobile number to get started
            </Text>
          </View>

          {/* Phone Input Box */}
          <View
            style={[
              styles.phoneInputContainer,
              {
                borderColor: error
                  ? theme.colors.error
                  : isInputFocused
                  ? theme.colors.primary
                  : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            {/* Country Flag & Prefix Chip */}
            <View style={styles.prefixBox}>
              <Text style={styles.flagIcon}>🇮🇳</Text>
              <Text style={[styles.prefixText, { color: theme.colors.textPrimary }]}>
                +91
              </Text>
            </View>

            <View style={[styles.prefixDivider, { backgroundColor: theme.colors.border }]} />

            {/* Mobile Number Input */}
            <TextInput
              value={phone}
              onChangeText={handlePhoneChange}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Enter Mobile Number"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              autoComplete="tel"
              textContentType="telephoneNumber"
              dataDetectorTypes="phoneNumber"
              importantForAutofill="yes"
              style={[
                styles.textInput,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
            />

            {phone.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setPhone('');
                  setError('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Error Message */}
          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : null}

          {/* Development Demo Quick-Fill */}
          {__DEV__ && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleFillDemo}
              style={[
                styles.devDemoPill,
                {
                  backgroundColor: theme.colors.primaryLight,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Ionicons name="flash" size={14} color={theme.colors.primaryDark} />
              <Text style={[styles.devDemoText, { color: theme.colors.primaryDarker }]}>
                DEV: Fill Demo (9876543210)
              </Text>
            </TouchableOpacity>
          )}

          {/* Primary Action Button */}
          <View style={styles.actionBtnWrap}>
            <AppButton
              title="Continue"
              onPress={handleLogin}
              loading={loading}
              disabled={!isPhoneValid}
              size="lg"
              rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            />
          </View>

          {/* Trust / Terms Footer */}
          <Text style={[styles.termsText, { color: theme.colors.textMuted }]}>
            By continuing, you agree to FreshMart's{' '}
            <Text style={[styles.termsLink, { color: theme.colors.textSecondary }]}>
              Terms of Service
            </Text>{' '}
            &{' '}
            <Text style={[styles.termsLink, { color: theme.colors.textSecondary }]}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  deliveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
    gap: 5,
  },
  deliveryPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroHeadline: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 8,
  },
  featureTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  authCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
  },
  flagIcon: {
    fontSize: 18,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '700',
  },
  prefixDivider: {
    width: 1,
    height: 24,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 1,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 2,
  },
  devDemoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 6,
  },
  devDemoText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnWrap: {
    marginTop: 18,
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 18,
  },
  termsLink: {
    fontWeight: '600',
  },
});
