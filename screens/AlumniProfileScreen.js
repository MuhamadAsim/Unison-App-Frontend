import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import {
  getAlumniProfile,
  getNetwork,
  addWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
  addAlumniSkill,
  deleteAlumniSkill
} from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', primaryDark: '#3730A3', primarySoft: '#EEF2FF', primaryBorder: '#C7D2FE',
  bg: '#F8F8FC', card: '#FFFFFF', text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6',
  green: '#059669', greenSoft: '#D1FAE5', amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE', coral: '#DC2626', coralSoft: '#FEE2E2',
};

const Avatar = ({ uri, name, size = moderateScale(80) }) => {
  if (uri && uri !== 'default.jpg') {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.divider }}
        resizeMode="cover"
      />
    );
  }
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.4, color: C.primary, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
};

export default function AlumniProfileScreen({ navigation }) {
  const { userData } = useContext(AuthContext);
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState(null);
  const [connectionsCount, setConnectionsCount] = useState(0);

  // Skill Add Modal state
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [newSkill, setNewSkill] = useState({ skill_name: '', proficiency: 'beginner' });
  const [skillSubmitting, setSkillSubmitting] = useState(false);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [profRes, netRes] = await Promise.allSettled([
        getAlumniProfile(),
        getNetwork()
      ]);

      if (profRes.status === 'fulfilled') {
        setProfile(profRes.value.data?.profile || profRes.value.data);
      }
      if (netRes.status === 'fulfilled') {
        const count = netRes.value.data?.connections?.length || netRes.value.data?.length || 0;
        setConnectionsCount(count);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleAddSkill = async () => {
    if (!newSkill.skill_name.trim()) return Alert.alert('Error', 'Skill name required');
    try {
      setSkillSubmitting(true);
      await addAlumniSkill(newSkill);
      setSkillModalVisible(false);
      setNewSkill({ skill_name: '', proficiency: 'beginner' });
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add skill');
    } finally {
      setSkillSubmitting(false);
    }
  };

  const handleDeleteSkill = async (id) => {
    Alert.alert('Confirm', 'Remove this skill?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await deleteAlumniSkill(id);
          await loadData();
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || 'Failed to delete skill');
        }
      }}
    ]);
  };

  const handleDeleteWork = (id) => {
    Alert.alert('Confirm', 'Remove this work experience?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await deleteWorkExperience(id);
          await loadData();
        } catch(err) {
          Alert.alert('Error', err.response?.data?.message || 'Failed to remove experience');
        }
      }}
    ]);
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const displayName = profile?.display_name || userData?.display_name || userData?.name || 'Alumni';
  const roleDisplay = profile?.current_role && profile?.company 
    ? `${profile.current_role} @ ${profile.company}` 
    : (profile?.current_role || profile?.company || 'Add your current role');

  return (
    <View style={s.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.primary} />}>
        
        {/* Hero Card */}
        <View style={s.heroCard}>
          <View style={s.heroHeader}>
            <Avatar uri={profile?.profile_picture} name={displayName} />
            <View style={s.heroContent}>
              <Text style={s.profileName}>{displayName}</Text>
              <Text style={s.profileRole}>{roleDisplay}</Text>
              <Text style={s.profileMeta}>
                Batch {profile?.batch || 'N/A'} • {profile?.degree || 'N/A'}
              </Text>
            </View>
          </View>
          {profile?.bio && (
            <Text style={s.bioText}>{profile.bio}</Text>
          )}
          <View style={s.heroFooter}>
            <View style={s.connectionBadge}>
              <Ionicons name="people" size={moderateScale(14)} color={C.primary} />
              <Text style={s.connectionLabel}>{connectionsCount} Connections</Text>
            </View>
            <TouchableOpacity 
              style={s.editBtn} 
              onPress={() => navigation.navigate('EditProfile', { profile })}
            >
              <Ionicons name="pencil" size={moderateScale(14)} color={C.text} />
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Contact & Links</Text>
          <View style={s.card}>
            {profile?.linkedin_url ? (
              <View style={s.contactRow}>
                <Ionicons name="logo-linkedin" size={moderateScale(20)} color={C.blue} />
                <Text style={s.contactText}>{profile.linkedin_url}</Text>
              </View>
            ) : null}
            {profile?.phone ? (
              <View style={s.contactRow}>
                <Ionicons name="call-outline" size={moderateScale(20)} color={C.primary} />
                <Text style={s.contactText}>{profile.phone}</Text>
              </View>
            ) : null}
            {!profile?.linkedin_url && !profile?.phone && (
              <Text style={s.emptyText}>No contact information added.</Text>
            )}
          </View>
        </View>

        {/* Work Experience */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Work Experience</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WorkExperience', { profile })}>
              <Ionicons name="add-circle" size={moderateScale(22)} color={C.primary} />
            </TouchableOpacity>
          </View>
          
          {profile?.work_experience?.length > 0 ? (
            profile.work_experience.map(work => (
              <View key={work.id} style={s.card}>
                <View style={s.workHeader}>
                  <Text style={s.workRole}>{work.role}</Text>
                  <TouchableOpacity onPress={() => handleDeleteWork(work.id)}>
                    <Ionicons name="trash-outline" size={moderateScale(16)} color={C.coral} />
                  </TouchableOpacity>
                </View>
                <Text style={s.workCompany}>{work.company_name}</Text>
                <Text style={s.workDates}>
                  {work.start_date ? new Date(work.start_date).toLocaleDateString() : ''} - 
                  {work.is_current ? ' Present' : (work.end_date ? new Date(work.end_date).toLocaleDateString() : '')}
                </Text>
              </View>
            ))
          ) : (
            <View style={s.card}>
              <Text style={s.emptyText}>No work experience added.</Text>
            </View>
          )}
        </View>

        {/* Skills */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Skills</Text>
            <TouchableOpacity onPress={() => setSkillModalVisible(true)}>
              <Ionicons name="add-circle" size={moderateScale(22)} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={s.skillsContainer}>
            {profile?.skills?.length > 0 ? (
              profile.skills.map((skill) => {
                let pBg = C.amberSoft, pTx = C.amber;
                if (skill.proficiency === 'intermediate') { pBg = C.blueSoft; pTx = C.blue; }
                if (skill.proficiency === 'expert') { pBg = C.greenSoft; pTx = C.green; }

                return (
                  <View key={skill.id} style={s.skillChip}>
                    <Text style={s.skillName}>{skill.skill_name || skill.name}</Text>
                    <View style={[s.profBadge, { backgroundColor: pBg }]}>
                      <Text style={[s.profText, { color: pTx }]}>{skill.proficiency}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteSkill(skill.id)}>
                      <Ionicons name="close-circle" size={moderateScale(14)} color={C.muted} />
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <Text style={s.emptyText}>No skills added.</Text>
            )}
          </View>
        </View>

        <View style={{ height: moderateScale(40) }} />
      </ScrollView>

      {/* Add Skill Modal */}
      <Modal visible={skillModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Skill</Text>
            
            <TextInput
              style={s.input}
              placeholder="Skill Name (e.g. React Native)"
              value={newSkill.skill_name}
              onChangeText={t => setNewSkill({...newSkill, skill_name: t})}
            />

            <Text style={s.modalLabel}>Proficiency</Text>
            <View style={s.profChipsRow}>
              {['beginner', 'intermediate', 'expert'].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    s.profSelectChip, 
                    newSkill.proficiency === level && { backgroundColor: C.primarySoft, borderColor: C.primary }
                  ]}
                  onPress={() => setNewSkill({...newSkill, proficiency: level})}
                >
                  <Text style={[
                    s.profSelectText,
                    newSkill.proficiency === level && { color: C.primary }
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setSkillModalVisible(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={handleAddSkill} disabled={skillSubmitting}>
                {skillSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.modalSaveText}>Add Skill</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  heroCard: {
    backgroundColor: C.card, padding: moderateScale(20),
    paddingTop: verticalScale(60), borderBottomWidth: 1, borderBottomColor: C.border,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(16), marginBottom: moderateScale(16) },
  heroContent: { flex: 1 },
  profileName: { fontSize: moderateScale(20), fontWeight: '700', color: C.text, marginBottom: moderateScale(4) },
  profileRole: { fontSize: moderateScale(14), color: C.primary, fontWeight: '600', marginBottom: moderateScale(4) },
  profileMeta: { fontSize: moderateScale(12), color: C.subtext },
  bioText: { fontSize: moderateScale(14), color: C.subtext, lineHeight: moderateScale(22), marginBottom: moderateScale(16) },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  connectionBadge: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(4), backgroundColor: C.primarySoft, paddingHorizontal: moderateScale(10), paddingVertical: moderateScale(6), borderRadius: moderateScale(8) },
  connectionLabel: { fontSize: moderateScale(12), fontWeight: '600', color: C.primaryDark },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(4), borderWidth: 1, borderColor: C.border, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(6), borderRadius: moderateScale(8) },
  editBtnText: { fontSize: moderateScale(12), fontWeight: '600', color: C.text },
  section: { paddingHorizontal: moderateScale(20), marginTop: moderateScale(24) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: moderateScale(12) },
  sectionTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.text },
  card: { backgroundColor: C.card, borderRadius: moderateScale(12), padding: moderateScale(16), marginBottom: moderateScale(12), borderWidth: 1, borderColor: C.border },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12), marginBottom: moderateScale(8) },
  contactText: { fontSize: moderateScale(14), color: C.text },
  emptyText: { color: C.muted, fontStyle: 'italic', fontSize: moderateScale(14) },
  workHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: moderateScale(4) },
  workRole: { fontSize: moderateScale(16), fontWeight: '600', color: C.text },
  workCompany: { fontSize: moderateScale(14), color: C.subtext, marginBottom: moderateScale(6) },
  workDates: { fontSize: moderateScale(12), color: C.muted },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(8) },
  skillChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: moderateScale(20), paddingLeft: moderateScale(12), paddingRight: moderateScale(8), paddingVertical: moderateScale(6), gap: moderateScale(6) },
  skillName: { fontSize: moderateScale(14), color: C.text, fontWeight: '500' },
  profBadge: { paddingHorizontal: moderateScale(6), paddingVertical: moderateScale(2), borderRadius: moderateScale(4) },
  profText: { fontSize: moderateScale(10), fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: moderateScale(24), borderTopRightRadius: moderateScale(24), padding: moderateScale(24), paddingBottom: verticalScale(40) },
  modalTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.text, marginBottom: moderateScale(20) },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: moderateScale(12), padding: moderateScale(14), fontSize: moderateScale(16), marginBottom: moderateScale(20) },
  modalLabel: { fontSize: moderateScale(14), fontWeight: '600', color: C.text, marginBottom: moderateScale(12) },
  profChipsRow: { flexDirection: 'row', gap: moderateScale(8), marginBottom: moderateScale(30) },
  profSelectChip: { flex: 1, alignItems: 'center', paddingVertical: moderateScale(12), borderWidth: 1, borderColor: C.border, borderRadius: moderateScale(8) },
  profSelectText: { fontSize: moderateScale(14), color: C.subtext, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: moderateScale(12) },
  modalCancelBtn: { flex: 1, padding: moderateScale(16), borderRadius: moderateScale(12), alignItems: 'center', backgroundColor: C.divider },
  modalCancelText: { fontSize: moderateScale(16), fontWeight: '600', color: C.text },
  modalSaveBtn: { flex: 1, padding: moderateScale(16), borderRadius: moderateScale(12), alignItems: 'center', backgroundColor: C.primary },
  modalSaveText: { fontSize: moderateScale(16), fontWeight: '600', color: '#FFF' },
});
