import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Address } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAddress } from '../../hooks/useAddress';
import { AppHeader } from '../../components/common/AppHeader';
import { AddressFormModal } from '../../components/modals/AddressFormModal';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';
import { ToastMessage } from '../../components/feedback/ToastMessage';
import { AppButton } from '../../components/common/AppButton';

export const AddressesScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    addresses,
    selectedAddress,
    selectAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddress();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (addr: Address) => {
    setEditingAddress(addr);
    setModalVisible(true);
  };

  const handleSave = async (data: Omit<Address, 'id'>) => {
    if (editingAddress) {
      await updateAddress(editingAddress.id, data);
      setToastMessage('Address updated successfully');
    } else {
      await addAddress(data);
      setToastMessage('New address saved successfully');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteAddress(deleteId);
      setDeleteId(null);
      setToastMessage('Address deleted');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Saved Addresses"
        subtitle={`${addresses.length} locations saved`}
        rightAction={
          <TouchableOpacity onPress={handleOpenAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = selectedAddress?.id === item.id;

          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                  borderRadius: theme.borderRadius.lg,
                  ...theme.shadows.sm,
                },
              ]}
            >
              <View style={styles.topRow}>
                <View style={styles.badgeGroup}>
                  <View style={[styles.typeBadge, { backgroundColor: theme.colors.primaryLight }]}>
                    <Ionicons
                      name={item.type === 'Home' ? 'home' : item.type === 'Work' ? 'briefcase' : 'location'}
                      size={14}
                      color={theme.colors.primaryDark}
                    />
                    <Text style={[styles.typeText, { color: theme.colors.primaryDark }]}>
                      {item.type.toUpperCase()}
                    </Text>
                  </View>

                  {item.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: theme.colors.secondaryLight }]}>
                      <Text style={[styles.defaultText, { color: '#92400E' }]}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionIcons}>
                  <TouchableOpacity
                    onPress={() => handleOpenEdit(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.actionIcon}
                  >
                    <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>

                  {addresses.length > 1 && (
                    <TouchableOpacity
                      onPress={() => setDeleteId(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.actionIcon}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text
                style={[
                  styles.name,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.sm,
                    fontWeight: theme.typography.weight.bold,
                  },
                ]}
              >
                {item.name}
              </Text>

              <Text
                style={[
                  styles.addressLine,
                  { color: theme.colors.textSecondary, fontSize: theme.typography.size.xs },
                ]}
              >
                {item.doorFlat}, {item.street}, {item.area}, {item.city} - {item.pincode}
              </Text>

              <Text
                style={[
                  styles.phone,
                  { color: theme.colors.textMuted, fontSize: theme.typography.size.xs },
                ]}
              >
                Mobile: +91 {item.phone}
              </Text>

              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.bottomActions}>
                <TouchableOpacity
                  onPress={() => selectAddress(item)}
                  style={styles.selectRow}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.selectText,
                      {
                        color: isSelected ? theme.colors.primaryDark : theme.colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {isSelected ? 'Active Delivery Location' : 'Deliver Here'}
                  </Text>
                </TouchableOpacity>

                {!item.isDefault && (
                  <TouchableOpacity onPress={() => setDefaultAddress(item.id)}>
                    <Text style={[styles.setDefaultText, { color: theme.colors.primary }]}>
                      Set as default
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={{ marginTop: 8, marginBottom: 32 }}>
            <AppButton
              title="+ Add New Address"
              onPress={handleOpenAdd}
              variant="outline"
              size="md"
            />
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <AddressFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSave}
        initialData={editingAddress}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!deleteId}
        title="Delete Address?"
        message="Are you sure you want to remove this delivery address from your profile?"
        confirmText="Delete"
        confirmVariant="danger"
        iconName="trash-outline"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      <ToastMessage
        visible={!!toastMessage}
        message={toastMessage || ''}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 14,
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 9,
    fontWeight: '800',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    padding: 2,
  },
  name: {
    marginBottom: 4,
  },
  addressLine: {
    lineHeight: 18,
    marginBottom: 4,
  },
  phone: {
    marginBottom: 6,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 12,
    marginLeft: 6,
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
