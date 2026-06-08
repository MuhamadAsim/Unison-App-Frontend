import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { AuthContext } from '../../context/AuthContext';
import {
  connectUser,
  getConversations,
  getMyOpportunities,
  getNotifications,
  getOpportunities,
  getSuggestions,
  getFeed,
} from '../../services/api';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  primary: '#534AB7',
  primarySoft: '#EEEDFE',
  primaryBorder: '#C7D2FE',
  bg: '#F4F4F8',
  card: '#FFFFFF',
  text: '#1A1A2E',
  subtext: '#6B7280',
  muted: '#9CA3AF',
  border: '#E8E8F0',
  divider: '#F3F4F6',
  green: '#10B981', greenSoft: '#D1FAE5',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  amber: '#D97706', amberSoft: '#FEF3C7',
  coral: '#DC2626', coralSoft: '#FEE2E2',
  purple: '#7C3AED', purpleSoft: '#EDE9FE',
  teal: '#0D9488', tealSoft: '#CCFBF1', tealBorder: '#99F6E4',
  orange: '#EA580C', orangeSoft: '#FFEDD5', orangeBorder: '#FDBA74',
  coralBorder: '#FCA5A5',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const avatarColor = (name = '') => {
  const colors = [C.primary, C.purple, C.blue, C.green, C.amber];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

const getTypeMeta = (type = '') => {
  const TYPE_META = {
    job: { label: 'Job', color: C.green, bg: C.greenSoft, icon: 'briefcase' },
    internship: { label: 'Internship', color: C.amber, bg: C.amberSoft, icon: 'school' },
    freelance: { label: 'Freelance', color: C.purple, bg: C.purpleSoft, icon: 'laptop-outline' },
    'full-time': { label: 'Full-time', color: C.green, bg: C.greenSoft, icon: 'briefcase' },
    'part-time': { label: 'Part-time', color: C.blue, bg: C.blueSoft, icon: 'time-outline' },
    opportunity: { label: 'Opportunity', color: C.green, bg: C.greenSoft, icon: 'briefcase' },
  };
  return TYPE_META[type?.toLowerCase()] ?? { label: type || 'Other', color: C.muted, bg: C.divider, icon: 'briefcase-outline' };
};

const EVENT_TYPE_COLORS = {
  reunion:    { color: C.teal,    bg: C.tealSoft    },
  webinar:    { color: C.primary, bg: C.primarySoft },
  workshop:   { color: C.blue,    bg: C.blueSoft    },
  networking: { color: C.purple,  bg: C.purpleSoft  },
  other:      { color: C.muted,   bg: C.divider     },
};
const getEventMeta = (type = '') =>
  EVENT_TYPE_COLORS[type?.toLowerCase()] ?? EVENT_TYPE_COLORS.other;

const daysUntil = (deadline) => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
};

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateTime = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const relativeTime = iso => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const isExpired = deadline => !!deadline && new Date(deadline) < new Date();
const isPastDate = date => !!date && new Date(date) < new Date();

// ─── Mini Avatar ──────────────────────────────────────────────────────────────
function MiniAvatar({ name = '', uri, size = 28 }) {
  const [err, setErr] = useState(false);
  if (uri && !err) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.border }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: avatarColor(name),
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: '#fff' }}>
        {initials(name)}
      </Text>
    </View>
  );
}

