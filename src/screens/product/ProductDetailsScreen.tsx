import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useStore } from '../../hooks/useStore';
import { PriceDisplay } from '../../components/common/PriceDisplay';
import { RatingStars } from '../../components/common/RatingStars';
import { VariantSelector } from '../../components/product/VariantSelector';
import { QuantitySelector } from '../../components/product/QuantitySelector';
import { ProductCard } from '../../components/product/ProductCard';
import { AppButton } from '../../components/common/AppButton';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { ToastMessage } from '../../components/feedback/ToastMessage';
import { productService } from '../../services/api/productService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { selectedStoreId, selectedStore } = useStore();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetails'>>();
  const { productId } = route.params;

  const { addItem, getItemQuantity, isItemPending } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
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
        console.warn('Failed to fetch product details:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [productId, selectedStoreId]);

  if (loading) {
    return <LoadingState message="Loading product information..." />;
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
  const currentCartQty = getItemQuantity(product.id, selectedVariant.id);

  const availableStock = selectedVariant?.stock != null ? selectedVariant.stock : product.stock;
  const isOutOfStock =
    !product.isAvailable ||
    (selectedVariant
      ? !selectedVariant.isAvailable || selectedVariant.stock <= 0
      : product.stock <= 0);

  const itemId = selectedVariant ? `${product.id}_${selectedVariant.id}` : '';
  const isPending = isAdding || (itemId ? isItemPending(itemId) : false);

  const handleAddToCart = async () => {
    if (isOutOfStock || isPending || !selectedVariant) return;
    try {
      setIsAdding(true);
      await addItem(product, selectedVariant, selectedQuantity);
      setToastMessage(`Added ${selectedQuantity} × ${product.name} (${selectedVariant.name}) to cart!`);
    } catch (e: any) {
      Alert.alert('Cart Error', e?.message || 'Failed to add item to cart.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock || isPending || !selectedVariant) return;
    try {
      setIsAdding(true);
      await addItem(product, selectedVariant, selectedQuantity);
      if (!isLoggedIn) {
        navigation.navigate('Auth');
        return;
      }
      navigation.navigate('Checkout');
    } catch (e: any) {
      Alert.alert('Cart Error', e?.message || 'Failed to proceed to checkout.');
    } finally {
      setIsAdding(false);
    }
  };

  const galleryImages = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];

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
          <TouchableOpacity
            onPress={() => toggleWishlist(product)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.circleBtn, { backgroundColor: theme.colors.background }]}
          >
            <Ionicons
              name={isWished ? 'heart' : 'heart-outline'}
              size={20}
              color={isWished ? theme.colors.error : theme.colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.circleBtn, { backgroundColor: theme.colors.background, marginLeft: 8 }]}
          >
            <Ionicons name="cart-outline" size={20} color={theme.colors.textPrimary} />
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
          <Image
            source={{ uri: galleryImages[0] }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {product.discount > 0 && (
            <View style={[styles.discountBanner, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.discountBannerText, { color: theme.colors.white }]}>
                {product.discount}% OFF
              </Text>
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
            <View style={styles.stockBadge}>
              <View
                style={[
                  styles.stockDot,
                  { backgroundColor: !isOutOfStock ? theme.colors.success : theme.colors.error },
                ]}
              />
              <Text
                style={[
                  styles.stockText,
                  {
                    color: !isOutOfStock ? theme.colors.primaryDark : theme.colors.error,
                    fontSize: theme.typography.size.xs,
                  },
                ]}
              >
                {!isOutOfStock ? `In Stock (${availableStock} available)` : 'Out of Stock'}
              </Text>
            </View>
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
              setSelectedQuantity(1);
            }}
            showPrice
            style={{ marginBottom: 16 }}
          />

          {/* Quantity Selector for adding */}
          <View style={styles.quantityPickerRow}>
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.sm,
                  fontWeight: theme.typography.weight.bold,
                  marginBottom: 0,
                },
              ]}
            >
              Quantity
            </Text>
            <QuantitySelector
              quantity={selectedQuantity}
              onIncrement={() => {
                if (isOutOfStock) return;
                setSelectedQuantity((q) => Math.min(q + 1, availableStock > 0 ? availableStock : 1));
              }}
              onDecrement={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
              maxQuantity={Math.min(20, availableStock > 0 ? availableStock : 20)}
              size="md"
            />
          </View>

          {/* Fast Delivery Information Card */}
          <View
            style={[
              styles.deliveryInfoCard,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: theme.colors.primary,
                borderRadius: theme.borderRadius.lg,
              },
            ]}
          >
            <Ionicons name="bicycle" size={24} color={theme.colors.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.deliveryTitle, { color: theme.colors.primaryDarker }]}>
                Express 15-Minute Delivery
              </Text>
              <Text style={[styles.deliveryDesc, { color: theme.colors.primaryDark }]}>
                Order now to receive by 11:30 AM today • Packed with contactless safety
              </Text>
            </View>
          </View>

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
            Total Price
          </Text>
          <Text
            style={[
              styles.bottomPriceVal,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.lg,
                fontWeight: theme.typography.weight.extrabold,
              },
            ]}
          >
            ₹{selectedVariant.price * selectedQuantity}
          </Text>
        </View>

        <View style={styles.bottomActionButtons}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <AppButton
              title={isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              onPress={handleAddToCart}
              loading={isPending}
              disabled={isOutOfStock || isPending}
              variant="outline"
              size="md"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton
              title={isOutOfStock ? 'Unavailable' : 'Buy Now'}
              onPress={handleBuyNow}
              loading={isPending}
              disabled={isOutOfStock || isPending}
              variant="primary"
              size="md"
            />
          </View>
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
  deliveryInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  deliveryTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  deliveryDesc: {
    fontSize: 11,
    lineHeight: 16,
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
});
