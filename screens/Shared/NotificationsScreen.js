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
  event_reminder: { icon: 'alarm-outline', color: '#0891B2', bg: '#ECFEFF', label: 'Reminder' },
  event_update: { icon: 'create-outline', color: '#0891B2', bg: '#ECFEFF', label: 'Event Update' },
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
  const { type, reference_link } = notification;
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
      contentId
        ? navigation.navigate('OpportunityDetail', { id: contentId })
        : navigation.navigate('Tabs', { screen: 'Opportunities' });
      break;
    case 'announcement':
    case 'event':
    case 'event_reminder':
    case 'event_update':
    case 'event_cancelled':
      navigation.navigate('Tabs', { screen: 'Opportunities' });
      break;
    case 'new_message':
    case 'message':
      reference_link
        ? navigation.navigate('ChatDetail', {
            participantId: contentId,
            participantName: notification.sender_display_name,
            participantPicture: notification.sender_profile_picture || null,
            participantUsername: notification.sender_username,
          })
        : navigation.navigate('Conversations');
      break;
    case 'account_approved':
      navigation.navigate('Tabs', { screen: 'Profile' });
      break;
    case 'account_rejected':
      Alert.alert('Account Rejected', notification.message || 'Your account registration was not approved.', [{ text: 'OK' }]);
      break;
    default:
      if (!reference_link) break;
      if (reference_link.includes('/opportunities/')) navigation.navigate('OpportunityDetail', { id: contentId });
      else if (reference_link.includes('/events/')) navigation.navigate('EventDetail', { id: contentId });
      else if (reference_link.includes('/announcements/')) navigation.navigate('AnnouncementDetail', { id: contentId });
      else if (reference_link.includes('/profile/')) navigation.navigate('AlumniPublicProfile', { userId: contentId });
      else if (reference_link.includes('/chat/'))
        navigation.navigate('ChatDetail', {
          participantId: contentId,
          participantName: notification.sender_display_name,
          participantPicture: notification.sender_profile_picture || null,
          participantUsername: notification.sender_username,
        });
      break;
  }
};

// ─── HTML Preview ─────────────────────────────────────────────────────────────
function NotificationHtmlPreview({ html, isUnread }) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = windowWidth - 160;

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
    <View style={{ maxHeight: 38, overflow: 'hidden' }}>
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