// ─── Full Avatar ──────────────────────────────────────────────────────────────
function Avatar({ uri, name, size = 40, fontSize = 15 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <View style={{
          flex: 1, borderRadius: size / 2,
          backgroundColor: avatarColor(name),
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize }}>{initials(name)}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Deadline Badge ───────────────────────────────────────────────────────────
function DeadlineBadge({ deadline }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  let color, bg, label;
  if (days < 0) { color = C.muted; bg = C.divider; label = 'Closed'; }
  else if (days <= 3) { color = C.coral; bg = C.coralSoft; label = `${days}d left`; }
  else if (days <= 7) { color = C.amber; bg = C.amberSoft; label = `${days}d left`; }
  else { color = C.green; bg = C.greenSoft; label = formatDate(deadline); }
  return (
    <View style={[db.badge, { backgroundColor: bg }]}>
      <Ionicons name="time-outline" size={11} color={color} />
      <Text style={[db.text, { color }]}>{label}</Text>
    </View>
  );
}
const db = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─── Author Row ───────────────────────────────────────────────────────────────
function AuthorRow({ author, postedAt, fallbackName }) {
  const name = author?.display_name || author?.username || fallbackName || 'Alumni';
  const pic  = author?.profile_picture || null;
  return (
    <View style={ar.wrap}>
      <MiniAvatar uri={pic} name={name} size={28} />
      <View style={ar.meta}>
        <Text style={ar.name}>{name}</Text>
        <Text style={ar.time}>{relativeTime(postedAt)}</Text>
      </View>
    </View>
  );
}
const ar = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700', color: C.text },
  time: { fontSize: 11, color: C.muted, marginTop: 1 },
});

// ─── Type Pill ────────────────────────────────────────────────────────────────
function TypePill({ label, color, bg, icon }) {
  return (
    <View style={[tp.pill, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={11} color={color} />}
      <Text style={[tp.text, { color }]}>{label}</Text>
    </View>
  );
}
const tp = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─── Skill Chip ───────────────────────────────────────────────────────────────
function SkillChip({ label }) {
  return (
    <View style={sc.wrap}>
      <Text style={sc.text}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  wrap: { backgroundColor: C.bg, borderRadius: 6, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginTop: 4 },
  text: { fontSize: 11, color: C.subtext, fontWeight: '500' },
});

// ─── HTML Preview (renders HTML description, truncated for card previews) ─────
// Used in cards where description comes from a rich-text editor (HTML tags).
// maxLines controls visual truncation via a clipping View.
function HtmlPreview({ html, color = C.subtext }) {
  const { width } = useWindowDimensions();
  // Card body padding is 14 on each side, section padding 16 — subtract both
  const contentWidth = width - 32 - 28;

  if (!html || html.trim() === '' || html === '<p></p>' || html === '<p><br></p>') return null;

  const tagsStyles = {
    body: { color, fontSize: 13, lineHeight: 19 },
    p:    { color, fontSize: 13, lineHeight: 19, marginTop: 0, marginBottom: 4 },
    span: { color, fontSize: 13 },
    strong: { color, fontWeight: '700' },
    em:   { color, fontStyle: 'italic' },
    ul:   { color, marginLeft: 4, marginTop: 0, marginBottom: 4 },
    ol:   { color, marginLeft: 4, marginTop: 0, marginBottom: 4 },
    li:   { color, fontSize: 13, lineHeight: 19 },
    a:    { color: C.primary },
    h1:   { color, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    h2:   { color, fontSize: 14, fontWeight: '700', marginBottom: 4 },
    h3:   { color, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  };

  return (
    // Clip to ~3 lines (19px line-height × 3 = 57px) with overflow hidden
    <View style={{ maxHeight: 62, overflow: 'hidden' }}>
      <RenderHtml
        contentWidth={contentWidth}
        source={{ html }}
        tagsStyles={tagsStyles}
        enableExperimentalBRCollapsing
        enableExperimentalGhostLinesPrevention
        // Don't render images inside description previews
        ignoredDomTags={['img', 'figure', 'video', 'iframe']}
        defaultTextProps={{ numberOfLines: 3, ellipsizeMode: 'tail' }}
      />
    </View>
  );
}

// ─── Shared Card Styles (identical to OpportunitiesScreen) ───────────────────
const card = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    marginBottom: 14,          // home screen uses marginBottom like original
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  wrapDim: { opacity: 0.65 },

  // Compact = used in the "Your Posts" horizontal carousel (unchanged)
  wrapCompact: {
    width: 280,
    marginBottom: 0,
    marginRight: 14,
  },

  feedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 10,
  },
  feedBadgeText: { fontSize: 11, fontWeight: '700' },

  announcementAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: C.orange,
  },

  media: { width: '100%', height: 130 },
  mediaWrap: { position: 'relative' },

  dateBubble: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBubbleMonth: { fontSize: 9, fontWeight: '700', color: C.teal, letterSpacing: 0.5 },
  dateBubbleDay: { fontSize: 18, fontWeight: '800', color: C.text, lineHeight: 20 },

  pastOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pastOverlayText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  body: { padding: 14, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  title: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 24 },
  titleDim: { color: C.muted },
  desc: { fontSize: 13, color: C.subtext, lineHeight: 19 },

  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.muted, maxWidth: 150 },

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },

  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: C.divider, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  attendeeText: { fontSize: 11, color: C.muted, fontWeight: '500' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  viewText: { fontSize: 12, color: C.primary, fontWeight: '700' },

  rsvpChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.tealSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  rsvpChipPast: { backgroundColor: C.divider },
  rsvpText: { fontSize: 12, fontWeight: '700', color: C.teal },
  rsvpTextPast: { color: C.muted },

  readChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.orangeSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  readText: { fontSize: 12, fontWeight: '700', color: C.orange },

  annoDate: { fontSize: 11, color: C.muted, fontWeight: '500' },
});

