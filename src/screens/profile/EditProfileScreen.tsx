import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { ToastMessage } from '../../components/feedback/ToastMessage';
import { isValidPhone, isValidEmail, isNotEmpty } from '../../utils/validators';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
];

export const EditProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_OPTIONS[0]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isNotEmpty(name)) errs.name = 'Please enter your name';
    if (!isValidPhone(phone)) errs.phone = 'Please enter valid 10-digit mobile number';
    if (!isValidEmail(email)) errs.email = 'Please enter valid email address';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        avatar,
      });
      setToastMessage('Profile updated successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (e: any) {
      setErrors({ form: e.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Edit Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Selection */}
        <View style={styles.avatarSection}>
          <View style={[styles.mainAvatarBox, { borderColor: theme.colors.primary }]}>
            <Image source={{ uri: avatar }} style={styles.mainAvatar} resizeMode="cover" />
          </View>
          <Text style={[styles.chooseAvatarText, { color: theme.colors.textSecondary }]}>
            Choose Profile Picture
          </Text>

          <View style={styles.avatarPickerRow}>
            {AVATAR_OPTIONS.map((imgUri, idx) => {
              const isSelected = avatar === imgUri;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setAvatar(imgUri)}
                  style={[
                    styles.avatarThumb,
                    isSelected && { borderColor: theme.colors.primary, borderWidth: 2.5 },
                  ]}
                >
                  <Image source={{ uri: imgUri }} style={styles.thumbImg} resizeMode="cover" />
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Input Fields */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <AppInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            leftIconName="person-outline"
            error={errors.name}
          />

          <AppInput
            label="Mobile Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            leftIconName="call-outline"
            error={errors.phone}
          />

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIconName="mail-outline"
            error={errors.email}
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <AppButton
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            size="lg"
            variant="primary"
          />
        </View>
      </ScrollView>

      <ToastMessage
        visible={!!toastMessage}
        message={toastMessage || ''}
        onDismiss={() => setToastMessage(null)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  mainAvatarBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  mainAvatar: {
    width: '100%',
    height: '100%',
  },
  chooseAvatarText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 12,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    padding: 16,
    borderWidth: 1,
  },
});
