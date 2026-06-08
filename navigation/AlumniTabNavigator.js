import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

import AlumniHomeScreen from '../screens/Alumni/AlumniHomeScreen';
import AlumniOpportunitiesScreen from '../screens/Alumni/AlumniOpportunitiesScreen';
import AlumniProfileScreen from '../screens/Alumni/AlumniProfileScreen';
import ConnectionScreen from '../screens/Shared/ConnectionScreen';
import SearchScreen from '../screens/Shared/SearchScreen';

const Tab = createBottomTabNavigator();

const ACTIVE_COLOR = '#534AB7';
const INACTIVE_COLOR = '#9CA3AF';
const ICON_SIZE = 24;
const TAB_BAR_HEIGHT = 60;

export default function AlumniTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
        tabBarIconStyle: styles.icon,
      }}
    >
      <Tab.Screen
        name="Home"
        component={AlumniHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={ICON_SIZE} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }) => (
            <Ionicons name="search-outline" size={ICON_SIZE} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Network"
        component={ConnectionScreen}
        options={{
          tabBarLabel: 'Network',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={ICON_SIZE} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Opportunities"
        component={AlumniOpportunitiesScreen}
        options={{
          tabBarLabel: 'Opportunities',
          tabBarIcon: ({ color }) => (
            <Ionicons name="briefcase-outline" size={ICON_SIZE} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={AlumniProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
    height: TAB_BAR_HEIGHT,
    paddingTop: 1,
    paddingBottom: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  icon: {
    marginBottom: -2,
  },
});