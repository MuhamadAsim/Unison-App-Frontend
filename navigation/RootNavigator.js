import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useContext } from 'react';

import { AuthContext } from '../context/AuthContext';

// ── Shared/Auth/Student screens ────────────────────────────────────────────────
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import SendOTPScreen from '../screens/Auth/SendOTPScreen';
import VerifyOTPScreen from '../screens/Auth/VerifyOTPScreen';

//shared screens
import ChatDetailScreen from '../screens/Conversation/ChatDetailScreen';
import ConversationsScreen from '../screens/Conversation/ConversationsScreen';
import AnnouncementDetailScreen from '../screens/Shared/AnnouncementDetailScreen';
import EventDetailScreen from '../screens/Shared/EventDetailScreen';
import NotificationsScreen from '../screens/Shared/NotificationsScreen';
import OpportunityDetailScreen from '../screens/Shared/OpportunityDetailScreen';
import PublicProfileScreen from '../screens/Shared/PublicProfileScreen';
import SplashScreen from '../screens/Shared/SplashScreen';

//student screens 
import StudentProfileScreen from '../screens/Student/StudentProfileScreen';

// ── Alumni screens ─────────────────────────────────────────────────────────────
import AddSkillScreen from '../screens/Alumni/AddSkillScreen';
import AddWorkExperienceScreen from '../screens/Alumni/AddWorkExperienceScreen';
import CreateEditEventScreen from '../screens/Alumni/CreateEditEventScreen';
import EditAlumniProfileScreen from '../screens/Alumni/EditAlumniProfileScreen';
import EditOpportunityScreen from '../screens/Alumni/EditOpportunityScreen';
import EditWorkExperienceScreen from '../screens/Alumni/EditWorkExperienceScreen';
import PostOpportunityScreen from '../screens/Alumni/PostOpportunityScreen';

// ── Tab navigators ────────────────────────────────────────────────────────────
import AlumniTabNavigator from './AlumniTabNavigator';
import StudentTabNavigator from './StudentTabNavigator';

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

function StudentAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={StudentTabNavigator} />
      <Stack.Screen name="StudentProfile" component={StudentProfileScreen} options={{ headerShown: true, title: 'Student Profile' }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AlumniPublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ headerShown: true, title: 'Messages' }} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ── Alumni app stack ──────────────────────────────────────────────────────────
function AlumniAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AlumniTabNavigator} />
      <Stack.Screen name="EditAlumniProfile" component={EditAlumniProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
      <Stack.Screen name="AddWorkExperience" component={AddWorkExperienceScreen} options={{ headerShown: true, title: 'Add Work Experience' }} />
      <Stack.Screen name="EditWorkExperience" component={EditWorkExperienceScreen} options={{ headerShown: true, title: 'Edit Work Experience' }} />
      <Stack.Screen name="AddSkill" component={AddSkillScreen} options={{ headerShown: true, title: 'Add Skill' }} />
      <Stack.Screen name="PostOpportunity" component={PostOpportunityScreen} options={{ headerShown: true, title: 'Post Opportunity' }} />
      <Stack.Screen name="EditOpportunity" component={EditOpportunityScreen} options={{ headerShown: true, title: 'Edit Opportunity' }} />

      {/* ── Event screens ──────────────────────────────────────────────────── */}
      <Stack.Screen name="CreateEvent" component={CreateEditEventScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditEvent"   component={CreateEditEventScreen} options={{ headerShown: false }} />

      {/* Shared Screens */}
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AlumniPublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ headerShown: true, title: 'Messages' }} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
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