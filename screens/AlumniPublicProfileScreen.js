import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { connectUser, getConnectionStatus, removeConnection } from '../services/api';

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
  green: '#059669', greenSoft: '#D1FAE5',
  amber: '#D97706', amberSoft: '#FEF3C7',
  coral: '#DC2626', coralSoft: '#FEE2E2',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const avatarColor = (name = '') => {
  const colors = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name = '', uri, size = 80 }) {
  const color = avatarColor(name);
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.border }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: '#fff' }}>
        {initials(name)}
      </Text>
    </View>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }) {
  return (
    <View style={s.card}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconWrap}>
          <Ionicons name={icon} size={15} color={C.primary} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.sectionDivider} />
      {children}
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, last }) {
  if (!value) return null;
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon} size={14} color={C.primary} />
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Connection Button ────────────────────────────────────────────────────────
function ConnectionButton({ status, isSender, loading, onConnect, onCancel, onDisconnect }) {
  if (loading) {
    return (
      <View style={s.connBtnBase}>
        <ActivityIndicator size="small" color={C.primary} />
      </View>
    );
  }

  if (status === 'connected') {
    return (
      <TouchableOpacity
        style={[s.connBtnBase, s.connBtnConnected]}
        onPress={onDisconnect}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark-circle" size={16} color={C.green} />
        <Text style={[s.connBtnText, { color: C.green }]}>Connected · Remove</Text>
      </TouchableOpacity>
    );
  }

  if (status === 'pending') {
    // Only the sender can cancel; receivers see a static label
    if (isSender) {
      return (
        <TouchableOpacity
          style={[s.connBtnBase, s.connBtnPending]}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={16} color={C.amber} />
          <Text style={[s.connBtnText, { color: C.amber }]}>Pending · Cancel</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={[s.connBtnBase, s.connBtnPending]}>
        <Ionicons name="time-outline" size={16} color={C.amber} />
        <Text style={[s.connBtnText, { color: C.amber }]}>Request Received</Text>
      </View>
    );
  }

  // No connection
  return (
    <TouchableOpacity
      style={[s.connBtnBase, s.connBtnDefault]}
      onPress={onConnect}
      activeOpacity={0.8}
    >
      <Ionicons name="person-add-outline" size={16} color="#fff" />
      <Text style={[s.connBtnText, { color: '#fff' }]}>Connect</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AlumniPublicProfileScreen({ route, navigation }) {
  const alumni = route.params?.alumni || {};

  const alumniId = alumni.alumni_id || alumni.id;
  const name     = alumni.display_name || alumni.name || 'Alumni';
  const username = alumni.username;
  const company  = alumni.company;
  const role     = alumni.role || alumni.domain;
  const picture  = alumni.profile_picture;
  const skills   = alumni.skills || [];
  const bio      = alumni.bio;
  const batch    = alumni.batch_year || alumni.batch;
  const degree   = alumni.degree;
  const linkedin = alumni.linkedin_url;
  const email    = alumni.email;

  // ── Connection state ───────────────────────────────────────────────────────
  const [connStatus, setConnStatus] = useState(null);   // 'connected' | 'pending' | null
  const [isSender, setIsSender]     = useState(false);
  const [connLoading, setConnLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!alumniId) { setConnLoading(false); return; }
    getConnectionStatus(alumniId)
      .then(res => {
        setConnStatus(res.data?.status ?? null);
        setIsSender(res.data?.is_sender ?? false);
      })
      .catch(() => setConnStatus(null))
      .finally(() => setConnLoading(false));
  }, [alumniId]);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      await connectUser(alumniId, { connection_type: 'mentor' });
      setConnStatus('pending');
      setIsSender(true);
      Alert.alert('Request Sent', 'Your connection request has been sent.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Cancel your connection request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await removeConnection(alumniId);
            setConnStatus(null);
            setIsSender(false);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to cancel request.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDisconnect = () => {
    Alert.alert('Remove Connection', `Remove ${name} from your connections?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await removeConnection(alumniId);
            setConnStatus(null);
            setIsSender(false);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to remove connection.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <View style={s.heroCard}>
          <View style={s.blobA} />
          <View style={s.blobB} />

          <View style={s.avatarRing}>
            <Avatar name={name} uri={picture} size={76} />
          </View>

          <Text style={s.heroName}>{name}</Text>

          {username && <Text style={s.heroUsername}>@{username}</Text>}

          {(role || company) && (
            <View style={s.roleRow}>
              {role && <Text style={s.roleText}>{role}</Text>}
              {role && company && <Text style={s.roleSep}>·</Text>}
              {company && (
                <View style={s.companyRow}>
                  <Ionicons name="business-outline" size={13} color={C.subtext} />
                  <Text style={s.companyText}>{company}</Text>
                </View>
              )}
            </View>
          )}

          <View style={s.pillRow}>
            {batch && (
              <View style={s.pill}>
                <Ionicons name="calendar-outline" size={11} color={C.primary} />
                <Text style={s.pillText}>Batch {batch}</Text>
              </View>
            )}
            {degree && (
              <View style={[s.pill, { flexShrink: 1 }]}>
                <Ionicons name="school-outline" size={11} color={C.primary} />
                <Text style={s.pillText} numberOfLines={1}>{degree}</Text>
              </View>
            )}
            {alumni.common_skills > 0 && (
              <View style={[s.pill, { backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }]}>
                <Ionicons name="code-slash-outline" size={11} color="#0D9488" />
                <Text style={[s.pillText, { color: '#0D9488' }]}>
                  {alumni.common_skills} common skill{alumni.common_skills !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {bio && <Text style={s.heroBio}>{bio}</Text>}

          {/* ── Connection button ──────────────────────────────────────── */}
          {alumniId && (
            <View style={{ marginTop: 16, width: '100%' }}>
              <ConnectionButton
                status={connStatus}
                isSender={isSender}
                loading={connLoading || actionLoading}
                onConnect={handleConnect}
                onCancel={handleCancel}
                onDisconnect={handleDisconnect}
              />
            </View>
          )}
        </View>

        {/* ── About ─────────────────────────────────────────────────────── */}
        {(company || role || email || batch || degree) && (
          <SectionCard icon="person-outline" title="About">
            <InfoRow icon="briefcase-outline"  label="Role"    value={role} />
            <InfoRow icon="business-outline"   label="Company" value={company} />
            <InfoRow icon="mail-outline"       label="Email"   value={email} />
            <InfoRow icon="school-outline"     label="Degree"  value={degree} />
            <InfoRow icon="calendar-outline"   label="Batch"   value={batch} last />
          </SectionCard>
        )}

        {/* ── Skills ────────────────────────────────────────────────────── */}
        {skills.length > 0 && (
          <SectionCard icon="code-slash-outline" title={`Skills (${skills.length})`}>
            <View style={s.skillsWrap}>
              {skills.map((skill, i) => (
                <View key={i} style={s.skillChip}>
                  <Text style={s.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* ── LinkedIn ──────────────────────────────────────────────────── */}
        {linkedin && (
          <SectionCard icon="link-outline" title="Links">
            <View style={s.linkedInRow}>
              <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
              <Text style={s.linkedInText}>{linkedin}</Text>
            </View>
          </SectionCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
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
  headerBtn: { padding: 8, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // ── Hero ──
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: C.primarySoft, opacity: 0.6,
  },
  blobB: {
    position: 'absolute', bottom: -30, left: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#EDE9FE', opacity: 0.5,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: C.primaryBorder,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, backgroundColor: C.card,
  },
  heroName: {
    fontSize: 22, fontWeight: '800', color: C.text,
    textAlign: 'center', letterSpacing: -0.3,
  },
  heroUsername: {
    fontSize: 13, color: C.muted, fontWeight: '500',
    marginTop: 3, marginBottom: 10,
  },
  roleRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, flexWrap: 'wrap', justifyContent: 'center',
    marginBottom: 14,
  },
  roleText:    { fontSize: 14, fontWeight: '600', color: C.subtext },
  roleSep:     { fontSize: 14, color: C.muted },
  companyRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  companyText: { fontSize: 14, color: C.muted, fontWeight: '500' },

  pillRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, justifyContent: 'center', marginBottom: 12,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primarySoft,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.primaryBorder,
  },
  pillText: { fontSize: 12, fontWeight: '600', color: C.primary },

  heroBio: {
    fontSize: 13, color: C.subtext, textAlign: 'center',
    lineHeight: 20, fontStyle: 'italic', maxWidth: 280,
  },

  // ── Connection button ──
  connBtnBase: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 24, paddingVertical: 12,
    paddingHorizontal: 24, borderWidth: 1.5,
    borderColor: 'transparent', width: '100%',
    minHeight: 46,
  },
  connBtnDefault:   { backgroundColor: C.primary, borderColor: C.primary },
  connBtnConnected: { backgroundColor: C.greenSoft, borderColor: C.green },
  connBtnPending:   { backgroundColor: C.amberSoft, borderColor: C.amber },
  connBtnText: { fontSize: 14, fontWeight: '700' },

  // ── Section card ──
  card: {
    backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  sectionDivider: { height: 1, backgroundColor: C.divider, marginBottom: 12 },

  // ── Info rows ──
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  infoIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 10, fontWeight: '600', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1,
  },
  infoValue: { fontSize: 14, color: C.text, fontWeight: '500' },

  // ── Skills ──
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6 },
  skillChip: {
    backgroundColor: C.primarySoft,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: C.primaryBorder,
  },
  skillChipText: { fontSize: 12, fontWeight: '600', color: C.primary },

  // ── LinkedIn ──
  linkedInRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 6 },
  linkedInText: { fontSize: 13, color: '#0A66C2', fontWeight: '500', flex: 1 },
});