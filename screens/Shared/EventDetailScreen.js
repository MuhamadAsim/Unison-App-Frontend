import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useContext, useState } from 'react';
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
  useWindowDimensions
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { AuthContext } from '../../context/AuthContext';
import {
  cancelRsvp,
  deleteEvent,
  getEventAttendees,
  getEventById,
  rsvpEvent,
} from '../../services/api';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  primary: '#534AB7',
  primaryDark: '#3B34A0',
  primarySoft: '#EEEDFE',
  primaryBorder: '#C4BFEF',
  bg: '#F4F4F8',
  card: '#FFFFFF',
  divider: '#F3F4F6',
  text: '#111827',
  subtext: '#374151',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  teal: '#0D9488',
  tealSoft: '#CCFBF1',
  tealBorder: '#99F6E4',
  green: '#059669',
  greenSoft: '#ECFDF5',
  greenBorder: '#6EE7B7',
  coral: '#DC2626',
  coralSoft: '#FEF2F2',
  coralBorder: '#FCA5A5',
  amber: '#D97706',
  amberSoft: '#FFFBEB',
  amberBorder: '#FCD34D',
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
  return new Date(d).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatShort = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isPast = date => date && new Date(date) < new Date();

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ icon, label, color, bg, border }) {
  return (
    <View style={[badge.wrap, { backgroundColor: bg, borderColor: border }]}>
      {icon && <Ionicons name={icon} size={11} color={color} />}
      <Text style={[badge.text, { color }]}>{label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: '600' },
});

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <View style={sec.card}>
      <View style={sec.header}>
        <View style={sec.iconWrap}>
          <Ionicons name={icon} size={16} color={C.teal} />
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
    backgroundColor: C.tealSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: C.text },
});

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, last = false, onPress }) {
  if (!value) return null;
  const content = (
    <View style={[dr.row, !last && dr.border]}>
      <View style={dr.iconWrap}>
        <Ionicons name={icon} size={16} color={C.teal} />
      </View>
      <View style={dr.content}>
        <Text style={dr.label}>{label}</Text>
        <Text style={[dr.value, onPress && { color: C.teal, textDecorationLine: 'underline' }]}>
          {value}
        </Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={16} color={C.teal} />}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  return content;
}
const dr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.tealSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  label: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: { fontSize: 14, color: C.text, fontWeight: '600', marginTop: 1 },
});

// ─── Attendee Avatar ──────────────────────────────────────────────────────────
function AttendeeAvatar({ item }) {
  const [err, setErr] = useState(false);
  const letter = (item.display_name || 'U').charAt(0).toUpperCase();
  if (item.profile_picture && !err) {
    return (
      <Image
        source={{ uri: item.profile_picture }}
        style={att.avatar}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={[att.avatar, att.fallback]}>
      <Text style={att.letter}>{letter}</Text>
    </View>
  );
}
const att = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.tealSoft },
  fallback: { justifyContent: 'center', alignItems: 'center' },
  letter: { fontSize: 18, fontWeight: '700', color: C.teal },
});

