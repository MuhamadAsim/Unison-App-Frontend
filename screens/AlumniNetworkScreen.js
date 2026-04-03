import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions, ActivityIndicator, Alert, Modal, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getNetwork, getBatchmates, getConnectionStatus,
  connectUser, removeConnection
} from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', primarySoft: '#EEF2FF', primaryBorder: '#C7D2FE',
  bg: '#F8F8FC', card: '#FFFFFF', text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6',
  green: '#059669', amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', coral: '#DC2626', coralSoft: '#FEE2E2',
};

const Avatar = ({ uri, name, size = moderateScale(50) }) => {
  if (uri && uri !== 'default.jpg') {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.divider }} resizeMode="cover" />;
  }
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.4, color: C.primary, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
};

export default function AlumniNetworkScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('network'); // 'network' | 'batchmates'
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const [network, setNetwork] = useState([]);
  const [batchmates, setBatchmates] = useState([]);
  
  // Maps user id -> connection status info
  const [connectionStatuses, setConnectionStatuses] = useState({});

  // Connect Picker Modal
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [connectSubmitting, setConnectSubmitting] = useState(false);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      if (activeTab === 'network') {
        const res = await getNetwork();
        setNetwork(res.data?.connections || res.data || []);
      } else {
        const res = await getBatchmates();
        const b = res.data?.batchmates || res.data || [];
        setBatchmates(b);
        await fetchConnectionStatuses(b);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load network');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab])
  );

  const fetchConnectionStatuses = async (users) => {
    if (!users || users.length === 0) return;
    setStatusLoading(true);
    try {
      const promises = users.map(u => 
        getConnectionStatus(u.id)
          .then(res => ({ id: u.id, status: res.data?.status || null, is_sender: res.data?.is_sender || false }))
          .catch(() => ({ id: u.id, status: null, is_sender: false }))
      );
      const results = await Promise.all(promises);
      
      const newMap = { ...connectionStatuses };
      results.forEach(r => { newMap[r.id] = r; });
      setConnectionStatuses(newMap);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleOpenConnect = (targetId) => {
    setSelectedTargetId(targetId);
    setConnectModalVisible(true);
  };

  const handleSendConnect = async (type) => {
    if (!selectedTargetId) return;
    setConnectSubmitting(true);
    try {
      await connectUser(selectedTargetId, { connection_type: type });
      setConnectionStatuses(prev => ({
        ...prev,
        [selectedTargetId]: { status: 'pending', is_sender: true }
      }));
      setConnectModalVisible(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not send request');
    } finally {
      setConnectSubmitting(false);
    }
  };

  const handleRemoveConnection = (targetId) => {
    Alert.alert('Confirm', 'Are you sure you want to remove this connection?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await removeConnection(targetId);
          if (activeTab === 'network') {
            setNetwork(prev => prev.filter(p => (p.user_id || p.id) !== targetId));
          } else {
            setConnectionStatuses(prev => ({
              ...prev,
              [targetId]: { status: null, is_sender: false }
            }));
          }
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || 'Could not remove connection');
        }
      }}
    ]);
  };

  const handleCancelRequest = async (targetId) => {
    try {
      await removeConnection(targetId);
      setConnectionStatuses(prev => ({
        ...prev,
        [targetId]: { status: null, is_sender: false }
      }));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not cancel request');
    }
  };

  const renderNetworkCard = (user) => {
    const roleText = user.current_role && user.company ? `${user.current_role} @ ${user.company}` : (user.current_role || user.company || 'Alumni');
    
    return (
      <View key={user.id} style={s.card}>
        <View style={s.cardContent}>
          <TouchableOpacity onPress={() => navigation.navigate('AlumniPublicProfile', { id: user.id })}>
            <Avatar uri={user.profile_picture} name={user.name || user.display_name} />
          </TouchableOpacity>
          <View style={s.cardText}>
            <Text style={s.userName}>{user.name || user.display_name}</Text>
            <Text style={s.userRole}>{roleText}</Text>
            {user.connection_type && (
              <View style={s.connTypeBadge}>
                <Text style={s.connTypeText}>{user.connection_type.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={s.removeBtn} 
            onPress={() => handleRemoveConnection(user.user_id || user.id)}
          >
            <Ionicons name="person-remove" size={moderateScale(18)} color={C.coral} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBatchmateCard = (user) => {
    const roleText = user.current_role && user.company ? `${user.current_role} @ ${user.company}` : (user.current_role || user.company || 'Alumni');
    const cStatus = connectionStatuses[user.id];

    return (
      <View key={user.id} style={s.card}>
        <View style={s.cardContent}>
          <TouchableOpacity onPress={() => navigation.navigate('AlumniPublicProfile', { id: user.id })}>
            <Avatar uri={user.profile_picture} name={user.name || user.display_name} />
          </TouchableOpacity>
          <View style={s.cardText}>
            <Text style={s.userName}>{user.name || user.display_name}</Text>
            <Text style={s.userRole}>{roleText}</Text>
          </View>
          
          <View style={s.actionContainer}>
            {statusLoading && !cStatus ? (
              <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 10 }} />
            ) : cStatus?.status === 'connected' ? (
              <TouchableOpacity style={s.disconnectBtn} onPress={() => handleRemoveConnection(user.id)}>
                <Text style={s.disconnectText}>Connected</Text>
              </TouchableOpacity>
            ) : cStatus?.status === 'pending' ? (
              <TouchableOpacity style={s.pendingBtn} onPress={() => handleCancelRequest(user.id)}>
                <Text style={s.pendingText}>{cStatus.is_sender ? 'Requested' : 'Respond'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.connectBtn} onPress={() => handleOpenConnect(user.id)}>
                <Text style={s.connectText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Header and Request Badge */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Network</Text>
        <TouchableOpacity 
          style={s.reqBell} 
          onPress={() => navigation.navigate('ConnectionRequestsScreen')}
        >
          <Ionicons name="person-add" size={moderateScale(24)} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        <TouchableOpacity 
          style={[s.tabItem, activeTab === 'network' && s.tabItemActive]}
          onPress={() => setActiveTab('network')}
        >
          <Text style={[s.tabText, activeTab === 'network' && s.tabTextActive]}>My Network</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.tabItem, activeTab === 'batchmates' && s.tabItemActive]}
          onPress={() => setActiveTab('batchmates')}
        >
          <Text style={[s.tabText, activeTab === 'batchmates' && s.tabTextActive]}>Batch Mates</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading && !refreshing && !statusLoading ? (
        <View style={s.centerItem}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <ScrollView 
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.primary} />}
        >
          {activeTab === 'network' ? (
            network.length > 0 ? network.map(renderNetworkCard) : (
              <View style={s.emptyContainer}>
                <Ionicons name="people-outline" size={moderateScale(48)} color={C.muted} />
                <Text style={s.emptyTitle}>Your network is empty</Text>
                <Text style={s.emptySubtext}>Connect with batch mates to grow your network.</Text>
              </View>
            )
          ) : (
            batchmates.length > 0 ? batchmates.map(renderBatchmateCard) : (
              <View style={s.emptyContainer}>
                <Ionicons name="school-outline" size={moderateScale(48)} color={C.muted} />
                <Text style={s.emptyTitle}>No batch mates found</Text>
                <Text style={s.emptySubtext}>We couldn't find anyone from your batch.</Text>
              </View>
            )
          )}
        </ScrollView>
      )}

      {/* Connect Picker Modal */}
      <Modal visible={connectModalVisible} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>How do you know them?</Text>
            
            {['batchmate', 'colleague', 'mentor'].map(type => (
              <TouchableOpacity 
                key={type} 
                style={s.typeSelectBtn}
                onPress={() => handleSendConnect(type)}
                disabled={connectSubmitting}
              >
                <Text style={s.typeSelectText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              style={s.modalCancelBtn} 
              onPress={() => setConnectModalVisible(false)}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>

            {connectSubmitting && <ActivityIndicator style={{ marginTop: 15 }} color={C.primary} />}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: verticalScale(60), paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(15), 
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border 
  },
  headerTitle: { fontSize: moderateScale(24), fontWeight: 'bold', color: C.text },
  reqBell: { padding: moderateScale(8) },
  tabsRow: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tabItem: { flex: 1, paddingVertical: moderateScale(15), alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: C.primary },
  tabText: { fontSize: moderateScale(15), fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },
  listContent: { padding: moderateScale(20) },
  card: { backgroundColor: C.card, borderRadius: moderateScale(12), padding: moderateScale(16), marginBottom: moderateScale(12), borderWidth: 1, borderColor: C.border },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardText: { flex: 1, marginLeft: moderateScale(12) },
  userName: { fontSize: moderateScale(16), fontWeight: '600', color: C.text, marginBottom: moderateScale(4) },
  userRole: { fontSize: moderateScale(13), color: C.subtext },
  connTypeBadge: { alignSelf: 'flex-start', backgroundColor: C.primarySoft, paddingHorizontal: moderateScale(6), paddingVertical: moderateScale(2), borderRadius: moderateScale(4), marginTop: moderateScale(6) },
  connTypeText: { fontSize: moderateScale(10), color: C.primary, fontWeight: '700' },
  removeBtn: { padding: moderateScale(8), backgroundColor: C.coralSoft, borderRadius: moderateScale(8) },
  actionContainer: { marginLeft: moderateScale(8) },
  connectBtn: { backgroundColor: C.primarySoft, borderColor: C.primaryBorder, borderWidth: 1, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(8), borderRadius: moderateScale(8) },
  connectText: { color: C.primaryDark, fontWeight: '600', fontSize: moderateScale(13) },
  pendingBtn: { backgroundColor: C.amberSoft, borderColor: C.amber, borderWidth: 1, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(8), borderRadius: moderateScale(8) },
  pendingText: { color: C.amber, fontWeight: '600', fontSize: moderateScale(13) },
  disconnectBtn: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', borderWidth: 1, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(8), borderRadius: moderateScale(8) },
  disconnectText: { color: '#4B5563', fontWeight: '600', fontSize: moderateScale(13) },
  emptyContainer: { alignItems: 'center', paddingTop: verticalScale(60) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '600', color: C.text, marginTop: moderateScale(16), marginBottom: moderateScale(8) },
  emptySubtext: { fontSize: moderateScale(14), color: C.subtext, textAlign: 'center' },
  centerItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: moderateScale(20) },
  modalContent: { backgroundColor: C.card, borderRadius: moderateScale(16), padding: moderateScale(24), width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.text, marginBottom: moderateScale(20) },
  typeSelectBtn: { width: '100%', backgroundColor: C.primarySoft, padding: moderateScale(16), borderRadius: moderateScale(12), marginBottom: moderateScale(12), alignItems: 'center', borderWidth: 1, borderColor: C.primaryBorder },
  typeSelectText: { fontSize: moderateScale(16), fontWeight: '600', color: C.primaryDark },
  modalCancelBtn: { marginTop: moderateScale(10), padding: moderateScale(12) },
  modalCancelText: { fontSize: moderateScale(16), color: C.muted, fontWeight: '600' }
});
