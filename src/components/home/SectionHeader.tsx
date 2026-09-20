import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  seeAllText?: string;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  onSeeAll,
  seeAllText = 'See All',
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleWrapper}>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.lg,
              fontWeight: theme.typography.weight.bold,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textMuted,
                fontSize: theme.typography.size.xs,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {onSeeAll && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSeeAll}
          style={styles.seeAllButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              styles.seeAllText,
              {
                color: theme.colors.primary,
                fontSize: theme.typography.size.sm,
                fontWeight: theme.typography.weight.semibold,
              },
            ]}
          >
            {seeAllText}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  seeAllText: {
    marginRight: 2,
  },
});
