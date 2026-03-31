import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { searchAlumni, searchOpportunities, searchUserByUsername } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Responsive Scaling ──────────────────────────────────────────────────────
const scale = (size) => (SCREEN_WIDTH / 375) * size; // 375 is base width (iPhone 6/7/8)
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// ─── Design Tokens (matches app) ─────────────────────────────────────────────
const C = {
  primary:       '#4F46E5',
  primaryDark:   '#3730A3',
  primarySoft:   '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg:            '#F8F8FC',
  card:          '#FFFFFF',
  text:          '#0F0F23',
  subtext:       '#4B5563',
  muted:         '#9CA3AF',
  border:        '#E5E7EB',
  divider:       '#F3F4F6',
  green:         '#059669', greenSoft: '#D1FAE5',
  amber:         '#D97706', amberSoft: '#FEF3C7',
  blue:          '#2563EB', blueSoft:  '#DBEAFE',
  coral:         '#DC2626', coralSoft: '#FEE2E2',
  shadow:        'rgba(79,70,229,0.10)',
};

const TABS = [
  { key: 'alumni',        label: 'Alumni',        icon: 'people-outline'        },
  { key: 'opportunities', label: 'Opportunities', icon: 'briefcase-outline'     },
  { key: 'users',         label: 'Find User',     icon: 'search-outline' }, // Fixed icon
];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const avatarColor = (name = '') => {
  const colors = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ─── Responsive Avatar ───────────────────────────────────────────────────────
function Avatar({ name = '', uri, size = moderateScale(44) }) {
  const [imgError, setImgError] = useState(false);
  const color = avatarColor(name);
  const fontSize = size * 0.38;

  if (uri && !imgError) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.border }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ fontSize, fontWeight: '800', color: '#fff' }}>{initials(name)}</Text>
    </View>
  );
}

// ─── Responsive Skill Pill ───────────────────────────────────────────────────
function SkillPill({ label, small }) {
  return (
    <View style={[sp.pill, small && sp.pillSmall]}>
      <Text style={[sp.text, small && sp.textSmall]} numberOfLines={1}>{label}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  pill:      { 
    backgroundColor: C.primarySoft, 
    borderRadius: moderateScale(20), 
    paddingHorizontal: moderateScale(10), 
    paddingVertical: verticalScale(4), 
    borderWidth: 1, 
    borderColor: C.primaryBorder 
  },
  pillSmall: { paddingHorizontal: moderateScale(8), paddingVertical: verticalScale(2) },
  text:      { fontSize: moderateScale(12), fontWeight: '600', color: C.primary },
  textSmall: { fontSize: moderateScale(11) },
});

