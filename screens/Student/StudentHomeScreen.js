import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useContext, useState } from 'react';
import {
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
import { getConversations, getNotifications, getFeed } from '../../services/api';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary: '#534AB7',
  primarySoft: '#EEEDFE',
  bg: '#F4F4F8',
  card: '#FFFFFF',
  text: '#1A1A2E',
  subtext: '#6B7280',
  muted: '#9CA3AF',
  border: '#E8E8F0',
  divider: '#F3F4F6',
  green: '#10B981',  greenSoft: '#D1FAE5',
  blue: '#2563EB',   blueSoft: '#DBEAFE',
  amber: '#D97706',  amberSoft: '#FEF3C7',
  coral: '#DC2626',  coralSoft: '#FEE2E2',
  purple: '#7C3AED', purpleSoft: '#EDE9FE',
  teal: '#0D9488',   tealSoft: '#CCFBF1',
  orange: '#EA580C', orangeSoft: '#FFEDD5',
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

const getOppTypeMeta = (type = '') => {
  const MAP = {
    job:         { label: 'Job',        color: C.green,   bg: C.greenSoft,  icon: 'briefcase'      },
    internship:  { label: 'Internship', color: C.amber,   bg: C.amberSoft,  icon: 'school'         },
    freelance:   { label: 'Freelance',  color: C.purple,  bg: C.purpleSoft, icon: 'laptop-outline' },
    'full-time': { label: 'Full-time',  color: C.green,   bg: C.greenSoft,  icon: 'briefcase'      },
    'part-time': { label: 'Part-time',  color: C.blue,    bg: C.blueSoft,   icon: 'time-outline'   },
    opportunity: { label: 'Opportunity',color: C.green,   bg: C.greenSoft,  icon: 'briefcase'      },
  };
  return MAP[type?.toLowerCase()] ?? { label: type || 'Other', color: C.muted, bg: C.divider, icon: 'briefcase-outline' };
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

const formatDateTime = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const relativeTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const isExpired  = (d) => !!d && new Date(d) < new Date();
const isPastDate = (d) => !!d && new Date(d) < new Date();

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

// ─── Deadline Badge ───────────────────────────────────────────────────────────
function DeadlineBadge({ deadline }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  let color, bg, label;
  if (days < 0)       { color = C.muted;  bg = C.divider;   label = 'Closed';        }
  else if (days <= 3) { color = C.coral;  bg = C.coralSoft; label = `${days}d left`; }
  else if (days <= 7) { color = C.amber;  bg = C.amberSoft; label = `${days}d left`; }
  else                { color = C.green;  bg = C.greenSoft; label = formatDate(deadline); }
  return (
    <View style={[db.badge, { backgroundColor: bg }]}>
      <Ionicons name="time-outline" size={11} color={color} />
      <Text style={[db.text, { color }]}>{label}</Text>
    </View>
  );
}
const db = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  text:  { fontSize: 11, fontWeight: '700' },
});

// ─── Author Row ───────────────────────────────────────────────────────────────
function AuthorRow({ author, postedAt, fallbackName }) {
  const name = author?.display_name || author?.username || fallbackName || 'Alumni';
  const pic  = author?.profile_picture || null;
  return (
    <View style={ar.wrap}>
      <MiniAvatar uri={pic} name={name} size={26} />
      <View style={ar.meta}>
        <Text style={ar.name} numberOfLines={1}>{name}</Text>
        <Text style={ar.time}>{relativeTime(postedAt)}</Text>
      </View>
    </View>
  );
}
const ar = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  meta: { flex: 1 },
  name: { fontSize: 12, fontWeight: '700', color: C.text },
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

// ─── HTML Preview ─────────────────────────────────────────────────────────────
// Renders rich-text HTML from editor, clipped to ~3 lines for card previews.
function HtmlPreview({ html, color = C.subtext }) {
  const { width } = useWindowDimensions();
  const contentWidth = width - 32 - 28; // screen - section padding - card body padding

  if (!html || html.trim() === '' || html === '<p></p>' || html === '<p><br></p>') return null;

  const tagsStyles = {
    body:   { color, fontSize: 13, lineHeight: 19 },
    p:      { color, fontSize: 13, lineHeight: 19, marginTop: 0, marginBottom: 4 },
    span:   { color, fontSize: 13 },
    strong: { color, fontWeight: '700' },
    b:      { color, fontWeight: '700' },
    em:     { color, fontStyle: 'italic' },
    i:      { color, fontStyle: 'italic' },
    ul:     { color, marginLeft: 4, marginTop: 0, marginBottom: 4 },
    ol:     { color, marginLeft: 4, marginTop: 0, marginBottom: 4 },
    li:     { color, fontSize: 13, lineHeight: 19 },
    a:      { color: C.primary },
    h1:     { color, fontSize: 15, fontWeight: '700', marginBottom: 4, marginTop: 0 },
    h2:     { color, fontSize: 14, fontWeight: '700', marginBottom: 4, marginTop: 0 },
    h3:     { color, fontSize: 13, fontWeight: '700', marginBottom: 4, marginTop: 0 },
  };

  return (
    <View style={{ maxHeight: 62, overflow: 'hidden' }}>
      <RenderHtml
        contentWidth={contentWidth}
        source={{ html }}
        tagsStyles={tagsStyles}
        enableExperimentalBRCollapsing
        enableExperimentalGhostLinesPrevention
        ignoredDomTags={['img', 'figure', 'video', 'iframe']}
        defaultTextProps={{ numberOfLines: 3, ellipsizeMode: 'tail' }}
      />
    </View>
  );
}

