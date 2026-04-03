import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Dimensions, ActivityIndicator, Alert, Image, Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { updateOpportunity, getAllSkills } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', primarySoft: '#EEF2FF', primaryBorder: '#C7D2FE',
  bg: '#F8F8FC', card: '#FFFFFF', text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6', coral: '#DC2626'
};

export default function EditOpportunityScreen({ route, navigation }) {
  const opp = route.params?.opportunity;
  if (!opp) return <View style={s.container} />;

  const [formData, setFormData] = useState({
    title: opp.title || '',
    type: opp.type || 'job',
    company_name: opp.company_name || '',
    location: opp.location || '',
    is_remote: opp.is_remote || false,
    description: opp.description || '',
    requirements: opp.requirements || '',
    deadline: opp.deadline ? new Date(opp.deadline).toISOString().split('T')[0] : '',
    apply_link: opp.apply_link || '',
    required_skills: opp.required_skills?.map(s => s.id || s) || []
  });

  const [existingMedia, setExistingMedia] = useState(opp.media || []);
  const [newMedia, setNewMedia] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAllSkills()
      .then(res => setAllSkills(res.data?.skills || res.data || []))
      .catch(err => console.log('Failed to fetch skills', err));
  }, []);

  const pickMedia = async () => {
    const totalMedia = existingMedia.length + newMedia.length;
    if (totalMedia >= 5) {
      return Alert.alert('Limit Reached', 'You can only attach up to 5 media files.');
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed');

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5 - totalMedia
    });

    if (!result.canceled && result.assets) {
      setNewMedia(prev => [...prev, ...result.assets].slice(0, 5 - existingMedia.length));
    }
  };

  const removeExistingMedia = (index) => {
    setExistingMedia(prev => prev.filter((_, i) => i !== index));
  };
  const removeNewMedia = (index) => {
    setNewMedia(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSkill = (skillId) => {
    setFormData(prev => {
      const skills = prev.required_skills.includes(skillId)
        ? prev.required_skills.filter(id => id !== skillId)
        : [...prev.required_skills, skillId];
      return { ...prev, required_skills: skills };
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.company_name || !formData.description) {
      return Alert.alert('Error', 'Please fill in title, company and description.');
    }
    
    try {
      setSubmitting(true);
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
         if (key === 'required_skills') {
          payload.append(key, JSON.stringify(formData[key]));
        } else if (key === 'is_remote') {
          payload.append(key, formData[key] ? 'true' : 'false');
        } else {
          payload.append(key, formData[key] || '');
        }
      });

      // Pass existing media URLs
      if (existingMedia.length > 0) {
        payload.append('existing_media', JSON.stringify(existingMedia));
      }

      // Add new ones
      newMedia.forEach((m, idx) => {
        payload.append('media', {
          uri: m.uri,
          name: m.fileName || `media_${idx}.jpg`,
          type: m.type || 'image/jpeg',
        });
      });

      await updateOpportunity(opp.id, payload);
      Alert.alert('Success', 'Opportunity updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update opportunity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.label}>Title *</Text>
      <TextInput style={s.input} value={formData.title} onChangeText={t => setFormData(p => ({...p, title: t}))} />

      <Text style={s.label}>Type *</Text>
      <View style={s.typeChips}>
        {['job', 'internship', 'freelance'].map(t => (
          <TouchableOpacity 
            key={t} style={[s.typeChip, formData.type === t && s.typeChipActive]}
            onPress={() => setFormData(p => ({...p, type: t}))}
          >
            <Text style={[s.typeText, formData.type === t && s.typeTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Company Name *</Text>
      <TextInput style={s.input} value={formData.company_name} onChangeText={t => setFormData(p => ({...p, company_name: t}))} />

      <Text style={s.label}>Location</Text>
      <TextInput style={s.input} value={formData.location} onChangeText={t => setFormData(p => ({...p, location: t}))} />

      <View style={s.switchRow}>
        <Text style={s.label}>Fully Remote</Text>
        <Switch 
          value={formData.is_remote} 
          onValueChange={v => setFormData(p => ({...p, is_remote: v}))}
          trackColor={{ false: C.border, true: C.primary }}
        />
      </View>

      <Text style={s.label}>Description *</Text>
      <TextInput style={[s.input, s.textArea]} multiline value={formData.description} onChangeText={t => setFormData(p => ({...p, description: t}))} />

      <Text style={s.label}>Requirements</Text>
      <TextInput style={[s.input, s.textArea]} multiline value={formData.requirements} onChangeText={t => setFormData(p => ({...p, requirements: t}))} />

      <Text style={s.label}>Deadline (YYYY-MM-DD)</Text>
      <TextInput style={s.input} value={formData.deadline} onChangeText={t => setFormData(p => ({...p, deadline: t}))} />

      <Text style={s.label}>Apply Link (URL)</Text>
      <TextInput style={s.input} value={formData.apply_link} onChangeText={t => setFormData(p => ({...p, apply_link: t}))} autoCapitalize="none" />

      <Text style={s.label}>Required Skills ({formData.required_skills.length})</Text>
      <View style={s.skillsGrid}>
        {allSkills.slice(0, 15).map(skill => {
          const id = skill.id;
          const isSelected = formData.required_skills.includes(id);
          return (
            <TouchableOpacity key={id} style={[s.skillChip, isSelected && s.skillChipActive]} onPress={() => toggleSkill(id)}>
              <Text style={[s.skillText, isSelected && s.skillTextActive]}>{skill.name || skill.skill_name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.label}>Media ({existingMedia.length + newMedia.length}/5)</Text>
      <ScrollView horizontal style={s.mediaScroll}>
        <TouchableOpacity style={s.addMediaBtn} onPress={pickMedia}>
          <Ionicons name="images-outline" size={32} color={C.primary} />
          <Text style={s.addMediaText}>Add</Text>
        </TouchableOpacity>

        {existingMedia.map((m, idx) => (
          <View key={`old_${idx}`} style={s.mediaThumbWrap}>
            <Image source={{ uri: m.url || m }} style={s.mediaThumb} />
            <TouchableOpacity style={s.removeMediaBtn} onPress={() => removeExistingMedia(idx)}>
              <Ionicons name="close" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}

        {newMedia.map((m, idx) => (
          <View key={`new_${idx}`} style={s.mediaThumbWrap}>
            <Image source={{ uri: m.uri }} style={s.mediaThumb} />
            <TouchableOpacity style={s.removeMediaBtn} onPress={() => removeNewMedia(idx)}>
              <Ionicons name="close" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.submitBtn} onPress={handleSave} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>Update Opportunity</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: moderateScale(20) },
  label: { fontSize: moderateScale(14), fontWeight: '600', color: C.text, marginBottom: moderateScale(8) },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: moderateScale(12), padding: moderateScale(14), marginBottom: moderateScale(20), fontSize: moderateScale(15), color: C.text },
  textArea: { height: moderateScale(120), textAlignVertical: 'top' },
  typeChips: { flexDirection: 'row', gap: moderateScale(10), marginBottom: moderateScale(20) },
  typeChip: { flex: 1, paddingVertical: moderateScale(12), alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: moderateScale(8) },
  typeChipActive: { backgroundColor: C.primarySoft, borderColor: C.primary },
  typeText: { fontSize: moderateScale(14), fontWeight: '500', color: C.subtext },
  typeTextActive: { color: C.primary, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: moderateScale(20) },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(8), marginBottom: moderateScale(20) },
  skillChip: { paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(8), borderRadius: moderateScale(20), backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  skillChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  skillText: { fontSize: moderateScale(13), color: C.text },
  skillTextActive: { color: '#FFF' },
  mediaScroll: { flexDirection: 'row', marginBottom: moderateScale(30) },
  addMediaBtn: { width: moderateScale(80), height: moderateScale(80), borderRadius: moderateScale(12), borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginRight: moderateScale(12), backgroundColor: C.card },
  addMediaText: { fontSize: moderateScale(12), color: C.primary, marginTop: moderateScale(4) },
  mediaThumbWrap: { width: moderateScale(80), height: moderateScale(80), marginRight: moderateScale(12), borderRadius: moderateScale(12), overflow: 'hidden' },
  mediaThumb: { width: '100%', height: '100%' },
  removeMediaBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 2 },
  submitBtn: { backgroundColor: C.primary, padding: moderateScale(16), borderRadius: moderateScale(12), alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: moderateScale(16), fontWeight: '600' }
});
