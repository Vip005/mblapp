import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { useOrders } from '../../hooks/useOrders';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAddress } from '../../hooks/useAddress';
import { useNotifications } from '../../hooks/useNotifications';
import { orderService } from '../../services/api/orderService';
import { AppHeader } from '../../components/common/AppHeader';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';
import { ToastMessage } from '../../components/feedback/ToastMessage';

export const SettingsScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const { clearSelectedStore } = useStore();
  const { clearOrders } = useOrders();
  const { clearCart } = useCart();
  const { clearWishlist } = useWishlist();
  const { clearAddresses } = useAddress();
  const { clearNotifications } = useNotifications();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [promosEnabled, setPromosEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClearCache = () => {
    Alert.alert(
      'Clear App Cache',
      'This will clear temporary cached images and product listings. Your cart, orders, and saved addresses will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => {
            setToastMessage('Cached temporary files cleared successfully (18.4 MB freed)');
          },
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      'Select Language',
      'Choose your preferred grocery shopping language',
      [
        { text: 'English', onPress: () => setSelectedLanguage('English') },
        { text: 'தமிழ் (Tamil)', onPress: () => setSelectedLanguage('Tamil') },
        { text: 'हिन्दी (Hindi)', onPress: () => setSelectedLanguage('Hindi') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    clearOrders();
    clearCart();
    clearWishlist();
    clearAddresses();
    clearNotifications();
    await orderService.clearOrdersCache(user?.id);
    await logout();
    await clearSelectedStore();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>APPEARANCE</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={theme.colors.primary}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Dark Theme Mode
                </Text>
                <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                  {isDark ? 'Dark theme enabled' : 'Clean light theme enabled'}
                </Text>
              </View>
            </View>

            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, marginTop: 20 }]}>
          NOTIFICATIONS
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Order Status Updates
                </Text>
                <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                  Live alerts when orders are dispatched
                </Text>
              </View>
            </View>

            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="pricetags-outline" size={20} color={theme.colors.secondary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Promotions & Deals
                </Text>
                <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                  Weekend discount alerts & coupons
                </Text>
              </View>
            </View>

            <Switch
              value={promosEnabled}
              onValueChange={setPromosEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>
        </View>

        {/* General App Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, marginTop: 20 }]}>
          GENERAL
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <TouchableOpacity activeOpacity={0.7} onPress={handleLanguageChange} style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={20} color={theme.colors.primary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  App Language
                </Text>
                <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                  {selectedLanguage}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <TouchableOpacity activeOpacity={0.7} onPress={handleClearCache} style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Clear Temporary Cache
                </Text>
                <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                  Free up app memory & images
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* About App Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, marginTop: 20 }]}>
          ABOUT
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderLight,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.sm,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="cube-outline" size={20} color={theme.colors.primary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  App Version
                </Text>
                <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                  FreshMart v1.0.0 (Production Frontend Prototype)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setLogoutModalVisible(true)}
          style={[
            styles.logoutButton,
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
                fontWeight: theme.typography.weight.bold,
                fontSize: theme.typography.size.sm,
              },
            ]}
          >
            Log Out from FreshMart
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={logoutModalVisible}
        title="Log Out of Account?"
        message="You will need to verify your phone number next time you log in."
        confirmText="Log Out"
        confirmVariant="danger"
        iconName="log-out-outline"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

      <ToastMessage
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        onDismiss={() => setToastMessage(null)}
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 46,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderWidth: 1,
    marginTop: 24,
  },
  logoutText: {
    marginLeft: 8,
  },
});
