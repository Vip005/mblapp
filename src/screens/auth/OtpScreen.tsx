import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppButton } from '../../components/common/AppButton';
import { determineNextAppRoute } from '../../utils/onboardingProgression';
import { storage } from '../../utils/storage';
import { IS_TESTING_ENVIRONMENT } from '../../services/api/config';
import { getSafeUserErrorMessage, sanitizeDevLog } from '../../utils/apiError';

export const OtpScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<AuthStackParamList, 'Otp'>>();
  const phone = route.params?.phone || (IS_TESTING_ENVIRONMENT ? '9876543210' : '');
  const devOtp = route.params?.devOtp;

  const { verifyOtp, login } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const getInitialOtp = (): string => {
    if (IS_TESTING_ENVIRONMENT && devOtp && typeof devOtp === 'string') {
      const clean = devOtp.trim().slice(0, 6);
      if (clean.length === 6) {
        return clean;
      }
    }
    return '';
  };

  const [otp, setOtp] = useState<string>(getInitialOtp);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  // Primary source: sync OTP from direct navigation parameter
  useEffect(() => {
    if (!IS_TESTING_ENVIRONMENT) return;

    if (devOtp && typeof devOtp === 'string' && devOtp.trim().length === 6) {
      setOtp(devOtp.trim().slice(0, 6));
      return;
    }

    // Secondary fallback ONLY if devOtp param is missing
    storage.get<string | null>('@grocery_dev_last_server_otp', null).then((cached) => {
      if (cached && typeof cached === 'string' && cached.trim().length === 6) {
        setOtp((current) => (!current || current.length === 0 ? cached.trim().slice(0, 6) : current));
      }
    });
  }, [devOtp]);

  // Secondary sync listener on navigation focus
  useEffect(() => {
    if (!IS_TESTING_ENVIRONMENT) return;

    const unsubscribe = navigation.addListener('focus', () => {
      const paramOtp = route.params?.devOtp;
      if (paramOtp && typeof paramOtp === 'string' && paramOtp.trim().length === 6) {
        setOtp(paramOtp.trim().slice(0, 6));
      }
    });

    return unsubscribe;
  }, [navigation, route.params?.devOtp]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = async (codeToVerify?: string) => {
    const targetOtp = codeToVerify ?? otp;
    if (targetOtp.length !== 6) {
      setError('Please enter complete 6-digit OTP code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await verifyOtp(phone, targetOtp);
      const target = await determineNextAppRoute(res.user);
      if (target.type === 'AUTH_STEP') {
        navigation.navigate(target.screen as any);
      } else if (target.type === 'MAIN') {
        rootNav?.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        navigation.navigate('NameUpdate');
      }
    } catch (err: any) {
      sanitizeDevLog('OtpScreen.handleVerify', err);
      setError(getSafeUserErrorMessage(err, 'otp'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (txt: string) => {
    const cleaned = txt.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
    if (error) setError('');

    // Auto verify when 6 digits are reached
    if (cleaned.length === 6) {
      handleVerify(cleaned);
    }
  };

  const handleResend = async () => {
    setTimer(30);
    setError('');
    try {
      const res = await login(phone);
      if (IS_TESTING_ENVIRONMENT && res?.otp) {
        const newCode = res.otp.trim().slice(0, 6);
        setOtp(newCode);
      }
    } catch (err: any) {
      sanitizeDevLog('OtpScreen.handleResend', err);
      setError(getSafeUserErrorMessage(err, 'otp'));
    }
  };

  const handleAutoFill = () => {
    if (IS_TESTING_ENVIRONMENT) {
      setOtp('123456');
      setError('');
      handleVerify('123456');
    }
  };

  // Render 6 individual digit cells
  const renderOtpCells = () => {
    const cells = [];
    for (let i = 0; i < 6; i++) {
      const digit = otp[i] || '';
      const isFocused = otp.length === i;
      const isFilled = digit.length > 0;

      cells.push(
        <View
          key={i}
          style={[
            styles.otpCell,
            {
              backgroundColor: isFocused ? theme.colors.primaryLight : theme.colors.card,
              borderColor: error
                ? theme.colors.error
                : isFocused
                ? theme.colors.primary
                : isFilled
                ? theme.colors.primaryDark
                : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.cellText,
              {
                color: theme.colors.textPrimary,
              },
            ]}
          >
            {digit}
          </Text>
        </View>
      );
    }
    return cells;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.backBtn, { backgroundColor: theme.colors.card }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Content */}
        <View style={styles.header}>
          <View
            style={[
              styles.shieldBadge,
              {
                backgroundColor: theme.colors.primaryLight,
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={32} color={theme.colors.primaryDark} />
          </View>

          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Verify with OTP
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Enter the 6-digit code sent to
          </Text>

          {/* Destination Phone Row with Edit button */}
          <View style={[styles.phoneBadge, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.phoneText, { color: theme.colors.textPrimary }]}>
              +91 {phone}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.editBtn}
            >
              <Ionicons name="pencil" size={14} color={theme.colors.primary} />
              <Text style={[styles.editText, { color: theme.colors.primary }]}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6-Digit PIN Interactive Box */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={styles.cellsContainer}
        >
          {renderOtpCells()}
        </TouchableOpacity>

        {/* Hidden Native TextInput */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={handleOtpChange}
          maxLength={6}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          autoFocus={!otp || otp.length < 6}
          style={styles.hiddenInput}
        />

        {/* Error Message */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Developer Convenience Chip */}
        {/* {IS_TESTING_ENVIRONMENT && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAutoFill}
            style={[
              styles.devPill,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Ionicons name="key-outline" size={14} color={theme.colors.primaryDark} />
            <Text style={[styles.devText, { color: theme.colors.primaryDarker }]}>
              DEV OTP: 123456
            </Text>
          </TouchableOpacity>
        )} */}

        {/* Verify Action Button */}
        <View style={styles.buttonWrapper}>
          <AppButton
            title="Verify & Proceed"
            onPress={() => handleVerify()}
            loading={loading}
            disabled={otp.length !== 6}
            size="lg"
            rightIcon={<Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
          />
        </View>

        {/* Resend OTP Row */}
        <View style={styles.resendRow}>
          {timer > 0 ? (
            <View style={styles.timerBox}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.resendTimerText, { color: theme.colors.textMuted }]}>
                Resend code in 0:{timer < 10 ? `0${timer}` : timer}
              </Text>
            </View>
          ) : (
            <View style={styles.resendActionBox}>
              <Text style={[styles.resendPromptText, { color: theme.colors.textSecondary }]}>
                Didn't receive code?{' '}
              </Text>
              <TouchableOpacity onPress={handleResend}>
                <Text style={[styles.resendActionText, { color: theme.colors.primary }]}>
                  Resend via SMS
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingBottom: 8,
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
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  shieldBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 10,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 4,
  },
  editText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cellsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  otpCell: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 22,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  devPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
    gap: 6,
  },
  devText: {
    fontSize: 11,
    fontWeight: '700',
  },
  buttonWrapper: {
    marginTop: 18,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 22,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resendTimerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resendActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendPromptText: {
    fontSize: 13,
  },
  resendActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
