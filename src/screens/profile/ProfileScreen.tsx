import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useOrders } from '../../hooks/useOrders';
import { AppHeader } from '../../components/common/AppHeader';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string | number;
  route?: keyof RootStackParamList;
  action?: () => void;
  color?: string;
}

export const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, isLoggedIn } = useAuth();
  const { clearSelectedStore } = useStore();
  const { items } = useCart();
  const { wishlist } = useWishlist();
  const { orders } = useOrders();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    await clearSelectedStore();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Shopping & Orders',
      items: [
        {
          icon: 'receipt-outline',
          title: 'My Orders',
          subtitle: `${orders.length} total orders placed`,
          route: 'Orders',
        },
        {
          icon: 'heart-outline',
          title: 'My Wishlist',
          subtitle: `${wishlist.length} saved favorites`,
          route: 'Wishlist',
        },
        {
          icon: 'location-outline',
          title: 'Saved Addresses',
          subtitle: 'Manage home & office delivery addresses',
          route: 'Addresses',
        },
        {
          icon: 'pricetags-outline',
          title: 'Exclusive Coupons & Offers',
          subtitle: 'Instant discount vouchers',
          route: 'Offers',
        },
      ],
    },
    {
      title: 'Preferences & Support',
      items: [
        {
          icon: 'notifications-outline',
          title: 'Notifications',
          route: 'Notifications',
        },
        {
          icon: 'settings-outline',
          title: 'App Settings',
          subtitle: 'Theme, notifications, cache',
          route: 'Settings',
        },
        {
          icon: 'help-buoy-outline',
          title: 'Help & Customer Support',
          subtitle: '24/7 Toll-free assistance',
          action: () =>
            Alert.alert(
              'Customer Care Support',
              'Need assistance with your grocery order? Call our 24/7 toll-free support line at 1800-123-GROCERY or email support@freshmart.demo',
              [{ text: 'Close' }]
            ),
        },
        {
          icon: 'document-text-outline',
          title: 'Terms & Conditions',
          action: () =>
            Alert.alert(
              'Terms & Conditions',
              'This is a complete frontend demonstration grocery mobile application built with React Native and local dummy datasets.',
              [{ text: 'OK' }]
            ),
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="My Profile" showBack={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.xl,
              ...theme.shadows.sm,
            },
          ]}
        >
          {isLoggedIn ? (
            <View style={styles.userInfoRow}>
              <View style={[styles.avatarBox, { borderColor: theme.colors.primary }]}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.avatarInitial, { color: theme.colors.primaryDark }]}>
                      {user?.name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.userTextCol}>
                <Text
                  style={[
                    styles.userName,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.size.lg,
                      fontWeight: theme.typography.weight.bold,
                    },
                  ]}
                >
                  {user?.name || 'User'}
                </Text>
                <Text style={[styles.userPhone, { color: theme.colors.textSecondary }]}>
                  +91 {user?.phone || ''}
                </Text>
                {user?.email ? (
                  <Text style={[styles.userEmail, { color: theme.colors.textMuted }]}>
                    {user.email}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('EditProfile')}
                style={[styles.editBtn, { backgroundColor: theme.colors.primaryLight }]}
              >
                <Ionicons name="pencil" size={16} color={theme.colors.primaryDark} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.guestCardRow}>
              <View style={[styles.avatarBox, { borderColor: theme.colors.primary }]}>
                <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
                </View>
              </View>
              <View style={styles.userTextCol}>
                <Text
                  style={[
                    styles.userName,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.size.lg,
                      fontWeight: theme.typography.weight.bold,
                    },
                  ]}
                >
                  Welcome, Guest 👋
                </Text>
                <Text style={[styles.userPhone, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                  Log in to track orders and save addresses
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Auth')}
                  style={[styles.loginPromptBtn, { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={styles.loginPromptBtnText}>Log In / Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Metrics Bar */}
          <View style={[styles.metricsRow, { borderTopColor: theme.colors.borderLight }]}>
            <TouchableOpacity
              onPress={() => (isLoggedIn ? navigation.navigate('Orders') : navigation.navigate('Auth'))}
              style={styles.metricItem}
            >
              <Text style={[styles.metricVal, { color: theme.colors.primaryDark }]}>
                {isLoggedIn ? orders.length : 0}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Orders</Text>
            </TouchableOpacity>

            <View style={[styles.metricDivider, { backgroundColor: theme.colors.borderLight }]} />

            <TouchableOpacity
              onPress={() => navigation.navigate('Wishlist')}
              style={styles.metricItem}
            >
              <Text style={[styles.metricVal, { color: theme.colors.primaryDark }]}>
                {wishlist.length}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Wishlist</Text>
            </TouchableOpacity>

            <View style={[styles.metricDivider, { backgroundColor: theme.colors.borderLight }]} />

            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              style={styles.metricItem}
            >
              <Text style={[styles.metricVal, { color: theme.colors.primaryDark }]}>
                {items.length}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>In Cart</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.sectionContainer}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.size.xs,
                  fontWeight: theme.typography.weight.bold,
                },
              ]}
            >
              {section.title.toUpperCase()}
            </Text>

            <View
              style={[
                styles.menuBox,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                  borderRadius: theme.borderRadius.lg,
                  ...theme.shadows.sm,
                },
              ]}
            >
              {section.items.map((item, iIdx) => {
                const isLast = iIdx === section.items.length - 1;

                return (
                  <TouchableOpacity
                    key={iIdx}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.route) {
                        if (!isLoggedIn && (item.route === 'Addresses' || item.route === 'Orders' || item.route === 'Notifications')) {
                          navigation.navigate('Auth');
                        } else {
                          navigation.navigate(item.route as any);
                        }
                      }
                    }}
                    style={[
                      styles.menuItem,
                      !isLast && { borderBottomColor: theme.colors.borderLight, borderBottomWidth: 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.menuIconCircle,
                        { backgroundColor: theme.colors.background },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.color || theme.colors.primary}
                      />
                    </View>

                    <View style={styles.menuTextCol}>
                      <Text
                        style={[
                          styles.menuTitle,
                          {
                            color: theme.colors.textPrimary,
                            fontSize: theme.typography.size.sm,
                            fontWeight: theme.typography.weight.semibold,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text
                          style={[
                            styles.menuSubtitle,
                            { color: theme.colors.textMuted, fontSize: theme.typography.size.xs },
                          ]}
                        >
                          {item.subtitle}
                        </Text>
                      )}
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        {isLoggedIn && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setLogoutModalVisible(true)}
            style={[
              styles.logoutBtn,
              {
                backgroundColor: theme.colors.errorLight,
                borderColor: theme.colors.error,
                borderRadius: theme.borderRadius.lg,
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
            <Text
              style={[
                styles.logoutText,
                {
                  color: theme.colors.error,
                  fontSize: theme.typography.size.sm,
                  fontWeight: theme.typography.weight.bold,
                },
              ]}
            >
              Log Out
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={logoutModalVisible}
        title="Confirm Log Out?"
        message="Are you sure you want to log out from FreshMart? Your saved cart and addresses will remain safe."
        confirmText="Log Out"
        confirmVariant="danger"
        iconName="log-out-outline"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  userCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginPromptBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  loginPromptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
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
    fontSize: 24,
    fontWeight: '800',
  },
  userTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {},
  userPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuBox: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {},
  menuSubtitle: {
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  logoutText: {
    marginLeft: 8,
    letterSpacing: 0.2,
  },
});
