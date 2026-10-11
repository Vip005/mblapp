import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Offer, Coupon } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../hooks/useStore';
import { AppHeader } from '../../components/common/AppHeader';
import { ToastMessage } from '../../components/feedback/ToastMessage';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { couponService } from '../../services/api/couponService';
import { offerService } from '../../services/api/offerService';
import { isValidImageUri } from '../../components/common/SafeImage';

const formatOfferDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `Valid till ${d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  } catch {
    return '';
  }
};

export const OffersScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedStore, selectedStoreId } = useStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [fetchedCoupons, fetchedOffers] = await Promise.all([
        couponService.getCoupons(selectedStoreId ?? undefined),
        offerService.getOffers(selectedStoreId ?? undefined),
      ]);
      setCoupons(fetchedCoupons);
      setOffers(fetchedOffers);
    } catch (err) {
      console.warn('[OffersScreen] Error loading store offers/coupons:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCoupon = (code: string) => {
    setToastMessage(`Coupon code "${code}" copied to clipboard! Paste it at checkout.`);
  };

  const handleOfferPress = (offer: Offer) => {
    if (offer.productId) {
      navigation.navigate('ProductDetails', { productId: offer.productId });
    } else if (offer.categoryId) {
      navigation.navigate('ProductListing', {
        categoryId: offer.categoryId,
        title: offer.title,
        offerId: offer.id,
      });
    } else {
      navigation.navigate('ProductListing', {
        title: offer.title,
        offerId: offer.id,
      });
    }
  };

  const hasContent = coupons.length > 0 || offers.length > 0;
  const heroCoupon = coupons[0];
  const heroOffer = !heroCoupon && offers.length > 0 ? offers[0] : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Offers & Coupons"
        subtitle={selectedStore ? `Exclusive deals for ${selectedStore.name}` : 'Save big on your daily groceries'}
      />

      {loading ? (
        <LoadingState message="Loading store offers & coupons..." />
      ) : !hasContent ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={theme.colors.primary}
            />
          }
        >
          <EmptyState
            iconName="pricetag-outline"
            title="No Active Offers"
            description={
              selectedStore
                ? `There are currently no active offers or coupons for ${selectedStore.name}. Check back soon for new savings!`
                : 'Please select a store to view available offers and discounts.'
            }
            buttonLabel={selectedStore ? undefined : 'Select Store'}
            onButtonPress={selectedStore ? undefined : () => navigation.navigate('StoreSelection')}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Top Promotional Hero */}
          {heroCoupon ? (
            <View
              style={[
                styles.heroCard,
                { backgroundColor: theme.colors.primaryDarker, borderRadius: theme.borderRadius.xl },
              ]}
            >
              <Text style={styles.heroBadge}>STORE SPECIAL DEAL</Text>
              <Text style={styles.heroTitle}>{heroCoupon.title}</Text>
              <Text style={styles.heroSub}>{heroCoupon.description}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleCopyCoupon(heroCoupon.code)}
                style={[
                  styles.heroCopyBtn,
                  { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.sm },
                ]}
              >
                <Ionicons name="copy-outline" size={16} color={theme.colors.primaryDark} />
                <Text style={[styles.heroCopyText, { color: theme.colors.primaryDark }]}>
                  Copy: {heroCoupon.code}
                </Text>
              </TouchableOpacity>
            </View>
          ) : heroOffer ? (
            <View
              style={[
                styles.heroCard,
                { backgroundColor: theme.colors.primaryDarker, borderRadius: theme.borderRadius.xl },
              ]}
            >
              <View style={styles.badgeWrapper}>
                <View style={[styles.discountPill, { backgroundColor: theme.colors.secondary }]}>
                  <Ionicons name="pricetag" size={12} color={theme.colors.white} />
                  <Text style={styles.discountPillText}>
                    {heroOffer.discountPercent
                      ? `${heroOffer.discountPercent}% OFF`
                      : heroOffer.discountValue
                      ? `₹${heroOffer.discountValue} OFF`
                      : 'SPECIAL DEAL'}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{heroOffer.title}</Text>
              <Text style={styles.heroSub}>{heroOffer.offerMessage || heroOffer.description}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleOfferPress(heroOffer)}
                style={[
                  styles.heroCopyBtn,
                  { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.sm },
                ]}
              >
                <Ionicons name="arrow-forward-outline" size={16} color={theme.colors.primaryDark} />
                <Text style={[styles.heroCopyText, { color: theme.colors.primaryDark }]}>
                  Shop Now
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Available Coupon Codes */}
          {coupons.length > 0 && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.md,
                    fontWeight: theme.typography.weight.bold,
                  },
                ]}
              >
                Available Coupons ({coupons.length})
              </Text>

              <View style={styles.couponsList}>
                {coupons.map((coupon) => (
                  <View
                    key={coupon.code}
                    style={[
                      styles.couponCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderLight,
                        borderRadius: theme.borderRadius.lg,
                        ...theme.shadows.sm,
                      },
                    ]}
                  >
                    <View style={styles.couponLeftCol}>
                      <View style={[styles.couponBadge, { backgroundColor: theme.colors.primaryLight }]}>
                        <Text style={[styles.couponCodeText, { color: theme.colors.primaryDark }]}>
                          {coupon.code}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.couponTitle,
                          {
                            color: theme.colors.textPrimary,
                            fontSize: theme.typography.size.sm,
                            fontWeight: theme.typography.weight.bold,
                          },
                        ]}
                      >
                        {coupon.title}
                      </Text>
                      <Text
                        style={[
                          styles.couponDesc,
                          { color: theme.colors.textSecondary, fontSize: theme.typography.size.xs },
                        ]}
                      >
                        {coupon.description}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleCopyCoupon(coupon.code)}
                      style={[styles.copyBtn, { borderColor: theme.colors.primary }]}
                    >
                      <Text style={[styles.copyBtnText, { color: theme.colors.primary }]}>COPY</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Featured Deals & Combos */}
          {offers.length > 0 && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.md,
                    fontWeight: theme.typography.weight.bold,
                    marginTop: coupons.length > 0 ? 20 : 0,
                  },
                ]}
              >
                Featured Deals & Combos ({offers.length})
              </Text>

              {offers.map((offer) => {
                let discountBadge = '';
                if (offer.discountPercent && offer.discountPercent > 0) {
                  discountBadge = `${offer.discountPercent}% OFF`;
                } else if (offer.discountValue && offer.discountValue > 0) {
                  discountBadge = `₹${offer.discountValue} OFF`;
                } else {
                  discountBadge = 'SPECIAL DEAL';
                }

                let targetLabel = '';
                if (offer.categories && offer.categories.length > 0) {
                  targetLabel = offer.categories.map((c) => c.name).join(', ');
                } else if (offer.categoryName) {
                  targetLabel = offer.categoryName;
                } else if (offer.productName) {
                  targetLabel = offer.productName;
                } else if (offer.offerScope === 'ALL_STORES') {
                  targetLabel = 'All Store Products';
                }

                return (
                  <TouchableOpacity
                    key={offer.id}
                    activeOpacity={0.85}
                    onPress={() => handleOfferPress(offer)}
                    style={[
                      styles.offerCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderLight,
                        borderRadius: theme.borderRadius.lg,
                        ...theme.shadows.sm,
                      },
                    ]}
                  >
                    {isValidImageUri(offer.image) ? (
                      <Image source={{ uri: offer.image!.trim() }} style={styles.offerImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.offerBannerHeader, { backgroundColor: theme.colors.primaryDarker }]}>
                        <View style={styles.badgeWrapper}>
                          <View style={[styles.discountPill, { backgroundColor: theme.colors.secondary }]}>
                            <Ionicons name="pricetag" size={12} color={theme.colors.white} />
                            <Text style={styles.discountPillText}>{discountBadge}</Text>
                          </View>
                        </View>
                        {offer.validUntil ? (
                          <Text style={styles.validUntilHeaderText}>{formatOfferDate(offer.validUntil)}</Text>
                        ) : null}
                      </View>
                    )}

                    <View style={styles.offerContent}>
                      {isValidImageUri(offer.image) && (
                        <View style={styles.offerBadgeRow}>
                          <View style={[styles.dealBadge, { backgroundColor: theme.colors.secondaryLight }]}>
                            <Text style={[styles.dealBadgeText, { color: '#92400E' }]}>
                              {discountBadge}
                            </Text>
                          </View>
                          {offer.validUntil && (
                            <Text style={[styles.validUntilText, { color: theme.colors.textMuted }]}>
                              {formatOfferDate(offer.validUntil)}
                            </Text>
                          )}
                        </View>
                      )}

                      <Text
                        style={[
                          styles.offerTitle,
                          {
                            color: theme.colors.textPrimary,
                            fontSize: theme.typography.size.md,
                            fontWeight: theme.typography.weight.bold,
                          },
                        ]}
                      >
                        {offer.title}
                      </Text>
                      <Text
                        style={[
                          styles.offerDesc,
                          { color: theme.colors.textSecondary, fontSize: theme.typography.size.xs },
                        ]}
                      >
                        {offer.offerMessage || offer.description}
                      </Text>

                      {targetLabel ? (
                        <View style={styles.offerScopeRow}>
                          <Ionicons name="apps-outline" size={13} color={theme.colors.textMuted} />
                          <Text
                            numberOfLines={1}
                            style={[styles.offerScopeText, { color: theme.colors.textSecondary }]}
                          >
                            Applicable on: {targetLabel}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.shopNowRow}>
                        <Text style={[styles.shopNowText, { color: theme.colors.primary }]}>
                          Shop Applicable Items →
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <ToastMessage
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    padding: 20,
    marginBottom: 24,
  },
  heroBadge: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 6,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginBottom: 16,
  },
  heroCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroCopyText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  couponsList: {
    gap: 10,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
  },
  couponLeftCol: {
    flex: 1,
    paddingRight: 12,
  },
  couponBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  couponCodeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  couponTitle: {
    marginBottom: 2,
  },
  couponDesc: {},
  copyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offerCard: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  offerImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F1F5F9',
  },
  offerContent: {
    padding: 14,
  },
  offerBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dealBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  validUntilText: {
    fontSize: 11,
  },
  offerTitle: {
    marginBottom: 4,
  },
  offerDesc: {
    lineHeight: 16,
    marginBottom: 10,
  },
  shopNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopNowText: {
    fontSize: 13,
    fontWeight: '700',
  },
  offerBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  discountPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  validUntilHeaderText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  offerScopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  offerScopeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
