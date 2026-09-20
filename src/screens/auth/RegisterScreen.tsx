import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { isValidPhone, isValidEmail, isNotEmpty } from '../../utils/validators';

export const RegisterScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isNotEmpty(name)) errs.name = 'Please enter your full name';
    if (!isValidPhone(phone)) errs.phone = 'Please enter valid 10-digit mobile number';
    if (!isValidEmail(email)) errs.email = 'Please enter valid email address';
    if (!isNotEmpty(password) || password.length < 6)
      errs.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      await register({ name, phone, email });
      // Navigates into Main automatically because AuthContext sets user + token
    } catch (err: any) {
      setErrors({ form: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.backBtn, { backgroundColor: theme.colors.background }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.xxl,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            Create Account ✨
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.sm,
              },
            ]}
          >
            Join FreshMart for fresh farm deliveries
          </Text>
        </View>

        {errors.form ? (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.errorLight }]}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
            <Text style={[styles.errorBoxText, { color: theme.colors.error }]}>{errors.form}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <AppInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Abdul Rahman"
            leftIconName="person-outline"
            error={errors.name}
          />

          <AppInput
            label="Mobile Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            leftIconName="call-outline"
            error={errors.phone}
          />

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="abdul@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIconName="mail-outline"
            error={errors.email}
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 6 characters"
            isPassword
            leftIconName="lock-closed-outline"
            error={errors.password}
          />

          <AppInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat password"
            isPassword
            leftIconName="shield-checkmark-outline"
            error={errors.confirmPassword}
          />

          <View style={{ marginTop: 8 }}>
            <AppButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              size="lg"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text
              style={[
                styles.loginLink,
                {
                  color: theme.colors.primary,
                  fontWeight: theme.typography.weight.bold,
                },
              ]}
            >
              Log In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {},
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBoxText: {
    marginLeft: 8,
    fontSize: 13,
  },
  form: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
  },
});
