import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { getAllSkills, getFeed } from '../../services/api';

const { width } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  green: '#10B981',
  greenSoft: '#D1FAE5',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  blue: '#2563EB',
  blueSoft: '#DBEAFE',
  coral: '#DC2626',
  coralSoft: '#FEE2E2',
  purple: '#7C3AED',
  purpleSoft: '#EDE9FE',
  teal: '#0D9488',
  tealSoft: '#CCFBF1',
  orange: '#EA580C',
  orangeSoft: '#FFEDD5',
};

// ─── Opportunity type config ──────────────────────────────────────────────────
const OPP_TYPE_META = {
  job:         { label: 'Job',        color: C.green,  bg: C.greenSoft,  icon: 'briefcase'      },
  internship:  { label: 'Internship', color: C.amber,  bg: C.amberSoft,  icon: 'school'         },
  freelance:   { label: 'Freelance',  color: C.purple, bg: C.purpleSoft, icon: 'laptop-outline' },
  'full-time': { label: 'Full-time',  color: C.green,  bg: C.greenSoft,  icon: 'briefcase'      },
  'part-time': { label: 'Part-time',  color: C.blue,   bg: C.blueSoft,   icon: 'time-outline'   },
};

const getOppTypeMeta = (type = '') =>
  OPP_TYPE_META[type?.toLowerCase()] ?? {
    label: type,
    color: C.muted,
    bg: C.divider,
    icon: 'briefcase-outline',
  };

// ─── Feed type config ─────────────────────────────────────────────────────────
const FEED_TYPE_META = {
  announcement: { label: 'Announcement', color: C.orange,  bg: C.orangeSoft, icon: 'megaphone-outline'  },
  opportunity:  { label: 'Opportunity',  color: C.primary, bg: C.primarySoft, icon: 'briefcase-outline' },
  event:        { label: 'Event',        color: C.teal,    bg: C.tealSoft,    icon: 'calendar-outline'  },
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

const daysUntil = deadline => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
};

const formatDate = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateTime = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isExpired = deadline => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

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

// ─── Author Footer ────────────────────────────────────────────────────────────
function AuthorFooter({ author, postedAt }) {
  if (!author) return null;
  return (
    <View style={af.wrap}>
      <MiniAvatar name={author.display_name || ''} uri={author.profile_picture} size={24} />
      <Text style={af.name} numberOfLines={1}>{author.display_name}</Text>
      {postedAt && <Text style={af.date}>· {formatDate(postedAt)}</Text>}
    </View>
  );
}
const af = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  name: { fontSize: 12, color: C.subtext, fontWeight: '600', maxWidth: 130 },
  date: { fontSize: 11, color: C.muted },
});

