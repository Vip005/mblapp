import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Product, FilterOptions, SortOption, Category } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../hooks/useStore';
import { AppHeader } from '../../components/common/AppHeader';
import { CartBadgeButton } from '../../components/common/CartBadgeButton';
import { SearchBar } from '../../components/common/SearchBar';
import { ProductGrid } from '../../components/product/ProductGrid';
import { ProductList } from '../../components/product/ProductList';
import { FilterModal } from '../../components/modals/FilterModal';
import { EmptyState } from '../../components/feedback/EmptyState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { productService } from '../../services/api/productService';
import { categoryService } from '../../services/api/categoryService';
import { getSafeUserErrorMessage, sanitizeDevLog } from '../../utils/apiError';

export const ProductListingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductListing'>>();
  const { selectedStoreId, selectedStore } = useStore();

  const {
    categoryId: initialCategoryId,
    title = 'Products',
    query: initialQuery,
    brand: initialBrand,
  } = route.params || {};

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [filters, setFilters] = useState<FilterOptions>({
    categoryId: initialCategoryId,
    brand: initialBrand,
  });
  const [sort, setSort] = useState<SortOption>('popularity');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  const loadData = useCallback(async () => {
  setLoadError(null);
  if (!selectedStoreId) {
    setCategories([]);
    setProducts([]);
    setLoading(false);
    return;
  }

  try {
    setLoading(true);

    console.log(
      '[ProductListingScreen] Store ID:',
      selectedStoreId
    );

    const allCats = await categoryService.getCategories(
      selectedStoreId
    );

    setCategories(allCats);

    let allProds: Product[] = [];

    const categoryToLoad =
      filters.categoryId || initialCategoryId;

    if (categoryToLoad) {
      console.log(
        '[ProductListingScreen] Category ID:',
        categoryToLoad
      );

      allProds =
        await productService.getProductsByCategory(
          String(categoryToLoad),
          selectedStoreId
        );

      console.log(
        '[ProductListingScreen] Category products count:',
        allProds.length
      );
    } else {
      console.log(
        '[ProductListingScreen] Loading all products'
      );

      allProds =
        await productService.getProducts(
          filters,
          sort,
          selectedStoreId
        );
    }

    // Apply sorting for category products
    if (sort && allProds.length > 0) {
      switch (sort) {
        case 'price_asc':
          allProds.sort(
            (a, b) => a.sellingPrice - b.sellingPrice
          );
          break;

        case 'price_desc':
          allProds.sort(
            (a, b) => b.sellingPrice - a.sellingPrice
          );
          break;

        case 'rating':
          allProds.sort(
            (a, b) => b.rating - a.rating
          );
          break;

        case 'popularity':
          allProds.sort(
            (a, b) => b.reviewCount - a.reviewCount
          );
          break;

        case 'newest':
          allProds.reverse();
          break;
      }
    }

    setProducts(allProds);
  } catch (e: any) {
    sanitizeDevLog('ProductListingScreen.loadData', e);
    setLoadError(e);
    setProducts([]);
  } finally {
    setLoading(false);
  }
}, [
  selectedStoreId,
  initialCategoryId,
  filters,
  sort,
]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side quick search filtering on current products
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const clean = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(clean);
      const matchBrand = p.brand.toLowerCase().includes(clean);
      return matchName || matchBrand;
    });
  }, [products, searchQuery]);

  const activeFilterCount =
    (filters.categoryId && filters.categoryId !== initialCategoryId ? 1 : 0) +
    (typeof filters.minPrice === 'number' ? 1 : 0) +
    (typeof filters.minRating === 'number' ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (sort !== 'popularity' ? 1 : 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={title}
        subtitle={`${filteredProducts.length} items available`}
        rightAction={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              style={[styles.toggleBtn, { backgroundColor: theme.colors.background }]}
              accessibilityRole="button"
              accessibilityLabel={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            >
              <Ionicons
                name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
                size={20}
                color={theme.colors.textPrimary}
              />
            </TouchableOpacity>

            <CartBadgeButton
              buttonSize={36}
              size={20}
              style={{ marginLeft: 8 }}
            />
          </View>
        }
      />

      {/* Search and Filter Row */}
      <View style={[styles.controlsRow, { backgroundColor: theme.colors.surface }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search in this list..."
            style={styles.searchBar}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFilterModalVisible(true)}
          style={[
            styles.filterBtn,
            {
              backgroundColor: activeFilterCount > 0 ? theme.colors.primaryLight : theme.colors.surface,
              borderColor: activeFilterCount > 0 ? theme.colors.primary : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? theme.colors.primaryDark : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.filterBtnText,
              {
                color: activeFilterCount > 0 ? theme.colors.primaryDark : theme.colors.textPrimary,
                fontWeight: activeFilterCount > 0 ? '700' : '600',
              },
            ]}
          >
            Filter
          </Text>
          {activeFilterCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Listing */}
      {loading ? (
        <LoadingState message="Fetching grocery items..." />
      ) : loadError ? (
        <ErrorState
          title="Unable to Load Products"
          message={getSafeUserErrorMessage(loadError, 'product')}
          onRetry={loadData}
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          iconName="search-outline"
          title="No Products Found"
          description="We couldn't find any products matching your filters or search keywords. Try adjusting your search."
          buttonLabel="Reset All Filters"
          onButtonPress={() => {
            setSearchQuery('');
            setFilters({});
            setSort('popularity');
          }}
        />
      ) : viewMode === 'grid' ? (
        <ProductGrid products={filteredProducts} onRefresh={loadData} refreshing={loading} />
      ) : (
        <ProductList products={filteredProducts} onRefresh={loadData} refreshing={loading} />
      )}

      {/* Filter & Sort Bottom Sheet Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        categories={categories}
        currentFilters={filters}
        currentSort={sort}
        onApply={(newFilters, newSort) => {
          setFilters(newFilters);
          setSort(newSort);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    height: 42,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterBtnText: {
    marginLeft: 6,
    fontSize: 13,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
