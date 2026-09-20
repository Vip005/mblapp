import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FilterOptions, SortOption, Category } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from '../common/AppButton';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  currentFilters: FilterOptions;
  currentSort: SortOption;
  onApply: (filters: FilterOptions, sort: SortOption) => void;
}

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'newest', label: 'Newest First' },
];

const RATING_OPTIONS = [
  { label: 'All', value: undefined },
  { label: '4.5 ★ & above', value: 4.5 },
  { label: '4.0 ★ & above', value: 4.0 },
  { label: '3.5 ★ & above', value: 3.5 },
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  categories,
  currentFilters,
  currentSort,
  onApply,
}) => {
  const { theme } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    currentFilters.categoryId
  );
  const [selectedRating, setSelectedRating] = useState<number | undefined>(
    currentFilters.minRating
  );
  const [inStockOnly, setInStockOnly] = useState<boolean>(
    currentFilters.inStockOnly ?? false
  );
  const [selectedSort, setSelectedSort] = useState<SortOption>(currentSort);

  useEffect(() => {
    if (visible) {
      setSelectedCategory(currentFilters.categoryId);
      setSelectedRating(currentFilters.minRating);
      setInStockOnly(currentFilters.inStockOnly ?? false);
      setSelectedSort(currentSort);
    }
  }, [visible, currentFilters, currentSort]);

  const handleReset = () => {
    setSelectedCategory(undefined);
    setSelectedRating(undefined);
    setInStockOnly(false);
    setSelectedSort('popularity');
  };

  const handleApply = () => {
    onApply(
      {
        ...currentFilters,
        categoryId: selectedCategory,
        minRating: selectedRating,
        inStockOnly,
      },
      selectedSort
    );
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
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
              Filter & Sort
            </Text>

            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Sort Section */}
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
              Sort By
            </Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = selectedSort === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setSelectedSort(opt.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        borderRadius: theme.borderRadius.round,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? theme.colors.primaryDark : theme.colors.textSecondary,
                          fontWeight: isSelected ? theme.typography.weight.bold : theme.typography.weight.medium,
                          fontSize: theme.typography.size.xs,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category Filter */}
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
              Category
            </Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                onPress={() => setSelectedCategory(undefined)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: !selectedCategory ? theme.colors.primaryLight : theme.colors.surface,
                    borderColor: !selectedCategory ? theme.colors.primary : theme.colors.border,
                    borderRadius: theme.borderRadius.round,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: !selectedCategory ? theme.colors.primaryDark : theme.colors.textSecondary,
                      fontWeight: !selectedCategory ? theme.typography.weight.bold : theme.typography.weight.medium,
                      fontSize: theme.typography.size.xs,
                    },
                  ]}
                >
                  All Categories
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        borderRadius: theme.borderRadius.round,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? theme.colors.primaryDark : theme.colors.textSecondary,
                          fontWeight: isSelected ? theme.typography.weight.bold : theme.typography.weight.medium,
                          fontSize: theme.typography.size.xs,
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rating Filter */}
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
              Customer Rating
            </Text>
            <View style={styles.chipRow}>
              {RATING_OPTIONS.map((item, idx) => {
                const isSelected = selectedRating === item.value;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedRating(item.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        borderRadius: theme.borderRadius.round,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? theme.colors.primaryDark : theme.colors.textSecondary,
                          fontWeight: isSelected ? theme.typography.weight.bold : theme.typography.weight.medium,
                          fontSize: theme.typography.size.xs,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Availability */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setInStockOnly(!inStockOnly)}
              style={[styles.stockRow, { borderTopColor: theme.colors.borderLight }]}
            >
              <Text
                style={[
                  styles.stockLabel,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.sm,
                    fontWeight: theme.typography.weight.semibold,
                  },
                ]}
              >
                In Stock Items Only
              </Text>
              <Ionicons
                name={inStockOnly ? 'checkbox' : 'square-outline'}
                size={24}
                color={inStockOnly ? theme.colors.primary : theme.colors.textMuted}
              />
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.colors.borderLight }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppButton title="Reset" onPress={handleReset} variant="outline" size="md" />
            </View>
            <View style={{ flex: 2, marginLeft: 8 }}>
              <AppButton title="Apply Filters" onPress={handleApply} variant="primary" size="md" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    paddingBottom: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipText: {},
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  stockLabel: {},
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
});
