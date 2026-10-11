import React, { useState, useEffect } from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

/**
 * Validates whether a given URI is a non-empty, valid remote, local, or data URI.
 * Rejects empty strings, whitespace, null/undefined, and pseudo-literals ("null", "undefined").
 */
export const isValidImageUri = (uri?: string | null): boolean => {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  // Valid http/https, file, data URI, or relative path starting with /
  return /^(https?:\/\/|file:\/\/|data:image\/|\/)/i.test(trimmed);
};

export interface SafeImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  source?: ImageProps['source'];
  style?: StyleProp<ImageStyle>;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackIconSize?: number;
  placeholderStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  uri,
  source,
  style,
  resizeMode = 'cover',
  fallbackIcon = 'basket-outline',
  fallbackIconSize = 22,
  placeholderStyle,
  containerStyle,
  onError,
  ...rest
}) => {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);

  // Determine whether to use uri prop or source prop
  const resolvedUri = typeof source === 'object' && source !== null && 'uri' in source
    ? (source as { uri?: string }).uri
    : uri;

  const isLocalSource = typeof source === 'number' || (Array.isArray(source) && source.length > 0);
  const isValidRemote = isValidImageUri(resolvedUri);

  // Reset error state whenever URI changes
  useEffect(() => {
    setHasError(false);
  }, [resolvedUri]);

  // If source is a valid local require(), render directly
  if (isLocalSource && source) {
    return (
      <Image
        source={source}
        style={style}
        resizeMode={resizeMode}
        onError={(e) => {
          setHasError(true);
          onError?.(e);
        }}
        {...rest}
      />
    );
  }

  // If URI is invalid or image failed to load, render styled placeholder
  if (!isValidRemote || hasError) {
    return (
      <View
        style={[
          styles.placeholderContainer,
          {
            backgroundColor: theme.colors.borderLight || '#F1F5F9',
          },
          style as ViewStyle,
          placeholderStyle,
        ]}
      >
        <Ionicons
          name={fallbackIcon}
          size={fallbackIconSize}
          color={theme.colors.textMuted || '#94A3B8'}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: (resolvedUri as string).trim() }}
      style={style}
      resizeMode={resizeMode}
      onError={(e) => {
        setHasError(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
