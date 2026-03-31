import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Modal, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBatchmates, connectUser } from '../services/api';
import ListItem from '../components/ListItem';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';

export default function BatchmatesScreen() {
  const [batchmates, setBatchmates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Connection Modal state
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [connectionType, setConnectionType] = useState('batchmate');
  const [connecting, setConnecting] = useState(false);

  const fetchBatchmates = async () => {
    try {
      setLoading(true);
      const res = await getBatchmates();
      setBatchmates(res.data || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load batchmates');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBatchmates();
    }, [])
  );

  const handleConnect = async () => {
    if (!selectedUser) return;
    try {
      setConnecting(true);
      await connectUser(selectedUser.id, { connection_type: connectionType });
      Alert.alert('Success', `Connection request sent to ${selectedUser.name}!`);
      setConnectModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const openConnectModal = (user) => {
    setSelectedUser(user);
    setConnectionType('batchmate');
    setConnectModalVisible(true);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={batchmates}
        keyExtractor={(item, index) => String(item.id || index)}
        ListEmptyComponent={<Text style={styles.emptyText}>No batchmates found.</Text>}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={`${item.role || 'Alumni'} at ${item.company || 'Unknown'}`}
            rightElement={
              <Button title="Connect" onPress={() => openConnectModal(item)} style={styles.connectBtn} />
            }
          />
        )}
      />

      <Modal visible={connectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Connect with {selectedUser?.name}</Text>
            <Dropdown
              label="Connection Type"
              value={connectionType}
              onSelect={setConnectionType}
              options={[
                { label: 'Batchmate', value: 'batchmate' },
                { label: 'Colleague', value: 'colleague' },
                { label: 'Mentor', value: 'mentor' }
              ]}
            />
            <Button title="Send Request" onPress={handleConnect} loading={connecting} style={styles.modalBtn} />
            <TouchableOpacity onPress={() => setConnectModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 },
  connectBtn: { paddingHorizontal: 16, paddingVertical: 8, minWidth: 80 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalBtn: { marginTop: 8 },
  cancelBtn: { marginTop: 16, alignItems: 'center' },
  cancelText: { color: '#FF3B30', fontSize: 16, fontWeight: '500' }
});
