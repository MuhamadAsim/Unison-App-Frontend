import { useFocusEffect } from '@react-navigation/native'; // add this
import { useCallback, useContext, useState } from 'react';
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api, { getMentors, getNotifications, getOpportunities } from '../services/api';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
    primary: '#534AB7',
    primarySoft: '#EEEDFE',
    bg: '#F4F4F8',
    card: '#FFFFFF',
    text: '#1A1A2E',
    muted: '#6B7280',
    border: '#E8E8F0',
    green: '#10B981', greenSoft: '#D1FAE5',
    blue: '#2563EB', blueSoft: '#DBEAFE',
    amber: '#D97706', amberSoft: '#FEF3C7',
    coral: '#DC2626', coralSoft: '#FEE2E2',
    teal: '#0D9488', tealSoft: '#CCFBF1',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const typeLabel = (type = '') => {
    const map = {
        internship: { label: 'Internship', color: C.green, bg: C.greenSoft },
        job: { label: 'Job', color: C.blue, bg: C.blueSoft },
        'full-time': { label: 'Full-time', color: C.blue, bg: C.blueSoft },
        'part-time': { label: 'Part-time', color: C.amber, bg: C.amberSoft },
    };
    return map[type?.toLowerCase()] || { label: type || 'Other', color: C.muted, bg: C.border };
};

const notifIcon = (type = '') =>
    ({ connection_request: '🤝', opportunity: '💼', message: '✉️' }[type] ?? '🔔');

