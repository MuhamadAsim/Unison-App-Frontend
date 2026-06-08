import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import {
  deleteEvent,
  deleteOpportunity,
  getFeed,
  getMyEvents,
  getMyOpportunities,
} from '../../services/api';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';


// ─── Design Tokens ─────────────────────────────────────────────────────────────
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
  green: '#10B981', greenSoft: '#D1FAE5', greenBorder: '#6EE7B7',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  amber: '#D97706', amberSoft: '#FEF3C7', amberBorder: '#FCD34D',
  coral: '#DC2626', coralSoft: '#FEE2E2', coralBorder: '#FCA5A5',
  purple: '#7C3AED', purpleSoft: '#EDE9FE',
  teal: '#0D9488', tealSoft: '#CCFBF1', tealBorder: '#99F6E4',
  orange: '#EA580C', orangeSoft: '#FFEDD5', orangeBorder: '#FDBA74',
};

// ─── DEBUG HELPER ─────────────────────────────────────────────────────────────
const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log('[OpportunitiesScreen]', ...args); };
const logError = (...args) => { if (DEBUG) console.error('[OpportunitiesScreen ERROR]', ...args); };

// ─── Type meta maps ───────────────────────────────────────────────────────────
const OPP_TYPE_META = {
  job: { label: 'Job', color: C.green, bg: C.greenSoft, icon: 'briefcase' },
  internship: { label: 'Internship', color: C.amber, bg: C.amberSoft, icon: 'school' },
  freelance: { label: 'Freelance', color: C.purple, bg: C.purpleSoft, icon: 'laptop-outline' },
  'full-time': { label: 'Full-time', color: C.green, bg: C.greenSoft, icon: 'briefcase' },
  'part-time': { label: 'Part-time', color: C.blue, bg: C.blueSoft, icon: 'time-outline' },
};
const getOppMeta = (type = '') =>
  OPP_TYPE_META[type?.toLowerCase()] ?? { label: type || 'Other', color: C.muted, bg: C.divider, icon: 'briefcase-outline' };

const EVENT_TYPE_COLORS = {
  reunion: { color: C.teal, bg: C.tealSoft },
  webinar: { color: C.primary, bg: C.primarySoft },
  workshop: { color: C.blue, bg: C.blueSoft },
  networking: { color: C.purple, bg: C.purpleSoft },
  other: { color: C.muted, bg: C.divider },
};
const getEventMeta = (type = '') =>
  EVENT_TYPE_COLORS[type?.toLowerCase()] ?? EVENT_TYPE_COLORS.other;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const avatarColor = (name = '') => {
  const palette = [C.primary, C.purple, C.blue, C.green, C.amber];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
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

const formatDate = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateTime = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysUntil = deadline => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
};

const isExpired = deadline => !!deadline && new Date(deadline) < new Date();
const isPastDate = date => !!date && new Date(date) < new Date();

// ─── Shared sub-components ────────────────────────────────────────────────────

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
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name), justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: '#fff' }}>{initials(name)}</Text>
    </View>
  );
}

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

