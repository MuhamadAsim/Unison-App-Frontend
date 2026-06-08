import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,   // ✅ added missing import
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  getAllSkills,
  searchUsers,
  searchOpportunities,
  searchUserByUsername,
} from '../../services/api';

const { width: SW, height: SH } = Dimensions.get('window');
const ms = (n, f = 0.5) => n + ((SW / 375) * n - n) * f;
const vs = n => (SH / 812) * n;

// Tokens
const C = {
  primary: '#534AB7',
  primaryDark: '#3730A3',
  primarySoft: '#EEEDFE',
  primaryBorder: '#C7D2FE',
  bg: '#F4F4F8',
  card: '#FFFFFF',
  text: '#1A1A2E',
  subtext: '#4B5563',
  muted: '#9CA3AF',
  border: '#E8E8F0',
  divider: '#F3F4F6',
  green: '#10B981', greenSoft: '#D1FAE5',
  amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  coral: '#DC2626', coralSoft: '#FEE2E2',
};

const TABS = [
  { key: 'alumni', label: 'Users', icon: 'people-outline' },
  { key: 'opportunities', label: 'Jobs', icon: 'briefcase-outline' },
  { key: 'users', label: 'Username', icon: 'at-outline' },
];

const MOCK_SKILLS = [
  'JavaScript', 'React', 'React Native', 'Node.js', 'Python', 'Java',
  'Swift', 'Kotlin', 'Flutter', 'UI/UX', 'Product Management',
  'Data Science', 'Machine Learning', 'DevOps', 'GraphQL', 'TypeScript',
  'Vue.js', 'Angular', 'PHP', 'SQL', 'MongoDB', 'PostgreSQL', 'Firebase',
  'AWS', 'Azure', 'Docker', 'Cloud Computing',
];

// Helpers
const initials = (n = '') =>
  n.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const avatarBg = (n = '') => {
  const p = ['#534AB7', '#7C3AED', '#2563EB', '#10B981', '#D97706', '#DC2626'];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
};

