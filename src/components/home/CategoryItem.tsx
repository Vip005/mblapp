import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Category, RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface CategoryItemProps {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
}

const FALLBACK_CAT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';

export const CategoryItem: React.FC<CategoryItemProps> = ({ category, size = 'md' }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [imgError, setImgError] = useState(false);

  const getDimension = () => {
    switch (size) {
      case 'lg':
        return 80;
      case 'sm':
        return 56;
      case 'md':
      default:
        return 68;
    }
  };

  const dim = getDimension();

  const handlePress = () => {
    navigation.navigate('ProductListing', {
      categoryId: category.id,
      title: category.name,
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`View ${category.name} category`}
    >
      <View
        style={[
          styles.imageCircle,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: category.color || theme.colors.primaryLight,
            borderColor: theme.colors.borderLight,
          },
        ]}
      >
        <Image
          source={{ uri: imgError ? FALLBACK_CAT_IMAGE : category.image }}
          onError={() => setImgError(true)}
          style={[styles.image, { width: dim - 12, height: dim - 12, borderRadius: (dim - 12) / 2 }]}
          resizeMode="cover"
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontSize: size === 'sm' ? 11 : 12,
            fontWeight: theme.typography.weight.medium,
            maxWidth: dim + 16,
          },
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 14,
  },
  imageCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  image: {
    overflow: 'hidden',
  },
  title: {
    textAlign: 'center',
  },
});
