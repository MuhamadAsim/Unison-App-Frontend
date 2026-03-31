import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens (matches LoginScreen) ─────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg: '#F8F8FC',
  card: '#FFFFFF',
  text: '#0F0F23',
  subtext: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  error: '#DC2626',
  errorSoft: '#FEE2E2',
  success: '#059669',
  successSoft: '#D1FAE5',
  shadow: 'rgba(79,70,229,0.15)',
};

// ─── Animated Input (same as LoginScreen) ────────────────────────────────────
function FloatingInput({ label, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, autoCorrect, editable = true, error }) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(labelAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(labelAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    }
  };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 6] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = error
    ? C.error
    : labelAnim.interpolate({ inputRange: [0, 1], outputRange: [C.muted, C.primary] });

  const borderColor = error ? C.error : focused ? C.primary : C.border;
  const backgroundColor = editable ? C.card : C.bg;

  return (
    <View style={[fi.wrap, { borderColor, backgroundColor }, error && { backgroundColor: C.errorSoft }]}>
      <Animated.Text style={[fi.label, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <TextInput
        style={[fi.input, !editable && fi.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry && !shown}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={autoCorrect ?? false}
        editable={editable}
        placeholderTextColor="transparent"
        selectionColor={C.primary}
      />
      {secureTextEntry && editable && (
        <TouchableOpacity style={fi.eye} onPress={() => setShown(s => !s)}>
          <Text style={fi.eyeIcon}>{shown ? '👁' : '🙈'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 60,
    justifyContent: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: C.card,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    fontSize: 15,
    color: C.text,
    paddingBottom: 10,
    paddingRight: 40,
  },
  inputDisabled: {
    color: C.muted,
  },
  eye: {
    position: 'absolute',
    right: 14,
    top: 18,
    padding: 4,
  },
  eyeIcon: { fontSize: 16 },
});

// ─── Student Card Picker ──────────────────────────────────────────────────────
function StudentCardPicker({ value, onChange, error }) {
  const handlePick = async () => {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      onChange({
        uri: asset.uri,
        fileName: asset.fileName || 'student_card.jpg',
        type: asset.mimeType || 'image/jpeg',
        fileSize: asset.fileSize,
      });
    }
  };

  const borderColor = error ? C.error : value ? C.primary : C.border;
  const bg = error ? C.errorSoft : value ? C.primarySoft : C.bg;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={sc.label}>Student Card</Text>
      <TouchableOpacity
        style={[sc.picker, { borderColor, backgroundColor: bg }]}
        onPress={handlePick}
        activeOpacity={0.8}
      >
        {value ? (
          <View style={sc.previewRow}>
            <Image source={{ uri: value.uri }} style={sc.thumb} />
            <View style={sc.previewInfo}>
              <Text style={sc.previewName} numberOfLines={1}>
                {value.fileName || 'student_card.jpg'}
              </Text>
              <Text style={sc.previewSize}>
                {value.fileSize ? `${(value.fileSize / 1024).toFixed(1)} KB` : ''}
              </Text>
            </View>
            <Text style={sc.changeText}>Change</Text>
          </View>
        ) : (
          <View style={sc.placeholder}>
            <Text style={sc.uploadIcon}>🪪</Text>
            <Text style={sc.uploadTitle}>Upload Student Card</Text>
            <Text style={sc.uploadHint}>Tap to choose a photo from your library</Text>
          </View>
        )}
      </TouchableOpacity>
      {error && <Text style={sc.errorText}>{error}</Text>}
    </View>
  );
}

const sc = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1.5,
    borderRadius: 14,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.subtext,
  },
  uploadHint: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: C.border,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  previewSize: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },
  errorText: {
    fontSize: 12,
    color: C.error,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RegisterScreen({ route, navigation }) {
  const { email, verifiedToken } = route.params;

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('alumni');
  const [rollNumber, setRollNumber] = useState('');
  const [degree, setDegree] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [semester, setSemester] = useState('');
  const [studentCard, setStudentCard] = useState(null); // { uri, fileName, type, fileSize }
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    const e = {};

    if (!username.trim()) e.username = 'Username is required';
    else if (username.length < 3) e.username = 'Username must be at least 3 characters';

    if (!displayName.trim()) e.displayName = 'Display name is required';

    if (!password.trim()) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';

    if (!rollNumber.trim()) e.rollNumber = 'Roll number is required';

    if (!degree.trim()) e.degree = 'Degree is required';

    if (!studentCard) e.studentCard = 'Please upload your student card';

    if (role === 'alumni') {
      if (!graduationYear) e.graduationYear = 'Graduation year is required';
      else if (isNaN(graduationYear) || graduationYear.length !== 4) e.graduationYear = 'Enter a valid year (e.g., 2024)';
    }

    if (role === 'student') {
      if (!semester) e.semester = 'Semester is required';
      else if (isNaN(semester) || semester < 1 || semester > 12) e.semester = 'Enter a valid semester (1-12)';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      // Build multipart/form-data — required because student_card is a file
      const formData = new FormData();

      formData.append('verified_token', verifiedToken);
      formData.append('username', username.trim().toLowerCase());
      formData.append('display_name', displayName.trim());
      formData.append('email', email);
      formData.append('password', password);
      formData.append('role', role);
      formData.append('roll_number', rollNumber.trim());
      formData.append('degree', degree.trim());

      // Append image file
      formData.append('student_card', {
        uri: studentCard.uri,
        name: studentCard.fileName || 'student_card.jpg',
        type: studentCard.type || 'image/jpeg',
      });

      if (role === 'alumni') formData.append('graduation_year', String(graduationYear));
      if (role === 'student') formData.append('semester', String(semester));

      console.log('📤 Sending FormData...');

      await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(
        'Success',
        'Account created successfully! You will be notified on Admin Approval.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.log('❌ Error:', error?.response?.data);

      const msg = error?.response?.data?.message;
      const formattedMessage = Array.isArray(msg)
        ? msg.join('\n')
        : msg || 'Something went wrong';

      Alert.alert('Registration Failed', formattedMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Background decoration */}
      <View style={s.blobTopRight} />
      <View style={s.blobBottomLeft} />
      <View style={s.blobMid} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark */}
          <Animated.View style={[s.brandWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.logoRing}>
              <View style={s.logoInner}>
                <Text style={s.logoText}>U</Text>
              </View>
            </View>
            <Text style={s.brandName}>UNISON</Text>
            <Text style={s.brandTagline}>Complete Your Profile</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.cardTitle}>Create Account</Text>
            <Text style={s.cardSubtitle}>{email}</Text>

            {/* Username */}
            <FloatingInput
              label="Username"
              value={username}
              onChangeText={t => { setUsername(t); setErrors(e => ({ ...e, username: null })); }}
              autoCapitalize="none"
              error={errors.username}
            />
            {errors.username && <Text style={s.errorText}>{errors.username}</Text>}

            {/* Display Name */}
            <FloatingInput
              label="Display Name"
              value={displayName}
              onChangeText={t => { setDisplayName(t); setErrors(e => ({ ...e, displayName: null })); }}
              error={errors.displayName}
            />
            {errors.displayName && <Text style={s.errorText}>{errors.displayName}</Text>}

            {/* Email (readonly) */}
            <FloatingInput
              label="Email"
              value={email}
              editable={false}
            />

            {/* Password */}
            <FloatingInput
              label="Password"
              value={password}
              onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
              secureTextEntry
              error={errors.password}
            />
            {errors.password && <Text style={s.errorText}>{errors.password}</Text>}

            {/* Role Selector */}
            <Text style={s.roleLabel}>I am a...</Text>
            <View style={s.roleContainer}>
              <TouchableOpacity
                style={[s.roleBtn, role === 'alumni' && s.roleBtnActive]}
                onPress={() => setRole('alumni')}
              >
                <Text style={[s.roleText, role === 'alumni' && s.roleTextActive]}>Alumni</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.roleBtn, role === 'student' && s.roleBtnActive]}
                onPress={() => setRole('student')}
              >
                <Text style={[s.roleText, role === 'student' && s.roleTextActive]}>Student</Text>
              </TouchableOpacity>
            </View>

            {/* Roll Number */}
            <FloatingInput
              label="Roll Number"
              value={rollNumber}
              onChangeText={t => { setRollNumber(t); setErrors(e => ({ ...e, rollNumber: null })); }}
              autoCapitalize="characters"
              error={errors.rollNumber}
            />
            {errors.rollNumber && <Text style={s.errorText}>{errors.rollNumber}</Text>}

            {/* Degree */}
            <FloatingInput
              label="Degree"
              value={degree}
              onChangeText={t => { setDegree(t); setErrors(e => ({ ...e, degree: null })); }}
              error={errors.degree}
            />
            {errors.degree && <Text style={s.errorText}>{errors.degree}</Text>}

            {/* Conditional Fields */}
            {role === 'alumni' ? (
              <>
                <FloatingInput
                  label="Graduation Year"
                  value={graduationYear}
                  onChangeText={t => { setGraduationYear(t); setErrors(e => ({ ...e, graduationYear: null })); }}
                  keyboardType="number-pad"
                  error={errors.graduationYear}
                />
                {errors.graduationYear && <Text style={s.errorText}>{errors.graduationYear}</Text>}
              </>
            ) : (
              <>
                <FloatingInput
                  label="Current Semester"
                  value={semester}
                  onChangeText={t => { setSemester(t); setErrors(e => ({ ...e, semester: null })); }}
                  keyboardType="number-pad"
                  error={errors.semester}
                />
                {errors.semester && <Text style={s.errorText}>{errors.semester}</Text>}
              </>
            )}

            {/* Student Card Upload */}
            <StudentCardPicker
              value={studentCard}
              onChange={asset => { setStudentCard(asset); setErrors(e => ({ ...e, studentCard: null })); }}
              error={errors.studentCard}
            />

            {/* Register Button */}
            <TouchableOpacity
              style={[s.registerBtn, loading && s.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <View style={s.loadingRow}>
                  <LoadingDots />
                </View>
              ) : (
                <Text style={s.registerBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>Already have an account?</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity
              style={s.loginBtn}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
              activeOpacity={0.88}
            >
              <Text style={s.loginBtnText}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.Text style={[s.footer, { opacity: fadeAnim }]}>
            University of Engineering & Technology
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Loading Dots ─────────────────────────────────────────────────────────────
function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(600),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: '#fff',
            transform: [{ translateY: dot }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  blobTopRight: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: C.primarySoft, top: -80, right: -80, opacity: 0.7,
  },
  blobBottomLeft: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#EDE9FE', bottom: 40, left: -60, opacity: 0.5,
  },
  blobMid: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.primarySoft, top: height * 0.35, right: -20, opacity: 0.4,
  },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32,
  },
  brandWrap: { alignItems: 'center', marginBottom: 24 },
  logoRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderColor: C.primaryBorder,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, backgroundColor: C.card,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1, shadowRadius: 20, elevation: 8,
  },
  logoInner: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  brandName: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 4 },
  brandTagline: { fontSize: 13, color: C.muted, fontWeight: '500', letterSpacing: 0.3 },
  card: {
    backgroundColor: C.card, borderRadius: 24,
    borderWidth: 1, borderColor: C.border, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: C.muted, fontWeight: '500', marginBottom: 20 },
  roleLabel: {
    fontSize: 12, fontWeight: '700', color: C.subtext,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4,
  },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  roleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', backgroundColor: C.bg,
  },
  roleBtnActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  roleText: { fontSize: 14, fontWeight: '600', color: C.subtext },
  roleTextActive: { color: C.primary },
  errorText: {
    fontSize: 12, color: C.error, fontWeight: '500',
    marginTop: -12, marginBottom: 8, marginLeft: 4,
  },
  registerBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 6, marginTop: 8,
  },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  loadingRow: { height: 22, justifyContent: 'center', alignItems: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  loginBtn: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', backgroundColor: 'transparent',
  },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: C.primary },
  footer: {
    textAlign: 'center', fontSize: 11, color: C.muted,
    marginTop: 24, fontWeight: '500', letterSpacing: 0.3,
  },
});