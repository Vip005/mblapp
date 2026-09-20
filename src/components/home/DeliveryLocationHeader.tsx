import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useAddress } from '../../hooks/useAddress';
import { useNotifications } from '../../hooks/useNotifications';
import { useStore } from '../../hooks/useStore';

export const DeliveryLocationHeader: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn } = useAuth();
  const { selectedAddress } = useAddress();
  const { selectedStore } = useStore();
  const { unreadCount } = useNotifications();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 17) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  };

  const displayName = user?.name ? user.name.split(' ')[0] : 'Guest';
  const locationName = selectedAddress
    ? `${selectedAddress.area || selectedAddress.city}`
    : 'Chennai, 600040';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          paddingTop: Math.max(insets.top, 12),
        },
      ]}
    >
      <View style={styles.leftCol}>
        <Text
          style={[
            styles.greeting,
            { color: theme.colors.textMuted, fontSize: theme.typography.size.xs },
          ]}
        >
          {getGreeting()}, {displayName}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => (isLoggedIn ? navigation.navigate('Addresses') : navigation.navigate('Auth'))}
          style={styles.locationRow}
        >
          <Ionicons name="location-sharp" size={18} color={theme.colors.primary} />
          <Text
            numberOfLines={1}
            style={[
              styles.locationText,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.md,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            {locationName}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textPrimary} style={styles.chevron} />
        </TouchableOpacity>

        {/* Selected Store Indicator & Switcher */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('StoreSelection')}
          style={[
            styles.storeBadge,
            {
              backgroundColor: theme.colors.primaryLight,
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <Ionicons name="business" size={12} color={theme.colors.primary} />
          <Text
            numberOfLines={1}
            style={[
              styles.storeBadgeText,
              {
                color: theme.colors.primary,
                fontSize: theme.typography.size.xs,
                fontWeight: theme.typography.weight.semibold,
              },
            ]}
          >
            {selectedStore ? `${selectedStore.name} (${selectedStore.pincode})` : 'Select Store'}
          </Text>
          <Ionicons name="swap-horizontal" size={12} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Notifications')}
          style={[
            styles.iconButton,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
          {unreadCount > 0 && (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.badgeRed, borderColor: theme.colors.surface },
              ]}
            >
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => (isLoggedIn ? navigation.navigate('EditProfile') : navigation.navigate('Auth'))}
          style={[styles.avatarButton, { borderColor: theme.colors.primary }]}
        >
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.avatarInitial, { color: theme.colors.primaryDark }]}>
                {displayName.charAt(0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  leftCol: {
    flex: 1,
  },
  greeting: {
    fontWeight: '500',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    maxWidth: 180,
  },
  chevron: {
    marginLeft: 4,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
    gap: 4,
    maxWidth: 220,
  },
  storeBadgeText: {
    flexShrink: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontWeight: '700',
    fontSize: 16,
  },
});
