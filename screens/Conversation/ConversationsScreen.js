/**
 * ConversationsScreen.js
 *
 * Chat inbox — merges connections + conversations.
 * Correct unread logic: only messages WHERE senderId !== currentUserId count.
 * Polish: animated rows, online dots, stats strip, section labels, search.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import {
  getAlumniConnections,
  getConversations,
  getStudentConnections,
  markConversationAsRead,
  getPartnerConnections,   // ← add this
} from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primarySoft: '#EEF2FF',
  bg: '#F0F2F8',
  card: '#FFFFFF',
  text: '#0F0F23',
  subtext: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  green: '#10B981',
  unreadBg: '#F5F4FF',
  danger: '#EF4444',
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const formatTime = iso => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const isThisWeek = now - date < 7 * 24 * 60 * 60 * 1000;
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isThisWeek) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// ─── Avatar palette ───────────────────────────────────────────────────────────
const PALETTES = [
  { bg: '#EEF2FF', text: '#4F46E5' },
  { bg: '#D1FAE5', text: '#059669' },
  { bg: '#DBEAFE', text: '#2563EB' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#F3E8FF', text: '#7C3AED' },
];
const palette = name => PALETTES[(name?.charCodeAt(0) || 0) % PALETTES.length];

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({ uri, name, size = 52, online = false }) {
  const p = palette(name);
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[av.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: p.bg }]}>
          <Text style={[av.text, { fontSize: size * 0.34, color: p.text }]}>{initials(name)}</Text>
        </View>
      )}
      {online && (
        <View style={[
          av.dot,
          { width: size * 0.27, height: size * 0.27, borderRadius: size * 0.135 },
        ]} />
      )}
    </View>
  );
}
const av = StyleSheet.create({
  fallback: { justifyContent: 'center', alignItems: 'center' },
  text: { fontWeight: '800' },
  dot: { position: 'absolute', bottom: 1, right: 1, backgroundColor: C.green, borderWidth: 2.5, borderColor: C.card },
});

// ─── Conversation row ─────────────────────────────────────────────────────────
function ConvRow({ item, index, onPress, currentUserId }) {
  const lastMsg = item.lastMessage || null;

  /*
    Unread = message exists + not read + sender is the OTHER person.
    Without the senderId check, your own outgoing messages show as unread
    until the recipient opens them — which looks wrong on the sender's side.
  */
  const isUnread =
    lastMsg !== null &&
    lastMsg.isRead === false &&
    lastMsg.senderId !== currentUserId;

  const isImage = lastMsg?.messageType === 'image';

  // Stagger-in animation
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, delay: index * 35, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, delay: index * 35, useNativeDriver: true }),
    ]).start();
  }, [])();

  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity
        style={[row.wrap, isUnread && row.unreadWrap]}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
        activeOpacity={1}
      >
        {/* Unread accent bar */}
        {isUnread && <View style={row.accentBar} />}

        <Avatar
          uri={item.profile_picture || null}
          name={item.display_name || item.username}
          size={52}
          online={item.is_online === true}
        />

        <View style={row.body}>
          {/* Top line: name + time */}
          <View style={row.topLine}>
            <Text style={[row.name, isUnread && row.nameUnread]} numberOfLines={1}>
              {item.display_name || item.username || 'User'}
            </Text>
            {lastMsg && (
              <Text style={[row.time, isUnread && row.timeUnread]}>
                {formatTime(lastMsg.createdAt)}
              </Text>
            )}
          </View>

          {/* Username handle */}
          {item.username ? (
            <Text style={row.handle}>@{item.username}</Text>
          ) : null}

          {/* Preview line + unread dot */}
          <View style={row.bottomLine}>
            <Text style={[row.preview, isUnread && row.previewUnread]} numberOfLines={1}>
              {lastMsg
                ? isImage
                  ? '📷  Image'
                  : lastMsg.content
                : 'Tap to start a conversation'}
            </Text>
            {isUnread && (
              <View style={row.badge}>
                <View style={row.badgeDot} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const row = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 14, gap: 12, position: 'relative' },
  unreadWrap: { backgroundColor: C.unreadBg },
  accentBar: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3.5, borderRadius: 2, backgroundColor: C.primary },
  body: { flex: 1 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 },
  name: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '800' },
  time: { fontSize: 11, color: C.muted },
  timeUnread: { color: C.primary, fontWeight: '700' },
  handle: { fontSize: 11, color: C.muted, marginBottom: 3 },
  bottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { fontSize: 13, color: C.muted, flex: 1, marginRight: 8 },
  previewUnread: { color: C.subtext, fontWeight: '600' },
  badge: { justifyContent: 'center', alignItems: 'center' },
  badgeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
});

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[srch.wrap, focused && srch.focused]}>
      <Ionicons name="search-outline" size={16} color={focused ? C.primary : C.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search connections…"
        placeholderTextColor={C.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={srch.input}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={16} color={C.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}
const srch = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, marginHorizontal: 16, marginVertical: 10 },
  focused: { borderColor: C.primary, backgroundColor: '#F5F4FF' },
  input: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 0 },
});

