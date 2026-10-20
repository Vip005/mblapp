import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Offer, RootStackParamList } from '../../types';
import { SectionHeader } from './SectionHeader';
import { OfferCard } from './OfferCard';
import { ToastMessage } from '../feedback/ToastMessage';

export interface OffersCarouselProps {
  offers: Offer[];
  onViewAll?: () => void;
  onCopyCoupon?: (code: string) => void;
  loading?: boolean;
}

export const OffersCarousel: React.FC<OffersCarouselProps> = ({
  offers,
  onViewAll,
  onCopyCoupon,
  loading = false,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Case 3: No offers or not loaded -> Hide section cleanly (no placeholders, no duplicates)
  if (!loading && (!offers || offers.length === 0)) {
    return null;
  }

  const handleOfferPress = (offer: Offer) => {
    if (offer.productId) {
      navigation.navigate('ProductDetails', { productId: offer.productId });
    } else if (offer.categoryId) {
      navigation.navigate('ProductListing', {
        categoryId: offer.categoryId,
        title: offer.title,
        offerId: offer.id,
      });
    } else {
      navigation.navigate('Offers');
    }
  };

  const handleSeeAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigation.navigate('Offers');
    }
  };

  const handleCouponCopied = (code: string) => {
    setToastMessage(`Coupon code "${code}" copied! Paste at checkout.`);
    if (onCopyCoupon) {
      onCopyCoupon(code);
    }
  };

  // Case 1: Exactly ONE offer -> Full-width responsive card layout
  if (offers.length === 1) {
    const singleOffer = offers[0];
    return (
      <View style={styles.container}>
        <SectionHeader
          title="Special Offer"
          subtitle="Exclusive discount for your store"
          onSeeAll={handleSeeAll}
          seeAllText="View Details"
        />
        <View style={styles.singleCardWrapper}>
          <OfferCard
            offer={singleOffer}
            onPress={handleOfferPress}
            onCopyCoupon={handleCouponCopied}
            isFullWidth
          />
        </View>

        {/* Floating toast notification when coupon is copied */}
        <ToastMessage
          visible={!!toastMessage}
          message={toastMessage || ''}
          type="success"
          duration={2500}
          onDismiss={() => setToastMessage(null)}
        />
      </View>
    );
  }

  // Case 2: MULTIPLE offers (> 1) -> Horizontally swipeable carousel with preview of next card
  return (
    <View style={styles.container}>
      <SectionHeader
        title="Special Offers"
        subtitle="Exclusive discounts for your store"
        onSeeAll={handleSeeAll}
        seeAllText="View All"
      />
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        horizontal
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            onPress={handleOfferPress}
            onCopyCoupon={handleCouponCopied}
            isFullWidth={false}
          />
        )}
      />

      {/* Floating toast notification when coupon is copied */}
      <ToastMessage
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        duration={2500}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  singleCardWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
