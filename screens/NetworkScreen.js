import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getNetwork } from '../services/api';
import ListItem from '../components/ListItem';

export default function NetworkScreen() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNetwork = async () => {
    try {
      setLoading(true);
      const res = await getNetwork();
      setConnections(res.data || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load network');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNetwork();
    }, [])
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={connections}
        keyExtractor={(item, index) => String(item.id || index)}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no connections yet.</Text>}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={`${item.role || 'Alumni'} at ${item.company || 'Unknown'} • ${item.connection_type || 'Connection'}`}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 }
});
