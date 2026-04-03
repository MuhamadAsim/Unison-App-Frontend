import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { updateAlumniProfile } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', primarySoft: '#EEF2FF', primaryBorder: '#C7D2FE',
  bg: '#F8F8FC', card: '#FFFFFF', text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6', coral: '#DC2626'
};

export default function EditAlumniProfileScreen({ route, navigation }) {
  const existingProfile = route.params?.profile || {};

  const [formData, setFormData] = useState({
    display_name: existingProfile.display_name || '',
    bio: existingProfile.bio || '',
    linkedin_url: existingProfile.linkedin_url || '',
    phone: existingProfile.phone || ''
  });

  const [localImage, setLocalImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLocalImage(result.assets[0]);
    }
  };

  const validate = () => {
    let newErrs = {};
    if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
      newErrs.linkedin_url = 'Please enter a valid LinkedIn URL';
    }
    if (formData.phone && !/^\+?[0-9]{7,15}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrs.phone = 'Please enter a valid phone number';
    }
    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    try {
      setSubmitting(true);
      
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) {
          payload.append(key, formData[key]);
        }
      });

      if (localImage) {
        payload.append('profile_picture', {
          uri: localImage.uri,
          name: localImage.fileName || 'profile.jpg',
          type: localImage.type || 'image/jpeg',
        });
      }

      await updateAlumniProfile(payload);
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update profile. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.imageSection}>
        <TouchableOpacity style={s.imageContainer} onPress={pickImage}>
          {localImage ? (
            <Image source={{ uri: localImage.uri }} style={s.image} />
          ) : existingProfile.profile_picture && existingProfile.profile_picture !== 'default.jpg' ? (
             <Image source={{ uri: existingProfile.profile_picture }} style={s.image} />
          ) : (
            <View style={s.placeholderImage}>
              <Ionicons name="camera" size={moderateScale(32)} color={C.primary} />
            </View>
          )}
          <View style={s.editIconBadge}>
            <Ionicons name="pencil" size={moderateScale(14)} color="#FFF" />
          </View>
        </TouchableOpacity>
        <Text style={s.imageHints}>Tap to change picture</Text>
      </View>

      <View style={s.formSection}>
        <Text style={s.label}>Display Name</Text>
        <TextInput
          style={s.input}
          value={formData.display_name}
          onChangeText={(v) => setFormData(pr => ({ ...pr, display_name: v }))}
          placeholder="John Doe"
          placeholderTextColor={C.muted}
        />

        <Text style={s.label}>Bio</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={formData.bio}
          onChangeText={(v) => setFormData(pr => ({ ...pr, bio: v }))}
          placeholder="Tell us about yourself..."
          placeholderTextColor={C.muted}
          multiline
          numberOfLines={4}
        />

        <Text style={s.label}>LinkedIn URL</Text>
        <TextInput
          style={[s.input, errors.linkedin_url && s.inputError]}
          value={formData.linkedin_url}
          onChangeText={(v) => setFormData(pr => ({ ...pr, linkedin_url: v }))}
          placeholder="https://linkedin.com/in/johndoe"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
        />
        {errors.linkedin_url ? <Text style={s.errorText}>{errors.linkedin_url}</Text> : null}

        <Text style={s.label}>Phone Number</Text>
        <TextInput
          style={[s.input, errors.phone && s.inputError]}
          value={formData.phone}
          onChangeText={(v) => setFormData(pr => ({ ...pr, phone: v }))}
          placeholder="+1 234 567 8900"
          placeholderTextColor={C.muted}
          keyboardType="phone-pad"
        />
        {errors.phone ? <Text style={s.errorText}>{errors.phone}</Text> : null}
      </View>

      <TouchableOpacity 
        style={s.saveBtn} 
        onPress={handleSave} 
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.saveBtnText}>Save Changes</Text>
        )}
      </TouchableOpacity>
      
      <View style={{ height: verticalScale(40) }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingPrimary: moderateScale(20), paddingTop: verticalScale(20), paddingHorizontal: moderateScale(20) },
  imageSection: { alignItems: 'center', marginBottom: moderateScale(30) },
  imageContainer: { position: 'relative' },
  image: { width: moderateScale(100), height: moderateScale(100), borderRadius: moderateScale(50), backgroundColor: C.divider },
  placeholderImage: { width: moderateScale(100), height: moderateScale(100), borderRadius: moderateScale(50), backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: C.primary, width: moderateScale(30), height: moderateScale(30), borderRadius: moderateScale(15), alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  imageHints: { marginTop: moderateScale(12), fontSize: moderateScale(14), color: C.subtext },
  formSection: { marginBottom: moderateScale(30) },
  label: { fontSize: moderateScale(14), fontWeight: '600', color: C.text, marginBottom: moderateScale(8) },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: moderateScale(12), padding: moderateScale(14), fontSize: moderateScale(15), color: C.text, marginBottom: moderateScale(16) },
  textArea: { height: moderateScale(100), textAlignVertical: 'top' },
  inputError: { borderColor: C.coral },
  errorText: { color: C.coral, fontSize: moderateScale(12), marginTop: -moderateScale(12), marginBottom: moderateScale(16) },
  saveBtn: { backgroundColor: C.primary, borderRadius: moderateScale(12), padding: moderateScale(16), alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#FFF', fontSize: moderateScale(16), fontWeight: '600' }
});
