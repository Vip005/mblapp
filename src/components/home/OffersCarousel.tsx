import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Offer, RootStackParamList } from '../../types';
import { SectionHeader } from './SectionHeader';
import { OfferCard } from './OfferCard';

interface OffersCarouselProps {
  offers: Offer[];
  onViewAll?: () => void;
}

export const OffersCarousel: React.FC<OffersCarouselProps> = ({
  offers,
  onViewAll,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!offers || offers.length === 0) {
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
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            onPress={handleOfferPress}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
