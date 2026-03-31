import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useContext } from 'react';

import { AuthContext } from '../context/AuthContext';

// ── Existing screens (unchanged) ──────────────────────────────────────────────
import BatchmatesScreen from '../screens/BatchmatesScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import EditStudentProfileScreen from '../screens/EditStudentProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import MyOpportunitiesScreen from '../screens/MyOpportunitiesScreen';
import NetworkAnalyticsScreen from '../screens/NetworkAnalyticsScreen';
import NetworkScreen from '../screens/NetworkScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OpportunityDetailScreen from '../screens/OpportunityDetailScreen';
import PostOpportunityScreen from '../screens/PostOpportunityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SendOTPScreen from '../screens/SendOTPScreen';
import SkillsScreen from '../screens/SkillsScreen';
import SplashScreen from '../screens/SplashScreen';
import StudentProfileScreen from '../screens/StudentProfileScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import WorkExperienceScreen from '../screens/WorkExperienceScreen';

// ── New tab navigators ────────────────────────────────────────────────────────
import AlumniTabNavigator from './AlumniTabNavigator';
import StudentTabNavigator from './StudentTabNavigator';

const Stack = createNativeStackNavigator();

// ── Auth stack (no change) ────────────────────────────────────────────────────
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
// The tab navigator is the root screen. All push screens sit on top of it,
// so navigating to them slides over the tab bar (correct UX).
function StudentAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Root: bottom tabs */}
      <Stack.Screen name="Tabs" component={StudentTabNavigator} />

      {/* Push screens — navigated to from inside tab screens */}
      <Stack.Screen name="StudentProfile" component={StudentProfileScreen} options={{ headerShown: true, title: 'Student Profile' }} />
      <Stack.Screen name="EditStudentProfile" component={EditStudentProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ headerShown: true, title: 'Opportunity Detail' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="NetworkAnalytics" component={NetworkAnalyticsScreen} options={{ headerShown: true, title: 'Network Analytics' }} />
    </Stack.Navigator>
  );
}

// ── Alumni app stack ──────────────────────────────────────────────────────────
function AlumniAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Root: bottom tabs */}
      <Stack.Screen name="Tabs" component={AlumniTabNavigator} />

      {/* Push screens */}
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
      <Stack.Screen name="WorkExperience" component={WorkExperienceScreen} options={{ headerShown: true, title: 'Work Experience' }} />
      <Stack.Screen name="Skills" component={SkillsScreen} options={{ headerShown: true, title: 'Skills' }} />
      <Stack.Screen name="Network" component={NetworkScreen} options={{ headerShown: true, title: 'My Network' }} />
      <Stack.Screen name="Batchmates" component={BatchmatesScreen} options={{ headerShown: true, title: 'Batchmates' }} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ headerShown: true, title: 'Opportunity Detail' }} />
      <Stack.Screen name="PostOpportunity" component={PostOpportunityScreen} options={{ headerShown: true, title: 'Post Opportunity' }} />
      <Stack.Screen name="MyOpportunities" component={MyOpportunitiesScreen} options={{ headerShown: true, title: 'My Opportunities' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
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

  console.log('RootNavigator - Token:', !!userToken, 'UserData:', !!userData, 'Valid:', isValidUser);

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