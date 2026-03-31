import { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import AlumniHomeScreen from './AlumniHomeScreen';
import StudentHomeScreen from './StudentHomeScreen';

// HomeScreen is ONLY a role router.
// It renders StudentHomeScreen or AlumniHomeScreen based on userData.role.
// Add new roles here as you build them.

export default function HomeScreen({ navigation }) {
  const { userData, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F8' }}>
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  if (userData?.role === 'student') {
    return <StudentHomeScreen navigation={navigation} />;
  }

  // alumni + any other role → alumni home for now
  return <AlumniHomeScreen navigation={navigation} />;
}