import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
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
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens (matches StudentProfileScreen) ─────────────────────────────
const C = {
  primary:      '#4F46E5',
  primaryDark:  '#3730A3',
  primarySoft:  '#EEF2FF',
  primaryBorder:'#C7D2FE',
  bg:           '#F8F8FC',
  card:         '#FFFFFF',
  text:         '#0F0F23',
  subtext:      '#4B5563',
  muted:        '#9CA3AF',
  border:       '#E5E7EB',
  error:        '#DC2626',
  errorSoft:    '#FEE2E2',
  shadow:       'rgba(79,70,229,0.15)',
};

// ─── Animated Input ───────────────────────────────────────────────────────────
function FloatingInput({ label, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, autoCorrect, error }) {
  const [focused, setFocused] = useState(false);
  const [shown,   setShown]   = useState(false);
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

  const labelTop  = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 6] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = error
    ? C.error
    : labelAnim.interpolate({ inputRange: [0, 1], outputRange: [C.muted, C.primary] });

  const borderColor = error ? C.error : focused ? C.primary : C.border;

  return (
    <View style={[fi.wrap, { borderColor }, error && { backgroundColor: C.errorSoft }]}>
      <Animated.Text style={[fi.label, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <TextInput
        style={fi.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry && !shown}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={autoCorrect ?? false}
        placeholderTextColor="transparent"
        selectionColor={C.primary}
      />
      {secureTextEntry && (
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
  eye: {
    position: 'absolute',
    right: 14,
    top: 18,
    padding: 4,
  },
  eyeIcon: { fontSize: 16 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { login }    = useContext(AuthContext);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  // Entry animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  // Clear corrupted auth data on mount
  useEffect(() => {
    (async () => {
      try {
        const token    = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token) {
          if (!userData) {
            await AsyncStorage.multiRemove(['userToken', 'userData', 'verifiedToken']);
          } else {
            try {
              const parsed = JSON.parse(userData);
              if (!parsed?.role) await AsyncStorage.multiRemove(['userToken', 'userData', 'verifiedToken']);
            } catch {
              await AsyncStorage.multiRemove(['userToken', 'userData', 'verifiedToken']);
            }
          }
        }
      } catch {}
    })();
  }, []);

  const validate = () => {
    const e = {};
    if (!email.trim())    e.email    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password.trim()) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.account_status === 'pending') {
        Alert.alert('Pending Approval', "Your account is under review. You'll be notified once approved.");
        return;
      }
      if (response.data.account_status === 'rejected') {
        Alert.alert('Account Rejected', 'Your account has been rejected. Please contact support.');
        return;
      }

      const userProfile = {
        ...response.data.profile,
        role:           response.data.role,
        account_status: response.data.account_status,
      };

      if (!userProfile.role || !userProfile.id) {
        Alert.alert('Error', 'Invalid user data received from server');
        return;
      }

      await login(response.data.token, userProfile);
    } catch (error) {
      const status = error.response?.status;
      if      (status === 401)                        Alert.alert('Login Failed', 'Invalid email or password');
      else if (status === 404)                        Alert.alert('Login Failed', 'Account not found');
      else if (error.response?.data?.message)         Alert.alert('Login Failed', error.response.data.message);
      else if (error.message === 'Network Error')     Alert.alert('Network Error', 'Please check your internet connection');
      else                                            Alert.alert('Login Failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Background decoration ─────────────────────────────────── */}
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
          {/* ── Brand mark ──────────────────────────────────────────── */}
          <Animated.View style={[s.brandWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.logoRing}>
              <View style={s.logoInner}>
                {/* U icon made from two arcs approximated with text */}
                <Text style={s.logoText}>U</Text>
              </View>
            </View>
            <Text style={s.brandName}>UNISON</Text>
            <Text style={s.brandTagline}>Alumni & Student Network</Text>
          </Animated.View>

          {/* ── Card ────────────────────────────────────────────────── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSubtitle}>Sign in to continue</Text>

            <View style={{ marginTop: 8 }}>
              <FloatingInput
                label="Email address"
                value={email}
                onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: null })); }}
                keyboardType="email-address"
                error={errors.email}
              />
              {errors.email ? <Text style={s.errorText}>{errors.email}</Text> : null}

              <FloatingInput
                label="Password"
                value={password}
                onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
                secureTextEntry
                error={errors.password}
              />
              {errors.password ? <Text style={s.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={s.forgotWrap}
              onPress={() => navigation.navigate('SendOTP', { type: 'forgot_password' })}
              disabled={loading}
            >
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              style={[s.loginBtn, loading && s.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <View style={s.loadingRow}>
                  <LoadingDots />
                </View>
              ) : (
                <Text style={s.loginBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>New here?</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Register */}
            <TouchableOpacity
              style={s.registerBtn}
              onPress={() => navigation.navigate('SendOTP', { type: 'email_verification' })}
              disabled={loading}
              activeOpacity={0.88}
            >
              <Text style={s.registerBtnText}>Create an Account</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <Animated.Text style={[s.footer, { opacity: fadeAnim }]}>
            University of Engineering & Technology
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────────────────
function LoadingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
          Animated.timing(dot, { toValue:  0, duration: 250, useNativeDriver: true }),
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
            width: 7, height: 7, borderRadius: 4,
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

  // ── Blobs
  blobTopRight: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: C.primarySoft,
    top: -80, right: -80,
    opacity: 0.7,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#EDE9FE',
    bottom: 40, left: -60,
    opacity: 0.5,
  },
  blobMid: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.primarySoft,
    top: height * 0.35, right: -20,
    opacity: 0.4,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },

  // ── Brand
  brandWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderColor: C.primaryBorder,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    backgroundColor: C.card,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1, shadowRadius: 20,
    elevation: 8,
  },
  logoInner: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  logoText: {
    fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -1,
  },
  brandName: {
    fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 13, color: C.muted, fontWeight: '500', letterSpacing: 0.3,
  },

  // ── Card
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1, borderColor: C.border,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14, color: C.muted, fontWeight: '500', marginBottom: 8,
  },

  // ── Error
  errorText: {
    fontSize: 12, color: C.error, fontWeight: '500',
    marginTop: -10, marginBottom: 10, marginLeft: 4,
  },

  // ── Forgot
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13, color: C.primary, fontWeight: '600',
  },

  // ── Login button
  loginBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 16,
    elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3,
  },
  loadingRow: {
    height: 22, justifyContent: 'center', alignItems: 'center',
  },

  // ── Divider
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 20, gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.muted, fontWeight: '600' },

  // ── Register button
  registerBtn: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  registerBtnText: {
    fontSize: 15, fontWeight: '700', color: C.primary,
  },

  // ── Footer
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: C.muted,
    marginTop: 28,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});