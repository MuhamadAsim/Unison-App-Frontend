import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import {
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  markNotificationRead,
} from '../../services/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg: '#F5F6FA',
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
  surface: '#FAFAFA',
};

const TYPE_CONFIG = {
  connection_request: { icon: 'people-outline', color: C.primary, bg: C.primarySoft, label: 'Connection' },
  connection_accepted: { icon: 'checkmark-circle-outline', color: C.green, bg: C.greenSoft, label: 'Accepted' },
  new_opportunity: { icon: 'briefcase-outline', color: C.amber, bg: C.amberSoft, label: 'Opportunity' },
  account_approved: { icon: 'shield-checkmark-outline', color: C.green, bg: C.greenSoft, label: 'Approved' },
  account_rejected: { icon: 'close-circle-outline', color: C.coral, bg: C.coralSoft, label: 'Rejected' },
  new_message: { icon: 'chatbubble-outline', color: C.primary, bg: C.primarySoft, label: 'Message' },
  message: { icon: 'chatbubble-outline', color: C.primary, bg: C.primarySoft, label: 'Message' },
  mention: { icon: 'at-outline', color: C.primary, bg: C.primarySoft, label: 'Mention' },
  system: { icon: 'settings-outline', color: C.muted, bg: C.divider, label: 'System' },
  announcement: { icon: 'megaphone-outline', color: '#7C3AED', bg: '#F5F3FF', label: 'Announcement' },
  event: { icon: 'calendar-outline', color: '#0891B2', bg: '#ECFEFF', label: 'Event' },
  event_reminder: { icon: 'alarm-outline', color: '#0891B2', bg: '#ECFEFF', label: 'Event' },
  event_update: { icon: 'create-outline', color: '#0891B2', bg: '#ECFEFF', label: 'Event' },
  event_cancelled: { icon: 'close-circle-outline', color: C.coral, bg: C.coralSoft, label: 'Cancelled' },
};

const getTypeConfig = (type = '') =>
  TYPE_CONFIG[type.toLowerCase()] || {
    icon: 'notifications-outline',
    color: C.primary,
    bg: C.primarySoft,
    label: 'Update',
  };

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const handleNotificationPress = (notification, navigation) => {
  const { type, reference_link, id: notificationId } = notification;

  console.log('[Notification Pressed] type:', type, 'reference_link:', reference_link);

  const extractId = (path) => {
    if (!path) return null;
    const parts = path.split('/');
    return parts[parts.length - 1] || null;
  };

  const contentId = extractId(reference_link);

  switch (type) {
    case 'connection_request':
      navigation.navigate('Tabs', { screen: 'Network', params: { initialTab: 'requests' } });
      break;

    case 'connection_accepted':
      navigation.navigate('Tabs', { screen: 'Network', params: { initialTab: 'my_connections' } });
      break;

    case 'new_opportunity':
      if (contentId) {
        navigation.navigate('OpportunityDetail', { id: contentId });
      } else {
        navigation.navigate('Tabs', { screen: 'Opportunities' });
      }
      break;

    case 'announcement':
      navigation.navigate('Tabs', { screen: 'Opportunities' });
      break;

    case 'event':
    case 'event_reminder':
    case 'event_update':
    case 'event_cancelled':
      navigation.navigate('Tabs', { screen: 'Opportunities' });
      break;

    case 'new_message':
    case 'message':
      if (reference_link) {
        navigation.navigate('ChatDetail', {
          participantId: contentId,
          participantName: notification.sender_display_name,
          participantPicture: notification.sender_profile_picture || null,
          participantUsername: notification.sender_username,
        });
      } else {
        navigation.navigate('Conversations');
      }
      break;

    case 'account_approved':
      navigation.navigate('Tabs', { screen: 'Profile' });
      break;

    case 'account_rejected':
      Alert.alert(
        'Account Rejected',
        notification.message || 'Your account registration was not approved.',
        [{ text: 'OK' }]
      );
      break;

    default:
      if (!reference_link) break;
      if (reference_link.includes('/opportunities/')) {
        navigation.navigate('OpportunityDetail', { id: contentId });
      } else if (reference_link.includes('/events/')) {
        navigation.navigate('EventDetail', { id: contentId });
      } else if (reference_link.includes('/announcements/')) {
        navigation.navigate('AnnouncementDetail', { id: contentId });
      } else if (reference_link.includes('/profile/')) {
        navigation.navigate('AlumniPublicProfile', { userId: contentId });
      } else if (reference_link.includes('/chat/')) {
        navigation.navigate('ChatDetail', {
          participantId: contentId,
          participantName: notification.sender_display_name,
          participantPicture: notification.sender_profile_picture || null,
          participantUsername: notification.sender_username,
        });
      }
      break;
  }
};

