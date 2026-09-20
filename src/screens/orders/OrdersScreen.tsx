import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Order, OrderStatus } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { AppHeader } from '../../components/common/AppHeader';
import { OrderCard } from '../../components/order/OrderCard';
import { EmptyState } from '../../components/feedback/EmptyState';

type TabOption = 'All' | 'Ongoing' | 'Delivered' | 'Cancelled';
const TABS: TabOption[] = ['All', 'Ongoing', 'Delivered', 'Cancelled'];

export const OrdersScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isLoggedIn } = useAuth();
  const { orders, isLoading, refreshOrders } = useOrders();

  const [activeTab, setActiveTab] = useState<TabOption>('All');

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeTab === 'All') return true;
      if (activeTab === 'Delivered') return order.status === 'Delivered';
      if (activeTab === 'Cancelled') return order.status === 'Cancelled';
      if (activeTab === 'Ongoing') {
        return (
          order.status === 'Placed' ||
          order.status === 'Confirmed' ||
          order.status === 'Preparing' ||
          order.status === 'Out for Delivery'
        );
      }
      return true;
    });
  }, [orders, activeTab]);

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="My Orders" showBack={false} />
        <EmptyState
          iconName="log-in-outline"
          title="Login to View Orders"
          description="Please log in to track your current orders, view past receipts, and reorder your favorites."
          buttonLabel="Log In / Sign Up"
          onButtonPress={() => navigation.navigate('Auth')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="My Orders" showBack={false} />

      {/* Tabs Row */}
      <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
        {TABS.map((tab) => {
          const isSelected = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabButton,
                isSelected && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2.5 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          iconName="receipt-outline"
          title={`No ${activeTab === 'All' ? '' : activeTab} Orders`}
          description="You don't have any orders matching this category yet. Stock up your pantry now!"
          buttonLabel="Browse Products"
          onButtonPress={() => navigation.navigate('Main')}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refreshOrders}
          refreshing={isLoading}
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 13,
  },
  listContent: {
    padding: 16,
  },
});