// ─── Feed Type Badge ──────────────────────────────────────────────────────────
function FeedTypeBadge({ type }) {
  const meta = FEED_TYPE_META[type] ?? { label: type, color: C.muted, bg: C.divider, icon: 'alert-circle-outline' };
  return (
    <View style={[ftb.badge, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={11} color={meta.color} />
      <Text style={[ftb.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}
const ftb = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  text:  { fontSize: 11, fontWeight: '700' },
});

// ─── HTML Preview ─────────────────────────────────────────────────────────────
// Renders rich-text HTML from the editor, clipped to ~3 lines for card previews.
// Used for announcement description, event description, opportunity body.
function HtmlPreview({ html, color = C.subtext }) {
  const { width: winWidth } = useWindowDimensions();
  // Subtract card horizontal margin (16×2) + body padding (16×2)
  const contentWidth = winWidth - 64;

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
    // maxHeight clips to ~3 lines (19px lineHeight × 3 + small buffer)
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

// ─── ANNOUNCEMENT CARD ────────────────────────────────────────────────────────
function AnnouncementCard({ item, onPress }) {
  const htmlDescription = item.description || item.body || null;

  return (
    <TouchableOpacity style={anc.wrap} onPress={onPress} activeOpacity={0.82}>
      {/* Orange left accent bar — absolute so it doesn't break column layout */}
      <View style={anc.accentBar} />

      {/* Inner column: image on top, body below */}
      <View style={anc.inner}>
        {/* Show image whenever media_url exists — don't gate on media_type */}
        {item.media_url ? (
          <Image source={{ uri: item.media_url }} style={anc.media} resizeMode="cover" />
        ) : null}

        <View style={anc.body}>
          <View style={anc.topRow}>
            <FeedTypeBadge type="announcement" />
            <View style={{ flex: 1 }} />
            <Text style={anc.date}>{formatDate(item.created_at)}</Text>
          </View>

          <Text style={anc.title} numberOfLines={2}>{item.title}</Text>

          {/* Render HTML — never show raw tags */}
          {htmlDescription ? <HtmlPreview html={htmlDescription} /> : null}

          <View style={anc.divider} />

          <View style={anc.footer}>
            <AuthorFooter author={item.author} postedAt={item.created_at} />
            <View style={anc.readBtn}>
              <Text style={anc.readText}>Read</Text>
              <Ionicons name="arrow-forward" size={13} color={C.orange} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const anc = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    // ← NO flexDirection: 'row' here — that was breaking image layout
  },
  // Orange bar sits absolute on the left edge
  accentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: C.orange,
    zIndex: 1,
  },
  // Column container inside the card (after accent bar)
  inner: { flex: 1 },
  media: { width: '100%', height: 130 },
  body:  { padding: 16, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date:  { fontSize: 11, color: C.muted, fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 24 },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 4 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.orangeSoft, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  readText: { fontSize: 12, fontWeight: '700', color: C.orange },
});

// ─── EVENT CARD ───────────────────────────────────────────────────────────────
function EventCard({ item, onPress }) {
  const eventDate = item.event_date ? new Date(item.event_date) : null;
  const isPast    = eventDate && eventDate < new Date();
  const spotsLeft = item.max_attendees && item.attendee_count !== undefined
    ? item.max_attendees - item.attendee_count : null;
  const isFull    = spotsLeft !== null && spotsLeft <= 0;
  const htmlDescription = item.description || null;

  return (
    <TouchableOpacity style={[evc.wrap, isPast && evc.wrapPast]} onPress={onPress} activeOpacity={0.82}>

      {/* ── Media + date bubble MUST be wrapped together so position:absolute works ── */}
      {item.media_url ? (
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: item.media_url }} style={evc.media} resizeMode="cover" />
          {/* Date bubble overlays the image */}
          {eventDate && (
            <View style={evc.dateBubble}>
              <Text style={evc.dateBubbleMonth}>
                {eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
              </Text>
              <Text style={evc.dateBubbleDay}>{eventDate.getDate()}</Text>
            </View>
          )}
          {/* Past overlay */}
          {isPast && (
            <View style={evc.pastOverlay}>
              <Text style={evc.pastOverlayText}>Past Event</Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={evc.body}>
        <View style={evc.topRow}>
          <FeedTypeBadge type="event" />
          {!isPast && isFull ? (
            <View style={[db.badge, { backgroundColor: C.coralSoft }]}>
              <Text style={[db.text, { color: C.coral }]}>Full</Text>
            </View>
          ) : null}
        </View>

        <Text style={[evc.title, isPast && evc.titlePast]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={evc.metaRow}>
          {item.location ? (
            <View style={evc.metaItem}>
              <Ionicons name="location-outline" size={13} color={C.muted} />
              <Text style={evc.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
          {eventDate ? (
            <View style={evc.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={C.muted} />
              <Text style={evc.metaText}>{formatDateTime(item.event_date)}</Text>
            </View>
          ) : null}
        </View>

        {/* Render HTML description */}
        {htmlDescription ? <HtmlPreview html={htmlDescription} /> : null}

        {/* Attendee progress bar */}
        {item.max_attendees && item.attendee_count !== undefined ? (
          <View style={evc.attendeeRow}>
            <View style={evc.progressTrack}>
              <View style={[evc.progressFill, {
                width: `${Math.min((item.attendee_count / item.max_attendees) * 100, 100)}%`,
                backgroundColor: isFull ? C.coral : C.teal,
              }]} />
            </View>
            <Text style={evc.attendeeText}>
              {item.attendee_count}/{item.max_attendees} attending
            </Text>
          </View>
        ) : item.attendee_count ? (
          <View style={evc.metaItem}>
            <Ionicons name="people-outline" size={13} color={C.muted} />
            <Text style={evc.metaText}>{item.attendee_count} attending</Text>
          </View>
        ) : null}

        <View style={evc.divider} />

        <View style={evc.footer}>
          <AuthorFooter author={item.author} postedAt={item.created_at} />
          <View style={[evc.rsvpBtn, isPast && evc.rsvpBtnPast]}>
            <Text style={[evc.rsvpText, isPast && evc.rsvpTextPast]}>
              {isPast ? 'View' : 'RSVP'}
            </Text>
            <Ionicons name="arrow-forward" size={13} color={isPast ? C.muted : C.teal} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const evc = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  wrapPast: { opacity: 0.7 },
  media: { width: '100%', height: 130 },
  dateBubble: {
    position: 'absolute',
    top: 12, left: 12,
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBubbleMonth: { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 0.5 },
  dateBubbleDay:   { fontSize: 20, fontWeight: '800', color: C.text, lineHeight: 22 },
  // Past overlay badge on top-right of image
  pastOverlay: {
    position: 'absolute',
    top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pastOverlayText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body:     { padding: 16, gap: 10 },
  topRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:    { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 24 },
  titlePast:{ color: C.muted },
  metaRow:  { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.muted, maxWidth: 180 },
  attendeeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: C.divider, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },
  attendeeText:  { fontSize: 11, color: C.muted, fontWeight: '500' },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 4 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rsvpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.tealSoft, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  rsvpBtnPast: { backgroundColor: C.divider },
  rsvpText:    { fontSize: 12, fontWeight: '700', color: C.teal },
  rsvpTextPast:{ color: C.muted },
});

// ─── OPPORTUNITY CARD ─────────────────────────────────────────────────────────
function OpportunityCard({ item, onPress }) {
  const meta     = getOppTypeMeta(item.opportunity_type);
  const company  = item.company_name || item.company;
  const mediaUri = item.media_url || item.media?.[0];
  const closed   = isExpired(item.deadline);
  const htmlDescription = item.description || item.body || null;

  return (
    <TouchableOpacity style={[opc.wrap, closed && opc.wrapClosed]} onPress={onPress} activeOpacity={0.82}>
      {mediaUri && (
        <Image source={{ uri: mediaUri }} style={opc.mediaStrip} resizeMode="cover" />
      )}

      <View style={opc.body}>
        <View style={opc.topRow}>
          <FeedTypeBadge type="opportunity" />
          <View style={[opc.typeBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[opc.typeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {item.is_remote && (
            <View style={opc.remoteBadge}>
              <Ionicons name="globe-outline" size={11} color={C.teal} />
              <Text style={opc.remoteText}>Remote</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <DeadlineBadge deadline={item.deadline} />
        </View>

        <Text style={[opc.title, closed && opc.titleClosed]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={opc.metaRow}>
          {company ? (
            <View style={opc.metaItem}>
              <Ionicons name="business-outline" size={13} color={C.muted} />
              <Text style={opc.metaText} numberOfLines={1}>{company}</Text>
            </View>
          ) : null}
          {item.location ? (
            <View style={opc.metaItem}>
              <Ionicons name="location-outline" size={13} color={C.muted} />
              <Text style={opc.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>

        {/* Render HTML description */}
        {htmlDescription ? <HtmlPreview html={htmlDescription} /> : null}

        <View style={opc.divider} />

        <View style={opc.footer}>
          <AuthorFooter author={item.author} postedAt={item.created_at} />
          <View style={[opc.applyBtn, closed && opc.applyBtnClosed]}>
            <Text style={[opc.applyText, closed && opc.applyTextClosed]}>
              {closed ? 'Closed' : 'Apply'}
            </Text>
            {!closed && <Ionicons name="arrow-forward" size={13} color={C.primary} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const opc = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  wrapClosed:   { opacity: 0.65 },
  mediaStrip:   { width: '100%', height: 130 },
  body:         { padding: 16, gap: 10 },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  typeText:     { fontSize: 11, fontWeight: '700' },
  remoteBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.tealSoft },
  remoteText:   { fontSize: 11, fontWeight: '700', color: C.teal },
  title:        { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 24 },
  titleClosed:  { color: C.muted },
  metaRow:      { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: 12, color: C.muted, maxWidth: 140 },
  divider:      { height: 1, backgroundColor: C.divider, marginVertical: 4 },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  applyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  applyBtnClosed: { backgroundColor: C.divider },
  applyText:    { fontSize: 12, fontWeight: '700', color: C.primary },
  applyTextClosed: { color: C.muted },
});

// ─── Feed Item Router ─────────────────────────────────────────────────────────
function FeedItem({ item, navigation }) {
  const type = (item.type || '').toLowerCase().trim();

  switch (type) {
    case 'announcement':
      return (
        <AnnouncementCard
          item={item}
          onPress={() => navigation.navigate('AnnouncementDetail', { id: item.id, item })}
        />
      );
    case 'event':
      return (
        <EventCard
          item={item}
          onPress={() => navigation.navigate('EventDetail', { id: item.id })}
        />
      );
    case 'opportunity':
      return (
        <OpportunityCard
          item={item}
          onPress={() => navigation.navigate('OpportunityDetail', { id: item.id })}
        />
      );
    default:
      return (
        <View style={fallback.wrap}>
          <Text style={fallback.text}>{item.title || 'Unknown item'}</Text>
        </View>
      );
  }
}

const fallback = StyleSheet.create({
  wrap: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 14, padding: 16 },
  text: { fontSize: 14, color: C.muted },
});

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function Chip({ label, active, onPress, onClear, icon }) {
  return (
    <TouchableOpacity style={[ch.chip, active && ch.active]} onPress={onPress} activeOpacity={0.75}>
      {icon && <Ionicons name={icon} size={14} color={active ? C.primary : C.muted} />}
      <Text style={[ch.text, active && ch.textActive]}>{label}</Text>
      {active && onClear && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
          <Ionicons name="close-circle" size={14} color={C.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
const ch = StyleSheet.create({
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.card, marginRight: 10 },
  active:     { borderColor: C.primary, backgroundColor: C.primarySoft },
  text:       { fontSize: 13, color: C.muted, fontWeight: '500' },
  textActive: { color: C.primary, fontWeight: '600' },
});

// ─── Skill Sheet ──────────────────────────────────────────────────────────────
function SkillSheet({ visible, skills, selected, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered  = skills.filter(s => s.toLowerCase().includes(q.toLowerCase()));
  if (!visible) return null;

  return (
    <View style={sk.overlay}>
      <TouchableOpacity style={sk.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={sk.sheet}>
        <View style={sk.handle} />
        <Text style={sk.title}>Filter by Skill</Text>
        <View style={sk.searchWrap}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            style={sk.searchInput}
            placeholder="Search skills..."
            placeholderTextColor={C.muted}
            value={q}
            onChangeText={setQ}
            autoFocus
          />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
          <TouchableOpacity style={sk.item} onPress={() => { onSelect(null); onClose(); }}>
            <Text style={[sk.itemText, !selected && sk.itemActive]}>All Skills</Text>
            {!selected && <Ionicons name="checkmark" size={16} color={C.primary} />}
          </TouchableOpacity>
          {filtered.map(skill => (
            <TouchableOpacity key={skill} style={sk.item} onPress={() => { onSelect(skill); onClose(); }}>
              <Text style={[sk.itemText, selected === skill && sk.itemActive]}>{skill}</Text>
              {selected === skill && <Ionicons name="checkmark" size={16} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
const sk = StyleSheet.create({
  overlay:  { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
  title:  { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.text },
  item:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
  itemText: { fontSize: 15, color: C.subtext, fontWeight: '500' },
  itemActive: { color: C.primary, fontWeight: '600' },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onClear }) {
  return (
    <View style={em.wrap}>
      <View style={em.iconWrap}>
        <Ionicons name="newspaper-outline" size={40} color={C.muted} />
      </View>
      <Text style={em.title}>{hasFilters ? 'No matches found' : 'Nothing in your feed yet'}</Text>
      <Text style={em.sub}>
        {hasFilters
          ? 'Try adjusting your filters'
          : 'Check back later for new opportunities, events, and announcements'}
      </Text>
      {hasFilters && (
        <TouchableOpacity style={em.btn} onPress={onClear}>
          <Text style={em.btnText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const em = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  iconWrap:{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  title:   { fontSize: 18, fontWeight: '700', color: C.subtext },
  sub:     { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  btn:     { borderWidth: 1.5, borderColor: C.primary, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, marginTop: 12 },
  btnText: { fontSize: 14, fontWeight: '600', color: C.primary },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function FeedScreen({ navigation }) {
  const [feedItems, setFeedItems]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);

  const [filterType, setFilterType]   = useState(null);
  const [filterSkill, setFilterSkill] = useState(null);
  const [skillSheet, setSkillSheet]   = useState(false);
  const [skills, setSkills]           = useState([]);

  const LIMIT = 10;

  const activeFilters = [filterType, filterSkill].filter(Boolean).length;

  useEffect(() => {
    getAllSkills()
      .then(r => setSkills(r.data || []))
      .catch(() => {});
  }, []);

  const fetchFeed = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = { page: pageNum, limit: LIMIT };
      if (filterType)  params.type  = filterType;
      if (filterSkill && filterType === 'opportunity') params.skill = filterSkill;

      const res   = await getFeed(params);
      const items = res.data?.data || [];
      const total = res.data?.total || 0;

      setHasMore(items.length === LIMIT && pageNum * LIMIT < total);
      setPage(pageNum);

      if (reset || pageNum === 1) setFeedItems(items);
      else setFeedItems(prev => [...prev, ...items]);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterType, filterSkill]);

  useFocusEffect(useCallback(() => {
    fetchFeed(1, true);
  }, [fetchFeed]));

  const loadMore = () => {
    if (hasMore && !loadingMore && !loading) fetchFeed(page + 1);
  };

  const clearFilters = () => {
    setFilterType(null);
    setFilterSkill(null);
  };

  // ── List Header — defined outside render to avoid remount flicker ──────────
  // NOTE: defined as a variable (not a component) so FlatList doesn't remount it
  const listHeader = (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipScroll}>
        <Chip label="All" active={!filterType} onPress={() => setFilterType(null)} />
        <Chip
          label="Opportunities" icon="briefcase-outline"
          active={filterType === 'opportunity'}
          onPress={() => setFilterType('opportunity')}
          onClear={() => setFilterType(null)}
        />
        <Chip
          label="Events" icon="calendar-outline"
          active={filterType === 'event'}
          onPress={() => setFilterType('event')}
          onClear={() => setFilterType(null)}
        />
        <Chip
          label="Announcements" icon="megaphone-outline"
          active={filterType === 'announcement'}
          onPress={() => setFilterType('announcement')}
          onClear={() => setFilterType(null)}
        />
      </ScrollView>

      {filterType === 'opportunity' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.chipScroll, { paddingTop: 0, paddingBottom: 12 }]}>
          <Chip
            label={filterSkill ? `Skill: ${filterSkill}` : 'Filter by Skill'}
            icon="code-slash-outline"
            active={!!filterSkill}
            onPress={() => setSkillSheet(true)}
            onClear={() => setFilterSkill(null)}
          />
          {activeFilters > 0 && (
            <TouchableOpacity onPress={clearFilters} style={s.clearAll}>
              <Ionicons name="refresh-outline" size={14} color={C.coral} />
              <Text style={s.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <View style={s.listLabelRow}>
        <Text style={s.listLabel}>
          {filterType
            ? `${filterType.charAt(0).toUpperCase()}${filterType.slice(1)}s`
            : 'All Updates'}
        </Text>
        {activeFilters > 0 && (
          <View style={s.filterCountBadge}>
            <Text style={s.filterCountText}>
              {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Feed</Text>
            <Text style={s.headerSub}>Opportunities, events & announcements</Text>
          </View>
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading your feed...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Feed</Text>
          <Text style={s.headerSub}>Opportunities, events & announcements</Text>
        </View>
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={(item, i) => `${item.type}-${item.id || i}`}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={s.footerLoader}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={s.footerLoaderText}>Loading more...</Text>
            </View>
          ) : !hasMore && feedItems.length > 0 ? (
            <Text style={s.endText}>You're all caught up</Text>
          ) : null
        }
        ListEmptyComponent={<EmptyState hasFilters={activeFilters > 0} onClear={clearFilters} />}
        renderItem={({ item }) => <FeedItem item={item} navigation={navigation} />}
      />

      <SkillSheet
        visible={skillSheet}
        skills={skills}
        selected={filterSkill}
        onSelect={setFilterSkill}
        onClose={() => setSkillSheet(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5, paddingTop: 8 },
  headerSub:   { fontSize: 13, color: C.muted, marginTop: 2 },

  chipScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, alignItems: 'center' },
  clearAll:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  clearAllText: { fontSize: 12, color: C.coral, fontWeight: '600' },

  listLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  listLabel: { fontSize: 14, fontWeight: '600', color: C.subtext },
  filterCountBadge: { backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  filterCountText:  { fontSize: 11, fontWeight: '600', color: C.primary },

  listContent:    { paddingHorizontal: 16, paddingBottom: 40 },
  footerLoader:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 24 },
  footerLoaderText: { fontSize: 13, color: C.muted },
  endText:        { textAlign: 'center', fontSize: 12, color: C.muted, paddingVertical: 24 },
  loadingWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:    { fontSize: 14, color: C.muted },
});