// ─── Stats strip ──────────────────────────────────────────────────────────────
function StatsStrip({ total, unreadCount }) {
  if (total === 0) return null;
  return (
    <View style={st.wrap}>
      <View style={st.cell}>
        <Ionicons name="people-outline" size={14} color={C.muted} />
        <Text style={st.val}>{total}</Text>
        <Text style={st.lbl}>Connections</Text>
      </View>
      <View style={st.sep} />
      <View style={st.cell}>
        <Ionicons
          name="chatbubble-outline"
          size={14}
          color={unreadCount > 0 ? C.primary : C.muted}
        />
        <Text style={[st.val, { color: unreadCount > 0 ? C.primary : C.text }]}>
          {unreadCount}
        </Text>
        <Text style={st.lbl}>Unread</Text>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, gap: 20 },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  val: { fontSize: 14, fontWeight: '800', color: C.text },
  lbl: { fontSize: 12, color: C.muted, fontWeight: '500' },
  sep: { width: 1, backgroundColor: C.border, marginVertical: 2 },
});

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <View style={sl.wrap}>
      <View style={sl.line} />
      <Text style={sl.text}>{label}</Text>
      <View style={sl.line} />
    </View>
  );
}
const sl = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  line: { flex: 1, height: 1, backgroundColor: C.divider },
  text: { fontSize: 10, fontWeight: '700', color: C.muted, marginHorizontal: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ isSearch }) {
  return (
    <View style={em.wrap}>
      <View style={em.iconWrap}>
        <Ionicons
          name={isSearch ? 'search-outline' : 'chatbubbles-outline'}
          size={38}
          color={C.primary}
        />
      </View>
      <Text style={em.title}>{isSearch ? 'No results' : 'No conversations yet'}</Text>
      <Text style={em.sub}>
        {isSearch
          ? 'Try a different name or username.'
          : 'Connect with alumni or students to start messaging.'}
      </Text>
    </View>
  );
}
const em = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 36 },
  iconWrap: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 21 },
});

const Separator = ({ leadingItem }) =>
  leadingItem?.__type === 'row'
    ? <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 80 }} />
    : null;

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ConversationsScreen() {
  const navigation = useNavigation();
  const { userData } = useContext(AuthContext);

  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Choose the right connections endpoint based on role
      let connectionsCall;
      if (userData?.role === 'student') {
        connectionsCall = getStudentConnections();
      } else if (userData?.role === 'partner') {
        connectionsCall = getPartnerConnections();   // dedicated partner endpoint
      } else {
        // alumni (default)
        connectionsCall = getAlumniConnections();
      }

      const [connectionsRes, conversationsRes] = await Promise.all([
        connectionsCall,
        getConversations(),
      ]);

      const connections = connectionsRes.data || [];
      const conversations = conversationsRes.data || [];

      // Build lookup: participantId → lastMessage
      const convoMap = {};
      conversations.forEach(c => {
        const pid = c.participantProfile?.id;
        if (pid) convoMap[pid] = c.lastMessage || null;
      });

      const merged = connections.map(conn => ({
        ...conn,
        lastMessage: convoMap[conn.id] || null,
      }));

      // Sort: active chats first, then silent connections alphabetically
      merged.sort((a, b) => {
        const aT = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : null;
        const bT = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : null;
        if (aT && bT) return bT - aT;
        if (aT && !bT) return -1;
        if (!aT && bT) return 1;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

      setListData(merged);
    } catch (err) {
      console.error('fetchData:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleOpen = (item) => {
    navigation.navigate('ChatDetail', {
      participantId: item.id,
      participantName: item.display_name || item.username,
      participantPicture: item.profile_picture || null,
      participantUsername: item.username,
    });

    // Optimistically clear unread badge if sender was the other person
    const lm = item.lastMessage;
    if (lm && lm.isRead === false && lm.senderId !== userData?.id) {
      markConversationAsRead(item.id).catch(err =>
        console.error('markConversationAsRead:', err?.response?.data || err.message)
      );
    }
  };

  // ─── Filtered list ──────────────────────────────────────────────────────
  const filtered = search.trim()
    ? listData.filter(c => {
      const q = search.toLowerCase();
      return (
        c.display_name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
      );
    })
    : listData;

  // Unread count — only messages from the other person
  const unreadCount = listData.filter(
    c => c.lastMessage?.isRead === false && c.lastMessage?.senderId !== userData?.id
  ).length;

  // Sectioned data: "Recent" (has messages) | "Connections" (no messages)
  const withMessages = filtered.filter(c => c.lastMessage !== null);
  const withoutMessages = filtered.filter(c => c.lastMessage === null);

  const sectionedData = [];
  if (withMessages.length > 0) {
    sectionedData.push({ __type: 'section', label: 'Recent' });
    withMessages.forEach(c => sectionedData.push({ __type: 'row', ...c }));
  }
  if (withoutMessages.length > 0) {
    sectionedData.push({ __type: 'section', label: 'Connections' });
    withoutMessages.forEach(c => sectionedData.push({ __type: 'row', ...c }));
  }

  const renderItem = ({ item, index }) => {
    if (item.__type === 'section') return <SectionLabel label={item.label} />;
    return (
      <ConvRow
        item={item}
        index={index}
        currentUserId={userData?.id}
        onPress={() => handleOpen(item)}
      />
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* Header strip */}
      <View style={s.header}>
        <SearchBar value={search} onChange={setSearch} />
      </View>

      <StatsStrip total={listData.length} unreadCount={unreadCount} />

      <FlatList
        data={sectionedData}
        keyExtractor={(item, idx) =>
          item.__type === 'section' ? `sec-${item.label}` : String(item.id ?? idx)
        }
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={<EmptyState isSearch={search.trim().length > 0} />}
        contentContainerStyle={[s.list, filtered.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flexGrow: 1, backgroundColor: C.bg, paddingBottom: 32 },
  header: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 4 },
});