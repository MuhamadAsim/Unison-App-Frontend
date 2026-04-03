import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AlumniHomeScreen from '../screens/AlumniHomeScreen';
import AlumniNetworkScreen from '../screens/AlumniNetworkScreen';
import MyOpportunitiesScreen from '../screens/MyOpportunitiesScreen';
import AlumniNotificationsScreen from '../screens/AlumniNotificationsScreen';
import AlumniProfileScreen from '../screens/AlumniProfileScreen';

const Tab = createBottomTabNavigator();

const C = {
  primary: '#4F46E5',
  muted: '#9CA3AF',
  bg: '#FFFFFF',
  border: '#E8E8F0',
};

function TabIcon({ name, label, focused }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Ionicons 
        name={name} 
        size={24} 
        color={focused ? C.primary : C.muted} 
      />
      <Text
        style={{
          fontSize: 10,
          fontWeight: focused ? '600' : '400',
          color: focused ? C.primary : C.muted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AlumniTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopWidth: 1,
          borderTopColor: C.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={AlumniHomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} label="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Network"
        component={AlumniNetworkScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} label="Network" focused={focused} /> }}
      />
      <Tab.Screen
        name="Opportunities"
        component={MyOpportunitiesScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} label="Jobs" focused={focused} /> }}
      />
      <Tab.Screen
        name="Notifications"
        component={AlumniNotificationsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'notifications' : 'notifications-outline'} label="Alerts" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={AlumniProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} label="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}