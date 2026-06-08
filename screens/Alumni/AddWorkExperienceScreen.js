import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { addWorkExperience } from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ToggleSwitch from '../../components/ToggleSwitch';

export default function AddWorkExperienceScreen({ navigation }) {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!role || !company || !startDate) return Alert.alert('Error', 'Role, Company and Start Date are required');
    try {
      setLoading(true);
      await addWorkExperience({
        role, company_name: company, employment_type: employmentType, location,
        start_date: startDate, end_date: isCurrent ? null : endDate, is_current: isCurrent, description
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add');
    } finally {
      setLoading(false);
    }
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
        <Button title="Save" onPress={handleAdd} loading={loading} />
      </Card>
      <View style={{height: 40}} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 16, backgroundColor: '#F7F7F7' } });
