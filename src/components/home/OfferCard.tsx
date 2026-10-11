import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Offer } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface OfferCardProps {
  offer: Offer;
  onPress: (offer: Offer) => void;
  width?: number;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';

  try {
    const d = new Date(dateStr);

    if (isNaN(d.getTime())) {
      return '';
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
  width = 340,
}) => {
  const { theme } = useTheme();

  // ============================================================
  // DISCOUNT BADGE
  // ============================================================

  let discountBadge = '';

  if (
    offer.discountPercent &&
    offer.discountPercent > 0
  ) {
    discountBadge = `${offer.discountPercent}% OFF`;
  } else if (
    offer.discountValue &&
    offer.discountValue > 0
  ) {
    discountBadge = `₹${offer.discountValue} OFF`;
  } else if (offer.type === 'coupon') {
    discountBadge = 'COUPON';
  } else {
    discountBadge = 'SPECIAL DEAL';
  }

  // ============================================================
  // VALIDITY
  // ============================================================

  const validUntilFormatted = formatDate(
    offer.validUntil
  );

  // ============================================================
  // TARGET LABEL
  // ============================================================

  let targetLabel = '';

  if (
    offer.categories &&
    offer.categories.length > 0
  ) {
    targetLabel = offer.categories
      .map((c) => c.name)
      .slice(0, 2)
      .join(', ');
  } else if (offer.categoryName) {
    targetLabel = offer.categoryName;
  } else if (offer.productName) {
    targetLabel = offer.productName;
  } else if (
    offer.offerScope === 'ALL_STORES'
  ) {
    targetLabel = 'All Products';
  }

  // ============================================================
  // OFFER PRESS
  // ============================================================

  const handlePress = () => {
    onPress(offer);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={[
        styles.card,
        {
          width,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.borderLight,
          borderRadius: theme.borderRadius.xl,
          ...theme.shadows.md,
        },
      ]}
    >
      {/* ======================================================
          OFFER IMAGE / HERO AREA
          ====================================================== */}

      <View
        style={[
          styles.heroContainer,
          {
            backgroundColor:
              theme.colors.primaryLight,
            borderTopLeftRadius:
              theme.borderRadius.xl,
            borderTopRightRadius:
              theme.borderRadius.xl,
          },
        ]}
      >
        {offer.image ? (
          <Image
            source={{ uri: offer.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              {
                backgroundColor:
                  theme.colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name="pricetag-outline"
              size={54}
              color={theme.colors.primary}
            />
          </View>
        )}

        {/* Image Overlay */}
        <View style={styles.imageOverlay} />

        {/* Discount Badge */}
        <View
          style={[
            styles.discountBadge,
            {
              backgroundColor:
                theme.colors.secondary,
            },
          ]}
        >
          <Text
            style={[
              styles.discountBadgeText,
              {
                color: theme.colors.white,
              },
            ]}
          >
            {discountBadge}
          </Text>
        </View>

        {/* Validity */}
        {validUntilFormatted ? (
          <View style={styles.validityBadge}>
            <Ionicons
              name="time-outline"
              size={12}
              color="#FFFFFF"
            />

            <Text style={styles.validityText}>
              Till {validUntilFormatted}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ======================================================
          OFFER CONTENT
          ====================================================== */}

      <View style={styles.content}>
        {/* Title */}
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.lg,
              fontWeight:
                theme.typography.weight.bold,
            },
          ]}
        >
          {offer.title}
        </Text>

        {/* Description */}
        {!!(
          offer.offerMessage ||
          offer.description
        ) && (
          <Text
            numberOfLines={2}
            style={[
              styles.description,
              {
                color:
                  theme.colors.textSecondary,
                fontSize:
                  theme.typography.size.sm,
              },
            ]}
          >
            {offer.offerMessage ||
              offer.description}
          </Text>
        )}

        {/* Target */}
        {targetLabel ? (
          <View style={styles.targetRow}>
            <Ionicons
              name="pricetags-outline"
              size={14}
              color={theme.colors.textMuted}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.targetText,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
            >
              {targetLabel}
            </Text>
          </View>
        ) : null}

        {/* ==================================================
            BOTTOM ACTION
            ================================================== */}

        <View style={styles.bottomRow}>
          <View style={styles.offerInfo}>
            {offer.code ? (
              <>
                <Text
                  style={[
                    styles.codeLabel,
                    {
                      color:
                        theme.colors.textMuted,
                    },
                  ]}
                >
                  Coupon
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.codeText,
                    {
                      color:
                        theme.colors.primaryDark,
                    },
                  ]}
                >
                  {offer.code}
                </Text>
              </>
            ) : (
              <Text
                style={[
                  styles.shopLabel,
                  {
                    color:
                      theme.colors.textSecondary,
                  },
                ]}
              >
                Special offer
              </Text>
            )}
          </View>

          <View
            style={[
              styles.shopButton,
              {
                backgroundColor:
                  theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.shopButtonText,
                {
                  color: theme.colors.white,
                },
              ]}
            >
              Shop Now
            </Text>

            <Ionicons
              name="arrow-forward"
              size={16}
              color={theme.colors.white}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ==========================================================
  // CARD
  // ==========================================================

  card: {
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 14,
  },

  // ==========================================================
  // HERO IMAGE
  // ==========================================================

  heroContainer: {
    width: '100%',
    height: 155,
    position: 'relative',
    overflow: 'hidden',
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      'rgba(0, 0, 0, 0.12)',
  },

  // ==========================================================
  // DISCOUNT
  // ==========================================================

  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },

  discountBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ==========================================================
  // VALIDITY
  // ==========================================================

  validityBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor:
      'rgba(0,0,0,0.45)',
  },

  validityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // ==========================================================
  // CONTENT
  // ==========================================================

  content: {
    padding: 14,
  },

  title: {
    marginBottom: 5,
    textTransform: 'capitalize',
  },

  description: {
    lineHeight: 19,
    marginBottom: 8,
  },

  // ==========================================================
  // TARGET
  // ==========================================================

  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },

  targetText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
  },

  // ==========================================================
  // BOTTOM
  // ==========================================================

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor:
      'rgba(0,0,0,0.06)',
  },

  offerInfo: {
    flex: 1,
    marginRight: 10,
  },

  codeLabel: {
    fontSize: 9,
    marginBottom: 1,
  },

  codeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  shopLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // ==========================================================
  // SHOP NOW
  // ==========================================================

  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },

  shopButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
});