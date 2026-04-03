import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOpportunityById } from '../services/api';

// ─── Design Tokens (matches app) ─────────────────────────────────────────────
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
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={C.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionDivider} />
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OpportunityDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      Linking.openURL(data.apply_link).catch(() => Alert.alert('Error', 'Invalid link'));
    } else {
      Alert.alert('Notice', 'No external application link provided.');
    }
  };

  // ─── Type badge colour ──────────────────────────────────────────────────────
  const getTypeBadge = (type) => {
    if (!type) return { bg: C.primarySoft, text: C.primary };
    const t = type.toLowerCase();
    if (t === 'internship') return { bg: C.amberSoft, text: C.amber };
    if (t === 'job') return { bg: C.greenSoft, text: C.green };
    return { bg: C.primarySoft, text: C.primary };
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Opportunity</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={C.muted} />
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeBadge = getTypeBadge(data.type);
  const deadline = data.deadline ? data.deadline.substring(0, 10) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Opportunity</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          {/* Company Avatar */}
          <View style={styles.companyAvatar}>
            <Text style={styles.companyAvatarText}>
              {(data.company_name || 'O').charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.heroTitle}>{data.title}</Text>
          <Text style={styles.heroCompany}>{data.company_name}</Text>

          {/* Badges Row */}
          <View style={styles.badgeRow}>
            {data.type && (
              <View style={[styles.badge, { backgroundColor: typeBadge.bg }]}>
                <Text style={[styles.badgeText, { color: typeBadge.text }]}>{data.type}</Text>
              </View>
            )}
            {data.is_remote && (
              <View style={[styles.badge, { backgroundColor: C.greenSoft }]}>
                <Ionicons name="wifi" size={11} color={C.green} />
                <Text style={[styles.badgeText, { color: C.green }]}>Remote</Text>
              </View>
            )}
            {deadline && (
              <View style={[styles.badge, { backgroundColor: C.coralSoft }]}>
                <Ionicons name="time-outline" size={11} color={C.coral} />
                <Text style={[styles.badgeText, { color: C.coral }]}>Due {deadline}</Text>
              </View>
            )}
          </View>

          {/* Info Rows */}
          <View style={styles.infoBlock}>
            <InfoRow icon="location-outline" label="Location" value={data.location} />
            <InfoRow icon="briefcase-outline" label="Type" value={data.type} />
            <InfoRow icon="calendar-outline" label="Deadline" value={deadline || 'N/A'} />
          </View>
        </View>

        {/* Description */}
        {data.description && (
          <SectionCard icon="document-text-outline" title="Description">
            <Text style={styles.bodyText}>{data.description}</Text>
          </SectionCard>
        )}

        {/* Requirements */}
        {data.requirements && (
          <SectionCard icon="list-outline" title="Requirements">
            <Text style={styles.bodyText}>{data.requirements}</Text>
          </SectionCard>
        )}

        {/* Skills */}
        {data.required_skills && (
          <SectionCard icon="code-slash-outline" title="Required Skills">
            <View style={styles.skillsWrap}>
              {String(data.required_skills).split(',').map((skill, i) => (
                <View key={i} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill.trim()}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Apply Button */}
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
          <Ionicons name="open-outline" size={20} color="#fff" />
          <Text style={styles.applyBtnText}>Apply Now</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  headerBtn: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: C.muted,
  },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  companyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: C.primaryBorder,
  },
  companyAvatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: C.primary,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroCompany: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoBlock: {
    width: '100%',
    backgroundColor: C.divider,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: C.text,
    fontWeight: '600',
    marginTop: 1,
  },

  // ── Section Card ──
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 14,
    color: C.subtext,
    lineHeight: 22,
  },

  // ── Skills ──
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: C.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  skillChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },

  // ── Apply Button ──
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});