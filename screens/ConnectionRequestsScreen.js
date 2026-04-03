import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions, ActivityIndicator, Alert, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getConnectionRequests, respondToConnection } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', bg: '#F8F8FC', card: '#FFFFFF',
  text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6',
  green: '#059669', coral: '#DC2626',
};

const Avatar = ({ uri, name, size = moderateScale(50) }) => {
  if (uri && uri !== 'default.jpg') {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.divider }} resizeMode="cover" />;
  }
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.4, color: C.primary, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
};

export default function ConnectionRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await getConnectionRequests();
      setRequests(res.data?.requests || res.data || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  const handleRespond = async (senderId, action) => {
    try {
      await respondToConnection(senderId, { action });
      // Optimistic update
      setRequests(prev => prev.filter(r => r.sender_id !== senderId && r.user_id !== senderId && r.id !== senderId));
      if (action === 'accept') {
        Alert.alert('Success', 'Connection accepted!');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to respond');
      await loadRequests();
    }
  };

  const renderRequestCard = (req) => {
    // Determine the ID field (depends on backend structure, frequently sender_id or just id)
    const senderId = req.sender_id || req.id;
    return (
      <View key={req.id || senderId} style={s.card}>
        <View style={s.cardHeader}>
          <Avatar uri={req.profile_picture || req.sender_profile_picture} name={req.name || req.sender_name} />
          <View style={s.cardText}>
            <Text style={s.name}>{req.name || req.sender_name}</Text>
            {req.username && <Text style={s.username}>@{req.username || req.sender_username}</Text>}
            <View style={s.typeWrap}>
              <Text style={s.typeText}>Requested as {req.connection_type}</Text>
            </View>
          </View>
        </View>
        
        <View style={s.actionsRow}>
          <TouchableOpacity 
            style={[s.actionBtn, s.rejectBtn]} 
            onPress={() => handleRespond(senderId, 'reject')}
          >
            <Text style={s.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.actionBtn, s.acceptBtn]} 
            onPress={() => handleRespond(senderId, 'accept')}
          >
            <Text style={s.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={moderateScale(24)} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Connection Requests</Text>
      </View>

      {loading && !refreshing ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRequests(true)} />}
        >
          {requests.length > 0 ? (
            requests.map(renderRequestCard)
          ) : (
            <View style={s.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={moderateScale(60)} color={C.muted} />
              <Text style={s.emptyTitle}>You're all caught up!</Text>
              <Text style={s.emptySubtext}>No pending connection requests.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: verticalScale(60), paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(15),
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { marginRight: moderateScale(15) },
  headerTitle: { fontSize: moderateScale(20), fontWeight: 'bold', color: C.text },
  listContent: { padding: moderateScale(20) },
  card: { backgroundColor: C.card, borderRadius: moderateScale(12), padding: moderateScale(16), marginBottom: moderateScale(15), borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(16) },
  cardText: { flex: 1, marginLeft: moderateScale(12) },
  name: { fontSize: moderateScale(16), fontWeight: '600', color: C.text },
  username: { fontSize: moderateScale(13), color: C.subtext, marginTop: moderateScale(2) },
  typeWrap: { marginTop: moderateScale(6), alignSelf: 'flex-start', backgroundColor: '#EEF2FF', paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(4), borderRadius: moderateScale(6) },
  typeText: { fontSize: moderateScale(11), color: C.primary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: moderateScale(10) },
  actionBtn: { flex: 1, paddingVertical: moderateScale(12), borderRadius: moderateScale(8), alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
  rejectText: { color: C.coral, fontWeight: '600', fontSize: moderateScale(14) },
  acceptBtn: { backgroundColor: C.green },
  acceptText: { color: '#FFF', fontWeight: '600', fontSize: moderateScale(14) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: verticalScale(80) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '600', color: C.text, marginTop: moderateScale(16), marginBottom: moderateScale(8) },
  emptySubtext: { fontSize: moderateScale(14), color: C.subtext },
});