// ─── Alumni Card ──────────────────────────────────────────────────────────────
function AlumniCard({ item, onPress }) {
  const skills = item.skills || [];
  const visibleSkills = skills.slice(0, 3);
  const extraCount = skills.length - 3;

  return (
    <TouchableOpacity style={ac.card} onPress={onPress} activeOpacity={0.82}>
      <View style={ac.left}>
        <Avatar name={item.display_name} uri={item.profile_picture} size={moderateScale(50)} />
        {item.company ? <View style={ac.onlineDot} /> : null}
      </View>
      <View style={ac.body}>
        <Text style={ac.name} numberOfLines={1}>{item.display_name}</Text>
        {(item.role || item.company) ? (
          <View style={ac.metaRow}>
            {item.role   && <Text style={ac.role} numberOfLines={1}>{item.role}</Text>}
            {item.role && item.company && <Text style={ac.sep}>·</Text>}
            {item.company && (
              <View style={ac.companyRow}>
                <Ionicons name="business-outline" size={moderateScale(11)} color={C.muted} />
                <Text style={ac.company} numberOfLines={1}>{item.company}</Text>
              </View>
            )}
          </View>
        ) : null}
        {visibleSkills.length > 0 && (
          <View style={ac.skillsRow}>
            {visibleSkills.map((s, i) => <SkillPill key={i} label={s} small />)}
            {extraCount > 0 && (
              <View style={[sp.pill, sp.pillSmall, { backgroundColor: C.divider, borderColor: C.border }]}>
                <Text style={[sp.text, sp.textSmall, { color: C.muted }]}>+{extraCount}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={moderateScale(16)} color={C.border} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}
const ac = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card,
    borderRadius: moderateScale(16), 
    borderWidth: 1, 
    borderColor: C.border,
    padding: moderateScale(14), 
    marginBottom: verticalScale(10), 
    gap: moderateScale(12),
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 2,
  },
  left:       { position: 'relative' },
  onlineDot:  { 
    position: 'absolute', 
    bottom: moderateScale(2), 
    right: moderateScale(2), 
    width: moderateScale(10), 
    height: moderateScale(10), 
    borderRadius: moderateScale(5), 
    backgroundColor: C.green, 
    borderWidth: moderateScale(2), 
    borderColor: C.card 
  },
  body:       { flex: 1, gap: verticalScale(3) },
  name:       { fontSize: moderateScale(15), fontWeight: '700', color: C.text },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: moderateScale(5), flexWrap: 'wrap' },
  role:       { fontSize: moderateScale(12), color: C.subtext, fontWeight: '500' },
  sep:        { fontSize: moderateScale(12), color: C.muted },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(3) },
  company:    { fontSize: moderateScale(12), color: C.muted },
  skillsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(5), marginTop: verticalScale(5) },
});

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OpportunityCard({ item, onPress }) {
  const typeColor = item.type === 'internship'
    ? { text: C.amber,  bg: C.amberSoft }
    : { text: C.green,  bg: C.greenSoft };

  return (
    <TouchableOpacity style={oc.card} onPress={onPress} activeOpacity={0.82}>
      <View style={oc.top}>
        <View style={oc.iconWrap}>
          <Ionicons name="briefcase" size={moderateScale(20)} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={oc.title} numberOfLines={2}>{item.title}</Text>
          {item.company_name && (
            <View style={oc.companyRow}>
              <Ionicons name="business-outline" size={moderateScale(12)} color={C.muted} />
              <Text style={oc.company}>{item.company_name}</Text>
            </View>
          )}
        </View>
        {item.type && (
          <View style={[oc.typeBadge, { backgroundColor: typeColor.bg }]}>
            <Text style={[oc.typeText, { color: typeColor.text }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        )}
      </View>
      {item.location && (
        <View style={oc.locationRow}>
          <Ionicons name="location-outline" size={moderateScale(12)} color={C.muted} />
          <Text style={oc.location}>{item.location}</Text>
        </View>
      )}
      <View style={oc.footer}>
        {item.created_at && (
          <Text style={oc.date}>
            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        )}
        <View style={oc.viewRow}>
          <Text style={oc.viewText}>View Details</Text>
          <Ionicons name="arrow-forward" size={moderateScale(13)} color={C.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
const oc = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: moderateScale(16), 
    borderWidth: 1, 
    borderColor: C.border,
    padding: moderateScale(14), 
    marginBottom: verticalScale(10),
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 2,
    gap: verticalScale(8),
  },
  top:        { flexDirection: 'row', gap: moderateScale(12), alignItems: 'flex-start' },
  iconWrap:   { 
    width: moderateScale(42), 
    height: moderateScale(42), 
    borderRadius: moderateScale(12), 
    backgroundColor: C.primarySoft, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title:      { fontSize: moderateScale(14), fontWeight: '700', color: C.text, marginBottom: verticalScale(3), paddingRight: moderateScale(8) },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(4) },
  company:    { fontSize: moderateScale(12), color: C.muted },
  typeBadge:  { borderRadius: moderateScale(20), paddingHorizontal: moderateScale(10), paddingVertical: verticalScale(4), alignSelf: 'flex-start' },
  typeText:   { fontSize: moderateScale(11), fontWeight: '700' },
  locationRow:{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(4) },
  location:   { fontSize: moderateScale(12), color: C.muted },
  footer:     { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: verticalScale(6), 
    borderTopWidth: 1, 
    borderTopColor: C.divider 
  },
  date:       { fontSize: moderateScale(11), color: C.muted },
  viewRow:    { flexDirection: 'row', alignItems: 'center', gap: moderateScale(4) },
  viewText:   { fontSize: moderateScale(12), fontWeight: '700', color: C.primary },
});

// ─── User Result Card ─────────────────────────────────────────────────────────
function UserCard({ item }) {
  const isAlumni = item.role === 'alumni';
  return (
    <View style={uc.card}>
      <Avatar name={item.display_name} uri={item.profile_picture} size={moderateScale(54)} />
      <View style={uc.body}>
        <View style={uc.nameRow}>
          <Text style={uc.name}>{item.display_name}</Text>
          <View style={[uc.roleBadge, isAlumni ? uc.roleBadgeAlumni : uc.roleBadgeStudent]}>
            <Text style={[uc.roleText, isAlumni ? uc.roleTextAlumni : uc.roleTextStudent]}>
              {isAlumni ? 'Alumni' : 'Student'}
            </Text>
          </View>
        </View>
        <Text style={uc.username}>@{item.username}</Text>

        {(item.job_role || item.company) && (
          <Text style={uc.meta} numberOfLines={1}>
            {[item.job_role, item.company].filter(Boolean).join(' at ')}
          </Text>
        )}
        {item.degree && (
          <Text style={uc.meta} numberOfLines={1}>
            <Ionicons name="school-outline" size={moderateScale(11)} color={C.muted} /> {item.degree}
            {item.graduation_year ? ` · ${item.graduation_year}` : ''}
          </Text>
        )}
        {item.bio ? (
          <Text style={uc.bio} numberOfLines={2}>{item.bio}</Text>
        ) : null}
        {item.skills?.length > 0 && (
          <View style={uc.skillsRow}>
            {item.skills.slice(0, 4).map((s, i) => <SkillPill key={i} label={s} small />)}
          </View>
        )}
        {item.linkedin_url && (
          <View style={uc.linkedInRow}>
            <Ionicons name="logo-linkedin" size={moderateScale(13)} color="#0A66C2" />
            <Text style={uc.linkedInText}>LinkedIn Profile</Text>
          </View>
        )}
      </View>
    </View>
  );
}
const uc = StyleSheet.create({
  card: {
    flexDirection: 'row', 
    gap: moderateScale(14),
    backgroundColor: C.card,
    borderRadius: moderateScale(16), 
    borderWidth: 1, 
    borderColor: C.border,
    padding: moderateScale(16), 
    marginBottom: verticalScale(10),
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 2,
  },
  body:              { flex: 1, gap: verticalScale(4) },
  nameRow:           { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), flexWrap: 'wrap' },
  name:              { fontSize: moderateScale(16), fontWeight: '800', color: C.text },
  roleBadge:         { borderRadius: moderateScale(20), paddingHorizontal: moderateScale(9), paddingVertical: verticalScale(3) },
  roleBadgeAlumni:   { backgroundColor: C.greenSoft },
  roleBadgeStudent:  { backgroundColor: C.blueSoft },
  roleText:          { fontSize: moderateScale(10), fontWeight: '700' },
  roleTextAlumni:    { color: C.green },
  roleTextStudent:   { color: C.blue },
  username:          { fontSize: moderateScale(12), color: C.muted, fontWeight: '500' },
  meta:              { fontSize: moderateScale(12), color: C.subtext },
  bio:               { fontSize: moderateScale(12), color: C.muted, lineHeight: moderateScale(17), marginTop: verticalScale(2), fontStyle: 'italic' },
  skillsRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(5), marginTop: verticalScale(4) },
  linkedInRow:       { flexDirection: 'row', alignItems: 'center', gap: moderateScale(4), marginTop: verticalScale(4) },
  linkedInText:      { fontSize: moderateScale(12), color: '#0A66C2', fontWeight: '600' },
});

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, active, onPress, onClear }) {
  return (
    <TouchableOpacity
      style={[fc.chip, active && fc.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[fc.text, active && fc.textActive]} numberOfLines={1}>{label}</Text>
      {active && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
          <Ionicons name="close-circle" size={moderateScale(14)} color={C.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
const fc = StyleSheet.create({
  chip:      { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: moderateScale(5), 
    borderWidth: 1.5, 
    borderColor: C.border, 
    borderRadius: moderateScale(20), 
    paddingHorizontal: moderateScale(12), 
    paddingVertical: verticalScale(7), 
    backgroundColor: C.card, 
    marginRight: moderateScale(8) 
  },
  chipActive:{ borderColor: C.primary, backgroundColor: C.primarySoft },
  text:      { fontSize: moderateScale(13), color: C.subtext, fontWeight: '500' },
  textActive:{ color: C.primary, fontWeight: '700' },
});

// ─── Skills Bottom Sheet ─────────────────────────────────────────────────────
function SkillSheet({ visible, skills, selected, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = skills.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  if (!visible) return null;
  return (
    <View style={ss.overlay}>
      <TouchableOpacity style={ss.backdrop} onPress={onClose} />
      <View style={ss.sheet}>
        <View style={ss.handle} />
        <Text style={ss.title}>Select Skill</Text>
        <View style={ss.searchWrap}>
          <Ionicons name="search" size={moderateScale(16)} color={C.muted} />
          <TextInput
            style={ss.searchInput}
            placeholder="Search skills..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.4 }}>
          <TouchableOpacity
            style={[ss.item, !selected && ss.itemActive]}
            onPress={() => { onSelect(null); onClose(); }}
          >
            <Text style={[ss.itemText, !selected && ss.itemTextActive]}>All Skills</Text>
            {!selected && <Ionicons name="checkmark" size={moderateScale(16)} color={C.primary} />}
          </TouchableOpacity>
          {filtered.map(skill => (
            <TouchableOpacity
              key={skill}
              style={[ss.item, selected === skill && ss.itemActive]}
              onPress={() => { onSelect(skill); onClose(); }}
            >
              <Text style={[ss.itemText, selected === skill && ss.itemTextActive]}>{skill}</Text>
              {selected === skill && <Ionicons name="checkmark" size={moderateScale(16)} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
const ss = StyleSheet.create({
  overlay:     { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'flex-end' },
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: C.card, borderTopLeftRadius: moderateScale(24), borderTopRightRadius: moderateScale(24), padding: moderateScale(20), paddingBottom: verticalScale(40) },
  handle:      { width: moderateScale(36), height: verticalScale(4), borderRadius: moderateScale(2), backgroundColor: C.border, alignSelf: 'center', marginBottom: verticalScale(16) },
  title:       { fontSize: moderateScale(17), fontWeight: '800', color: C.text, marginBottom: verticalScale(14) },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), backgroundColor: C.bg, borderRadius: moderateScale(12), borderWidth: 1, borderColor: C.border, paddingHorizontal: moderateScale(12), paddingVertical: verticalScale(10), marginBottom: verticalScale(8) },
  searchInput: { flex: 1, fontSize: moderateScale(14), color: C.text },
  item:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(13), borderBottomWidth: 1, borderBottomColor: C.divider },
  itemActive:  { },
  itemText:    { fontSize: moderateScale(14), color: C.subtext, fontWeight: '500' },
  itemTextActive: { color: C.primary, fontWeight: '700' },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={es.wrap}>
      <View style={es.iconWrap}>
        <Ionicons name={icon} size={moderateScale(36)} color={C.muted} />
      </View>
      <Text style={es.title}>{title}</Text>
      <Text style={es.sub}>{subtitle}</Text>
    </View>
  );
}
const es = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingTop: verticalScale(60), gap: verticalScale(8), paddingHorizontal: moderateScale(32) },
  iconWrap:{ width: moderateScale(72), height: moderateScale(72), borderRadius: moderateScale(36), backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center', marginBottom: verticalScale(4) },
  title:   { fontSize: moderateScale(17), fontWeight: '700', color: C.subtext },
  sub:     { fontSize: moderateScale(13), color: C.muted, textAlign: 'center', lineHeight: moderateScale(20) },
});

// ─── Helper function to get skills ───────────────────────────────────────────
// If your API doesn't have a getAllSkills endpoint, you can use this mock data
const getMockSkills = () => {
  return [
    'JavaScript', 'React', 'React Native', 'Node.js', 'Python', 'Java', 
    'Swift', 'Kotlin', 'Flutter', 'UI/UX', 'Product Management', 
    'Data Science', 'Machine Learning', 'Cloud Computing', 'DevOps',
    'GraphQL', 'TypeScript', 'Vue.js', 'Angular', 'PHP', 'Ruby on Rails',
    'SQL', 'MongoDB', 'PostgreSQL', 'Firebase', 'AWS', 'Azure', 'Docker'
  ];
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SearchScreen({ navigation }) {
  const [tab, setTab]   = useState('alumni');

  // Search state
  const [query, setQuery]             = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Alumni filters
  const [selectedSkill,  setSelectedSkill]  = useState(null);
  const [filterCompany,  setFilterCompany]  = useState('');
  const [filterBatch,    setFilterBatch]    = useState('');
  const [filterDegree,   setFilterDegree]   = useState('');
  const [showFilters,    setShowFilters]     = useState(false);
  const [skillSheetOpen, setSkillSheetOpen] = useState(false);

  // Username search
  const [usernameQuery,  setUsernameQuery]  = useState('');
  const [userResult,     setUserResult]     = useState(null);
  const [userSearched,   setUserSearched]   = useState(false);
  const [userLoading,    setUserLoading]    = useState(false);
  const [userError,      setUserError]      = useState('');

  // Data
  const [skills,   setSkills]   = useState([]);
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Animations
  const filterHeight = useRef(new Animated.Value(0)).current;

  // ── Debounce query ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  // ── Load skills ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Try to load skills from API if available, otherwise use mock data
    const loadSkills = async () => {
      try {
        // Try to import the function dynamically if it exists
        const api = await import('../services/api');
        if (api.getAllSkills) {
          const res = await api.getAllSkills();
          setSkills(res.data || getMockSkills());
        } else {
          // Use mock data if function doesn't exist
          setSkills(getMockSkills());
        }
      } catch (error) {
        console.log('Using mock skills data');
        setSkills(getMockSkills());
      }
    };
    
    loadSkills();
  }, []);

  // ── Toggle filter panel ─────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(filterHeight, {
      toValue: showFilters ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [showFilters]);

  // ── Active filter count ─────────────────────────────────────────────────────
  const activeFilters = [selectedSkill, filterCompany, filterBatch, filterDegree].filter(Boolean).length;

  // ── Search ──────────────────────────────────────────────────────────────────
  const performSearch = useCallback(async () => {
    if (tab === 'users') return;
    try {
      setLoading(true);
      setHasSearched(true);
      if (tab === 'alumni') {
        const params = {};
        if (debouncedQuery)  params.display_name = debouncedQuery;
        if (selectedSkill)   params.skill        = selectedSkill;
        if (filterCompany)   params.company      = filterCompany;
        if (filterBatch)     params.batch_year   = filterBatch;
        if (filterDegree)    params.degree       = filterDegree;
        console.log('🔍 Alumni search params:', params);
        const res = await searchAlumni(params);
        console.log('📥 Alumni results:', res.data?.length, 'items');
        setResults(Array.isArray(res.data) ? res.data : []);
      } else {
        const params = {};
        if (debouncedQuery)  params.title = debouncedQuery;
        if (selectedSkill)   params.skill = selectedSkill;
        console.log('🔍 Opportunities search params:', params);
        const res = await searchOpportunities(params);
        console.log('📥 Opportunity results:', res.data?.length, 'items');
        setResults(
          Array.isArray(res.data) ? res.data :
          res.data?.opportunities || []
        );
      }
    } catch (e) {
      console.log('❌ Search error:', e?.response?.data);
      Alert.alert('Search Failed', e.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedQuery, selectedSkill, filterCompany, filterBatch, filterDegree]);

  useEffect(() => {
    if (tab !== 'users') performSearch();
  }, [performSearch, tab]);

  // Reset results on tab change
  useEffect(() => {
    setResults([]);
    setQuery('');
    setDebouncedQuery('');
    setHasSearched(false);
    setUserResult(null);
    setUserSearched(false);
    setUserError('');
    setUsernameQuery('');
  }, [tab]);

  // ── Username search ─────────────────────────────────────────────────────────
  const handleUserSearch = async () => {
    if (!usernameQuery.trim()) return;
    try {
      setUserLoading(true);
      setUserError('');
      setUserResult(null);
      console.log('🔍 Username search:', usernameQuery.trim());
      const res = await searchUserByUsername(usernameQuery.trim());
      console.log('📥 User result:', res.data);
      setUserResult(res.data);
      setUserSearched(true);
    } catch (e) {
      console.log('❌ User search error:', e?.response?.data);
      setUserSearched(true);
      if (e?.response?.status === 404) {
        setUserError('No user found with that username.');
      } else {
        setUserError(e?.response?.data?.message || 'Something went wrong.');
      }
    } finally {
      setUserLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSelectedSkill(null);
    setFilterCompany('');
    setFilterBatch('');
    setFilterDegree('');
  };

  // ── Render item ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    if (tab === 'alumni') {
      return <AlumniCard item={item} onPress={() => {}} />;
    }
    return (
      <OpportunityCard
        item={item}
        onPress={() => navigation.navigate('OpportunityDetail', { id: item.id })}
      />
    );
  };

  const listHeader = (
    <View style={{ paddingHorizontal: moderateScale(16), paddingTop: verticalScale(8), paddingBottom: verticalScale(4) }}>
      {hasSearched && !loading && (
        <Text style={s.resultCount}>
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </Text>
      )}
    </View>
  );

  return (
    <View style={s.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Search</Text>
        <Text style={s.headerSub}>Find alumni, opportunities & people</Text>
      </View>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <View style={s.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsScroll}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, tab === t.key && s.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={t.icon}
                size={moderateScale(15)}
                color={tab === t.key ? C.primary : C.muted}
              />
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Find User tab ──────────────────────────────────────────────────── */}
      {tab === 'users' ? (
        <View style={{ flex: 1 }}>
          <View style={s.searchBarWrap}>
            <View style={[s.searchBar, { flex: 1 }]}>
              <Ionicons name="person-outline" size={moderateScale(18)} color={C.muted} />
              <TextInput
                style={s.searchInput}
                placeholder="Enter exact username..."
                placeholderTextColor={C.muted}
                value={usernameQuery}
                onChangeText={setUsernameQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleUserSearch}
              />
              {usernameQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setUsernameQuery(''); setUserResult(null); setUserSearched(false); }}>
                  <Ionicons name="close-circle" size={moderateScale(18)} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={s.searchBtn} onPress={handleUserSearch} activeOpacity={0.85}>
              {userLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="search" size={moderateScale(18)} color="#fff" />
              }
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: moderateScale(16), flex: 1 }}>
            {!userSearched ? (
              <EmptyState
                icon="person-outline"
                title="Find Anyone"
                subtitle="Enter an exact username to look up a specific alumni or student profile"
              />
            ) : userError ? (
              <EmptyState icon="alert-circle-outline" title="Not Found" subtitle={userError} />
            ) : userResult ? (
              <UserCard item={userResult} />
            ) : null}
          </View>
        </View>

      ) : (
        /* ── Alumni / Opportunities tabs ─────────────────────────────────── */
        <>
          {/* Search bar + filter toggle */}
          <View style={s.searchBarWrap}>
            <View style={[s.searchBar, { flex: 1 }]}>
              <Ionicons name="search" size={moderateScale(18)} color={C.muted} />
              <TextInput
                style={s.searchInput}
                placeholder={tab === 'alumni' ? 'Search alumni by name...' : 'Search opportunities...'}
                placeholderTextColor={C.muted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={moderateScale(18)} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
            {tab === 'alumni' && (
              <TouchableOpacity
                style={[s.filterToggle, (showFilters || activeFilters > 0) && s.filterToggleActive]}
                onPress={() => setShowFilters(v => !v)}
                activeOpacity={0.8}
              >
                <Ionicons name="options-outline" size={moderateScale(18)} color={activeFilters > 0 ? C.primary : C.subtext} />
                {activeFilters > 0 && (
                  <View style={s.filterBadge}>
                    <Text style={s.filterBadgeText}>{activeFilters}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Active filter chips */}
          {activeFilters > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.activeFiltersScroll}
            >
              {selectedSkill  && <FilterChip label={selectedSkill}  active onClear={() => setSelectedSkill(null)} />}
              {filterCompany  && <FilterChip label={filterCompany}  active onClear={() => setFilterCompany('')} />}
              {filterBatch    && <FilterChip label={`Batch ${filterBatch}`} active onClear={() => setFilterBatch('')} />}
              {filterDegree   && <FilterChip label={filterDegree}   active onClear={() => setFilterDegree('')} />}
              <TouchableOpacity onPress={clearAllFilters} style={s.clearAll}>
                <Text style={s.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Expandable filter panel */}
          {tab === 'alumni' && showFilters && (
            <View style={s.filterPanel}>
              {/* Skill */}
              <View style={s.filterRow}>
                <Text style={s.filterLabel}>Skill</Text>
                <TouchableOpacity
                  style={s.filterInput}
                  onPress={() => setSkillSheetOpen(true)}
                >
                  <Text style={[s.filterInputText, !selectedSkill && { color: C.muted }]}>
                    {selectedSkill || 'Any skill'}
                  </Text>
                  <Ionicons name="chevron-down" size={moderateScale(14)} color={C.muted} />
                </TouchableOpacity>
              </View>

              {/* Company */}
              <View style={s.filterRow}>
                <Text style={s.filterLabel}>Company</Text>
                <View style={[s.filterInput, { paddingVertical: 0 }]}>
                  <TextInput
                    style={s.filterInputText}
                    placeholder="e.g. Google"
                    placeholderTextColor={C.muted}
                    value={filterCompany}
                    onChangeText={setFilterCompany}
                  />
                </View>
              </View>

              {/* Batch & Degree in a row */}
              <View style={{ flexDirection: 'row', gap: moderateScale(10) }}>
                <View style={[s.filterRow, { flex: 1 }]}>
                  <Text style={s.filterLabel}>Batch Year</Text>
                  <View style={[s.filterInput, { paddingVertical: 0 }]}>
                    <TextInput
                      style={s.filterInputText}
                      placeholder="e.g. 2021"
                      placeholderTextColor={C.muted}
                      value={filterBatch}
                      onChangeText={setFilterBatch}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                </View>
                <View style={[s.filterRow, { flex: 1 }]}>
                  <Text style={s.filterLabel}>Degree</Text>
                  <View style={[s.filterInput, { paddingVertical: 0 }]}>
                    <TextInput
                      style={s.filterInputText}
                      placeholder="e.g. BSCS"
                      placeholderTextColor={C.muted}
                      value={filterDegree}
                      onChangeText={setFilterDegree}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Skill filter for opportunities */}
          {tab === 'opportunities' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.activeFiltersScroll}
            >
              <FilterChip
                label={selectedSkill ? `Skill: ${selectedSkill}` : 'Filter by Skill'}
                active={!!selectedSkill}
                onPress={() => setSkillSheetOpen(true)}
                onClear={() => setSelectedSkill(null)}
              />
            </ScrollView>
          )}

          {/* Results */}
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.loadingText}>Searching...</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item, i) => String(item.id || i)}
              contentContainerStyle={s.listContent}
              ListHeaderComponent={listHeader}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                hasSearched ? (
                  <EmptyState
                    icon={tab === 'alumni' ? 'people-outline' : 'briefcase-outline'}
                    title="No results found"
                    subtitle="Try adjusting your filters or search with different keywords"
                  />
                ) : (
                  <EmptyState
                    icon="search-outline"
                    title={`Search ${tab === 'alumni' ? 'Alumni' : 'Opportunities'}`}
                    subtitle="Use the search bar or filters above to get started"
                  />
                )
              }
              renderItem={renderItem}
            />
          )}
        </>
      )}

      {/* ── Skill Sheet ────────────────────────────────────────────────────── */}
      <SkillSheet
        visible={skillSheetOpen}
        skills={skills}
        selected={selectedSkill}
        onSelect={setSelectedSkill}
        onClose={() => setSkillSheetOpen(false)}
      />
    </View>
  );
}

