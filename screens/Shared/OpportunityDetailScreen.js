import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { getOpportunityById, deleteOpportunity } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  // Brand
  primary:      '#5B4FE8',
  primaryDark:  '#4338CA',
  primaryLight: '#7C73EF',
  primarySoft:  '#EEF2FF',
  primaryBorder:'#C7D2FE',

  // Backgrounds
  bg:           '#F7F7FB',
  card:         '#FFFFFF',
  divider:      '#F3F4F6',

  // Text
  text:         '#111827',
  subtext:      '#374151',
  muted:        '#9CA3AF',
  hint:         '#D1D5DB',

  // Borders
  border:       '#E5E7EB',
  borderLight:  '#F3F4F6',

  // Semantics
  green:        '#059669',
  greenSoft:    '#ECFDF5',
  greenBorder:  '#6EE7B7',

  coral:        '#DC2626',
  coralSoft:    '#FEF2F2',
  coralBorder:  '#FCA5A5',

  amber:        '#D97706',
  amberSoft:    '#FFFBEB',
  amberBorder:  '#FCD34D',

  blue:         '#2563EB',
  blueSoft:     '#EFF6FF',
  blueBorder:   '#BFDBFE',

  // Avatar gradient pair (for linear gradient workaround)
  avatarA:      '#6D63F4',
  avatarB:      '#4F46E5',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getDaysLeft = (deadline) => {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return 'Last day!';
  return `${diff}d left`;
};

const getTypeMeta = (type) => {
  if (!type) return { label: 'Other', color: C.muted, bg: C.divider, border: C.hint };
  const t = type.toLowerCase();
  if (t === 'internship')  return { label: 'Internship',  color: C.amber,   bg: C.amberSoft,   border: C.amberBorder  };
  if (t === 'job')         return { label: 'Job',         color: C.green,   bg: C.greenSoft,   border: C.greenBorder  };
  if (t === 'freelance')   return { label: 'Freelance',   color: C.primary, bg: C.primarySoft, border: C.primaryBorder};
  if (t === 'full-time')   return { label: 'Full-time',   color: C.green,   bg: C.greenSoft,   border: C.greenBorder  };
  if (t === 'part-time')   return { label: 'Part-time',   color: C.blue,    bg: C.blueSoft,    border: C.blueBorder   };
  return { label: type, color: C.muted, bg: C.divider, border: C.hint };
};

// ─── isOwner — robust 3-way check ────────────────────────────────────────────
const isOwner = (postedBy, userData) => {
  if (!postedBy || !userData) return false;
  if (postedBy.id        && userData.id        && postedBy.id        === userData.id)        return true;
  if (postedBy.alumni_id && userData.alumni_id && postedBy.alumni_id === userData.alumni_id) return true;
  if (postedBy.username  && userData.username  && postedBy.username  === userData.username)  return true;
  return false;
};

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ icon, label, color, bg, border }) {
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: bg, borderColor: border }]}>
      {icon && <Ionicons name={icon} size={11} color={color} />}
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  );
}
const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
});

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label }) {
  return (
    <View style={statStyles.pill}>
      <View style={statStyles.iconWrap}>
        <Ionicons name={icon} size={18} color={C.primary} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: { fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'center' },
  label: { fontSize: 11, color: C.muted, textAlign: 'center', fontWeight: '500' },
});

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, last = false }) {
  if (!value) return null;
  return (
    <View style={[detailStyles.row, !last && detailStyles.rowBorder]}>
      <View style={detailStyles.iconWrap}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={detailStyles.content}>
        <Text style={detailStyles.label}>{label}</Text>
        <Text style={detailStyles.value}>{value}</Text>
      </View>
    </View>
  );
}
const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  label:   { fontSize: 11, color: C.muted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6 },
  value:   { fontSize: 14, color: C.text, fontWeight: '600', marginTop: 1 },
});

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <View style={sectionStyles.card}>
      <View style={sectionStyles.header}>
        <View style={sectionStyles.iconWrap}>
          <Ionicons name={icon} size={16} color={C.primary} />
        </View>
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sectionStyles = StyleSheet.create({
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
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: 0.1 },
});

