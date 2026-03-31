import React, { useState, useContext } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';

export default function EditProfileScreen({ route, navigation }) {
  const { userData } = useContext(AuthContext);
  const { profile } = route.params || {};

  const [bio, setBio] = useState(profile?.bio || '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile(userData?.id, {
        bio,
        linkedin_url: linkedin,
        phone
      });
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Input label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Tell us about yourself" />
      <Input label="LinkedIn URL" value={linkedin} onChangeText={setLinkedin} placeholder="https://linkedin.com/in/..." keyboardType="url" autoCapitalize="none" />
      <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+1234567890" keyboardType="phone-pad" />
      <Button title="Save Changes" onPress={handleSave} loading={loading} style={styles.btn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  btn: { marginTop: 16 }
});