// ─── Notification Item ────────────────────────────────────────────────────────
// Uses a local `read` state for instant optimistic UI — no waiting for API.
function NotificationItem({ item, onMarkRead, onDelete, navigation }) {
  const cfg = getTypeConfig(item.type);
  // Local optimistic read state — starts from server value
  const [localRead, setLocalRead] = useState(item.is_read);
  const isUnread = !localRead;

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const readingRef = useRef(false); // prevent duplicate API calls

  const handlePress = () => {
    // Immediately flip to read — no loading, no wait
    if (isUnread && !readingRef.current) {
      readingRef.current = true;
      setLocalRead(true);          // optimistic local update
      onMarkRead(item.id);          // fire-and-forget API call
    }
    handleNotificationPress(item, navigation);
  };

  const animateOut = (cb) => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 400, duration: 260, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(cb);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => animateOut(() => onDelete(item.id)),
        },
      ]
    );
  };

  return (
    <Animated.View style={{ transform: [{ translateX }], opacity }}>
      <TouchableOpacity
        style={[styles.item, isUnread && styles.itemUnread]}
        onPress={handlePress}
        onLongPress={confirmDelete}
        activeOpacity={0.78}
        delayLongPress={450}
      >
        {/* Left accent bar */}
        {isUnread && <View style={[styles.unreadBar, { backgroundColor: cfg.color }]} />}

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <NotificationHtmlPreview html={item.message} isUnread={isUnread} />
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        {/* Right column */}
        <View style={styles.rightCol}>
          {isUnread && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
          <TouchableOpacity
            onPress={confirmDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={15} color={C.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ title, count }) {
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
function EmptyState({ filter }) {
  const messages = {
    unread: { icon: 'checkmark-done-circle-outline', title: 'Nothing unread', sub: 'You\'re all caught up. Check back later.' },
    read: { icon: 'mail-open-outline', title: 'No read notifications', sub: 'Notifications you\'ve opened will appear here.' },
    all: { icon: 'notifications-off-outline', title: 'All caught up!', sub: 'No notifications right now. We\'ll ping you when something arrives.' },
  };
  const m = messages[filter] || messages.all;

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={m.icon} size={40} color={C.muted} />
      </View>
      <Text style={styles.emptyTitle}>{m.title}</Text>
      <Text style={styles.emptyMessage}>{m.sub}</Text>
    </View>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onPress, badge }) {
  return (
    <TouchableOpacity
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
      {badge > 0 && (
        <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
          <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const markingAllRef = useRef(false);

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

  // Fire-and-forget: UI already updated optimistically inside the item
  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      // Sync server state without causing a re-render flicker
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      // Silently revert if needed — re-fetch to be safe
      fetchNotes(filter);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAllRef.current) return;
    const unread = notifications.filter(n => !n.is_read);
    if (!unread.length) return;

    // Optimistic: flip all to read immediately
    markingAllRef.current = true;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    try {
      await Promise.all(unread.map(n => markNotificationRead(n.id)));
    } catch {
      Alert.alert('Error', 'Could not mark all as read');
      fetchNotes(filter);
    } finally {
      markingAllRef.current = false;
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
      'Clear All',
      'This will permanently remove all your notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]); // optimistic clear
            try {
              await clearAllNotifications();
            } catch {
              Alert.alert('Error', 'Could not clear notifications');
              fetchNotes(filter);
            }
          },
        },
      ]
    );
  };

  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = totalCount - unreadCount;

  const FILTERS = [
    { key: 'all', label: 'All', badge: totalCount },
    { key: 'unread', label: 'Unread', badge: unreadCount },
    { key: 'read', label: 'Read', badge: readCount },
  ];

  // Split into sections for "all" view
  const unreadItems = notifications.filter(n => !n.is_read);
  const readItems = notifications.filter(n => n.is_read);

  const renderSectionedList = () => {
    if (filter !== 'all') {
      return (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          ListEmptyComponent={<EmptyState filter={filter} />}
          ListHeaderComponent={
            notifications.length > 0
              ? <SectionLabel title={filter === 'unread' ? 'Unread' : 'Read'} count={notifications.length} />
              : null
          }
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              navigation={navigation}
            />
          )}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />
          }
        />
      );
    }

    // Sectioned list: unread on top, read below
    const sections = [];
    if (unreadItems.length > 0) {
      sections.push({ type: 'header', id: 'h_unread', title: 'New', count: unreadItems.length });
      unreadItems.forEach(n => sections.push({ type: 'item', id: String(n.id), data: n }));
    }
    if (readItems.length > 0) {
      sections.push({ type: 'header', id: 'h_read', title: 'Earlier', count: 0 });
      readItems.forEach(n => sections.push({ type: 'item', id: String(n.id), data: n }));
    }

    return (
      <FlatList
        data={sections.length > 0 ? sections : [{ type: 'empty', id: 'empty' }]}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          if (item.type === 'header') return <SectionLabel title={item.title} count={item.count} />;
          if (item.type === 'empty') return <EmptyState filter="all" />;
          return (
            <NotificationItem
              item={item.data}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              navigation={navigation}
            />
          );
        }}
        contentContainerStyle={sections.length === 0 ? styles.emptyList : styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={({ leadingItem }) =>
          leadingItem?.type === 'header' ? null : <View style={{ height: 8 }} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* ── Header ── */}
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
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerActionBtn} activeOpacity={0.7}>
              <Ionicons name="checkmark-done-outline" size={18} color={C.primary} />
              <Text style={styles.headerActionText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={[styles.headerActionBtn, styles.headerActionBtnDanger]} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={C.coral} />
            </TouchableOpacity>
          )}
        </View>
      </View>

    

      {/* ── Filter tabs ── */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <FilterPill
            key={f.key}
            label={f.label}
            active={filter === f.key}
            badge={f.badge}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      ) : (
        renderSectionedList()
      )}

      {/* ── Hint bar ── */}
      {!loading && notifications.length > 0 && (
        <View style={styles.hintBar}>
          <Ionicons name="hand-left-outline" size={12} color={C.muted} />
          <Text style={styles.hintText}>Long-press any notification to delete it</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  // Header
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
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingHorizontal: 6,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primarySoft,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  headerActionBtnDanger: {
    backgroundColor: C.coralSoft,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
  },
  headerActionText: { fontSize: 12, fontWeight: '600', color: C.primary },

  // Stats strip
  statsStrip: {
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statsText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  statsNum: { fontWeight: '700', color: C.text },

  // Filters
  filterRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterPillActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primaryBorder,
  },
  filterPillText: { fontSize: 13, fontWeight: '600', color: C.muted },
  filterPillTextActive: { color: C.primary },
  pillBadge: {
    backgroundColor: C.border,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pillBadgeActive: { backgroundColor: C.primaryBorder },
  pillBadgeText: { fontSize: 10, fontWeight: '700', color: C.subtext },
  pillBadgeTextActive: { color: C.primary },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionBadge: {
    backgroundColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: C.subtext },

  // Notification item
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
  itemContent: { flex: 1, gap: 6 },
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

  // States
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.muted },
  listContent: { padding: 16 },
  emptyList: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: C.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  emptyMessage: { fontSize: 13.5, color: C.subtext, textAlign: 'center', lineHeight: 20 },

  // Hint bar
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