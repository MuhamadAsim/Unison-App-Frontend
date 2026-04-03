import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import {
  getAlumniProfile,
  getOpportunities,
  getNetwork,
  getMyOpportunities
} from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const C = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg: '#F8F8FC',
  card: '#FFFFFF',
  text: '#0F0F23',
  subtext: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  green: '#059669', greenSoft: '#D1FAE5',
  amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  coral: '#DC2626', coralSoft: '#FEE2E2',
};

// Fallback Avatar Component
const Avatar = ({ uri, name, size = moderateScale(50) }) => {
  if (uri && uri !== 'default.jpg') {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: C.divider,
        }}
        resizeMode="cover"
      />
    );
  }
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.4, color: C.primary, fontWeight: '700' }}>
        {initial}
      </Text>
    </View>
  );
};

export default function AlumniHomeScreen({ navigation }) {
  const { userData, logout } = useContext(AuthContext);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profileData, setProfileData] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState({ connections: 0, posts: 0 });

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [profileRes, oppRes, networkRes, myOppRes] = await Promise.allSettled([
        getAlumniProfile(),
        getOpportunities({ limit: 5 }),
        getNetwork(),
        getMyOpportunities()
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfileData(profileRes.value.data?.profile || profileRes.value.data);
      }
      if (oppRes.status === 'fulfilled') {
        setOpportunities(oppRes.value.data?.opportunities || oppRes.value.data || []);
      }
      
      const connCount = networkRes.status === 'fulfilled' 
        ? (networkRes.value.data?.connections?.length || networkRes.value.data?.length || 0)
        : 0;
      
      const postCount = myOppRes.status === 'fulfilled'
        ? (myOppRes.value.data?.opportunities?.length || myOppRes.value.data?.length || 0)
        : 0;

      setStats({ connections: connCount, posts: postCount });

    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Something went wrong while loading data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const renderOpportunityCard = (opp) => {
    const isJob = opp.type?.toLowerCase() === 'job';
    const isInternship = opp.type?.toLowerCase() === 'internship';
    let badgeColor = C.blue;
    let badgeBg = C.blueSoft;
    
    if (isJob) { badgeColor = C.primary; badgeBg = C.primarySoft; }
    else if (isInternship) { badgeColor = C.amber; badgeBg = C.amberSoft; }

    return (
      <TouchableOpacity 
        key={opp.id} 
        style={s.oppCard}
        onPress={() => navigation.navigate('OpportunityDetail', { id: opp.id })}
      >
        <View style={s.oppHeader}>
          <Text style={s.oppTitle} numberOfLines={1}>{opp.title}</Text>
          <View style={[s.badge, { backgroundColor: badgeBg }]}>
            <Text style={[s.badgeText, { color: badgeColor }]}>
              {opp.type ? opp.type.toUpperCase() : 'OTHER'}
            </Text>
          </View>
        </View>
        
        <View style={s.oppDetailsRow}>
          <Ionicons name="business-outline" size={moderateScale(14)} color={C.subtext} />
          <Text style={s.oppCompany} numberOfLines={1}>{opp.company_name}</Text>
        </View>

        {opp.deadline && (
          <View style={s.oppDetailsRow}>
            <Ionicons name="calendar-outline" size={moderateScale(14)} color={C.subtext} />
            <Text style={s.oppDeadline}>
              Deadline: {new Date(opp.deadline).toLocaleDateString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const displayName = profileData?.display_name || userData?.display_name || userData?.name || 'Alumni';
  const profilePic = profileData?.profile_picture || userData?.profile_picture;

  return (
    <ScrollView 
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.primary} />}
    >
      <View style={s.header}>
        <View style={s.headerTextContainer}>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.name}>{displayName}</Text>
        </View>
        <Avatar uri={profilePic} name={displayName} />
      </View>

      {/* Stats Row */}
      <View style={s.statsContainer}>
        <View style={s.statCard}>
          <Text style={s.statNumber}>{stats.connections}</Text>
          <Text style={s.statLabel}>Connections</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNumber}>{stats.posts}</Text>
          <Text style={s.statLabel}>Posts</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={s.actionRow}>
        <TouchableOpacity 
          style={s.actionBtn} 
          onPress={() => navigation.navigate('PostOpportunity')}
        >
          <Ionicons name="add-circle" size={moderateScale(24)} color={C.primary} />
          <Text style={s.actionBtnText}>Post Opportunity</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={s.actionBtn} 
          onPress={() => navigation.navigate('Network')}
        >
          <Ionicons name="people" size={moderateScale(24)} color={C.primary} />
          <Text style={s.actionBtnText}>Browse Network</Text>
        </TouchableOpacity>
      </View>

      {/* Feed Section */}
      <View style={s.feedSection}>
        <Text style={s.sectionTitle}>Recent Opportunities</Text>
        
        {opportunities.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="briefcase-outline" size={moderateScale(48)} color={C.muted} />
            <Text style={s.emptyTitle}>No Opportunities Yet</Text>
            <Text style={s.emptySubtext}>Check back later or post your own.</Text>
          </View>
        ) : (
          opportunities.map(renderOpportunityCard)
        )}
      </View>

      {/* Temporary Logout for convenience */}
      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={moderateScale(20)} color={C.coral} />
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
      
      <View style={{ height: moderateScale(40) }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: moderateScale(20),
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: moderateScale(14),
    color: C.subtext,
    fontFamily: 'System',
    marginBottom: moderateScale(4),
  },
  name: {
    fontSize: moderateScale(22),
    color: C.text,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: moderateScale(20),
    gap: moderateScale(15),
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: C.primary,
    marginBottom: moderateScale(4),
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: C.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(20),
    gap: moderateScale(15),
    marginBottom: moderateScale(20),
  },
  actionBtn: {
    flex: 1,
    backgroundColor: C.primarySoft,
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: moderateScale(8),
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  actionBtnText: {
    color: C.primaryDark,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  feedSection: {
    paddingHorizontal: moderateScale(20),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.text,
    marginBottom: moderateScale(16),
  },
  oppCard: {
    backgroundColor: C.card,
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  oppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: moderateScale(12),
  },
  oppTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: C.text,
    flex: 1,
    marginRight: moderateScale(12),
  },
  badge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
  },
  badgeText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  oppDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(6),
    gap: moderateScale(6),
  },
  oppCompany: {
    fontSize: moderateScale(14),
    color: C.subtext,
    flex: 1,
  },
  oppDeadline: {
    fontSize: moderateScale(13),
    color: C.muted,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: moderateScale(40),
    backgroundColor: C.card,
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: C.text,
    marginTop: moderateScale(12),
    marginBottom: moderateScale(4),
  },
  emptySubtext: {
    fontSize: moderateScale(14),
    color: C.subtext,
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(16),
    marginTop: moderateScale(20),
    marginHorizontal: moderateScale(20),
    backgroundColor: C.coralSoft,
    borderRadius: moderateScale(12),
    gap: moderateScale(8),
  },
  logoutText: {
    color: C.coral,
    fontWeight: '600',
    fontSize: moderateScale(15),
  }
});