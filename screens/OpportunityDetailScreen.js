import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Dimensions, ActivityIndicator, Alert, Image, Switch, Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOpportunityById, deleteOpportunity } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', primarySoft: '#EEF2FF', primaryBorder: '#C7D2FE',
  bg: '#F8F8FC', card: '#FFFFFF', text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6',
  green: '#059669', amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE', coral: '#DC2626', coralSoft: '#FEE2E2',
};

const Avatar = ({ uri, name, size = moderateScale(40) }) => {
  if (uri && uri !== 'default.jpg') {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.divider }} resizeMode="cover" />;
  }
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.4, color: C.primary, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
};

export default function OpportunityDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { userData } = React.useContext(AuthContext);

  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getOpportunityById(id);
      setOpp(res.data?.opportunity || res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load opportunity');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id])
  );

  const handleApply = () => {
    if (opp?.apply_link) {
      Linking.openURL(opp.apply_link).catch(err => Alert.alert('Error', 'Could not open apply link'));
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Opportunity', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteOpportunity(opp.id);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
          }
        }
      }
    ]);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  if (!opp) return <View style={s.center}><Text>Not found</Text></View>;

  const isOwner = userData?.id === opp?.posted_by?.id;
  const isJob = opp?.type?.toLowerCase() === 'job';
  const isInternship = opp?.type?.toLowerCase() === 'internship';
  let badgeColor = C.blue, badgeBg = C.blueSoft;
  if (isJob) { badgeColor = C.primary; badgeBg = C.primarySoft; }
  else if (isInternship) { badgeColor = C.amber; badgeBg = C.amberSoft; }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={moderateScale(24)} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Details</Text>
        
        {isOwner ? (
          <View style={s.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('EditOpportunity', { opportunity: opp })} style={s.iconBtn}>
              <Ionicons name="pencil" size={moderateScale(22)} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={s.iconBtn}>
              <Ionicons name="trash" size={moderateScale(22)} color={C.coral} />
            </TouchableOpacity>
          </View>
        ) : <View style={{ width: 44 }} />}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{opp.title}</Text>
        
        <View style={s.metaWrap}>
          <Text style={s.company}>{opp.company_name}</Text>
          <View style={[s.badge, { backgroundColor: badgeBg }]}>
            <Text style={[s.badgeText, { color: badgeColor }]}>{opp.type?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <Ionicons name="location-outline" size={moderateScale(16)} color={C.subtext} />
          <Text style={s.infoText}>{opp.location || 'Remote'}</Text>
          {opp.is_remote && (
            <View style={s.remoteBadge}>
              <Text style={s.remoteText}>Remote</Text>
            </View>
          )}
        </View>
        
        {opp.deadline && (
           <View style={s.infoRow}>
             <Ionicons name="calendar-outline" size={moderateScale(16)} color={C.subtext} />
             <Text style={s.infoText}>Deadline: {new Date(opp.deadline).toLocaleDateString()}</Text>
           </View>
        )}

        <View style={s.divider} />

        <TouchableOpacity 
          style={s.posterRow}
          onPress={() => navigation.navigate('AlumniPublicProfile', { id: opp.posted_by?.id })}
        >
          <Avatar uri={opp.posted_by?.profile_picture} name={opp.posted_by?.name || opp.posted_by?.display_name} />
          <View style={s.posterTextWrap}>
            <Text style={s.posterName}>{opp.posted_by?.name || opp.posted_by?.display_name}</Text>
            <Text style={s.posterDate}>Posted on {new Date(opp.created_at).toLocaleDateString()}</Text>
          </View>
        </TouchableOpacity>

        <View style={s.divider} />

        <Text style={s.sectionTitle}>Description</Text>
        <Text style={s.descText}>{opp.description}</Text>

        {opp.requirements && (
          <>
            <Text style={[s.sectionTitle, { marginTop: moderateScale(20) }]}>Requirements</Text>
            <Text style={s.descText}>{opp.requirements}</Text>
          </>
        )}

        {opp.required_skills?.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: moderateScale(20) }]}>Skills Needed</Text>
            <View style={s.skillsGrid}>
              {opp.required_skills.map(s => (
                <View key={s.id || s} style={s.skillChip}>
                  <Text style={s.skillText}>{s.name || s.skill_name || s}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {opp.media?.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: moderateScale(20) }]}>Media</Text>
            <ScrollView horizontal style={s.mediaScroll}>
              {opp.media.map((img, i) => (
                <Image key={i} source={{ uri: img.url || img }} style={s.mediaImage} resizeMode="cover" />
              ))}
            </ScrollView>
          </>
        )}
        
        <View style={{ height: moderateScale(40) }} />
      </ScrollView>

      {/* Apply Footer */}
      {!isOwner && opp.apply_link && (
        <View style={s.footer}>
          <TouchableOpacity style={s.applyBtn} onPress={handleApply}>
            <Text style={s.applyBtnText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: verticalScale(60), paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(15),
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: 'bold', color: C.text, flex: 1, textAlign: 'center' },
  backBtn: { width: 44 },
  headerActions: { flexDirection: 'row', gap: moderateScale(12), width: 'auto' },
  iconBtn: { padding: 4 },
  content: { padding: moderateScale(20) },
  title: { fontSize: moderateScale(22), fontWeight: '700', color: C.text, marginBottom: moderateScale(8) },
  metaWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(16) },
  company: { fontSize: moderateScale(16), color: C.subtext, fontWeight: '500', marginRight: moderateScale(12) },
  badge: { paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(4), borderRadius: moderateScale(6) },
  badgeText: { fontSize: moderateScale(10), fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(8), gap: moderateScale(6) },
  infoText: { fontSize: moderateScale(14), color: C.subtext },
  remoteBadge: { backgroundColor: C.greenSoft, paddingHorizontal: moderateScale(6), paddingVertical: moderateScale(2), borderRadius: moderateScale(4), marginLeft: moderateScale(4) },
  remoteText: { fontSize: moderateScale(10), color: C.green, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: moderateScale(20) },
  posterRow: { flexDirection: 'row', alignItems: 'center' },
  posterTextWrap: { marginLeft: moderateScale(12) },
  posterName: { fontSize: moderateScale(15), fontWeight: '600', color: C.text, marginBottom: moderateScale(2) },
  posterDate: { fontSize: moderateScale(12), color: C.muted },
  sectionTitle: { fontSize: moderateScale(18), fontWeight: '600', color: C.text, marginBottom: moderateScale(12) },
  descText: { fontSize: moderateScale(15), color: C.subtext, lineHeight: moderateScale(22) },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(8) },
  skillChip: { paddingHorizontal: moderateScale(10), paddingVertical: moderateScale(6), borderRadius: moderateScale(8), backgroundColor: '#EEF2FF' },
  skillText: { fontSize: moderateScale(13), color: C.primary, fontWeight: '500' },
  mediaScroll: { flexDirection: 'row', marginVertical: moderateScale(10) },
  mediaImage: { width: moderateScale(140), height: moderateScale(100), borderRadius: moderateScale(12), marginRight: moderateScale(12), borderWidth: 1, borderColor: C.border },
  footer: { backgroundColor: C.card, padding: moderateScale(20), paddingBottom: moderateScale(40), borderTopWidth: 1, borderTopColor: C.border },
  applyBtn: { backgroundColor: C.primary, paddingVertical: moderateScale(16), borderRadius: moderateScale(12), alignItems: 'center' },
  applyBtnText: { color: '#FFF', fontSize: moderateScale(16), fontWeight: '600' }
});