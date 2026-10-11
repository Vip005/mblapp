import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Product } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { SafeImage } from '../../components/common/SafeImage';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ToastMessage } from '../../components/feedback/ToastMessage';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';
import { PriceDisplay } from '../../components/common/PriceDisplay';

export const WishlistScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addItem } = useCart();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clearModalVisible, setClearModalVisible] = useState(false);

  const handleMoveToCart = (product: Product) => {
    addItem(product, product.variants[0], 1);
    removeFromWishlist(product.id);
    setToastMessage(`Moved ${product.name} to your Cart!`);
  };

  const handleMoveAllToCart = () => {
    wishlist.forEach((prod) => {
      addItem(prod, prod.variants[0], 1);
    });
    clearWishlist();
    setToastMessage(`Moved all ${wishlist.length} items to your Cart!`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="My Wishlist"
        subtitle={`${wishlist.length} items saved`}
        rightAction={
          wishlist.length > 0 ? (
            <TouchableOpacity onPress={() => setClearModalVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          ) : null
        }
      />

      {wishlist.length === 0 ? (
        <EmptyState
          iconName="heart-outline"
          title="Your Wishlist is Empty"
          description="Explore our fresh fruit baskets, dairy goods, and pantry staples and save your favorite picks here."
          buttonLabel="Explore Groceries"
          onButtonPress={() => navigation.navigate('Main')}
        />
      ) : (
        <View style={styles.content}>
          {/* Top Actions Bar */}
          <View style={[styles.topActionBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
            <Text style={[styles.itemCountText, { color: theme.colors.textSecondary }]}>
              {wishlist.length} items saved
            </Text>
            <TouchableOpacity onPress={handleMoveAllToCart} style={styles.moveAllBtn}>
              <Ionicons name="cart" size={16} color={theme.colors.primary} />
              <Text style={[styles.moveAllText, { color: theme.colors.primary }]}>Move All to Cart</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={wishlist}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderLight,
                    borderRadius: theme.borderRadius.lg,
                    ...theme.shadows.sm,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
                  style={styles.imageBox}
                >
                  <SafeImage
                    uri={item.image}
                    style={styles.image}
                    resizeMode="cover"
                    fallbackIcon="basket-outline"
                    fallbackIconSize={24}
                  />
                </TouchableOpacity>

                <View style={styles.infoBox}>
                  <View style={styles.infoTop}>
                    <Text numberOfLines={1} style={[styles.brand, { color: theme.colors.textMuted }]}>
                      {item.brand}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFromWishlist(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <Text
                    numberOfLines={1}
                    onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
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

                  <PriceDisplay
                    sellingPrice={item.sellingPrice}
                    originalPrice={item.originalPrice}
                    size="sm"
                    style={{ marginTop: 4, marginBottom: 8 }}
                  />

                  <AppButton
                    title="Move to Cart"
                    onPress={() => handleMoveToCart(item)}
                    size="sm"
                    variant="primary"
                    leftIcon={<Ionicons name="cart-outline" size={14} color="#FFF" />}
                  />
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* Confirmation Modal to Clear All */}
      <ConfirmationModal
        visible={clearModalVisible}
        title="Clear Wishlist?"
        message="Are you sure you want to remove all items from your wishlist?"
        confirmText="Clear All"
        confirmVariant="danger"
        onConfirm={() => {
          clearWishlist();
          setClearModalVisible(false);
          setToastMessage('Wishlist cleared');
        }}
        onCancel={() => setClearModalVisible(false)}
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
  content: {
    flex: 1,
  },
  topActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '500',
  },
  moveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveAllText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  imageBox: {
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoBox: {
    flex: 1,
    marginLeft: 12,
  },
  infoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  name: {
    marginTop: 2,
  },
});
