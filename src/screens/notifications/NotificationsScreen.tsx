import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Notification } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { formatDate } from '../../utils/formatters';

export const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const getIconConfig = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return { icon: 'cube-outline', color: theme.colors.primary, bg: theme.colors.primaryLight };
      case 'offer':
        return { icon: 'pricetag-outline', color: theme.colors.secondary, bg: theme.colors.secondaryLight };
      case 'promo':
        return { icon: 'megaphone-outline', color: '#8B5CF6', bg: '#EDE9FE' };
      case 'system':
      default:
        return { icon: 'information-circle-outline', color: theme.colors.info, bg: theme.colors.accentLight };
    }
  };

  const handleNotificationPress = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    if (notif.orderId) {
      navigation.navigate('OrderDetails', { orderId: notif.orderId });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllAsRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text
                style={[
                  styles.markAllText,
                  {
                    color: theme.colors.primary,
                    fontSize: theme.typography.size.xs,
                    fontWeight: theme.typography.weight.bold,
                  },
                ]}
              >
                Mark all read
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          iconName="notifications-off-outline"
          title="No Notifications"
          description="You don't have any updates right now. We'll let you know when your order status updates or when deals launch!"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const cfg = getIconConfig(item.type);

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleNotificationPress(item)}
                style={[
                  styles.card,
                  {
                    backgroundColor: item.isRead ? theme.colors.card : theme.colors.surface,
                    borderColor: item.isRead ? theme.colors.borderLight : theme.colors.primary,
                    borderRadius: theme.borderRadius.lg,
                    borderLeftWidth: item.isRead ? 1 : 4,
                    ...theme.shadows.sm,
                  },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={20} color={cfg.color} />
                </View>

                <View style={styles.textCol}>
                  <View style={styles.headerRow}>
                    <Text
                      style={[
                        styles.title,
                        {
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.size.sm,
                          fontWeight: item.isRead ? theme.typography.weight.semibold : theme.typography.weight.bold,
                        },
                      ]}
                    >
                      {item.title}
                    </Text>

                    <TouchableOpacity
                      onPress={() => deleteNotification(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={[
                      styles.message,
                      { color: theme.colors.textSecondary, fontSize: theme.typography.size.xs },
                    ]}
                  >
                    {item.message}
                  </Text>

                  <Text
                    style={[
                      styles.date,
                      { color: theme.colors.textMuted, fontSize: 10 },
                    ]}
                  >
                    {formatDate(item.date)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  markAllText: {},
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderWidth: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    paddingRight: 6,
  },
  message: {
    lineHeight: 18,
    marginBottom: 6,
  },
  date: {},
});