// ─── Shared card styles ───────────────────────────────────────────────────────
const card = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  wrapDim: { opacity: 0.65 },

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
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: C.orange,
  },

  media:     { width: '100%', height: 130 },
  mediaWrap: { position: 'relative' },

  dateBubble: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: C.card, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  dateBubbleMonth: { fontSize: 9, fontWeight: '700', color: C.teal, letterSpacing: 0.5 },
  dateBubbleDay:   { fontSize: 18, fontWeight: '800', color: C.text, lineHeight: 20 },

  pastOverlay: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pastOverlayText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  body:      { padding: 14, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  title:     { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 24 },
  titleDim:  { color: C.muted },

  metaRow:  { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.muted, maxWidth: 150 },

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },

  attendeeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: C.divider, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },
  attendeeText:  { fontSize: 11, color: C.muted, fontWeight: '500' },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, marginTop: 4,
    borderTopWidth: 1, borderTopColor: C.divider,
  },

  // Opportunity footer actions
  viewBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  viewBtnClosed: { backgroundColor: C.divider },
  viewText:      { fontSize: 12, fontWeight: '700', color: C.primary },
  viewTextClosed:{ color: C.muted },

  // Event RSVP chip
  rsvpChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.tealSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  rsvpChipPast: { backgroundColor: C.divider },
  rsvpText:     { fontSize: 12, fontWeight: '700', color: C.teal },
  rsvpTextPast: { color: C.muted },

  // Announcement read chip
  readChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.orangeSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  readText: { fontSize: 12, fontWeight: '700', color: C.orange },

  annoDate: { fontSize: 11, color: C.muted, fontWeight: '500' },
});

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OpportunityCard({ item, onPress }) {
  const oppType = item.opportunity_type || item.sub_type || item.type;
  const meta    = getOppTypeMeta(oppType);
  const company = item.company_name || item.company;
  const mediaUri= item.media_url || item.media?.[0];
  const closed  = isExpired(item.deadline);
  const author  = item.author || item.posted_by;

  const skills      = item.required_skills?.slice(0, 3) || [];
  const extraSkills = (item.required_skills?.length || 0) - 3;
  const htmlDesc    = item.description || item.body || null;

  return (
    <TouchableOpacity style={[card.wrap, closed && card.wrapDim]} onPress={onPress} activeOpacity={0.82}>
      {/* Feed-type badge */}
      <View style={card.feedBadge}>
        <Ionicons name="briefcase-outline" size={11} color={C.primary} />
        <Text style={[card.feedBadgeText, { color: C.primary }]}>Opportunity</Text>
      </View>

      {mediaUri && !closed && (
        <Image source={{ uri: mediaUri }} style={card.media} resizeMode="cover" />
      )}

      <View style={card.body}>
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

        {/* Rich-text description from editor */}
        {htmlDesc ? <HtmlPreview html={htmlDesc} /> : null}

        {skills.length > 0 && (
          <View style={card.skillsRow}>
            {skills.map((sk, i) => <SkillChip key={i} label={sk} />)}
            {extraSkills > 0 && (
              <View style={[sc.wrap, { backgroundColor: C.primarySoft, borderColor: '#C7D2FE' }]}>
                <Text style={[sc.text, { color: C.primary }]}>+{extraSkills}</Text>
              </View>
            )}
          </View>
        )}

        <View style={card.footer}>
          <DeadlineBadge deadline={item.deadline} />
          {!closed
            ? <View style={card.viewBtn}><Text style={card.viewText}>View details</Text><Ionicons name="arrow-forward" size={13} color={C.primary} /></View>
            : <View style={card.viewBtnClosed}><Text style={card.viewTextClosed}>Closed</Text></View>
          }
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ item, onPress }) {
  const eventDate  = item.event_date || item.date;
  const past       = isPastDate(eventDate);
  const meta       = getEventMeta(item.event_type || item.type);
  const author     = item.author || item.host || item.posted_by;
  const authorName = author?.display_name || author?.name || author?.username || 'Alumni';
  const isFull     = item.max_attendees && item.attendee_count >= item.max_attendees;
  const dateObj    = eventDate ? new Date(eventDate) : null;
  const htmlDesc   = item.description || null;

  return (
    <TouchableOpacity style={[card.wrap, past && card.wrapDim]} onPress={onPress} activeOpacity={0.82}>
      <View style={[card.feedBadge, { backgroundColor: C.tealSoft }]}>
        <Ionicons name="calendar-outline" size={11} color={C.teal} />
        <Text style={[card.feedBadgeText, { color: C.teal }]}>Event</Text>
      </View>

      {(item.media_url || item.banner_url) ? (
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

        {/* Rich-text description from editor */}
        {htmlDesc ? <HtmlPreview html={htmlDesc} /> : null}

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

// ─── Announcement Card ────────────────────────────────────────────────────────
function AnnouncementCard({ item, onPress }) {
  const htmlDesc = item.description || item.body || null;

  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.82}>
      {/* Left accent stripe */}
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

        {/* Rich-text description from editor */}
        {htmlDesc ? <HtmlPreview html={htmlDesc} /> : null}

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

// ─── Feed Item Router — correct card + navigation per item.type ───────────────
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
      // Graceful fallback — treats unknown types as opportunities
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
    <TouchableOpacity style={s.notifBtn} onPress={onPress}>
      <Ionicons name={iconName} size={22} color={C.text} />
      {count > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{cappedCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentHomeScreen({ navigation }) {
  const { userData, logout } = useContext(AuthContext);

  const [feedItems, setFeedItems]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount]     = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const [feedRes, notifRes, convoRes] = await Promise.allSettled([
        // getFeed returns mixed items: opportunities, events, announcements
        getFeed({ page: 1, limit: 20 }),
        getNotifications(),
        getConversations(),
      ]);

      for (const res of [feedRes, notifRes, convoRes]) {
        if (res.status === 'rejected' && res.reason?.response?.status === 401) {
          logout();
          return;
        }
      }

      if (feedRes.status === 'fulfilled') {
        // API shape: { data: { data: [...], total: N } }
        const items = Array.isArray(feedRes.value.data?.data)
          ? feedRes.value.data.data
          : Array.isArray(feedRes.value.data)
          ? feedRes.value.data
          : [];
        setFeedItems(items);
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
      else console.log('StudentHomeScreen fetchAll error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.id, logout]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const displayName = userData?.display_name || userData?.name || 'Student';

  return (
    <View style={s.container}>

      {/* ── Header (unchanged from original) ─────────────────────────────── */}
      <View style={s.topBar}>
        <View>
          <Text style={s.greeting}>Good morning 👋</Text>
          <Text style={s.displayName}>{displayName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
          <TouchableOpacity onPress={() => navigation.navigate('StudentProfile')}>
            {userData?.profile_picture ? (
              <Image source={{ uri: userData.profile_picture }} style={s.avatarSmall} />
            ) : (
              <View style={s.avatarSmall}>
                <Text style={s.avatarSmallText}>{initials(displayName)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Feed ───────────────────────────────────────────────── */}
      <ScrollView
        style={s.scrollArea}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <View style={s.listContainer}>
          {loading ? (
            [0, 1, 2].map(i => <SkeletonCard key={i} />)
          ) : feedItems.length === 0 ? (
            <Text style={s.emptyText}>No posts available right now.</Text>
          ) : (
            feedItems.map(item => (
              <FeedItem
                key={`${item.type || 'unknown'}-${item.id}`}
                item={item}
                navigation={navigation}
              />
            ))
          )}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles (unchanged from original) ────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  greeting:    { fontSize: 12, color: C.muted, fontWeight: '500', marginBottom: 2 },
  displayName: { fontSize: 20, fontWeight: '700', color: C.text },
  notifBtn:    { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -2, right: -4,
    backgroundColor: C.coral,
    borderRadius: 10,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: C.card,
  },
  badgeText:      { fontSize: 10, fontWeight: '800', color: '#FFFFFF', lineHeight: 13 },
  avatarSmall:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  avatarSmallText:{ fontSize: 13, fontWeight: '700', color: '#fff' },
  scrollArea:     { flex: 1 },
  listContainer:  { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  emptyText:      { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 50 },
});