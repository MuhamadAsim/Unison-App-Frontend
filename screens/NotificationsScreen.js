import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getNotifications, markNotificationRead } from '../services/api';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchNotes(); }, []));

  const handleRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      Alert.alert('Error', 'Could not mark as read');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={i => String(i.id)}
        ListEmptyComponent={<Text style={styles.empty}>No new notifications.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.item, !item.is_read && styles.unread]} 
            onPress={() => handleRead(item.id, item.is_read)}
            activeOpacity={0.7}
          >
            <Text style={[styles.message, !item.is_read && styles.unreadText]}>{item.message}</Text>
            <View style={styles.row}>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#F7F7F7' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, empty: { textAlign: 'center', color: '#888', marginTop: 40 }, item: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }, unread: { backgroundColor: '#EBF5FF' }, message: { fontSize: 16, color: '#333', marginBottom: 8 }, unreadText: { fontWeight: 'bold' }, row: { flexDirection: 'row', justifyContent: 'space-between' }, type: { fontSize: 12, color: '#007AFF', textTransform: 'uppercase', fontWeight: '500' }, date: { fontSize: 12, color: '#888' } });
