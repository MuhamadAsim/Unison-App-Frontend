import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
import { getAllSkills, getOpportunities } from '../services/api';

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
};

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_META = {
  job: { label: 'Job', color: C.green, bg: C.greenSoft, icon: 'briefcase' },
  internship: { label: 'Internship', color: C.amber, bg: C.amberSoft, icon: 'school' },
  freelance: { label: 'Freelance', color: C.purple, bg: C.purpleSoft, icon: 'laptop-outline' },
  'full-time': { label: 'Full-time', color: C.green, bg: C.greenSoft, icon: 'briefcase' },
  'part-time': { label: 'Part-time', color: C.blue, bg: C.blueSoft, icon: 'time-outline' },
};

const getTypeMeta = (type = '') =>
  TYPE_META[type?.toLowerCase()] ?? { label: type, color: C.muted, bg: C.divider, icon: 'briefcase-outline' };

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const avatarColor = (name = '') => {
  const colors = [C.primary, C.purple, C.blue, C.green, C.amber];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

const daysUntil = (deadline) => {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OpportunityCard({ item, onPress }) {
  const meta = getTypeMeta(item.type);
  const days = daysUntil(item.deadline);
  const closed = days !== null && days < 0;
  const hasMedia = item.media?.length > 0;

  return (
    <TouchableOpacity
      style={[card.wrap, closed && card.wrapClosed]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {hasMedia && (
        <Image
          source={{ uri: item.media[0] }}
          style={card.mediaStrip}
          resizeMode="cover"
        />
      )}

      <View style={card.body}>
        <View style={card.topRow}>
          <View style={[card.typeBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[card.typeText, { color: meta.color }]}>{meta.label}</Text>
          </View>

          {item.is_remote && (
            <View style={card.remoteBadge}>
              <Ionicons name="globe-outline" size={11} color={C.teal} />
              <Text style={card.remoteText}>Remote</Text>
            </View>
          )}

          <View style={{ flex: 1 }} />
          <DeadlineBadge deadline={item.deadline} />
        </View>

        <Text style={[card.title, closed && card.titleClosed]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={card.metaRow}>
          {item.company ? (
            <View style={card.metaItem}>
              <Ionicons name="business-outline" size={13} color={C.muted} />
              <Text style={card.metaText} numberOfLines={1}>{item.company}</Text>
            </View>
          ) : null}
          {item.location ? (
            <View style={card.metaItem}>
              <Ionicons name="location-outline" size={13} color={C.muted} />
              <Text style={card.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={card.divider} />

        <View style={card.footer}>
          {item.posted_by ? (
            <View style={card.postedBy}>
              <MiniAvatar
                name={item.posted_by.display_name}
                uri={item.posted_by.profile_picture}
                size={24}
              />
              <Text style={card.postedByText} numberOfLines={1}>
                {item.posted_by.display_name}
              </Text>
              {item.posted_at && (
                <Text style={card.postedDate}>· {formatDate(item.posted_at)}</Text>
              )}
            </View>
          ) : <View />}

          <View style={[card.applyBtn, closed && card.applyBtnClosed]}>
            <Text style={[card.applyText, closed && card.applyTextClosed]}>
              {closed ? 'Closed' : 'View'}
            </Text>
            {!closed && <Ionicons name="arrow-forward" size={13} color={C.primary} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
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
  wrapClosed: { opacity: 0.65 },
  mediaStrip: { width: '100%', height: 130 },
  body: { padding: 16, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  typeText: { fontSize: 11, fontWeight: '700' },
  remoteBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.tealSoft },
  remoteText: { fontSize: 11, fontWeight: '700', color: C.teal },
  title: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 24 },
  titleClosed: { color: C.muted },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.muted, maxWidth: 140 },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postedBy: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  postedByText: { fontSize: 12, color: C.subtext, fontWeight: '600', maxWidth: 120 },
  postedDate: { fontSize: 11, color: C.muted },
  applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  applyBtnClosed: { backgroundColor: C.divider },
  applyText: { fontSize: 12, fontWeight: '700', color: C.primary },
  applyTextClosed: { color: C.muted },
});

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function Chip({ label, active, onPress, onClear, icon }) {
  return (
    <TouchableOpacity
      style={[ch.chip, active && ch.active]}
      onPress={onPress}
      activeOpacity={0.75}
    >
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
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.card, marginRight: 10 },
  active: { borderColor: C.primary, backgroundColor: C.primarySoft },
  text: { fontSize: 13, color: C.muted, fontWeight: '500' },
  textActive: { color: C.primary, fontWeight: '600' },
});

// ─── Skill Sheet ──────────────────────────────────────────────────────────────
function SkillSheet({ visible, skills, selected, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered = skills.filter(s => s.toLowerCase().includes(q.toLowerCase()));
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
          <TouchableOpacity
            style={sk.item}
            onPress={() => { onSelect(null); onClose(); }}
          >
            <Text style={[sk.itemText, !selected && sk.itemActive]}>All Skills</Text>
            {!selected && <Ionicons name="checkmark" size={16} color={C.primary} />}
          </TouchableOpacity>
          {filtered.map(skill => (
            <TouchableOpacity
              key={skill}
              style={sk.item}
              onPress={() => { onSelect(skill); onClose(); }}
            >
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
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: C.text },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
  itemText: { fontSize: 15, color: C.subtext, fontWeight: '500' },
  itemActive: { color: C.primary, fontWeight: '600' },
});

// ─── Stats Banner ─────────────────────────────────────────────────────────────
function StatsBanner({ total, filtered }) {
  return (
    <View style={sb.wrap}>
      <View style={sb.item}>
        <Text style={sb.value}>{total}</Text>
        <Text style={sb.label}>Total</Text>
      </View>
      <View style={sb.divider} />
      <View style={sb.item}>
        <Text style={sb.value}>{filtered}</Text>
        <Text style={sb.label}>Showing</Text>
      </View>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: C.card, marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 14 },
  item: { flex: 1, alignItems: 'center' },
  value: { fontSize: 22, fontWeight: '800', color: C.primary },
  label: { fontSize: 11, color: C.muted, fontWeight: '500', marginTop: 2 },
  divider: { width: 1, backgroundColor: C.border, marginVertical: 6 },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onClear }) {
  return (
    <View style={em.wrap}>
      <View style={em.iconWrap}>
        <Ionicons name="briefcase-outline" size={40} color={C.muted} />
      </View>
      <Text style={em.title}>{hasFilters ? 'No matches found' : 'No opportunities yet'}</Text>
      <Text style={em.sub}>
        {hasFilters
          ? 'Try adjusting your filters to see more results'
          : 'Check back later for new job and internship postings'}
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
  wrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: C.subtext },
  sub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  btn: { borderWidth: 1.5, borderColor: C.primary, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, marginTop: 12 },
  btnText: { fontSize: 14, fontWeight: '600', color: C.primary },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OpportunitiesListScreen({ navigation }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState(null);
  const [filterRemote, setFilterRemote] = useState(null);
  const [filterSkill, setFilterSkill] = useState(null);
  const [skillSheet, setSkillSheet] = useState(false);
  const [skills, setSkills] = useState([]);

  const LIMIT = 10;
  const activeFilters = [filterType, filterRemote !== null ? filterRemote : null, filterSkill].filter(v => v !== null).length;

  useEffect(() => {
    getAllSkills().then(r => setSkills(r.data || [])).catch(() => { });
  }, []);

  const fetchOpportunities = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = { page: pageNum, limit: LIMIT };
      if (filterType) params.type = filterType;
      if (filterRemote !== null) params.is_remote = String(filterRemote);
      if (filterSkill) params.skill = filterSkill;

      const res = await getOpportunities(params);
      const items = res.data?.data || res.data?.opportunities || [];
      const totalCount = res.data?.total || 0;

      setTotal(totalCount);
      setHasMore(items.length === LIMIT);
      setPage(pageNum);

      if (reset || pageNum === 1) setOpportunities(items);
      else setOpportunities(prev => [...prev, ...items]);

    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterType, filterRemote, filterSkill]);

  useFocusEffect(useCallback(() => {
    fetchOpportunities(1, true);
  }, [fetchOpportunities]));

  const loadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      fetchOpportunities(page + 1);
    }
  };

  const clearFilters = () => {
    setFilterType(null);
    setFilterRemote(null);
    setFilterSkill(null);
  };

  const ListHeader = () => (
    <View>
      <StatsBanner total={total} filtered={opportunities.length} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipScroll}
      >
        <Chip
          label="All Types"
          active={!filterType}
          onPress={() => setFilterType(null)}
        />
        <Chip
          label="Job"
          icon="briefcase-outline"
          active={filterType === 'job'}
          onPress={() => setFilterType('job')}
          onClear={() => setFilterType(null)}
        />
        <Chip
          label="Internship"
          icon="school-outline"
          active={filterType === 'internship'}
          onPress={() => setFilterType('internship')}
          onClear={() => setFilterType(null)}
        />
        <Chip
          label="Freelance"
          icon="laptop-outline"
          active={filterType === 'freelance'}
          onPress={() => setFilterType('freelance')}
          onClear={() => setFilterType(null)}
        />
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.chipScroll, { paddingTop: 0, paddingBottom: 12 }]}
      >
        <Chip
          label="Remote"
          icon="globe-outline"
          active={filterRemote === true}
          onPress={() => setFilterRemote(filterRemote === true ? null : true)}
          onClear={() => setFilterRemote(null)}
        />
        <Chip
          label="On-site"
          icon="business-outline"
          active={filterRemote === false}
          onPress={() => setFilterRemote(filterRemote === false ? null : false)}
          onClear={() => setFilterRemote(null)}
        />
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

      <View style={s.listLabelRow}>
        <Text style={s.listLabel}>
          {activeFilters > 0 ? 'Filtered Results' : 'All Opportunities'}
        </Text>
        {activeFilters > 0 && (
          <View style={s.filterCountBadge}>
            <Text style={s.filterCountText}>{activeFilters} filter{activeFilters > 1 ? 's' : ''}</Text>
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
            <Text style={s.headerTitle}>Opportunities</Text>
            <Text style={s.headerSub}>Jobs & internships posted by alumni</Text>
          </View>
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading opportunities...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Opportunities</Text>
          <Text style={s.headerSub}>Jobs & internships posted by alumni</Text>
        </View>
      </View>

      <FlatList
        data={opportunities}
        keyExtractor={(item, i) => String(item.id || i)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore
            ? <View style={s.footerLoader}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={s.footerLoaderText}>Loading more...</Text>
              </View>
            : hasMore && opportunities.length > 0
            ? null
            : opportunities.length > 0
            ? <Text style={s.endText}>You've seen all opportunities</Text>
            : null
        }
        ListEmptyComponent={
          <EmptyState hasFilters={activeFilters > 0} onClear={clearFilters} />
        }
        renderItem={({ item }) => (
          <OpportunityCard
            item={item}
            onPress={() => navigation.navigate('OpportunityDetail', { id: item.id })}
          />
        )}
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
    paddingTop:30,
    paddingBottom: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  chipScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, alignItems: 'center' },
  clearAll: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  clearAllText: { fontSize: 12, color: C.coral, fontWeight: '600' },

  listLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  listLabel: { fontSize: 14, fontWeight: '600', color: C.subtext },
  filterCountBadge: {
    backgroundColor: C.primarySoft, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  filterCountText: { fontSize: 11, fontWeight: '600', color: C.primary },

  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 24 },
  footerLoaderText: { fontSize: 13, color: C.muted },
  endText: { textAlign: 'center', fontSize: 12, color: C.muted, paddingVertical: 24 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.muted },
});