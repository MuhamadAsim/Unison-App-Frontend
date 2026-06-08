import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../services/api';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  sectionBg: '#F3F4F6',
};

const DEGREES = ['BSCS', 'BSIT', 'BSSE', 'BSEE', 'BSME', 'BSCE', 'MBA', 'MS', 'PhD'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// ─── Step Config ──────────────────────────────────────────────────────────────
const STEPS_ALUMNI = ['Account', 'Academic', 'Verify'];
const STEPS_STUDENT = ['Account', 'Academic', 'Verify'];
const STEPS_PARTNER = ['Account', 'Organization', 'Verify'];

// ─── Floating Input ───────────────────────────────────────────────────────────
function FloatingInput({
  label, value, onChangeText, secureTextEntry,
  keyboardType, autoCapitalize, autoCorrect, editable = true, error,
}) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(labelAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    if (!value) Animated.timing(labelAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 6] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = error
    ? C.error
    : labelAnim.interpolate({ inputRange: [0, 1], outputRange: [C.muted, C.primary] });

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={[
        fi.wrap,
        { borderColor: error ? C.error : focused ? C.primary : C.border },
        { backgroundColor: editable ? (error ? C.errorSoft : C.card) : C.bg },
      ]}>
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
      {error && <Text style={fi.errorText}>{error}</Text>}
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: {
    borderWidth: 1.5, borderRadius: 14, height: 60,
    justifyContent: 'flex-end', paddingHorizontal: 16,
    backgroundColor: C.card, position: 'relative',
  },
  label: { position: 'absolute', left: 16, fontWeight: '600', letterSpacing: 0.2 },
  input: { fontSize: 15, color: C.text, paddingBottom: 10, paddingRight: 40 },
  inputDisabled: { color: C.muted },
  eye: { position: 'absolute', right: 14, top: 18, padding: 4 },
  eyeIcon: { fontSize: 16 },
  errorText: { fontSize: 12, color: C.error, fontWeight: '500', marginTop: 4, marginLeft: 4 },
});














// ─── Dropdown Picker ──────────────────────────────────────────────────────────
function DropdownPicker({ label, value, options, onSelect, error }) {
  const [visible, setVisible] = useState(false);
  const borderColor = error ? C.error : value ? C.primary : C.border;
  const bgColor = error ? C.errorSoft : C.card;
  
  const displayText = value ? (typeof value === 'number' ? `Semester ${value}` : value) : '';

  return (
    <View style={{ marginBottom: 16 }}>
      <TouchableOpacity
        style={[
          dp.container,
          { borderColor, backgroundColor: bgColor }
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <View style={dp.innerContainer}>
          <Text style={[
            dp.label,
            value && dp.labelActive,
            error && { color: C.error }
          ]}>
            {label}
          </Text>
          <Text style={[
            dp.value,
            !value && dp.valuePlaceholder,
            error && { color: C.error }
          ]}>
            {displayText || label}
          </Text>
        </View>
        <Text style={dp.chevron}>▾</Text>
      </TouchableOpacity>
      {error && <Text style={fi.errorText}>{error}</Text>}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={dp.overlay} onPress={() => setVisible(false)} activeOpacity={1}>
          <View style={dp.sheet}>
            <Text style={dp.sheetTitle}>{label}</Text>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={String(opt)}
                  style={[dp.option, String(value) === String(opt) && dp.optionActive]}
                  onPress={() => { onSelect(opt); setVisible(false); }}
                >
                  <Text style={[dp.optionText, String(value) === String(opt) && dp.optionTextActive]}>
                    {typeof opt === 'number' ? `Semester ${opt}` : opt}
                  </Text>
                  {String(value) === String(opt) && <Text style={dp.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const dp = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  innerContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    minHeight: 44,
  },
  label: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontSize: 15,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontSize: 11,
    top: -8,
    color: C.primary,
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
    color: C.text,
    paddingTop: 12,
  },
  valuePlaceholder: {
    opacity: 0,
  },
  chevron: {
    fontSize: 16,
    color: C.muted,
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    maxHeight: height * 0.5,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionActive: {
    backgroundColor: C.primarySoft,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: C.text,
  },
  optionTextActive: {
    color: C.primary,
    fontWeight: '700',
  },
  check: {
    fontSize: 15,
    color: C.primary,
    fontWeight: '700',
  },
});








// ─── Card Picker (Student Card / Business Card) ───────────────────────────────
function CardPicker({ value, onChange, error, label = 'Student Card', icon = '🪪' }) {
  const handlePick = async () => {
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
        fileName: asset.fileName || 'card.jpg',
        type: asset.mimeType || 'image/jpeg',
        fileSize: asset.fileSize,
      });
    }
  };

  const borderColor = error ? C.error : value ? C.primary : C.border;
  const bg = error ? C.errorSoft : value ? C.primarySoft : C.bg;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={sc.label}>{label}</Text>
      <TouchableOpacity
        style={[sc.picker, { borderColor, backgroundColor: bg }]}
        onPress={handlePick}
        activeOpacity={0.8}
      >
        {value ? (
          <View style={sc.previewRow}>
            <Image source={{ uri: value.uri }} style={sc.thumb} />
            <View style={sc.previewInfo}>
              <Text style={sc.previewName} numberOfLines={1}>{value.fileName || 'card.jpg'}</Text>
              <Text style={sc.previewSize}>{value.fileSize ? `${(value.fileSize / 1024).toFixed(1)} KB` : ''}</Text>
            </View>
            <Text style={sc.changeText}>Change</Text>
          </View>
        ) : (
          <View style={sc.placeholder}>
            <Text style={sc.uploadIcon}>{icon}</Text>
            <Text style={sc.uploadTitle}>Upload {label}</Text>
            <Text style={sc.uploadHint}>Tap to choose a photo from your library</Text>
          </View>
        )}
      </TouchableOpacity>
      {error && <Text style={fi.errorText}>{error}</Text>}
    </View>
  );
}

