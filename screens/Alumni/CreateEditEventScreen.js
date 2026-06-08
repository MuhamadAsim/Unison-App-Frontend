import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createEvent, getEventById, updateEvent } from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
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
  coral: '#DC2626', coralSoft: '#FEE2E2', coralBorder: '#FCA5A5',
  purple: '#7C3AED', purpleSoft: '#EDE9FE',
  teal: '#0D9488', tealSoft: '#CCFBF1',
  orange: '#EA580C', orangeSoft: '#FFEDD5',
};

const EVENT_TYPES = [
  { value: 'reunion', label: 'Reunion', icon: 'people', color: C.teal, bg: C.tealSoft },
  { value: 'webinar', label: 'Webinar', icon: 'videocam', color: C.primary, bg: C.primarySoft },
  { value: 'workshop', label: 'Workshop', icon: 'construct', color: C.blue, bg: C.blueSoft },
  { value: 'networking', label: 'Networking', icon: 'git-network', color: C.purple, bg: C.purpleSoft },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: C.muted, bg: C.divider },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDisplayDate = date =>
  `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

const formatDisplayTime = date => {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// Helper: strip HTML tags (simple, for editing)
const stripHtml = html => (html || '').replace(/<[^>]*>/g, '').trim();

// Helper: get date from various possible fields
const getEventDate = (ev) => {
  const dateStr = ev.date || ev.event_date || ev.scheduled_date;
  return dateStr ? new Date(dateStr) : null;
};

// Helper: get banner URL from various possible fields
const getBannerUrl = (ev) => ev.banner_url || ev.media_url || ev.image_url || null;

// Helper: safely convert is_online to boolean
const getIsOnline = (ev) => ev.is_online === true || ev.is_online === 'true';

// ─── Custom Date Picker Modal ─────────────────────────────────────────────────
function DatePickerModal({ visible, date, onConfirm, onCancel }) {
  const today = new Date();
  const [day, setDay] = useState(date.getDate());
  const [month, setMonth] = useState(date.getMonth());
  const [year, setYear] = useState(date.getFullYear());

  useEffect(() => {
    if (visible) { setDay(date.getDate()); setMonth(date.getMonth()); setYear(date.getFullYear()); }
  }, [visible, date]);

  const maxDay = daysInMonth(month, year);
  const safeDay = clamp(day, 1, maxDay);

  const handleConfirm = () => {
    const d = new Date(date);
    d.setFullYear(year, month, clamp(day, 1, daysInMonth(month, year)));
    onConfirm(d);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onCancel} />
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <Text style={pm.title}>Select Date</Text>

        <View style={pm.row}>
          <View style={pm.col}>
            <Text style={pm.colLabel}>Month</Text>
            <TouchableOpacity style={pm.arrow} onPress={() => setMonth(m => (m + 11) % 12)}>
              <Ionicons name="chevron-up" size={20} color={C.primary} />
            </TouchableOpacity>
            <View style={pm.valueBox}>
              <Text style={pm.value}>{MONTHS[month]}</Text>
            </View>
            <TouchableOpacity style={pm.arrow} onPress={() => setMonth(m => (m + 1) % 12)}>
              <Ionicons name="chevron-down" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={pm.col}>
            <Text style={pm.colLabel}>Day</Text>
            <TouchableOpacity style={pm.arrow} onPress={() => setDay(d => d <= 1 ? maxDay : d - 1)}>
              <Ionicons name="chevron-up" size={20} color={C.primary} />
            </TouchableOpacity>
            <View style={pm.valueBox}>
              <Text style={pm.value}>{String(safeDay).padStart(2, '0')}</Text>
            </View>
            <TouchableOpacity style={pm.arrow} onPress={() => setDay(d => d >= maxDay ? 1 : d + 1)}>
              <Ionicons name="chevron-down" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={pm.col}>
            <Text style={pm.colLabel}>Year</Text>
            <TouchableOpacity style={pm.arrow} onPress={() => setYear(y => Math.max(today.getFullYear(), y - 1))}>
              <Ionicons name="chevron-up" size={20} color={C.primary} />
            </TouchableOpacity>
            <View style={pm.valueBox}>
              <Text style={pm.value}>{year}</Text>
            </View>
            <TouchableOpacity style={pm.arrow} onPress={() => setYear(y => y + 1)}>
              <Ionicons name="chevron-down" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={pm.actions}>
          <TouchableOpacity style={pm.cancelBtn} onPress={onCancel}>
            <Text style={pm.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pm.confirmBtn} onPress={handleConfirm}>
            <Text style={pm.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TimePickerModal({ visible, date, onConfirm, onCancel }) {
  const [hour, setHour] = useState(date.getHours());
  const [minute, setMinute] = useState(date.getMinutes());

  useEffect(() => {
    if (visible) { setHour(date.getHours()); setMinute(date.getMinutes()); }
  }, [visible, date]);

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  const toggleAmPm = () => setHour(h => (h + 12) % 24);

  const handleConfirm = () => {
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    onConfirm(d);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onCancel} />
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <Text style={pm.title}>Select Time</Text>

        <View style={pm.row}>
          <View style={pm.col}>
            <Text style={pm.colLabel}>Hour</Text>
            <TouchableOpacity style={pm.arrow} onPress={() => setHour(h => h === 0 ? 23 : h - 1)}>
              <Ionicons name="chevron-up" size={20} color={C.primary} />
            </TouchableOpacity>
            <View style={pm.valueBox}>
              <Text style={pm.value}>{String(hour12).padStart(2, '0')}</Text>
            </View>
            <TouchableOpacity style={pm.arrow} onPress={() => setHour(h => (h + 1) % 24)}>
              <Ionicons name="chevron-down" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>

          <Text style={pm.colon}>:</Text>

          <View style={pm.col}>
            <Text style={pm.colLabel}>Minute</Text>
            <TouchableOpacity style={pm.arrow} onPress={() => setMinute(m => m === 0 ? 59 : m - 1)}>
              <Ionicons name="chevron-up" size={20} color={C.primary} />
            </TouchableOpacity>
            <View style={pm.valueBox}>
              <Text style={pm.value}>{String(minute).padStart(2, '0')}</Text>
            </View>
            <TouchableOpacity style={pm.arrow} onPress={() => setMinute(m => (m + 1) % 60)}>
              <Ionicons name="chevron-down" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={pm.col}>
            <Text style={pm.colLabel}>Period</Text>
            <View style={{ height: 32 }} />
            <TouchableOpacity style={pm.ampmBox} onPress={toggleAmPm}>
              <Text style={pm.ampmText}>{ampm}</Text>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </View>
        </View>

        <View style={pm.actions}>
          <TouchableOpacity style={pm.cancelBtn} onPress={onCancel}>
            <Text style={pm.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pm.confirmBtn} onPress={handleConfirm}>
            <Text style={pm.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12,
    position: 'absolute', bottom: 0, left: 0, right: 0,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 },
  col: { alignItems: 'center', minWidth: 72 },
  colLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  arrow: { padding: 6 },
  valueBox: { width: 72, height: 52, borderRadius: 12, backgroundColor: C.primarySoft, borderWidth: 1.5, borderColor: C.primaryBorder, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
  value: { fontSize: 22, fontWeight: '800', color: C.primary },
  colon: { fontSize: 28, fontWeight: '800', color: C.primary, marginTop: 20 },
  ampmBox: { width: 72, height: 52, borderRadius: 12, backgroundColor: C.tealSoft, borderWidth: 1.5, borderColor: C.teal, justifyContent: 'center', alignItems: 'center' },
  ampmText: { fontSize: 18, fontWeight: '800', color: C.teal },
  actions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: C.subtext },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── UI Components (unchanged) ────────────────────────────────────────────────
function SectionLabel({ icon, label, required }) {
  return (
    <View style={sl.row}>
      <Ionicons name={icon} size={15} color={C.primary} />
      <Text style={sl.text}>{label}</Text>
      {required && <Text style={sl.req}>*</Text>}
    </View>
  );
}
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  text: { fontSize: 13, fontWeight: '700', color: C.text },
  req: { fontSize: 13, fontWeight: '700', color: C.coral },
});

function Toggle({ value, onToggle, label, sublabel }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  }, [value]);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackBg = anim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });
  return (
    <TouchableOpacity style={tg.row} onPress={onToggle} activeOpacity={0.8}>
      <View style={tg.text}>
        <Text style={tg.label}>{label}</Text>
        {sublabel ? <Text style={tg.sub}>{sublabel}</Text> : null}
      </View>
      <Animated.View style={[tg.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[tg.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}
const tg = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { flex: 1, marginRight: 12 },
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },
  track: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
});

function InputField({ icon, placeholder, value, onChangeText, keyboardType, multiline, maxLength, suffix, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[inp.wrap, focused && inp.focused, error && inp.error, multiline && inp.multilineWrap]}>
      {icon && <Ionicons name={icon} size={17} color={focused ? C.primary : C.muted} style={inp.icon} />}
      <TextInput
        style={[inp.input, multiline && inp.multilineInput]}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize="sentences"
        autoCorrect
      />
      {suffix ? <Text style={inp.suffix}>{suffix}</Text> : null}
    </View>
  );
}
const inp = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 13, minHeight: 50 },
  focused: { borderColor: C.primary, backgroundColor: C.card },
  error: { borderColor: C.coral },
  multilineWrap: { alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12, minHeight: 110 },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  multilineInput: { lineHeight: 21 },
  suffix: { fontSize: 13, color: C.muted, fontWeight: '500', marginLeft: 4 },
});

function DateTimeRow({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity style={dt.wrap} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={17} color={C.primary} />
      <View style={dt.inner}>
        <Text style={dt.label}>{label}</Text>
        <Text style={dt.value}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.muted} />
    </TouchableOpacity>
  );
}
const dt = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 13, paddingVertical: 12, gap: 10 },
  inner: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: 2 },
});

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <View style={fe.row}>
      <Ionicons name="alert-circle-outline" size={13} color={C.coral} />
      <Text style={fe.text}>{msg}</Text>
    </View>
  );
}
const fe = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  text: { fontSize: 12, color: C.coral, fontWeight: '500' },
});

// ─── MAIN SCREEN (FIXED) ──────────────────────────────────────────────────────
export default function CreateEditEventScreen({ route, navigation }) {
  const passedEvent = route?.params?.event ?? null;
  const eventId = route?.params?.id ?? (passedEvent?.id ?? null);
  const isEdit = !!eventId;

  const [loadingEvent, setLoadingEvent] = useState(isEdit && !passedEvent);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('reunion');
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [banner, setBanner] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  // Default date: 7 days from now at 6pm
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(18, 0, 0, 0);
    return d;
  })();
  const [eventDate, setEventDate] = useState(defaultDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Helper to populate form from an event object (handles both API and feed formats)
  const populateFormFromEvent = (ev) => {
    setTitle(ev.title || '');
    // Description: strip HTML for editing
    setDescription(stripHtml(ev.description || ev.body || ''));
    setType(ev.type || 'reunion');
    setIsOnline(getIsOnline(ev));
    setLocation(ev.location || '');
    setMeetingLink(ev.meeting_link || '');
    setMaxAttendees(ev.max_attendees ? String(ev.max_attendees) : '');

    const bannerUrl = getBannerUrl(ev);
    setBannerPreview(bannerUrl);
    setBanner(null); // remove any pending new banner

    const dateObj = getEventDate(ev);
    if (dateObj && !isNaN(dateObj.getTime())) {
      setEventDate(dateObj);
    } else {
      // fallback to default date if invalid
      setEventDate(defaultDate);
    }
  };
  // In the useEffect or at the top of your component, add:
  useEffect(() => {
    console.log('=== Route Params ===', JSON.stringify(route?.params, null, 2));
    console.log('passedEvent:', JSON.stringify(passedEvent, null, 2));
    console.log('eventId:', eventId);
    console.log('isEdit:', isEdit);
  }, []);
  // Fetch event by ID (API response)
  const fetchEventById = async () => {
    if (!eventId) return;
    try {
      setLoadingEvent(true);
      const response = await getEventById(eventId);
      const ev = response.data;
      console.log('=== API Response ===', JSON.stringify(response.data, null, 2));

      populateFormFromEvent(ev);
    } catch (err) {
      console.error('Failed to load event', err);
      Alert.alert('Error', 'Could not load event details. Please try again.');
      navigation.goBack();
    } finally {
      setLoadingEvent(false);
    }
  };

  // Initialize based on what was passed
  useEffect(() => {
      fetchEventById();
   
  }, [eventId]);

  // Banner picker
  const pickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      setBanner({ uri: asset.uri, name: `banner.${ext}`, type: mime });
      setBannerPreview(asset.uri);
    }
  };

  const removeBanner = () => { setBanner(null); setBannerPreview(null); };

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Event title is required.';
    if (!description.trim()) e.description = 'Description is required.';
    if (!type) e.type = 'Please select an event type.';
    if (!isOnline && !location.trim())
      e.location = 'Please provide a venue for in-person events.';
    if (isOnline && meetingLink && !/^https?:\/\/.+/.test(meetingLink.trim()))
      e.meetingLink = 'Please enter a valid URL (https://…)';
    if (maxAttendees && (isNaN(Number(maxAttendees)) || Number(maxAttendees) < 1))
      e.maxAttendees = 'Must be a positive number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('type', type);
      form.append('date', eventDate.toISOString());
      form.append('is_online', String(isOnline));
      if (location.trim()) form.append('location', location.trim());
      if (meetingLink.trim()) form.append('meeting_link', meetingLink.trim());
      if (maxAttendees) form.append('max_attendees', maxAttendees);
      if (banner) {
        form.append('banner', { uri: banner.uri, name: banner.name, type: banner.type });
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEdit) {
        await updateEvent(eventId, form, config);
        Alert.alert('Updated!', 'Your event has been updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createEvent(form, config);
        Alert.alert('Event Created!', 'Your event is now live.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeMeta = EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[0];

  if (loadingEvent) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>
            <Text style={s.headerSub}>{isEdit ? 'Loading event data...' : 'Share with your network'}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ marginTop: 12, color: C.muted }}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      <DatePickerModal
        visible={showDatePicker}
        date={eventDate}
        onConfirm={d => { setEventDate(d); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
      <TimePickerModal
        visible={showTimePicker}
        date={eventDate}
        onConfirm={d => { setEventDate(d); setShowTimePicker(false); }}
        onCancel={() => setShowTimePicker(false)}
      />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>
          <Text style={s.headerSub}>{isEdit ? 'Update event details' : 'Share with your network'}</Text>
        </View>
        <TouchableOpacity
          style={[s.publishBtn, submitting && s.publishBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
              <Ionicons name={isEdit ? 'checkmark' : 'send'} size={16} color="#fff" />
              <Text style={s.publishText}>{isEdit ? 'Save' : 'Publish'}</Text>
            </>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner */}
          <View style={s.card}>
            <SectionLabel icon="image-outline" label="Event Banner" />
            {bannerPreview ? (
              <View style={bn.container}>
                <Image source={{ uri: bannerPreview }} style={bn.image} resizeMode="cover" />
                <View style={bn.overlay}>
                  <TouchableOpacity style={bn.changeBtn} onPress={pickBanner} activeOpacity={0.85}>
                    <Ionicons name="camera-outline" size={16} color="#fff" />
                    <Text style={bn.changeBtnText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={bn.removeBtn} onPress={removeBanner} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={bn.placeholder} onPress={pickBanner} activeOpacity={0.75}>
                <View style={bn.placeholderIcon}>
                  <Ionicons name="cloud-upload-outline" size={30} color={C.primary} />
                </View>
                <Text style={bn.placeholderTitle}>Add Banner Image</Text>
                <Text style={bn.placeholderSub}>16:9 · PNG, JPG, or WebP</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Title */}
          <View style={s.card}>
            <SectionLabel icon="text-outline" label="Event Title" required />
            <InputField
              icon="calendar"
              placeholder="e.g. Alumni Homecoming 2025"
              value={title}
              onChangeText={v => { setTitle(v); setErrors(e => ({ ...e, title: null })); }}
              maxLength={120}
              error={errors.title}
            />
            <FieldError msg={errors.title} />
          </View>

          {/* Event Type */}
          <View style={s.card}>
            <SectionLabel icon="grid-outline" label="Event Type" required />
            <View style={et.grid}>
              {EVENT_TYPES.map(t => {
                const active = type === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[et.pill, active && { backgroundColor: t.bg, borderColor: t.color }]}
                    onPress={() => { setType(t.value); setErrors(e => ({ ...e, type: null })); }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={t.icon} size={15} color={active ? t.color : C.muted} />
                    <Text style={[et.label, active && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <FieldError msg={errors.type} />
          </View>

          {/* Date & Time */}
          <View style={s.card}>
            <SectionLabel icon="calendar-outline" label="Date & Time" required />
            <View style={{ gap: 8 }}>
              <DateTimeRow
                icon="calendar"
                label="Date"
                value={formatDisplayDate(eventDate)}
                onPress={() => setShowDatePicker(true)}
              />
              <DateTimeRow
                icon="time-outline"
                label="Time"
                value={formatDisplayTime(eventDate)}
                onPress={() => setShowTimePicker(true)}
              />
            </View>
          </View>

          {/* Format Toggle */}
          <View style={s.card}>
            <SectionLabel icon="globe-outline" label="Format" required />
            <Toggle
              value={isOnline}
              onToggle={() => { setIsOnline(v => !v); setErrors(e => ({ ...e, location: null, meetingLink: null })); }}
              label={isOnline ? 'Online Event' : 'In-Person Event'}
              sublabel={isOnline ? 'Attendees join via a link' : 'Attendees come to a physical location'}
            />

            {!isOnline && (
              <View style={{ marginTop: 14 }}>
                <Text style={s.subLabel}>Venue / Location</Text>
                <InputField
                  icon="location-outline"
                  placeholder="e.g. UET Campus, Faisalabad"
                  value={location}
                  onChangeText={v => { setLocation(v); setErrors(e => ({ ...e, location: null })); }}
                  maxLength={150}
                  error={errors.location}
                />
                <FieldError msg={errors.location} />
              </View>
            )}

            {isOnline && (
              <View style={{ marginTop: 14 }}>
                <Text style={s.subLabel}>
                  Meeting Link <Text style={{ color: C.muted, fontWeight: '400' }}>(optional)</Text>
                </Text>
                <InputField
                  icon="link-outline"
                  placeholder="https://meet.google.com/…"
                  value={meetingLink}
                  onChangeText={v => { setMeetingLink(v); setErrors(e => ({ ...e, meetingLink: null })); }}
                  keyboardType="url"
                  error={errors.meetingLink}
                />
                <FieldError msg={errors.meetingLink} />
              </View>
            )}
          </View>

          {/* Capacity */}
          <View style={s.card}>
            <SectionLabel icon="people-outline" label="Capacity" />
            <InputField
              icon="person-outline"
              placeholder="Leave blank for unlimited"
              value={maxAttendees}
              onChangeText={v => { setMaxAttendees(v.replace(/[^0-9]/g, '')); setErrors(e => ({ ...e, maxAttendees: null })); }}
              keyboardType="numeric"
              suffix={maxAttendees ? 'attendees' : ''}
              error={errors.maxAttendees}
            />
            <FieldError msg={errors.maxAttendees} />
            <Text style={s.hint}>Leave blank for unlimited capacity.</Text>
          </View>

          {/* Description */}
          <View style={s.card}>
            <SectionLabel icon="document-text-outline" label="Description" required />
            <InputField
              placeholder="Tell people what this event is about, what to bring, who should attend…"
              value={description}
              onChangeText={v => { setDescription(v); setErrors(e => ({ ...e, description: null })); }}
              multiline
              maxLength={2000}
              error={errors.description}
            />
            <FieldError msg={errors.description} />
            <View style={s.charRow}>
              <Text style={s.charCount}>{description.length}/2000</Text>
            </View>
          </View>

          {/* Live preview */}
          <View style={pv.wrap}>
            <View style={[pv.typeChip, { backgroundColor: selectedTypeMeta.bg, borderColor: selectedTypeMeta.color }]}>
              <Ionicons name={selectedTypeMeta.icon} size={13} color={selectedTypeMeta.color} />
              <Text style={[pv.typeLabel, { color: selectedTypeMeta.color }]}>{selectedTypeMeta.label}</Text>
            </View>
            <View style={pv.summary}>
              <Text style={pv.summaryTitle} numberOfLines={1}>{title || 'Your event title'}</Text>
              <Text style={pv.summaryMeta}>
                {formatDisplayDate(eventDate)} · {isOnline ? '🌐 Online' : `📍 ${location || 'Venue TBD'}`}
              </Text>
            </View>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={isEdit ? 'save-outline' : 'rocket-outline'} size={20} color="#fff" />
                <Text style={s.submitText}>{isEdit ? 'Save Changes' : 'Publish Event'}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles (unchanged, but ensure all used styles exist) ─────────────────────
const bn = StyleSheet.create({
  container: { borderRadius: 14, overflow: 'hidden' },
  image: { width: '100%', height: 180 },
  overlay: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 8 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  changeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  removeBtn: { backgroundColor: 'rgba(220,38,38,0.75)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  placeholder: { borderWidth: 2, borderColor: C.primaryBorder, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 36, alignItems: 'center', gap: 6, backgroundColor: C.primarySoft },
  placeholderIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', marginBottom: 4, shadowColor: C.primary, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  placeholderTitle: { fontSize: 15, fontWeight: '700', color: C.primary },
  placeholderSub: { fontSize: 12, color: C.muted },
});

const et = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.border, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: C.bg },
  label: { fontSize: 13, fontWeight: '600', color: C.muted },
});

const pv = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 4, marginBottom: 8, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  typeLabel: { fontSize: 11, fontWeight: '700' },
  summary: { flex: 1 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  summaryMeta: { fontSize: 12, color: C.muted, marginTop: 3 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 46 : 28, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 1 },
  publishBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  publishBtnDisabled: { opacity: 0.6 },
  publishText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 14, paddingBottom: 20 },
  card: { backgroundColor: C.card, marginHorizontal: 16, marginBottom: 10, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, shadowColor: '#1A1A2E', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  subLabel: { fontSize: 12, fontWeight: '700', color: C.subtext, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: C.muted, marginTop: 7, lineHeight: 17 },
  charRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 },
  charCount: { fontSize: 11, color: C.muted, fontWeight: '500' },
  submitBtn: { margin: 16, marginTop: 8, backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
});