import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Banner, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { isValidImageUri } from '../common/SafeImage';

interface BannerCarouselProps {
  banners: Banner[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;

const isValidActionValue = (val?: string): boolean => {
  if (!val) return false;
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === '0' ||
    trimmed.toLowerCase() === 'nan' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return false;
  }
  return true;
};

const isBannerPressable = (banner: Banner): boolean => {
  switch (banner.actionType) {
    case 'OFFER':
      return true;
    case 'CATEGORY':
      return isValidActionValue(banner.actionValue) || isValidActionValue(banner.categoryId);
    case 'PRODUCT':
      return isValidActionValue(banner.actionValue);
    case 'BRAND':
      return isValidActionValue(banner.actionValue);
    case 'NONE':
    default:
      return false;
  }
};

const BannerCard: React.FC<{
  item: Banner;
  theme: any;
  onPress: (banner: Banner) => void;
}> = ({ item, theme, onPress }) => {
  const [imgError, setImgError] = useState(false);
  const pressable = isBannerPressable(item);
  const imageUri = !imgError && isValidImageUri(item.image) ? item.image!.trim() : '';
  const badgeText = (item.badge || item.discountText)?.trim();
  const titleText = item.title?.trim();
  const subtitleText = item.subtitle?.trim();
  const buttonText = item.buttonText?.trim();

  return (
    <TouchableOpacity
      activeOpacity={pressable ? 0.9 : 1}
      disabled={!pressable}
      onPress={() => onPress(item)}
      style={[
        styles.bannerCard,
        {
          width: BANNER_WIDTH,
          borderRadius: theme.borderRadius.xl,
          backgroundColor: item.backgroundColor || theme.colors.primaryDark,
          ...theme.shadows.md,
        },
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.bannerImage}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : null}
      <View style={styles.overlay} />

      <View style={styles.bannerContent}>
        {badgeText ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: theme.colors.secondary,
                borderRadius: theme.borderRadius.xs,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.colors.white }]}>
              {badgeText}
            </Text>
          </View>
        ) : null}

        {titleText ? (
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.white,
                fontSize: theme.typography.size.xl,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            {titleText}
          </Text>
        ) : null}

        {subtitleText ? (
          <Text
            numberOfLines={2}
            style={[
              styles.subtitle,
              {
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: theme.typography.size.xs,
              },
            ]}
          >
            {subtitleText}
          </Text>
        ) : null}

        {buttonText ? (
          <View
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.white,
                borderRadius: theme.borderRadius.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: theme.colors.primaryDarker,
                  fontSize: theme.typography.size.xs,
                  fontWeight: theme.typography.weight.bold,
                },
              ]}
            >
              {buttonText} →
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ banners }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeIndex, setActiveIndex] = useState(0);

  if (!banners || banners.length === 0) {
    return null;
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    setActiveIndex(index);
  };

  const handleBannerPress = (banner: Banner) => {
    switch (banner.actionType) {
      case 'CATEGORY': {
        const catId = banner.actionValue || banner.categoryId;
        if (isValidActionValue(catId)) {
          navigation.navigate('ProductListing', {
            categoryId: catId!.trim(),
            title: banner.title?.trim() || 'Products',
          });
        }
        break;
      }

      case 'PRODUCT': {
        if (isValidActionValue(banner.actionValue)) {
          navigation.navigate('ProductDetails', {
            productId: banner.actionValue!.trim(),
          });
        }
        break;
      }

      case 'BRAND': {
        if (isValidActionValue(banner.actionValue)) {
          navigation.navigate('ProductListing', {
            brand: banner.actionValue!.trim(),
            title: banner.title?.trim() || banner.actionValue!.trim(),
          });
        }
        break;
      }

      case 'OFFER': {
        navigation.navigate('Offers');
        break;
      }

      case 'NONE':
      default:
        // No action
        break;
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContent}
        renderItem={({ item }) => (
          <BannerCard item={item} theme={theme} onPress={handleBannerPress} />
        )}
      />

      {/* Indicator dots (only when multiple banners exist) */}
      {banners.length > 1 && (
        <View style={styles.indicatorRow}>
          {banners.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  width: activeIndex === idx ? 20 : 6,
                  backgroundColor:
                    activeIndex === idx ? theme.colors.primary : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  bannerCard: {
    height: 160,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  bannerImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  bannerContent: {
    padding: 18,
    maxWidth: '75%',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    lineHeight: 24,
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 12,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonText: {
    letterSpacing: 0.2,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
