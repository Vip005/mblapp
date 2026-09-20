import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  style?: ViewStyle;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  reviewCount,
  size = 'sm',
  showCount = true,
  style,
}) => {
  const { theme } = useTheme();

  const getSizes = () => {
    switch (size) {
      case 'lg':
        return { icon: 16, text: theme.typography.size.sm };
      case 'md':
        return { icon: 14, text: theme.typography.size.xs };
      case 'sm':
      default:
        return { icon: 12, text: 11 };
    }
  };

  const { icon, text } = getSizes();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: '#FEF3C7',
            borderRadius: theme.borderRadius.xs,
          },
        ]}
      >
        <Ionicons name="star" size={icon} color="#F59E0B" />
        <Text
          style={[
            styles.ratingText,
            {
              color: '#92400E',
              fontSize: text,
              fontWeight: theme.typography.weight.bold,
            },
          ]}
        >
          {rating.toFixed(1)}
        </Text>
      </View>

      {showCount && typeof reviewCount === 'number' && (
        <Text
          style={[
            styles.countText,
            {
              color: theme.colors.textMuted,
              fontSize: text,
            },
          ]}
        >
          ({reviewCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  ratingText: {
    marginLeft: 3,
  },
  countText: {
    marginLeft: 4,
  },
});
