import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from '../../components/common/AppButton';
import { SafeImage } from '../../components/common/SafeImage';
import { storage, STORAGE_KEYS } from '../../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  iconName: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Fresh Farm Produce',
    subtitle: 'Handpicked organic fruits, crisp farm-fresh vegetables, and premium daily kitchen staples directly from local growers.',
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&auto=format&fit=crop&q=80',
    iconName: 'leaf-outline',
  },
  {
    id: '2',
    title: '15-Minute Express Delivery',
    subtitle: 'Ultra-fast delivery right to your doorstep. Chilled fresh dairy and morning bakery items delivered on time, every time.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
    iconName: 'flash-outline',
  },
  {
    id: '3',
    title: 'Unbeatable Everyday Offers',
    subtitle: 'Enjoy massive discounts, exclusive combo deals, cashback rewards, and 100% free delivery on all your family essentials.',
    image: '',
    iconName: 'pricetags-outline',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleComplete = async () => {
    await storage.set(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleComplete();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Top Bar with Skip */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.brandBadge}>
          <Text style={[styles.brandText, { color: theme.colors.primaryDark }]}>FreshMart</Text>
        </View>

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleComplete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.skipText, { color: theme.colors.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slide Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.imageContainer, { borderRadius: theme.borderRadius.xxl }]}>
              <SafeImage
                uri={item.image}
                style={styles.image}
                resizeMode="cover"
                fallbackIcon="cart-outline"
                fallbackIconSize={60}
              />
            </View>

            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.xxl,
                    fontWeight: theme.typography.weight.bold,
                  },
                ]}
              >
                {item.title}
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.size.sm,
                    lineHeight: theme.typography.lineHeight.md,
                  },
                ]}
              >
                {item.subtitle}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Dots indicator */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  width: currentIndex === idx ? 24 : 8,
                  backgroundColor:
                    currentIndex === idx ? theme.colors.primary : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>

        <AppButton
          title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          size="lg"
          variant="primary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  brandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '800',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  imageContainer: {
    width: '100%',
    height: 320,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
