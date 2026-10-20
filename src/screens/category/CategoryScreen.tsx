import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Category, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../hooks/useStore';
import { AppHeader } from '../../components/common/AppHeader';
import { SafeImage } from '../../components/common/SafeImage';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { categoryService } from '../../services/api/categoryService';
import { getSafeUserErrorMessage, sanitizeDevLog } from '../../utils/apiError';

export const CategoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - 44) / 2;
  const { selectedStoreId, selectedStore } = useStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!selectedStoreId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const list = await categoryService.getCategories(selectedStoreId);
      setCategories(list);
    } catch (e) {
      sanitizeDevLog('CategoryScreen.fetchCategories', e);
      setLoadError(e);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSelectCategory = (cat: Category) => {
    navigation.navigate('ProductListing', {
      categoryId: cat.id,
      title: cat.name,
    });
  };

  if (loading) {
    return <LoadingState message="Loading grocery aisles..." />;
  }

  if (loadError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader
          title="All Categories"
          subtitle={selectedStore ? `${selectedStore.name}` : undefined}
          showBack={false}
        />
        <ErrorState
          title="Unable to Load Categories"
          message={getSafeUserErrorMessage(loadError, 'category')}
          onRetry={fetchCategories}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="All Categories"
        subtitle={selectedStore ? `${selectedStore.name}` : undefined}
        showBack={false}
      />

      {categories.length === 0 ? (
        <EmptyState
          iconName="grid-outline"
          title="No Categories Available"
          description={`No grocery categories are listed for ${selectedStore?.name || 'this store'}. You can switch to another nearby store.`}
          buttonLabel="Switch Store"
          onButtonPress={() => navigation.navigate('StoreSelection')}
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleSelectCategory(item)}
            style={[
              styles.card,
              {
                width: cardWidth,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.borderLight,
                borderRadius: theme.borderRadius.xl,
                ...theme.shadows.sm,
              },
            ]}
          >
            <View style={[styles.imageContainer, { backgroundColor: item.color || '#F1F5F9' }]}>
              <SafeImage
                uri={item.image}
                style={styles.image}
                resizeMode="cover"
                fallbackIcon="grid-outline"
                fallbackIconSize={28}
              />
            </View>

            <View style={styles.infoBox}>
              <Text
                numberOfLines={2}
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
            </View>
          </TouchableOpacity>
        )}
      />
      )}
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
    marginHorizontal: 3,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 110,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoBox: {
    padding: 12,
  },
  name: {
    letterSpacing: -0.2,
  },
  count: {
    marginTop: 4,
  },
});
