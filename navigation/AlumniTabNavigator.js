import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

// Import your screens
import AlumniHomeScreen from '../screens/AlumniHomeScreen';
// import NetworkScreen       from '../screens/NetworkScreen';       // add when built
// import BatchmatesScreen    from '../screens/BatchmatesScreen';    // add when built
// import SearchScreen        from '../screens/SearchScreen';        // add when built
// import AlumniProfileScreen from '../screens/AlumniProfileScreen'; // add when built

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, label, focused }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: focused ? '600' : '400',
          color: focused ? '#534AB7' : '#9CA3AF',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function PlaceholderScreen({ route }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F8' }}>
      <Text style={{ fontSize: 32 }}>🚧</Text>
      <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>
        {route.name} — coming soon
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
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E8E8F0',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   '#534AB7',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
    >
      <Tab.Screen
        name="Home"
        component={AlumniHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Network"
        // component={NetworkScreen}
        component={PlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌐" label="Network" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Opportunities"
        component={PlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💼" label="Jobs" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Search"
        // component={SearchScreen}
        component={PlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔍" label="Search" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        // component={AlumniProfileScreen}
        component={PlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}