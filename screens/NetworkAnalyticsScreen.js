import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { getTopConnected, getShortestPath, getTopCompanies, getSkillTrends, getBatchAnalysis } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';

export default function NetworkAnalyticsScreen() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  // Shortest path form
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [path, setPath] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [central, comps, skills, batches] = await Promise.all([
          getTopConnected(), getTopCompanies(), getSkillTrends(), getBatchAnalysis()
        ]);
        setData({
          centrality: central.data || [],
          companies: comps.data || [],
          skills: skills.data || {},
          batches: batches.data || []
        });
      } catch (e) {
        Alert.alert('Error', e.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleShortestPath = async () => {
    if (!fromId || !toId) return Alert.alert('Error', 'From ID and To ID required');
    try {
      setPathLoading(true);
      const res = await getShortestPath(fromId, toId);
      setPath(res.data?.path || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to find path');
    } finally {
      setPathLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Top Connected Alumni</Text>
        {(data.centrality || []).map((u, i) => (
          <Text key={i} style={styles.item}>{u.name} - {u.connections} connections (Score: {u.score})</Text>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.title}>Top Companies</Text>
        {(data.companies || []).map((c, i) => (
          <Text key={i} style={styles.item}>{c.company_name} - {c.count} alumni</Text>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.title}>Skill Trends</Text>
        <Text style={styles.subItem}>Most Required: {data.skills?.required?.join(', ') || 'N/A'}</Text>
        <Text style={styles.subItem}>Most Common: {data.skills?.common?.join(', ') || 'N/A'}</Text>
        <Text style={styles.subItem}>Skill Gap: {data.skills?.gap?.join(', ') || 'None'}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.title}>Shortest Path Finder</Text>
        <TextInput style={styles.input} placeholder="From User ID" value={fromId} onChangeText={setFromId} />
        <TextInput style={styles.input} placeholder="To User ID" value={toId} onChangeText={setToId} />
        <Button title="Find Path" onPress={handleShortestPath} loading={pathLoading} />
        {path && (
          <Text style={[styles.item, { marginTop: 12, fontWeight: 'bold' }]}>Path: {path.join(' ➔ ') || 'No path found'}</Text>
        )}
      </Card>

      <View style={{height:40}}/>
    </ScrollView>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#F7F7F7', padding: 16 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, card: { marginBottom: 16 }, title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 }, item: { fontSize: 16, color: '#333', marginBottom: 6 }, subItem: { fontSize: 15, color: '#555', marginBottom: 8 }, input: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 } });
