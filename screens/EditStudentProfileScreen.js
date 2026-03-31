import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { updateStudentProfile, addStudentSkill } from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import Card from '../components/Card';

export default function EditStudentProfileScreen({ route, navigation }) {
  const { userData } = useContext(AuthContext);
  const { profile } = route.params || {};

  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);

  // Skill state
  const [skillName, setSkillName] = useState('');
  const [skillCat, setSkillCat] = useState('');
  const [skillProf, setSkillProf] = useState('beginner');
  const [skillAdding, setSkillAdding] = useState(false);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await updateStudentProfile(userData?.id, { phone, bio });
      Alert.alert('Success', 'Profile updated');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!skillName || !skillCat) return Alert.alert('Error', 'Name and Category required');
    try {
      setSkillAdding(true);
      await addStudentSkill({ skill_name: skillName, category: skillCat, proficiency_level: skillProf });
      Alert.alert('Success', 'Skill added');
      setSkillName(''); setSkillCat(''); setSkillProf('beginner');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add skill');
    } finally {
      setSkillAdding(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.title}>Update Info</Text>
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="Bio" value={bio} onChangeText={setBio} multiline />
        <Button title="Save Profile" onPress={handleSaveProfile} loading={loading} />
      </Card>

      <Card>
        <Text style={styles.title}>Add New Skill</Text>
        <Input label="Skill Name" value={skillName} onChangeText={setSkillName} />
        <Input label="Category" value={skillCat} onChangeText={setSkillCat} />
        <Dropdown 
          label="Proficiency" 
          value={skillProf} 
          onSelect={setSkillProf} 
          options={[
            {label: 'Beginner', value: 'beginner'},
            {label: 'Intermediate', value: 'intermediate'},
            {label: 'Expert', value: 'expert'}
          ]} 
        />
        <Button title="Add Skill" onPress={handleAddSkill} loading={skillAdding} />
      </Card>
      <View style={{height:40}}/>
    </ScrollView>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 } });
