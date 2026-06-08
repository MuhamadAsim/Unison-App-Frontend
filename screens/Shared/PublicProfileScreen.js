import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  connectUser,
  followUser,
  getConnectionStatus,
  getPublicProfile,
  removeConnection,
  unfollowUser,
} from '../../services/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#534AB7',
  primaryDark: '#3730A3',
  primarySoft: '#EEEDFE',
  primaryBorder: '#C7D2FE',
  bg: '#F4F4F8',
  card: '#FFFFFF',
  text: '#1A1A2E',
  subtext: '#6B7280',
  muted: '#9CA3AF',
  border: '#E8E8F0',
  divider: '#F3F4F6',
  green: '#059669', greenSoft: '#D1FAE5',
  amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  coral: '#DC2626', coralSoft: '#FEE2E2',
};

const BACKDROP_HEIGHT = 200;
const AVATAR_SIZE = 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const proficiencyMeta = (level = '') => {
  const map = {
    beginner: { color: C.amber, bg: C.amberSoft, label: 'Beginner' },
    intermediate: { color: C.blue, bg: C.blueSoft, label: 'Intermediate' },
    expert: { color: C.green, bg: C.greenSoft, label: 'Expert' },
  };
  return map[level?.toLowerCase()] ?? { color: C.muted, bg: C.border, label: level };
};

const employmentMeta = (type = '') => {
  const map = {
    'full-time': { color: C.green, bg: C.greenSoft, label: 'Full-time' },
    'part-time': { color: C.blue, bg: C.blueSoft, label: 'Part-time' },
    'freelance': { color: C.amber, bg: C.amberSoft, label: 'Freelance' },
  };
  return map[type] ?? { color: C.muted, bg: C.border, label: type };
};

const formatDateRange = (start, end, isCurrent) => {
  const fmt = d => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';
  const s = fmt(start);
  const e = isCurrent ? 'Present' : fmt(end);
  if (!s && !e) return '';
  if (!e) return s;
  return `${s} – ${e}`;
};