// ─── HTML Preview for notification messages ────────────────────────────────────
function NotificationHtmlPreview({ html, isUnread }) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = windowWidth - 160; // approximate usable width inside card
  const maxHeight = 19 * 2; // exactly 2 lines at lineHeight 19

  if (!html || html.trim() === '') return null;

  const color = isUnread ? C.text : C.subtext;

  const tagsStyles = {
    body: { color, fontSize: 13.5, lineHeight: 19 },
    p: { color, fontSize: 13.5, lineHeight: 19, marginTop: 0, marginBottom: 0 },
    span: { color, fontSize: 13.5 },
    strong: { color, fontWeight: '700' },
    b: { color, fontWeight: '700' },
    em: { color, fontStyle: 'italic' },
    i: { color, fontStyle: 'italic' },
    a: { color: C.primary },
  };

  return (
    <View style={{ maxHeight, overflow: 'hidden' }}>
      <RenderHtml
        contentWidth={contentWidth}
        source={{ html }}
        tagsStyles={tagsStyles}
        enableExperimentalBRCollapsing
        enableExperimentalGhostLinesPrevention
        ignoredDomTags={['img', 'figure', 'video', 'iframe']}
      />
    </View>
  );
}

// ─── Swipeable Notification Item ─────────────────────────────────────────────
function NotificationItem({ item, onPress, onDelete, navigation }) {
  const cfg = getTypeConfig(item.type);
  const isUnread = !item.is_read;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleItemPress = () => {
    if (isUnread) onPress(item.id, item.is_read);
    handleNotificationPress(item, navigation);
  };

  const triggerDelete = () => {
    onDelete(item.id);
    Animated.parallel([
      Animated.timing(translateX, { toValue: -400, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: triggerDelete },
      ]
    );
  };

  return (
    <Animated.View style={{ transform: [{ translateX }], opacity }}>
      <TouchableOpacity
        style={[styles.item, isUnread && styles.itemUnread]}
        onPress={handleItemPress}
        onLongPress={handleDelete}
        activeOpacity={0.75}
        delayLongPress={400}
      >
        {isUnread && <View style={[styles.unreadBar, { backgroundColor: cfg.color }]} />}

        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        <View style={styles.itemContent}>
          {/* ✅ Replace plain Text with HTML rendering */}
          <NotificationHtmlPreview html={item.message} isUnread={isUnread} />

          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.rightCol}>
          {isUnread && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={15} color={C.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="notifications-off-outline" size={44} color={C.muted} />
      </View>
      <Text style={styles.emptyTitle}>All caught up!</Text>
      <Text style={styles.emptyMessage}>
        No notifications right now. We'll ping you when something arrives.
      </Text>
    </View>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ total, unread }) {
  return (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, unread > 0 && { color: C.primary }]}>{unread}</Text>
        <Text style={styles.statLabel}>Unread</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{total - unread}</Text>
        <Text style={styles.statLabel}>Read</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'

  const fetchNotes = async (readFilter) => {
    try {
      setLoading(true);
      const params = {};
      if (readFilter === 'unread') params.read = 'false';
      if (readFilter === 'read') params.read = 'true';
      const res = await getNotifications(params);
      setNotifications(res.data || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotes(filter);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { fetchNotes(filter); }, [filter]));

  const handleMarkRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      Alert.alert('Error', 'Could not mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (!unread.length) return;
    try {
      await Promise.all(unread.map(n => markNotificationRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      Alert.alert('Error', 'Could not mark all as read');
    }
  };

  const handleDelete = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      Alert.alert('Error', 'Could not delete notification');
      fetchNotes(filter);
    }
  };

  const handleClearAll = () => {
    if (!notifications.length) return;
    Alert.alert(
      'Clear All Notifications',
      'This will permanently remove all your notifications. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllNotifications();
              setNotifications([]);
            } catch {
              Alert.alert('Error', 'Could not clear notifications');
            }
          },
        },
      ]
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'read', label: 'Read' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.iconBtn}>
              <Ionicons name="checkmark-done-outline" size={20} color={C.primary} />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={20} color={C.coral} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          ListEmptyComponent={EmptyState}
          ListHeaderComponent={
            notifications.length > 0
              ? <SectionHeader
                title={filter === 'unread' ? 'Unread' : filter === 'read' ? 'Read' : 'Recent'}
                count={notifications.length}
              />
              : null
          }
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={handleMarkRead}
              onDelete={handleDelete}
              navigation={navigation}
            />
          )}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {!loading && notifications.length > 0 && (
        <View style={styles.hintBar}>
          <Ionicons name="information-circle-outline" size={13} color={C.muted} />
          <Text style={styles.hintText}>Long-press or tap 🗑 to delete a notification</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 54,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  headerBadge: {
    backgroundColor: C.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: C.text },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  filterRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterTabActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primaryBorder,
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  filterTabTextActive: { color: C.primary },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingTop: 4,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionBadge: {
    backgroundColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: C.subtext },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    width: 3,
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
  itemContent: { flex: 1, gap: 5 },
  // Removed .message and .messageUnread styles as they are now handled by the HTML component
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  dateText: { fontSize: 11, color: C.muted, fontWeight: '500' },

  rightCol: { alignItems: 'center', gap: 8, marginLeft: 10 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  deleteBtn: { padding: 2 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.muted },
  listContent: { padding: 16 },
  emptyList: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    gap: 12,
    marginTop: -40,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptyMessage: { fontSize: 14, color: C.subtext, textAlign: 'center', lineHeight: 21 },

  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  hintText: { fontSize: 11, color: C.muted },
});