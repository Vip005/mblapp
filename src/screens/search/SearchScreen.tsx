import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, Product } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { SearchBar } from '../../components/common/SearchBar';
import { ProductCard } from '../../components/product/ProductCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { productService } from '../../services/api/productService';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { getSafeUserErrorMessage, sanitizeDevLog } from '../../utils/apiError';

const POPULAR_SEARCHES = ['Milk', 'Tomato', 'Apple', 'Basmati Rice', 'Sunflower Oil', 'Bread', 'Paneer', 'Eggs'];

export const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<unknown | null>(null);

  // Load recent searches from AsyncStorage
  useEffect(() => {
    storage.get<string[]>(STORAGE_KEYS.RECENT_SEARCHES, ['Milk', 'Fresh Apple', 'Tata Tea']).then((saved) => {
      setRecentSearches(saved);
    });
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    const clean = searchQuery.trim();
    if (!clean) {
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    try {
      setSearchError(null);
      setHasSearched(true);
      const matched = await productService.searchProducts(clean);
      setResults(matched);

      // Update recent searches
      setRecentSearches((prev) => {
        const updated = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
        storage.set(STORAGE_KEYS.RECENT_SEARCHES, updated);
        return updated;
      });
    } catch (err) {
      sanitizeDevLog('SearchScreen.performSearch', err);
      setSearchError(err);
      setResults([]);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query, performSearch]);

  const handleSelectRecent = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
    storage.remove(STORAGE_KEYS.RECENT_SEARCHES);
  };

  const handleDeleteItem = (term: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((t) => t !== term);
      storage.set(STORAGE_KEYS.RECENT_SEARCHES, updated);
      return updated;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.borderLight,
            paddingTop: Math.max(insets.top, 12) + 8,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.backBtn, { backgroundColor: theme.colors.background }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onClear={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
            }}
            onSubmit={() => performSearch(query)}
            placeholder="Search milk, fruits, oil..."
            autoFocus
          />
        </View>
      </View>

      {/* When query is empty -> show Recent & Popular Searches */}
      {!hasSearched ? (
        <ScrollView style={styles.idleContent} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.size.sm,
                      fontWeight: theme.typography.weight.bold,
                    },
                  ]}
                >
                  Recent Searches
                </Text>
                <TouchableOpacity onPress={handleClearHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.clearText, { color: theme.colors.error, fontSize: theme.typography.size.xs }]}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chipRow}>
                {recentSearches.map((term, index) => (
                  <View
                    key={index}
                    style={[
                      styles.recentChip,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        borderRadius: theme.borderRadius.round,
                      },
                    ]}
                  >
                    <TouchableOpacity onPress={() => handleSelectRecent(term)} style={styles.recentChipTextWrapper}>
                      <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: theme.colors.textPrimary,
                            fontSize: theme.typography.size.xs,
                          },
                        ]}
                      >
                        {term}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(term)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close" size={14} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Popular Searches */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.sm,
                  fontWeight: theme.typography.weight.bold,
                  marginBottom: 12,
                },
              ]}
            >
              Popular Searches
            </Text>
            <View style={styles.chipRow}>
              {POPULAR_SEARCHES.map((term, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectRecent(term)}
                  style={[
                    styles.popularChip,
                    {
                      backgroundColor: theme.colors.primaryLight,
                      borderColor: theme.colors.primary,
                      borderRadius: theme.borderRadius.round,
                    },
                  ]}
                >
                  <Ionicons name="trending-up" size={14} color={theme.colors.primaryDark} />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: theme.colors.primaryDarker,
                        fontSize: theme.typography.size.xs,
                        fontWeight: theme.typography.weight.semibold,
                      },
                    ]}
                  >
                    {term}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : searchError ? (
        <ErrorState
          title="Search Failed"
          message={getSafeUserErrorMessage(searchError, 'search')}
          onRetry={() => performSearch(query)}
        />
      ) : results.length === 0 ? (
        <EmptyState
          iconName="search-outline"
          title={`No results for "${query}"`}
          description="Try searching for general items like 'milk', 'vegetables', 'apple', 'bread', or 'oil'."
          buttonLabel="Clear Search"
          onButtonPress={() => {
            setQuery('');
            setResults([]);
            setHasSearched(false);
            setSearchError(null);
          }}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultsCount, { color: theme.colors.textMuted }]}>
              Found {results.length} matching items
            </Text>
          }
          renderItem={({ item }) => <ProductCard product={item} variant="list" />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {},
  clearText: {
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    borderWidth: 1,
  },
  recentChipTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipText: {
    marginLeft: 6,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  resultsCount: {
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 2,
  },
});