// ─── Media Carousel ───────────────────────────────────────────────────────────
function MediaCarousel({ media }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!media?.length) return null;
  return (
    <View style={mediaStyles.container}>
      <FlatList
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={mediaStyles.image} resizeMode="cover" />
        )}
        keyExtractor={(_, i) => i.toString()}
      />
      {media.length > 1 && (
        <View style={mediaStyles.pagination}>
          {media.map((_, i) => (
            <View key={i} style={[mediaStyles.dot, i === activeIndex && mediaStyles.dotActive]} />
          ))}
        </View>
      )}
      {/* Overlay counter */}
      {media.length > 1 && (
        <View style={mediaStyles.counter}>
          <Text style={mediaStyles.counterText}>{activeIndex + 1}/{media.length}</Text>
        </View>
      )}
    </View>
  );
}
const mediaStyles = StyleSheet.create({
  container: { marginBottom: 4, borderRadius: 16, overflow: 'hidden' },
  image:     { width: SCREEN_WIDTH - 32, height: 220 },
  pagination:{ flexDirection: 'row', position: 'absolute', bottom: 14, alignSelf: 'center', gap: 6 },
  dot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 18, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  counter:   {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

// ─── Owner Actions (Edit / Delete) ────────────────────────────────────────────
function OwnerActions({ data, navigation }) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Opportunity',
      'This will permanently remove the posting. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOpportunity(data.id);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={ownerStyles.row}>
      <TouchableOpacity
        style={ownerStyles.editBtn}
        onPress={() => navigation.navigate('EditOpportunity', { opportunity: data })}
        activeOpacity={0.8}
      >
        <Ionicons name="pencil-outline" size={18} color={C.primary} />
        <Text style={ownerStyles.editText}>Edit Posting</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={ownerStyles.deleteBtn}
        onPress={handleDelete}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-outline" size={18} color={C.coral} />
        <Text style={ownerStyles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}
const ownerStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primarySoft,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.primaryBorder,
  },
  editText:   { fontSize: 15, fontWeight: '700', color: C.primary },
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OpportunityDetailScreen({ route, navigation }) {
  const { userData } = useContext(AuthContext);
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getOpportunityById(id);
      setData(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDetail(); }, [id]));

  const handleApply = () => {
    if (data?.apply_link) {
      Linking.openURL(data.apply_link).catch(() => Alert.alert('Error', 'Could not open the application link.'));
    } else {
      Alert.alert('No Link', 'No external application link was provided for this opportunity.');
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Opportunity</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Opportunity</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="briefcase-outline" size={40} color={C.primary} />
          </View>
          <Text style={s.emptyTitle}>Not Found</Text>
          <Text style={s.emptySubtext}>This opportunity may have been removed.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchDetail}>
            <Text style={s.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived Data ───────────────────────────────────────────────────────────
  const companyName = data.company?.name || data.company_name || 'Company';
  const avatarLetter = companyName.charAt(0).toUpperCase();
  const typeMeta = getTypeMeta(data.type);
  const deadlineFormatted = formatDate(data.deadline);
  const postedAtFormatted = formatDate(data.posted_at);
  const daysLeft = getDaysLeft(data.deadline);
  const skills = Array.isArray(data.required_skills)
    ? data.required_skills
    : (data.required_skills ? String(data.required_skills).split(',').map(s => s.trim()) : []);

  const userIsOwner = isOwner(data.posted_by, userData);

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Opportunity Details</Text>
        {/* Share button placeholder — right-aligned */}
        <TouchableOpacity style={s.headerBtn} onPress={() => {}}>
          <Ionicons name="share-outline" size={22} color={C.subtext} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* ── Media Carousel ─────────────────────────────────────────────── */}
        {data.media?.length > 0 && <MediaCarousel media={data.media} />}

        {/* ── Hero Card ──────────────────────────────────────────────────── */}
        <View style={s.heroCard}>
          {/* Company Avatar */}
          <View style={s.avatarOuter}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{avatarLetter}</Text>
            </View>
          </View>

          {/* Title & Company */}
          <Text style={s.heroTitle}>{data.title}</Text>
          <View style={s.heroCompanyRow}>
            <Ionicons name="business-outline" size={14} color={C.muted} />
            <Text style={s.heroCompany}>{companyName}</Text>
          </View>

          {/* Badge Row */}
          <View style={s.badgeRow}>
            {data.type && (
              <Badge label={typeMeta.label} color={typeMeta.color} bg={typeMeta.bg} border={typeMeta.border} />
            )}
            {data.is_remote && (
              <Badge icon="wifi-outline" label="Remote" color={C.green} bg={C.greenSoft} border={C.greenBorder} />
            )}
            {daysLeft && (
              <Badge icon="time-outline" label={daysLeft} color={C.coral} bg={C.coralSoft} border={C.coralBorder} />
            )}
          </View>

          {/* Stat Pills */}
          <View style={s.statRow}>
            {data.location && (
              <StatPill icon="location-outline" value={data.location} label="Location" />
            )}
            {deadlineFormatted && (
              <StatPill icon="calendar-outline" value={deadlineFormatted} label="Deadline" />
            )}
            {postedAtFormatted && (
              <StatPill icon="time-outline" value={postedAtFormatted} label="Posted" />
            )}
          </View>
        </View>

        {/* ── Posted By ──────────────────────────────────────────────────── */}
        {data.posted_by && (
          <Section icon="person-circle-outline" title="Posted By">
            <View style={s.postedByRow}>
              {data.posted_by.profile_picture ? (
                <Image source={{ uri: data.posted_by.profile_picture }} style={s.postedByAvatar} />
              ) : (
                <View style={s.postedByAvatarFallback}>
                  <Text style={s.postedByAvatarLetter}>
                    {(data.posted_by.display_name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.postedByName}>{data.posted_by.display_name}</Text>
                <Text style={s.postedByMeta}>
                  @{data.posted_by.username}
                  {data.posted_by.role ? ` · ${data.posted_by.role}` : ''}
                </Text>
              </View>
              {/* Owner badge */}
              {userIsOwner && (
                <View style={s.ownerTag}>
                  <Text style={s.ownerTagText}>Your Post</Text>
                </View>
              )}
            </View>
          </Section>
        )}

        {/* ── Overview Details ───────────────────────────────────────────── */}
        <Section icon="information-circle-outline" title="Overview">
          <DetailRow icon="briefcase-outline"  label="Job Type"    value={typeMeta.label}        />
          <DetailRow icon="location-outline"    label="Location"   value={data.location}         />
          <DetailRow icon="globe-outline"       label="Remote"     value={data.is_remote ? 'Yes — Work from anywhere' : 'On-site'} />
          <DetailRow icon="calendar-outline"    label="Deadline"   value={deadlineFormatted}     />
          <DetailRow icon="time-outline"        label="Posted"     value={postedAtFormatted}     last />
        </Section>

        {/* ── Description ────────────────────────────────────────────────── */}
        {data.description && (
          <Section icon="document-text-outline" title="About This Role">
            <Text style={s.bodyText}>{data.description}</Text>
          </Section>
        )}

        {/* ── Requirements ───────────────────────────────────────────────── */}
        {data.requirements && (
          <Section icon="list-outline" title="Requirements">
            <Text style={s.bodyText}>{data.requirements}</Text>
          </Section>
        )}

        {/* ── Skills ─────────────────────────────────────────────────────── */}
        {skills.length > 0 && (
          <Section icon="code-slash-outline" title="Required Skills">
            <View style={s.skillsWrap}>
              {skills.map((skill, i) => (
                <View key={i} style={s.skillChip}>
                  <Text style={s.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ── CTA / Owner Actions ────────────────────────────────────────── */}
        <View style={s.ctaBlock}>
          {userIsOwner ? (
            <OwnerActions data={data} navigation={navigation} />
          ) : (
            <TouchableOpacity style={s.applyBtn} onPress={handleApply} activeOpacity={0.85}>
              <View style={s.applyBtnInner}>
                <Ionicons name="open-outline" size={20} color="#fff" />
                <Text style={s.applyBtnText}>Apply Now</Text>
              </View>
              <View style={s.applyBtnArrow}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Global Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: C.bg },

  // Header
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
  headerBtn:   { padding: 6, width: 38, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.3 },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // States
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText:   { fontSize: 14, color: C.muted, marginTop: 8 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: C.text },
  emptySubtext:  { fontSize: 14, color: C.muted, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.primarySoft,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.primaryBorder,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: C.primary },

  // Hero Card
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  avatarOuter: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3, borderColor: C.primaryBorder,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:    { fontSize: 28, fontWeight: '800', color: '#fff' },
  heroTitle:     { fontSize: 21, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 },
  heroCompanyRow:{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  heroCompany:   { fontSize: 14, fontWeight: '600', color: C.muted },
  badgeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  statRow:       { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },

  // Body text
  bodyText: { fontSize: 14, color: C.subtext, lineHeight: 23 },

  // Skills
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    backgroundColor: C.primarySoft,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1, borderColor: C.primaryBorder,
  },
  skillChipText: { fontSize: 12, fontWeight: '700', color: C.primary, letterSpacing: 0.2 },

  // Posted By
  postedByRow:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  postedByAvatar:       { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primarySoft },
  postedByAvatarFallback: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.primaryBorder,
  },
  postedByAvatarLetter: { fontSize: 20, fontWeight: '700', color: C.primary },
  postedByName:         { fontSize: 15, fontWeight: '700', color: C.text },
  postedByMeta:         { fontSize: 12, color: C.muted, marginTop: 2 },
  ownerTag: {
    backgroundColor: C.primarySoft,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.primaryBorder,
  },
  ownerTagText: { fontSize: 11, fontWeight: '700', color: C.primary },

  // CTA
  ctaBlock: { marginTop: 4 },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 0,
    paddingLeft: 24,
    paddingRight: 8,
    height: 56,
    overflow: 'hidden',
  },
  applyBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  applyBtnText:  { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  applyBtnArrow: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
});