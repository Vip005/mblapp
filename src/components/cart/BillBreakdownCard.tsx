import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartSummary } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/formatters';

interface BillBreakdownCardProps {
  summary: CartSummary;
  showCouponInput?: boolean;
}

export const BillBreakdownCard: React.FC<BillBreakdownCardProps> = ({
  summary,
  showCouponInput = true,
}) => {
  const { theme } = useTheme();
  const { applyCoupon, removeCoupon } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setLoading(true);
    setFeedback(null);
    const res = await applyCoupon(couponCode);
    setLoading(false);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setCouponCode('');
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setFeedback(null);
  };

  return (
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
      {/* Free delivery banner */}
      {summary.freeDeliveryRemaining > 0 ? (
        <View style={[styles.freeDeliveryBanner, { backgroundColor: theme.colors.secondaryLight }]}>
          <Ionicons name="bicycle" size={18} color={theme.colors.secondary} />
          <Text style={[styles.freeDeliveryText, { color: '#92400E' }]}>
            Add items worth{' '}
            <Text style={{ fontWeight: '700' }}>{formatCurrency(summary.freeDeliveryRemaining)}</Text>{' '}
            more for <Text style={{ fontWeight: '700' }}>FREE Delivery</Text>!
          </Text>
        </View>
      ) : summary.deliveryCharge === 0 && summary.subtotal > 0 ? (
        <View style={[styles.freeDeliveryBanner, { backgroundColor: theme.colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
          <Text style={[styles.freeDeliveryText, { color: theme.colors.primaryDark }]}>
            Yay! You unlocked <Text style={{ fontWeight: '700' }}>FREE Delivery</Text> on this order!
          </Text>
        </View>
      ) : null}

      {/* Coupon input or active coupon badge */}
      {showCouponInput && (
        <View style={styles.couponSection}>
          {summary.appliedCoupon ? (
            <View
              style={[
                styles.appliedCouponBox,
                { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
              ]}
            >
              <View style={styles.appliedCouponLeft}>
                <Ionicons name="pricetag" size={18} color={theme.colors.primary} />
                <View style={styles.appliedCouponTextCol}>
                  <Text style={[styles.appliedCouponCode, { color: theme.colors.primaryDark }]}>
                    {summary.appliedCoupon.code}
                  </Text>
                  <Text style={[styles.appliedCouponDesc, { color: theme.colors.primaryDarker }]}>
                    Saved {formatCurrency(summary.couponDiscount)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRemoveCoupon}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.primaryDark} />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View
                style={[
                  styles.couponInputWrapper,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.md,
                  },
                ]}
              >
                <Ionicons name="pricetag-outline" size={18} color={theme.colors.textMuted} />
                <TextInput
                  value={couponCode}
                  onChangeText={setCouponCode}
                  placeholder="Enter Coupon (e.g. WELCOME50)"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="characters"
                  style={[
                    styles.couponInput,
                    { color: theme.colors.textPrimary, fontSize: theme.typography.size.sm },
                  ]}
                />
                <TouchableOpacity
                  onPress={handleApplyCoupon}
                  disabled={loading || !couponCode.trim()}
                  style={[
                    styles.applyBtn,
                    {
                      backgroundColor: couponCode.trim() ? theme.colors.primary : theme.colors.border,
                      borderRadius: theme.borderRadius.xs,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.applyBtnText}>APPLY</Text>
                  )}
                </TouchableOpacity>
              </View>

              {feedback && (
                <Text
                  style={[
                    styles.feedbackText,
                    {
                      color: feedback.type === 'success' ? theme.colors.primary : theme.colors.error,
                      fontSize: theme.typography.size.xs,
                    },
                  ]}
                >
                  {feedback.message}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Bill Rows */}
      <Text
        style={[
          styles.billTitle,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.md,
            fontWeight: theme.typography.weight.bold,
          },
        ]}
      >
        Bill Details
      </Text>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
        <Text style={[styles.rowValue, { color: theme.colors.textPrimary }]}>
          {formatCurrency(summary.subtotal)}
        </Text>
      </View>

      {summary.couponDiscount > 0 && (
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.colors.primaryDark }]}>
            Coupon ({summary.appliedCoupon?.code})
          </Text>
          <Text style={[styles.rowValue, { color: theme.colors.primaryDark }]}>
            -{formatCurrency(summary.couponDiscount)}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.deliveryLabelRow}>
          <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>Delivery Fee</Text>
          {summary.deliveryCharge === 0 && (
            <View style={[styles.freeBadge, { backgroundColor: theme.colors.successLight }]}>
              <Text style={[styles.freeBadgeText, { color: theme.colors.primaryDark }]}>FREE</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.rowValue,
            summary.deliveryCharge === 0 ? { color: theme.colors.primaryDark } : { color: theme.colors.textPrimary },
          ]}
        >
          {summary.deliveryCharge === 0 ? 'FREE' : formatCurrency(summary.deliveryCharge)}
        </Text>
      </View>

      {(summary.platformFee > 0 || (summary.freePlatformFeeThreshold != null && summary.freePlatformFeeThreshold > 0 && summary.subtotal > 0)) && (
        <View style={styles.row}>
          <View style={styles.deliveryLabelRow}>
            <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>Platform Fee</Text>
            {summary.platformFee === 0 && (
              <View style={[styles.freeBadge, { backgroundColor: theme.colors.successLight }]}>
                <Text style={[styles.freeBadgeText, { color: theme.colors.primaryDark }]}>FREE</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.rowValue,
              summary.platformFee === 0 ? { color: theme.colors.primaryDark } : { color: theme.colors.textPrimary },
            ]}
          >
            {summary.platformFee === 0 ? 'FREE' : formatCurrency(summary.platformFee)}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>
          {summary.taxPercentage > 0
            ? `Taxes & Charges (${summary.taxPercentage}% GST)`
            : 'Taxes & Charges'}
        </Text>
        <Text style={[styles.rowValue, { color: theme.colors.textPrimary }]}>
          {formatCurrency(summary.tax)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <View style={styles.grandTotalRow}>
        <View>
          <Text
            style={[
              styles.grandTotalLabel,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.lg,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            Grand Total
          </Text>
          <Text style={[styles.taxInclusiveText, { color: theme.colors.textMuted }]}>
            Inclusive of all taxes
          </Text>
        </View>

        <Text
          style={[
            styles.grandTotalValue,
            {
              color: theme.colors.primaryDarker,
              fontSize: theme.typography.size.xl,
              fontWeight: theme.typography.weight.extrabold,
            },
          ]}
        >
          {formatCurrency(summary.total)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginVertical: 8,
  },
  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  freeDeliveryText: {
    marginLeft: 8,
    fontSize: 12,
    flex: 1,
  },
  couponSection: {
    marginBottom: 16,
  },
  couponInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 4,
    height: 44,
  },
  couponInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
    fontWeight: '600',
  },
  applyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  feedbackText: {
    marginTop: 6,
    marginLeft: 4,
  },
  appliedCouponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  appliedCouponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedCouponTextCol: {
    marginLeft: 8,
  },
  appliedCouponCode: {
    fontSize: 13,
    fontWeight: '700',
  },
  appliedCouponDesc: {
    fontSize: 11,
  },
  billTitle: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeBadge: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  rowLabel: {
    fontSize: 13,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    letterSpacing: -0.2,
  },
  taxInclusiveText: {
    fontSize: 11,
    marginTop: 2,
  },
  grandTotalValue: {
    letterSpacing: -0.4,
  },
});
