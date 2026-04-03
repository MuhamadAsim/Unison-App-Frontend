import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markNotificationRead } from '../services/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg: '#F8F8FC',
  card: '#FFFFFF',
  text: '#0F0F23',
  subtext: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  green: '#059669',
  greenSoft: '#D1FAE5',
  coral: '#DC2626',
  coralSoft: '#FEE2E2',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
};

// ─── Notification type config ─────────────────────────────────────────────────
const TYPE_CONFIG = {
  connection:    { icon: 'people-outline',        color: C.primary,  bg: C.primarySoft },
  message:       { icon: 'chatbubble-outline',     color: C.green,    bg: C.greenSoft   },
  opportunity:   { icon: 'briefcase-outline',      color: C.amber,    bg: C.amberSoft   },
  alert:         { icon: 'alert-circle-outline',   color: C.coral,    bg: C.coralSoft   },
  mention:       { icon: 'at-outline',             color: C.primary,  bg: C.primarySoft },
  system:        { icon: 'settings-outline',       color: C.muted,    bg: C.divider     },
};

const getTypeConfig = (type = '') => {
  const key = type.toLowerCase();
  return TYPE_CONFIG[key] || { icon: 'notifications-outline', color: C.primary, bg: C.primarySoft };
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1)   return 'Just now';
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7)   return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ─── Notification Item ────────────────────────────────────────────────────────
function NotificationItem({ item, onPress }) {
  const cfg = getTypeConfig(item.type);

  return (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      onPress={() => onPress(item.id, item.is_read)}
      activeOpacity={0.7}
    >
      {/* Unread indicator bar */}
      {!item.is_read && <View style={styles.unreadBar} />}

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <Text style={[styles.message, !item.is_read && styles.messageUnread]}>
          {item.message}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typeText, { color: cfg.color }]}>
              {item.type?.toUpperCase() || 'INFO'}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      {/* Unread dot */}
      {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
    </TouchableOpacity>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="notifications-off-outline" size={48} color={C.muted} />
      </View>
      <Text style={styles.emptyTitle}>All caught up!</Text>
      <Text style={styles.emptyMessage}>You have no notifications right now.</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch (e) {
      // silently fail on pull-to-refresh
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchNotes(); }, []));

  const handleRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (e) {
      Alert.alert('Error', 'Could not mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (!unread.length) return;
    try {
      await Promise.all(unread.map(n => markNotificationRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      Alert.alert('Error', 'Could not mark all as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerBtn}>
            <Ionicons name="checkmark-done-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => String(i.id)}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={handleRead} />
          )}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyList : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBtn: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  headerBadge: {
    backgroundColor: C.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },

  // ── Notification Item ──
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  itemUnread: {
    backgroundColor: C.primarySoft,
    borderColor: C.primaryBorder,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: C.primary,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 6,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 6,
  },
  message: {
    fontSize: 14,
    color: C.subtext,
    lineHeight: 20,
  },
  messageUnread: {
    color: C.text,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
    flexShrink: 0,
  },
  separator: {
    height: 10,
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
  },
});