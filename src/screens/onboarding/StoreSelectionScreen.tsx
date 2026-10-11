import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Store, User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { useAddress } from '../../hooks/useAddress';
import { useCart } from '../../hooks/useCart';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { AppButton } from '../../components/common/AppButton';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';
import { findMatchingStores, normalizePincode } from '../../utils/storeMatcher';

export const StoreSelectionScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'StoreSelection'>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { stores, isLoading: storesLoading, selectStore } = useStore();
  const { selectedAddress, addresses } = useAddress();
  const { items, cartStoreId, clearCart } = useCart();

  // Resolve customer pincode from route params, or selected address, or first address
  const customerPincode = useMemo(() => {
    const raw =
      route.params?.customerPincode ||
      selectedAddress?.pincode ||
      (addresses.length > 0 ? addresses[0].pincode : '');
    return normalizePincode(raw);
  }, [route.params?.customerPincode, selectedAddress?.pincode, addresses]);

  // Match stores against pincode
  const { matchingStores, otherStores, hasMatch } = useMemo(() => {
    return findMatchingStores(customerPincode, stores);
  }, [customerPincode, stores]);

  // Local state for chosen store
  const [chosenStore, setChosenStore] = useState<Store | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCartResetModal, setShowCartResetModal] = useState(false);

  // Auto-select first recommended match if available, or first store
  useEffect(() => {
    if (!chosenStore && stores.length > 0) {
      if (matchingStores.length > 0) {
        setChosenStore(matchingStores[0]);
      } else {
        setChosenStore(stores[0]);
      }
    }
  }, [matchingStores, stores, chosenStore]);

  const executeStoreSelection = async (store: Store) => {
    setSubmitting(true);
    try {
      await selectStore(store);
      const customerId = user?.id || (await storage.get<User | null>(STORAGE_KEYS.USER, null))?.id;
      if (customerId) {
        await storage.set(STORAGE_KEYS.customerOnboarding(customerId), true);
      }
      const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>() || navigation;
      rootNav.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err) {
      console.warn('[StoreSelectionScreen] Failed to save store:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStore = async () => {
    if (!chosenStore) return;
    // If cart has items from a different store, prompt user before clearing
    if (cartStoreId && cartStoreId !== chosenStore.id && items.length > 0) {
      setShowCartResetModal(true);
      return;
    }
    await executeStoreSelection(chosenStore);
  };

  const handleConfirmCartReset = async () => {
    setShowCartResetModal(false);
    await clearCart();
    if (chosenStore) {
      await executeStoreSelection(chosenStore);
    }
  };

  const renderStoreItem = (store: Store, isRecommended: boolean) => {
    const isSelected = chosenStore?.id === store.id;

    return (
      <TouchableOpacity
        key={store.id}
        activeOpacity={0.7}
        onPress={() => setChosenStore(store)}
        style={[
          styles.storeCard,
          {
            backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.card,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            ...theme.shadows.sm,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.storeTitleRow}>
            <Ionicons
              name="business"
              size={20}
              color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.storeName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {store.name}
            </Text>
          </View>

          <View
            style={[
              styles.radioCircle,
              {
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                backgroundColor: isSelected ? theme.colors.primary : 'transparent',
              },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
        </View>

        {isRecommended && (
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.badgeText}>Nearest / Recommended</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={[styles.storeAddress, { color: theme.colors.textSecondary }]}>
            {store.addressLine1 ? `${store.addressLine1}, ` : ''}
            {store.district} - {store.pincode}
          </Text>

          {store.phone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={13} color={theme.colors.textLight} />
              <Text style={[styles.phoneText, { color: theme.colors.textLight }]}>
                {store.phone}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
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
      {/* Top Delivery Hub Header */}
      <View style={styles.header}>
        <View style={[styles.headerBadge, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="storefront" size={14} color={theme.colors.primaryDark} />
          <Text style={[styles.headerBadgeText, { color: theme.colors.primaryDarker }]}>
            Express Delivery Hub
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Choose Delivery Store</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Select your nearest FreshMart hub for instant 10-15 minute grocery delivery.
        </Text>

        {/* Delivery Pincode Banner */}
        <View
          style={[
            styles.pincodeBanner,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              ...theme.shadows.sm,
            },
          ]}
        >
          <View style={[styles.pincodeIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="location" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.pincodeInfo}>
            <Text style={[styles.pincodeLabel, { color: theme.colors.textSecondary }]}>
              Delivery Pincode
            </Text>
            <Text style={[styles.pincodeValue, { color: theme.colors.textPrimary }]}>
              {customerPincode || 'Not specified'}
            </Text>
          </View>
          {hasMatch ? (
            <View style={[styles.matchStatusBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.matchStatusText, { color: '#2E7D32' }]}>Match Found</Text>
            </View>
          ) : (
            <View style={[styles.matchStatusBadge, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.matchStatusText, { color: '#E65100' }]}>Select Any</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stores List */}
      {storesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading FreshMart stores...
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.listContent}>
              {/* No match notice */}
              {!hasMatch && (
                <View
                  style={[
                    styles.noMatchBanner,
                    {
                      backgroundColor: '#FFF8E1',
                      borderColor: '#FFE082',
                    },
                  ]}
                >
                  <Ionicons name="information-circle" size={20} color="#F57C00" />
                  <Text style={[styles.noMatchText, { color: '#5D4037' }]}>
                    No direct store match was found for pincode {customerPincode}. You can choose
                    any of our available stores below to enjoy grocery delivery.
                  </Text>
                </View>
              )}

              {/* Recommended Stores */}
              {matchingStores.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    Recommended for You ({matchingStores.length})
                  </Text>
                  {matchingStores.map((s) => renderStoreItem(s, true))}
                </View>
              )}

              {/* Other Stores */}
              {otherStores.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    {matchingStores.length > 0
                      ? `Other Stores (${otherStores.length})`
                      : `Available Stores (${otherStores.length})`}
                  </Text>
                  {otherStores.map((s) => renderStoreItem(s, false))}
                </View>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollArea}
        />
      )}

      {/* Bottom Sticky Action */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            ...theme.shadows.md,
          },
        ]}
      >
        {chosenStore && (
          <View style={styles.selectedSummary}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Selected:
            </Text>
            <Text style={[styles.summaryStoreName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {chosenStore.name} ({chosenStore.district})
            </Text>
          </View>
        )}
        <AppButton
          title="Confirm & Start Shopping"
          onPress={handleConfirmStore}
          loading={submitting}
          disabled={!chosenStore}
          fullWidth
          size="lg"
        />
      </View>

      <ConfirmationModal
        visible={showCartResetModal}
        title="Switch Store & Reset Cart?"
        message={`Your cart contains ${items.length} item(s) from your previously selected store. Switching to ${chosenStore?.name || 'this store'} will clear your existing cart items.`}
        confirmText="Clear & Switch"
        cancelText="Keep Current"
        confirmVariant="danger"
        iconName="alert-circle-outline"
        onConfirm={handleConfirmCartReset}
        onCancel={() => setShowCartResetModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
    gap: 5,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  pincodeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  pincodeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pincodeInfo: {
    flex: 1,
  },
  pincodeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  pincodeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  matchStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scrollArea: {
    paddingBottom: 24,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  noMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  noMatchText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  storeCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    marginTop: 2,
    gap: 4,
  },
  storeAddress: {
    fontSize: 13,
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryStoreName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
