import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { postOpportunity } from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import Card from '../components/Card';
import ToggleSwitch from '../components/ToggleSwitch';

export default function PostOpportunityScreen({ navigation }) {
  const { userData } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('job');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  const [applyLink, setApplyLink] = useState('');
  const [reqSkills, setReqSkills] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePost = async () => {
    if (!title || !description || !company) return Alert.alert('Error', 'Title, description, and company are required');
    try {
      setSubmitting(true);
      await postOpportunity({
        title, type, description, requirements, location, is_remote: isRemote,
        deadline: deadline || null, company_name: company, apply_link: applyLink, required_skills: reqSkills
      });
      Alert.alert('Success', 'Opportunity posted');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  if (userData?.role !== 'alumni') return <View style={styles.center}><Text>Unauthorized</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.title}>Create Opportunity</Text>
        <Input label="Title" value={title} onChangeText={setTitle} />
        <Input label="Company Name" value={company} onChangeText={setCompany} />
        <Dropdown 
          label="Type" value={type} onSelect={setType}
          options={[{label: 'Job', value: 'job'}, {label: 'Internship', value: 'internship'}, {label: 'Freelance', value: 'freelance'}]} 
        />
        <Input label="Location" value={location} onChangeText={setLocation} />
        <ToggleSwitch label="Remote Work" value={isRemote} onValueChange={setIsRemote} style={{marginBottom: 12}} />
        <Input label="Description" value={description} onChangeText={setDescription} multiline />
        <Input label="Requirements" value={requirements} onChangeText={setRequirements} multiline />
        <Input label="Required Skills (comma separated)" value={reqSkills} onChangeText={setReqSkills} />
        <Input label="Apply Link (URL)" value={applyLink} onChangeText={setApplyLink} keyboardType="url" autoCapitalize="none" />
        <Input label="Deadline (YYYY-MM-DD)" value={deadline} onChangeText={setDeadline} />

        <Button title="Post Opportunity" onPress={handlePost} loading={submitting} style={{marginTop: 16}} />
      </Card>
      <View style={{height:40}}/>
    </ScrollView>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 16, backgroundColor: '#F7F7F7' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 } });
