import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions, ActivityIndicator, Alert, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markNotificationRead } from '../services/api';
import useNotificationSocket from '../hooks/useNotificationSocket';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', primarySoft: '#EEF2FF',
  bg: '#F8F8FC', card: '#FFFFFF', text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6', green: '#059669', blue: '#2563EB', amber: '#D97706'
};

const Avatar = ({ uri, size = moderateScale(40) }) => {
  if (uri && uri !== 'default.jpg') {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.divider }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="notifications" size={size * 0.5} color={C.primary} />
    </View>
  );
};

export default function AlumniNotificationsScreen({ navigation }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { newNotification } = useNotificationSocket();

  useEffect(() => {
    if (newNotification) {
      setNotifications(prev => {
        // Prepend new notification only if it isn't already there
        if (!prev.find(n => n.id === newNotification.id)) {
           return [newNotification, ...prev];
        }
        return prev;
      });
    }
  }, [newNotification]);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // The API structure doesn't strictly define the `?read=false` query signature in instructions,
      // but instructed to "call getNotifications() with ?read=false for unread tab"
      // Wait, let's just filter locally if the API doesn't support query params, but the prompt says:
      // "(call getNotifications() with ?read=false for unread tab)"
      // So we must manually pass it if our wrapper doesn't 
      // Our api.js: export const getNotifications = () => api.get('/notifications');
      // We will just filter locally for safety since api.js signature takes no params.
      
      const res = await getNotifications();
      let data = res.data?.notifications || res.data || [];
      if (filter === 'unread') {
        data = data.filter(n => !n.is_read);
      }
      setNotifications(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [filter])
  );

  const handlePress = async (notif) => {
    try {
      if (!notif.is_read) {
        await markNotificationRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      }

      switch (notif.type) {
        case 'connection_request':
          navigation.navigate('ConnectionRequestsScreen');
          break;
        case 'connection_accepted':
          navigation.navigate('Network');
          break;
        case 'new_opportunity':
          // Attempt to parse id from reference_link
          // Expected format: /opportunities/123
          const match = notif.reference_link?.match(/\/opportunities\/(\d+)/);
          if (match && match[1]) {
            navigation.navigate('OpportunityDetail', { id: match[1] });
          } else {
             navigation.navigate('MyOpportunitiesScreen'); // fallback
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.log('Error marking read', err);
    }
  };

  const renderItem = (notif) => {
    return (
      <TouchableOpacity 
        key={notif.id} 
        style={[s.card, !notif.is_read && s.cardUnread]}
        onPress={() => handlePress(notif)}
      >
        <Avatar uri={notif.sender_profile_picture} />
        <View style={s.cardText}>
          <Text style={[s.message, !notif.is_read && s.messageUnread]}>
            {notif.message}
          </Text>
          <Text style={s.time}>{new Date(notif.created_at || new Date()).toLocaleString()}</Text>
        </View>
        {!notif.is_read && <View style={s.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Notifications</Text>
      </View>

      <View style={s.tabsRow}>
        <TouchableOpacity style={[s.tab, filter === 'all' && s.tabActive]} onPress={() => setFilter('all')}>
          <Text style={[s.tabText, filter === 'all' && s.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, filter === 'unread' && s.tabActive]} onPress={() => setFilter('unread')}>
          <Text style={[s.tabText, filter === 'unread' && s.tabTextActive]}>Unread</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.primary} />}
        >
          {notifications.length > 0 ? (
            notifications.map(renderItem)
          ) : (
            <View style={s.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={moderateScale(48)} color={C.muted} />
              <Text style={s.emptyTitle}>No Notifications</Text>
              <Text style={s.emptySubtext}>We'll let you know when something new arrives.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: verticalScale(60), paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(15),
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border
  },
  headerTitle: { fontSize: moderateScale(24), fontWeight: 'bold', color: C.text },
  tabsRow: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: moderateScale(12), alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.primary },
  tabText: { fontSize: moderateScale(14), fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },
  listContent: { padding: moderateScale(20) },
  card: { backgroundColor: C.card, borderRadius: moderateScale(12), padding: moderateScale(16), marginBottom: moderateScale(12), flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  cardUnread: { backgroundColor: '#F5F8FA', borderLeftWidth: 4, borderLeftColor: C.primary },
  cardText: { flex: 1, marginLeft: moderateScale(12) },
  message: { fontSize: moderateScale(14), color: C.subtext, lineHeight: moderateScale(20) },
  messageUnread: { color: C.text, fontWeight: '600' },
  time: { fontSize: moderateScale(12), color: C.muted, marginTop: moderateScale(6) },
  unreadDot: { width: moderateScale(8), height: moderateScale(8), borderRadius: moderateScale(4), backgroundColor: C.primary, marginLeft: moderateScale(8) },
  emptyContainer: { alignItems: 'center', paddingTop: verticalScale(60) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '600', color: C.text, marginTop: moderateScale(16), marginBottom: moderateScale(8) },
  emptySubtext: { fontSize: moderateScale(14), color: C.subtext, textAlign: 'center' }
});
