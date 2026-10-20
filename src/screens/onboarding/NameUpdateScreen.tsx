import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { isNotEmpty } from '../../utils/validators';
import { getSafeUserErrorMessage, sanitizeDevLog } from '../../utils/apiError';

export const NameUpdateScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!isNotEmpty(trimmed)) {
      setError('Please enter your full name');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await updateProfile({ name: trimmed });
      navigation.reset({
        index: 0,
        routes: [{ name: 'PrimaryAddress' }],
      });
    } catch (err: any) {
      sanitizeDevLog('NameUpdateScreen.handleContinue', err);
      setError(getSafeUserErrorMessage(err, 'nameUpdate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Step Indicator */}
          <View style={styles.stepContainer}>
            <View style={[styles.stepBar, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.stepBar, { backgroundColor: theme.colors.border }]} />
            <View style={[styles.stepBar, { backgroundColor: theme.colors.border }]} />
          </View>
          <Text style={[styles.stepText, { color: theme.colors.primary }]}>Step 1 of 3: Profile</Text>

          {/* Icon Header */}
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="person" size={40} color={theme.colors.primary} />
          </View>

          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>What should we call you?</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Enter your full name to personalize your orders, delivery updates, and receipts.
          </Text>

          {/* Input */}
          <View style={styles.inputContainer}>
            <AppInput
              label="Full Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError('');
              }}
              placeholder="e.g. John Doe"
              leftIconName="person-outline"
              error={error}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {/* Footer Action */}
          <View style={styles.footer}>
            <AppButton
              title="Continue"
              onPress={handleContinue}
              loading={loading}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 16,
  },
});
