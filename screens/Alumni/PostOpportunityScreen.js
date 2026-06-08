import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { postOpportunity } from '../../services/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  green: '#10B981',   greenSoft: '#D1FAE5',
  blue: '#2563EB',    blueSoft: '#DBEAFE',
  amber: '#D97706',   amberSoft: '#FEF3C7',
  coral: '#DC2626',   coralSoft: '#FEE2E2',
  error: '#DC2626',
};

const OPP_TYPES = [
  { value: 'job',        label: 'Job',        icon: 'briefcase-outline', color: C.blue,  bg: C.blueSoft  },
  { value: 'internship', label: 'Internship', icon: 'school-outline',    color: C.green, bg: C.greenSoft },
  { value: 'freelance',  label: 'Freelance',  icon: 'laptop-outline',    color: C.amber, bg: C.amberSoft },
];

const STEPS = [
  { key: 'basic',    label: 'Basic',    icon: 'information-circle-outline' },
  { key: 'location', label: 'Location', icon: 'location-outline'           },
  { key: 'details',  label: 'Details',  icon: 'document-text-outline'      },
  { key: 'media',    label: 'Media',    icon: 'images-outline'             },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
const getMime = (asset) => {
  if (asset.mimeType) return asset.mimeType;
  const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (asset.type === 'video') return `video/${ext === 'mov' ? 'quicktime' : ext}`;
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
};

// ─── FieldLabel ───────────────────────────────────────────────────────────────
function FieldLabel({ label, required, hint }) {
  return (
    <View style={{ marginBottom: 7 }}>
      <Text style={fl.label}>
        {label}
        {required && <Text style={fl.req}> *</Text>}
      </Text>
      {hint ? <Text style={fl.hint}>{hint}</Text> : null}
    </View>
  );
}
const fl = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: C.text, letterSpacing: 0.2 },
  req:   { color: C.error },
  hint:  { fontSize: 11, color: C.muted, marginTop: 2 },
});

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, hint, error, multiline, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 18 }}>
      {label && <FieldLabel label={label} required={required} hint={hint} />}
      <TextInput
        style={[
          inp.base,
          multiline && inp.multiline,
          focused && inp.focused,
          error && inp.error,
          style,
        ]}
        placeholderTextColor={C.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {error ? (
        <View style={inp.errRow}>
          <Ionicons name="alert-circle-outline" size={13} color={C.error} />
          <Text style={inp.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
const inp = StyleSheet.create({
  base:      { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: C.text, fontWeight: '500' },
  multiline: { minHeight: 108, paddingTop: 13, lineHeight: 21 },
  focused:   { borderColor: C.primary, backgroundColor: C.card },
  error:     { borderColor: C.error },
  errRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errorText: { fontSize: 11, color: C.error, fontWeight: '500' },
});

// ─── DateField ────────────────────────────────────────────────────────────────
function DateField({ label, required, hint, value, onChange, error }) {
  const [show, setShow] = useState(false);

  const handleChange = (event, selectedDate) => {
    // On Android the picker closes itself; on iOS we close manually
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') { setShow(false); return; }
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
      if (Platform.OS === 'ios') setShow(false);
    }
  };

  // Parse stored YYYY-MM-DD string back to Date safely
  const pickerDate = (() => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  return (
    <View style={{ marginBottom: 18 }}>
      <FieldLabel label={label} required={required} hint={hint} />
      <TouchableOpacity
        style={[
          inp.base,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
          error && inp.error,
        ]}
        onPress={() => setShow(true)}
        activeOpacity={0.75}
      >
        <Text style={{ fontSize: 14, fontWeight: '500', color: value ? C.text : C.muted }}>
          {value || 'Select deadline date'}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={C.primary} />
      </TouchableOpacity>
      {error ? (
        <View style={inp.errRow}>
          <Ionicons name="alert-circle-outline" size={13} color={C.error} />
          <Text style={inp.errorText}>{error}</Text>
        </View>
      ) : null}
      {show && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

// ─── StepBar ──────────────────────────────────────────────────────────────────
function StepBar({ current }) {
  return (
    <View style={sb.wrap}>
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <View key={step.key} style={sb.item}>
            <View style={[sb.circle, done && sb.circleDone, active && sb.circleActive]}>
              {done
                ? <Ionicons name="checkmark" size={13} color="#fff" />
                : <Text style={[sb.num, active && sb.numActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[sb.label, active && sb.labelActive, done && sb.labelDone]}>
              {step.label}
            </Text>
            {i < STEPS.length - 1 && (
              <View style={[sb.line, done && sb.lineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  item:         { flex: 1, alignItems: 'center', position: 'relative' },
  circle:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  circleDone:   { backgroundColor: C.green, borderColor: C.green },
  circleActive: { backgroundColor: C.primary, borderColor: C.primary },
  num:          { fontSize: 11, fontWeight: '700', color: C.muted },
  numActive:    { color: '#fff' },
  label:        { fontSize: 10, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  labelActive:  { color: C.primary },
  labelDone:    { color: C.green },
  line:         { position: 'absolute', top: 14, right: -10, width: '55%', height: 2, backgroundColor: C.border, zIndex: -1 },
  lineDone:     { backgroundColor: C.green },
});

// ─── StepCard ─────────────────────────────────────────────────────────────────
function StepCard({ title, icon, subtitle, children }) {
  return (
    <View style={sc.wrap}>
      <View style={sc.header}>
        <View style={sc.iconWrap}>
          <Ionicons name={icon} size={18} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={sc.title}>{title}</Text>
          {subtitle ? <Text style={sc.sub}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  wrap:    { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 14 },
  header:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.divider },
  iconWrap:{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  sub:     { fontSize: 12, color: C.muted, marginTop: 2 },
});

// ─── SkillTagInput ────────────────────────────────────────────────────────────
function SkillTagInput({ skills, setSkills, error }) {
  const [input, setInput] = useState('');

  const addSkill = (text) => {
    const trimmed = text.trim().replace(/,$/, '').trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 15) {
      setSkills(prev => [...prev, trimmed]);
    }
    setInput('');
  };

  return (
    <View style={{ marginBottom: 18 }}>
      <FieldLabel
        label="Required Skills"
        required
        hint="Type a skill and press + or Enter · Tap tag to remove"
      />

      {/* Tags */}
      {skills.length > 0 && (
        <View style={sk.tagsWrap}>
          {skills.map((skill, i) => (
            <TouchableOpacity
              key={i}
              style={sk.tag}
              onPress={() => setSkills(prev => prev.filter((_, idx) => idx !== i))}
              activeOpacity={0.7}
            >
              <Text style={sk.tagText}>{skill}</Text>
              <Ionicons name="close" size={11} color={C.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input row */}
      <View style={[sk.inputRow, error && { borderColor: C.error }]}>
        <TextInput
          style={sk.input}
          value={input}
          placeholder={skills.length === 0 ? 'e.g. React, Node.js, Python…' : 'Add another skill…'}
          placeholderTextColor={C.muted}
          onSubmitEditing={() => addSkill(input)}
          onChangeText={text => { if (text.endsWith(',')) addSkill(text); else setInput(text); }}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[sk.addBtn, !input.trim() && { opacity: 0.35 }]}
          onPress={() => addSkill(input)}
          disabled={!input.trim()}
          activeOpacity={0.75}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {skills.length >= 15 && (
        <Text style={{ fontSize: 11, color: C.amber, marginTop: 5, fontWeight: '600' }}>
          Maximum 15 skills reached
        </Text>
      )}
      {error ? (
        <View style={[inp.errRow, { marginTop: 5 }]}>
          <Ionicons name="alert-circle-outline" size={13} color={C.error} />
          <Text style={inp.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
const sk = StyleSheet.create({
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tag:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primarySoft, borderWidth: 1.5, borderColor: C.primaryBorder, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  tagText:  { fontSize: 12, fontWeight: '700', color: C.primary },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingLeft: 14, paddingRight: 8, paddingVertical: 6, gap: 8 },
  input:    { flex: 1, fontSize: 13, color: C.text, paddingVertical: 7 },
  addBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
});

// ─── MediaPicker ──────────────────────────────────────────────────────────────
function MediaPicker({ media, setMedia }) {
  const MAX = 5;

  const pick = async () => {
    if (media.length >= MAX) {
      Alert.alert('Limit reached', `You can attach up to ${MAX} files.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: MAX - media.length,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setMedia(prev => [...prev, ...result.assets].slice(0, MAX));
    }
  };

  const remove = (uri) => setMedia(prev => prev.filter(m => m.uri !== uri));

  return (
    <View>
      <View style={mdp.grid}>
        {media.length < MAX && (
          <TouchableOpacity style={mdp.addBtn} onPress={pick} activeOpacity={0.75}>
            <View style={mdp.addInner}>
              <Ionicons name="cloud-upload-outline" size={26} color={C.primary} />
              <Text style={mdp.addLabel}>Add Media</Text>
              <Text style={mdp.addSub}>{media.length}/{MAX} files</Text>
            </View>
          </TouchableOpacity>
        )}
        {media.map((item, i) => (
          <View key={i} style={mdp.thumb}>
            <Image source={{ uri: item.uri }} style={mdp.img} resizeMode="cover" />
            {(item.type === 'video' || item.mimeType?.startsWith('video')) && (
              <View style={mdp.videoOverlay}>
                <View style={mdp.playBtn}>
                  <Ionicons name="play" size={14} color="#fff" />
                </View>
              </View>
            )}
            <TouchableOpacity style={mdp.removeBtn} onPress={() => remove(item.uri)} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={22} color={C.coral} />
            </TouchableOpacity>
            <View style={mdp.numBadge}>
              <Text style={mdp.numText}>{i + 1}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={mdp.hint}>
        <Ionicons name="information-circle-outline" size={12} color={C.muted} /> Images & videos · Max 5 files · PNG, JPG, MP4
      </Text>
    </View>
  );
}
const mdp = StyleSheet.create({
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  addBtn:       { width: 100, height: 100, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: C.primaryBorder, backgroundColor: C.primarySoft, overflow: 'hidden' },
  addInner:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  addLabel:     { fontSize: 11, fontWeight: '700', color: C.primary },
  addSub:       { fontSize: 10, color: C.muted },
  thumb:        { width: 100, height: 100, borderRadius: 14, overflow: 'visible' },
  img:          { width: 100, height: 100, borderRadius: 14, backgroundColor: C.border },
  videoOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  playBtn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  removeBtn:    { position: 'absolute', top: -6, right: -6, backgroundColor: C.card, borderRadius: 11 },
  numBadge:     { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  numText:      { fontSize: 10, fontWeight: '700', color: '#fff' },
  hint:         { fontSize: 11, color: C.muted, marginTop: 10 },
});

// ─── PreviewCard ──────────────────────────────────────────────────────────────
function PreviewCard({ type, title, company, location, isRemote, skills, deadline }) {
  const typeMeta = OPP_TYPES.find(t => t.value === type) ?? OPP_TYPES[0];
  if (!title && !company) return null;
  return (
    <View style={pv.wrap}>
      <View style={pv.labelRow}>
        <Ionicons name="eye-outline" size={14} color={C.muted} />
        <Text style={pv.label}>Live Preview</Text>
      </View>
      <View style={pv.card}>
        <View style={pv.badges}>
          <View style={[pv.badge, { backgroundColor: typeMeta.bg, borderColor: typeMeta.color }]}>
            <Ionicons name={typeMeta.icon} size={11} color={typeMeta.color} />
            <Text style={[pv.badgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
          </View>
          {isRemote && (
            <View style={[pv.badge, { backgroundColor: C.greenSoft, borderColor: C.green }]}>
              <Ionicons name="globe-outline" size={11} color={C.green} />
              <Text style={[pv.badgeText, { color: C.green }]}>Remote</Text>
            </View>
          )}
          {deadline ? (
            <View style={[pv.badge, { backgroundColor: C.amberSoft, borderColor: C.amber }]}>
              <Ionicons name="time-outline" size={11} color={C.amber} />
              <Text style={[pv.badgeText, { color: C.amber }]}>Due {deadline}</Text>
            </View>
          ) : null}
        </View>
        {title   ? <Text style={pv.title} numberOfLines={1}>{title}</Text> : null}
        {company ? (
          <View style={pv.metaRow}>
            <Ionicons name="business-outline" size={13} color={C.muted} />
            <Text style={pv.meta}>{company}</Text>
          </View>
        ) : null}
        {location ? (
          <View style={pv.metaRow}>
            <Ionicons name="location-outline" size={13} color={C.muted} />
            <Text style={pv.meta}>{location}</Text>
          </View>
        ) : null}
        {skills.length > 0 && (
          <View style={pv.skillsRow}>
            {skills.slice(0, 5).map((s, i) => (
              <View key={i} style={pv.skillChip}>
                <Text style={pv.skillText}>{s}</Text>
              </View>
            ))}
            {skills.length > 5 && <Text style={pv.skillMore}>+{skills.length - 5}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}
const pv = StyleSheet.create({
  wrap:      { marginBottom: 14 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label:     { fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:      { backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.primaryBorder, padding: 16 },
  badges:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  title:     { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 6 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  meta:      { fontSize: 13, color: C.subtext, fontWeight: '500' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  skillChip: { backgroundColor: C.primarySoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  skillText: { fontSize: 11, fontWeight: '700', color: C.primary },
  skillMore: { fontSize: 11, fontWeight: '600', color: C.muted, alignSelf: 'center' },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function PostOpportunityScreen({ navigation }) {
  const { userData } = useContext(AuthContext);
  const scrollRef = useRef(null);

  const [step,         setStep]         = useState(0);
  const [title,        setTitle]        = useState('');
  const [type,         setType]         = useState('job');
  const [description,  setDescription]  = useState('');
  const [requirements, setRequirements] = useState('');
  const [location,     setLocation]     = useState('');
  const [company,      setCompany]      = useState('');
  const [applyLink,    setApplyLink]    = useState('');
  const [skills,       setSkills]       = useState([]);
  const [deadline,     setDeadline]     = useState('');
  const [isRemote,     setIsRemote]     = useState(false);
  const [media,        setMedia]        = useState([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors,       setErrors]       = useState({});

  // ── Unauthorized guard ──
  if (userData?.role !== 'alumni' && userData?.role !== 'admin' && userData?.role !== 'partner') {
    return (
      <SafeAreaView style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14 }]}>
        <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="lock-closed-outline" size={32} color={C.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>Access Restricted</Text>
        <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 }}>
          Only alumni, admins, and partners can post opportunities.
        </Text>
        <TouchableOpacity style={[s.submitBtn, { marginTop: 8, width: '60%' }]} onPress={() => navigation.goBack()}>
          <Text style={s.submitBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Per-step validation ──
  const validateStep = (n) => {
    const e = {};
    if (n === 0) {
      if (!title.trim())     e.title     = 'Title is required';
      if (!company.trim())   e.company   = 'Company name is required';
      if (!applyLink.trim()) e.applyLink = 'Apply link is required';
      if (!deadline.trim())  e.deadline  = 'Deadline is required';
    }
    if (n === 1) {
      if (!location.trim()) e.location = 'Location is required';
    }
    if (n === 2) {
      if (!description.trim())  e.description  = 'Description is required';
      if (!requirements.trim()) e.requirements = 'Requirements are required';
      if (skills.length === 0)  e.skills       = 'Add at least one skill';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const goBack = () => {
    if (step === 0) { navigation.goBack(); return; }
    setStep(s => s - 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Submit ──
  const handlePost = async () => {
    let allErrors = {};
    [0, 1, 2].forEach(n => {
      const e = {};
      if (n === 0) {
        if (!title.trim())     e.title     = 'Title is required';
        if (!company.trim())   e.company   = 'Company name is required';
        if (!applyLink.trim()) e.applyLink = 'Apply link is required';
        if (!deadline.trim())  e.deadline  = 'Deadline is required';
      }
      if (n === 1 && !location.trim()) e.location = 'Location is required';
      if (n === 2) {
        if (!description.trim())  e.description  = 'Description is required';
        if (!requirements.trim()) e.requirements = 'Requirements are required';
        if (skills.length === 0)  e.skills       = 'Add at least one skill';
      }
      Object.assign(allErrors, e);
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      Alert.alert('Missing fields', 'Please complete all required fields.');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('title',        title.trim());
      formData.append('type',         type);
      formData.append('description',  description.trim());
      formData.append('requirements', requirements.trim());
      formData.append('location',     location.trim());
      formData.append('is_remote',    String(isRemote));
      formData.append('deadline',     deadline.trim());
      formData.append('company_name', company.trim());
      formData.append('apply_link',   applyLink.trim());

      skills.forEach(sk => formData.append('required_skills', sk));

      media.forEach((asset, i) => {
        const mime = getMime(asset);
        const ext  = mime.split('/')[1] ?? 'jpg';
        formData.append('media', {
          uri:  asset.uri,
          name: `media_${i}.${ext}`,
          type: mime,
        });
      });

      await postOpportunity(formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Posted! 🎉', 'Your opportunity has been broadcast to the network.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step content ──
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepCard title="Basic Information" icon="information-circle-outline" subtitle="Role title, company, and apply link">
            {/* Type selector */}
            <View style={{ marginBottom: 20 }}>
              <FieldLabel label="Opportunity Type" required />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {OPP_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[s.typeChip, type === t.value && { backgroundColor: t.bg, borderColor: t.color }]}
                    onPress={() => setType(t.value)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={t.icon} size={15} color={type === t.value ? t.color : C.muted} />
                    <Text style={[s.typeChipText, type === t.value && { color: t.color, fontWeight: '700' }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Field
              label="Job Title"
              required
              value={title}
              onChangeText={v => { setTitle(v); setErrors(e => ({ ...e, title: undefined })); }}
              placeholder="e.g. Senior React Native Developer"
              error={errors.title}
            />
            <Field
              label="Company Name"
              required
              value={company}
              onChangeText={v => { setCompany(v); setErrors(e => ({ ...e, company: undefined })); }}
              placeholder="e.g. Arbisoft, Techlogix"
              error={errors.company}
            />
            <Field
              label="Apply Link"
              required
              hint="Direct link to the application form"
              value={applyLink}
              onChangeText={v => { setApplyLink(v); setErrors(e => ({ ...e, applyLink: undefined })); }}
              placeholder="https://careers.company.com/apply"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.applyLink}
            />

            {/* ── Date picker field ── */}
            <DateField
              label="Application Deadline"
              required
              hint="Tap to open calendar"
              value={deadline}
              onChange={v => { setDeadline(v); setErrors(e => ({ ...e, deadline: undefined })); }}
              error={errors.deadline}
            />
          </StepCard>
        );

      case 1:
        return (
          <StepCard title="Location" icon="location-outline" subtitle="Where is this role based?">
            <Field
              label="Location"
              required
              value={location}
              onChangeText={v => { setLocation(v); setErrors(e => ({ ...e, location: undefined })); }}
              placeholder="e.g. Lahore, Karachi, Remote"
              error={errors.location}
            />
            <View style={s.toggleCard}>
              <View style={s.toggleIcon}>
                <Ionicons name="globe-outline" size={18} color={isRemote ? C.green : C.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Remote Work Available</Text>
                <Text style={s.toggleSub}>Candidates can work from anywhere</Text>
              </View>
              <Switch
                value={isRemote}
                onValueChange={setIsRemote}
                trackColor={{ false: C.border, true: '#A7F3D0' }}
                thumbColor={isRemote ? C.green : '#fff'}
                ios_backgroundColor={C.border}
              />
            </View>
          </StepCard>
        );

      case 2:
        return (
          <StepCard title="Job Details" icon="document-text-outline" subtitle="Description, requirements & skills">
            <Field
              label="Job Description"
              required
              hint="Describe the role, team, and day-to-day responsibilities"
              value={description}
              onChangeText={v => { setDescription(v); setErrors(e => ({ ...e, description: undefined })); }}
              placeholder="This role involves building features for…"
              multiline
              error={errors.description}
            />
            <Field
              label="Requirements"
              required
              hint="Education, experience level, certifications"
              value={requirements}
              onChangeText={v => { setRequirements(v); setErrors(e => ({ ...e, requirements: undefined })); }}
              placeholder="Bachelor's in CS, 2+ years of experience…"
              multiline
              error={errors.requirements}
            />
            <SkillTagInput skills={skills} setSkills={setSkills} error={errors.skills} />
          </StepCard>
        );

      case 3:
        return (
          <>
            <StepCard title="Media Attachments" icon="images-outline" subtitle="Optional — up to 5 images or videos">
              <MediaPicker media={media} setMedia={setMedia} />
            </StepCard>
            <PreviewCard
              type={type}
              title={title}
              company={company}
              location={location}
              isRemote={isRemote}
              skills={skills}
              deadline={deadline}
            />
          </>
        );

      default:
        return null;
    }
  };

  // ── Render ──
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* <View style={s.header}> 
         <TouchableOpacity style={s.headerBack} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Post Opportunity</Text>
          <Text style={s.headerSub}>Step {step + 1} of {STEPS.length} — {STEPS[step].label}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.muted }}>Cancel</Text>
        </TouchableOpacity>
      </View> */}

      {/* Step progress */}
      <StepBar current={step} />

      {/* KeyboardAvoidingView wraps only the scrollable area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}

          {/* Navigation buttons */}
          <View style={s.navRow}>
            {step > 0 && (
              <TouchableOpacity style={s.prevBtn} onPress={goBack} activeOpacity={0.75}>
                <Ionicons name="arrow-back" size={16} color={C.primary} />
                <Text style={s.prevBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            {step < STEPS.length - 1 ? (
              <TouchableOpacity
                style={[s.nextBtn, step === 0 && { flex: 1 }]}
                onPress={goNext}
                activeOpacity={0.85}
              >
                <Text style={s.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handlePost}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="megaphone-outline" size={18} color="#fff" />
                    <Text style={s.submitBtnText}>Broadcast Opportunity</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 46 : 12,
    paddingBottom: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerBack:    { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  headerTitle:   { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerSub:     { fontSize: 11, color: C.muted, marginTop: 1 },
  scroll:        { flex: 1 },
  content:       { padding: 16, paddingTop: 20 },

  // Type chips
  typeChip:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  typeChipText: { fontSize: 12, fontWeight: '600', color: C.muted },

  // Remote toggle
  toggleCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: C.border, gap: 12 },
  toggleIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  toggleSub:   { fontSize: 11, color: C.muted, marginTop: 2 },

  // Navigation
  navRow:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  prevBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.primaryBorder, backgroundColor: C.primarySoft },
  prevBtnText:  { fontSize: 14, fontWeight: '700', color: C.primary },
  nextBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  nextBtnText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  submitBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  submitBtnText:{ fontSize: 15, fontWeight: '800', color: '#fff' },
});