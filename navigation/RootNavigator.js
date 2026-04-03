import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useContext } from 'react';

import { AuthContext } from '../context/AuthContext';

// ── Shared / Student / Auth Screens ───────────────────────────────────────────
import BatchmatesScreen from '../screens/BatchmatesScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import EditStudentProfileScreen from '../screens/EditStudentProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import NetworkAnalyticsScreen from '../screens/NetworkAnalyticsScreen';
import NetworkScreen from '../screens/NetworkScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SendOTPScreen from '../screens/SendOTPScreen';
import SkillsScreen from '../screens/SkillsScreen';
import SplashScreen from '../screens/SplashScreen';
import StudentProfileScreen from '../screens/StudentProfileScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import WorkExperienceScreen from '../screens/WorkExperienceScreen';
import SearchScreen from '../screens/SearchScreen';

// ── Alumni Screens ────────────────────────────────────────────────────────────
import AlumniTabNavigator from './AlumniTabNavigator';
import StudentTabNavigator from './StudentTabNavigator';

import PostOpportunityScreen from '../screens/PostOpportunityScreen';
import EditOpportunityScreen from '../screens/EditOpportunityScreen';
import OpportunityDetailScreen from '../screens/OpportunityDetailScreen';
import EditAlumniProfileScreen from '../screens/EditAlumniProfileScreen';
import ConnectionRequestsScreen from '../screens/ConnectionRequestsScreen';
import AlumniPublicProfileScreen from '../screens/AlumniPublicProfileScreen';

const Stack = createNativeStackNavigator();

// ── Auth stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SendOTP" component={SendOTPScreen} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

// ── Student app stack ─────────────────────────────────────────────────────────
function StudentAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={StudentTabNavigator} />
      <Stack.Screen name="StudentProfile" component={StudentProfileScreen} options={{ headerShown: true, title: 'Student Profile' }} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NetworkAnalytics" component={NetworkAnalyticsScreen} options={{ headerShown: true, title: 'Network Analytics' }} />
      <Stack.Screen name="AlumniPublicProfile" component={AlumniPublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ── Alumni app stack ──────────────────────────────────────────────────────────
function AlumniAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AlumniTabNavigator} />
      
      {/* Push screens */}
      <Stack.Screen name="PostOpportunity" component={PostOpportunityScreen} options={{ headerShown: true, title: 'Post Opportunity' }} />
      <Stack.Screen name="EditOpportunity" component={EditOpportunityScreen} options={{ headerShown: true, title: 'Edit Opportunity' }} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditAlumniProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
      <Stack.Screen name="ConnectionRequestsScreen" component={ConnectionRequestsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AlumniPublicProfile" component={AlumniPublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NetworkAnalytics" component={NetworkAnalyticsScreen} options={{ headerShown: true, title: 'Network Analytics' }} />
    </Stack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { isLoading, userToken, userData } = useContext(AuthContext);

  if (isLoading) {
    return <SplashScreen />;
  }

  const isValidUser = userToken && userData && userData.role && userData.id;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isValidUser ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : userData.role === 'student' ? (
          <Stack.Screen name="StudentApp" component={StudentAppStack} />
        ) : (
          <Stack.Screen name="AlumniApp" component={AlumniAppStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}