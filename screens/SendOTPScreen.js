import { useState, useRef, useEffect } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary:       '#4F46E5',
  primaryDark:   '#3730A3',
  primarySoft:   '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg:            '#F8F8FC',
  card:          '#FFFFFF',
  text:          '#0F0F23',
  subtext:       '#4B5563',
  muted:         '#9CA3AF',
  border:        '#E5E7EB',
  error:         '#DC2626',
  errorSoft:     '#FEE2E2',
  shadow:        'rgba(79,70,229,0.15)',
};

// ─── Floating Label Input ─────────────────────────────────────────────────────
function FloatingInput({ label, value, onChangeText, keyboardType, error }) {
  const [focused, setFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(labelAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    if (!value) Animated.timing(labelAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const labelTop   = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 6] });
  const labelSize  = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = error
    ? C.error
    : labelAnim.interpolate({ inputRange: [0, 1], outputRange: [C.muted, C.primary] });

  return (
    <View style={[fi.wrap, { borderColor: error ? C.error : focused ? C.primary : C.border }, error && { backgroundColor: C.errorSoft }]}>
      <Animated.Text style={[fi.label, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <TextInput
        style={fi.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="transparent"
        selectionColor={C.primary}
      />
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: {
    borderWidth: 1.5, borderRadius: 14, height: 60,
    justifyContent: 'flex-end', marginBottom: 6,
    paddingHorizontal: 16, backgroundColor: C.card,
    position: 'relative',
  },
  label: { position: 'absolute', left: 16, fontWeight: '600', letterSpacing: 0.2 },
  input: { fontSize: 15, color: C.text, paddingBottom: 10 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SendOTPScreen({ route, navigation }) {
  const { type } = route.params || { type: 'email_verification' };
  const isForgot = type === 'forgot_password';

  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 550, delay: 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, delay: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSendOTP = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim(), type });
      navigation.navigate('VerifyOTP', { email: email.trim(), type });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Background blobs ──────────────────────────────────────── */}
      <View style={s.blobTopRight} />
      <View style={s.blobBottomLeft} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back button ─────────────────────────────────────────── */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.primary} />
          </TouchableOpacity>

          {/* ── Icon badge ──────────────────────────────────────────── */}
          <Animated.View style={[s.iconWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.iconRing}>
              <View style={s.iconInner}>
                <Ionicons name={isForgot ? 'lock-closed' : 'mail'} size={26} color="#fff" />
              </View>
            </View>
          </Animated.View>

          {/* ── Card ────────────────────────────────────────────────── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.cardTitle}>
              {isForgot ? 'Reset Password' : 'Create Account'}
            </Text>
            <Text style={s.cardSubtitle}>
              {isForgot
                ? "Enter your registered email and we'll send you a verification code."
                : "Enter your university email to get started with your account."}
            </Text>

            {/* ── Input ─────────────────────────────────────────────── */}
            <View style={{ marginTop: 8 }}>
              <FloatingInput
                label="Email address"
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                keyboardType="email-address"
                error={error}
              />
              {error ? <Text style={s.errorText}>{error}</Text> : null}
            </View>

            {/* ── Info pill ─────────────────────────────────────────── */}
            <View style={s.infoPill}>
              <Ionicons name="information-circle-outline" size={14} color={C.primary} />
              <Text style={s.infoPillText}>
                A 6-digit code will be sent to your inbox. Check spam if you don't see it.
              </Text>
            </View>

            {/* ── Send button ───────────────────────────────────────── */}
            <TouchableOpacity
              style={[s.sendBtn, loading && s.sendBtnDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <LoadingDots />
              ) : (
                <View style={s.sendBtnInner}>
                  <Text style={s.sendBtnText}>Send Verification Code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* ── Back to login ─────────────────────────────────────── */}
            <TouchableOpacity style={s.loginLinkWrap} onPress={() => navigation.navigate('Login')}>
              <Text style={s.loginLinkText}>
                Already have an account?{' '}
                <Text style={s.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Step indicator ──────────────────────────────────────── */}
          <Animated.View style={[s.stepsRow, { opacity: fadeAnim }]}>
            <View style={[s.step, s.stepActive]} />
            <View style={s.step} />
            <View style={s.step} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Loading Dots ─────────────────────────────────────────────────────────────
function LoadingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
        Animated.timing(dot, { toValue:  0, duration: 250, useNativeDriver: true }),
        Animated.delay(600),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 22, justifyContent: 'center' }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', transform: [{ translateY: dot }] }} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  blobTopRight: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: C.primarySoft, top: -70, right: -70, opacity: 0.7,
  },
  blobBottomLeft: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#EDE9FE', bottom: 60, left: -50, opacity: 0.5,
  },

  scroll: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 36,
  },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'flex-start',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  // ── Icon badge
  iconWrap: { alignItems: 'center', marginBottom: 28 },
  iconRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderColor: C.primaryBorder,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.card,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1, shadowRadius: 20, elevation: 8,
  },
  iconInner: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Card
  card: {
    backgroundColor: C.card,
    borderRadius: 24, borderWidth: 1, borderColor: C.border,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
  },
  cardTitle:    { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: C.muted, fontWeight: '500', lineHeight: 20, marginBottom: 4 },

  errorText: { fontSize: 12, color: C.error, fontWeight: '500', marginBottom: 10, marginLeft: 4 },

  // ── Info pill
  infoPill: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.primarySoft,
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.primaryBorder,
    marginTop: 10, marginBottom: 20,
  },
  infoPillText: { flex: 1, fontSize: 12, color: C.primary, lineHeight: 18, fontWeight: '500' },

  // ── Send button
  sendBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 6,
    marginBottom: 16,
  },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sendBtnText:     { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // ── Login link
  loginLinkWrap: { alignItems: 'center', paddingTop: 4 },
  loginLinkText: { fontSize: 13, color: C.muted, fontWeight: '500' },
  loginLinkBold: { color: C.primary, fontWeight: '700' },

  // ── Step dots
  stepsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, marginTop: 28,
  },
  step: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.border,
  },
  stepActive: {
    width: 24, backgroundColor: C.primary,
  },
});