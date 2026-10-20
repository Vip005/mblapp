import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Category, Product, Brand, Banner, Offer } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../hooks/useStore';
import { DeliveryLocationHeader } from '../../components/home/DeliveryLocationHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { BannerCarousel } from '../../components/home/BannerCarousel';
import { CategoryItem } from '../../components/home/CategoryItem';
import { SectionHeader } from '../../components/home/SectionHeader';
import { OffersCarousel } from '../../components/home/OffersCarousel';
import { ProductCard } from '../../components/product/ProductCard';
import { bannerService } from '../../services/api/bannerService';
import { offerService } from '../../services/api/offerService';
import { categoryService } from '../../services/api/categoryService';
import { productService } from '../../services/api/productService';
import { brandService } from '../../services/api/brandService';
import { Ionicons } from '@expo/vector-icons';

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedStoreId, selectedStore } = useStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = useCallback(async (storeId?: number | null) => {
    const targetStoreId = storeId ?? selectedStoreId;
    if (!targetStoreId) {
      setCategories([]);
      setBanners([]);
      setOffers([]);
      setFlashDeals([]);
      setPopularProducts([]);
      setRecommended([]);
      setBrands([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Immediately clear previous banners and offers so old store data never lingers
      setBanners([]);
      setOffers([]);

      const [cats, allProducts, storeBrands, storeBanners, storeOffers] = await Promise.all([
        categoryService.getCategories(targetStoreId),
        productService.getProducts(undefined, undefined, targetStoreId),
        brandService.getBrands(targetStoreId),
        bannerService.getBanners(targetStoreId).catch((err) => {
          if (__DEV__) {
            console.warn('[HomeScreen] Failed to load banners:', err?.message || err);
          }
          return [] as Banner[];
        }),
        offerService.getOffers(targetStoreId).catch((err) => {
          if (__DEV__) {
            console.warn('[HomeScreen] Failed to load offers:', err?.message || err);
          }
          return [] as Offer[];
        }),
      ]);

      const deals = allProducts.filter((p) => p.isFlashDeal || p.discount >= 10);
      const popular = allProducts.filter((p) => p.isPopular);

      setCategories(cats);
      setFlashDeals(deals.length > 0 ? deals : allProducts.slice(0, 4));
      setPopularProducts(popular.length > 0 ? popular : allProducts.slice(0, 6));
      setRecommended(allProducts.slice(0, 10));
      setBrands(storeBrands);
      setBanners(storeBanners || []);
      setOffers(storeOffers || []);
    } catch (e) {
      console.warn('[HomeScreen] Failed to load store home data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    loadHomeData(selectedStoreId);
  }, [selectedStoreId, loadHomeData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHomeData(selectedStoreId);
    setRefreshing(false);
  }, [selectedStoreId, loadHomeData]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Delivery Location & Profile Bar */}
      <DeliveryLocationHeader />

      {/* Main Scroll Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Clickable Search Bar trigger */}
        <View style={styles.searchWrapper}>
          <SearchBar
            editable={false}
            onPress={() => navigation.navigate('Search')}
            placeholder="Search groceries, fruits, vegetables..."
          />
        </View>

        {/* Banner Carousel (only rendered when active banners exist) */}
        {banners.length > 0 && <BannerCarousel banners={banners} />}

        {/* Loading Indicator for Store Switch / Fetch */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <RNText style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading products from {selectedStore?.name || 'store'}...
            </RNText>
          </View>
        ) : categories.length === 0 && recommended.length === 0 && flashDeals.length === 0 ? (
          <View style={[styles.emptyStoreBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="storefront-outline" size={48} color={theme.colors.textMuted} />
            <RNText style={[styles.emptyStoreTitle, { color: theme.colors.textPrimary }]}>
              No Products in {selectedStore?.name || 'Selected Store'}
            </RNText>
            <RNText style={[styles.emptyStoreSub, { color: theme.colors.textSecondary }]}>
              This store currently has no active inventory. You can choose a different nearby store anytime.
            </RNText>
            <TouchableOpacity
              style={[styles.switchStoreBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('StoreSelection')}
            >
              <RNText style={styles.switchStoreBtnText}>Switch Store</RNText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Categories Section */}
            {categories.length > 0 && (
              <>
                <SectionHeader
                  title="Explore Categories"
                  subtitle="Handpicked daily essentials"
                  onSeeAll={() => navigation.navigate('Main', { screen: 'CategoriesTab' })}
                  seeAllText={`All ${categories.length}`}
                />
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesList}
                  renderItem={({ item }) => <CategoryItem category={item} size="md" />}
                />
              </>
            )}

            {/* Special Offers Section (Store-scoped active offers: dynamic 1, multiple, or 0) */}
            <OffersCarousel
              offers={offers}
              onViewAll={() => navigation.navigate('Offers')}
              loading={loading}
            />

            {/* Featured Brands Section (if available for this store) */}
            {brands.length > 0 && (
              <View style={styles.sectionBox}>
                <SectionHeader
                  title="Featured Brands"
                  subtitle="Top brands at your store"
                />
                <FlatList
                  data={brands}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.brandsList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.brandCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
                      onPress={() => navigation.navigate('ProductListing', { title: item.name })}
                    >
                      <RNText style={[styles.brandName, { color: theme.colors.textPrimary }]}>
                        {item.name}
                      </RNText>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Flash Deals (High Discounts) */}
            {flashDeals.length > 0 && (
              <View style={styles.sectionBox}>
                <SectionHeader
                  title="⚡ Flash Deals"
                  subtitle="Crazy discounts on bestsellers"
                  onSeeAll={() => navigation.navigate('ProductListing', { title: 'Flash Deals' })}
                />
                <FlatList
                  data={flashDeals}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalProductsList}
                  renderItem={({ item }) => <ProductCard product={item} variant="horizontal" />}
                />
              </View>
            )}

            {/* Popular Products */}
            {popularProducts.length > 0 && (
              <View style={styles.sectionBox}>
                <SectionHeader
                  title="🔥 Popular in Your Area"
                  subtitle="Most bought grocery items"
                  onSeeAll={() => navigation.navigate('ProductListing', { title: 'Popular Products' })}
                />
                <FlatList
                  data={popularProducts}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalProductsList}
                  renderItem={({ item }) => <ProductCard product={item} variant="horizontal" />}
                />
              </View>
            )}

            {/* Recommended For You */}
            {recommended.length > 0 && (
              <View style={styles.sectionBox}>
                <SectionHeader
                  title="Recommended For You"
                  subtitle="Based on seasonal trends"
                  onSeeAll={() => navigation.navigate('ProductListing', { title: 'Recommended Products' })}
                />
                <View style={styles.gridContainer}>
                  {recommended.map((prod) => (
                    <View key={prod.id} style={styles.gridItemWrapper}>
                      <ProductCard product={prod} variant="grid" />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  brandsList: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  brandCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionBox: {
    marginTop: 8,
  },
  horizontalProductsList: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  gridItemWrapper: {
    width: '50%',
    paddingHorizontal: 6,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyStoreBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyStoreTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyStoreSub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  switchStoreBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  switchStoreBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