function AuthorRow({ author, postedAt, fallbackName }) {
  const name = author?.display_name || fallbackName || 'Alumni';
  const pic = author?.profile_picture || null;
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
function HtmlPreview({ html, color = C.subtext }) {
  const { width } = useWindowDimensions();
  const contentWidth = width - 32 - 28;

  if (!html || html.trim() === '' || html === '<p></p>' || html === '<p><br></p>') return null;

  const tagsStyles = {
    body: { color, fontSize: 13, lineHeight: 19 },
    p: { color, fontSize: 13, lineHeight: 19, marginTop: 0, marginBottom: 4 },
    span: { color, fontSize: 13 },
    strong: { color, fontWeight: '700' },
    b: { color, fontWeight: '700' },
    em: { color, fontStyle: 'italic' },
    i: { color, fontStyle: 'italic' },
    ul: { color, marginLeft: 4, marginTop: 0, marginBottom: 4 },
    ol: { color, marginLeft: 4, marginTop: 0, marginBottom: 4 },
    li: { color, fontSize: 13, lineHeight: 19 },
    a: { color: C.primary },
    h1: { color, fontSize: 15, fontWeight: '700', marginBottom: 4, marginTop: 0 },
    h2: { color, fontSize: 14, fontWeight: '700', marginBottom: 4, marginTop: 0 },
    h3: { color, fontSize: 13, fontWeight: '700', marginBottom: 4, marginTop: 0 },
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

// ─── My-tab action row ────────────────────────────────────────────────────────
function MyPostActions({ onEdit, onDelete }) {
  return (
    <View style={mpa.row}>
      <TouchableOpacity style={mpa.btn} onPress={onEdit}>
        <Ionicons name="create-outline" size={15} color={C.primary} />
        <Text style={[mpa.text, { color: C.primary }]}>Edit</Text>
      </TouchableOpacity>
      <View style={mpa.divider} />
      <TouchableOpacity style={mpa.btn} onPress={onDelete}>
        <Ionicons name="trash-outline" size={15} color={C.coral} />
        <Text style={[mpa.text, { color: C.coral }]}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}
const mpa = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 12 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  text: { fontSize: 13, fontWeight: '600' },
  divider: { width: 1, backgroundColor: C.border, marginVertical: 2 },
});

// ─── OPPORTUNITY CARD ─────────────────────────────────────────────────────────
function OpportunityCard({ item, isMyTab, onPress, onEdit, onDelete }) {
  const oppType = item.opportunity_type || item.type;
  const meta = getOppMeta(oppType);
  const company = item.company_name || item.company;
  const mediaUri = item.media_url || item.media?.[0];
  const closed = isExpired(item.deadline);
  const author = item.author || item.posted_by;


  const skills = item.required_skills?.slice(0, 3) || [];
  const extraSkills = (item.required_skills?.length || 0) - 3;

  const htmlDescription = item.description || item.body || null;

  return (
    <TouchableOpacity style={[card.wrap, closed && card.wrapDim]} onPress={onPress} activeOpacity={0.82}>
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

        {htmlDescription ? <HtmlPreview html={htmlDescription} /> : null}

        {skills.length > 0 && (
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

        {isMyTab && <MyPostActions onEdit={onEdit} onDelete={onDelete} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────
function EventCard({ item, isMyTab, onPress, onEdit, onDelete }) {
  const eventDate = item.event_date || item.date;
  const past = isPastDate(eventDate);
  const meta = getEventMeta(item.type);
  const author = item.author || item.host;
  const authorName = author?.name || author?.display_name || 'Alumni';
  const isFull = item.max_attendees && item.attendee_count >= item.max_attendees;
  const dateObj = eventDate ? new Date(eventDate) : null;

  const htmlDescription = item.description || null;

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
          <AuthorRow author={typeof author === 'object' ? author : null} postedAt={item.created_at} fallbackName={authorName} />
          <TypePill
            label={item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Event'}
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

        {htmlDescription ? <HtmlPreview html={htmlDescription} /> : null}

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

        {isMyTab && <MyPostActions onEdit={onEdit} onDelete={onDelete} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── ANNOUNCEMENT CARD ────────────────────────────────────────────────────────
function AnnouncementCard({ item, onPress }) {
  const htmlDescription = item.description || item.body || null;

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

        {htmlDescription ? <HtmlPreview html={htmlDescription} /> : null}

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

// ─── Shared card styles ───────────────────────────────────────────────────────
const card = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 12,
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

// ─── Feed Item Router ─────────────────────────────────────────────────────────
function FeedItem({ item, navigation, isMyTab, onDelete }) {
  const navToOpp = () => navigation.navigate('OpportunityDetail', { id: item.id });
  const navToEvent = () => navigation.navigate('EventDetail', { id: item.id });
  const navToAnno = () => navigation.navigate('AnnouncementDetail', { id: item.id, item });

  const itemType = (item.type || item._source || '').toLowerCase().trim();

  log(`FeedItem render → id=${item.id} type="${itemType}" title="${item.title}"`);

  switch (itemType) {
    case 'opportunity':
      return (
        <OpportunityCard
          item={item}
          isMyTab={isMyTab}
          onPress={navToOpp}
          onEdit={() => navigation.navigate('EditOpportunity', { opportunity: item })}
          onDelete={() => onDelete('opportunity', item.id)}
        />
      );
    case 'event':
      return (
        <EventCard
          item={item}
          isMyTab={isMyTab}
          onPress={navToEvent}
          onEdit={() => navigation.navigate('EditEvent', { event: item })}
          onDelete={() => onDelete('event', item.id)}
        />
      );
    case 'announcement':
      return <AnnouncementCard item={item} onPress={navToAnno} />;
    default:
      logError(`Unknown item type: "${itemType}" for item id=${item.id}`, item);
      return (
        <View style={fallback.wrap}>
          <Text style={fallback.label}>⚠️ Unknown type: "{itemType}"</Text>
          <Text style={fallback.text}>{item.title || `ID: ${item.id}`}</Text>
          {DEBUG && (
            <Text style={fallback.debug}>{JSON.stringify(item, null, 2)}</Text>
          )}
        </View>
      );
  }
}

const fallback = StyleSheet.create({
  wrap: { backgroundColor: C.coralSoft, marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: C.coralBorder, padding: 16 },
  label: { fontSize: 12, color: C.coral, fontWeight: '700', marginBottom: 4 },
  text: { fontSize: 14, color: C.text },
  debug: { fontSize: 10, color: C.subtext, marginTop: 8, fontFamily: 'monospace' },
});

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, icon, active, onPress, onClear }) {
  return (
    <TouchableOpacity style={[fc.chip, active && fc.active]} onPress={onPress} activeOpacity={0.75}>
      {icon && <Ionicons name={icon} size={13} color={active ? C.primary : C.muted} />}
      <Text style={[fc.text, active && fc.textActive]}>{label}</Text>
      {active && onClear && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
          <Ionicons name="close-circle" size={13} color={C.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
const fc = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: C.card, marginRight: 8 },
  active: { borderColor: C.primary, backgroundColor: C.primarySoft },
  text: { fontSize: 12, color: C.muted, fontWeight: '500' },
  textActive: { color: C.primary, fontWeight: '600' },
});

// ─── Stats Bar (My Posts tab) ─────────────────────────────────────────────────
function StatsBar({ data }) {
  const opps = data.filter(d => d.type === 'opportunity' || d._source === 'opportunity').length;
  const events = data.filter(d => d.type === 'event' || d._source === 'event').length;

  const stats = [
    { label: 'Total', value: data.length, color: C.primary, bg: C.primarySoft },
    { label: 'Opportunities', value: opps, color: C.blue, bg: C.blueSoft },
    { label: 'Events', value: events, color: C.teal, bg: C.tealSoft },
  ];

  return (
    <View style={sb.wrap}>
      {stats.map(st => (
        <View key={st.label} style={[sb.cell, { backgroundColor: st.bg }]}>
          <Text style={[sb.value, { color: st.color }]}>{st.value}</Text>
          <Text style={[sb.label, { color: st.color }]}>{st.label}</Text>
        </View>
      ))}
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2, opacity: 0.75 },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ isMyTab, filterType, onPost }) {
  const hasFilter = !!filterType;
  return (
    <View style={es.wrap}>
      <View style={es.icon}>
        <Ionicons
          name={isMyTab ? 'megaphone-outline' : hasFilter ? 'filter-outline' : 'newspaper-outline'}
          size={36}
          color={C.primary}
        />
      </View>
      <Text style={es.title}>
        {isMyTab ? 'No posts yet' : hasFilter ? 'No matches' : 'Feed is empty'}
      </Text>
      <Text style={es.sub}>
        {isMyTab
          ? 'Share a job, internship, or event with your network.'
          : hasFilter
            ? 'Try removing the filter to see more.'
            : 'Check back soon for new opportunities, events, and announcements.'}
      </Text>
      {isMyTab && (
        <TouchableOpacity style={es.btn} onPress={onPost}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={es.btnText}>Post Something</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 8 },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center' },
  sub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22, marginTop: 12 },
  btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Expandable FAB ───────────────────────────────────────────────────────────
// Tapping the main FAB reveals two child buttons: one for opportunities, one for events.
function ExpandableFab({ onPostOpportunity, onCreateEvent }) {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
    setOpen(!open);
  };

  const close = () => {
    Animated.spring(animation, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    setOpen(false);
  };

  // Child 1: Event (appears first / higher up)
  const eventTranslateY = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -118] });
  const eventOpacity = animation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const eventScale = animation.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  // Child 2: Opportunity (appears second / slightly lower)
  const oppTranslateY = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -62] });
  const oppOpacity = animation.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] });
  const oppScale = animation.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  // Main FAB icon rotation
  const rotate = animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <View style={fab.container} pointerEvents="box-none">
      {/* Backdrop tap-to-close */}
      {open && (
        <TouchableOpacity style={fab.backdrop} onPress={close} activeOpacity={1} />
      )}

      {/* Child: Create Event */}
      <Animated.View style={[fab.childWrap, { transform: [{ translateY: eventTranslateY }, { scale: eventScale }], opacity: eventOpacity }]}>
        <TouchableOpacity
          style={[fab.childBtn, { backgroundColor: C.teal }]}
          onPress={() => { close(); onCreateEvent(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={fab.label}>
          <Text style={fab.labelText}>Create Event</Text>
        </View>
      </Animated.View>

      {/* Child: Post Opportunity */}
      <Animated.View style={[fab.childWrap, { transform: [{ translateY: oppTranslateY }, { scale: oppScale }], opacity: oppOpacity }]}>
        <TouchableOpacity
          style={[fab.childBtn, { backgroundColor: C.primary }]}
          onPress={() => { close(); onPostOpportunity(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="briefcase-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={fab.label}>
          <Text style={fab.labelText}>Post Opportunity</Text>
        </View>
      </Animated.View>

      {/* Main FAB */}
      <TouchableOpacity style={fab.main} onPress={toggle} activeOpacity={0.85}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="add" size={26} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const fab = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -100,
    bottom: -100,
    zIndex: 0,
  },
  main: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 2,
  },
  childWrap: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  childBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  label: {
    backgroundColor: C.text,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    // push label to the left of the button
    position: 'absolute',
    right: 54,
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function AlumniOpportunitiesScreen() {
  const navigation = useNavigation();

  const [tab, setTab] = useState('all');
  const [filterType, setFilterType] = useState(null);

  const [feedItems, setFeedItems] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);

  const [myItems, setMyItems] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  const tabSlide = useRef(new Animated.Value(0)).current;
  const [tabWidth, setTabWidth] = useState(0);
  const { userData } = useContext(AuthContext);


  const switchTab = newTab => {
    if (newTab === tab) return;
    Animated.spring(tabSlide, { toValue: newTab === 'all' ? 0 : 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    setTab(newTab);
    setFilterType(null);
  };

  const tabTranslateX = tabSlide.interpolate({ inputRange: [0, 1], outputRange: [0, tabWidth] });

  const fetchFeed = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setFeedLoading(true);
      else setFeedLoadingMore(true);

      log(`fetchFeed → page=${pageNum} reset=${reset}`);

      const res = await getFeed({ page: pageNum, limit: 10 });

      log('getFeed raw response:', JSON.stringify(res.data, null, 2));

      const items = res.data?.data || [];
      const total = res.data?.total || 0;

      const typeSummary = items.reduce((acc, i) => {
        const t = i.type || 'MISSING';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});
      log(`fetchFeed → received ${items.length} items, total=${total}, types:`, typeSummary);

      items.forEach((item, idx) => {
        if (!item.type) logError(`Item at index ${idx} is missing 'type' field:`, item);
      });

      setFeedHasMore(items.length === 10 && pageNum * 10 < total);
      setFeedPage(pageNum);

      if (reset || pageNum === 1) setFeedItems(items);
      else setFeedItems(prev => [...prev, ...items]);
    } catch (e) {
      logError('fetchFeed failed:', e);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load feed');
    } finally {
      setFeedLoading(false);
      setFeedLoadingMore(false);
    }
  }, []);

  const fetchMyPosts = useCallback(async () => {
    try {
      setMyLoading(true);

      const [oppRes, eventRes] = await Promise.all([
        getMyOpportunities().catch(err => { logError('getMyOpportunities failed:', err); return { data: [] }; }),
        getMyEvents().catch(err => { logError('getMyEvents failed:', err); return { data: [] }; }),
      ]);

      const opps = (Array.isArray(oppRes.data) ? oppRes.data : []).map(o => ({
        ...o,
        _source: 'opportunity',
        type: 'opportunity',
      }));

      // ✅ Filter to only events YOU hosted
      const allEvents = Array.isArray(eventRes.data) ? eventRes.data : [];
      const myOwnedEvents = allEvents.filter(e => {
        const host = e.host;
        if (!host || !userData) return false;
        return (
          host.id === userData.id ||
          host.username === userData.username
        );
      });

      const events = myOwnedEvents.map(e => ({
        ...e,
        _source: 'event',
        type: 'event',
      }));

      log(`fetchMyPosts → ${opps.length} opportunities, ${events.length} owned events (filtered from ${allEvents.length})`);

      const merged = [...opps, ...events].sort((a, b) => {
        const aDate = a.posted_at || a.created_at || a.date || '';
        const bDate = b.posted_at || b.created_at || b.date || '';
        return new Date(bDate) - new Date(aDate);
      });

      setMyItems(merged);
    } catch (err) {
      logError('fetchMyPosts unexpected error:', err);
      Alert.alert('Error', 'Failed to load your posts');
    } finally {
      setMyLoading(false);
    }
  }, [userData]); // ← add userData to deps

  useFocusEffect(useCallback(() => {
    if (tab === 'all') fetchFeed(1, true);
    else fetchMyPosts();
  }, [tab, fetchFeed, fetchMyPosts])); // already correct, no change needed

  const handleDelete = (itemType, id) => {
    Alert.alert(
      `Delete ${itemType === 'event' ? 'Event' : 'Opportunity'}`,
      'This will permanently remove this post.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              log(`handleDelete → type=${itemType} id=${id}`);
              if (itemType === 'event') await deleteEvent(id);
              else await deleteOpportunity(id);
              setMyItems(prev => prev.filter(i => i.id !== id));
              setFeedItems(prev => prev.filter(i => i.id !== id));
            } catch (err) {
              logError('handleDelete failed:', err);
              Alert.alert('Error', 'Failed to delete. Please try again.');
            }
          },
        },
      ],
    );
  };

  const loadMore = () => {
    if (tab === 'all' && feedHasMore && !feedLoadingMore && !feedLoading) {
      log(`loadMore → fetching page ${feedPage + 1}`);
      fetchFeed(feedPage + 1);
    }
  };

  const activeLoading = tab === 'all' ? feedLoading : myLoading;
  const activeLoadingMore = tab === 'all' ? feedLoadingMore : false;

  const displayData = useMemo(() => {
    const source = tab === 'all' ? feedItems : myItems;
    if (!filterType) {
      log(`displayData → no filter, showing all ${source.length} items`);
      return source;
    }
    const filtered = source.filter(item => {
      const t = (item.type || item._source || '').toLowerCase().trim();
      return t === filterType;
    });
    log(`displayData → filter="${filterType}" matched ${filtered.length}/${source.length} items`);
    return filtered;
  }, [tab, feedItems, myItems, filterType]);

  // ── My Posts filter chips — only opportunities & events (no announcements) ──
  const myFilterChips = [
    { label: 'All', key: null, icon: null },
    { label: 'Opportunities', key: 'opportunity', icon: 'briefcase-outline' },
    { label: 'Events', key: 'event', icon: 'calendar-outline' },
  ];

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>Opportunities</Text>
        </View>

        <View style={s.tabs} onLayout={e => setTabWidth(e.nativeEvent.layout.width / 2)}>
          <TouchableOpacity style={s.tabBtn} onPress={() => switchTab('all')}>
            <Text style={[s.tabText, tab === 'all' && s.tabTextActive]}>All Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tabBtn} onPress={() => switchTab('my')}>
            <Text style={[s.tabText, tab === 'my' && s.tabTextActive]}>My Posts</Text>
          </TouchableOpacity>
          <Animated.View style={[s.tabIndicator, { width: tabWidth, transform: [{ translateX: tabTranslateX }] }]} />
        </View>
      </View>

      {/* ── Type filter chips ───────────────────────────────────────────────── */}
      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {tab === 'all' ? (
            // All Posts tab: includes announcements
            <>
              <FilterChip label="All" active={!filterType} onPress={() => setFilterType(null)} />
              <FilterChip
                label="Opportunities" icon="briefcase-outline"
                active={filterType === 'opportunity'}
                onPress={() => setFilterType('opportunity')}
                onClear={() => setFilterType(null)}
              />
              <FilterChip
                label="Events" icon="calendar-outline"
                active={filterType === 'event'}
                onPress={() => setFilterType('event')}
                onClear={() => setFilterType(null)}
              />
              <FilterChip
                label="Announcements" icon="megaphone-outline"
                active={filterType === 'announcement'}
                onPress={() => setFilterType('announcement')}
                onClear={() => setFilterType(null)}
              />
            </>
          ) : (
            // My Posts tab: only opportunities & events
            myFilterChips.map(chip => (
              <FilterChip
                key={chip.label}
                label={chip.label}
                icon={chip.icon}
                active={filterType === chip.key}
                onPress={() => setFilterType(chip.key)}
                onClear={chip.key ? () => setFilterType(null) : undefined}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {activeLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item, idx) => `${item.type || item._source || 'unknown'}-${item.id ?? idx}`}
          renderItem={({ item }) => (
            <FeedItem
              item={item}
              navigation={navigation}
              isMyTab={tab === 'my'}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={s.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          // ListHeaderComponent={tab === 'my' && myItems.length > 0 ? <StatsBar data={myItems} /> : null}
          ListFooterComponent={
            activeLoadingMore ? (
              <ActivityIndicator size="small" color={C.primary} style={s.moreLoader} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              isMyTab={tab === 'my'}
              filterType={filterType}
              onPost={() => navigation.navigate('PostOpportunity')}
            />
          }
        />
      )}

      {/* ── Expandable FAB ─────────────────────────────────────────────────── */}
      <ExpandableFab
        onPostOpportunity={() => navigation.navigate('PostOpportunity')}
        onCreateEvent={() => navigation.navigate('CreateEvent')}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingTop: 32,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: -0.3 },

  tabs: { flexDirection: 'row', position: 'relative' },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', color: C.subtext },
  tabTextActive: { color: C.primary },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2.5, backgroundColor: C.primary, borderRadius: 2 },

  filterBar: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },

  list: { paddingBottom: 100 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  moreLoader: { marginVertical: 20 },
});