// ─── Responsive Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? verticalScale(56) : verticalScale(24),
    paddingHorizontal: moderateScale(20),
    paddingBottom: verticalScale(14),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: moderateScale(26), fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  headerSub:   { fontSize: moderateScale(13), color: C.muted, marginTop: verticalScale(2) },

  // Tabs
  tabsWrap:   { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tabsScroll: { paddingHorizontal: moderateScale(16), paddingVertical: verticalScale(10), gap: moderateScale(8) },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: moderateScale(6),
    paddingHorizontal: moderateScale(14), paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20), borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg,
  },
  tabActive:     { borderColor: C.primary, backgroundColor: C.primarySoft },
  tabText:       { fontSize: moderateScale(13), fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary, fontWeight: '700' },

  // Search bar
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: moderateScale(10),
    paddingHorizontal: moderateScale(16), paddingVertical: verticalScale(12),
    backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: moderateScale(10),
    backgroundColor: C.bg, borderRadius: moderateScale(14),
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: moderateScale(14), paddingVertical: verticalScale(11),
  },
  searchInput: { flex: 1, fontSize: moderateScale(14), color: C.text },
  searchBtn: {
    width: moderateScale(46), 
    height: moderateScale(46), 
    borderRadius: moderateScale(14),
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  filterToggle: {
    width: moderateScale(46), 
    height: moderateScale(46), 
    borderRadius: moderateScale(14),
    backgroundColor: C.bg, 
    borderWidth: 1.5, 
    borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  filterToggleActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  filterBadge: {
    position: 'absolute', top: -moderateScale(4), right: -moderateScale(4),
    width: moderateScale(18), height: moderateScale(18), borderRadius: moderateScale(9),
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: moderateScale(2), borderColor: C.card,
  },
  filterBadgeText: { fontSize: moderateScale(9), fontWeight: '800', color: '#fff' },

  // Active filters bar
  activeFiltersScroll: { paddingHorizontal: moderateScale(16), paddingVertical: verticalScale(10), alignItems: 'center' },
  clearAll: { paddingHorizontal: moderateScale(10), paddingVertical: verticalScale(7) },
  clearAllText: { fontSize: moderateScale(12), color: C.coral, fontWeight: '700' },

  // Filter panel
  filterPanel: {
    backgroundColor: C.card,
    paddingHorizontal: moderateScale(16), 
    paddingTop: verticalScale(12), 
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1, 
    borderBottomColor: C.border,
    gap: verticalScale(10),
  },
  filterRow:      { gap: verticalScale(6) },
  filterLabel:    { fontSize: moderateScale(11), fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: C.border, borderRadius: moderateScale(10),
    paddingHorizontal: moderateScale(12), paddingVertical: verticalScale(11),
    backgroundColor: C.bg,
  },
  filterInputText: { flex: 1, fontSize: moderateScale(14), color: C.text },

  // Result count
  resultCount: { fontSize: moderateScale(12), color: C.muted, fontWeight: '600', marginBottom: verticalScale(4) },

  // List
  listContent: { paddingHorizontal: moderateScale(16), paddingBottom: verticalScale(40) },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: verticalScale(10) },
  loadingText: { fontSize: moderateScale(14), color: C.muted },
});