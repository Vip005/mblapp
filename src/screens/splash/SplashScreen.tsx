import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { storeService } from '../../services/api/storeService';
import { determineNextAppRoute, AppProgressionTarget } from '../../utils/onboardingProgression';

export const SplashScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, isLoading } = useAuth();
  const { selectStoreById } = useStore();

  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hasNavigated = useRef(false);

  const navigateOnce = (target: AppProgressionTarget) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (target.type === 'AUTH') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth', params: { screen: target.screen } }],
      });
    } else if (target.type === 'AUTH_STEP') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth', params: { screen: target.screen } }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  // 1. Logo entrance animation (runs once on mount)
  useEffect(() => {
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
  }, [opacity, scale]);

  // 2. Startup navigation: strictly wait until AuthContext completes hydration / refresh
  useEffect(() => {
    if (isLoading) {
      return;
    }

    const runStartup = async () => {
      // Allow brief branded splash display (minimum 500ms)
      await new Promise((res) => setTimeout(res, 500));

      try {
        const target = await determineNextAppRoute(user);

        // If target is AUTH (e.g. refresh failed or no session), ensure clean logout
        if (target.type === 'AUTH') {
          await logout();
        }

        // If navigating to Main, ensure StoreContext is hydrated with the selected store
        if (target.type === 'MAIN') {
          const storeId = await storeService.getSelectedStoreId();
          if (storeId) {
            selectStoreById(storeId).catch(() => {});
          }
        }

        navigateOnce(target);
      } catch (e) {
        console.warn('[SplashScreen] Error during startup hydration:', e);
        await logout();
        navigateOnce({ type: 'AUTH', screen: 'Login' });
      }
    };

    runStartup();
  }, [isLoading, logout, user]);

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