// ─── Opportunity Card (feed style, matching OpportunitiesScreen) ──────────────
function OpportunityCard({ item, onPress, compact = false }) {
  const oppType = item.opportunity_type || item.type;
  // For the feed "opportunity" type, resolve to sub-type (job/internship/etc) if available
  const meta    = getTypeMeta(item.sub_type || oppType);
  const company = item.company_name || item.company;
  const mediaUri = item.media_url || item.media?.[0];
  const closed  = isExpired(item.deadline);
  const author  = item.author || item.posted_by;

  const skills     = item.required_skills?.slice(0, 3) || [];
  const extraSkills = (item.required_skills?.length || 0) - 3;

  return (
    <TouchableOpacity
      style={[card.wrap, closed && card.wrapDim, compact && card.wrapCompact]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Feed type badge */}
      <View style={card.feedBadge}>
        <Ionicons name="briefcase-outline" size={11} color={C.primary} />
        <Text style={[card.feedBadgeText, { color: C.primary }]}>Opportunity</Text>
      </View>

      {mediaUri && !closed && !compact && (
        <Image source={{ uri: mediaUri }} style={card.media} resizeMode="cover" />
      )}

      <View style={[card.body, compact && { padding: 12, gap: 6 }]}>
        <View style={card.headerRow}>
          <AuthorRow author={author} postedAt={item.posted_at || item.created_at} />
          <TypePill label={meta.label} color={meta.color} bg={meta.bg} icon={meta.icon} />
        </View>

        <Text style={[card.title, closed && card.titleDim]} numberOfLines={2}>{item.title}</Text>

        <View style={card.metaRow}>
          {company ? (
            <View style={card.metaItem}>
              <Ionicons name="business-outline" size={13} color={C.muted} />
              <Text style={card.metaText} numberOfLines={1}>{company}</Text>
            </View>
          ) : null}
          {(item.location || item.is_remote) ? (
            <View style={card.metaItem}>
              <Ionicons name="location-outline" size={13} color={C.muted} />
              <Text style={card.metaText}>
                {item.location || ''}{item.location && item.is_remote ? ' · ' : ''}{item.is_remote ? 'Remote' : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Description from rich-text editor — render HTML, skip in compact carousel */}
        {item.description && !compact ? (
          <HtmlPreview html={item.description} />
        ) : null}

        {skills.length > 0 && !compact && (
          <View style={card.skillsRow}>
            {skills.map((s, i) => <SkillChip key={i} label={s} />)}
            {extraSkills > 0 && (
              <View style={[sc.wrap, { backgroundColor: C.primarySoft, borderColor: C.primaryBorder }]}>
                <Text style={[sc.text, { color: C.primary }]}>+{extraSkills}</Text>
              </View>
            )}
          </View>
        )}

        <View style={card.footer}>
          <DeadlineBadge deadline={item.deadline} />
          {!closed && <Text style={card.viewText}>View details →</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Compact Opportunity Card (for "Your Posts" carousel — unchanged style) ───
function CompactOpportunityCard({ item, onPress, displayName, profilePic }) {
  const meta = getTypeMeta(item.type);
  const days = daysUntil(item.deadline);
  const closed = days !== null && days < 0;
  const hasMedia = item.media?.length > 0;
  const posterName = displayName || item.posted_by?.display_name || item.posted_by?.username || 'Alumni';
  const posterPic = profilePic || item.posted_by?.profile_picture || null;

  return (
    <TouchableOpacity
      style={[compactCard.wrap]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {hasMedia && (
        <Image source={{ uri: item.media[0] }} style={compactCard.mediaStrip} resizeMode="cover" />
      )}

      <View style={compactCard.body}>
        <View style={compactCard.topRow}>
          <View style={[compactCard.typeBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[compactCard.typeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {item.is_remote && (
            <View style={compactCard.remoteBadge}>
              <Ionicons name="globe-outline" size={11} color={C.teal} />
              <Text style={compactCard.remoteText}>Remote</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <DeadlineBadge deadline={item.deadline} />
        </View>

        <Text style={[compactCard.title, closed && compactCard.titleClosed]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={compactCard.metaRow}>
          {(item.company_name || item.company) ? (
            <View style={compactCard.metaItem}>
              <Ionicons name="business-outline" size={13} color={C.muted} />
              <Text style={compactCard.metaText} numberOfLines={1}>
                {item.company_name || item.company}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={compactCard.divider} />

        <View style={compactCard.footer}>
          <View style={compactCard.postedBy}>
            <MiniAvatar name={posterName} uri={posterPic} size={24} />
            <Text style={compactCard.postedByText} numberOfLines={1}>{posterName}</Text>
          </View>
          <View style={[compactCard.viewBtn, closed && compactCard.viewBtnClosed]}>
            <Text style={[compactCard.viewText, closed && compactCard.viewTextClosed]}>
              {closed ? 'Closed' : 'View'}
            </Text>
            {!closed && <Ionicons name="arrow-forward" size={13} color={C.primary} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const compactCard = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 14,
    width: 280,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mediaStrip: { width: '100%', height: 130 },
  body: { padding: 14, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  typeText: { fontSize: 11, fontWeight: '700' },
  remoteBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.tealSoft },
  remoteText: { fontSize: 11, fontWeight: '700', color: C.teal },
  title: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 22 },
  titleClosed: { color: C.muted },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.muted, maxWidth: 140 },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postedBy: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  postedByText: { fontSize: 12, color: C.subtext, fontWeight: '600', maxWidth: 100 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  viewBtnClosed: { backgroundColor: C.divider },
  viewText: { fontSize: 12, fontWeight: '700', color: C.primary },
  viewTextClosed: { color: C.muted },
});

// ─── Event Card (matching OpportunitiesScreen) ────────────────────────────────
function EventCard({ item, onPress }) {
  const eventDate = item.event_date || item.date;
  const past      = isPastDate(eventDate);
  const meta      = getEventMeta(item.event_type || item.type);
  const author    = item.author || item.host || item.posted_by;
  const authorName = author?.display_name || author?.name || author?.username || 'Alumni';
  const isFull    = item.max_attendees && item.attendee_count >= item.max_attendees;
  const dateObj   = eventDate ? new Date(eventDate) : null;

  return (
    <TouchableOpacity style={[card.wrap, past && card.wrapDim]} onPress={onPress} activeOpacity={0.82}>
      <View style={[card.feedBadge, { backgroundColor: C.tealSoft }]}>
        <Ionicons name="calendar-outline" size={11} color={C.teal} />
        <Text style={[card.feedBadgeText, { color: C.teal }]}>Event</Text>
      </View>

      {item.media_url || item.banner_url ? (
        <View style={card.mediaWrap}>
          <Image source={{ uri: item.media_url || item.banner_url }} style={card.media} resizeMode="cover" />
          {dateObj && (
            <View style={card.dateBubble}>
              <Text style={card.dateBubbleMonth}>
                {dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
              </Text>
              <Text style={card.dateBubbleDay}>{dateObj.getDate()}</Text>
            </View>
          )}
          {past && (
            <View style={card.pastOverlay}>
              <Text style={card.pastOverlayText}>Past Event</Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={card.body}>
        <View style={card.headerRow}>
          <AuthorRow
            author={typeof author === 'object' ? author : null}
            postedAt={item.created_at}
            fallbackName={authorName}
          />
          <TypePill
            label={item.event_type
              ? item.event_type.charAt(0).toUpperCase() + item.event_type.slice(1)
              : 'Event'}
            color={meta.color}
            bg={meta.bg}
          />
        </View>

        <Text style={[card.title, past && card.titleDim]} numberOfLines={2}>{item.title}</Text>

        <View style={card.metaRow}>
          {item.location ? (
            <View style={card.metaItem}>
              <Ionicons name="location-outline" size={13} color={C.muted} />
              <Text style={card.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
          {eventDate ? (
            <View style={card.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={C.muted} />
              <Text style={card.metaText}>{formatDateTime(eventDate)}</Text>
            </View>
          ) : null}
        </View>

        {item.max_attendees && item.attendee_count !== undefined ? (
          <View style={card.attendeeRow}>
            <View style={card.progressTrack}>
              <View style={[card.progressFill, {
                width: `${Math.min((item.attendee_count / item.max_attendees) * 100, 100)}%`,
                backgroundColor: isFull ? C.coral : C.teal,
              }]} />
            </View>
            <Text style={card.attendeeText}>{item.attendee_count}/{item.max_attendees}</Text>
          </View>
        ) : item.attendee_count ? (
          <View style={card.metaItem}>
            <Ionicons name="people-outline" size={13} color={C.muted} />
            <Text style={card.metaText}>{item.attendee_count} attending</Text>
          </View>
        ) : null}

        <View style={card.footer}>
          <View />
          <View style={[card.rsvpChip, past && card.rsvpChipPast]}>
            <Text style={[card.rsvpText, past && card.rsvpTextPast]}>{past ? 'View' : 'RSVP'}</Text>
            <Ionicons name="arrow-forward" size={12} color={past ? C.muted : C.teal} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Announcement Card (matching OpportunitiesScreen) ─────────────────────────
function AnnouncementCard({ item, onPress }) {
  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.82}>
      <View style={card.announcementAccent} />

      {item.media_url && item.media_type === 'image' && (
        <Image source={{ uri: item.media_url }} style={card.media} resizeMode="cover" />
      )}

      <View style={card.body}>
        <View style={card.headerRow}>
          <View style={[card.feedBadge, { backgroundColor: C.orangeSoft }]}>
            <Ionicons name="megaphone-outline" size={11} color={C.orange} />
            <Text style={[card.feedBadgeText, { color: C.orange }]}>Announcement</Text>
          </View>
          <Text style={card.annoDate}>{formatDate(item.created_at)}</Text>
        </View>

        <Text style={card.title} numberOfLines={2}>{item.title}</Text>

        {/* description comes from a rich-text editor — render HTML, not raw text */}
        {item.description ? (
          <HtmlPreview html={item.description} />
        ) : null}

        <View style={card.footer}>
          <AuthorRow
            author={item.author}
            postedAt={item.created_at}
            fallbackName="UNISON Administration"
          />
          <View style={card.readChip}>
            <Text style={card.readText}>Read</Text>
            <Ionicons name="arrow-forward" size={12} color={C.orange} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Feed Item Router — picks correct card + navigation per item.type ─────────
function FeedItem({ item, navigation }) {
  const itemType = (item.type || '').toLowerCase().trim();

  switch (itemType) {
    case 'opportunity':
      return (
        <OpportunityCard
          item={item}
          onPress={() => navigation.navigate('OpportunityDetail', { id: item.id })}
        />
      );
    case 'event':
      return (
        <EventCard
          item={item}
          onPress={() => navigation.navigate('EventDetail', { id: item.id })}
        />
      );
    case 'announcement':
      return (
        <AnnouncementCard
          item={item}
          onPress={() => navigation.navigate('AnnouncementDetail', { id: item.id, item })}
        />
      );
    default:
      // Graceful fallback — won't crash, shows something
      return (
        <OpportunityCard
          item={item}
          onPress={() => navigation.navigate('OpportunityDetail', { id: item.id })}
        />
      );
  }
}

// ─── Badge-wrapped Icon Button ────────────────────────────────────────────────
function IconBadgeBtn({ iconName, count = 0, onPress }) {
  const cappedCount = count > 99 ? '99+' : count;
  return (
    <TouchableOpacity style={s.iconBtn} onPress={onPress}>
      <Ionicons name={iconName} size={22} color={C.text} />
      {count > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{cappedCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={card.wrap}>
      <View style={[card.media, { backgroundColor: C.border }]} />
      <View style={card.body}>
        <View style={{ width: '40%', height: 20, backgroundColor: C.border, borderRadius: 12 }} />
        <View style={{ width: '80%', height: 16, backgroundColor: C.border, borderRadius: 6, marginTop: 10 }} />
        <View style={{ width: '60%', height: 14, backgroundColor: C.border, borderRadius: 6, marginTop: 6 }} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AlumniHomeScreen({ navigation }) {
  const { userData, logout } = useContext(AuthContext);

  const [myPosts, setMyPosts] = useState([]);
  const [otherPosts, setOtherPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState({});

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  // ── Fetch everything in parallel ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [myRes, allRes, sugRes, notifRes, convoRes] = await Promise.allSettled([
        getMyOpportunities(),
        getFeed({ page: 1, limit: 10 }),
        getSuggestions(),
        getNotifications(),
        getConversations(),
      ]);

      for (const res of [myRes, allRes, sugRes, notifRes, convoRes]) {
        if (res.status === 'rejected' && res.reason?.response?.status === 401) {
          logout();
          return;
        }
      }

      if (myRes.status === 'fulfilled') {
        const mine = Array.isArray(myRes.value.data) ? myRes.value.data : [];
        setMyPosts(mine.slice(0, 10));

        if (allRes.status === 'fulfilled') {
          // getFeed returns { data: { data: [...], total: N } }
          const all = Array.isArray(allRes.value.data?.data) ? allRes.value.data.data : [];
          const myIds = new Set(mine.map(o => o.id));
          // Keep the type field intact so FeedItem router works correctly
          setOtherPosts(
            all
              .filter(o => !myIds.has(o.id))
              .map(o => ({
                ...o,
                // Ensure posted_by is present for OpportunityCard's AuthorRow
                posted_by: o.posted_by || o.author || null,
              }))
          );
        }
      } else if (allRes.status === 'fulfilled') {
        const all = Array.isArray(allRes.value.data?.data) ? allRes.value.data.data : [];
        setOtherPosts(all);
      }

      if (sugRes.status === 'fulfilled') {
        const sugs = Array.isArray(sugRes.value.data) ? sugRes.value.data : [];
        setSuggestions(sugs.slice(0, 5));
      }

      if (notifRes.status === 'fulfilled') {
        const notifications = notifRes.value.data || [];
        setUnreadNotifCount(notifications.filter(n => !n.is_read).length);
      }

      if (convoRes.status === 'fulfilled') {
        const conversations = convoRes.value.data || [];
        const unread = conversations.filter(c => {
          const lm = c.lastMessage;
          return lm && lm.isRead === false && lm.senderId !== userData?.id;
        }).length;
        setUnreadMsgCount(unread);
      }
    } catch (err) {
      if (err?.response?.status === 401) logout();
      else console.log('AlumniHomeScreen fetchAll error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.id, logout]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const handleConnect = async userId => {
    try {
      setConnecting(prev => ({ ...prev, [userId]: true }));
      await connectUser(userId);
      setSuggestions(prev => prev.filter(s => s.id !== userId));
    } catch (err) {
      if (err.response?.status === 401) logout();
      else console.log('Connect error:', err);
    } finally {
      setConnecting(prev => ({ ...prev, [userId]: false }));
    }
  };

  const navigateToMyPosts = () => {
    navigation.navigate('Opportunities', { initialTab: 'my' });
  };
  const navigateToOpportunities = () => {
    navigation.navigate('Opportunities', { initialTab: 'all' });
  };
  const navigateToConnections = () => {
    navigation.navigate('Network', { initialTab: 'discover' });
  };

  const displayName = userData?.display_name || userData?.username || 'Alumni';
  const profilePic = userData?.profile_picture || null;

  return (
    <View style={s.root}>

      {/* ── Static Top Bar ───────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <Text style={s.greeting}>Good day 👋</Text>
          <Text style={s.topName} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
        </View>
        <View style={s.topActions}>
          <IconBadgeBtn
            iconName="chatbubbles-outline"
            count={unreadMsgCount}
            onPress={() => navigation.navigate('Conversations')}
          />
          <IconBadgeBtn
            iconName="notifications-outline"
            count={unreadNotifCount}
            onPress={() => navigation.navigate('Notifications')}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Avatar uri={profilePic} name={displayName} size={36} fontSize={13} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Feed ───────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <View style={s.listContainer}>

          {/* ── Post Composer ──────────────────────────────────────────── */}
          <View style={s.composerCard}>
            <View style={s.composerRow}>
              <Avatar uri={profilePic} name={displayName} size={40} fontSize={15} />
              <TouchableOpacity
                style={s.composerInput}
                onPress={() => navigation.navigate('PostOpportunity')}
                activeOpacity={0.75}
              >
                <Text style={s.composerPlaceholder}>Share an opportunity with your network…</Text>
              </TouchableOpacity>
            </View>
            <View style={s.composerDivider} />
            <TouchableOpacity
              style={s.composerBtn}
              onPress={() => navigation.navigate('PostOpportunity')}
              activeOpacity={0.8}
            >
              <Ionicons name="briefcase-outline" size={17} color={C.primary} />
              <Text style={s.composerBtnText}>Post Opportunity</Text>
            </TouchableOpacity>
          </View>

          {/* ── Your Posts — Horizontal Carousel ──────────────────────── */}
          {/* These are always opportunities (from getMyOpportunities), so
              CompactOpportunityCard is correct here. No change needed. */}
          {myPosts.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Your Posts</Text>
                <TouchableOpacity onPress={navigateToMyPosts}>
                  <Text style={s.seeAll}>Manage all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.carouselContent}
                decelerationRate="fast"
                snapToInterval={294}
                snapToAlignment="start"
              >
                {myPosts.map(opp => (
                  <CompactOpportunityCard
                    key={opp.id}
                    item={opp}
                    displayName={displayName}
                    profilePic={profilePic}
                    onPress={() => navigation.navigate('OpportunityDetail', { id: opp.id })}
                  />
                ))}
                {/* "Post new" nudge card */}
                <TouchableOpacity
                  style={s.newPostCard}
                  onPress={() => navigation.navigate('PostOpportunity')}
                  activeOpacity={0.8}
                >
                  <View style={s.newPostInner}>
                    <View style={s.newPostIcon}>
                      <Ionicons name="add" size={28} color={C.primary} />
                    </View>
                    <Text style={s.newPostTitle}>Post new opportunity</Text>
                    <Text style={s.newPostSub}>Tap to share with your network</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* ── Recent Feed (mixed: opportunities, events, announcements) ── */}
          {loading ? (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Recent Posts</Text>
              </View>
              <View style={s.sectionContent}>
                {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
              </View>
            </View>
          ) : otherPosts.length > 0 ? (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Recent Posts</Text>
                <TouchableOpacity onPress={navigateToOpportunities}>
                  <Text style={s.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <View style={s.sectionContent}>
                {/* FeedItem routes each item to the correct card + navigation */}
                {otherPosts.map(item => (
                  <FeedItem
                    key={`${item.type || 'unknown'}-${item.id}`}
                    item={item}
                    navigation={navigation}
                  />
                ))}
              </View>
            </View>
          ) : myPosts.length === 0 ? (
            <View style={s.emptyFeed}>
              <Ionicons name="megaphone-outline" size={40} color={C.border} />
              <Text style={s.emptyFeedTitle}>No opportunities yet</Text>
              <Text style={s.emptyFeedSub}>Be the first to post one for your network</Text>
              <TouchableOpacity
                style={s.emptyPostBtn}
                onPress={() => navigation.navigate('PostOpportunity')}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.emptyPostBtnText}>Post Opportunity</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Suggested Connections ─────────────────────────────────── */}
          {suggestions.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>People You May Know</Text>
                <TouchableOpacity onPress={navigateToConnections}>
                  <Text style={s.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.sugScroll}
              >
                {suggestions.map(person => (
                  <View key={person.id} style={s.sugCard}>
                    <Avatar
                      uri={person.profile_picture}
                      name={person.display_name || person.username}
                      size={56}
                      fontSize={20}
                    />
                    <Text style={s.sugName} numberOfLines={1}>
                      {person.display_name || person.username}
                    </Text>
                    <Text style={s.sugRole} numberOfLines={1}>
                      {person.role || person.degree || 'Alumni'}
                    </Text>
                    <Text style={s.sugBatch} numberOfLines={1}>
                      {(person.graduation_year || person.batch)
                        ? `Class of ${person.graduation_year || person.batch}`
                        : ''}
                    </Text>
                    <TouchableOpacity
                      style={[s.connectBtn, connecting[person.id] && s.connectBtnDisabled]}
                      onPress={() => handleConnect(person.id)}
                      disabled={!!connecting[person.id]}
                    >
                      {connecting[person.id] ? (
                        <ActivityIndicator size="small" color={C.primary} />
                      ) : (
                        <Text style={s.connectBtnText}>Connect</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles (unchanged from original) ────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  topBarLeft: { flex: 1, marginRight: 12 },
  greeting: { fontSize: 12, color: C.muted, fontWeight: '500', marginBottom: 2 },
  topName: { fontSize: 20, fontWeight: '700', color: C.text },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 },

  iconBtn: { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: C.coral,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: C.card,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', lineHeight: 13 },

  listContainer: { paddingTop: 16, paddingBottom: 20 },

  composerCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  composerInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerPlaceholder: { fontSize: 13, color: C.muted },
  composerDivider: { height: 1, backgroundColor: C.divider, marginBottom: 10 },
  composerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  composerBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },

  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  seeAll: { fontSize: 13, fontWeight: '600', color: C.primary },

  sectionContent: { paddingHorizontal: 16 },

  carouselContent: { paddingHorizontal: 16, paddingBottom: 4 },

  newPostCard: {
    width: 160,
    height: '100%',
    minHeight: 160,
    backgroundColor: C.primarySoft,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.primaryBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  newPostInner: { alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  newPostIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  newPostTitle: { fontSize: 13, fontWeight: '700', color: C.primary, textAlign: 'center' },
  newPostSub: { fontSize: 11, color: C.subtext, textAlign: 'center' },

  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
    marginTop: 16,
  },
  emptyFeedTitle: { fontSize: 16, fontWeight: '700', color: C.subtext },
  emptyFeedSub: { fontSize: 13, color: C.muted, textAlign: 'center' },
  emptyPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyPostBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  sugScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingRight: 24,
  },
  sugCard: {
    width: 140,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sugName: { fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'center', marginTop: 8 },
  sugRole: { fontSize: 11, color: C.subtext, textAlign: 'center' },
  sugBatch: { fontSize: 10, color: C.muted, textAlign: 'center', marginBottom: 4 },
  connectBtn: {
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectBtnText: { color: C.primary, fontSize: 12, fontWeight: '700' },
});