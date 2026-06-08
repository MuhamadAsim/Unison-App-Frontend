import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { updateWorkExperience, deleteWorkExperience } from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ToggleSwitch from '../../components/ToggleSwitch';
import { Ionicons } from '@expo/vector-icons';

export default function EditWorkExperienceScreen({ route, navigation }) {
  const { experience } = route.params;
  const [role, setRole] = useState(experience.role || '');
  const [company, setCompany] = useState(experience.company_name || '');
  const [employmentType, setEmploymentType] = useState(experience.employment_type || '');
  const [location, setLocation] = useState(experience.location || '');
  const [startDate, setStartDate] = useState(experience.start_date ? new Date(experience.start_date).toISOString().split('T')[0] : '');
  const [endDate, setEndDate] = useState(experience.end_date ? new Date(experience.end_date).toISOString().split('T')[0] : '');
  const [isCurrent, setIsCurrent] = useState(experience.is_current || false);
  const [description, setDescription] = useState(experience.description || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!role || !company || !startDate) return Alert.alert('Error', 'Role, Company and Start Date are required');
    try {
      setLoading(true);
      await updateWorkExperience(experience.id, {
        role, company_name: company, employment_type: employmentType, location,
        start_date: startDate, end_date: isCurrent ? null : endDate, is_current: isCurrent, description
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteWorkExperience(experience.id);
            navigation.goBack();
          } catch(e) {
            Alert.alert('Error', 'Failed to delete');
          }
      }}
    ])
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Input label="Role/Title" value={role} onChangeText={setRole} />
        <Input label="Company Name" value={company} onChangeText={setCompany} />
        <Input label="Employment Type (e.g. Full-time)" value={employmentType} onChangeText={setEmploymentType} />
        <Input label="Location" value={location} onChangeText={setLocation} />
        <Input label="Start Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
        <ToggleSwitch label="I currently work here" value={isCurrent} onValueChange={setIsCurrent} style={{marginBottom: 12}} />
        {!isCurrent && <Input label="End Date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />}
        <Input label="Description" value={description} onChangeText={setDescription} multiline />
        
        <Button title="Save Changes" onPress={handleUpdate} loading={loading} style={{marginTop: 10}} />
        
        <TouchableOpacity style={styles.delBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text style={styles.delText}>Delete</Text>
        </TouchableOpacity>
      </Card>
      <View style={{height: 40}} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({ 
  container: { flex: 1, padding: 16, backgroundColor: '#F7F7F7' },
  delBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DC2626' },
  delText: { color: '#DC2626', fontWeight: 'bold', marginLeft: 8 }
});