// ─── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title, onSeeAll }) {
    return (
        <View style={ss.sectionHeader}>
            <Text style={ss.sectionTitle}>{title}</Text>
            {onSeeAll && (
                <TouchableOpacity onPress={onSeeAll}>
                    <Text style={ss.seeAll}>See all</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function SkeletonBox({ width, height, radius = 8, style }) {
    return (
        <View style={[{ width, height, backgroundColor: C.border, borderRadius: radius }, style]} />
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentHomeScreen({ navigation }) {
    const { userData, logout } = useContext(AuthContext);

    const [profile, setProfile] = useState(null);
    const [mentors, setMentors] = useState([]);
    const [opps, setOpps] = useState([]);
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [profileRes, mentorsRes, oppsRes, notifsRes] = await Promise.allSettled([
                api.get('/student/me'),
                getMentors(),
                getOpportunities({ limit: 5, page: 1 }),
                getNotifications(),
            ]);
            if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
            if (mentorsRes.status === 'fulfilled') setMentors(mentorsRes.value.data ?? []);
            if (oppsRes.status === 'fulfilled') setOpps(oppsRes.value.data?.data ?? []);
            if (notifsRes.status === 'fulfilled') setNotifs(notifsRes.value.data ?? []);
        } catch (e) {
            console.log('StudentHome fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchAll();
        }, [fetchAll])
    );
    const onRefresh = () => { setRefreshing(true); fetchAll(); };

    const displayName = profile?.display_name || userData?.display_name || userData?.name || 'Student';
    const skillCount = profile?.detailed_skills?.length ?? profile?.skills?.length ?? 0;
    const unreadCount = notifs.filter(n => !n.is_read).length;

    return (
        <ScrollView
            style={s.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
            }
        >
            {/* ── Top bar ──────────────────────────────────────────────────────── */}
            <View style={s.topBar}>
                <View>
                    <Text style={s.greeting}>Good morning 👋</Text>
                    <Text style={s.displayName}>{displayName}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                        style={s.notifBtn}
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        <Text style={{ fontSize: 22 }}>🔔</Text>
                        {unreadCount > 0 && (
                            <View style={s.unreadBadge}>
                                <Text style={s.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('StudentProfile')}>
                        {profile?.profile_picture ? (
                            <Image
                                source={{ uri: profile.profile_picture }}
                                style={s.avatarSmall}
                            />
                        ) : (
                            <View style={s.avatarSmall}>
                                <Text style={s.avatarSmallText}>{initials(displayName)}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={s.body}>
                {/* ── Hero card ────────────────────────────────────────────────── */}
                <View style={s.heroCard}>
                    <View style={s.heroTop}>
                        {profile?.profile_picture ? (
                            <Image
                                source={{ uri: profile.profile_picture }}
                                style={[s.avatarLarge, { borderRadius: 28 }]}
                            />
                        ) : (
                            <View style={s.avatarLarge}>
                                <Text style={s.avatarLargeText}>{initials(displayName)}</Text>
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={s.heroName}>{displayName}</Text>
                            <Text style={s.heroSub} numberOfLines={1}>
                                {profile?.degree || userData?.degree || 'Student'}
                            </Text>
                            <Text style={s.heroBatch}>
                                {profile?.batch || userData?.batch || ''}
                                {(profile?.semester || userData?.semester)
                                    ? `  ·  Sem ${profile?.semester ?? userData?.semester}` : ''}
                                {(profile?.roll_number || userData?.roll_number)
                                    ? `  ·  ${profile?.roll_number ?? userData?.roll_number}` : ''}
                            </Text>
                        </View>
                    </View>

                    <View style={s.statsRow}>
                        <View style={s.statItem}>
                            <Text style={s.statNum}>{skillCount}</Text>
                            <Text style={s.statLabel}>Skills</Text>
                        </View>
                        <View style={s.statDivider} />
                        <View style={s.statItem}>
                            <Text style={s.statNum}>{mentors.length}</Text>
                            <Text style={s.statLabel}>Mentors</Text>
                        </View>
                        <View style={s.statDivider} />
                        <View style={s.statItem}>
                            <Text style={s.statNum}>{opps.length}</Text>
                            <Text style={s.statLabel}>Openings</Text>
                        </View>
                    </View>
                </View>

                {/* ── Quick actions ─────────────────────────────────────────────── */}
                <View style={s.quickRow}>
                    {[
                        { icon: '🔍', label: 'Search', screen: 'Search' },
                        { icon: '💼', label: 'Jobs', screen: 'OpportunitiesList' },
                        { icon: '📊', label: 'Analytics', screen: 'NetworkAnalytics' },
                    ].map(({ icon, label, screen }) => (
                        <TouchableOpacity
                            key={screen}
                            style={s.quickBtn}
                            onPress={() => navigation.navigate(screen)}
                        >
                            <Text style={{ fontSize: 24 }}>{icon}</Text>
                            <Text style={s.quickLabel}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Suggested mentors ─────────────────────────────────────────── */}
                <View style={s.section}>
                    <SectionHeader title="Suggested Mentors" onSeeAll={() => navigation.navigate('Mentors')} />

                    {loading ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {[1, 2, 3].map(i => (
                                <View key={i} style={s.mentorCard}>
                                    <SkeletonBox width={44} height={44} radius={22} style={{ alignSelf: 'center', marginBottom: 8 }} />
                                    <SkeletonBox width={64} height={10} style={{ alignSelf: 'center', marginBottom: 6 }} />
                                    <SkeletonBox width={50} height={9} style={{ alignSelf: 'center' }} />
                                </View>
                            ))}
                        </ScrollView>
                    ) : mentors.length === 0 ? (
                        <Text style={s.emptyText}>No mentors suggested yet.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                            {mentors.map(m => (
                                <TouchableOpacity
                                    key={m.alumni_id}
                                    style={s.mentorCard}
                                    onPress={() =>
                                        navigation.navigate('AlumniPublicProfile', { alumni: m })
                                    }
                                >
                                    <View style={s.mentorAvatar}>
                                        <Text style={s.mentorAvatarText}>{initials(m.display_name)}</Text>
                                    </View>
                                    <Text style={s.mentorName} numberOfLines={1}>{m.display_name}</Text>
                                    <Text style={s.mentorCompany} numberOfLines={1}>{m.company || m.domain || '—'}</Text>
                                    {m.common_skills > 0 && (
                                        <View style={s.commonPill}>
                                            <Text style={s.commonPillText}>{m.common_skills} shared</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* ── Recent opportunities ──────────────────────────────────────── */}
                <View style={s.section}>
                    <SectionHeader
                        title="Recent Opportunities"
                        onSeeAll={() => navigation.navigate('OpportunitiesList')}
                    />

                    {loading ? (
                        [1, 2, 3].map(i => (
                            <View key={i} style={s.oppRow}>
                                <SkeletonBox width={40} height={40} radius={10} />
                                <View style={{ flex: 1, gap: 6 }}>
                                    <SkeletonBox width="70%" height={12} />
                                    <SkeletonBox width="50%" height={10} />
                                    <SkeletonBox width="30%" height={10} />
                                </View>
                            </View>
                        ))
                    ) : opps.length === 0 ? (
                        <Text style={s.emptyText}>No opportunities posted yet.</Text>
                    ) : (
                        opps.map((opp, idx) => {
                            const { label, color, bg } = typeLabel(opp.type);
                            const deadlineSoon =
                                opp.deadline &&
                                (new Date(opp.deadline) - Date.now()) / 86400000 < 3;
                            return (
                                <TouchableOpacity
                                    key={opp.id}
                                    style={[s.oppRow, idx === opps.length - 1 && { borderBottomWidth: 0 }]}
                                    onPress={() => navigation.navigate('OpportunityDetail', { id: opp.id })}
                                >
                                    <View style={[s.oppIcon, { backgroundColor: bg }]}>
                                        <Text style={{ fontSize: 18 }}>💼</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.oppTitle} numberOfLines={1}>{opp.title}</Text>
                                        <Text style={s.oppCompany} numberOfLines={1}>
                                            {opp.company}
                                            {opp.location ? ` · ${opp.location}` : ''}
                                            {opp.is_remote ? ' · Remote' : ''}
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, alignItems: 'center' }}>
                                            <View style={[s.badge, { backgroundColor: bg }]}>
                                                <Text style={[s.badgeText, { color }]}>{label}</Text>
                                            </View>
                                            {deadlineSoon && (
                                                <View style={[s.badge, { backgroundColor: C.coralSoft }]}>
                                                    <Text style={[s.badgeText, { color: C.coral }]}>Closing soon</Text>
                                                </View>
                                            )}
                                            {opp.posted_at && (
                                                <Text style={s.postedAt}>{relativeTime(opp.posted_at)}</Text>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* ── Notifications preview ─────────────────────────────────────── */}
                {(loading || notifs.length > 0) && (
                    <View style={s.section}>
                        <SectionHeader
                            title="Notifications"
                            onSeeAll={() => navigation.navigate('Notifications')}
                        />
                        {loading ? (
                            [1, 2].map(i => (
                                <View key={i} style={[s.notifRow, { marginBottom: 10 }]}>
                                    <SkeletonBox width={36} height={36} radius={18} />
                                    <View style={{ flex: 1, gap: 6 }}>
                                        <SkeletonBox width="80%" height={11} />
                                        <SkeletonBox width="30%" height={9} />
                                    </View>
                                </View>
                            ))
                        ) : (
                            notifs.slice(0, 4).map((n, idx) => (
                                <View
                                    key={n.id}
                                    style={[s.notifRow, idx === Math.min(notifs.length, 4) - 1 && { borderBottomWidth: 0 }]}
                                >
                                    <View style={[s.notifIcon, n.is_read ? s.notifIconRead : s.notifIconUnread]}>
                                        <Text style={{ fontSize: 16 }}>{notifIcon(n.type)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[s.notifMsg, !n.is_read && { fontWeight: '600', color: C.text }]}
                                            numberOfLines={2}
                                        >
                                            {n.message}
                                        </Text>
                                        <Text style={s.notifTime}>{relativeTime(n.created_at)}</Text>
                                    </View>
                                    {!n.is_read && <View style={s.unreadDot} />}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* 
                <TouchableOpacity style={s.logoutBtn} onPress={logout}>
                    <Text style={s.logoutText}>Log out</Text>
                </TouchableOpacity> */}
            </View>
        </ScrollView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
    },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: C.text },
    seeAll: { fontSize: 13, color: C.primary, fontWeight: '500' },
});

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    // top bar
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
        backgroundColor: C.card,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    greeting: { fontSize: 12, color: C.muted, fontWeight: '500', marginBottom: 2 },
    displayName: { fontSize: 20, fontWeight: '700', color: C.text },
    notifBtn: { position: 'relative', padding: 4 },
    unreadBadge: {
        position: 'absolute', top: 0, right: 0,
        backgroundColor: '#EF4444', borderRadius: 8,
        minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 3,
    },
    unreadBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
    avatarSmall: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    },
    avatarSmallText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

    // hero
    heroCard: {
        backgroundColor: C.primary, borderRadius: 16,
        padding: 18, marginBottom: 16,
    },
    heroTop: {
        flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16,
    },
    avatarLarge: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.22)',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarLargeText: { fontSize: 20, fontWeight: '700', color: '#fff' },
    heroName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
    heroBatch: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 10, padding: 12,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    statNum: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

    // quick actions
    quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickBtn: {
        flex: 1, backgroundColor: C.card, borderRadius: 12,
        paddingVertical: 14, alignItems: 'center', gap: 6,
        borderWidth: 1, borderColor: C.border,
    },
    quickLabel: { fontSize: 11, fontWeight: '600', color: C.text },

    // sections
    section: {
        backgroundColor: C.card, borderRadius: 14,
        padding: 16, marginBottom: 14,
        borderWidth: 1, borderColor: C.border,
    },

    // mentor cards
    mentorCard: {
        width: 104, marginHorizontal: 4,
        backgroundColor: C.bg, borderRadius: 12,
        padding: 12, alignItems: 'center',
        borderWidth: 1, borderColor: C.border,
    },
    mentorAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: C.primarySoft,
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    mentorAvatarText: { fontSize: 15, fontWeight: '700', color: C.primary },
    mentorName: { fontSize: 12, fontWeight: '600', color: C.text, textAlign: 'center' },
    mentorCompany: { fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 2 },
    commonPill: {
        marginTop: 6, backgroundColor: C.tealSoft,
        borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2,
    },
    commonPillText: { fontSize: 9, color: C.teal, fontWeight: '600' },

    // opportunity rows
    oppRow: {
        flexDirection: 'row', gap: 12, alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    oppIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    oppTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    oppCompany: { fontSize: 12, color: C.muted, marginTop: 2 },
    badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    postedAt: { fontSize: 10, color: C.muted },

    // notification rows
    notifRow: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    notifIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    notifIconUnread: { backgroundColor: C.primarySoft },
    notifIconRead: { backgroundColor: C.bg },
    notifMsg: { fontSize: 13, color: C.muted, lineHeight: 18 },
    notifTime: { fontSize: 11, color: C.muted, marginTop: 3 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 5 },

    emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 16 },

    logoutBtn: {
        marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
        borderWidth: 1, borderColor: '#FECACA',
    },
    logoutText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
});