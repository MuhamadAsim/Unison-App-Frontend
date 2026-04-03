import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Alert, TouchableOpacity, Dimensions, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPublicProfile, getConnectionStatus, connectUser, removeConnection } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', primarySoft: '#EEF2FF', primaryDark: '#3730A3',
  bg: '#F8F8FC', card: '#FFFFFF', text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6', coral: '#DC2626',
  green: '#059669', greenSoft: '#D1FAE5', amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE'
};

const Avatar = ({ uri, name, size = moderateScale(80) }) => {
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

export default function AlumniPublicProfileScreen({ route, navigation }) {
  const { id } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [connStatus, setConnStatus] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getPublicProfile(id);
      setProfile(res.data?.profile || res.data || null);
      
      setStatusLoading(true);
      const stRes = await getConnectionStatus(id);
      setConnStatus({ status: stRes.data?.status, is_sender: stRes.data?.is_sender });
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile');
      navigation.goBack();
    } finally {
      setLoading(false);
      setStatusLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [id]));

  const handleConnect = async () => {
    Alert.alert('Connect', 'What kind of connection is this?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Batchmate', onPress: () => sendRequest('batchmate') },
      { text: 'Colleague', onPress: () => sendRequest('colleague') },
      { text: 'Mentor', onPress: () => sendRequest('mentor') }
    ]);
  };

  const sendRequest = async (type) => {
    try {
      setStatusLoading(true);
      await connectUser(id, { connection_type: type });
      setConnStatus({ status: 'pending', is_sender: true });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send request');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setStatusLoading(true);
      await removeConnection(id);
      setConnStatus({ status: null, is_sender: false });
    } catch (err) {
      Alert.alert('Error', 'Failed to disconnect');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }
  if (!profile) return null;

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={moderateScale(24)} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <View style={s.heroCard}>
        <Avatar uri={profile.profile_picture} name={profile.name || profile.display_name} />
        <Text style={s.name}>{profile.name || profile.display_name}</Text>
        <Text style={s.role}>{profile.current_role} @ {profile.company || 'Alumni'}</Text>
        <Text style={s.meta}>Batch {profile.batch || 'N/A'} • {profile.degree || 'N/A'}</Text>
        
        {profile.bio && <Text style={s.bio}>{profile.bio}</Text>}

        <View style={s.actionRow}>
          {statusLoading ? (
             <ActivityIndicator size="small" color={C.primary} style={{ marginTop: 10 }} />
          ) : connStatus?.status === 'connected' ? (
             <TouchableOpacity style={[s.btn, s.btnActive]} onPress={handleDisconnect}>
               <Text style={s.btnActiveText}>Connected</Text>
             </TouchableOpacity>
          ) : connStatus?.status === 'pending' ? (
             <TouchableOpacity style={[s.btn, s.btnPending]} onPress={handleDisconnect}>
               <Text style={s.btnPendingText}>{connStatus.is_sender ? 'Cancel Request' : 'Respond'}</Text>
             </TouchableOpacity>
          ) : (
             <TouchableOpacity style={s.btn} onPress={handleConnect}>
               <Text style={s.btnText}>Connect</Text>
             </TouchableOpacity>
          )}
        </View>
      </View>

      {profile.work_experience?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Experience</Text>
          {profile.work_experience.map((w, idx) => (
            <View key={idx} style={s.card}>
              <Text style={s.workRole}>{w.role}</Text>
              <Text style={s.workCompany}>{w.company_name}</Text>
            </View>
          ))}
        </View>
      )}

      {profile.skills?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Skills</Text>
          <View style={s.skillsGrid}>
            {profile.skills.map((sk, idx) => {
              let pBg = C.amberSoft, pTx = C.amber;
              if (sk.proficiency === 'intermediate') { pBg = C.blueSoft; pTx = C.blue; }
              if (sk.proficiency === 'expert') { pBg = C.greenSoft; pTx = C.green; }
              return (
                <View key={idx} style={s.skillChip}>
                  <Text style={s.skillText}>{sk.name || sk.skill_name}</Text>
                  <View style={[s.profBadge, { backgroundColor: pBg }]}><Text style={[s.profText, { color: pTx }]}>{sk.proficiency}</Text></View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: moderateScale(40) }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: moderateScale(60), paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(15), backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { marginRight: moderateScale(15) },
  headerTitle: { fontSize: moderateScale(20), fontWeight: 'bold', color: C.text },
  heroCard: { backgroundColor: C.card, alignItems: 'center', padding: moderateScale(24), borderBottomWidth: 1, borderBottomColor: C.border },
  name: { fontSize: moderateScale(22), fontWeight: '700', color: C.text, marginTop: moderateScale(16), marginBottom: moderateScale(4) },
  role: { fontSize: moderateScale(16), color: C.primary, fontWeight: '600', marginBottom: moderateScale(4) },
  meta: { fontSize: moderateScale(14), color: C.subtext, marginBottom: moderateScale(16) },
  bio: { fontSize: moderateScale(14), color: C.text, textAlign: 'center', lineHeight: moderateScale(22), paddingHorizontal: moderateScale(20) },
  actionRow: { marginTop: moderateScale(20), width: '100%', alignItems: 'center' },
  btn: { backgroundColor: C.primary, paddingVertical: moderateScale(12), paddingHorizontal: moderateScale(30), borderRadius: moderateScale(20) },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: moderateScale(14) },
  btnActive: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  btnActiveText: { color: C.subtext, fontWeight: '600' },
  btnPending: { backgroundColor: C.amberSoft, borderWidth: 1, borderColor: C.amber },
  btnPendingText: { color: C.amber, fontWeight: '600' },
  section: { padding: moderateScale(20) },
  sectionTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.text, marginBottom: moderateScale(12) },
  card: { backgroundColor: C.card, padding: moderateScale(16), borderRadius: moderateScale(12), borderWidth: 1, borderColor: C.border, marginBottom: moderateScale(10) },
  workRole: { fontSize: moderateScale(16), fontWeight: '600', color: C.text, marginBottom: moderateScale(4) },
  workCompany: { fontSize: moderateScale(14), color: C.subtext },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(8) },
  skillChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: moderateScale(20), paddingLeft: moderateScale(12), paddingRight: moderateScale(8), paddingVertical: moderateScale(6), gap: moderateScale(6) },
  skillText: { fontSize: moderateScale(14), color: C.text, fontWeight: '500' },
  profBadge: { paddingHorizontal: moderateScale(6), paddingVertical: moderateScale(2), borderRadius: moderateScale(4) },
  profText: { fontSize: moderateScale(10), fontWeight: '700' },
});