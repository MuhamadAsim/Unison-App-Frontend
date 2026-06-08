import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { addSkill } from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Dropdown from '../../components/Dropdown';
import Card from '../../components/Card';

export default function AddSkillScreen({ navigation }) {
  const [skillName, setSkillName] = useState('');
  const [proficiency, setProficiency] = useState('beginner');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!skillName) return Alert.alert('Error', 'Skill name is required');
    try {
      setLoading(true);
      await addSkill({ skill_name: skillName, proficiency_level: proficiency });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add skill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card>
        <Input label="Skill Name" value={skillName} onChangeText={setSkillName} />
        <Dropdown 
          label="Proficiency" value={proficiency} onSelect={setProficiency}
          options={[{label: 'Beginner', value: 'beginner'}, {label: 'Intermediate', value: 'intermediate'}, {label: 'Expert', value: 'expert'}]}
        />
        <Button title="Add Skill" onPress={handleAdd} loading={loading} style={{marginTop: 16}} />
      </Card>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 16, backgroundColor: '#F7F7F7' } });
