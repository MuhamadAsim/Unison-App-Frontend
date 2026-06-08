import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import api from '../../services/api';

// We fetch announcement detail from GET /api/admin/announcements/:id
const getAnnouncementById = (id) => api.get(`/admin/announcements/${id}`);

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:       '#534AB7',
  primarySoft:   '#EEEDFE',
  primaryBorder: '#C4BFEF',
  bg:            '#F4F4F8',
  card:          '#FFFFFF',
  divider:       '#F3F4F6',
  text:          '#111827',
  subtext:       '#374151',
  muted:         '#9CA3AF',
  border:        '#E5E7EB',
  borderLight:   '#F3F4F6',
  orange:        '#EA580C',
  orangeSoft:    '#FFEDD5',
  orangeBorder:  '#FDBA74',
  teal:          '#0D9488',
  tealSoft:      '#CCFBF1',
  tealBorder:    '#99F6E4',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = d => {
  if (!d) return null;
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// ─── HTML Styles for description ──────────────────────────────────────────────
const htmlTagsStyles = {
  body:   { color: C.subtext, fontSize: 15, lineHeight: 24 },
  p:      { color: C.subtext, fontSize: 15, lineHeight: 24, marginTop: 0, marginBottom: 8 },
  span:   { color: C.subtext, fontSize: 15 },
  strong: { color: C.text, fontWeight: '700' },
  b:      { color: C.text, fontWeight: '700' },
  em:     { fontStyle: 'italic' },
  i:      { fontStyle: 'italic' },
  ul:     { marginLeft: 4, marginTop: 0, marginBottom: 8 },
  ol:     { marginLeft: 4, marginTop: 0, marginBottom: 8 },
  li:     { fontSize: 15, lineHeight: 24, color: C.subtext },
  a:      { color: C.primary, textDecorationLine: 'underline' },
  h1:     { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 8, marginTop: 0 },
  h2:     { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 6, marginTop: 0 },
  h3:     { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 5, marginTop: 0 },
};

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <View style={sec.card}>
      <View style={sec.header}>
        <View style={sec.iconWrap}>
          <Ionicons name={icon} size={16} color={C.orange} />
        </View>
        <Text style={sec.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.orangeSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: C.text },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AnnouncementDetailScreen({ route, navigation }) {
  const { id, item: passedItem } = route.params;
  const { width } = useWindowDimensions();

  // If the feed already passed the full item, use it immediately
  // and still re-fetch in the background for the richest data
  const [announcement, setAnnouncement] = useState(passedItem || null);
  const [loading, setLoading] = useState(!passedItem);

  const fetchDetail = async () => {
    try {
      if (!passedItem) setLoading(true);
      const res = await getAnnouncementById(id);
      setAnnouncement(res.data);
    } catch {
      // If the admin endpoint fails (non-admin user), keep the passed item
      if (!announcement) Alert.alert('Error', 'Failed to load announcement details.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDetail(); }, [id]));

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Announcement</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.orange} />
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!announcement) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Announcement</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <Ionicons name="megaphone-outline" size={48} color={C.orange} />
          <Text style={s.emptyTitle}>Not found</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchDetail}>
            <Text style={s.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const eventDate = announcement.event_date;
  const author = announcement.author || announcement.created_by_admin;
  const authorName = author?.display_name || author?.name || 'UNISON Administration';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Announcement</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Media ───────────────────────────────────────────────────────── */}
        {announcement.media_url && announcement.media_type === 'image' && (
          <View style={s.mediaWrap}>
            <Image
              source={{ uri: announcement.media_url }}
              style={s.media}
              resizeMode="cover"
            />
          </View>
        )}

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <View style={s.hero}>
          {/* Orange left accent */}
          <View style={s.accentBar} />
          <View style={s.heroBody}>
            <View style={s.typeBadge}>
              <Ionicons name="megaphone-outline" size={12} color={C.orange} />
              <Text style={s.typeBadgeText}>Official Announcement</Text>
            </View>
            <Text style={s.heroTitle}>{announcement.title}</Text>
            <Text style={s.heroDate}>
              Posted {formatDate(announcement.created_at)}
            </Text>
          </View>
        </View>

        {/* ── Event date (if announcement has a linked event date) ─────────── */}
        {eventDate && (
          <Section icon="calendar-outline" title="Event Date">
            <View style={s.eventDateRow}>
              <View style={s.eventDateIcon}>
                <Ionicons name="calendar" size={22} color={C.orange} />
              </View>
              <View>
                <Text style={s.eventDateText}>{formatDate(eventDate)}</Text>
                <Text style={s.eventTimeText}>{formatTime(eventDate)}</Text>
              </View>
            </View>
          </Section>
        )}

        {/* ── Description (HTML) ──────────────────────────────────────────── */}
        {announcement.description && announcement.description.trim() !== '' && (
          <Section icon="document-text-outline" title="Details">
            <RenderHtml
              contentWidth={width - 32} // Section padding: 16 left + 16 right = 32
              source={{ html: announcement.description }}
              tagsStyles={htmlTagsStyles}
              enableExperimentalBRCollapsing
              enableExperimentalGhostLinesPrevention
            />
          </Section>
        )}

        {/* ── From ────────────────────────────────────────────────────────── */}
        <Section icon="shield-checkmark-outline" title="From">
          <View style={s.fromRow}>
            <View style={s.adminAvatar}>
              <Ionicons name="shield-checkmark" size={22} color={C.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.adminName}>{authorName}</Text>
              <Text style={s.adminRole}>Official · UNISON Platform</Text>
            </View>
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={C.orange} />
              <Text style={s.verifiedText}>Official</Text>
            </View>
          </View>
        </Section>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 46 : 28,
    paddingBottom: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBtn: { padding: 6, width: 38, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.muted },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.subtext },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: C.orangeSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.orangeBorder,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: C.orange },

  // Media
  mediaWrap: { borderRadius: 16, overflow: 'hidden' },
  media: { width: '100%', height: 220 },

  // Hero
  hero: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: { width: 5, backgroundColor: C.orange },
  heroBody: { flex: 1, padding: 16, gap: 8 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: C.orangeSoft,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.orangeBorder,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: C.orange },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5, lineHeight: 28 },
  heroDate: { fontSize: 12, color: C.muted, fontWeight: '500' },

  // Event date block
  eventDateRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  eventDateIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.orangeSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.orangeBorder,
  },
  eventDateText: { fontSize: 16, fontWeight: '700', color: C.text },
  eventTimeText: { fontSize: 13, color: C.muted, marginTop: 2 },

  // Body
  bodyText: { fontSize: 15, color: C.subtext, lineHeight: 24 }, // kept for possible future use

  // From / admin
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.orangeSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.orangeBorder,
  },
  adminName: { fontSize: 15, fontWeight: '700', color: C.text },
  adminRole: { fontSize: 12, color: C.muted, marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.orangeSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.orangeBorder,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: C.orange },
});