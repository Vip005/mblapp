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
import { AddressType, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useAddress } from '../../hooks/useAddress';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { isValidPhone, isValidPincode, isNotEmpty } from '../../utils/validators';
import { normalizePincode } from '../../utils/storeMatcher';

const ADDRESS_TYPES: AddressType[] = ['Home', 'Work', 'Other'];

export const PrimaryAddressScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addAddress } = useAddress();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [doorFlat, setDoorFlat] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Chennai');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('');
  const [type, setType] = useState<AddressType>('Home');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isNotEmpty(name)) errs.name = 'Please enter contact person name';
    if (!isValidPhone(phone)) errs.phone = 'Please enter valid 10-digit mobile number';
    if (!isNotEmpty(doorFlat)) errs.doorFlat = 'Please enter house/flat/floor number';
    if (!isNotEmpty(street)) errs.street = 'Please enter street name or landmark';
    if (!isNotEmpty(area)) errs.area = 'Please enter area or locality';
    if (!isValidPincode(pincode)) errs.pincode = 'Please enter a valid 6-digit pincode';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAndContinue = async () => {
    if (!validate()) return;

    setLoading(true);
    const cleanedPincode = normalizePincode(pincode);

    try {
      await addAddress({
        name: name.trim(),
        phone: phone.trim(),
        doorFlat: doorFlat.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: cleanedPincode,
        type,
        isDefault: true,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'StoreSelection', params: { customerPincode: cleanedPincode } }],
      });
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save address. Please try again.' });
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
            <View style={[styles.stepBar, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.stepBar, { backgroundColor: theme.colors.border }]} />
          </View>
          <Text style={[styles.stepText, { color: theme.colors.primary }]}>Step 2 of 3: Delivery Address</Text>

          {/* Header */}
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="location" size={36} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Add Delivery Address</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Where should we deliver your fresh groceries?
          </Text>

          {errors.form && (
            <View style={[styles.errorBanner, { backgroundColor: theme.colors.errorLight }]}>
              <Text style={[styles.errorBannerText, { color: theme.colors.error }]}>
                {errors.form}
              </Text>
            </View>
          )}

          {/* Address Type Selector */}
          <View style={styles.typeSelector}>
            {ADDRESS_TYPES.map((t) => {
              const isSelected = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    {
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.card,
                    },
                  ]}
                  onPress={() => setType(t)}
                >
                  <Ionicons
                    name={t === 'Home' ? 'home' : t === 'Work' ? 'briefcase' : 'location'}
                    size={18}
                    color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      {
                        color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Contact Fields */}
          <View style={styles.formSection}>
            <AppInput
              label="Contact Person"
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Full name"
              leftIconName="person-outline"
              error={errors.name}
            />

            <AppInput
              label="Contact Phone"
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="10-digit mobile number"
              leftIconName="call-outline"
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.phone}
            />

            <AppInput
              label="House / Flat / Block No."
              value={doorFlat}
              onChangeText={(val) => {
                setDoorFlat(val);
                if (errors.doorFlat) setErrors((prev) => ({ ...prev, doorFlat: '' }));
              }}
              placeholder="e.g. Flat 3B, Sunshine Apts"
              leftIconName="business-outline"
              error={errors.doorFlat}
            />

            <AppInput
              label="Street / Landmark"
              value={street}
              onChangeText={(val) => {
                setStreet(val);
                if (errors.street) setErrors((prev) => ({ ...prev, street: '' }));
              }}
              placeholder="e.g. 1st Cross Street, Near Park"
              leftIconName="map-outline"
              error={errors.street}
            />

            <AppInput
              label="Area / Locality"
              value={area}
              onChangeText={(val) => {
                setArea(val);
                if (errors.area) setErrors((prev) => ({ ...prev, area: '' }));
              }}
              placeholder="e.g. Thiruvanmiyur"
              leftIconName="navigate-outline"
              error={errors.area}
            />

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <AppInput
                  label="Pincode"
                  value={pincode}
                  onChangeText={(val) => {
                    setPincode(val);
                    if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
                  }}
                  placeholder="e.g. 600041"
                  leftIconName="pin-outline"
                  keyboardType="number-pad"
                  maxLength={6}
                  error={errors.pincode}
                />
              </View>

              <View style={styles.halfCol}>
                <AppInput
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Chennai"
                  leftIconName="business-outline"
                />
              </View>
            </View>

            <AppInput
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="Tamil Nadu"
              leftIconName="globe-outline"
            />
          </View>

          {/* Continue Button */}
          <View style={styles.footer}>
            <AppButton
              title="Save & Choose Store"
              onPress={handleSaveAndContinue}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
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
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  typeBtnText: {
    fontSize: 13,
  },
  formSection: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  footer: {
    marginTop: 24,
  },
});
