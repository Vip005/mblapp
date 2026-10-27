import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Offer } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { SafeImage } from '../common/SafeImage';
import {
  getDiscountHighlight,
  resolveTargetLabel,
  calculateOfferCardWidth,
} from '../../utils/offerHelpers';

export interface OfferCardProps {
  offer: Offer;
  onPress: (offer: Offer) => void;
  width?: number;
  isFullWidth?: boolean;
  onCopyCoupon?: (code: string) => void;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // If it's already a formatted string like "Valid till 30 Sep"
      return dateStr.replace(/^Valid till /i, '');
    }
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
};

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onPress,
  width: customWidth,
  isFullWidth = false,
  onCopyCoupon,
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  // Responsive card width calculation:
  // Case 1 (Single offer): Fills 100% of the available content container width
  // Case 2 (Multiple offers): Responsive carousel card width showing preview of next card
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = calculateOfferCardWidth(isFullWidth, screenWidth, customWidth);

  // ============================================================
  // PROMINENT DISCOUNT BADGE / HIGHLIGHT
  // ============================================================
  const discountInfo = getDiscountHighlight(offer);
  const discountHighlight = discountInfo.highlight;
  const discountSubtitle = discountInfo.subtitle;

  // ============================================================
  // VALIDITY FORMATTING
  // ============================================================
  const rawDate = offer.validUntil || (offer as any).validTo;
  const validUntilFormatted = formatDate(rawDate);

  // ============================================================
  // TARGET CATEGORIES / PRODUCTS / SCOPE
  // ============================================================
  const targetLabel = resolveTargetLabel(offer);

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleCardPress = () => {
    onPress(offer);
  };

  const handleCopyCoupon = async () => {
    if (!offer.code) return;
    try {
      await Clipboard.setStringAsync(offer.code);
    } catch (err) {
      console.warn('[OfferCard] Clipboard write error:', err);
    }

    setCopied(true);
    if (onCopyCoupon) {
      onCopyCoupon(offer.code);
    }

    setTimeout(() => {
      setCopied(false);
    }, 2200);
  };

  const hasValidImage = Boolean(
    offer.image &&
      typeof offer.image === 'string' &&
      offer.image.trim().length > 0 &&
      offer.image.startsWith('http')
  );

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handleCardPress}
      style={[
        styles.card,
        {
          width: cardWidth as any,
          marginRight: isFullWidth ? 0 : 14,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.borderLight,
          borderRadius: 16,
          ...theme.shadows.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Special offer: ${offer.title}, ${discountHighlight}`}
    >
      {/* ======================================================
          HERO / ARTWORK SECTION (118px Height)
          Replaces empty grey area with attractive grocery artwork
          ====================================================== */}
      <View style={styles.heroContainer}>
        {hasValidImage ? (
          <>
            <SafeImage
              uri={offer.image!}
              style={styles.heroImage}
              resizeMode="cover"
              fallbackIcon="pricetag-outline"
              fallbackIconSize={32}
            />
            {/* Subtle dark gradient overlay to ensure badge text contrast */}
            <View style={styles.heroOverlay} />
          </>
        ) : (
          /* Attractive FreshMart Branded Grocery Artwork Banner */
          <View style={styles.artworkBanner}>
            {/* Decorative background geometric shapes & watermark accents */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />

            {/* Left Column: Prominent Discount Typography */}
            <View style={styles.artworkLeft}>
              <View style={styles.discountBadgePill}>
                <Ionicons name="sparkles" size={11} color="#FEF08A" />
                <Text style={styles.discountBadgePillText}>FRESHMART DEAL</Text>
              </View>
              <Text style={styles.artworkDiscountBig} numberOfLines={1}>
                {discountHighlight}
              </Text>
              <Text style={styles.artworkDiscountSub} numberOfLines={1}>
                {discountSubtitle}
              </Text>
            </View>

            {/* Right Column: Thematic Grocery Icon Badge */}
            <View style={styles.artworkRight}>
              <View style={styles.groceryEmblemCircle}>
                <Ionicons
                  name={offer.type === 'combo' ? 'basket' : offer.code ? 'ticket' : 'bag-handle'}
                  size={26}
                  color="#FEF08A"
                />
              </View>
            </View>
          </View>
        )}

        {/* Top-Right: Expiry Badge */}
        {validUntilFormatted ? (
          <View style={styles.validityBadge}>
            <Ionicons name="time-outline" size={11} color="#FFFFFF" />
            <Text style={styles.validityText}>Till {validUntilFormatted}</Text>
          </View>
        ) : null}

        {/* Top-Left: Discount Chip (when image is present) */}
        {hasValidImage && (
          <View style={styles.imageDiscountBadge}>
            <Text style={styles.imageDiscountBadgeText}>{discountHighlight}</Text>
          </View>
        )}
      </View>

      {/* ======================================================
          CONTENT BODY
          ====================================================== */}
      <View style={styles.content}>
        {/* Offer Title */}
        <Text
          numberOfLines={isFullWidth ? 2 : 1}
          style={[
            styles.title,
            {
              color: theme.colors.textPrimary,
              fontWeight: theme.typography.weight.bold,
              fontSize: isFullWidth ? 16 : 15,
            },
          ]}
        >
          {offer.title}
        </Text>

        {/* Offer Description / Message */}
        {!!(offer.offerMessage || offer.description) && (
          <Text
            numberOfLines={isFullWidth ? 2 : 1}
            style={[
              styles.description,
              {
                color: theme.colors.textSecondary,
                fontSize: isFullWidth ? 13 : 12,
                lineHeight: isFullWidth ? 18 : 16,
              },
            ]}
          >
            {offer.offerMessage || offer.description}
          </Text>
        )}

        {/* Eligibility Chip */}
        {targetLabel ? (
          <View style={styles.targetRow}>
            <Ionicons name="pricetag-outline" size={12} color="#047857" />
            <Text numberOfLines={1} style={styles.targetText}>
              {targetLabel}
            </Text>
          </View>
        ) : null}

        {/* Coupon Code Strip with Working Copy Action */}
        {offer.code ? (
          <View style={styles.couponStrip}>
            <View style={styles.couponLeft}>
              <Ionicons name="ticket-outline" size={14} color="#047857" />
              <Text style={styles.couponCodeText} numberOfLines={1}>
                {offer.code}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopyCoupon}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[
                styles.copyBtn,
                copied && styles.copyBtnCopied,
              ]}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Coupon code copied' : `Copy coupon code ${offer.code}`}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={12}
                color={copied ? '#FFFFFF' : '#047857'}
              />
              <Text style={[styles.copyBtnText, copied && styles.copyBtnTextCopied]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Bottom Row: Min Order on Left, Shop Now Button on Right */}
        <View style={styles.bottomRow}>
          <View style={styles.minOrderWrapper}>
            {offer.minOrder && offer.minOrder > 0 ? (
              <Text style={[styles.minOrderText, { color: theme.colors.textMuted }]}>
                Min order ₹{offer.minOrder}
              </Text>
            ) : (
              <Text style={[styles.minOrderText, { color: theme.colors.textMuted }]}>
                No min order
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCardPress}
            style={[styles.shopBtn, { backgroundColor: theme.colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel={`Shop now for ${offer.title}`}
          >
            <Text style={styles.shopBtnText}>Shop Now</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 14,
    marginBottom: 4,
  },

  // Hero Area
  heroContainer: {
    width: '100%',
    height: 118,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },

  // Grocery Artwork Header (Rendered when image is absent)
  artworkBanner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#15803D', // FreshMart signature deep green
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -24,
    right: 32,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -36,
    left: 48,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  artworkLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
    zIndex: 2,
  },
  discountBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    marginBottom: 3,
  },
  discountBadgePillText: {
    color: '#FEF08A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  artworkDiscountBig: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  artworkDiscountSub: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  artworkRight: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  groceryEmblemCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Badges over Hero
  validityBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 5,
  },
  validityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  imageDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 10,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 5,
  },
  imageDiscountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Content Area
  content: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 4,
    marginBottom: 8,
  },
  targetText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },

  // Coupon Strip
  couponStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginBottom: 10,
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: 8,
  },
  couponCodeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#0F172A',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnCopied: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  copyBtnTextCopied: {
    color: '#FFFFFF',
  },

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  minOrderWrapper: {
    flex: 1,
    marginRight: 8,
  },
  minOrderText: {
    fontSize: 11,
    fontWeight: '500',
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});