import { useContext } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

// This is the existing alumni home, preserved as-is.
// We will redesign it in a later step — for now it works correctly.

export default function AlumniHomeScreen({ navigation }) {
    const { userData, logout } = useContext(AuthContext);

    return (
        <ScrollView style={s.container}>
            <Text style={s.title}>Welcome!</Text>

            {userData && (
                <View style={s.profileCard}>
                    <Text style={s.cardTitle}>Profile Information</Text>

                    <Text style={s.label}>Display Name</Text>
                    <Text style={s.value}>{userData.display_name || userData.name || 'N/A'}</Text>

                    <Text style={s.label}>Username</Text>
                    <Text style={s.value}>{userData.username || 'N/A'}</Text>

                    <Text style={s.label}>Email</Text>
                    <Text style={s.value}>{userData.email || 'N/A'}</Text>

                    <Text style={s.label}>Role</Text>
                    <Text style={s.value}>{userData.role ? userData.role.toUpperCase() : 'N/A'}</Text>

                    {userData.degree && (
                        <>
                            <Text style={s.label}>Degree</Text>
                            <Text style={s.value}>{userData.degree}</Text>
                        </>
                    )}

                    {userData.batch && (
                        <>
                            <Text style={s.label}>Batch</Text>
                            <Text style={s.value}>{userData.batch}</Text>
                        </>
                    )}

                    {userData.graduation_year && (
                        <>
                            <Text style={s.label}>Graduation Year</Text>
                            <Text style={s.value}>{userData.graduation_year}</Text>
                        </>
                    )}

                    {userData.semester && (
                        <>
                            <Text style={s.label}>Semester</Text>
                            <Text style={s.value}>{userData.semester}</Text>
                        </>
                    )}

                    {userData.roll_number && (
                        <>
                            <Text style={s.label}>Roll Number</Text>
                            <Text style={s.value}>{userData.roll_number}</Text>
                        </>
                    )}

                    {userData.phone && (
                        <>
                            <Text style={s.label}>Phone</Text>
                            <Text style={s.value}>{userData.phone}</Text>
                        </>
                    )}

                    <Text style={s.label}>Account Status</Text>
                    <Text
                        style={[
                            s.value,
                            { color: userData.account_status === 'approved' ? '#4CAF50' : '#FF9800' },
                        ]}
                    >
                        {userData.account_status ? userData.account_status.toUpperCase() : 'N/A'}
                    </Text>
                </View>
            )}

            <View style={s.btnGroup}>
                <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('Profile')}>
                    <Text style={s.navBtnText}>View Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('Network')}>
                    <Text style={s.navBtnText}>My Network</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('Batchmates')}>
                    <Text style={s.navBtnText}>Batchmates</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('OpportunitiesList')}>
                    <Text style={s.navBtnText}>Opportunities</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('Search')}>
                    <Text style={s.navBtnText}>Search</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('NetworkAnalytics')}>
                    <Text style={s.navBtnText}>Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('Notifications')}>
                    <Text style={s.navBtnText}>Notifications</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.logoutBtn} onPress={logout}>
                <Text style={s.logoutText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F7' },
    title: {
        fontSize: 32, fontWeight: 'bold', color: '#1a1a1a',
        marginBottom: 32, marginTop: 40, paddingHorizontal: 24,
    },
    profileCard: {
        backgroundColor: '#FFF', padding: 24, borderRadius: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        marginBottom: 32, marginHorizontal: 24,
    },
    cardTitle: {
        fontSize: 20, fontWeight: 'bold', color: '#1a1a1a',
        marginBottom: 20, borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0', paddingBottom: 8,
    },
    label: {
        fontSize: 12, color: '#888', marginBottom: 4,
        textTransform: 'uppercase', fontWeight: '600',
    },
    value: { fontSize: 16, color: '#333', fontWeight: '500', marginBottom: 16 },
    btnGroup: { marginBottom: 32, paddingHorizontal: 24 },
    navBtn: {
        backgroundColor: '#534AB7', borderRadius: 10,
        paddingVertical: 14, alignItems: 'center', marginBottom: 12,
    },
    navBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    logoutBtn: {
        backgroundColor: '#FF3B30', borderRadius: 10,
        paddingVertical: 14, alignItems: 'center',
        marginHorizontal: 24, marginBottom: 40,
    },
    logoutText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});