// ─── RSVP Button ─────────────────────────────────────────────────────────────
function RsvpButton({ status, loadingStatus, onPress, isFull, eventPast }) {
  // loadingStatus: null | 'attending' | 'maybe' | 'cancel'

  if (eventPast) {
    return (
      <View style={rsvp.pastWrap}>
        <Ionicons name="time-outline" size={18} color={C.muted} />
        <Text style={rsvp.pastText}>This event has ended</Text>
      </View>
    );
  }

  if (status === 'attending') {
    return (
      <View style={rsvp.row}>
        <View style={rsvp.attendingBadge}>
          <Ionicons name="checkmark-circle" size={18} color={C.green} />
          <Text style={rsvp.attendingText}>You're attending</Text>
        </View>
        <TouchableOpacity
          style={rsvp.cancelBtn}
          onPress={() => onPress('cancel')}
          disabled={!!loadingStatus}>
          {loadingStatus === 'cancel' ? (
            <ActivityIndicator size="small" color={C.coral} />
          ) : (
            <Text style={rsvp.cancelText}>Cancel RSVP</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'maybe') {
    return (
      <View style={rsvp.row}>
        <View style={[rsvp.attendingBadge, { backgroundColor: C.amberSoft, borderColor: C.amberBorder }]}>
          <Ionicons name="help-circle" size={18} color={C.amber} />
          <Text style={[rsvp.attendingText, { color: C.amber }]}>Maybe attending</Text>
        </View>
        <TouchableOpacity
          style={rsvp.cancelBtn}
          onPress={() => onPress('cancel')}
          disabled={!!loadingStatus}>
          {loadingStatus === 'cancel' ? (
            <ActivityIndicator size="small" color={C.coral} />
          ) : (
            <Text style={rsvp.cancelText}>Cancel</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={rsvp.buttonRow}>
      <TouchableOpacity
        style={[rsvp.rsvpBtn, isFull && rsvp.rsvpBtnDisabled]}
        onPress={() => !isFull && !loadingStatus && onPress('attending')}
        disabled={isFull || !!loadingStatus}
        activeOpacity={0.85}>
        {loadingStatus === 'attending' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-outline" size={20} color="#fff" />
            <Text style={rsvp.rsvpBtnText}>{isFull ? 'Event Full' : "I'm Attending"}</Text>
          </>
        )}
      </TouchableOpacity>
      {!isFull && (
        <TouchableOpacity
          style={[rsvp.maybeBtn, loadingStatus === 'maybe' && { opacity: 0.7 }]}
          onPress={() => !loadingStatus && onPress('maybe')}
          disabled={!!loadingStatus}
          activeOpacity={0.8}>
          {loadingStatus === 'maybe' ? (
            <ActivityIndicator size="small" color={C.amber} />
          ) : (
            <Text style={rsvp.maybeBtnText}>Maybe</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
const rsvp = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  attendingBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: C.greenBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  attendingText: { fontSize: 15, fontWeight: '700', color: C.green },
  cancelBtn: {
    backgroundColor: C.coralSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.coralBorder,
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.coral },
  buttonRow: { flexDirection: 'row', gap: 10 },
  rsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.teal,
    borderRadius: 14,
    paddingVertical: 16,
  },
  rsvpBtnDisabled: { backgroundColor: C.muted },
  rsvpBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  maybeBtn: {
    backgroundColor: C.amberSoft,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: C.amberBorder,
  },
  maybeBtnText: { fontSize: 15, fontWeight: '700', color: C.amber },
  pastWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.divider,
    borderRadius: 14,
    paddingVertical: 16,
  },
  pastText: { fontSize: 15, fontWeight: '600', color: C.muted },
});

// ─── HTML Styles for description ──────────────────────────────────────────────
const htmlTagsStyles = {
  body: { color: C.subtext, fontSize: 14, lineHeight: 23 },
  p: { color: C.subtext, fontSize: 14, lineHeight: 23, marginTop: 0, marginBottom: 8 },
  span: { color: C.subtext, fontSize: 14 },
  strong: { color: C.text, fontWeight: '700' },
  b: { color: C.text, fontWeight: '700' },
  em: { fontStyle: 'italic' },
  i: { fontStyle: 'italic' },
  ul: { marginLeft: 4, marginTop: 0, marginBottom: 8 },
  ol: { marginLeft: 4, marginTop: 0, marginBottom: 8 },
  li: { fontSize: 14, lineHeight: 23, color: C.subtext },
  a: { color: C.primary, textDecorationLine: 'underline' },
  h1: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 6, marginTop: 0 },
  h2: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 5, marginTop: 0 },
  h3: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4, marginTop: 0 },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EventDetailScreen({ route, navigation }) {
  const { userData } = useContext(AuthContext);
  const { id } = route.params;
  const { width } = useWindowDimensions();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoadingStatus, setRsvpLoadingStatus] = useState(null); // null | 'attending' | 'maybe' | 'cancel'
  const [showAttendees, setShowAttendees] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evRes, attRes] = await Promise.all([
        getEventById(id),
        getEventAttendees(id),
      ]);
      setEvent(evRes.data);
      setAttendees(attRes.data || []);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [id]));

  // ── RSVP handler ──────────────────────────────────────────────────────────
const handleRsvp = async (action) => {
  try {
    setRsvpLoadingStatus(action);
    if (action === 'cancel') {
      await cancelRsvp(id);
    } else {
      await rsvpEvent(id, { status: action });
    }
    // Refetch event & attendees to get accurate counts
    const [evRes, attRes] = await Promise.all([
      getEventById(id),
      getEventAttendees(id),
    ]);
    setEvent(evRes.data);
    setAttendees(attRes.data || []);
  } catch (e) {
    Alert.alert('Error', e?.response?.data?.message || 'Failed to update RSVP');
  } finally {
    setRsvpLoadingStatus(null);
  }
};

  // ── Delete handler (host only) ────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert('Cancel Event', 'This will permanently remove the event.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(id);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete event.');
          }
        },
      },
    ]);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Event Details</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={s.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Event Details</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <Ionicons name="calendar-outline" size={48} color={C.teal} />
          <Text style={s.emptyTitle}>Event not found</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchData}>
            <Text style={s.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const eventDate = event.date || event.event_date;
  const eventPast = isPast(eventDate);
  const isFull =
    event.max_attendees &&
    event.attendee_count >= event.max_attendees &&
    !event.my_rsvp_status;

  // Who is the host? API uses `host` with nested fields
  const host = event.host;
  const isOwner =
    host &&
    userData &&
    (host.id === userData.id ||
      host.username === userData.username);

  const spotsLeft = event.max_attendees
    ? event.max_attendees - (event.attendee_count || 0)
    : null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Event Details</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Banner ──────────────────────────────────────────────────────── */}
        {event.banner_url || event.media_url ? (
          <View style={s.bannerWrap}>
            <Image
              source={{ uri: event.banner_url || event.media_url }}
              style={s.banner}
              resizeMode="cover"
            />
            {eventPast && (
              <View style={s.pastOverlay}>
                <Text style={s.pastOverlayText}>Past Event</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <View style={s.hero}>
          {/* Date bubble */}
          {eventDate && (
            <View style={s.dateBubble}>
              <Text style={s.dateBubbleMonth}>
                {new Date(eventDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
              </Text>
              <Text style={s.dateBubbleDay}>{new Date(eventDate).getDate()}</Text>
            </View>
          )}

          <View style={s.heroContent}>
            {/* Badges */}
            <View style={s.badgeRow}>
              {event.type && (
                <Badge
                  label={event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                  color={C.teal}
                  bg={C.tealSoft}
                  border={C.tealBorder}
                />
              )}
              {event.is_online && (
                <Badge icon="globe-outline" label="Online" color={C.primary} bg={C.primarySoft} border={C.primaryBorder} />
              )}
              {eventPast && (
                <Badge label="Ended" color={C.muted} bg={C.divider} border={C.border} />
              )}
              {isFull && !eventPast && (
                <Badge icon="lock-closed-outline" label="Full" color={C.coral} bg={C.coralSoft} border={C.coralBorder} />
              )}
            </View>

            <Text style={s.heroTitle}>{event.title}</Text>

            {/* Attendee progress */}
            {event.max_attendees ? (
              <View style={s.progressWrap}>
                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width: `${Math.min(((event.attendee_count || 0) / event.max_attendees) * 100, 100)}%`,
                        backgroundColor: isFull ? C.coral : C.teal,
                      },
                    ]}
                  />
                </View>
                <Text style={s.progressText}>
                  {event.attendee_count || 0}/{event.max_attendees} attending
                  {spotsLeft > 0 && !eventPast ? ` · ${spotsLeft} spots left` : ''}
                </Text>
              </View>
            ) : event.attendee_count ? (
              <Text style={s.attendeeCount}>
                <Ionicons name="people-outline" size={13} color={C.muted} /> {event.attendee_count} attending
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Overview ────────────────────────────────────────────────────── */}
        <Section icon="calendar-outline" title="Event Details">
          <DetailRow
            icon="calendar-outline"
            label="Date"
            value={formatDate(eventDate)}
          />
          <DetailRow
            icon="time-outline"
            label="Time"
            value={formatTime(eventDate)}
          />
          <DetailRow
            icon="location-outline"
            label="Location"
            value={event.location}
          />
          <DetailRow
            icon="globe-outline"
            label="Format"
            value={event.is_online ? 'Online Event' : 'In-person Event'}
          />
          {event.meeting_link && (
            <DetailRow
              icon="link-outline"
              label="Meeting Link"
              value={event.meeting_link}
              onPress={() => Linking.openURL(event.meeting_link).catch(() => { })}
              last
            />
          )}
          {!event.meeting_link && (
            <DetailRow
              icon="people-outline"
              label="Capacity"
              value={event.max_attendees ? `${event.max_attendees} attendees` : 'Unlimited'}
              last
            />
          )}
        </Section>

        {/* ── Description (HTML) ──────────────────────────────────────────── */}
        {event.description && event.description.trim() !== '' && (
          <Section icon="document-text-outline" title="About This Event">
            <RenderHtml
              contentWidth={width - 32} // Section padding: 16 left + 16 right = 32
              source={{ html: event.description }}
              tagsStyles={htmlTagsStyles}
              enableExperimentalBRCollapsing
              enableExperimentalGhostLinesPrevention
            />
          </Section>
        )}

        {/* ── Host ────────────────────────────────────────────────────────── */}
        {host && (
          <Section icon="person-circle-outline" title="Hosted By">
            <TouchableOpacity
              style={s.hostRow}
              onPress={() => navigation.navigate('UserProfile', { userId: host.id })}
              activeOpacity={0.8}>
              {host.profile_picture ? (
                <Image source={{ uri: host.profile_picture }} style={s.hostAvatar} />
              ) : (
                <View style={[s.hostAvatar, s.hostAvatarFallback]}>
                  <Text style={s.hostAvatarLetter}>
                    {(host.name || host.display_name || 'H').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.hostName}>{host.name || host.display_name}</Text>
                {host.username && (
                  <Text style={s.hostMeta}>@{host.username} · {host.role}</Text>
                )}
              </View>
              {isOwner && (
                <View style={s.ownerTag}>
                  <Text style={s.ownerTagText}>Your Event</Text>
                </View>
              )}
              {!isOwner && (
                <Ionicons name="chevron-forward" size={16} color={C.muted} />
              )}
            </TouchableOpacity>
          </Section>
        )}

        {/* ── Attendees preview ───────────────────────────────────────────── */}
        {attendees.length > 0 && (
          <Section icon="people-outline" title={`Attendees (${attendees.length})`}>
            <View style={s.attendeeList}>
              {attendees.slice(0, showAttendees ? attendees.length : 5).map(person => (
                <TouchableOpacity
                  key={person.id}
                  style={s.attendeeRow}
                  onPress={() => navigation.navigate('UserProfile', { userId: person.id })}
                  activeOpacity={0.75}>
                  <AttendeeAvatar item={person} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.attendeeName}>{person.display_name}</Text>
                    <Text style={s.attendeeMeta}>@{person.username} · {person.role}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={C.muted} />
                </TouchableOpacity>
              ))}
            </View>
            {attendees.length > 5 && (
              <TouchableOpacity
                style={s.showMoreBtn}
                onPress={() => setShowAttendees(!showAttendees)}>
                <Text style={s.showMoreText}>
                  {showAttendees ? 'Show less' : `Show all ${attendees.length} attendees`}
                </Text>
                <Ionicons
                  name={showAttendees ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={C.teal}
                />
              </TouchableOpacity>
            )}
          </Section>
        )}

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <View style={s.cta}>
          {isOwner ? (
            <View style={s.ownerActions}>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => navigation.navigate('EditEvent', { event })}
                activeOpacity={0.8}>
                <Ionicons name="pencil-outline" size={18} color={C.teal} />
                <Text style={s.editText}>Edit Event</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={18} color={C.coral} />
                <Text style={s.deleteText}>Cancel Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <RsvpButton
              status={event.my_rsvp_status}
              loadingStatus={rsvpLoadingStatus}   // ← changed from loading
              onPress={handleRsvp}
              isFull={!!isFull}
              eventPast={eventPast}
            />
          )}
        </View>

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
    backgroundColor: C.tealSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.tealBorder,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: C.teal },

  // Banner
  bannerWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  banner: { width: '100%', height: 200 },
  pastOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pastOverlayText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Hero
  hero: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  dateBubble: {
    backgroundColor: C.tealSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.tealBorder,
    minWidth: 52,
  },
  dateBubbleMonth: { fontSize: 11, fontWeight: '700', color: C.teal, letterSpacing: 0.5 },
  dateBubbleDay: { fontSize: 26, fontWeight: '800', color: C.teal, lineHeight: 30 },
  heroContent: { flex: 1, gap: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4, lineHeight: 26 },
  progressWrap: { gap: 6 },
  progressTrack: { height: 5, backgroundColor: C.divider, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  attendeeCount: { fontSize: 12, color: C.muted },

  // Host
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hostAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.tealSoft },
  hostAvatarFallback: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.tealBorder },
  hostAvatarLetter: { fontSize: 20, fontWeight: '700', color: C.teal },
  hostName: { fontSize: 15, fontWeight: '700', color: C.text },
  hostMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  ownerTag: {
    backgroundColor: C.tealSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.tealBorder,
  },
  ownerTagText: { fontSize: 11, fontWeight: '700', color: C.teal },

  // Attendees
  attendeeList: { gap: 4 },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  attendeeName: { fontSize: 14, fontWeight: '600', color: C.text },
  attendeeMeta: { fontSize: 12, color: C.muted, marginTop: 1 },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  showMoreText: { fontSize: 13, fontWeight: '600', color: C.teal },

  // CTA
  cta: { marginTop: 4 },
  ownerActions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.tealSoft,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
  },
  editText: { fontSize: 15, fontWeight: '700', color: C.teal },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.coralSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: C.coralBorder,
  },
  deleteText: { fontSize: 15, fontWeight: '700', color: C.coral },
});