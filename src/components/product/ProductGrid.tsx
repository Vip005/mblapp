import React from 'react';
import { View, StyleSheet, FlatList, ListRenderItemInfo } from 'react-native';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  ListHeaderComponent,
  ListEmptyComponent,
  onRefresh,
  refreshing = false,
}) => {
  const renderItem = ({ item, index }: ListRenderItemInfo<Product>) => (
    <View style={[styles.columnWrapper, index % 2 === 0 ? { paddingRight: 6 } : { paddingLeft: 6 }]}>
      <ProductCard product={item} variant="grid" />
    </View>
  );

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      numColumns={2}
      contentContainerStyle={styles.container}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  columnWrapper: {
    flex: 1,
  },
});