const typeMeta = t => ({
  job: { label: 'Job', color: C.blue, bg: C.blueSoft },
  internship: { label: 'Internship', color: C.green, bg: C.greenSoft },
  freelance: { label: 'Freelance', color: C.amber, bg: C.amberSoft },
}[t?.toLowerCase()] ?? { label: t || 'Other', color: C.muted, bg: C.divider });

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name = '', uri, size = ms(46) }) {
  const [err, setErr] = useState(false);
  if (uri && !err)
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.border }}
        onError={() => setErr(true)}
      />
    );
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarBg(name), justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.37, fontWeight: '800', color: '#fff' }}>{initials(name)}</Text>
    </View>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ label, color = C.primary, bg = C.primarySoft, border = C.primaryBorder }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: ms(20), paddingHorizontal: ms(8), paddingVertical: vs(3), borderWidth: 1, borderColor: border }}>
      <Text style={{ fontSize: ms(11), fontWeight: '600', color }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Alumni Card ──────────────────────────────────────────────────────────────
function AlumniCard({ item, onPress }) {
  const name = item.display_name || item.username || '';
  const skills = (item.skills || []).slice(0, 3);
  const extra = (item.skills?.length || 0) - 3;
  return (
    <TouchableOpacity style={T.card} onPress={onPress} activeOpacity={0.78}>
      <View>
        <Avatar name={name} uri={item.profile_picture} size={ms(48)} />
        {item.company && <View style={T.onlineDot} />}
      </View>
      <View style={{ flex: 1, gap: vs(3) }}>
        <Text style={T.cardName} numberOfLines={1}>{name}</Text>
        <View style={T.metaRow}>
          {item.role && <Text style={T.roleText} numberOfLines={1}>{item.role}</Text>}
          {item.role && item.company && <Text style={T.dot}>·</Text>}
          {item.company && (
            <View style={T.inRow}>
              <Ionicons name="business-outline" size={ms(11)} color={C.muted} />
              <Text style={T.mutedText} numberOfLines={1}>{item.company}</Text>
            </View>
          )}
        </View>
        {skills.length > 0 && (
          <View style={T.pillsRow}>
            {skills.map((s, i) => <Pill key={i} label={s} />)}
            {extra > 0 && <Pill label={`+${extra}`} color={C.muted} bg={C.divider} border={C.border} />}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={ms(15)} color={C.border} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OpportunityCard({ item, onPress }) {
  const { label, color, bg } = typeMeta(item.type);
  return (
    <TouchableOpacity style={T.card} onPress={onPress} activeOpacity={0.78}>
      <View style={[T.oppIcon, { backgroundColor: C.primarySoft }]}>
        <Ionicons name="briefcase" size={ms(20)} color={C.primary} />
      </View>
      <View style={{ flex: 1, gap: vs(4) }}>
        <View style={T.oppTopRow}>
          <Text style={[T.cardName, { flex: 1 }]} numberOfLines={1}>{item.title}</Text>
          <View style={{ backgroundColor: bg, borderRadius: ms(20), paddingHorizontal: ms(8), paddingVertical: vs(3) }}>
            <Text style={{ fontSize: ms(10), fontWeight: '700', color }}>{label}</Text>
          </View>
        </View>
        {item.company_name && (
          <View style={T.inRow}>
            <Ionicons name="business-outline" size={ms(12)} color={C.muted} />
            <Text style={T.mutedText} numberOfLines={1}>{item.company_name}</Text>
          </View>
        )}
        {item.location && (
          <View style={T.inRow}>
            <Ionicons name="location-outline" size={ms(12)} color={C.muted} />
            <Text style={T.mutedText} numberOfLines={1}>{item.location}{item.is_remote ? ' · Remote' : ''}</Text>
          </View>
        )}
        <View style={T.cardFooter}>
          {item.created_at && (
            <Text style={T.dateText}>
              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
          <View style={T.inRow}>
            <Text style={T.viewLink}>View details</Text>
            <Ionicons name="arrow-forward" size={ms(11)} color={C.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({ item }) {
  const name = item.display_name || item.username || '';
  const isAlumni = ['alumni'].includes(item.role || item.user_type || '');
  return (
    <View style={T.card}>
      <Avatar name={name} uri={item.profile_picture} size={ms(52)} />
      <View style={{ flex: 1, gap: vs(4) }}>
        <View style={T.metaRow}>
          <Text style={T.cardName}>{name}</Text>
          <View style={{ backgroundColor: isAlumni ? C.greenSoft : C.blueSoft, borderRadius: ms(20), paddingHorizontal: ms(8), paddingVertical: vs(2) }}>
            <Text style={{ fontSize: ms(10), fontWeight: '700', color: isAlumni ? C.green : C.blue }}>
              {isAlumni ? 'Alumni' : 'Student'}
            </Text>
          </View>
        </View>
        <Text style={[T.mutedText, { fontWeight: '500' }]}>@{item.username}</Text>
        {(item.job_role || item.company) && (
          <Text style={T.roleText} numberOfLines={1}>
            {[item.job_role, item.company].filter(Boolean).join(' at ')}
          </Text>
        )}
        {item.degree && (
          <Text style={T.mutedText} numberOfLines={1}>
            {item.degree}{item.graduation_year ? ` · ${item.graduation_year}` : ''}
          </Text>
        )}
        {item.bio ? <Text style={[T.mutedText, { fontStyle: 'italic', lineHeight: ms(17) }]} numberOfLines={2}>{item.bio}</Text> : null}
        {item.skills?.length > 0 && (
          <View style={T.pillsRow}>
            {item.skills.slice(0, 4).map((sk, i) => <Pill key={i} label={sk} />)}
          </View>
        )}
        {item.linkedin_url && (
          <View style={T.inRow}>
            <Ionicons name="logo-linkedin" size={ms(13)} color="#0A66C2" />
            <Text style={{ fontSize: ms(12), color: '#0A66C2', fontWeight: '600' }}>LinkedIn</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const T = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: ms(12),
    backgroundColor: C.card, borderRadius: ms(16),
    borderWidth: 1, borderColor: C.border,
    padding: ms(14), marginBottom: vs(10),
    shadowColor: '#534AB7', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardName: { fontSize: ms(14), fontWeight: '700', color: C.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: ms(5) },
  inRow: { flexDirection: 'row', alignItems: 'center', gap: ms(4) },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(5), marginTop: vs(3) },
  roleText: { fontSize: ms(12), color: C.subtext, fontWeight: '500' },
  mutedText: { fontSize: ms(12), color: C.muted },
  dot: { fontSize: ms(12), color: C.muted },
  onlineDot: { position: 'absolute', bottom: ms(2), right: ms(2), width: ms(10), height: ms(10), borderRadius: ms(5), backgroundColor: C.green, borderWidth: ms(2), borderColor: C.card },
  oppIcon: { width: ms(44), height: ms(44), borderRadius: ms(12), justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  oppTopRow: { flexDirection: 'row', alignItems: 'center', gap: ms(8) },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: vs(4), paddingTop: vs(6), borderTopWidth: 1, borderTopColor: C.divider },
  dateText: { fontSize: ms(11), color: C.muted },
  viewLink: { fontSize: ms(12), fontWeight: '700', color: C.primary },
});

// ─── Skill Sheet (unchanged) ─────────────────────────────────────────────────
function SkillSheet({ visible, skills, selected, onSelect, onClose }) {
  const slideY = useRef(new Animated.Value(SH)).current;
  const [q, setQ] = useState('');

  useEffect(() => {
    if (visible) {
      setQ('');
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    } else {
      Animated.timing(slideY, { toValue: SH, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const filtered = skills.filter(s => s.toLowerCase().includes(q.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={sh.backdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={[sh.panel, { transform: [{ translateY: slideY }] }]}>
            <View style={sh.handle} />
            <View style={sh.panelHeader}>
              <Text style={sh.title}>Filter by Skill</Text>
              <TouchableOpacity style={sh.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={ms(18)} color={C.subtext} />
              </TouchableOpacity>
            </View>
            <View style={sh.searchBar}>
              <Ionicons name="search" size={ms(16)} color={C.muted} />
              <TextInput
                style={sh.searchInput}
                placeholder="Search skills…"
                placeholderTextColor={C.muted}
                value={q}
                onChangeText={setQ}
                autoFocus
              />
              {q.length > 0 && (
                <TouchableOpacity onPress={() => setQ('')}>
                  <Ionicons name="close-circle" size={ms(16)} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={sh.item} onPress={() => { onSelect(null); onClose(); }}>
                <Text style={[sh.itemText, !selected && sh.itemActive]}>Any skill</Text>
                {!selected && <Ionicons name="checkmark-circle" size={ms(18)} color={C.primary} />}
              </TouchableOpacity>
              {filtered.map(skill => (
                <TouchableOpacity key={skill} style={sh.item} onPress={() => { onSelect(skill); onClose(); }}>
                  <Text style={[sh.itemText, selected === skill && sh.itemActive]}>{skill}</Text>
                  {selected === skill && <Ionicons name="checkmark-circle" size={ms(18)} color={C.primary} />}
                </TouchableOpacity>
              ))}
              <View style={{ height: vs(40) }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const sh = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,15,35,0.52)' },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: ms(24), borderTopRightRadius: ms(24), paddingHorizontal: ms(20), paddingTop: ms(12), maxHeight: SH * 0.72, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 20 },
  handle: { width: ms(36), height: vs(4), borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: vs(14) },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(14) },
  title: { fontSize: ms(17), fontWeight: '800', color: C.text },
  closeBtn: { width: ms(32), height: ms(32), borderRadius: ms(16), backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: ms(8), backgroundColor: C.bg, borderRadius: ms(12), borderWidth: 1, borderColor: C.border, paddingHorizontal: ms(12), paddingVertical: vs(10), marginBottom: vs(6) },
  searchInput: { flex: 1, fontSize: ms(14), color: C.text },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: vs(13), borderBottomWidth: 1, borderBottomColor: C.divider },
  itemText: { fontSize: ms(14), color: C.subtext, fontWeight: '500' },
  itemActive: { color: C.primary, fontWeight: '700' },
});

// ─── Filter Sheet (slides from top) ──────────────────────────────────────────
function FilterSheet({ visible, selectedSkill, company, batch, degree, onSkillPress, onCompanyChange, onBatchChange, onDegreeChange, onClose }) {
  const slideY = useRef(new Animated.Value(-SH)).current;
  const [tempCompany, setTempCompany] = useState(company);
  const [tempBatch, setTempBatch] = useState(batch);
  const [tempDegree, setTempDegree] = useState(degree);

  useEffect(() => {
    if (visible) {
      setTempCompany(company);
      setTempBatch(batch);
      setTempDegree(degree);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    } else {
      Animated.timing(slideY, { toValue: -SH, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, company, batch, degree]);

  const handleApply = () => {
    onCompanyChange(tempCompany);
    onBatchChange(tempBatch);
    onDegreeChange(tempDegree);
    onClose();
  };

  const handleClear = () => {
    setTempCompany('');
    setTempBatch('');
    setTempDegree('');
    onCompanyChange('');
    onBatchChange('');
    onDegreeChange('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={sh.backdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={[fsTop.panel, { transform: [{ translateY: slideY }] }]}>
            <View style={fsTop.handle} />
            <View style={fsTop.panelHeader}>
              <Text style={fsTop.title}>Filter Alumni</Text>
              <TouchableOpacity style={fsTop.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={ms(18)} color={C.subtext} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: vs(40) }}
            >
              <View style={fs.row}>
                <Text style={fs.label}>Skill</Text>
                <TouchableOpacity style={fs.select} onPress={onSkillPress}>
                  <Text style={[fs.selectText, !selectedSkill && { color: C.muted }]}>
                    {selectedSkill || 'Any skill'}
                  </Text>
                  <Ionicons name="chevron-down" size={ms(14)} color={C.muted} />
                </TouchableOpacity>
              </View>

              <View style={fs.row}>
                <Text style={fs.label}>Company</Text>
                <TextInput
                  style={fs.input}
                  placeholder="e.g. Arbisoft"
                  placeholderTextColor={C.muted}
                  value={tempCompany}
                  onChangeText={setTempCompany}
                  returnKeyType="done"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: ms(10) }}>
                <View style={[fs.row, { flex: 1 }]}>
                  <Text style={fs.label}>Batch Year</Text>
                  <TextInput
                    style={fs.input}
                    placeholder="2021"
                    placeholderTextColor={C.muted}
                    value={tempBatch}
                    onChangeText={setTempBatch}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <View style={[fs.row, { flex: 1 }]}>
                  <Text style={fs.label}>Degree</Text>
                  <TextInput
                    style={fs.input}
                    placeholder="BSCS"
                    placeholderTextColor={C.muted}
                    value={tempDegree}
                    onChangeText={setTempDegree}
                  />
                </View>
              </View>

              <View style={fs.buttonRow}>
                <TouchableOpacity style={[fs.btn, fs.clearBtn]} onPress={handleClear}>
                  <Text style={[fs.btnText, { color: C.coral }]}>Clear all</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[fs.btn, fs.applyBtn]} onPress={handleApply}>
                  <Text style={[fs.btnText, { color: '#fff' }]}>Apply filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const fs = StyleSheet.create({
  row: { gap: vs(5), marginBottom: vs(14) },
  label: { fontSize: ms(10), fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: C.border, borderRadius: ms(10), paddingHorizontal: ms(12), paddingVertical: vs(11), backgroundColor: C.bg },
  selectText: { fontSize: ms(14), color: C.text },
  input: { borderWidth: 1.5, borderColor: C.border, borderRadius: ms(10), paddingHorizontal: ms(12), paddingVertical: vs(11), backgroundColor: C.bg, fontSize: ms(14), color: C.text },
  buttonRow: { flexDirection: 'row', gap: ms(12), marginTop: vs(8) },
  btn: { flex: 1, paddingVertical: vs(12), borderRadius: ms(12), alignItems: 'center', justifyContent: 'center' },
  clearBtn: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  applyBtn: { backgroundColor: C.primary },
  btnText: { fontSize: ms(14), fontWeight: '700' },
});

// Styles for top-slide panel
const fsTop = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderBottomLeftRadius: ms(24),
    borderBottomRightRadius: ms(24),
    paddingHorizontal: ms(20),
    paddingTop: ms(12),
    maxHeight: SH * 0.75,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  handle: {
    width: ms(36),
    height: vs(4),
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: vs(14),
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: vs(14),
  },
  title: {
    fontSize: ms(17),
    fontWeight: '800',
    color: C.text,
  },
  closeBtn: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SearchScreen({ navigation }) {
  const [tab, setTab] = useState('alumni');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterDegree, setFilterDegree] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [skillSheet, setSkillSheet] = useState(false);
  const [usernameQ, setUsernameQ] = useState('');
  const [userResult, setUserResult] = useState(null);
  const [userSearched, setUserSearched] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [skills, setSkills] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 480);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    getAllSkills()
      .then(r => setSkills(r.data?.length ? r.data : MOCK_SKILLS))
      .catch(() => setSkills(MOCK_SKILLS));
  }, []);

  const activeCount = [selectedSkill, filterCompany, filterBatch, filterDegree].filter(Boolean).length;

  const doSearch = useCallback(async () => {
    if (tab === 'users') return;
    try {
      setLoading(true); setHasSearched(true);
      if (tab === 'alumni') {
        const p = {};
        if (debouncedQuery) p.display_name = debouncedQuery;
        if (selectedSkill) p.skill = selectedSkill;
        if (filterCompany) p.company = filterCompany;
        if (filterBatch) p.batch_year = filterBatch;
        if (filterDegree) p.degree = filterDegree;
        const r = await searchUsers(p);
        setResults(Array.isArray(r.data) ? r.data : []);
      } else {
        const p = {};
        if (debouncedQuery) p.title = debouncedQuery;
        if (selectedSkill) p.skill = selectedSkill;
        const r = await searchOpportunities(p);
        setResults(Array.isArray(r.data) ? r.data : r.data?.opportunities || []);
      }
    } catch (e) {
      Alert.alert('Search Failed', e.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedQuery, selectedSkill, filterCompany, filterBatch, filterDegree]);

  useEffect(() => {
    if (tab !== 'users' && (debouncedQuery || activeCount > 0)) doSearch();
  }, [doSearch, tab]);

  useEffect(() => {
    setResults([]); setQuery(''); setDebouncedQuery(''); setHasSearched(false);
    setUserResult(null); setUserSearched(false); setUserError('');
    setUsernameQ(''); setFilterSheetVisible(false);
  }, [tab]);

  const handleUserSearch = async () => {
    if (!usernameQ.trim()) return;
    try {
      setUserLoading(true); setUserError(''); setUserResult(null);
      const r = await searchUserByUsername(usernameQ.trim());
      setUserResult(r.data); setUserSearched(true);
    } catch (e) {
      setUserSearched(true);
      setUserError(e?.response?.status === 404
        ? 'No user found with that username.'
        : e?.response?.data?.message || 'Something went wrong.');
    } finally {
      setUserLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedSkill(null);
    setFilterCompany('');
    setFilterBatch('');
    setFilterDegree('');
  };

  const renderItem = ({ item }) =>
    tab === 'alumni'
      ? <AlumniCard item={item} onPress={() => navigation.navigate('AlumniPublicProfile', { alumni: item })} />
      : <OpportunityCard item={item} onPress={() => navigation.navigate('OpportunityDetail', { id: item.id })} />;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Discover</Text>
          <Text style={s.headerSub}>Alumni · Jobs · People</Text>
        </View>
        <View style={s.headerIconWrap}>
          <Ionicons name="compass" size={ms(22)} color={C.primary} />
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.75}
          >
            <Ionicons name={t.icon} size={ms(15)} color={tab === t.key ? C.primary : C.muted} />
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FIND USER TAB */}
      {tab === 'users' && (
        <View style={s.flex}>
          <View style={s.searchRow}>
            <View style={s.searchBox}>
              <Ionicons name="at-outline" size={ms(18)} color={C.muted} />
              <TextInput
                style={s.searchInput}
                placeholder="Enter exact username…"
                placeholderTextColor={C.muted}
                value={usernameQ}
                onChangeText={t => { setUsernameQ(t); setUserResult(null); setUserSearched(false); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleUserSearch}
              />
              {usernameQ.length > 0 && (
                <TouchableOpacity onPress={() => { setUsernameQ(''); setUserResult(null); setUserSearched(false); }}>
                  <Ionicons name="close-circle" size={ms(18)} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={s.goBtn} onPress={handleUserSearch}>
              {userLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="search" size={ms(18)} color="#fff" />}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.flex} contentContainerStyle={s.listPad} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {!userSearched && <EmptyState icon="person-circle-outline" title="Find Anyone" sub="Enter an exact username to look up any alumni or student" />}
            {userSearched && userError && <EmptyState icon="alert-circle-outline" title="Not Found" sub={userError} />}
            {userSearched && !userError && userResult && <UserCard item={userResult} />}
          </ScrollView>
        </View>
      )}

      {/* ALUMNI / JOBS TAB */}
      {tab !== 'users' && (
        <View style={s.flex}>
          {/* Search bar */}
          <View style={s.searchRow}>
            <View style={s.searchBox}>
              <Ionicons name="search" size={ms(18)} color={C.muted} />
              <TextInput
                style={s.searchInput}
                placeholder={tab === 'alumni' ? 'Search by name…' : 'Search opportunities…'}
                placeholderTextColor={C.muted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={ms(18)} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>

            {tab === 'alumni' && (
              <TouchableOpacity
                style={[s.iconBtn, activeCount > 0 && s.iconBtnActive]}
                onPress={() => setFilterSheetVisible(true)}
              >
                <Ionicons name="options-outline" size={ms(18)} color={activeCount > 0 ? C.primary : C.subtext} />
                {activeCount > 0 && (
                  <View style={s.badge}><Text style={s.badgeText}>{activeCount}</Text></View>
                )}
              </TouchableOpacity>
            )}

            {tab === 'opportunities' && (
              <TouchableOpacity
                style={[s.iconBtn, selectedSkill && s.iconBtnActive]}
                onPress={() => setSkillSheet(true)}
              >
                <Ionicons name="code-slash-outline" size={ms(18)} color={selectedSkill ? C.primary : C.subtext} />
                {selectedSkill && (
                  <View style={s.badge}><Text style={s.badgeText}>1</Text></View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Active filter chips – compact version */}
          {(activeCount > 0 || (tab === 'opportunities' && selectedSkill)) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.compactChipsRow}
              style={{ flexGrow: 0 }}
            >
              {selectedSkill && <Chip label={selectedSkill} active onClear={() => setSelectedSkill(null)} />}
              {filterCompany && <Chip label={filterCompany} active onClear={() => setFilterCompany('')} />}
              {filterBatch && <Chip label={`Batch ${filterBatch}`} active onClear={() => setFilterBatch('')} />}
              {filterDegree && <Chip label={filterDegree} active onClear={() => setFilterDegree('')} />}
              {activeCount > 0 && (
                <TouchableOpacity onPress={clearFilters} style={s.compactClearBtn}>
                  <Text style={s.compactClearText}>Clear all</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* Results */}
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.loadingText}>Searching…</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item, i) => String(item.id ?? i)}
              contentContainerStyle={s.listPad}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                hasSearched && results.length > 0
                  ? <Text style={s.resultCount}>{results.length} result{results.length !== 1 ? 's' : ''}</Text>
                  : null
              }
              ListEmptyComponent={
                hasSearched
                  ? <EmptyState icon={tab === 'alumni' ? 'people-outline' : 'briefcase-outline'} title="No results" sub="Try different keywords or adjust your filters" />
                  : <EmptyState icon="search-outline" title={tab === 'alumni' ? 'Search Alumni' : 'Search Jobs'} sub="Type a name or apply filters to get started" />
              }
              renderItem={renderItem}
            />
          )}
        </View>
      )}

      {/* Modals */}
      <SkillSheet
        visible={skillSheet}
        skills={skills}
        selected={selectedSkill}
        onSelect={setSelectedSkill}
        onClose={() => setSkillSheet(false)}
      />

      <FilterSheet
        visible={filterSheetVisible}
        selectedSkill={selectedSkill}
        company={filterCompany}
        batch={filterBatch}
        degree={filterDegree}
        onSkillPress={() => setSkillSheet(true)}
        onCompanyChange={setFilterCompany}
        onBatchChange={setFilterBatch}
        onDegreeChange={setFilterDegree}
        onClose={() => setFilterSheetVisible(false)}
      />
    </View>
  );
}

// ─── EmptyState & Chip components ────────────────────────────────────────────
function EmptyState({ icon, title, sub }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: vs(64), paddingHorizontal: ms(32), gap: vs(8) }}>
      <View style={{ width: ms(68), height: ms(68), borderRadius: ms(34), backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center', marginBottom: vs(4) }}>
        <Ionicons name={icon} size={ms(30)} color={C.muted} />
      </View>
      <Text style={{ fontSize: ms(16), fontWeight: '700', color: C.subtext }}>{title}</Text>
      <Text style={{ fontSize: ms(13), color: C.muted, textAlign: 'center', lineHeight: ms(20) }}>{sub}</Text>
    </View>
  );
}

function Chip({ label, active, onPress, onClear }) {
  return (
    <TouchableOpacity style={[ch.chip, active && ch.active]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[ch.text, active && ch.textActive]} numberOfLines={1}>{label}</Text>
      {active && onClear && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
          <Ionicons name="close-circle" size={ms(14)} color={C.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const ch = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: ms(20),
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    backgroundColor: C.card,
    marginRight: ms(6),
  },
  active: { borderColor: C.primary, backgroundColor: C.primarySoft },
  text: { fontSize: ms(12), color: C.subtext, fontWeight: '500' },
  textActive: { color: C.primary, fontWeight: '700' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? vs(56) : vs(24),
    paddingHorizontal: ms(20), paddingBottom: vs(14),
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: ms(26), fontWeight: '900', color: C.text, letterSpacing: -0.5 ,marginTop: vs(18)},
  headerSub: { fontSize: ms(12), color: C.muted, marginTop: vs(2) },
  headerIconWrap: { width: ms(42), height: ms(42), borderRadius: ms(12), backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center',marginTop: vs(18) },

  tabBar: {
    flexDirection: 'row', gap: ms(8),
    backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: ms(16), paddingVertical: vs(10),
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ms(5), paddingVertical: vs(9), borderRadius: ms(12), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  tabActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  tabText: { fontSize: ms(12), fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary, fontWeight: '700' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: ms(10),
    paddingHorizontal: ms(16), paddingVertical: vs(12),
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: ms(10),
    backgroundColor: C.bg, borderRadius: ms(12),
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: ms(13), paddingVertical: vs(11),
  },
  searchInput: { flex: 1, fontSize: ms(14), color: C.text },
  goBtn: { width: ms(46), height: ms(46), borderRadius: ms(12), backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: ms(46), height: ms(46), borderRadius: ms(12), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  iconBtnActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  badge: { position: 'absolute', top: -ms(4), right: -ms(4), width: ms(17), height: ms(17), borderRadius: ms(9), backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', borderWidth: ms(2), borderColor: C.card },
  badgeText: { fontSize: ms(8), fontWeight: '800', color: '#fff' },

  // Compact chips row – takes less vertical space
  compactChipsRow: {
    paddingHorizontal: ms(16),
    paddingVertical: vs(6),
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactClearBtn: {
    marginLeft: ms(8),
    paddingHorizontal: ms(6),
  },
  compactClearText: {
    fontSize: ms(12),
    color: C.coral,
    fontWeight: '700',
  },

  listPad: { paddingHorizontal: ms(16), paddingTop: vs(10), paddingBottom: vs(40) },
  resultCount: { fontSize: ms(12), color: C.muted, fontWeight: '600', marginBottom: vs(6) },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: vs(10) },
  loadingText: { fontSize: ms(14), color: C.muted },
});