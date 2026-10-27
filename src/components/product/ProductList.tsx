import React from 'react';
import { StyleSheet, FlatList, ListRenderItemInfo } from 'react-native';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';

interface ProductListProps {
  products: Product[];
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  ListHeaderComponent,
  ListEmptyComponent,
  onRefresh,
  refreshing = false,
}) => {
  const renderItem = ({ item }: ListRenderItemInfo<Product>) => (
    <ProductCard product={item} variant="list" />
  );

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      ListHeaderComponent={ListHeaderComponent || undefined}
      ListEmptyComponent={ListEmptyComponent || undefined}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
