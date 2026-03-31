import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addSkill, deleteSkill, getAlumniProfile } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ListItem from '../components/ListItem';
import Input from '../components/Input';
import Dropdown from '../components/Dropdown';
import Button from '../components/Button';

export default function SkillsScreen({ navigation, route }) {
  const { userData } = React.useContext(AuthContext);
  const [skills, setSkills] = useState(route.params?.skills || []);
  const [refreshing, setRefreshing] = useState(false);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [proficiency, setProficiency] = useState('beginner');
  const [years, setYears] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSkills = async () => {
    try {
      setRefreshing(true);
      const res = await getAlumniProfile(userData?.id);
      setSkills(res.data?.skills || []);
    } catch (e) {} finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchSkills(); }, []));

  const handleAdd = async () => {
    if (!name || !category) return Alert.alert('Error', 'Name and Category are required');
    try {
      setSubmitting(true);
      await addSkill({
        skill_name: name,
        category,
        proficiency,
        years_of_experience: parseInt(years) || 0
      });
      setName('');
      setCategory('');
      setYears('');
      setProficiency('beginner');
      fetchSkills();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add skill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSkill(id);
      fetchSkills();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete skill');
    }
  };

  return (
    <FlatList
      style={styles.container}
      data={skills}
      keyExtractor={(i) => String(i.id)}
      refreshing={refreshing}
      onRefresh={fetchSkills}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Add New Skill</Text>
          <Input label="Skill Name" value={name} onChangeText={setName} />
          <Input label="Category" value={category} onChangeText={setCategory} />
          <Dropdown
            label="Proficiency"
            value={proficiency}
            onSelect={setProficiency}
            options={[
              { label: 'Beginner', value: 'beginner' },
              { label: 'Intermediate', value: 'intermediate' },
              { label: 'Expert', value: 'expert' }
            ]}
          />
          <Input label="Years of Experience (optional)" value={years} onChangeText={setYears} keyboardType="numeric" />
          <Button title="Add Skill" onPress={handleAdd} loading={submitting} />
        </View>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>No skills found.</Text>}
      renderItem={({ item }) => (
        <ListItem
          title={item.skill_name}
          subtitle={`${item.category} • ${item.proficiency} • ${item.years_of_experience} yrs`}
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
  deleteBtn: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, minWidth: 60 }
});
