import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addWorkExperience, deleteWorkExperience, getAlumniProfile } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ListItem from '../components/ListItem';
import Input from '../components/Input';
import Dropdown from '../components/Dropdown';
import Button from '../components/Button';
import ToggleSwitch from '../components/ToggleSwitch';

export default function WorkExperienceScreen({ route }) {
  const { userData } = React.useContext(AuthContext);
  const [experiences, setExperiences] = useState(route.params?.experiences || []);
  const [refreshing, setRefreshing] = useState(false);
  
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [employmentType, setEmploymentType] = useState('full-time');
  
  const [submitting, setSubmitting] = useState(false);

  const fetchExperiences = async () => {
    try {
      setRefreshing(true);
      const res = await getAlumniProfile(userData?.id);
      setExperiences(res.data?.work_experiences || []);
    } catch (e) {} finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchExperiences(); }, []));

  const handleAdd = async () => {
    if (!companyName || !role || !startDate) return Alert.alert('Error', 'Company, Role, and Start Date are required');
    try {
      setSubmitting(true);
      await addWorkExperience({
        company_name: companyName,
        role,
        start_date: startDate,
        end_date: isCurrent ? null : endDate,
        is_current: isCurrent,
        employment_type: employmentType
      });
      setCompanyName(''); setRole(''); setStartDate(''); setEndDate(''); setIsCurrent(false);
      fetchExperiences();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add experience');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWorkExperience(id);
      fetchExperiences();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete experience');
    }
  };

  return (
    <FlatList
      style={styles.container}
      data={experiences}
      keyExtractor={(i) => String(i.id)}
      refreshing={refreshing}
      onRefresh={fetchExperiences}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Add Work Experience</Text>
          <Input label="Company Name" value={companyName} onChangeText={setCompanyName} />
          <Input label="Role" value={role} onChangeText={setRole} />
          <Input label="Start Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2023-01-01" />
          
          <ToggleSwitch label="I currently work here" value={isCurrent} onValueChange={setIsCurrent} style={styles.switch} />
          
          {!isCurrent && (
            <Input label="End Date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2024-01-01" />
          )}

          <Dropdown
            label="Employment Type"
            value={employmentType}
            onSelect={setEmploymentType}
            options={[
              { label: 'Full-time', value: 'full-time' },
              { label: 'Part-time', value: 'part-time' },
              { label: 'Freelance', value: 'freelance' }
            ]}
          />
          <Button title="Save Experience" onPress={handleAdd} loading={submitting} />
        </View>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>No experience records found.</Text>}
      renderItem={({ item }) => (
        <ListItem
          title={item.role}
          subtitle={`${item.company_name} • ${item.employment_type}\n${item.start_date?.substring(0,10)} to ${item.is_current ? 'Present' : item.end_date?.substring(0,10)}`}
          rightElement={
            <Button title="Delete" onPress={() => handleDelete(item.id)} style={styles.deleteBtn} />
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7', padding: 16 },
  form: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 24, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
  deleteBtn: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, minWidth: 60 },
  switch: { marginBottom: 16 }
});
