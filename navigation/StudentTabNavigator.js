import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

import ConnectionScreen from '../screens/Shared/ConnectionScreen';
import OpportunitiesListScreen from '../screens/Shared/OpportunitiesListScreen';
import SearchScreen from '../screens/Shared/SearchScreen';
import StudentHomeScreen from '../screens/Student/StudentHomeScreen';
import StudentProfileScreen from '../screens/Student/StudentProfileScreen';

const Tab = createBottomTabNavigator();

// ─── Easy to customize ────────────────────────────────────────────────────────
const ACTIVE_COLOR = '#534AB7';   // color of active tab icon + label
const INACTIVE_COLOR = '#9CA3AF';   // color of inactive tab icon + label
const ICON_SIZE = 24;          // icon size in pixels
const TAB_BAR_HEIGHT = 60;          // total height of the bottom bar
// ─────────────────────────────────────────────────────────────────────────────

export default function StudentTabNavigator() {
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
        component={StudentHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={ICON_SIZE} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="OpportunitiesList"
        component={OpportunitiesListScreen}
        options={{
          tabBarLabel: 'Posts',
          tabBarIcon: ({ color }) => (
            <Ionicons name="briefcase-outline" size={ICON_SIZE} color={color} />
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
        name="StudentProfile"
        component={StudentProfileScreen}
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