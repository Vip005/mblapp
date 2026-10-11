import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Product, ProductVariant, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { PriceDisplay } from '../common/PriceDisplay';
import { RatingStars } from '../common/RatingStars';
import { QuantitySelector } from './QuantitySelector';
import { SafeImage } from '../common/SafeImage';

export type ProductCardVariant = 'grid' | 'horizontal' | 'list';

interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  style?: ViewStyle;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'grid',
  style,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, addItem, updateQuantity, isItemPending } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [imgError, setImgError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const activeVariant: ProductVariant =
    product.variants && product.variants.length > 0
      ? product.variants[0]
      : {
          id: '1',
          name: 'Standard',
          unit: '1 unit',
          price: product.sellingPrice,
          originalPrice: product.originalPrice,
          stock: product.stock,
          isAvailable: product.isAvailable,
        };
  const itemId = `${product.id}_${activeVariant.id}`;
  const isPending = isAdding || isItemPending(itemId);

  const availableStock = activeVariant?.stock != null ? activeVariant.stock : product.stock;
  const isOutOfStock =
    !product.isAvailable ||
    (activeVariant
      ? !activeVariant.isAvailable || activeVariant.stock <= 0
      : product.stock <= 0);

  // Find if this product+variant is currently in cart (string-safe ID comparison)
  const cartItem = items.find(
    (i) =>
      String(i.productId) === String(product.id) &&
      String(i.variantId) === String(activeVariant.id)
  );
  const quantity = cartItem ? cartItem.quantity : 0;
  const isWished = isInWishlist(product.id);

  const handlePress = () => {
    navigation.navigate('ProductDetails', { productId: product.id });
  };

  const handleAddToCart = async () => {
    if (isOutOfStock || isPending) return;
    try {
      setIsAdding(true);
      await addItem(product, activeVariant, 1);
    } catch (e: any) {
      Alert.alert('Cart Error', e?.message || 'Failed to add item to cart.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleIncrement = async () => {
    if (isOutOfStock || isPending) return;
    try {
      setIsAdding(true);
      if (cartItem) {
        if (quantity >= availableStock) return;
        await updateQuantity(cartItem.id, quantity + 1);
      } else {
        await addItem(product, activeVariant, 1);
      }
    } catch (e: any) {
      Alert.alert('Cart Error', e?.message || 'Failed to update item quantity.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDecrement = async () => {
    if (isPending) return;
    if (cartItem) {
      try {
        setIsAdding(true);
        await updateQuantity(cartItem.id, quantity - 1);
      } catch (e: any) {
        Alert.alert('Cart Error', e?.message || 'Failed to update item quantity.');
      } finally {
        setIsAdding(false);
      }
    }
  };

  const renderWishlistButton = () => (
    <TouchableOpacity
      onPress={() => toggleWishlist(product)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.wishlistBtn,
        {
          backgroundColor: isWished ? theme.colors.errorLight : 'rgba(255,255,255,0.85)',
          borderRadius: theme.borderRadius.round,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Ionicons
        name={isWished ? 'heart' : 'heart-outline'}
        size={18}
        color={isWished ? theme.colors.error : theme.colors.textMuted}
      />
    </TouchableOpacity>
  );

  const renderCardImage = (imgStyle: any, customRadius?: any) => {
    return (
      <SafeImage
        uri={product.image}
        style={[imgStyle, customRadius]}
        resizeMode="cover"
        fallbackIcon="image-outline"
        fallbackIconSize={24}
        placeholderStyle={[styles.placeholderContainer, customRadius]}
      />
    );
  };

  const renderOutOfStockBadge = () => {
    if (!isOutOfStock) return null;
    return (
      <View style={styles.outOfStockOverlay} pointerEvents="none">
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockBadgeText}>OUT OF STOCK</Text>
        </View>
      </View>
    );
  };

  const renderCartAction = () => {
    if (isOutOfStock) {
      return (
        <View
          style={[
            styles.addBtn,
            {
              backgroundColor: theme.colors.borderLight,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.sm,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${product.name} is out of stock`}
        >
          <Text
            style={[
              styles.addBtnText,
              {
                color: theme.colors.textMuted,
                fontSize: theme.typography.size.xs,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            OUT
          </Text>
        </View>
      );
    }

    if (quantity > 0) {
      return (
        <QuantitySelector
          quantity={quantity}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          maxQuantity={Math.min(20, availableStock > 0 ? availableStock : 20)}
          size={variant === 'list' ? 'md' : 'sm'}
        />
      );
    }

    if (isPending) {
      return (
        <View
          style={[
            styles.addBtn,
            {
              backgroundColor: theme.colors.primaryLight,
              borderColor: theme.colors.primary,
              borderRadius: theme.borderRadius.sm,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Adding ${product.name} to cart`}
        >
          <ActivityIndicator size="small" color={theme.colors.primaryDark} />
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={handleAddToCart}
        disabled={isPending}
        activeOpacity={0.8}
        style={[
          styles.addBtn,
          {
            backgroundColor: theme.colors.primaryLight,
            borderColor: theme.colors.primary,
            borderRadius: theme.borderRadius.sm,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Add ${product.name} to cart`}
      >
        <Ionicons name="add" size={16} color={theme.colors.primaryDark} />
        <Text
          style={[
            styles.addBtnText,
            {
              color: theme.colors.primaryDark,
              fontSize: theme.typography.size.xs,
              fontWeight: theme.typography.weight.bold,
            },
          ]}
        >
          ADD
        </Text>
      </TouchableOpacity>
    );
  };

  // 1. LIST VARIANT
  if (variant === 'list') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={[
          styles.listCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.borderLight,
            borderRadius: theme.borderRadius.lg,
            ...theme.shadows.sm,
          },
          style,
        ]}
      >
        <View style={styles.listImageWrapper}>
          {renderCardImage(styles.listImage, { borderRadius: theme.borderRadius.md })}
          {renderWishlistButton()}
          {renderOutOfStockBadge()}
        </View>

        <View style={styles.listContent}>
          <Text
            style={[
              styles.brand,
              { color: theme.colors.textMuted, fontSize: theme.typography.size.xs },
            ]}
          >
            {product.brand}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.name,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.sm,
                fontWeight: theme.typography.weight.semibold,
              },
            ]}
          >
            {product.name}
          </Text>
          <Text
            style={[
              styles.variantText,
              { color: theme.colors.textSecondary, fontSize: theme.typography.size.xs },
            ]}
          >
            {activeVariant.name}
          </Text>

          <View style={styles.listBottomRow}>
            <View>
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="sm" />
              <PriceDisplay
                sellingPrice={activeVariant.price}
                originalPrice={activeVariant.originalPrice}
                size="md"
                style={{ marginTop: 4 }}
              />
            </View>
            <View style={styles.actionWrapper}>{renderCartAction()}</View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // 2. HORIZONTAL VARIANT (for carousels)
  if (variant === 'horizontal') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={[
          styles.horizontalCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.borderLight,
            borderRadius: theme.borderRadius.lg,
            ...theme.shadows.sm,
          },
          style,
        ]}
      >
        <View style={styles.imageWrapper}>
          {renderCardImage(styles.horizontalImage, { borderRadius: theme.borderRadius.md })}
          {renderWishlistButton()}
          {product.discount > 0 && (
            <View
              style={[
                styles.discountTag,
                { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xs },
              ]}
            >
              <Text style={[styles.discountTagText, { color: theme.colors.white }]}>
                {product.discount}% OFF
              </Text>
            </View>
          )}
          {renderOutOfStockBadge()}
        </View>

        <View style={styles.infoWrapper}>
          <Text
            numberOfLines={1}
            style={[
              styles.brand,
              { color: theme.colors.textMuted, fontSize: 11 },
            ]}
          >
            {product.brand}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.name,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.sm,
                fontWeight: theme.typography.weight.semibold,
              },
            ]}
          >
            {product.name}
          </Text>
          <Text
            style={[
              styles.variantText,
              { color: theme.colors.textSecondary, fontSize: 11 },
            ]}
          >
            {activeVariant.name}
          </Text>

          <View style={styles.horizontalBottomRow}>
            <PriceDisplay
              sellingPrice={activeVariant.price}
              originalPrice={activeVariant.originalPrice}
              size="sm"
              showDiscountBadge={false}
            />
            {renderCartAction()}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // 3. GRID VARIANT (default 2-column)
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.gridCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.borderLight,
          borderRadius: theme.borderRadius.lg,
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      <View style={styles.gridImageWrapper}>
        {renderCardImage(styles.gridImage, { borderTopLeftRadius: theme.borderRadius.lg, borderTopRightRadius: theme.borderRadius.lg })}
        {renderWishlistButton()}
        {product.discount > 0 && (
          <View
            style={[
              styles.discountTag,
              { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xs },
            ]}
          >
            <Text style={[styles.discountTagText, { color: theme.colors.white }]}>
              {product.discount}% OFF
            </Text>
          </View>
        )}
        {renderOutOfStockBadge()}
      </View>

      <View style={styles.gridContent}>
        <View style={styles.metaRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.brand,
              { color: theme.colors.textMuted, fontSize: 11, flex: 1 },
            ]}
          >
            {product.brand}
          </Text>
          <RatingStars rating={product.rating} size="sm" showCount={false} />
        </View>

        <Text
          numberOfLines={2}
          style={[
            styles.name,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.sm,
              fontWeight: theme.typography.weight.semibold,
            },
          ]}
        >
          {product.name}
        </Text>

        <Text
          style={[
            styles.variantText,
            { color: theme.colors.textSecondary, fontSize: 11 },
          ]}
        >
          {activeVariant.name}
        </Text>

        <View style={styles.gridBottomRow}>
          <PriceDisplay
            sellingPrice={activeVariant.price}
            originalPrice={activeVariant.originalPrice}
            size="sm"
            showDiscountBadge={false}
          />
          <View style={styles.actionBtnBox}>{renderCartAction()}</View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Grid Styles
  gridCard: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    flex: 1,
  },
  gridImageWrapper: {
    width: '100%',
    height: 125,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridContent: {
    padding: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  actionBtnBox: {
    minWidth: 70,
    alignItems: 'flex-end',
  },

  // Horizontal Styles
  horizontalCard: {
    width: 155,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 12,
    padding: 8,
  },
  imageWrapper: {
    width: '100%',
    height: 110,
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
  },
  infoWrapper: {
    marginTop: 8,
  },
  horizontalBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  // List Styles
  listCard: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  listImageWrapper: {
    width: 90,
    height: 90,
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  listBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  actionWrapper: {
    minWidth: 80,
    alignItems: 'flex-end',
  },

  // Common inner components
  wishlistBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  discountTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  brand: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: {
    marginTop: 2,
    minHeight: 34,
  },
  variantText: {
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  addBtnText: {
    marginLeft: 2,
    letterSpacing: 0.5,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  outOfStockBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
});
