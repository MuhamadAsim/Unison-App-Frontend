import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
} from 'react-native';
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
  green:         '#059669',
  greenSoft:     '#D1FAE5',
  shadow:        'rgba(79,70,229,0.15)',
};

const OTP_LENGTH = 6;

// ─── OTP Box Input ────────────────────────────────────────────────────────────
function OTPInput({ value, focused, hasError }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.08 : 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [focused]);

  const borderColor = hasError
    ? C.error
    : focused
    ? C.primary
    : value
    ? C.primaryBorder
    : C.border;

  const bg = hasError
    ? C.errorSoft
    : focused
    ? C.primarySoft
    : value
    ? '#FAFAFE'
    : C.card;

  return (
    <Animated.View
      style={[
        otp.box,
        { borderColor, backgroundColor: bg, transform: [{ scale: scaleAnim }] },
        focused && otp.boxFocused,
      ]}
    >
      <Text style={[otp.digit, !value && otp.digitEmpty, hasError && { color: C.error }]}>
        {value || ''}
      </Text>
      {focused && !value && <View style={otp.cursor} />}
    </Animated.View>
  );
}

const otp = StyleSheet.create({
  box: {
    width: 42,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  boxFocused: {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  digit: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 0,
  },
  digitEmpty: { color: 'transparent' },
  cursor: {
    position: 'absolute',
    width: 2,
    height: 28,
    borderRadius: 1,
    backgroundColor: C.primary,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VerifyOTPScreen({ route, navigation }) {
  const { email, type } = route.params;
  const isForgot = type === 'forgot_password';

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [focusIdx, setFocusIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef(Array(OTP_LENGTH).fill(null));

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 550, delay: 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, delay: 80, useNativeDriver: true }),
    ]).start();
    // Focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDigitChange = (text, index) => {
    setHasError(false);
    const cleaned = text.replace(/[^0-9]/g, '');

    // Handle paste — if user pastes all 6 digits at once
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, OTP_LENGTH).split('');
      const newDigits = [...Array(OTP_LENGTH).fill('')];
      pasted.forEach((d, i) => {
        newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const otpValue = digits.join('');

  const handleVerify = async () => {
    if (otpValue.length !== OTP_LENGTH) {
      setHasError(true);
      shake();
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { email, otp: otpValue, type });
      const { verified_token } = response.data;
      await AsyncStorage.setItem('verifiedToken', verified_token);

      if (isForgot) {
        navigation.navigate('ResetPassword', { verifiedToken: verified_token });
      } else {
        navigation.navigate('Register', { email, verifiedToken: verified_token });
      }
    } catch (err) {
      setHasError(true);
      shake();
      Alert.alert('Verification Failed', err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setDigits(Array(OTP_LENGTH).fill(''));
    setHasError(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
    try {
      await api.post('/auth/send-otp', { email, type });
      setCountdown(30);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Background blobs ──────────────────────────────────────── */}
      <View style={s.blobTopRight} />
      <View style={s.blobBottomLeft} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back ──────────────────────────────────────────────── */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.primary} />
          </TouchableOpacity>

          {/* ── Icon badge ────────────────────────────────────────── */}
          <Animated.View
            style={[s.iconWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={s.iconRing}>
              <View style={s.iconInner}>
                <Ionicons name="shield-checkmark" size={26} color="#fff" />
              </View>
            </View>
          </Animated.View>

          {/* ── Card ──────────────────────────────────────────────── */}
          <Animated.View
            style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={s.cardTitle}>Check your email</Text>
            <Text style={s.cardSubtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={s.emailHighlight}>{email}</Text>
            </Text>

            {/* ── OTP boxes ─────────────────────────────────────────── */}
            <Animated.View style={[s.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
              {digits.map((digit, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={1}
                  onPress={() => inputRefs.current[i]?.focus()}
                >
                  <OTPInput value={digit} focused={focusIdx === i} hasError={hasError} />
                </TouchableOpacity>
              ))}
            </Animated.View>

            {/* Hidden single TextInput drives the keyboard */}
            {digits.map((_, i) => (
              <TextInput
                key={i}
                ref={ref => (inputRefs.current[i] = ref)}
                style={s.hiddenInput}
                value={digits[i]}
                onChangeText={t => handleDigitChange(t, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                onFocus={() => setFocusIdx(i)}
                onBlur={() => setFocusIdx(-1)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                caretHidden
              />
            ))}

            {hasError && (
              <Text style={s.errorText}>
                <Ionicons name="alert-circle-outline" size={12} /> Invalid code. Please try again.
              </Text>
            )}

            {/* ── Verify button ─────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                s.verifyBtn,
                (loading || otpValue.length < OTP_LENGTH) && s.verifyBtnDisabled,
              ]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <LoadingDots />
              ) : (
                <View style={s.verifyBtnInner}>
                  <Text style={s.verifyBtnText}>Verify Code</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* ── Resend ────────────────────────────────────────────── */}
            <View style={s.resendRow}>
              <Text style={s.resendLabel}>Didn't receive it? </Text>
              <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || resending}>
                <Text style={[s.resendBtn, countdown > 0 && s.resendBtnDisabled]}>
                  {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending…' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Step indicator ────────────────────────────────────── */}
          <Animated.View style={[s.stepsRow, { opacity: fadeAnim }]}>
            <View style={s.stepDone}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
            <View style={[s.step, s.stepActive]} />
            <View style={s.step} />
          </Animated.View>
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
    <View
      style={{
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        height: 22,
        justifyContent: 'center',
      }}
    >
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
  root: { flex: 1, backgroundColor: C.bg },

  blobTopRight: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: C.primarySoft,
    top: -70,
    right: -70,
    opacity: 0.7,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#EDE9FE',
    bottom: 60,
    left: -50,
    opacity: 0.5,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 36,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  iconWrap: { alignItems: 'center', marginBottom: 28 },
  iconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: C.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.card,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  iconInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: C.muted,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 28,
  },
  emailHighlight: { color: C.primary, fontWeight: '700' },

  // ── OTP - FIXED ALIGNMENT ───────────────────────────────────────
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',  // ← Changed from 'space-between' to 'center'
    alignItems: 'center',
    gap: 4,                    // ← Added gap for consistent spacing
    marginBottom: 8,
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  errorText: {
    fontSize: 12,
    color: C.error,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 4,
  },

  // ── Verify button
  verifyBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifyBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // ── Resend
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendLabel: { fontSize: 13, color: C.muted, fontWeight: '500' },
  resendBtn: { fontSize: 13, color: C.primary, fontWeight: '700' },
  resendBtnDisabled: { color: C.muted, fontWeight: '500' },

  // ── Steps
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    alignItems: 'center',
  },
  step: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
  },
  stepActive: { width: 24, backgroundColor: C.primary },
  stepDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});