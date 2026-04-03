import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getMentors,
  getStudentConnections,
  connectUser,
  removeConnection,
  searchAlumni,
  getConnectionStatus,
} from '../services/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg: '#F8F8FC',
  card: '#FFFFFF',
  text: '#0F0F23',
  subtext: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  green: '#059669',
  greenSoft: '#D1FAE5',
  coral: '#DC2626',
  coralSoft: '#FEE2E2',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  shadow: 'rgba(0,0,0,0.05)',
};

const TABS = {
  SUGGESTED: 'suggested',
  MY_MENTORS: 'my_mentors',
};

// ─── Mentor Card ──────────────────────────────────────────────────────────────
function MentorCard({ mentor, type, onConnect, onDisconnect, onCancelRequest, connectionStatus, statusLoading }) {
  const [loading, setLoading] = useState(false);

  const alumniId = mentor.alumni_id || mentor.id;
  const name = mentor.display_name || mentor.name || 'Alumni';
  const company = mentor.company || '';
  const domain = mentor.domain || '';
  const commonSkills = mentor.common_skills || 0;

  const status = connectionStatus?.status;

  const handleConnect = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onConnect(alumniId);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      `Cancel connection request to ${name}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: () => onCancelRequest?.(alumniId) },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Remove Mentor',
      `Remove ${name} from your mentors?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDisconnect(alumniId) },
      ]
    );
  };

  let buttonContent = null;

  if (type === TABS.MY_MENTORS) {
    // My Mentors tab never needs a status check — just show remove
    buttonContent = (
      <TouchableOpacity style={styles.removeBtn} onPress={handleDisconnect}>
        <Ionicons name="close" size={20} color={C.coral} />
      </TouchableOpacity>
    );
  } else if (statusLoading) {
    // ── FIX: don't flash "Connect" while real status is still loading ─────────
    buttonContent = (
      <View style={styles.statusLoadingWrap}>
        <ActivityIndicator size="small" color={C.muted} />
      </View>
    );
  } else if (status === 'connected') {
    buttonContent = (
      <View style={styles.disabledBtn}>
        <Ionicons name="checkmark" size={16} color={C.green} />
        <Text style={styles.disabledBtnText}>Connected</Text>
      </View>
    );
  } else if (status === 'pending') {
    buttonContent = (
      <TouchableOpacity style={styles.pendingBtn} onPress={handleCancelRequest} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={C.amber} />
        ) : (
          <>
            <Ionicons name="time-outline" size={16} color={C.amber} />
            <Text style={styles.pendingBtnText}>Pending</Text>
          </>
        )}
      </TouchableOpacity>
    );
  } else {
    buttonContent = (
      <TouchableOpacity style={styles.connectBtn} onPress={handleConnect} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : (
          <>
            <Ionicons name="person-add" size={16} color={C.primary} />
            <Text style={styles.connectBtnText}>Connect</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{name}</Text>
        {(domain || company) && (
          <Text style={styles.details}>
            {domain}{domain && company && ' @ '}{company}
          </Text>
        )}
        {commonSkills > 0 && (
          <View style={styles.skillBadge}>
            <Ionicons name="code-slash" size={10} color={C.primary} />
            <Text style={styles.skillBadgeText}>
              {commonSkills} common skill{commonSkills !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
      {buttonContent}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, message, buttonText, onPress }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={48} color={C.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {buttonText && onPress && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onPress}>
          <Text style={styles.emptyBtnText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MentorsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(TABS.SUGGESTED);
  const [suggested, setSuggested] = useState([]);
  const [connections, setConnections] = useState([]);

  const [statusMap, setStatusMap] = useState({});
  // ── FIX: true while getConnectionStatus calls are in-flight ──────────────
  const [statusLoading, setStatusLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatusMap, setSearchStatusMap] = useState({});
  const [searchStatusLoading, setSearchStatusLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // ─── Fetch connection statuses for a list of alumni in parallel ─────────────
  const fetchStatusMap = async (mentorList) => {
    const entries = await Promise.all(
      mentorList.map(async (mentor) => {
        const id = mentor.alumni_id || mentor.id;
        try {
          const res = await getConnectionStatus(id);
          return [id, res.data]; // { status, is_sender }
        } catch {
          // 404 = no connection; any other error also defaults to none
          return [id, { status: 'none' }];
        }
      })
    );
    return Object.fromEntries(entries);
  };

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchSuggested = async () => {
    const res = await getMentors();
    const mentors = res.data || [];
    setSuggested(mentors);

    // ── FIX: raise flag BEFORE parallel fetches, lower it AFTER ─────────────
    setStatusLoading(true);
    try {
      const map = await fetchStatusMap(mentors);
      setStatusMap(map);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchConnections = async () => {
    const res = await getStudentConnections();
    setConnections(res.data || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === TABS.SUGGESTED) {
        await fetchSuggested();
      } else {
        await fetchConnections();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === TABS.SUGGESTED) {
        await fetchSuggested();
      } else {
        await fetchConnections();
      }
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab])
  );

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleConnect = async (id) => {
    await connectUser(id, { connection_type: 'mentor' });
    // Optimistic update — no refetch needed
    setStatusMap((prev) => ({ ...prev, [id]: { status: 'pending', is_sender: true } }));
    setSearchStatusMap((prev) => ({ ...prev, [id]: { status: 'pending', is_sender: true } }));
    Alert.alert('Request Sent', 'Your mentor request has been sent. You will be notified when they accept.');
  };

  const handleCancelRequest = async (id) => {
    await removeConnection(id);
    setStatusMap((prev) => ({ ...prev, [id]: { status: 'none' } }));
    setSearchStatusMap((prev) => ({ ...prev, [id]: { status: 'none' } }));
  };

  const handleDisconnect = async (id) => {
    await removeConnection(id);
    await fetchConnections();
    await fetchSuggested();
  };

  // ─── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      setSearchStatusMap({});
      return;
    }
    setSearching(true);
    try {
      const res = await searchAlumni({ display_name: text });
      const results = res.data || [];
      setSearchResults(results);

      // ── FIX: same flag pattern for search modal ───────────────────────────
      setSearchStatusLoading(true);
      try {
        const map = await fetchStatusMap(results);
        setSearchStatusMap(map);
      } finally {
        setSearchStatusLoading(false);
      }
    } catch {
      setSearchResults([]);
      setSearchStatusMap({});
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchStatusMap({});
  };

  const currentData = activeTab === TABS.SUGGESTED ? suggested : connections;
  const isEmpty = !loading && currentData.length === 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentors</Text>
        <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.headerBtn}>
          <Ionicons name="search" size={24} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.SUGGESTED && styles.tabActive]}
          onPress={() => setActiveTab(TABS.SUGGESTED)}
        >
          <Text style={[styles.tabText, activeTab === TABS.SUGGESTED && styles.tabTextActive]}>
            Suggested
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.MY_MENTORS && styles.tabActive]}
          onPress={() => setActiveTab(TABS.MY_MENTORS)}
        >
          <Text style={[styles.tabText, activeTab === TABS.MY_MENTORS && styles.tabTextActive]}>
            My Mentors ({connections.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : isEmpty ? (
        activeTab === TABS.SUGGESTED ? (
          <EmptyState
            icon="people-outline"
            title="No suggestions yet"
            message="Add skills to your profile to get mentor suggestions"
            buttonText="Go to Profile"
            onPress={() => navigation.navigate('StudentProfile')}
          />
        ) : (
          <EmptyState
            icon="person-add-outline"
            title="No mentors yet"
            message="Connect with mentors to start your learning journey"
            buttonText="Browse Mentors"
            onPress={() => setActiveTab(TABS.SUGGESTED)}
          />
        )
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item, index) => (item.alumni_id || item.id || index).toString()}
          renderItem={({ item }) => {
            const alumniId = item.alumni_id || item.id;
            return (
              <MentorCard
                mentor={item}
                type={activeTab}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onCancelRequest={handleCancelRequest}
                connectionStatus={statusMap[alumniId]}
                statusLoading={activeTab === TABS.SUGGESTED && statusLoading}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Search Modal */}
      <Modal visible={searchVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Alumni</Text>
              <TouchableOpacity onPress={() => setSearchVisible(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={C.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor={C.muted}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close-circle" size={18} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>

            {searching ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <MentorCard
                    mentor={item}
                    type={TABS.SUGGESTED}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onCancelRequest={handleCancelRequest}
                    connectionStatus={searchStatusMap[item.id]}
                    statusLoading={searchStatusLoading}
                  />
                )}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : searchQuery.length >= 2 ? (
              <EmptyState
                icon="search-outline"
                title="No results"
                message={`No alumni found for "${searchQuery}"`}
              />
            ) : (
              <EmptyState
                icon="information-circle-outline"
                title="Start searching"
                message="Enter at least 2 characters to search for alumni"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.primary },
  tabText: { fontSize: 15, fontWeight: '500', color: C.muted },
  tabTextActive: { color: C.primary, fontWeight: '600' },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: C.primary },
  cardContent: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
  details: { fontSize: 13, color: C.subtext, marginBottom: 4 },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  skillBadgeText: { fontSize: 10, fontWeight: '600', color: C.primary },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectBtnText: { fontSize: 12, fontWeight: '600', color: C.primary },
  pendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.amberSoft,
    borderWidth: 1.5,
    borderColor: C.amber,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pendingBtnText: { fontSize: 12, fontWeight: '600', color: C.amber },
  disabledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.greenSoft,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disabledBtnText: { fontSize: 12, fontWeight: '600', color: C.green },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.coralSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── NEW ──
  statusLoadingWrap: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: { height: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptyMessage: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 20 },
  emptyBtn: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    flex: 1,
    backgroundColor: C.card,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: C.text,
    marginLeft: 8,
  },
});