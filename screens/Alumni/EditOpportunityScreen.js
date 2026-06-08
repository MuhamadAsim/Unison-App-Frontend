import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { updateOpportunity, getOpportunityById } from '../../services/api';

// ─── Design Tokens ──────────────────────────────────────────────────────────
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
};

const TYPE_OPTIONS = [
  { label: 'Job', value: 'job', icon: 'briefcase-outline', color: C.blue, bg: C.blueSoft },
  { label: 'Internship', value: 'internship', icon: 'school-outline', color: C.green, bg: C.greenSoft },
  { label: 'Freelance', value: 'freelance', icon: 'laptop-outline', color: C.amber, bg: C.amberSoft },
];

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open', icon: 'checkmark-circle-outline', color: C.green, bg: C.greenSoft },
  { label: 'Closed', value: 'closed', icon: 'close-circle-outline', color: C.coral, bg: C.coralSoft },
];

// ─── Helper: format date for deadline input ─────────────────────────────────
const formatDeadlineForInput = (deadline) => {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

// ─── Helper: parse skills (array or comma string) ───────────────────────────
const parseSkills = (skills) => {
  console.log('[parseSkills] input:', skills);
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(s => s && s.trim());
  if (typeof skills === 'string') return skills.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// ─── Helper: parse media (array of URLs or objects) ─────────────────────────
const parseMedia = (media) => {
  console.log('[parseMedia] input:', media);
  if (!Array.isArray(media)) return [];
  return media.map(item => {
    if (typeof item === 'string') return { uri: item, isNew: false };
    if (item?.url) return { uri: item.url, isNew: false };
    if (item?.uri) return { uri: item.uri, isNew: false };
    return null;
  }).filter(Boolean);
};

// ─── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ icon, title }) {
  return (
    <View style={sec.row}>
      <View style={sec.iconWrap}>
        <Ionicons name={icon} size={14} color={C.primary} />
      </View>
      <Text style={sec.title}>{title}</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 4 },
  iconWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 13, fontWeight: '700', color: C.text, letterSpacing: 0.2, textTransform: 'uppercase' },
});

// ─── Styled Input ───────────────────────────────────────────────────────────
function Field({ label, required, icon, hint, error, children }) {
  return (
    <View style={f.wrap}>
      <View style={f.labelRow}>
        {icon && <Ionicons name={icon} size={13} color={C.muted} style={{ marginRight: 5 }} />}
        <Text style={f.label}>
          {label}
          {required && <Text style={f.req}> *</Text>}
        </Text>
      </View>
      {children}
      {hint && !error && <Text style={f.hint}>{hint}</Text>}
      {error && (
        <View style={f.errRow}>
          <Ionicons name="alert-circle-outline" size={12} color={C.coral} />
          <Text style={f.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', color: C.subtext, letterSpacing: 0.3 },
  req: { color: C.coral, fontWeight: '700' },
  hint: { fontSize: 11, color: C.muted, marginTop: 5 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errText: { fontSize: 11, color: C.coral },
});

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize, hasError }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      multiline={multiline}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize || 'sentences'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        inp.base,
        multiline && inp.multi,
        focused && inp.focused,
        hasError && inp.error,
      ]}
    />
  );
}
const inp = StyleSheet.create({
  base: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    minHeight: 44,
  },
  multi: { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 },
  focused: { borderColor: C.primary, backgroundColor: C.primarySoft + '55' },
  error: { borderColor: C.coral, backgroundColor: C.coralSoft + '44' },
});

// ─── Pill Selector ──────────────────────────────────────────────────────────
function PillSelector({ options, value, onSelect }) {
  return (
    <View style={ps.row}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[ps.pill, active && { backgroundColor: opt.bg, borderColor: opt.color }]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.75}
          >
            <Ionicons name={opt.icon} size={13} color={active ? opt.color : C.muted} />
            <Text style={[ps.text, active && { color: opt.color, fontWeight: '700' }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const ps = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: C.bg,
  },
  text: { fontSize: 13, color: C.muted, fontWeight: '600' },
});

