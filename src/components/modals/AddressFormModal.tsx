import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Address, AddressType } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { AppInput } from '../common/AppInput';
import { AppButton } from '../common/AppButton';
import { isValidPhone, isValidPincode, isNotEmpty } from '../../utils/validators';

interface AddressFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (address: Omit<Address, 'id'>) => Promise<void>;
  initialData?: Address | null;
}

const ADDRESS_TYPES: AddressType[] = ['Home', 'Work', 'Other'];

export const AddressFormModal: React.FC<AddressFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [doorFlat, setDoorFlat] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Chennai');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('');
  const [type, setType] = useState<AddressType>('Home');
  const [isDefault, setIsDefault] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone);
      setDoorFlat(initialData.doorFlat);
      setStreet(initialData.street);
      setArea(initialData.area);
      setCity(initialData.city);
      setState(initialData.state);
      setPincode(initialData.pincode);
      setType(initialData.type);
      setIsDefault(initialData.isDefault);
    } else {
      setName('Abdul Rahman');
      setPhone('9876543210');
      setDoorFlat('');
      setStreet('');
      setArea('');
      setCity('Chennai');
      setState('Tamil Nadu');
      setPincode('600040');
      setType('Home');
      setIsDefault(false);
    }
    setErrors({});
  }, [visible, initialData]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isNotEmpty(name)) errs.name = 'Please enter contact name';
    if (!isValidPhone(phone)) errs.phone = 'Please enter valid 10-digit mobile number';
    if (!isNotEmpty(doorFlat)) errs.doorFlat = 'Please enter house/flat/floor number';
    if (!isNotEmpty(street)) errs.street = 'Please enter street name';
    if (!isNotEmpty(area)) errs.area = 'Please enter area or locality';
    if (!isValidPincode(pincode)) errs.pincode = 'Please enter valid 6-digit pincode';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        doorFlat: doorFlat.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        type,
        isDefault,
      });
      onClose();
    } catch (e) {
      console.warn('Failed to save address:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.card,
              borderTopLeftRadius: theme.borderRadius.xxl,
              borderTopRightRadius: theme.borderRadius.xxl,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.lg,
                  fontWeight: theme.typography.weight.bold,
                },
              ]}
            >
              {initialData ? 'Edit Address' : 'Add New Address'}
            </Text>

            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Address Type selector */}
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
              Save As
            </Text>
            <View style={styles.typeRow}>
              {ADDRESS_TYPES.map((t) => {
                const isSelected = type === t;
                const iconName =
                  t === 'Home' ? 'home-outline' : t === 'Work' ? 'briefcase-outline' : 'location-outline';

                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        borderRadius: theme.borderRadius.md,
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconName}
                      size={16}
                      color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        {
                          color: isSelected ? theme.colors.primaryDark : theme.colors.textPrimary,
                          fontWeight: isSelected ? theme.typography.weight.bold : theme.typography.weight.medium,
                          fontSize: theme.typography.size.xs,
                        },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <AppInput
              label="Recipient Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Abdul Rahman"
              error={errors.name}
            />

            <AppInput
              label="10-Digit Mobile Number *"
              value={phone}
              onChangeText={setPhone}
              placeholder="9876543210"
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.phone}
            />

            <AppInput
              label="Flat / House / Building No *"
              value={doorFlat}
              onChangeText={setDoorFlat}
              placeholder="e.g. Flat 402, Green Meadows"
              error={errors.doorFlat}
            />

            <AppInput
              label="Street / Road *"
              value={street}
              onChangeText={setStreet}
              placeholder="e.g. 12th Main Road"
              error={errors.street}
            />

            <AppInput
              label="Area / Locality *"
              value={area}
              onChangeText={setArea}
              placeholder="e.g. Anna Nagar West"
              error={errors.area}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <AppInput
                  label="City *"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Chennai"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <AppInput
                  label="Pincode *"
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="600040"
                  keyboardType="numeric"
                  maxLength={6}
                  error={errors.pincode}
                />
              </View>
            </View>

            {/* Set as default checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsDefault(!isDefault)}
              style={styles.defaultRow}
            >
              <Ionicons
                name={isDefault ? 'checkbox' : 'square-outline'}
                size={22}
                color={isDefault ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.defaultLabel,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.sm,
                  },
                ]}
              >
                Make this my default delivery address
              </Text>
            </TouchableOpacity>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.borderLight }]}>
            <AppButton
              title={initialData ? 'Update Address' : 'Save Address'}
              onPress={handleSave}
              loading={submitting}
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {},
  body: {
    padding: 16,
  },
  label: {
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  typeText: {
    marginLeft: 6,
  },
  twoCol: {
    flexDirection: 'row',
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  defaultLabel: {
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
