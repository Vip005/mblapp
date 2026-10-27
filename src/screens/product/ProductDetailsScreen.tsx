import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, Product, ProductVariant } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useStore } from '../../hooks/useStore';
import { PriceDisplay } from '../../components/common/PriceDisplay';
import { RatingStars } from '../../components/common/RatingStars';
import { VariantSelector } from '../../components/product/VariantSelector';
import { QuantitySelector } from '../../components/product/QuantitySelector';
import { ProductCard } from '../../components/product/ProductCard';
import { AppButton } from '../../components/common/AppButton';
import { CartBadgeButton } from '../../components/common/CartBadgeButton';
import { SafeImage } from '../../components/common/SafeImage';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { ToastMessage } from '../../components/feedback/ToastMessage';
import { productService } from '../../services/api/productService';
import { getSafeUserErrorMessage, sanitizeDevLog } from '../../utils/apiError';
import {
  resolveCartItem,
  resolveCurrentCartQty,
  resolveAvailableStock,
  resolveIsOutOfStock,
  resolveUnitPrice,
  resolveBottomTotalPrice,
} from '../../utils/productDetailsHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { selectedStoreId, selectedStore } = useStore();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetails'>>();
  const { productId } = route.params;

  const { items, addItem, updateQuantity, removeItem, getItemQuantity, isItemPending } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const isAddingRef = useRef(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [fetchError, setFetchError] = useState<unknown | null>(null);

  const fetchDetails = useCallback(async () => {
    setImgError(false);
    setFetchError(null);
    try {
      setLoading(true);
      const prod = await productService.getProductById(productId, selectedStoreId || undefined);
      if (prod) {
        setProduct(prod);
        setSelectedVariant(prod.variants[0]);
        const similar = await productService.getSimilarProducts(prod.id, prod.categoryId, selectedStoreId || undefined);
        setSimilarProducts(similar);
      }
    } catch (e) {
      sanitizeDevLog('ProductDetailsScreen.fetchDetails', e);
      setFetchError(e);
    } finally {
      setLoading(false);
    }
  }, [productId, selectedStoreId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return <LoadingState message="Loading product information..." />;
  }

  if (fetchError) {
    return (
      <ErrorState
        title="Unable to Load Product"
        message={getSafeUserErrorMessage(fetchError, 'product')}
        onRetry={fetchDetails}
      />
    );
  }

  if (product && selectedStoreId && product.storeId && product.storeId !== selectedStoreId) {
    return (
      <ErrorState
        title="Store Mismatch"
        message={`This product is fulfilled by Store #${product.storeId}, but your current delivery store is ${selectedStore?.name || `Store #${selectedStoreId}`}. Please switch store to view and order this item.`}
        onRetry={() => navigation.navigate('StoreSelection')}
      />
    );
  }

  if (!product || !selectedVariant) {
    return (
      <ErrorState
        title="Product Not Found"
        message="The item you are looking for is currently unavailable or has been removed."
        onRetry={() => navigation.goBack()}
      />
    );
  }

  const isWished = isInWishlist(product.id);
  const cartItem = resolveCartItem(items, product.id, selectedVariant.id);
  const currentCartQty = resolveCurrentCartQty(cartItem, getItemQuantity, product.id, selectedVariant.id);
  const availableStock = resolveAvailableStock(selectedVariant, product);
  const isOutOfStock = resolveIsOutOfStock(product, selectedVariant);

  const itemId = selectedVariant ? `${product.id}_${selectedVariant.id}` : '';
  const isPending =
    isAdding ||
    (itemId ? isItemPending(itemId) : false) ||
    (cartItem?.id ? isItemPending(cartItem.id) : false);

  const unitPrice = resolveUnitPrice(selectedVariant, product);
  const bottomTotalPrice = resolveBottomTotalPrice(currentCartQty, unitPrice);

  const handleAddToCart = async () => {
    if (isOutOfStock || isPending || isAddingRef.current || !selectedVariant || !product) return;
    try {
      isAddingRef.current = true;
      setIsAdding(true);
      await addItem(product, selectedVariant, 1);
      setToastMessage(`Added 1 × ${product.name} (${selectedVariant.name}) to cart!`);
    } catch (e: any) {
      sanitizeDevLog('ProductDetailsScreen.handleAddToCart', e);
      Alert.alert('Cart Error', getSafeUserErrorMessage(e, 'cart'));
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  };

  const handleIncrement = async () => {
    if (isOutOfStock || isPending || isAddingRef.current || !selectedVariant || !product) return;
    if (currentCartQty >= availableStock) {
      Alert.alert('Stock Limit', `Only ${availableStock} units available in stock.`);
      return;
    }
    try {
      isAddingRef.current = true;
      setIsAdding(true);
      if (cartItem) {
        await updateQuantity(cartItem.id, currentCartQty + 1);
      } else {
        await addItem(product, selectedVariant, 1);
      }
    } catch (e: any) {
      sanitizeDevLog('ProductDetailsScreen.handleIncrement', e);
      Alert.alert('Cart Error', getSafeUserErrorMessage(e, 'cart'));
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  };

  const handleDecrement = async () => {
    if (isPending || isAddingRef.current || !cartItem) return;
    try {
      isAddingRef.current = true;
      setIsAdding(true);
      if (currentCartQty > 1) {
        await updateQuantity(cartItem.id, currentCartQty - 1);
      } else {
        await removeItem(cartItem.id);
        setToastMessage(`Removed ${product?.name ?? 'Item'} from cart.`);
      }
    } catch (e: any) {
      sanitizeDevLog('ProductDetailsScreen.handleDecrement', e);
      Alert.alert('Cart Error', getSafeUserErrorMessage(e, 'cart'));
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  };

  const rawGallery = product.gallery && product.gallery.length > 0 ? product.gallery : (product.image ? [product.image] : []);
  const galleryImages = rawGallery.filter(Boolean);
  const heroImg = !imgError && galleryImages[0] ? galleryImages[0] : '';

//   console.log("🖼️ PRODUCT IMAGE:", product.image);
// console.log("🖼️ PRODUCT GALLERY:", product.gallery);
// console.log("🖼️ HERO IMAGE:", heroImg);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Floating Header */}
      <View style={[styles.navBar, { top: insets.top, borderBottomColor: theme.colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.circleBtn, { backgroundColor: theme.colors.background }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.navRight}>
          <CartBadgeButton
            buttonSize={40}
            size={20}
            backgroundColor={theme.colors.background}
            borderColor={theme.colors.borderLight}
            borderWidth={1}
            borderRadius={20}
            style={{ marginRight: 8 }}
          />
          <TouchableOpacity
            onPress={() => toggleWishlist(product)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.circleBtn, { backgroundColor: theme.colors.background }]}
            accessibilityRole="button"
            accessibilityLabel={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Ionicons
              name={isWished ? 'heart' : 'heart-outline'}
              size={20}
              color={isWished ? theme.colors.error : theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 56, paddingBottom: 100 + insets.bottom },
        ]}
      >
        {/* Product Images Gallery */}
        <View style={styles.galleryContainer}>
          <SafeImage
            uri={heroImg}
            style={styles.heroImage}
            resizeMode="cover"
            fallbackIcon="image-outline"
            fallbackIconSize={48}
            placeholderStyle={[styles.heroImage, styles.placeholderContainer]}
          />
          {product.discount > 0 && (
            <View style={[styles.discountBanner, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.discountBannerText, { color: theme.colors.white }]}>
                {product.discount}% OFF
              </Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockHeroOverlay} pointerEvents="none">
              <View style={styles.outOfStockHeroBadge}>
                <Text style={styles.outOfStockHeroText}>OUT OF STOCK</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.detailsBody}>
          {/* Brand & Title */}
          <Text
            style={[
              styles.brand,
              { color: theme.colors.textMuted, fontSize: theme.typography.size.xs },
            ]}
          >
            {product.brand}
          </Text>

          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.xl,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            {product.name}
          </Text>

          {/* Rating & Stock */}
          <View style={styles.metaRow}>
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="md" />
            {isOutOfStock && (
              <View style={styles.stockBadge}>
                <View
                  style={[
                    styles.stockDot,
                    { backgroundColor: theme.colors.error },
                  ]}
                />
                <Text
                  style={[
                    styles.stockText,
                    {
                      color: theme.colors.error,
                      fontSize: theme.typography.size.xs,
                    },
                  ]}
                >
                  Out of Stock
                </Text>
              </View>
            )}
          </View>

          {/* Dynamic Price Display */}
          <View style={styles.priceRow}>
            <PriceDisplay
              sellingPrice={selectedVariant.price}
              originalPrice={selectedVariant.originalPrice}
              size="xl"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          {/* Variants Selector */}
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.sm,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            Select Pack Size
          </Text>
          <VariantSelector
            variants={product.variants}
            selectedVariantId={selectedVariant.id}
            onSelectVariant={(v) => {
              setSelectedVariant(v);
            }}
            showPrice
            style={{ marginBottom: 16 }}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          {/* Product Description */}
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.md,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            Product Description
          </Text>
          <Text
            style={[
              styles.description,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.sm,
                lineHeight: theme.typography.lineHeight.md,
              },
            ]}
          >
            {product.description}
          </Text>

          {/* Key Highlights */}
          {product.highlights && product.highlights.length > 0 && (
            <View style={styles.highlightsBox}>
              <Text
                style={[
                  styles.sectionLabel,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.sm,
                    fontWeight: theme.typography.weight.bold,
                  },
                ]}
              >
                Key Highlights
              </Text>
              {product.highlights.map((h, i) => (
                <View key={i} style={styles.highlightRow}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.highlightText,
                      { color: theme.colors.textSecondary, fontSize: theme.typography.size.xs },
                    ]}
                  >
                    {h}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <Text
                style={[
                  styles.sectionLabel,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.md,
                    fontWeight: theme.typography.weight.bold,
                  },
                ]}
              >
                Similar Products You May Like
              </Text>
              <FlatList
                data={similarProducts}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <ProductCard product={item} variant="horizontal" />}
              />
            </View>
          )}

          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      {/* Floating Bottom Bar (Add to Cart / Buy Now) */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderLight,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            ...theme.shadows.lg,
          },
        ]}
      >
        <View style={styles.bottomPriceCol}>
          <Text style={[styles.bottomPriceLabel, { color: theme.colors.textMuted }]}>
            {currentCartQty > 0 ? 'Total Price' : 'Price'}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.bottomPriceVal,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.lg,
                fontWeight: theme.typography.weight.extrabold,
              },
            ]}
          >
            ₹{bottomTotalPrice.toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.bottomActionButtons}>
          <View style={{ flex: 1, marginRight: 12 }}>
            {isOutOfStock ? (
              <AppButton
                title="Out of Stock"
                onPress={() => {}}
                disabled
                variant="primary"
                size="md"
              />
            ) : currentCartQty > 0 ? (
              <View
                style={[
                  styles.bottomQtyWrapper,
                  { opacity: isPending ? 0.7 : 1 },
                ]}
                pointerEvents={isPending ? 'none' : 'auto'}
              >
                <QuantitySelector
                  quantity={currentCartQty}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  maxQuantity={Math.min(20, availableStock > 0 ? availableStock : 20)}
                  size="lg"
                  style={styles.bottomQtySelector}
                />
              </View>
            ) : (
              <AppButton
                title="Add to Cart"
                onPress={handleAddToCart}
                loading={isPending}
                disabled={isOutOfStock || isPending}
                variant="primary"
                size="md"
              />
            )}
          </View>
          <CartBadgeButton
            buttonSize={48}
            size={22}
            backgroundColor={theme.colors.background}
            borderColor={theme.colors.border}
            borderWidth={1}
            borderRadius={theme.borderRadius.md}
          />
        </View>
      </View>

      {/* Toast Notification feedback */}
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
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {},
  galleryContainer: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  discountBanner: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountBannerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailsBody: {
    padding: 16,
  },
  brand: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    lineHeight: 28,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockText: {
    fontWeight: '600',
  },
  priceRow: {
    marginVertical: 4,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  quantityPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
  },
  outOfStockHeroOverlay: {
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
  outOfStockHeroBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  outOfStockHeroText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  description: {
    marginBottom: 16,
  },
  highlightsBox: {
    marginBottom: 20,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  highlightText: {
    marginLeft: 8,
  },
  similarSection: {
    marginTop: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomPriceCol: {
    marginRight: 16,
  },
  bottomPriceLabel: {
    fontSize: 11,
  },
  bottomPriceVal: {
    marginTop: 2,
  },
  bottomActionButtons: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomQtyWrapper: {
    height: 48,
    justifyContent: 'center',
  },
  bottomQtySelector: {
    height: 48,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
});