// ─── Primitives ───────────────────────────────────────────────────────────────
function SectionHeader({ icon, title }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionIconWrap}>
          <Ionicons name={icon} size={15} color={C.primary} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value, last, onPress }) {
  if (!value) return null;
  const inner = (
    <View style={[s.detailRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.detailIconBox}>
        <Ionicons name={icon} size={14} color={C.primary} />
      </View>
      <View style={s.detailContent}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={[s.detailValue, onPress && { color: C.primary }]} numberOfLines={1}>{value}</Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={14} color={C.primary} />}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{inner}</TouchableOpacity> : inner;
}

// ─── Online Indicator ─────────────────────────────────────────────────────────
function OnlineBadge({ isOnline, lastSeen }) {
  if (isOnline) {
    return (
      <View style={badge.online}>
        <View style={badge.dot} />
        <Text style={badge.onlineText}>Online</Text>
      </View>
    );
  }
  if (lastSeen) {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const label = days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : `${mins}m ago`;
    return (
      <View style={badge.offline}>
        <View style={badge.dotOffline} />
        <Text style={badge.offlineText}>Last seen {label}</Text>
      </View>
    );
  }
  return null;
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ profile }) {
  return (
    <View style={s.statsRow}>
      <View style={s.statBox}>
        <Text style={s.statValue}>{profile.followers_count ?? 0}</Text>
        <Text style={s.statLabel}>Followers</Text>
      </View>
      <View style={s.statsDivider} />
      <View style={s.statBox}>
        <Text style={s.statValue}>{profile.following_count ?? 0}</Text>
        <Text style={s.statLabel}>Following</Text>
      </View>
      <View style={s.statsDivider} />
      <View style={s.statBox}>
        <Text style={s.statValue}>{profile.work_experience?.length ?? 0}</Text>
        <Text style={s.statLabel}>Experience</Text>
      </View>
      <View style={s.statsDivider} />
      <View style={s.statBox}>
        <Text style={s.statValue}>{profile.skills?.length ?? 0}</Text>
        <Text style={s.statLabel}>Skills</Text>
      </View>
    </View>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ profile }) {
  const backdropUri = profile?.backDropImage || null;
  const profilePicUri = profile?.profile_picture || null;
  const displayName = profile?.display_name || 'User';

  // Derive "role at company" from first current work experience
  const currentJob = profile?.work_experience?.find(e => e.is_current);

  return (
    <View style={hero.wrapper}>
      {/* Backdrop */}
      <View style={hero.backdropContainer}>
        {backdropUri ? (
          <Image source={{ uri: backdropUri }} style={hero.backdropImage} resizeMode="cover" />
        ) : (
          <View style={hero.backdropFallback}>
            <View style={hero.blobA} />
            <View style={hero.blobB} />
          </View>
        )}
      </View>

      {/* Avatar */}
      <View style={hero.avatarRing}>
        {profilePicUri ? (
          <Image source={{ uri: profilePicUri }} style={hero.avatarImage} />
        ) : (
          <View style={hero.avatarFallback}>
            <Text style={hero.avatarText}>{initials(displayName)}</Text>
          </View>
        )}
        {/* Online dot on avatar */}
        {profile?.is_online && <View style={hero.onlineDot} />}
      </View>

      <View style={hero.infoContainer}>
        {/* Name + online status */}
        <Text style={hero.name}>{displayName}</Text>
        <Text style={hero.username}>@{profile?.username}</Text>

        {/* Online / last seen inline under username */}
        <OnlineBadge isOnline={profile?.is_online} lastSeen={profile?.last_seen} />

        {/* Current job line */}
        {currentJob && (
          <Text style={hero.jobLine}>
            {currentJob.role}
            {currentJob.company_name ? ` at ${currentJob.company_name}` : ''}
          </Text>
        )}

        {/* Degree · Batch · Grad year pills */}
        <View style={hero.pillRow}>
          {profile?.batch ? (
            <View style={hero.pill}>
              <Ionicons name="calendar-outline" size={11} color={C.primary} />
              <Text style={hero.pillText}>Batch {profile.batch}</Text>
            </View>
          ) : null}
          {profile?.graduation_year ? (
            <View style={hero.pill}>
              <Ionicons name="ribbon-outline" size={11} color={C.primary} />
              <Text style={hero.pillText}>Class of {profile.graduation_year}</Text>
            </View>
          ) : null}
          {profile?.degree ? (
            <View style={[hero.pill, { flexShrink: 1 }]}>
              <Ionicons name="school-outline" size={11} color={C.primary} />
              <Text style={hero.pillText} numberOfLines={1}>{profile.degree}</Text>
            </View>
          ) : null}
          {/* Role tag — alumni vs student */}
          {profile?.role ? (
            <View style={hero.rolePill}>
              <Text style={hero.rolePillText}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {profile?.bio ? <Text style={hero.bio}>{profile.bio}</Text> : null}
      </View>
    </View>
  );
}

// ─── Action Buttons Row ───────────────────────────────────────────────────────
// Shows Connect/Pending/Remove + Follow/Unfollow + Message
// ─── Action Buttons Row ───────────────────────────────────────────────────────
function ActionBar({
  connStatus, isSender, isFollowing,
  connLoading, followLoading, actionLoading,
  onConnect, onCancel, onDisconnect,
  onFollow, onUnfollow,
  onMessage,
}) {
  // Separate loading states for each button
  const isConnLoading = connLoading || actionLoading;
  const isFollowLoading = followLoading;

  // ── Connect / Connected / Pending button ──────────────────────────────────
  let connBtn = null;
  if (isConnLoading) {
    connBtn = (
      <View style={[ab.btn, ab.btnPrimary, { flex: 1 }]}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  } else if (connStatus === 'connected') {
    connBtn = (
      <TouchableOpacity style={[ab.btn, ab.btnOutlineCoral, { flex: 1 }]} onPress={onDisconnect} activeOpacity={0.8}>
        <Ionicons name="person-remove-outline" size={15} color={C.coral} />
        <Text style={[ab.btnText, { color: C.coral }]}>Connected</Text>
      </TouchableOpacity>
    );
  } else if (connStatus === 'pending' && isSender) {
    connBtn = (
      <TouchableOpacity style={[ab.btn, ab.btnOutlineAmber, { flex: 1 }]} onPress={onCancel} activeOpacity={0.8}>
        <Ionicons name="time-outline" size={15} color={C.amber} />
        <Text style={[ab.btnText, { color: C.amber }]}>Pending</Text>
      </TouchableOpacity>
    );
  } else if (connStatus === 'pending' && !isSender) {
    connBtn = (
      <View style={[ab.btn, ab.btnOutlineAmber, { flex: 1 }]}>
        <Ionicons name="mail-outline" size={15} color={C.amber} />
        <Text style={[ab.btnText, { color: C.amber }]}>Req. Received</Text>
      </View>
    );
  } else {
    connBtn = (
      <TouchableOpacity style={[ab.btn, ab.btnPrimary, { flex: 1 }]} onPress={onConnect} activeOpacity={0.8}>
        <Ionicons name="person-add-outline" size={15} color="#fff" />
        <Text style={[ab.btnText, { color: '#fff' }]}>Connect</Text>
      </TouchableOpacity>
    );
  }

  // ── Follow / Unfollow button ───────────────────────────────────────────────
  let followBtn = null;
  if (isFollowLoading) {
    followBtn = (
      <View style={[ab.btn, ab.btnSoft, { flex: 1 }]}>
        <ActivityIndicator size="small" color={C.primary} />
      </View>
    );
  } else if (isFollowing) {
    followBtn = (
      <TouchableOpacity style={[ab.btn, ab.btnOutline, { flex: 1 }]} onPress={onUnfollow} activeOpacity={0.8}>
        <Ionicons name="checkmark" size={15} color={C.primary} />
        <Text style={[ab.btnText, { color: C.primary }]}>Following</Text>
      </TouchableOpacity>
    );
  } else {
    followBtn = (
      <TouchableOpacity style={[ab.btn, ab.btnSoft, { flex: 1 }]} onPress={onFollow} activeOpacity={0.8}>
        <Ionicons name="add" size={15} color={C.primary} />
        <Text style={[ab.btnText, { color: C.primary }]}>Follow</Text>
      </TouchableOpacity>
    );
  }

  // ── Message icon button ────────────────────────────────────────────────────
  const msgBtn = (
    <TouchableOpacity style={ab.iconBtn} onPress={onMessage} activeOpacity={0.8}>
      <Ionicons name="chatbubble-outline" size={18} color={C.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={ab.row}>
      {connBtn}
      {followBtn}
      {msgBtn}
    </View>
  );
}
// ─── Work Experience Card ─────────────────────────────────────────────────────
function WorkExpCard({ exp }) {
  const meta = employmentMeta(exp.employment_type);
  const dateRange = formatDateRange(exp.start_date, exp.end_date, exp.is_current);
  return (
    <View style={s.workCard}>
      <View style={s.workAccent} />
      <View style={{ flex: 1 }}>
        <View style={s.workTop}>
          <Text style={s.workRole} numberOfLines={1}>{exp.role}</Text>
          <View style={[s.typeBadge, { backgroundColor: meta.bg }]}>
            <Text style={[s.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <View style={s.workCompanyRow}>
          <Ionicons name="business-outline" size={12} color={C.muted} />
          <Text style={s.workCompany}>{exp.company_name}</Text>
          {exp.is_current && (
            <View style={s.currentBadge}>
              <View style={s.currentDot} />
              <Text style={s.currentText}>Current</Text>
            </View>
          )}
        </View>
        {dateRange ? (
          <View style={s.workDateRow}>
            <Ionicons name="calendar-outline" size={11} color={C.muted} />
            <Text style={s.workDate}>{dateRange}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Skill Card ───────────────────────────────────────────────────────────────
function SkillCard({ skill }) {
  const meta = proficiencyMeta(skill.proficiency || skill.proficiency_level);
  const name = skill.name || skill.skill_name;
  return (
    <View style={s.skillCard}>
      {skill.category && (
        <View style={s.skillCatBadge}>
          <Text style={s.skillCatText}>{skill.category}</Text>
        </View>
      )}
      <Text style={s.skillName}>{name}</Text>
      {(skill.proficiency || skill.proficiency_level) && (
        <View style={[s.profBadge, { backgroundColor: meta.bg }]}>
          <View style={[s.profDot, { backgroundColor: meta.color }]} />
          <Text style={[s.profText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OppCard({ opp, onPress }) {
  const deadline = opp.deadline
    ? new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const isJob = opp.type === 'job';
  return (
    <TouchableOpacity style={s.oppCard} onPress={onPress} activeOpacity={0.8}>
      <View style={s.oppTop}>
        <Text style={s.oppTitle} numberOfLines={1}>{opp.title}</Text>
        <View style={[s.oppBadge, { backgroundColor: isJob ? C.greenSoft : C.blueSoft }]}>
          <Text style={[s.oppBadgeText, { color: isJob ? C.green : C.blue }]}>
            {isJob ? 'Job' : 'Internship'}
          </Text>
        </View>
      </View>
      {opp.company ? <Text style={s.oppCompany}>{opp.company}</Text> : null}
      {deadline ? (
        <View style={s.oppDeadlineRow}>
          <Ionicons name="time-outline" size={11} color={C.muted} />
          <Text style={s.oppDeadline}>Deadline: {deadline}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Education Card ───────────────────────────────────────────────────────────
function EducationCard({ edu }) {
  const dateRange = formatDateRange(edu.start_date, edu.end_date, edu.is_current);
  return (
    <View style={s.eduCard}>
      <View style={s.eduAccent} />
      <View style={{ flex: 1 }}>
        <View style={s.eduTop}>
          <Text style={s.eduDegree} numberOfLines={2}>{edu.degree}</Text>
          {edu.is_current && (
            <View style={s.currentBadge}>
              <View style={s.currentDot} />
              <Text style={s.currentText}>Current</Text>
            </View>
          )}
        </View>
        <View style={s.eduUnivRow}>
          <Ionicons name="school-outline" size={12} color={C.primary} />
          <Text style={s.eduUniv}>{edu.university}</Text>
        </View>
        {edu.field_of_study ? <Text style={s.eduField}>{edu.field_of_study}</Text> : null}
        {dateRange ? (
          <View style={s.workDateRow}>
            <Ionicons name="calendar-outline" size={11} color={C.muted} />
            <Text style={s.workDate}>{dateRange}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PublicProfileScreen({ route, navigation }) {
  // Support multiple param shapes — from connections list, search results, followers modal etc.
  const targetId =
    route.params?.userId ||
    route.params?.alumni?.id ||
    route.params?.alumni?.alumni_id ||
    route.params?.student?.id ||
    route.params?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connStatus, setConnStatus] = useState(null);
  const [isSender, setIsSender] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [connLoading, setConnLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch profile (without connection status) ─────────────────────────────
  const fetchProfile = async () => {
    if (!targetId) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await getPublicProfile(targetId);
      const data = res.data;
      setProfile(data);
      // Don't set connection status from profile - we'll get it separately
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch connection status (source of truth) ────────────────────────────
  const fetchConnStatus = async () => {
    if (!targetId) return;
    try {
      setConnLoading(true);
      const res = await getConnectionStatus(targetId);
      const statusData = res.data;

      console.log('Status from dedicated endpoint:', statusData);

      setConnStatus(statusData?.status ?? null);
      setIsSender(statusData?.is_sender ?? false);
    } catch (err) {
      console.error('Failed to fetch connection status:', err);
      // Fallback to none
      setConnStatus(null);
      setIsSender(false);
    } finally {
      setConnLoading(false);
    }
  };

  // Also fetch follow status separately if needed
  const fetchFollowStatus = async () => {
    if (!targetId) return;
    try {
      const res = await getConnectionStatus(targetId); // Or a dedicated follow endpoint
      setIsFollowing(res.data?.is_following ?? false);
    } catch (err) {
      console.error('Failed to fetch follow status:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchConnStatus();
    }, [targetId])
  );

  // ── Connection actions ─────────────────────────────────────────────────────
  const handleConnect = async () => {
    setActionLoading(true);
    try {
      await connectUser(targetId, { connection_type: 'mentor' });
      setConnStatus('pending');
      setIsSender(true);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Withdraw your connection request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await removeConnection(targetId);
            setConnStatus(null);
            setIsSender(false);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to cancel.');
          } finally {
            setActionLoading(false);
          }
        }
      },
    ]);
  };

  const handleDisconnect = () => {
    Alert.alert('Remove Connection', `Remove ${profile?.display_name} from your connections?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await removeConnection(targetId);
            setConnStatus(null);
            setIsSender(false);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to remove.');
          } finally {
            setActionLoading(false);
          }
        }
      },
    ]);
  };

  // ── Follow actions ─────────────────────────────────────────────────────────
  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      await followUser(targetId);
      setIsFollowing(true);
      setProfile(prev => prev ? {
        ...prev,
        followers_count: (prev.followers_count ?? 0) + 1,
      } : prev);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to follow.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      await unfollowUser(targetId);
      setIsFollowing(false);
      setProfile(prev => prev ? {
        ...prev,
        followers_count: Math.max(0, (prev.followers_count ?? 1) - 1),
      } : prev);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to unfollow.');
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Message ────────────────────────────────────────────────────────────────
  const handleMessage = () => {
    navigation.navigate('ChatDetail', {
      participantId: targetId,
      participantName: profile?.display_name || profile?.username,
      participantPicture: profile?.profile_picture || null,
      participantUsername: profile?.username,
    });
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.center}>
        <Ionicons name="person-circle-outline" size={52} color={C.muted} />
        <Text style={s.emptyTitle}>Profile not found</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchProfile}>
          <Ionicons name="refresh-outline" size={16} color={C.primary} />
          <Text style={s.retryText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const workExps = profile.work_experience ?? [];
  const skills = profile.skills ?? [];
  const education = profile.education ?? [];
  const opps = profile.opportunities_posted ?? [];

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Floating Back Button ── */}
      <TouchableOpacity
        style={s.floatingBackButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <HeroSection profile={profile} />

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <StatsRow profile={profile} />

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <ActionBar
            connStatus={connStatus}
            isSender={isSender}
            isFollowing={isFollowing}
            connLoading={connLoading}
            followLoading={followLoading}
            actionLoading={actionLoading}
            onConnect={handleConnect}
            onCancel={handleCancel}
            onDisconnect={handleDisconnect}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            onMessage={handleMessage}
          />
        </View>

        {/* ── About card ──────────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="person-outline" title="About" />
          <DetailRow icon="mail-outline" label="Email" value={profile.email} />
          <DetailRow icon="call-outline" label="Phone" value={profile.phone} />
          <DetailRow icon="school-outline" label="Degree" value={profile.degree} />
          <DetailRow icon="calendar-outline" label="Batch" value={profile.batch} />
          <DetailRow icon="ribbon-outline" label="Graduation Year" value={profile.graduation_year ? String(profile.graduation_year) : null} />
          <DetailRow
            icon="logo-linkedin"
            label="LinkedIn"
            value={profile.linkedin_url}
            last
            onPress={profile.linkedin_url ? () => Linking.openURL(profile.linkedin_url) : undefined}
          />
        </View>

        {/* ── Work Experience ──────────────────────────────────────────────── */}
        {workExps.length > 0 && (
          <View style={s.card}>
            <SectionHeader icon="briefcase-outline" title={`Work Experience (${workExps.length})`} />
            {workExps.map((exp, i) => (
              <WorkExpCard key={exp.id ?? i} exp={exp} />
            ))}
          </View>
        )}

        {/* ── Education ───────────────────────────────────────────────────── */}
        {education.length > 0 && (
          <View style={s.card}>
            <SectionHeader icon="school-outline" title={`Education (${education.length})`} />
            {education.map((edu, i) => (
              <EducationCard key={edu.id ?? i} edu={edu} />
            ))}
          </View>
        )}

        {/* ── Skills ──────────────────────────────────────────────────────── */}
        {skills.length > 0 && (
          <View style={s.card}>
            <SectionHeader icon="code-slash-outline" title={`Skills (${skills.length})`} />
            <View style={s.skillGrid}>
              {skills.map((skill, i) => (
                <SkillCard key={skill.id ?? i} skill={skill} />
              ))}
            </View>
          </View>
        )}

        {/* ── Opportunities Posted ─────────────────────────────────────────── */}
        {opps.length > 0 && (
          <View style={s.card}>
            <SectionHeader icon="megaphone-outline" title={`Opportunities (${opps.length})`} />
            {opps.map((opp, i) => (
              <OppCard
                key={opp.id ?? i}
                opp={opp}
                onPress={() => navigation.navigate('OpportunityDetail', { id: opp.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const hero = StyleSheet.create({
  wrapper: { backgroundColor: C.card, marginBottom: 4 },
  backdropContainer: { height: BACKDROP_HEIGHT, overflow: 'hidden' },
  backdropImage: { width: '100%', height: '100%' },
  backdropFallback: { flex: 1, backgroundColor: C.primarySoft, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#C7D2FE', top: -70, right: -50, opacity: 0.7 },
  blobB: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: '#EDE9FE', bottom: -40, left: -20, opacity: 0.6 },
  avatarRing: {
    width: AVATAR_SIZE + 6, height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    borderWidth: 3, borderColor: C.card, backgroundColor: C.card,
    alignSelf: 'center', marginTop: -(AVATAR_SIZE / 2 + 3), zIndex: 2,
    overflow: 'hidden', position: 'relative',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: (AVATAR_SIZE + 6) / 2 },
  avatarFallback: { flex: 1, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  // Green dot on avatar corner
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.green,
    borderWidth: 2, borderColor: C.card,
    zIndex: 3,
  },
  infoContainer: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20 },
  name: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  username: { fontSize: 13, color: C.muted, marginTop: 3, marginBottom: 6 },
  jobLine: { fontSize: 14, color: C.primary, fontWeight: '600', marginBottom: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.primaryBorder },
  pillText: { fontSize: 12, fontWeight: '600', color: C.primary },
  rolePill: { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  rolePillText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  bio: { fontSize: 13, color: C.subtext, textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 280, fontStyle: 'italic' },
});

// Online badge styles
const badge = StyleSheet.create({
  online: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.greenSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  onlineText: { fontSize: 12, fontWeight: '700', color: C.green },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.divider, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  dotOffline: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.muted },
  offlineText: { fontSize: 12, fontWeight: '500', color: C.muted },
});

// Action bar styles
const ab = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 24, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1.5 },
  btnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  btnSoft: { backgroundColor: C.primarySoft, borderColor: C.primaryBorder },
  btnOutline: { backgroundColor: C.card, borderColor: C.primary },
  btnOutlineCoral: { backgroundColor: C.coralSoft, borderColor: C.coral },
  btnOutlineAmber: { backgroundColor: C.amberSoft, borderColor: C.amber },
  btnText: { fontSize: 13, fontWeight: '700' },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primarySoft,
    borderWidth: 1.5, borderColor: C.primaryBorder,
    justifyContent: 'center', alignItems: 'center',
  },
});

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 10, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: C.muted, marginTop: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.primary, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10, marginTop: 6 },
  retryText: { color: C.primary, fontWeight: '600', fontSize: 14 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBtn: { width: 40, padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text, flex: 1, textAlign: 'center' },

  // Stats row
  statsRow: { flexDirection: 'row', backgroundColor: C.card, marginHorizontal: 16, marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingVertical: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: C.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2, fontWeight: '500' },
  statsDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  // Cards
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginHorizontal: 16, marginTop: 12, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.divider },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text },

  // Detail row
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.divider },
  detailIconBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  detailValue: { fontSize: 14, color: C.text, fontWeight: '500' },

  // Work experience card
  workCard: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10, flexDirection: 'row', overflow: 'hidden' },
  workAccent: { width: 4, borderRadius: 2, backgroundColor: C.primary, marginRight: 12, alignSelf: 'stretch' },
  workTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  workRole: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  workCompanyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  workCompany: { fontSize: 13, color: C.subtext, flex: 1 },
  workDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  workDate: { fontSize: 11, color: C.muted },
  typeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.greenSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  currentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  currentText: { fontSize: 10, fontWeight: '700', color: C.green },

  // Education card
  eduCard: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10, flexDirection: 'row', overflow: 'hidden' },
  eduAccent: { width: 4, borderRadius: 2, backgroundColor: C.blue, marginRight: 12, alignSelf: 'stretch' },
  eduTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  eduDegree: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  eduUnivRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  eduUniv: { fontSize: 13, color: C.subtext, flex: 1 },
  eduField: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginBottom: 4 },

  // Skill grid
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 4 },
  skillCard: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, minWidth: '45%', flex: 1, maxWidth: '50%' },
  skillCatBadge: { alignSelf: 'flex-start', backgroundColor: C.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  skillCatText: { fontSize: 9, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  skillName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
  profBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  profDot: { width: 6, height: 6, borderRadius: 3 },
  profText: { fontSize: 10, fontWeight: '700' },

  // Opportunity card
  oppCard: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  oppTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  oppTitle: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  oppBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  oppBadgeText: { fontSize: 10, fontWeight: '700' },
  oppCompany: { fontSize: 12, color: C.subtext, marginBottom: 4 },
  oppDeadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  oppDeadline: { fontSize: 11, color: C.muted },
  floatingBackButton: {
    position: 'absolute',
    top: 60, // Adjust based on your status bar + safe area
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.71)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(10px)', // For iOS blur effect (optional)
    shadowColor: '#000000bd',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});