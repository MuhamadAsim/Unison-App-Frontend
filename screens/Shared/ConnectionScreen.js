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

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg: '#F5F6FA',
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
  const jobRole = user.role && !['alumni', 'student', 'admin'].includes(user.role?.toLowerCase()) ? user.role : '';
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

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  if (!role) return null;
  const isAlumni = role === 'alumni';
  return (
    <View style={[styles.roleBadge, isAlumni ? styles.roleBadgeAlumni : styles.roleBadgeStudent]}>
      <Text style={[styles.roleBadgeText, isAlumni ? styles.roleBadgeAlumniText : styles.roleBadgeStudentText]}>
        {isAlumni ? 'Alumni' : 'Student'}
      </Text>
    </View>
  );
}

// ─── Options Menu ─────────────────────────────────────────────────────────────
function showOptionsMenu({ name, isFollowing, isBlocked, onFollow, onBlock }) {
  const followLabel = isFollowing ? 'Unfollow' : 'Follow';
  const blockLabel = isBlocked ? 'Unblock' : 'Block User';
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: name, options: [followLabel, blockLabel, 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
      (idx) => { if (idx === 0) onFollow(); if (idx === 1) onBlock(); },
    );
  } else {
    Alert.alert(name, undefined, [
      { text: followLabel, onPress: onFollow },
      { text: blockLabel, style: 'destructive', onPress: onBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ request, type, onAccept, onReject, onCancel }) {
  // Optimistic: track local action state to prevent double taps
  const [actionState, setActionState] = useState('idle'); // idle | accepting | rejecting | cancelling | done
  const { id, name, username, picture, degree, role } = extractFields(request);
  const isIncoming = type === 'incoming';

  const handleAccept = async () => {
    if (actionState !== 'idle') return;
    setActionState('accepting');
    try { await onAccept(id); setActionState('done'); }
    catch (err) { Alert.alert('Error', err.message); setActionState('idle'); }
  };

  const handleReject = async () => {
    if (actionState !== 'idle') return;
    setActionState('rejecting');
    try { await onReject(id); setActionState('done'); }
    catch (err) { Alert.alert('Error', err.message); setActionState('idle'); }
  };

  const handleCancel = async () => {
    if (actionState !== 'idle') return;
    setActionState('cancelling');
    try { await onCancel(id); setActionState('done'); }
    catch (err) { Alert.alert('Error', err.message); setActionState('idle'); }
  };

  if (actionState === 'done') return null;

  return (
    <View style={styles.requestCard}>
      <Avatar picture={picture} name={name} size={46} />
      <View style={styles.requestCardBody}>
        <View style={styles.requestCardTop}>
          <View style={styles.requestCardMeta}>
            <Text style={styles.requestCardName} numberOfLines={1}>{name}</Text>
            {username ? <Text style={styles.requestCardUsername}>@{username}</Text> : null}
          </View>
          <View style={styles.requestCardActions}>
            {isIncoming ? (
              <>
                <TouchableOpacity
                  style={[styles.actionPill, styles.actionPillAccept]}
                  onPress={handleAccept}
                  disabled={actionState !== 'idle'}
                  activeOpacity={0.75}
                >
                  {actionState === 'accepting'
                    ? <ActivityIndicator size="small" color={C.green} />
                    : <><Ionicons name="checkmark" size={13} color={C.green} /><Text style={styles.actionPillAcceptText}>Accept</Text></>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionPill, styles.actionPillReject]}
                  onPress={handleReject}
                  disabled={actionState !== 'idle'}
                  activeOpacity={0.75}
                >
                  {actionState === 'rejecting'
                    ? <ActivityIndicator size="small" color={C.coral} />
                    : <Ionicons name="close" size={14} color={C.coral} />
                  }
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionPill, styles.actionPillCancel]}
                onPress={handleCancel}
                disabled={actionState !== 'idle'}
                activeOpacity={0.75}
              >
                {actionState === 'cancelling'
                  ? <ActivityIndicator size="small" color={C.amber} />
                  : <><Ionicons name="time-outline" size={13} color={C.amber} /><Text style={styles.actionPillCancelText}>Pending · Cancel</Text></>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.requestCardFooter}>
          <RoleBadge role={role} />
          {degree ? <Text style={styles.requestCardSub} numberOfLines={1}>{degree}</Text> : null}
        </View>
      </View>
    </View>
  );
}

// ─── Mentor Card ──────────────────────────────────────────────────────────────
function MentorCard({ user, tabType, navigation, onConnect, onDisconnect, onCancelRequest, connectionStatus, statusLoading, isFollowing, isBlocked, onFollowToggle, onBlockToggle }) {
  // Optimistic local state for connection + follow
  const [localConnStatus, setLocalConnStatus] = useState(null);
  const [localFollowing, setLocalFollowing] = useState(isFollowing);
  const [connectBusy, setConnectBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // Sync external follow state in
  useEffect(() => { setLocalFollowing(isFollowing); }, [isFollowing]);

  const { id, name, username, picture, degree, batch, bio, skills, company, jobRole, role } = extractFields(user);

  // Use local override if set, else fall back to prop
  const status = localConnStatus ?? connectionStatus?.status;

  const subLine = (() => {
    if (jobRole || company) return [jobRole, company].filter(Boolean).join(' @ ');
    if (degree || batch) return [degree, batch].filter(Boolean).join(' · ');
    return bio;
  })();

  const visibleSkills = skills.slice(0, 2);
  const overflow = skills.length > 2 ? skills.length - 2 : 0;

  // ── Connect action (optimistic) ───────────────────────────────────────────
  const handleConnect = async () => {
    if (connectBusy) return;
    setConnectBusy(true);
    setLocalConnStatus('pending'); // instant optimistic flip
    try {
      await onConnect(id);
    } catch (err) {
      setLocalConnStatus(null); // revert on error
      Alert.alert('Error', err.response?.data?.message || 'Failed to send request');
    } finally {
      setConnectBusy(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert('Cancel Request', `Cancel connection request to ${name}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', style: 'destructive', onPress: async () => {
          setLocalConnStatus('none');
          try { await onCancelRequest?.(id); }
          catch { setLocalConnStatus('pending'); }
        },
      },
    ]);
  };

  const handleDisconnect = () => {
    Alert.alert('Remove Connection', `Remove ${name} from your connections?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDisconnect(id) },
    ]);
  };

  // ── Follow (optimistic) ───────────────────────────────────────────────────
  const handleFollowToggle = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    const next = !localFollowing;
    setLocalFollowing(next); // instant flip
    try {
      await onFollowToggle?.(id, !next);
    } catch (err) {
      setLocalFollowing(!next); // revert
      Alert.alert('Error', err.response?.data?.message || 'Action failed');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleOptions = () => {
    showOptionsMenu({
      name,
      isFollowing: localFollowing,
      isBlocked: !!isBlocked,
      onFollow: handleFollowToggle,
      onBlock: () => onBlockToggle?.(id, isBlocked, name),
    });
  };

  // ── Connect pill rendering ────────────────────────────────────────────────
  let connectPill = null;
  if (tabType === TABS.MY_CONNECTIONS) {
    connectPill = (
      <TouchableOpacity style={[styles.connectPill, styles.connectPillRemove]} onPress={handleDisconnect} activeOpacity={0.75}>
        <Ionicons name="person-remove-outline" size={12} color={C.coral} />
        <Text style={styles.connectPillRemoveText}>Remove</Text>
      </TouchableOpacity>
    );
  } else if (tabType === TABS.DISCOVER) {
    if (statusLoading && !localConnStatus) {
      connectPill = <View style={styles.connectPillPlaceholder}><ActivityIndicator size="small" color={C.muted} /></View>;
    } else if (status === 'connected') {
      connectPill = (
        <View style={[styles.connectPill, styles.connectPillConnected]}>
          <Ionicons name="checkmark-circle-outline" size={12} color={C.green} />
          <Text style={styles.connectPillConnectedText}>Connected</Text>
        </View>
      );
    } else if (status === 'pending') {
      connectPill = (
        <TouchableOpacity style={[styles.connectPill, styles.connectPillPending]} onPress={handleCancelRequest} activeOpacity={0.75}>
          <Ionicons name="time-outline" size={12} color={C.amber} />
          <Text style={styles.connectPillPendingText}>Pending</Text>
        </TouchableOpacity>
      );
    } else {
      connectPill = (
        <TouchableOpacity style={[styles.connectPill, styles.connectPillDefault]} onPress={handleConnect} disabled={connectBusy} activeOpacity={0.75}>
          {connectBusy
            ? <ActivityIndicator size="small" color={C.primary} />
            : <><Ionicons name="person-add-outline" size={12} color={C.primary} /><Text style={styles.connectPillDefaultText}>Connect</Text></>
          }
        </TouchableOpacity>
      );
    }
  }

  return (
    <TouchableOpacity
      style={styles.mentorCard}
      onPress={() => navigation.navigate('AlumniPublicProfile', { alumni: user })}
      activeOpacity={0.72}
    >
      {/* Row 1: Avatar + Identity + Actions */}
      <View style={styles.mentorCardRow}>
        <Avatar picture={picture} name={name} size={46} />
        <View style={styles.mentorCardIdentity}>
          <Text style={styles.mentorCardName} numberOfLines={1}>{name}</Text>
          {username ? <Text style={styles.mentorCardUsername}>@{username}</Text> : null}
        </View>
        <View style={styles.mentorCardActions}>
          {connectPill}
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={handleOptions}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={15} color={C.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2: Role + Subline + Follow pill */}
      <View style={styles.mentorCardMeta}>
        <RoleBadge role={role} />
        {subLine ? <Text style={styles.mentorCardSubline} numberOfLines={1}>{subLine}</Text> : null}
        {(tabType === TABS.MY_CONNECTIONS || tabType === TABS.DISCOVER) && (
          <TouchableOpacity
            style={[styles.followPill, localFollowing && styles.followingPill]}
            onPress={handleFollowToggle}
            disabled={followBusy}
            activeOpacity={0.75}
          >
            {followBusy
              ? <ActivityIndicator size="small" color={localFollowing ? C.purple : C.primary} />
              : <>
                  <Ionicons name={localFollowing ? 'bookmark' : 'bookmark-outline'} size={11} color={localFollowing ? C.purple : C.primary} />
                  <Text style={[styles.followPillText, localFollowing && styles.followingPillText]}>
                    {localFollowing ? 'Following' : 'Follow'}
                  </Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Row 3: Chips */}
      {(degree || batch || visibleSkills.length > 0) && (
        <View style={styles.chipsRow}>
          {degree ? (
            <View style={[styles.chip, styles.chipPrimary]}>
              <Ionicons name="school-outline" size={10} color={C.primary} />
              <Text style={[styles.chipText, { color: C.primary }]} numberOfLines={1}>{degree}</Text>
            </View>
          ) : null}
          {batch ? (
            <View style={styles.chip}>
              <Ionicons name="calendar-outline" size={10} color={C.subtext} />
              <Text style={styles.chipText} numberOfLines={1}>{batch}</Text>
            </View>
          ) : null}
          {visibleSkills.map((sk, i) => (
            <View key={i} style={[styles.chip, styles.chipPrimary]}>
              <Text style={[styles.chipText, { color: C.primary }]} numberOfLines={1}>{sk}</Text>
            </View>
          ))}
          {overflow > 0 && <View style={styles.chip}><Text style={styles.chipText}>+{overflow}</Text></View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Network Sub-tabs ─────────────────────────────────────────────────────────
function NetworkSubTabs({ active, onChange, counts }) {
  const tabs = [
    { key: NETWORK_SUB_TABS.CONNECTIONS, label: 'Connections', count: counts.connections },
    { key: NETWORK_SUB_TABS.FOLLOWERS, label: 'Followers', count: counts.followers },
    { key: NETWORK_SUB_TABS.FOLLOWING, label: 'Following', count: counts.following },
  ];
  return (
    <View style={styles.subTabBar}>
      {tabs.map(t => (
        <TouchableOpacity
          key={t.key}
          style={[styles.subTab, active === t.key && styles.subTabActive]}
          onPress={() => onChange(t.key)}
          activeOpacity={0.75}
        >
          <Text style={[styles.subTabText, active === t.key && styles.subTabTextActive]}>{t.label}</Text>
          {t.count != null && (
            <View style={[styles.subTabBadge, active === t.key && styles.subTabBadgeActive]}>
              <Text style={[styles.subTabBadgeText, active === t.key && styles.subTabBadgeTextActive]}>{t.count}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Request Sub-filter ───────────────────────────────────────────────────────
function RequestSubFilter({ active, onChange, incomingCount, outgoingCount }) {
  const filters = [
    { key: REQUEST_SUB_FILTERS.ALL, label: 'All', count: incomingCount + outgoingCount },
    { key: REQUEST_SUB_FILTERS.INCOMING, label: 'Incoming', count: incomingCount },
    { key: REQUEST_SUB_FILTERS.OUTGOING, label: 'Outgoing', count: outgoingCount },
  ];
  return (
    <View style={styles.subFilterRow}>
      {filters.map(f => (
        <TouchableOpacity
          key={f.key}
          style={[styles.subFilterPill, active === f.key && styles.subFilterPillActive]}
          onPress={() => onChange(f.key)}
          activeOpacity={0.75}
        >
          <Text style={[styles.subFilterPillText, active === f.key && styles.subFilterPillTextActive]}>{f.label}</Text>
          {f.count > 0 && (
            <View style={[styles.subFilterBadge, active === f.key && styles.subFilterBadgeActive]}>
              <Text style={[styles.subFilterBadgeText, active === f.key && styles.subFilterBadgeTextActive]}>{f.count}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Role Filter Modal ────────────────────────────────────────────────────────
function RoleFilterModal({ visible, onClose, activeFilter, onSelect }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlayLight} activeOpacity={1} onPress={onClose}>
        <View style={styles.filterPopup}>
          {Object.values(ROLE_FILTERS).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPopupItem, activeFilter === f && styles.filterPopupItemActive]}
              onPress={() => { onSelect(f); onClose(); }}
            >
              <Text style={[styles.filterPopupText, activeFilter === f && styles.filterPopupTextActive]}>
                {f === ROLE_FILTERS.ALL ? 'All' : f === ROLE_FILTERS.ALUMNI ? 'Alumni' : 'Students'}
              </Text>
              {activeFilter === f && <Ionicons name="checkmark" size={16} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, message, buttonText, onPress }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={34} color={C.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMsg}>{message}</Text>
      {buttonText && onPress && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.emptyBtnText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ConnectionScreen({ navigation }) {
  const [userRole, setUserRole] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.DISCOVER);
  const [roleFilter, setRoleFilter] = useState(ROLE_FILTERS.ALL);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [requestsSubFilter, setRequestsSubFilter] = useState(REQUEST_SUB_FILTERS.ALL);
  const [networkSubTab, setNetworkSubTab] = useState(NETWORK_SUB_TABS.CONNECTIONS);

  const [myConnections, setMyConnections] = useState([]);
  const [discoverList, setDiscoverList] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [statusLoading, setStatusLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [blockedIds, setBlockedIds] = useState(new Set());

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatusMap, setSearchStatusMap] = useState({});
  const [searchStatusLoading, setSearchStatusLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const route = useRoute();

  useEffect(() => {
    const initialTab = route.params?.initialTab;
    if (initialTab) {
      if (initialTab === 'requests') setActiveTab(TABS.REQUESTS);
      else if (initialTab === 'my_connections') setActiveTab(TABS.MY_CONNECTIONS);
      else if (initialTab === 'discover') setActiveTab(TABS.DISCOVER);
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
    } catch { }
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleConnect = async (id) => {
    await connectUser(id, {});
    const optimistic = { status: 'pending', is_sender: true };
    setStatusMap(prev => ({ ...prev, [id]: optimistic }));
    setSearchStatusMap(prev => ({ ...prev, [id]: optimistic }));
  };

  const handleCancelRequest = async (id) => {
    await cancelSentRequest(id);
    setStatusMap(prev => ({ ...prev, [id]: { status: 'none' } }));
    setSearchStatusMap(prev => ({ ...prev, [id]: { status: 'none' } }));
    setOutgoingRequests(prev => prev.filter(req => (req.target_id || req.id) !== id));
  };

  const handleDisconnect = async (id) => {
    await removeConnection(id);
    setMyConnections(prev => prev.filter(u => (u.id || u.alumni_id) !== id));
    if (activeTab === TABS.DISCOVER) await fetchDiscover();
  };

  const handleAcceptRequest = async (senderId) => {
    await respondToConnection(senderId, { action: 'accept' });
    setIncomingRequests(prev => prev.filter(r => (r.sender_id || r.id) !== senderId));
    Alert.alert('Accepted', 'You are now connected.');
  };

  const handleRejectRequest = async (senderId) => {
    await respondToConnection(senderId, { action: 'reject' });
    setIncomingRequests(prev => prev.filter(r => (r.sender_id || r.id) !== senderId));
  };

  const handleFollowToggle = async (targetId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetId);
        setFollowingIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
        setFollowing(prev => prev.filter(u => u.id !== targetId));
      } else {
        await followUser(targetId);
        setFollowingIds(prev => new Set([...prev, targetId]));
        if (myUserId) {
          const res = await getFollowing(myUserId).catch(() => ({ data: [] }));
          setFollowing(res.data || []);
        }
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Follow action failed.');
    }
  };

  const handleBlockToggle = (targetId, isCurrentlyBlocked, name) => {
    if (isCurrentlyBlocked) {
      Alert.alert('Unblock User', `Unblock ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock', onPress: async () => {
            try {
              await unblockUser(targetId);
              setBlockedIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to unblock.');
            }
          },
        },
      ]);
    } else {
      Alert.alert('Block User', `Block ${name}? This will remove any existing connection.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block', style: 'destructive', onPress: async () => {
            try {
              await blockUser(targetId);
              setBlockedIds(prev => new Set([...prev, targetId]));
              setMyConnections(prev => prev.filter(u => (u.id || u.alumni_id) !== targetId));
              setDiscoverList(prev => prev.filter(u => (u.id || u.alumni_id) !== targetId));
              setFollowers(prev => prev.filter(u => u.id !== targetId));
              setFollowing(prev => prev.filter(u => u.id !== targetId));
              setFollowingIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to block.');
            }
          },
        },
      ]);
    }
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const searchTimer = useRef(null);
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 2) { setSearchResults([]); setSearchStatusMap({}); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsers({ display_name: text });
        const sorted = sortByRelevance(res.data || [], text);
        setSearchResults(sorted);
        setSearchStatusLoading(true);
        try { const map = await fetchStatusMap(sorted); setSearchStatusMap(map); }
        finally { setSearchStatusLoading(false); }
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350); // debounced
  };

  const clearSearch = () => { setSearchQuery(''); setSearchResults([]); setSearchStatusMap({}); };

  const filterByRole = (list, roleKey = 'role') => {
    if (roleFilter === ROLE_FILTERS.ALL) return list;
    return list.filter(item => {
      const itemRole = item[roleKey] || item.sender_role || item.target_role;
      return itemRole?.toLowerCase() === roleFilter;
    });
  };

  // ── Data for current view ─────────────────────────────────────────────────
  let currentData = [];
  let emptyIcon = 'people-outline';
  let emptyTitle = '';
  let emptyMessage = '';
  let emptyButtonText = '';
  let emptyButtonAction = null;

  if (activeTab === TABS.MY_CONNECTIONS) {
    if (networkSubTab === NETWORK_SUB_TABS.CONNECTIONS) {
      currentData = filterByRole(myConnections);
      emptyTitle = 'No connections yet';
      emptyMessage = 'Connect with alumni or students to build your network';
      emptyButtonText = 'Discover People';
      emptyButtonAction = () => setActiveTab(TABS.DISCOVER);
    } else if (networkSubTab === NETWORK_SUB_TABS.FOLLOWERS) {
      currentData = filterByRole(followers);
      emptyIcon = 'people-circle-outline';
      emptyTitle = 'No followers yet';
      emptyMessage = 'When someone follows you, they appear here';
    } else {
      currentData = filterByRole(following);
      emptyIcon = 'bookmark-outline';
      emptyTitle = "You're not following anyone";
      emptyMessage = 'Follow alumni and students to stay updated';
      emptyButtonText = 'Discover People';
      emptyButtonAction = () => setActiveTab(TABS.DISCOVER);
    }
  } else if (activeTab === TABS.DISCOVER) {
    currentData = filterByRole(discoverList);
    emptyIcon = 'search-outline';
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
    emptyIcon = 'mail-outline';
    emptyTitle = 'No pending requests';
    emptyMessage = 'Incoming and outgoing requests will appear here.';
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
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Network</Text>
        <View style={styles.headerRight}>
          {/* Role filter pill */}
          {roleFilter !== ROLE_FILTERS.ALL && (
            <TouchableOpacity
              style={styles.activeFilterPill}
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.activeFilterPillText}>
                {roleFilter === ROLE_FILTERS.ALUMNI ? 'Alumni' : 'Students'}
              </Text>
              <Ionicons name="close" size={12} color={C.primary} onPress={() => setRoleFilter(ROLE_FILTERS.ALL)} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="filter-outline" size={20} color={roleFilter !== ROLE_FILTERS.ALL ? C.primary : C.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="search-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main tabs ── */}
      <View style={styles.tabBar}>
        {[
          { key: TABS.DISCOVER, label: 'Discover', icon: 'compass-outline' },
          { key: TABS.MY_CONNECTIONS, label: 'My Network', icon: 'people-outline' },
          { key: TABS.REQUESTS, label: 'Requests', icon: 'mail-outline', badge: incomingRequests.length },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <View style={styles.tabInner}>
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? C.primary : C.muted} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              {tab.badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Sub-tabs ── */}
      {activeTab === TABS.MY_CONNECTIONS && (
        <NetworkSubTabs
          active={networkSubTab}
          onChange={setNetworkSubTab}
          counts={{ connections: myConnections.length, followers: followers.length, following: following.length }}
        />
      )}
      {activeTab === TABS.REQUESTS && (
        <RequestSubFilter
          active={requestsSubFilter}
          onChange={setRequestsSubFilter}
          incomingCount={incomingRequests.length}
          outgoingCount={outgoingRequests.length}
        />
      )}

      {/* ── Content ── */}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* ── Search Modal ── */}
      <Modal visible={searchVisible} animationType="slide" transparent onRequestClose={() => { setSearchVisible(false); clearSearch(); }}>
        <SafeAreaView style={styles.searchModalSafe}>
          <View style={styles.searchModalSheet}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Search bar */}
            <View style={styles.searchBarRow}>
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
                  <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={C.muted} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => { setSearchVisible(false); clearSearch(); }}
                style={styles.searchCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.searchCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Results */}
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
              <EmptyState icon="search-outline" title="No results" message={`No users matched "${searchQuery}"`} />
            ) : (
              <View style={styles.searchHint}>
                <View style={styles.searchHintIconWrap}>
                  <Ionicons name="search-outline" size={28} color={C.primaryBorder} />
                </View>
                <Text style={styles.searchHintTitle}>Search the network</Text>
                <Text style={styles.searchHintSub}>Type at least 2 characters to find people</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 36,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  activeFilterPillText: { fontSize: 12, fontWeight: '700', color: C.primary },

  // Main tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.primary },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabText: { fontSize: 12.5, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary, fontWeight: '700' },
  tabBadge: {
    backgroundColor: C.coral,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // Sub-tab bar (My Network)
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.divider,
  },
  subTabActive: { backgroundColor: C.primarySoft },
  subTabText: { fontSize: 12, fontWeight: '600', color: C.subtext },
  subTabTextActive: { color: C.primary },
  subTabBadge: {
    backgroundColor: C.border,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  subTabBadgeActive: { backgroundColor: C.primaryBorder },
  subTabBadgeText: { fontSize: 10, fontWeight: '700', color: C.muted },
  subTabBadgeTextActive: { color: C.primaryDark },

  // Sub-filter row (Requests)
  subFilterRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  subFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.divider,
  },
  subFilterPillActive: { backgroundColor: C.primarySoft },
  subFilterPillText: { fontSize: 13, fontWeight: '600', color: C.subtext },
  subFilterPillTextActive: { color: C.primary },
  subFilterBadge: {
    backgroundColor: C.border,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  subFilterBadgeActive: { backgroundColor: C.primaryBorder },
  subFilterBadgeText: { fontSize: 10, fontWeight: '700', color: C.muted },
  subFilterBadgeTextActive: { color: C.primaryDark },

  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 30 },

  // Role badge
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    flexShrink: 0,
  },
  roleBadgeAlumni: { backgroundColor: C.primarySoft },
  roleBadgeStudent: { backgroundColor: C.greenSoft },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },
  roleBadgeAlumniText: { color: '#4338CA' },
  roleBadgeStudentText: { color: '#065F46' },

  // Request card
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  requestCardBody: { flex: 1, gap: 6 },
  requestCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  requestCardMeta: { flex: 1 },
  requestCardName: { fontSize: 15, fontWeight: '700', color: C.text },
  requestCardUsername: { fontSize: 12, color: C.muted, marginTop: 1 },
  requestCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestCardSub: { fontSize: 12, color: C.subtext, flex: 1 },
  requestCardActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    minHeight: 32,
    minWidth: 32,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  actionPillAccept: { backgroundColor: C.greenSoft, borderColor: C.greenBorder },
  actionPillAcceptText: { fontSize: 12, fontWeight: '700', color: C.green },
  actionPillReject: { backgroundColor: C.coralSoft, borderColor: C.coralBorder },
  actionPillCancel: { backgroundColor: C.amberSoft, borderColor: C.amberBorder },
  actionPillCancelText: { fontSize: 12, fontWeight: '700', color: C.amber },

  // Mentor card
  mentorCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  mentorCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mentorCardIdentity: { flex: 1, minWidth: 0 },
  mentorCardName: { fontSize: 15, fontWeight: '700', color: C.text },
  mentorCardUsername: { fontSize: 12, color: C.muted, marginTop: 1 },
  mentorCardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  mentorCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  mentorCardSubline: { flex: 1, fontSize: 12.5, color: C.subtext },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Connect pills
  connectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    minHeight: 30,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  connectPillDefault: { borderColor: C.primary },
  connectPillDefaultText: { fontSize: 12, fontWeight: '700', color: C.primary },
  connectPillPending: { backgroundColor: C.amberSoft, borderColor: C.amberBorder },
  connectPillPendingText: { fontSize: 12, fontWeight: '700', color: C.amber },
  connectPillConnected: { backgroundColor: C.greenSoft, borderColor: C.greenBorder },
  connectPillConnectedText: { fontSize: 12, fontWeight: '700', color: C.green },
  connectPillRemove: { backgroundColor: C.coralSoft, borderColor: C.coralBorder },
  connectPillRemoveText: { fontSize: 12, fontWeight: '700', color: C.coral },
  connectPillPlaceholder: { width: 72, height: 30, justifyContent: 'center', alignItems: 'center' },

  // Follow pill
  followPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: C.primaryBorder,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 0,
  },
  followingPill: { backgroundColor: C.purpleSoft, borderColor: C.purpleBorder },
  followPillText: { fontSize: 11, fontWeight: '700', color: C.primary },
  followingPillText: { color: C.purple },

  // Skill chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.divider,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    maxWidth: 130,
  },
  chipPrimary: { backgroundColor: C.primarySoft },
  chipText: { fontSize: 11, fontWeight: '600', color: C.subtext },

  // Empty state
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, paddingBottom: 40 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6, textAlign: 'center' },
  emptyMsg: { fontSize: 13.5, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  emptyBtn: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },

  // Search modal
  searchModalSafe: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  searchModalSheet: {
    flex: 1,
    backgroundColor: C.card,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: C.text },
  searchCancelBtn: { paddingHorizontal: 4 },
  searchCancelText: { fontSize: 14, fontWeight: '600', color: C.primary },
  searchHint: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 80 },
  searchHintIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  searchHintTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  searchHintSub: { fontSize: 13.5, color: C.muted, textAlign: 'center', paddingHorizontal: 32 },

  // Filter popup
  modalOverlayLight: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  filterPopup: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  filterPopupItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10 },
  filterPopupItemActive: { backgroundColor: C.primarySoft },
  filterPopupText: { fontSize: 15, color: C.text },
  filterPopupTextActive: { color: C.primary, fontWeight: '700' },
});