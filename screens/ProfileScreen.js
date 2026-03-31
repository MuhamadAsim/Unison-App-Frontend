import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getAlumniProfile } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';

export default function ProfileScreen({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await getAlumniProfile(userData?.id);
      setProfile(res.data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (userData?.id) {
        fetchProfile();
      }
    }, [userData?.id])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>Profile not found or error loading.</Text>
        <Button title="Retry" onPress={fetchProfile} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.name}>{profile.name || userData?.name}</Text>
        <Text style={styles.text}>{profile.email || userData?.email}</Text>
        {profile.company && profile.role && (
          <Text style={styles.boldText}>{profile.role} at {profile.company}</Text>
        )}
        <Text style={[styles.text, styles.marginTop]}>{profile.bio || 'No bio provided'}</Text>
        {profile.degree && <Text style={styles.text}>{profile.degree} - {profile.graduation_year}</Text>}
        {profile.linkedin_url && (
            <Text style={styles.linkText}>{profile.linkedin_url}</Text>
        )}
        <Text style={styles.marginTop}>Connections: {profile.connections_count || 0}</Text>
        <Button 
          title="Edit Profile" 
          onPress={() => navigation.navigate('EditProfile', { profile })} 
          style={styles.btn} 
        />
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Work Experience</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkExperience', { experiences: profile.work_experiences })}>
            <Text style={styles.linkText}>Manage</Text>
          </TouchableOpacity>
        </View>
        {(profile.work_experiences || []).length === 0 && <Text style={styles.subText}>No work experiences added.</Text>}
        {(profile.work_experiences || []).map((exp, index) => (
          <View key={exp.id || index} style={styles.item}>
            <Text style={styles.boldText}>{exp.role}</Text>
            <Text>{exp.company_name}</Text>
            <Text style={styles.subText}>{exp.start_date?.substring(0, 10)} to {exp.is_current ? 'Present' : (exp.end_date?.substring(0, 10) || 'N/A')}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Skills', { skills: profile.skills })}>
            <Text style={styles.linkText}>Manage</Text>
          </TouchableOpacity>
        </View>
        {(profile.skills || []).length === 0 && <Text style={styles.subText}>No skills added.</Text>}
        {(profile.skills || []).map((skill, index) => (
          <View key={skill.id || index} style={styles.item}>
            <Text style={styles.boldText}>{skill.skill_name}</Text>
            <Text style={styles.subText}>{skill.proficiency} • {skill.years_of_experience || 0} years exp</Text>
          </View>
        ))}
      </Card>
      
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    padding: 16,
  },
  center: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  boldText: {
    fontSize: 16,
    fontWeight: '600',
  },
  subText: {
    fontSize: 12,
    color: '#888',
  },
  marginTop: {
    marginTop: 12,
  },
  btn: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
  item: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  }
});
