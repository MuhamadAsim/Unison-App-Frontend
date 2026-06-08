import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  blockUser,
  cancelSentRequest,
  connectUser,
  followUser,
  getAlumniConnections,
  getConnectionRequests,
  getConnectionStatus,
  getFollowers,
  getFollowing,
  getSentRequests,
  getStudentConnections,
  getSuggestions,
  removeConnection,
  respondToConnection,
  searchUsers,
  unblockUser,
  unfollowUser,
} from '../../services/api';

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
  greenBorder: '#6EE7B7',
  coral: '#DC2626',
  coralSoft: '#FEE2E2',
  coralBorder: '#FCA5A5',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  amberBorder: '#FCD34D',
  purple: '#7C3AED',
  purpleSoft: '#EDE9FE',
  purpleBorder: '#C4B5FD',
  avatarPalette: [
    { bg: '#EEF2FF', fg: '#4F46E5' },
    { bg: '#FDF2F8', fg: '#9D174D' },
    { bg: '#ECFDF5', fg: '#065F46' },
    { bg: '#FFF7ED', fg: '#9A3412' },
    { bg: '#EFF6FF', fg: '#1E40AF' },
    { bg: '#FDF4FF', fg: '#7E22CE' },
  ],
};

function avatarColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % C.avatarPalette.length;
  return C.avatarPalette[idx];
}

const TABS = {
  MY_CONNECTIONS: 'my_connections',
  DISCOVER: 'discover',
  REQUESTS: 'requests',
};

const ROLE_FILTERS = {
  ALL: 'all',
  ALUMNI: 'alumni',
  STUDENT: 'student',
};

const REQUEST_SUB_FILTERS = {
  ALL: 'all',
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
};

// ── [NEW] Sub-tabs for My Network tab ────────────────────────────────────────
const NETWORK_SUB_TABS = {
  CONNECTIONS: 'connections',
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
};

function extractFields(user) {
  const id = user.id || user.alumni_id || user.target_id || user.sender_id;
  const name = user.display_name || user.name || user.sender_display_name || user.target_display_name || 'User';
  const username = user.username || user.sender_username || user.target_username || '';
  const picture = user.profile_picture || user.sender_profile_picture || user.target_profile_picture || null;
  const degree = user.degree || '';
  const batch = user.batch || '';
  const bio = user.bio || '';
  const skills = Array.isArray(user.skills) ? user.skills : [];
  const company = user.company || user.current_company || '';
  const jobRole = user.role && !['alumni', 'student', 'admin'].includes(user.role?.toLowerCase())
    ? user.role : '';
  const role = user.role || user.sender_role || user.target_role;
  return { id, name, username, picture, degree, batch, bio, skills, company, jobRole, role };
}

function sortByRelevance(results, query) {
  if (!query) return results;
  const q = query.toLowerCase();
  return [...results].sort((a, b) => {
    const aName = (a.display_name || '').toLowerCase();
    const bName = (b.display_name || '').toLowerCase();
    const aStarts = aName.startsWith(q) ? 0 : 1;
    const bStarts = bName.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return aName.localeCompare(bName);
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ picture, name, size = 52 }) {
  const { bg, fg } = avatarColor(name);
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  if (picture) {
    return <Image source={{ uri: picture }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.36, fontWeight: '800', color: fg }}>{initials}</Text>
    </View>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ request, type, onAccept, onReject, onCancel }) {
  const [loading, setLoading] = useState(false);
  const { id, name, username, picture, degree, role } = extractFields(request);
  const isIncoming = type === 'incoming';

  const handleAccept = async () => { setLoading(true); try { await onAccept(id); } catch (err) { Alert.alert('Error', err.message); } finally { setLoading(false); } };
  const handleReject = async () => { setLoading(true); try { await onReject(id); } catch (err) { Alert.alert('Error', err.message); } finally { setLoading(false); } };
  const handleCancel = async () => { setLoading(true); try { await onCancel(id); } catch (err) { Alert.alert('Error', err.message); } finally { setLoading(false); } };

  return (
    <View style={styles.card}>
      <Avatar picture={picture} name={name} size={50} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
          {isIncoming ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.acceptPill} onPress={handleAccept} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color={C.green} /> : <Text style={styles.acceptPillText}>Accept</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectPill} onPress={handleReject} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color={C.coral} /> : <Text style={styles.rejectPillText}>Reject</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.pendingPill} onPress={handleCancel} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={C.amber} /> : <><Ionicons name="close-outline" size={13} color={C.amber} /><Text style={styles.pendingPillText}>Cancel</Text></>}
            </TouchableOpacity>
          )}
        </View>
        {username ? <Text style={styles.cardUsername}>@{username}</Text> : null}
        {role && (
          <View style={[styles.roleBadge, role === 'alumni' ? styles.roleBadgeAlumni : styles.roleBadgeStudent]}>
            <Text style={styles.roleBadgeText}>{role === 'alumni' ? 'Alumni' : 'Student'}</Text>
          </View>
        )}
        {degree ? <Text style={styles.cardSub}>{degree}</Text> : null}
      </View>
    </View>
  );
}