// ─── Toggle Row ─────────────────────────────────────────────────────────────
function ToggleRow({ label, subtitle, value, onToggle }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const handleToggle = () => {
    Animated.spring(anim, {
      toValue: value ? 0 : 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
    onToggle(!value);
  };
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });

  return (
    <TouchableOpacity style={tog.row} onPress={handleToggle} activeOpacity={0.8}>
      <View style={tog.left}>
        <View style={[tog.iconWrap, value && { backgroundColor: C.primarySoft }]}>
          <Ionicons name="globe-outline" size={15} color={value ? C.primary : C.muted} />
        </View>
        <View>
          <Text style={tog.label}>{label}</Text>
          {subtitle && <Text style={tog.sub}>{subtitle}</Text>}
        </View>
      </View>
      <Animated.View style={[tog.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[tog.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}
const tog = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderRadius: 10, borderWidth: 1.5,
    borderColor: C.border, padding: 12, marginBottom: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  sub: { fontSize: 11, color: C.muted, marginTop: 1 },
  track: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' },
  thumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
});

// ─── Skills Input ───────────────────────────────────────────────────────────
function SkillsInput({ skills, onChange }) {
  const [inputVal, setInputVal] = useState('');
  const addSkill = () => {
    const trimmed = inputVal.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    onChange([...skills, trimmed]);
    setInputVal('');
  };
  const removeSkill = idx => onChange(skills.filter((_, i) => i !== idx));
  return (
    <View>
      <View style={sk.inputRow}>
        <TextInput
          value={inputVal}
          onChangeText={setInputVal}
          placeholder="e.g. React Native"
          placeholderTextColor={C.muted}
          onSubmitEditing={addSkill}
          returnKeyType="done"
          style={[inp.base, sk.input]}
        />
        <TouchableOpacity style={sk.addBtn} onPress={addSkill}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      {skills.length > 0 && (
        <View style={sk.chips}>
          {skills.map((s, i) => (
            <View key={i} style={sk.chip}>
              <Text style={sk.chipText}>{s}</Text>
              <TouchableOpacity onPress={() => removeSkill(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close" size={12} color={C.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
const sk = StyleSheet.create({
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, marginBottom: 0 },
  addBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.primaryBorder,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText: { fontSize: 12, color: C.primary, fontWeight: '600' },
});

// ─── Media Picker ───────────────────────────────────────────────────────────
function MediaSection({ mediaItems, onAdd, onRemove }) {
  const pickMedia = async () => {
    if (mediaItems.length >= 5) {
      return Alert.alert('Limit Reached', 'You can attach up to 5 media files.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 5 - mediaItems.length,
      quality: 0.85,
    });
    if (!result.canceled) {
      const newFiles = result.assets.map(a => ({ uri: a.uri, type: a.type, isNew: true }));
      onAdd(newFiles);
    }
  };
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={med.row}>
        <TouchableOpacity style={med.addTile} onPress={pickMedia} activeOpacity={0.7}>
          <Ionicons name="cloud-upload-outline" size={22} color={C.primary} />
          <Text style={med.addText}>Add Media</Text>
          <Text style={med.addSub}>{mediaItems.length}/5</Text>
        </TouchableOpacity>
        {mediaItems.map((m, i) => (
          <View key={i} style={med.tile}>
            <Image source={{ uri: m.uri }} style={med.img} />
            {m.isNew && (
              <View style={med.newBadge}>
                <Text style={med.newBadgeText}>NEW</Text>
              </View>
            )}
            <TouchableOpacity style={med.removeBtn} onPress={() => onRemove(i)}>
              <Ionicons name="close-circle" size={20} color={C.coral} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <Text style={med.hint}>Upload up to 5 images or videos. Existing media URLs are preserved.</Text>
    </View>
  );
}
const med = StyleSheet.create({
  row: { gap: 10, paddingVertical: 4 },
  addTile: {
    width: 90, height: 90, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.primaryBorder, borderStyle: 'dashed',
    backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', gap: 3,
  },
  addText: { fontSize: 11, color: C.primary, fontWeight: '700' },
  addSub: { fontSize: 10, color: C.muted },
  tile: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  img: { width: '100%', height: '100%' },
  newBadge: {
    position: 'absolute', top: 5, left: 5,
    backgroundColor: C.primary, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  newBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  removeBtn: { position: 'absolute', top: 3, right: 3, backgroundColor: '#fff', borderRadius: 10 },
  hint: { fontSize: 11, color: C.muted, marginTop: 8 },
});

// ─── Form Card ──────────────────────────────────────────────────────────────
function FormCard({ children }) {
  return <View style={card.wrap}>{children}</View>;
}
const card = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 16,
    shadowColor: '#1A1A2E', shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});

// ─── Validation ─────────────────────────────────────────────────────────────
const validateForm = ({ title, description, company, applyLink, deadline }) => {
  const errors = {};
  if (!title.trim()) errors.title = 'Title is required';
  if (!description.trim()) errors.description = 'Description is required';
  if (!company.trim()) errors.company = 'Company name is required';
  if (applyLink && !/^https?:\/\/.+/.test(applyLink)) errors.applyLink = 'Must be a valid URL (https://...)';
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) errors.deadline = 'Format must be YYYY-MM-DD';
  return errors;
};

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function EditOpportunityScreen({ route }) {
  const navigation = useNavigation();
  const { opportunity: passedOpp } = route.params;
  const opportunityId = passedOpp?.id;

  const [loading, setLoading] = useState(true);
  const [opportunity, setOpportunity] = useState(null);

  // Always fetch fresh data using the ID
  useEffect(() => {
    if (!opportunityId) {
      console.error('[EditOpportunity] No opportunity ID provided');
      Alert.alert('Error', 'No opportunity ID provided');
      navigation.goBack();
      return;
    }

    const fetchFullOpportunity = async () => {
      try {
        console.log('[EditOpportunity] Fetching full opportunity by ID:', opportunityId);
        setLoading(true);
        const res = await getOpportunityById(opportunityId);

        console.log('[EditOpportunity] Full Response:', JSON.stringify(res, null, 2));
        console.log('[EditOpportunity] Response Data:', JSON.stringify(res.data, null, 2));
        setOpportunity(res.data);
      } catch (err) {
        console.error('[EditOpportunity] Fetch error:', err);
        Alert.alert('Error', 'Could not load opportunity details. Please try again.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchFullOpportunity();
  }, [opportunityId]);

  // ── Field extraction (once data is loaded) ───────────────────────────────
  // Log when opportunity changes
  useEffect(() => {
    if (opportunity) {
      console.log('[EditOpportunity] opportunity state updated:', opportunity);
      console.log('[EditOpportunity] Title from opportunity:', opportunity.title);
      console.log('[EditOpportunity] Description:', opportunity.description);
      console.log('[EditOpportunity] Company:', opportunity.company_name || opportunity.company?.name || opportunity.company);
      console.log('[EditOpportunity] Required skills:', opportunity.required_skills);
      console.log('[EditOpportunity] Media:', opportunity.media);
    }
  }, [opportunity]);

  const titleInitial = opportunity?.title || '';
  const typeInitial = opportunity?.type || 'job';
  const statusInitial = opportunity?.status || 'open';
  const descriptionInitial = opportunity?.description || '';
  const requirementsInitial = opportunity?.requirements || '';
  const locationInitial = opportunity?.location || '';
  const companyInitial = opportunity?.company_name || opportunity?.company?.name || opportunity?.company || '';
  const applyLinkInitial = opportunity?.apply_link || '';
  const isRemoteInitial = opportunity?.is_remote || false;
  const skillsInitial = parseSkills(opportunity?.required_skills);
  const deadlineInitial = formatDeadlineForInput(opportunity?.deadline);
  const mediaInitial = parseMedia(opportunity?.media);

  console.log('[EditOpportunity] Extracted values after opportunity load:', {
    titleInitial, typeInitial, statusInitial, descriptionInitial, requirementsInitial,
    locationInitial, companyInitial, applyLinkInitial, isRemoteInitial, skillsInitial, deadlineInitial, mediaInitial
  });

  // ── State ─────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(titleInitial);
  const [type, setType] = useState(typeInitial);
  const [status, setStatus] = useState(statusInitial);
  const [description, setDescription] = useState(descriptionInitial);
  const [requirements, setRequirements] = useState(requirementsInitial);
  const [location, setLocation] = useState(locationInitial);
  const [company, setCompany] = useState(companyInitial);
  const [applyLink, setApplyLink] = useState(applyLinkInitial);
  const [isRemote, setIsRemote] = useState(isRemoteInitial);
  const [skills, setSkills] = useState(skillsInitial);
  const [deadline, setDeadline] = useState(deadlineInitial);
  const [mediaItems, setMediaItems] = useState(mediaInitial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Update state when opportunity loads (re-run whenever opportunity changes)
  useEffect(() => {
    if (opportunity) {
      console.log('[EditOpportunity] Updating form state from opportunity...');
      setTitle(titleInitial);
      setType(typeInitial);
      setStatus(statusInitial);
      setDescription(descriptionInitial);
      setRequirements(requirementsInitial);
      setLocation(locationInitial);
      setCompany(companyInitial);
      setApplyLink(applyLinkInitial);
      setIsRemote(isRemoteInitial);
      setSkills(skillsInitial);
      setDeadline(deadlineInitial);
      setMediaItems(mediaInitial);
      console.log('[EditOpportunity] Form state updated. Current title state:', titleInitial);
    }
  }, [opportunity]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddMedia = useCallback(newFiles => {
    setMediaItems(prev => [...prev, ...newFiles].slice(0, 5));
  }, []);

  const handleRemoveMedia = useCallback(idx => {
    setMediaItems(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleUpdate = async () => {
    const validationErrors = validateForm({ title, description, company, applyLink, deadline });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('type', type);
      formData.append('status', status);
      formData.append('description', description.trim());
      formData.append('requirements', requirements.trim());
      formData.append('location', location.trim());
      formData.append('is_remote', String(isRemote));
      formData.append('company_name', company.trim());
      formData.append('apply_link', applyLink.trim());
      if (deadline) formData.append('deadline', deadline);

      skills.forEach(s => formData.append('required_skills[]', s));

      mediaItems.forEach(m => {
        if (!m.isNew) {
          formData.append('media', m.uri);
        } else {
          const ext = m.uri.split('.').pop();
          formData.append('media', {
            uri: m.uri,
            name: `media_${Date.now()}.${ext}`,
            type: m.type === 'video' ? `video/${ext}` : `image/${ext}`,
          });
        }
      });

      await updateOpportunity(opportunityId, formData);
      Alert.alert('Updated!', 'Your opportunity has been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error('[EditOpportunity] Update error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to update. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading opportunity details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render Form (header commented out) ────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/*
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={25} color={C.text} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Edit Opportunity</Text>
            <Text style={s.headerSub} numberOfLines={1}>{title}</Text>
          </View>
          <TouchableOpacity style={[s.saveBtn, submitting && { opacity: 0.6 }]} onPress={handleUpdate} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>
      */}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FormCard>
            <SectionHeader icon="document-text-outline" title="Basic Info" />
            <Field label="Job Title" required icon="briefcase-outline" error={errors.title}>
              <StyledInput
                value={title} onChangeText={t => { setTitle(t); setErrors(e => ({ ...e, title: null })); }}
                placeholder="e.g. Senior React Native Developer"
                hasError={!!errors.title}
              />
            </Field>
            <Field label="Company Name" required icon="business-outline" error={errors.company}>
              <StyledInput
                value={company} onChangeText={t => { setCompany(t); setErrors(e => ({ ...e, company: null })); }}
                placeholder="e.g. Google"
                hasError={!!errors.company}
              />
            </Field>
            <Field label="Apply Link" icon="link-outline" error={errors.applyLink} hint="Must start with https://">
              <StyledInput
                value={applyLink} onChangeText={t => { setApplyLink(t); setErrors(e => ({ ...e, applyLink: null })); }}
                placeholder="https://company.com/apply"
                keyboardType="url" autoCapitalize="none"
                hasError={!!errors.applyLink}
              />
            </Field>
          </FormCard>

          <FormCard>
            <SectionHeader icon="options-outline" title="Classification" />
            <Field label="Opportunity Type">
              <PillSelector options={TYPE_OPTIONS} value={type} onSelect={setType} />
            </Field>
            <Field label="Posting Status" hint="Set to 'Closed' to stop accepting applications">
              <PillSelector options={STATUS_OPTIONS} value={status} onSelect={setStatus} />
            </Field>
          </FormCard>

          <FormCard>
            <SectionHeader icon="location-outline" title="Location" />
            <Field label="City / Address" icon="map-outline">
              <StyledInput value={location} onChangeText={setLocation} placeholder="e.g. Lahore, Pakistan" />
            </Field>
            <ToggleRow
              label="Remote Work"
              subtitle={isRemote ? 'This position allows remote work' : 'On-site only'}
              value={isRemote}
              onToggle={setIsRemote}
            />
          </FormCard>

          <FormCard>
            <SectionHeader icon="reader-outline" title="Details" />
            <Field label="Description" required error={errors.description}>
              <StyledInput
                value={description} onChangeText={t => { setDescription(t); setErrors(e => ({ ...e, description: null })); }}
                placeholder="Describe the role, responsibilities, and what makes it exciting..."
                multiline hasError={!!errors.description}
              />
            </Field>
            <Field label="Requirements">
              <StyledInput
                value={requirements} onChangeText={setRequirements}
                placeholder="Years of experience, qualifications, education..."
                multiline
              />
            </Field>
            <Field label="Deadline" icon="calendar-outline" error={errors.deadline} hint="Format: YYYY-MM-DD">
              <StyledInput
                value={deadline} onChangeText={t => { setDeadline(t); setErrors(e => ({ ...e, deadline: null })); }}
                placeholder="2025-12-31"
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                hasError={!!errors.deadline}
              />
            </Field>
          </FormCard>

          <FormCard>
            <SectionHeader icon="code-slash-outline" title="Required Skills" />
            <Field label="Skills" hint="Type a skill and press Add or Return to add it">
              <SkillsInput skills={skills} onChange={setSkills} />
            </Field>
          </FormCard>

          <FormCard>
            <SectionHeader icon="images-outline" title="Media" />
            <MediaSection
              mediaItems={mediaItems}
              onAdd={handleAddMedia}
              onRemove={handleRemoveMedia}
            />
          </FormCard>

          <View style={s.btnWrap}>
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleUpdate}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={s.submitText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} disabled={submitting}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: C.muted, marginTop: 8 },
  header: {
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: C.muted, marginTop: 1, maxWidth: 200 },
  saveBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnWrap: { paddingHorizontal: 16, marginTop: 20, gap: 10 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 15,
    shadowColor: C.primary, shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card,
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: C.subtext },
});