import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMyOpportunities, deleteOpportunity } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ListItem from '../components/ListItem';
import Button from '../components/Button';

export default function MyOpportunitiesScreen({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await getMyOpportunities();
      setPosts(res.data || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPosts(); }, []));

  const handleDelete = async (id) => {
    try {
      await deleteOpportunity(id);
      fetchPosts();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to delete');
    }
  };

  if (userData?.role !== 'alumni') return <View style={styles.center}><Text>Unauthorized</Text></View>;
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={i => String(i.id)}
        ListEmptyComponent={<Text style={styles.empty}>No posts found.</Text>}
        renderItem={({ item }) => (
          <ListItem
            title={item.title}
            subtitle={`${item.type} • Deadline: ${item.deadline ? item.deadline.substring(0,10) : 'N/A'}`}
            rightElement={
              <Button title="Delete" onPress={() => handleDelete(item.id)} style={styles.deleteBtn} />
            }
          />
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#F7F7F7', padding: 16 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, empty: { textAlign: 'center', color: '#888', marginTop: 40 }, deleteBtn: { backgroundColor: '#FF3B30' } });