// ─── [NEW] Options Menu helper ────────────────────────────────────────────────
// Opens native ActionSheet on iOS, Alert with buttons on Android.
// Options: Follow/Unfollow, Block.
function showOptionsMenu({ name, isFollowing, isBlocked, onFollow, onBlock }) {
  const followLabel  = isFollowing ? 'Unfollow' : 'Follow';
  const blockLabel   = isBlocked   ? 'Unblock'  : 'Block User';

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: name,
        options: [followLabel, blockLabel, 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (idx) => {
        if (idx === 0) onFollow();
        if (idx === 1) onBlock();
      },
    );
  } else {
    Alert.alert(name, undefined, [
      { text: followLabel, onPress: onFollow },
      { text: blockLabel, style: 'destructive', onPress: onBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
}

// ─── Mentor Card ──────────────────────────────────────────────────────────────
function MentorCard({
  user,
  tabType,
  navigation,
  onConnect,
  onDisconnect,
  onCancelRequest,
  connectionStatus,
  statusLoading,
  // [NEW] follow & block props
  isFollowing,
  isBlocked,
  onFollowToggle,
  onBlockToggle,
}) {
  const [connectLoading, setConnectLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const { id, name, username, picture, degree, batch, bio, skills, company, jobRole, role } = extractFields(user);
  const status = connectionStatus?.status;

  const subLine = (() => {
    if (jobRole || company) return [jobRole, company].filter(Boolean).join(' @ ');
    if (degree || batch) return [degree, batch].filter(Boolean).join(' · ');
    return bio;
  })();

  const showDegreeChips = tabType === TABS.DISCOVER && (degree || batch);
  const visibleSkills = skills.slice(0, 2);
  const overflow = skills.length > 2 ? skills.length - 2 : 0;
  const hasChips = showDegreeChips || visibleSkills.length > 0;

  const handleConnect = async () => {
    if (connectLoading) return;
    setConnectLoading(true);
    try { await onConnect(id); }
    catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed to send request'); }
    finally { setConnectLoading(false); }
  };

  const handleCancelRequest = () =>
    Alert.alert('Cancel Request', `Cancel connection request to ${name}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => onCancelRequest?.(id) },
    ]);

  const handleDisconnect = () =>
    Alert.alert('Remove Connection', `Remove ${name} from your connections?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDisconnect(id) },
    ]);

  // [NEW] Follow toggle handler
  const handleFollowToggle = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try { await onFollowToggle?.(id, isFollowing); }
    catch (err) { Alert.alert('Error', err.response?.data?.message || 'Action failed'); }
    finally { setFollowLoading(false); }
  };

  // [NEW] Options menu (⋯ button)
  const handleOptions = () => {
    showOptionsMenu({
      name,
      isFollowing: !!isFollowing,
      isBlocked: !!isBlocked,
      onFollow: handleFollowToggle,
      onBlock: () => onBlockToggle?.(id, isBlocked, name),
    });
  };

  // ── Connect action pill ──────────────────────────────────────────────────
  let connectAction = null;
  if (tabType === TABS.MY_CONNECTIONS) {
    connectAction = (
      <TouchableOpacity style={styles.mcPillRemove} onPress={handleDisconnect} activeOpacity={0.75}>
        <Ionicons name="person-remove-outline" size={13} color={C.coral} />
        <Text style={styles.mcPillRemoveText}>Remove</Text>
      </TouchableOpacity>
    );
  } else if (tabType === TABS.DISCOVER) {
    if (statusLoading) {
      connectAction = <View style={styles.mcPillPlaceholder}><ActivityIndicator size="small" color={C.muted} /></View>;
    } else if (status === 'connected') {
      connectAction = (
        <View style={styles.mcPillConnected}>
          <Ionicons name="checkmark-circle-outline" size={13} color={C.green} />
          <Text style={styles.mcPillConnectedText}>Connected</Text>
        </View>
      );
    } else if (status === 'pending') {
      connectAction = (
        <TouchableOpacity style={styles.mcPillPending} onPress={handleCancelRequest} disabled={connectLoading} activeOpacity={0.75}>
          {connectLoading ? <ActivityIndicator size="small" color={C.amber} /> : <><Ionicons name="time-outline" size={13} color={C.amber} /><Text style={styles.mcPillPendingText}>Pending</Text></>}
        </TouchableOpacity>
      );
    } else {
      connectAction = (
        <TouchableOpacity style={styles.mcPillConnect} onPress={handleConnect} disabled={connectLoading} activeOpacity={0.75}>
          {connectLoading ? <ActivityIndicator size="small" color={C.primary} /> : <><Ionicons name="person-add-outline" size={13} color={C.primary} /><Text style={styles.mcPillConnectText}>Connect</Text></>}
        </TouchableOpacity>
      );
    }
  }

  return (
    <TouchableOpacity style={styles.mcCard} onPress={() => navigation.navigate('AlumniPublicProfile', { alumni: user })} activeOpacity={0.72}>

      {/* ── Row 1: Avatar · Name/Username · Connect pill · ⋯ menu ── */}
      <View style={styles.mcTopRow}>
        <Avatar picture={picture} name={name} size={48} />
        <View style={styles.mcIdentity}>
          <Text style={styles.mcName} numberOfLines={1}>{name}</Text>
          {username ? <Text style={styles.mcUsername}>@{username}</Text> : null}
        </View>
        <View style={styles.mcActions}>
          {connectAction}
          {/* [NEW] ⋯ options button — always visible */}
          <TouchableOpacity style={styles.mcMoreBtn} onPress={handleOptions} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={16} color={C.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mcDivider} />

      {/* ── Row 2: Role badge · Subline · [NEW] Follow pill ── */}
      <View style={styles.mcInfoRow}>
        {role ? (
          <View style={[styles.mcRoleBadge, role === 'alumni' ? styles.mcRoleBadgeAlumni : styles.mcRoleBadgeStudent]}>
            <Text style={[styles.mcRoleBadgeText, role === 'alumni' ? styles.mcRoleBadgeAlumniText : styles.mcRoleBadgeStudentText]}>
              {role === 'alumni' ? 'Alumni' : 'Student'}
            </Text>
          </View>
        ) : null}
        {subLine ? <Text style={styles.mcSubline} numberOfLines={1}>{subLine}</Text> : null}

        {/* [NEW] Follow / Unfollow pill — shown in My Network & Discover */}
        {(tabType === TABS.MY_CONNECTIONS || tabType === TABS.DISCOVER) && (
          <TouchableOpacity
            style={[styles.mcFollowPill, isFollowing && styles.mcFollowingPill]}
            onPress={handleFollowToggle}
            disabled={followLoading}
            activeOpacity={0.75}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? C.purple : C.primary} />
            ) : (
              <>
                <Ionicons
                  name={isFollowing ? 'bookmark' : 'bookmark-outline'}
                  size={11}
                  color={isFollowing ? C.purple : C.primary}
                />
                <Text style={[styles.mcFollowPillText, isFollowing && styles.mcFollowingPillText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Row 3: Chips ── */}
      {hasChips && (
        <View style={styles.mcChipRow}>
          {showDegreeChips && degree ? (
            <View style={[styles.mcChip, styles.mcChipPrimary]}>
              <Ionicons name="school-outline" size={10} color={C.primary} />
              <Text style={[styles.mcChipText, { color: C.primary }]} numberOfLines={1}>{degree}</Text>
            </View>
          ) : null}
          {showDegreeChips && batch ? (
            <View style={styles.mcChip}>
              <Ionicons name="calendar-outline" size={10} color={C.subtext} />
              <Text style={styles.mcChipText} numberOfLines={1}>{batch}</Text>
            </View>
          ) : null}
          {visibleSkills.map((sk, i) => (
            <View key={i} style={[styles.mcChip, styles.mcChipPrimary]}>
              <Text style={[styles.mcChipText, { color: C.primary }]} numberOfLines={1}>{sk}</Text>
            </View>
          ))}
          {overflow > 0 && <View style={styles.mcChip}><Text style={styles.mcChipText}>+{overflow}</Text></View>}
        </View>
      )}

      <View style={styles.mcFooter}>
        <Ionicons name="chevron-forward" size={15} color={C.border} />
      </View>
    </TouchableOpacity>
  );
}

// ─── [NEW] Network Sub-tabs (Connections | Followers | Following) ─────────────
function NetworkSubTabs({ active, onChange, counts }) {
  const tabs = [
    { key: NETWORK_SUB_TABS.CONNECTIONS, label: 'Connections', count: counts.connections },
    { key: NETWORK_SUB_TABS.FOLLOWERS,   label: 'Followers',   count: counts.followers },
    { key: NETWORK_SUB_TABS.FOLLOWING,   label: 'Following',   count: counts.following },
  ];
  return (
    <View style={styles.networkSubTabBar}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.networkSubTab, active === tab.key && styles.networkSubTabActive]}
          onPress={() => onChange(tab.key)}
        >
          <Text style={[styles.networkSubTabText, active === tab.key && styles.networkSubTabTextActive]}>
            {tab.label}
          </Text>
          {tab.count != null && (
            <View style={[styles.networkSubTabBadge, active === tab.key && styles.networkSubTabBadgeActive]}>
              <Text style={[styles.networkSubTabBadgeText, active === tab.key && styles.networkSubTabBadgeTextActive]}>
                {tab.count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Role Filter Modal ───────────────────────────────────────────────────────
function RoleFilterModal({ visible, onClose, activeFilter, onSelect }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlayLight} activeOpacity={1} onPress={onClose}>
        <View style={styles.filterPopup}>
          {Object.values(ROLE_FILTERS).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPopupItem, activeFilter === filter && styles.filterPopupItemActive]}
              onPress={() => { onSelect(filter); onClose(); }}
            >
              <Text style={[styles.filterPopupText, activeFilter === filter && styles.filterPopupTextActive]}>
                {filter === ROLE_FILTERS.ALL ? 'All' : filter === ROLE_FILTERS.ALUMNI ? 'Alumni' : 'Students'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Request Sub-filter ───────────────────────────────────────────────────────
function RequestSubFilter({ active, onChange }) {
  return (
    <View style={styles.requestSubFilter}>
      {Object.values(REQUEST_SUB_FILTERS).map(filter => (
        <TouchableOpacity
          key={filter}
          style={[styles.subFilterChip, active === filter && styles.subFilterChipActive]}
          onPress={() => onChange(filter)}
        >
          <Text style={[styles.subFilterChipText, active === filter && styles.subFilterChipTextActive]}>
            {filter === REQUEST_SUB_FILTERS.ALL ? 'All' : filter === REQUEST_SUB_FILTERS.INCOMING ? 'Incoming' : 'Outgoing'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ icon, title, message, buttonText, onPress }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}><Ionicons name={icon} size={36} color={C.muted} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMsg}>{message}</Text>
      {buttonText && onPress && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onPress}>
          <Text style={styles.emptyBtnText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ConnectionScreen({ navigation }) {
  const [userRole, setUserRole]           = useState(null);
  const [myUserId, setMyUserId]           = useState(null);
  const [activeTab, setActiveTab]         = useState(TABS.DISCOVER);
  const [roleFilter, setRoleFilter]       = useState(ROLE_FILTERS.ALL);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [requestsSubFilter, setRequestsSubFilter]   = useState(REQUEST_SUB_FILTERS.ALL);
  // [NEW] My Network sub-tab
  const [networkSubTab, setNetworkSubTab] = useState(NETWORK_SUB_TABS.CONNECTIONS);

  const [myConnections, setMyConnections] = useState([]);
  const [discoverList, setDiscoverList]   = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [statusMap, setStatusMap]         = useState({});
  const [statusLoading, setStatusLoading] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  // [NEW] Followers / Following lists + follow status tracking
  const [followers, setFollowers]         = useState([]);
  const [following, setFollowing]         = useState([]);
  const [followingIds, setFollowingIds]   = useState(new Set()); // IDs the current user follows
  const [blockedIds, setBlockedIds]       = useState(new Set()); // IDs the current user has blocked

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatusMap, setSearchStatusMap] = useState({});
  const [searchStatusLoading, setSearchStatusLoading] = useState(false);
  const [searching, setSearching]         = useState(false);

  const route = useRoute();

  useEffect(() => {
    const initialTab = route.params?.initialTab;
    if (initialTab) {
      if (initialTab === 'requests')       setActiveTab(TABS.REQUESTS);
      else if (initialTab === 'my_connections') setActiveTab(TABS.MY_CONNECTIONS);
      else if (initialTab === 'discover')  setActiveTab(TABS.DISCOVER);
      navigation.setParams({ initialTab: undefined });
    }
  }, [route.params, navigation]);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          setUserRole(user.role);
          setMyUserId(user.id || user.user_id || null);
        } else {
          setUserRole('student');
        }
      } catch {
        setUserRole('student');
      }
    };
    loadRole();
  }, []);

  const fetchStatusMap = async (list) => {
    const entries = await Promise.all(
      list.map(async (item) => {
        const id = item.id || item.alumni_id;
        try {
          const res = await getConnectionStatus(id);
          return [id, res.data];
        } catch { return [id, { status: 'none' }]; }
      })
    );
    return Object.fromEntries(entries);
  };

  const fetchMyConnections = async () => {
    try {
      if (userRole === 'student') return (await getStudentConnections()).data || [];
      else return (await getAlumniConnections()).data || [];
    } catch (err) {
      if (err.response?.status === 403 && userRole === 'student') {
        return (await getAlumniConnections()).data || [];
      }
      throw err;
    }
  };

  // [NEW] Fetch followers + following for own profile, build followingIds Set
  const fetchFollowData = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const [followersRes, followingRes] = await Promise.all([
        getFollowers(userId).catch(() => ({ data: [] })),
        getFollowing(userId).catch(() => ({ data: [] })),
      ]);
      setFollowers(followersRes.data || []);
      const followingData = followingRes.data || [];
      setFollowing(followingData);
      setFollowingIds(new Set(followingData.map(u => u.id)));
    } catch {/* non-critical */}
  }, []);

  const fetchDiscover = async () => {
    let mentors = [];
    try { const res = await getSuggestions(); mentors = res.data || []; } catch { }
    if (mentors.length === 0) {
      try { const res = await searchUsers({}); mentors = res.data || []; } catch { }
    }
    if (mentors.length === 0) { setDiscoverList([]); setStatusMap({}); setStatusLoading(false); return; }
    setStatusLoading(true);
    try {
      const fullStatusMap = await fetchStatusMap(mentors);
      const filtered = mentors.filter(m => fullStatusMap[m.id || m.alumni_id]?.status !== 'connected');
      const filteredStatusMap = {};
      filtered.forEach(m => { const id = m.id || m.alumni_id; filteredStatusMap[id] = fullStatusMap[id]; });
      setDiscoverList(filtered);
      setStatusMap(filteredStatusMap);
    } catch { setDiscoverList(mentors); }
    finally { setStatusLoading(false); }
  };

  const fetchRequests = async () => {
    const [incomingRes, outgoingRes] = await Promise.all([
      getConnectionRequests().catch(() => ({ data: [] })),
      getSentRequests().catch(() => ({ data: [] })),
    ]);
    setIncomingRequests(incomingRes.data || []);
    setOutgoingRequests(outgoingRes.data || []);
  };

  const loadData = async () => {
    if (!userRole) return;
    setLoading(true);
    try {
      if (activeTab === TABS.MY_CONNECTIONS) {
        const [connData] = await Promise.all([
          fetchMyConnections(),
          myUserId ? fetchFollowData(myUserId) : Promise.resolve(),
        ]);
        setMyConnections(connData);
      } else if (activeTab === TABS.DISCOVER) {
        await Promise.all([
          fetchDiscover(),
          myUserId ? fetchFollowData(myUserId) : Promise.resolve(),
        ]);
      } else if (activeTab === TABS.REQUESTS) {
        await fetchRequests();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  useFocusEffect(useCallback(() => { loadData(); }, [activeTab, userRole, myUserId]));

  // ── Connection handlers ───────────────────────────────────────────────────
  const handleConnect = async (id) => {
    await connectUser(id, {});
    const optimistic = { status: 'pending', is_sender: true };
    setStatusMap(prev => ({ ...prev, [id]: optimistic }));
    setSearchStatusMap(prev => ({ ...prev, [id]: optimistic }));
    Alert.alert('Request Sent', 'Your connection request has been sent.');
  };

  const handleCancelRequest = async (id) => {
    await cancelSentRequest(id);
    setStatusMap(prev => ({ ...prev, [id]: { status: 'none' } }));
    setSearchStatusMap(prev => ({ ...prev, [id]: { status: 'none' } }));
    setOutgoingRequests(prev => prev.filter(req => (req.target_id || req.id) !== id));
    Alert.alert('Request Cancelled', 'Connection request has been cancelled.');
  };

  const handleDisconnect = async (id) => {
    await removeConnection(id);
    await loadData();
    if (activeTab === TABS.DISCOVER) await fetchDiscover();
  };

  const handleAcceptRequest = async (senderId) => {
    await respondToConnection(senderId, { action: 'accept' });
    await fetchRequests();
    await loadData();
    Alert.alert('Accepted', 'You are now connected.');
  };

  const handleRejectRequest = async (senderId) => {
    await respondToConnection(senderId, { action: 'reject' });
    await fetchRequests();
    Alert.alert('Rejected', 'Request rejected.');
  };

  // [NEW] Follow / Unfollow toggle handler
  const handleFollowToggle = async (targetId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetId);
        setFollowingIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
        setFollowing(prev => prev.filter(u => u.id !== targetId));
      } else {
        await followUser(targetId);
        setFollowingIds(prev => new Set([...prev, targetId]));
        // Re-fetch following to get full object
        if (myUserId) {
          const res = await getFollowing(myUserId).catch(() => ({ data: [] }));
          setFollowing(res.data || []);
        }
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Follow action failed.');
    }
  };

  // [NEW] Block / Unblock handler
  const handleBlockToggle = (targetId, isCurrentlyBlocked, name) => {
    if (isCurrentlyBlocked) {
      Alert.alert('Unblock User', `Unblock ${name}? They will be able to see your profile again.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock', onPress: async () => {
            try {
              await unblockUser(targetId);
              setBlockedIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
              Alert.alert('Unblocked', `${name} has been unblocked.`);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to unblock.');
            }
          },
        },
      ]);
    } else {
      Alert.alert(
        'Block User',
        `Block ${name}? This will sever any existing connection and prevent future communication.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block', style: 'destructive', onPress: async () => {
              try {
                await blockUser(targetId);
                setBlockedIds(prev => new Set([...prev, targetId]));
                // Remove from all local lists immediately
                setMyConnections(prev => prev.filter(u => (u.id || u.alumni_id) !== targetId));
                setDiscoverList(prev => prev.filter(u => (u.id || u.alumni_id) !== targetId));
                setFollowers(prev => prev.filter(u => u.id !== targetId));
                setFollowing(prev => prev.filter(u => u.id !== targetId));
                setFollowingIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
                Alert.alert('Blocked', `${name} has been blocked.`);
              } catch (err) {
                Alert.alert('Error', err.response?.data?.message || 'Failed to block.');
              }
            },
          },
        ],
      );
    }
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length < 2) { setSearchResults([]); setSearchStatusMap({}); return; }
    setSearching(true);
    try {
      const res = await searchUsers({ display_name: text });
      const sorted = sortByRelevance(res.data || [], text);
      setSearchResults(sorted);
      setSearchStatusLoading(true);
      try { const map = await fetchStatusMap(sorted); setSearchStatusMap(map); }
      finally { setSearchStatusLoading(false); }
    } catch { setSearchResults([]); setSearchStatusMap({}); }
    finally { setSearching(false); }
  };

  const clearSearch = () => { setSearchQuery(''); setSearchResults([]); setSearchStatusMap({}); };

  const filterByRole = (list, roleKey = 'role') => {
    if (roleFilter === ROLE_FILTERS.ALL) return list;
    return list.filter(item => {
      const itemRole = item[roleKey] || item.sender_role || item.target_role;
      return itemRole?.toLowerCase() === roleFilter;
    });
  };

  // ── Determine list to show ────────────────────────────────────────────────
  let currentData = [];
  let emptyIcon = 'people-outline';
  let emptyTitle = '';
  let emptyMessage = '';
  let emptyButtonText = '';
  let emptyButtonAction = null;

  if (activeTab === TABS.MY_CONNECTIONS) {
    // [NEW] Sub-tab switching
    if (networkSubTab === NETWORK_SUB_TABS.CONNECTIONS) {
      currentData = filterByRole(myConnections);
      emptyTitle = 'No connections yet';
      emptyMessage = 'Connect with alumni or students to build your network';
      emptyButtonText = 'Discover People';
      emptyButtonAction = () => setActiveTab(TABS.DISCOVER);
    } else if (networkSubTab === NETWORK_SUB_TABS.FOLLOWERS) {
      currentData = filterByRole(followers);
      emptyTitle = 'No followers yet';
      emptyMessage = 'When someone follows you, they appear here';
      emptyButtonText = null;
    } else {
      currentData = filterByRole(following);
      emptyTitle = "You're not following anyone";
      emptyMessage = 'Follow alumni and students to stay updated';
      emptyButtonText = 'Discover People';
      emptyButtonAction = () => setActiveTab(TABS.DISCOVER);
    }
  } else if (activeTab === TABS.DISCOVER) {
    currentData = filterByRole(discoverList);
    emptyTitle = 'No suggestions found';
    emptyMessage = 'Pull down to refresh or try searching';
    emptyButtonText = 'Search';
    emptyButtonAction = () => setSearchVisible(true);
  } else if (activeTab === TABS.REQUESTS) {
    let combined = [];
    if (requestsSubFilter === REQUEST_SUB_FILTERS.INCOMING) combined = incomingRequests;
    else if (requestsSubFilter === REQUEST_SUB_FILTERS.OUTGOING) combined = outgoingRequests;
    else combined = [
      ...incomingRequests.map(req => ({ ...req, _requestType: 'incoming' })),
      ...outgoingRequests.map(req => ({ ...req, _requestType: 'outgoing' })),
    ];
    currentData = filterByRole(combined, 'role');
    emptyTitle = 'No pending requests';
    emptyMessage = 'When someone sends you a request, it will appear here.';
    emptyButtonText = 'Discover People';
    emptyButtonAction = () => setActiveTab(TABS.DISCOVER);
  }

  const isEmpty = !loading && currentData.length === 0;

  const renderItem = ({ item }) => {
    if (activeTab === TABS.REQUESTS) {
      const isIncoming = item._requestType === 'incoming' || item.sender_id !== undefined;
      return (
        <RequestCard
          request={item}
          type={isIncoming ? 'incoming' : 'outgoing'}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
          onCancel={handleCancelRequest}
        />
      );
    }
    const id = item.id || item.alumni_id;
    return (
      <MentorCard
        user={item}
        tabType={activeTab}
        navigation={navigation}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onCancelRequest={handleCancelRequest}
        connectionStatus={statusMap[id]}
        statusLoading={activeTab === TABS.DISCOVER && statusLoading}
        isFollowing={followingIds.has(id)}
        isBlocked={blockedIds.has(id)}
        onFollowToggle={handleFollowToggle}
        onBlockToggle={handleBlockToggle}
      />
    );
  };

  if (!userRole) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connections</Text>
        <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.headerBtn}>
          <Ionicons name="search-outline" size={28} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Main tab bar */}
      <View style={styles.tabBar}>
        {[
          { key: TABS.DISCOVER,        label: 'Discover' },
          { key: TABS.MY_CONNECTIONS,  label: 'My Network' },
          { key: TABS.REQUESTS,        label: 'Requests' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* [NEW] My Network sub-tabs */}
      {activeTab === TABS.MY_CONNECTIONS && (
        <NetworkSubTabs
          active={networkSubTab}
          onChange={setNetworkSubTab}
          counts={{
            connections: myConnections.length,
            followers: followers.length,
            following: following.length,
          }}
        />
      )}

      {activeTab === TABS.REQUESTS && (
        <RequestSubFilter active={requestsSubFilter} onChange={setRequestsSubFilter} />
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : isEmpty ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} buttonText={emptyButtonText} onPress={emptyButtonAction} />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item, i) => (item.id || item.alumni_id || item.sender_id || item.target_id || i).toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Search Modal */}
      <Modal visible={searchVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Alumni</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setSearchVisible(false); clearSearch(); }}>
                <Ionicons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={17} color={C.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name…"
                placeholderTextColor={C.muted}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close-circle" size={16} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
            {searching ? (
              <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <MentorCard
                    user={item}
                    tabType={TABS.DISCOVER}
                    navigation={navigation}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onCancelRequest={handleCancelRequest}
                    connectionStatus={searchStatusMap[item.id]}
                    statusLoading={searchStatusLoading}
                    isFollowing={followingIds.has(item.id)}
                    isBlocked={blockedIds.has(item.id)}
                    onFollowToggle={handleFollowToggle}
                    onBlockToggle={handleBlockToggle}
                  />
                )}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                keyboardShouldPersistTaps="handled"
              />
            ) : searchQuery.length >= 2 ? (
              <EmptyState icon="search-outline" title="No results" message={`No alumni matched "${searchQuery}"`} />
            ) : (
              <View style={styles.searchHint}>
                <Ionicons name="sparkles-outline" size={28} color={C.primaryBorder} />
                <Text style={styles.searchHintText}>Type 2+ characters to search</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <RoleFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activeFilter={roleFilter}
        onSelect={setRoleFilter}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, paddingTop: 35, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBtn: { padding: 8, borderRadius: 10 },
  headerTitle: { fontSize: 27, fontWeight: '800', color: C.text, marginLeft: 10 },

  // Tab bar
  tabBar: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 4 },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: C.muted },
  tabTextActive: { color: C.primary, fontWeight: '700' },

  // [NEW] Network sub-tabs
  networkSubTabBar: { flexDirection: 'row', backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  networkSubTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 20, backgroundColor: C.divider },
  networkSubTabActive: { backgroundColor: C.primarySoft },
  networkSubTabText: { fontSize: 12, fontWeight: '600', color: C.subtext },
  networkSubTabTextActive: { color: C.primary },
  networkSubTabBadge: { backgroundColor: C.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  networkSubTabBadgeActive: { backgroundColor: C.primaryBorder },
  networkSubTabBadgeText: { fontSize: 10, fontWeight: '700', color: C.muted },
  networkSubTabBadgeTextActive: { color: C.primaryDark },

  // Request sub-filter
  requestSubFilter: { flexDirection: 'row', backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 8, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  subFilterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.divider },
  subFilterChipActive: { backgroundColor: C.primarySoft },
  subFilterChipText: { fontSize: 13, fontWeight: '500', color: C.subtext },
  subFilterChipTextActive: { color: C.primary, fontWeight: '700' },

  listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 28 },

  // Legacy RequestCard styles
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: C.border },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  cardName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  cardUsername: { fontSize: 12, color: C.muted, marginBottom: 1 },
  cardSub: { fontSize: 12, color: C.subtext, marginBottom: 5 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
  roleBadgeAlumni: { backgroundColor: C.primarySoft },
  roleBadgeStudent: { backgroundColor: C.greenSoft },
  roleBadgeText: { fontSize: 10, fontWeight: '600', color: C.primary },

  // MentorCard
  mcCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  mcTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mcIdentity: { flex: 1, minWidth: 0, gap: 2 },
  mcName: { fontSize: 15, fontWeight: '700', color: C.text },
  mcUsername: { fontSize: 12, color: C.muted },
  // [NEW] Actions wrapper — keeps connect pill + ⋯ button side-by-side
  mcActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  // [NEW] ⋯ more button
  mcMoreBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center' },
  mcDivider: { height: 1, backgroundColor: C.divider, marginVertical: 10 },
  // Info row — now includes follow pill
  mcInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  mcRoleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, flexShrink: 0 },
  mcRoleBadgeAlumni: { backgroundColor: C.primarySoft },
  mcRoleBadgeStudent: { backgroundColor: C.greenSoft },
  mcRoleBadgeText: { fontSize: 10, fontWeight: '700' },
  mcRoleBadgeAlumniText: { color: '#4338CA' },
  mcRoleBadgeStudentText: { color: '#065F46' },
  mcSubline: { flex: 1, fontSize: 12.5, color: C.subtext },
  // [NEW] Follow pill
  mcFollowPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: C.primaryBorder, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, flexShrink: 0 },
  mcFollowingPill: { backgroundColor: C.purpleSoft, borderColor: C.purpleBorder },
  mcFollowPillText: { fontSize: 11, fontWeight: '700', color: C.primary },
  mcFollowingPillText: { color: C.purple },
  // Chips
  mcChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  mcChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.divider, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, maxWidth: 140 },
  mcChipPrimary: { backgroundColor: C.primarySoft },
  mcChipText: { fontSize: 11, fontWeight: '600', color: C.subtext },
  mcFooter: { alignItems: 'flex-end' },
  // Connect action pills
  mcPillConnect: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: C.primary, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, minHeight: 30, flexShrink: 0 },
  mcPillConnectText: { fontSize: 12, fontWeight: '700', color: C.primary },
  mcPillPending: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amberSoft, borderWidth: 1.5, borderColor: C.amberBorder, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, minHeight: 30, flexShrink: 0 },
  mcPillPendingText: { fontSize: 12, fontWeight: '700', color: C.amber },
  mcPillConnected: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.greenSoft, borderWidth: 1.5, borderColor: C.greenBorder, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, minHeight: 30, flexShrink: 0 },
  mcPillConnectedText: { fontSize: 12, fontWeight: '700', color: C.green },
  mcPillRemove: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.coralSoft, borderWidth: 1.5, borderColor: C.coralBorder, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, minHeight: 30, flexShrink: 0 },
  mcPillRemoveText: { fontSize: 12, fontWeight: '700', color: C.coral },
  mcPillPlaceholder: { width: 72, height: 30, justifyContent: 'center', alignItems: 'center' },

  // RequestCard pills
  pendingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amberSoft, borderWidth: 1.5, borderColor: C.amberBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, minHeight: 30 },
  pendingPillText: { fontSize: 12, fontWeight: '700', color: C.amber },
  acceptPill: { backgroundColor: C.greenSoft, borderWidth: 1.5, borderColor: C.greenBorder, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, minHeight: 30, justifyContent: 'center' },
  acceptPillText: { fontSize: 12, fontWeight: '700', color: C.green },
  rejectPill: { backgroundColor: C.coralSoft, borderWidth: 1.5, borderColor: C.coralBorder, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, minHeight: 30, justifyContent: 'center' },
  rejectPillText: { fontSize: 12, fontWeight: '700', color: C.coral },

  // Empty state
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptyMsg: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: { borderWidth: 1.5, borderColor: C.primary, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 9 },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { flex: 1, backgroundColor: C.card, marginTop: 48, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  modalCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, borderWidth: 1, borderColor: C.border, margin: 14, marginBottom: 4, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: C.text },
  searchHint: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  searchHintText: { fontSize: 14, color: C.muted, textAlign: 'center' },
  modalOverlayLight: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  filterPopup: { backgroundColor: C.card, borderRadius: 16, padding: 8, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  filterPopupItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  filterPopupItemActive: { backgroundColor: C.primarySoft },
  filterPopupText: { fontSize: 15, color: C.text },
  filterPopupTextActive: { color: C.primary, fontWeight: '600' },
});