import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onSubmit?: () => void;
  editable?: boolean;
  onPress?: () => void;
  autoFocus?: boolean;
  showFilterButton?: boolean;
  onFilterPress?: () => void;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value = '',
  onChangeText,
  placeholder = 'Search groceries, fruits, vegetables...',
  onClear,
  onSubmit,
  editable = true,
  onPress,
  autoFocus = false,
  showFilterButton = false,
  onFilterPress,
  style,
}) => {
  const { theme } = useTheme();

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.lg,
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      <Ionicons name="search-outline" size={20} color={theme.colors.primary} style={styles.searchIcon} />

      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.sm,
            },
          ]}
        />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.placeholderText,
            {
              color: theme.colors.textMuted,
              fontSize: theme.typography.size.sm,
            },
          ]}
        >
          {value || placeholder}
        </Text>
      )}

      {editable && !!value && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} style={styles.actionIcon} />
        </TouchableOpacity>
      )}

      {showFilterButton && (
        <TouchableOpacity
          onPress={onFilterPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.filterButton, { borderLeftColor: theme.colors.border }]}
        >
          <Ionicons name="options-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (!editable && onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  placeholderText: {
    flex: 1,
  },
  actionIcon: {
    marginLeft: 8,
  },
  filterButton: {
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    height: 24,
    justifyContent: 'center',
  },
});
