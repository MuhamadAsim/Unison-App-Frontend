import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from '../../services/api';

const C = { primary: '#534AB7', bg: '#F4F4F8', card: '#FFFFFF', text: '#1A1A2E', border: '#E8E8F0', muted: '#9CA3AF' };

export default function EditAlumniProfileScreen({ route, navigation }) {
  const profile = route.params?.profile || {};
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [linkedin, setLinkedin] = useState(profile.linkedin_url || '');
  const [profilePic, setProfilePic] = useState(profile.profile_picture || null);
  const [backdropPic, setBackdropPic] = useState(profile.backDropImage || null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState({});

  const pickImage = async (type) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const file = { uri, name: uri.split('/').pop(), type: 'image/jpeg' };
      if (type === 'profile') { setProfilePic(uri); setFiles(p => ({...p, profile_picture: file})); }
      else { setBackdropPic(uri); setFiles(p => ({...p, backDropImage: file})); }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      if (displayName !== profile.display_name) formData.append('display_name', displayName);
      if (bio !== profile.bio) formData.append('bio', bio);
      if (phone !== profile.phone) formData.append('phone', phone);
      if (linkedin !== profile.linkedin_url) formData.append('linkedin_url', linkedin);
      if (files.profile_picture) formData.append('profile_picture', files.profile_picture);
      if (files.backDropImage) formData.append('backDropImage', files.backDropImage);

      await updateProfile(formData);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{padding: 20}}>
      
      <TouchableOpacity style={styles.imgPicker} onPress={() => pickImage('backdrop')}>
        {backdropPic ? <Image source={{uri: backdropPic}} style={styles.img} /> : <Text style={styles.imgTxt}>Pick Backdrop</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.imgPicker, {width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginTop: -50, backgroundColor: C.card}]} onPress={() => pickImage('profile')}>
        {profilePic ? <Image source={{uri: profilePic}} style={[styles.img, {borderRadius: 50}]} /> : <Text style={[styles.imgTxt, {fontSize: 12}]}>Profile Pic</Text>}
      </TouchableOpacity>

      <Text style={styles.label}>Display Name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />

      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, {height: 80}]} value={bio} onChangeText={setBio} multiline />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.label}>LinkedIn URL</Text>
      <TextInput style={styles.input} value={linkedin} onChangeText={setLinkedin} keyboardType="url" autoCapitalize="none" />

      <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  imgPicker: { height: 150, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  img: { width: '100%', height: '100%' },
  imgTxt: { color: C.text, fontWeight: '600' },
  label: { fontSize: 14, color: C.text, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
