import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { storeService } from '../../services/api/storeService';

export const SplashScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isLoggedIn, user, isLoading } = useAuth();

  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const checkNavigation = async () => {
    // 1. Check whether auth token and user exist
    const token = await storage.getAuthToken();
    const savedUser = await storage.get<User | null>(STORAGE_KEYS.USER, null);

    if (!token || !savedUser) {
      // Unauthenticated -> Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
      return;
    }

    // 2. Authenticated: check if store is selected
    const selectedStoreId = await storeService.getSelectedStoreId();
    if (selectedStoreId) {
      // Authenticated with selected store -> Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      // Authenticated without selected store -> Store Selection
      navigation.reset({
        index: 0,
        routes: [{ name: 'StoreSelection' }],
      });
    }
  };

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 12,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    if (isLoading) return;

    const timer = setTimeout(() => {
      checkNavigation();
    }, 800);

    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Animated.View style={[styles.logoBox, { transform: [{ scale }], opacity }]}>
        <View style={styles.iconCircle}>
          <Ionicons name="basket" size={54} color={theme.colors.primary} />
        </View>

        <Text style={styles.appName}>FreshMart</Text>
        <Text style={styles.tagline}>Fresh Groceries Delivered Daily</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.loaderDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.versionText}>Version 1.0.0 (Production Prototype)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBox: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  loaderDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 20,
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
});