const sc = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  picker: { borderWidth: 1.5, borderRadius: 14, borderStyle: 'dashed', overflow: 'hidden' },
  placeholder: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  uploadIcon: { fontSize: 28, marginBottom: 4 },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: C.subtext },
  uploadHint: { fontSize: 12, color: C.muted, fontWeight: '500' },
  previewRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: C.border },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 13, fontWeight: '700', color: C.text },
  previewSize: { fontSize: 11, color: C.muted, marginTop: 2 },
  changeText: { fontSize: 12, fontWeight: '700', color: C.primary },
});

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ steps, currentStep }) {
  return (
    <View style={st.container}>
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <View key={label} style={st.stepWrap}>
            <View style={[st.circle, done && st.circleDone, active && st.circleActive]}>
              {done
                ? <Text style={st.checkMark}>✓</Text>
                : <Text style={[st.circleNum, active && st.circleNumActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[st.stepLabel, active && st.stepLabelActive, done && st.stepLabelDone]}>
              {label}
            </Text>
            {i < steps.length - 1 && (
              <View style={[st.connector, (done || active) && st.connectorActive]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 28, paddingHorizontal: 8 },
  stepWrap: { alignItems: 'center', flex: 1, position: 'relative' },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: C.border, backgroundColor: C.card,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  circleActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  circleDone: { borderColor: C.primary, backgroundColor: C.primary },
  circleNum: { fontSize: 13, fontWeight: '700', color: C.muted },
  circleNumActive: { color: C.primary },
  checkMark: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepLabel: { fontSize: 11, fontWeight: '600', color: C.muted, textAlign: 'center' },
  stepLabelActive: { color: C.primary },
  stepLabelDone: { color: C.success },
  connector: {
    position: 'absolute', top: 15, left: '60%', right: '-60%',
    height: 2, backgroundColor: C.border, zIndex: -1,
  },
  connectorActive: { backgroundColor: C.primary },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title }) {
  return (
    <View style={sh.row}>
      <Text style={sh.icon}>{icon}</Text>
      <Text style={sh.title}>{title}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 8 },
  icon: { fontSize: 16 },
  title: { fontSize: 13, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.6 },
});

// ─── Loading Dots ─────────────────────────────────────────────────────────────
function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.delay(600),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={{
          width: 7, height: 7, borderRadius: 4,
          backgroundColor: '#fff', transform: [{ translateY: dot }],
        }} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RegisterScreen({ route, navigation }) {
  const { email, verifiedToken } = route.params;

  // ── Step ─────────────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);

  // ── Form State ───────────────────────────────────────────────────────────────
  const [role, setRole] = useState('alumni');

  // Step 0 — Account
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  // Step 1 — Academic (alumni/student) or Organization (partner)
  const [rollNumber, setRollNumber] = useState('');
  const [degree, setDegree] = useState('');
  const [batch, setBatch] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [semester, setSemester] = useState('');
  // Partner-only
  const [affiliation, setAffiliation] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Step 2 — Verify (card upload)
  const [cardAsset, setCardAsset] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const steps = role === 'partner' ? STEPS_PARTNER : (role === 'alumni' ? STEPS_ALUMNI : STEPS_STUDENT);

  // ── Animations ───────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateStep = () => {
    stepAnim.setValue(30);
    Animated.timing(stepAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };

  // ── Validation per step ──────────────────────────────────────────────────────
  const validateStep = (step) => {
    const e = {};

    if (step === 0) {
      if (!username.trim()) e.username = 'Username is required';
      else if (username.length < 3) e.username = 'At least 3 characters';
      if (!displayName.trim()) e.displayName = 'Display name is required';
      if (!password.trim()) e.password = 'Password is required';
      else if (password.length < 8) e.password = 'Minimum 8 characters';
    }

    if (step === 1) {
      if (role === 'partner') {
        if (!affiliation.trim()) e.affiliation = 'Organization name is required';
        if (!jobTitle.trim()) e.jobTitle = 'Job title is required';
      } else {
        if (!rollNumber.trim()) e.rollNumber = 'Registration number is required';
        if (!degree) e.degree = 'Degree is required';
        if (!batch.trim()) e.batch = 'Batch is required';
        if (role === 'alumni') {
          if (!graduationYear) e.graduationYear = 'Graduation year is required';
          else if (isNaN(graduationYear) || String(graduationYear).length !== 4)
            e.graduationYear = 'Enter a valid 4-digit year';
        }
        if (role === 'student') {
          if (!semester) e.semester = 'Semester is required';
        }
      }
    }

    if (step === 2) {
      if (!cardAsset) e.cardAsset = `Please upload your ${role === 'partner' ? 'business card' : 'student card'}`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    animateStep();
    setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    animateStep();
    setCurrentStep(s => s - 1);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validateStep(2)) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('verified_token', verifiedToken);
      formData.append('username', username.trim().toLowerCase());
      formData.append('display_name', displayName.trim());
      formData.append('email', email);
      formData.append('password', password);
      formData.append('role', role);

      if (role === 'partner') {
        formData.append('affiliation', affiliation.trim());
        formData.append('job_title', jobTitle.trim());
      } else {
        formData.append('roll_number', rollNumber.trim());
        formData.append('degree', degree);
        formData.append('batch', batch.trim());
        if (role === 'alumni') formData.append('graduation_year', String(graduationYear));
        if (role === 'student') formData.append('semester', String(semester));
      }

      formData.append('student_card', {
        uri: cardAsset.uri,
        name: cardAsset.fileName || 'card.jpg',
        type: cardAsset.type || 'image/jpeg',
      });

      const response = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(
        'Success 🎉',
        response.data?.message || 'Account created successfully.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      const msg = error?.response?.data?.message;
      Alert.alert('Registration Failed', Array.isArray(msg) ? msg.join('\n') : msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Step Content ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <>
          <SectionHeader icon="👤" title="Account Details" />

          <FloatingInput label="Username" value={username}
            onChangeText={t => { setUsername(t); setErrors(e => ({ ...e, username: null })); }}
            autoCapitalize="none" error={errors.username} />

          <FloatingInput label="Display Name" value={displayName}
            onChangeText={t => { setDisplayName(t); setErrors(e => ({ ...e, displayName: null })); }}
            error={errors.displayName} />

          <FloatingInput label="Email" value={email} editable={false} />

          <FloatingInput label="Password" value={password}
            onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
            secureTextEntry error={errors.password} />

          <View style={s.dividerLine} />

          <Text style={s.roleLabel}>I am a...</Text>
          <View style={s.roleGrid}>
            {[
              { key: 'alumni', label: 'Alumni', icon: '🎓' },
              { key: 'student', label: 'Student', icon: '📚' },
              { key: 'partner', label: 'Partner', icon: '🤝' },
            ].map(({ key, label, icon }) => (
              <TouchableOpacity
                key={key}
                style={[s.roleCard, role === key && s.roleCardActive]}
                onPress={() => { setRole(key); setErrors({}); }}
                activeOpacity={0.8}
              >
                <Text style={s.roleIcon}>{icon}</Text>
                <Text style={[s.roleText, role === key && s.roleTextActive]}>{label}</Text>
                {role === key && <View style={s.roleDot} />}
              </TouchableOpacity>
            ))}
          </View>
        </>
      );
    }

    if (currentStep === 1) {
      if (role === 'partner') {
        return (
          <>
            <SectionHeader icon="🏢" title="Organization Info" />

            <FloatingInput label="Organization / Company" value={affiliation}
              onChangeText={t => { setAffiliation(t); setErrors(e => ({ ...e, affiliation: null })); }}
              autoCapitalize="words" error={errors.affiliation} />

            <FloatingInput label="Job Title" value={jobTitle}
              onChangeText={t => { setJobTitle(t); setErrors(e => ({ ...e, jobTitle: null })); }}
              autoCapitalize="words" error={errors.jobTitle} />

            <View style={s.infoBox}>
              <Text style={s.infoText}>
                ℹ️  Partners can post opportunities, connect with students & alumni, and access network analytics.
              </Text>
            </View>
          </>
        );
      }

      return (
        <>
          <SectionHeader icon="🎓" title="Academic Details" />

          <FloatingInput label="Registration Number" value={rollNumber}
            onChangeText={t => { setRollNumber(t); setErrors(e => ({ ...e, rollNumber: null })); }}
            autoCapitalize="characters" error={errors.rollNumber} />

          <DropdownPicker label="Degree" value={degree} options={DEGREES}
            onSelect={(v) => { setDegree(v); setErrors(e => ({ ...e, degree: null })); }}
            error={errors.degree} />

          <FloatingInput label="Batch (e.g. Fall 2020 or 2020)" value={batch}
            onChangeText={t => { setBatch(t); setErrors(e => ({ ...e, batch: null })); }}
            autoCapitalize="words" error={errors.batch} />

          {role === 'alumni' && (
            <FloatingInput label="Graduation Year" value={graduationYear}
              onChangeText={t => { setGraduationYear(t); setErrors(e => ({ ...e, graduationYear: null })); }}
              keyboardType="number-pad" error={errors.graduationYear} />
          )}

          {role === 'student' && (
            <DropdownPicker label="Current Semester" value={semester} options={SEMESTERS}
              onSelect={(v) => { setSemester(v); setErrors(e => ({ ...e, semester: null })); }}
              error={errors.semester} />
          )}
        </>
      );
    }

    if (currentStep === 2) {
      const isPartner = role === 'partner';
      return (
        <>
          <SectionHeader
            icon={isPartner ? '💼' : '🪪'}
            title={isPartner ? 'Business Verification' : 'Identity Verification'}
          />

          <CardPicker
            value={cardAsset}
            onChange={asset => { setCardAsset(asset); setErrors(e => ({ ...e, cardAsset: null })); }}
            error={errors.cardAsset}
            label={isPartner ? 'Business Card' : 'Student Card'}
            icon={isPartner ? '💼' : '🪪'}
          />

          <View style={s.infoBox}>
            <Text style={s.infoText}>
              {isPartner
                ? 'ℹ️  Your business card helps us verify your professional affiliation. It will be reviewed by our admin team.'
                : 'ℹ️  Your student card is used for identity verification. It will only be reviewed by our admin team.'}
            </Text>
          </View>

          {/* Summary card */}
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Review your details</Text>
            {[
              { label: 'Username', value: username },
              { label: 'Role', value: role.charAt(0).toUpperCase() + role.slice(1) },
              ...(role === 'partner'
                ? [
                  { label: 'Organization', value: affiliation },
                  { label: 'Job Title', value: jobTitle },
                ]
                : [
                  { label: 'Reg. Number', value: rollNumber },
                  { label: 'Degree', value: degree },
                  { label: 'Batch', value: batch },
                  ...(role === 'alumni' ? [{ label: 'Grad Year', value: graduationYear }] : []),
                  ...(role === 'student' ? [{ label: 'Semester', value: semester ? `Semester ${semester}` : '' }] : []),
                ]
              ),
            ].map(({ label, value }) => (
              <View key={label} style={s.summaryRow}>
                <Text style={s.summaryKey}>{label}</Text>
                <Text style={s.summaryVal}>{value || '—'}</Text>
              </View>
            ))}
          </View>
        </>
      );
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={s.blobTopRight} />
      <View style={s.blobBottomLeft} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <Animated.View style={[s.brandWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.logoRing}>
              <View style={s.logoInner}>
                <Text style={s.logoText}>U</Text>
              </View>
            </View>
            <Text style={s.brandName}>UNISON</Text>
            <Text style={s.brandTagline}>Create Your Account</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Step indicator */}
            <StepIndicator steps={steps} currentStep={currentStep} />

            {/* Step title */}
            <View style={s.stepTitleRow}>
              <Text style={s.stepTitle}>{steps[currentStep]}</Text>
              <Text style={s.stepCount}>{currentStep + 1} of {steps.length}</Text>
            </View>

            {/* Step content */}
            <Animated.View style={{ transform: [{ translateY: stepAnim }] }}>
              {renderStep()}
            </Animated.View>

            {/* Navigation buttons */}
            <View style={s.navRow}>
              {currentStep > 0 && (
                <TouchableOpacity style={s.backBtn} onPress={handleBack} disabled={loading} activeOpacity={0.8}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[s.nextBtn, loading && s.nextBtnDisabled, currentStep === 0 && s.nextBtnFull]}
                onPress={currentStep < steps.length - 1 ? handleNext : handleRegister}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <View style={{ height: 22, justifyContent: 'center', alignItems: 'center' }}>
                    <LoadingDots />
                  </View>
                ) : (
                  <Text style={s.nextBtnText}>
                    {currentStep < steps.length - 1 ? 'Continue →' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign in link */}
            {currentStep === 0 && (
              <>
                <View style={s.dividerRow}>
                  <View style={s.dividerFill} />
                  <Text style={s.dividerText}>Already have an account?</Text>
                  <View style={s.dividerFill} />
                </View>
                <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.88}>
                  <Text style={s.loginBtnText}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          <Animated.Text style={[s.footer, { opacity: fadeAnim }]}>
            University of Engineering & Technology
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  blobTopRight: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: C.primarySoft, top: -80, right: -80, opacity: 0.7,
  },
  blobBottomLeft: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#EDE9FE', bottom: 40, left: -60, opacity: 0.5,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 },

  // Brand
  brandWrap: { alignItems: 'center', marginBottom: 24 },
  logoRing: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, borderColor: C.primaryBorder,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14, backgroundColor: C.card,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8,
  },
  logoInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  brandName: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 4 },
  brandTagline: { fontSize: 13, color: C.muted, fontWeight: '500', letterSpacing: 0.3 },

  // Card
  card: {
    backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.border,
    padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
  },

  // Step title row
  stepTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  stepCount: { fontSize: 12, fontWeight: '600', color: C.muted, backgroundColor: C.sectionBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  // Role selector
  roleLabel: { fontSize: 12, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  roleGrid: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  roleCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, position: 'relative',
  },
  roleCardActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  roleIcon: { fontSize: 22, marginBottom: 6 },
  roleText: { fontSize: 12, fontWeight: '700', color: C.subtext },
  roleTextActive: { color: C.primary },
  roleDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary,
  },

  // Divider
  dividerLine: { height: 1, backgroundColor: C.border, marginVertical: 16 },

  // Info box
  infoBox: {
    backgroundColor: C.primarySoft, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: C.primary, marginBottom: 16,
  },
  infoText: { fontSize: 13, color: C.subtext, fontWeight: '500', lineHeight: 19 },

  // Summary card
  summaryCard: {
    backgroundColor: C.sectionBg, borderRadius: 14, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  summaryKey: { fontSize: 13, color: C.muted, fontWeight: '500' },
  summaryVal: { fontSize: 13, color: C.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  // Nav buttons
  navRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  backBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center',
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: C.subtext },
  nextBtn: {
    flex: 2, backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6,
  },
  nextBtnFull: { flex: 1 },
  nextBtnDisabled: { opacity: 0.7 },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // Sign in footer
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerFill: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  loginBtn: { borderWidth: 1.5, borderColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: C.primary },

  footer: { textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 24, fontWeight: '500', letterSpacing: 0.3 },
});

