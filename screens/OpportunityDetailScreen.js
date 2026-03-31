import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getOpportunityById } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';

export default function OpportunityDetailScreen({ route }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getOpportunityById(id);
      setData(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDetail(); }, [id]));

  const handleApply = () => {
    if (data?.apply_link) {
      Linking.openURL(data.apply_link).catch(() => Alert.alert('Error', 'Invalid link'));
    } else {
      Alert.alert('Notice', 'No external application link provided.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  if (!data) return <View style={styles.center}><Text style={styles.empty}>No data available</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.company}>{data.company_name} • {data.type}</Text>
        <Text style={styles.info}>Location: {data.location} {data.is_remote ? '(Remote)' : ''}</Text>
        <Text style={styles.info}>Deadline: {data.deadline ? data.deadline.substring(0,10) : 'N/A'}</Text>
      </Card>
      
      <Card>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.text}>{data.description || 'N/A'}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Requirements</Text>
        <Text style={styles.text}>{data.requirements || 'N/A'}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Required Skills</Text>
        <Text style={styles.text}>{data.required_skills || 'N/A'}</Text>
      </Card>

      <Button title="Apply Now" onPress={handleApply} style={styles.applyBtn} />
      <View style={{height:40}}/>
    </ScrollView>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#F7F7F7', padding: 16 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, empty: { textAlign: 'center', color: '#888' }, title: { fontSize: 24, fontWeight: 'bold' }, company: { fontSize: 16, color: '#007AFF', marginBottom: 12, fontWeight: '500' }, info: { fontSize: 14, color: '#555', marginBottom: 4 }, sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 }, text: { fontSize: 15, color: '#333', lineHeight: 22 }, applyBtn: { marginTop: 16 } });
