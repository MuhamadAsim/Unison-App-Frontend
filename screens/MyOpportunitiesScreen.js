import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyOpportunities, deleteOpportunity } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5', primarySoft: '#EEF2FF', primaryBorder: '#C7D2FE',
  bg: '#F8F8FC', card: '#FFFFFF', text: '#0F0F23', subtext: '#4B5563', muted: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6',
  green: '#059669', greenSoft: '#D1FAE5',
  amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  coral: '#DC2626', coralSoft: '#FEE2E2',
};

export default function MyOpportunitiesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState([]);

  const loadOpp = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await getMyOpportunities();
      setOpportunities(res.data?.opportunities || res.data || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOpp();
    }, [])
  );

  const handleDelete = (id) => {
    Alert.alert('Delete Opportunity', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await deleteOpportunity(id);
            // Optimistic removal
            setOpportunities(prev => prev.filter(o => o.id !== id));
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
          }
        }
      }
    ]);
  };

  const renderCard = (opp) => {
    const isJob = opp.type?.toLowerCase() === 'job';
    const isInternship = opp.type?.toLowerCase() === 'internship';
    let badgeColor = C.blue;
    let badgeBg = C.blueSoft;
    
    if (isJob) { badgeColor = C.primary; badgeBg = C.primarySoft; }
    else if (isInternship) { badgeColor = C.amber; badgeBg = C.amberSoft; }

    const isOpen = opp.status !== 'closed';

    return (
      <View key={opp.id} style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.title} numberOfLines={1}>{opp.title}</Text>
          <View style={[s.statusBadge, { backgroundColor: isOpen ? C.greenSoft : C.coralSoft }]}>
            <Text style={[s.statusText, { color: isOpen ? C.green : C.coral }]}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
          </View>
        </View>

        <Text style={s.company}>{opp.company_name}</Text>

        <View style={s.metaRow}>
          <View style={[s.typeBadge, { backgroundColor: badgeBg }]}>
            <Text style={[s.typeText, { color: badgeColor }]}>
              {opp.type ? opp.type.toUpperCase() : 'OTHER'}
            </Text>
          </View>
          <Text style={s.dateText}>
            Posted: {new Date(opp.created_at || new Date()).toLocaleDateString()}
          </Text>
        </View>
        
        {opp.deadline && (
          <Text style={s.deadlineText}>Deadline: {new Date(opp.deadline).toLocaleDateString()}</Text>
        )}

        <View style={s.actionsRow}>
          <TouchableOpacity 
            style={[s.actionBtn, s.editBtn]} 
            onPress={() => navigation.navigate('EditOpportunity', { opportunity: opp })}
          >
            <Ionicons name="pencil" size={moderateScale(16)} color={C.text} />
            <Text style={s.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.actionBtn, s.deleteBtn]} 
            onPress={() => handleDelete(opp.id)}
          >
            <Ionicons name="trash-outline" size={moderateScale(16)} color={C.coral} />
            <Text style={[s.actionText, { color: C.coral }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Opportunities</Text>
      </View>

      {loading && !refreshing ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOpp(true)} tintColor={C.primary} />}
        >
          {opportunities.length > 0 ? (
            opportunities.map(renderCard)
          ) : (
            <View style={s.emptyContainer}>
              <Ionicons name="briefcase-outline" size={moderateScale(60)} color={C.muted} />
              <Text style={s.emptyTitle}>You haven't posted any opportunities yet</Text>
              <Text style={s.emptySubtext}>Share jobs or internships with your network.</Text>
              <TouchableOpacity 
                style={s.postBtn}
                onPress={() => navigation.navigate('PostOpportunity')}
              >
                <Text style={s.postBtnText}>Post an Opportunity</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      {opportunities.length > 0 && (
        <TouchableOpacity 
          style={s.fab}
          onPress={() => navigation.navigate('PostOpportunity')}
        >
          <Ionicons name="add" size={moderateScale(32)} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: verticalScale(60), paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(15),
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center'
  },
  headerTitle: { fontSize: moderateScale(24), fontWeight: 'bold', color: C.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: moderateScale(20), paddingBottom: verticalScale(80) },
  card: { backgroundColor: C.card, borderRadius: moderateScale(12), padding: moderateScale(16), marginBottom: moderateScale(16), borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: moderateScale(8) },
  title: { fontSize: moderateScale(16), fontWeight: '600', color: C.text, flex: 1, marginRight: moderateScale(12) },
  statusBadge: { paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(4), borderRadius: moderateScale(6) },
  statusText: { fontSize: moderateScale(10), fontWeight: '700' },
  company: { fontSize: moderateScale(14), color: C.subtext, marginBottom: moderateScale(12) },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: moderateScale(8) },
  typeBadge: { paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(4), borderRadius: moderateScale(6) },
  typeText: { fontSize: moderateScale(10), fontWeight: '700' },
  dateText: { fontSize: moderateScale(12), color: C.muted },
  deadlineText: { fontSize: moderateScale(12), color: C.coral, marginBottom: moderateScale(16), fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: moderateScale(12), borderTopWidth: 1, borderTopColor: C.divider, paddingTop: moderateScale(16), marginTop: moderateScale(8) },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: moderateScale(10), borderRadius: moderateScale(8), borderWidth: 1, gap: moderateScale(6) },
  editBtn: { backgroundColor: C.bg, borderColor: C.border },
  deleteBtn: { backgroundColor: C.coralSoft, borderColor: C.coralSoft },
  actionText: { fontSize: moderateScale(14), fontWeight: '600', color: C.text },
  emptyContainer: { alignItems: 'center', paddingTop: verticalScale(60) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '600', color: C.text, marginTop: moderateScale(16), marginBottom: moderateScale(8), textAlign: 'center' },
  emptySubtext: { fontSize: moderateScale(14), color: C.subtext, textAlign: 'center', paddingHorizontal: moderateScale(20), marginBottom: moderateScale(24) },
  postBtn: { backgroundColor: C.primary, paddingHorizontal: moderateScale(24), paddingVertical: moderateScale(14), borderRadius: moderateScale(12) },
  postBtnText: { color: '#FFF', fontSize: moderateScale(16), fontWeight: '600' },
  fab: { position: 'absolute', bottom: moderateScale(30), right: moderateScale(30), backgroundColor: C.primary, width: moderateScale(60), height: moderateScale(60), borderRadius: moderateScale(30), alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }
});
