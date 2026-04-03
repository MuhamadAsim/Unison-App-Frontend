import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { addStudentSkill, getStudentProfile, updateStudentProfile } from '../services/api';


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
  divider: '#F3F4F6',
  green: '#059669', greenSoft: '#D1FAE5',
  amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  coral: '#DC2626', coralSoft: '#FEE2E2',
  shadow: 'rgba(79,70,229,0.10)',
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'expert'];
const SKILL_CATEGORIES = [
  'Programming', 'Data Science', 'Web Development', 'Mobile Development',
  'DevOps', 'Design', 'Machine Learning', 'Database', 'Networking', 'Other',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const proficiencyMeta = (level = '') => {
  const map = {
    beginner: { color: C.amber, bg: C.amberSoft, icon: 'ellipse', label: 'Beginner' },
    intermediate: { color: C.blue, bg: C.blueSoft, icon: 'ellipse', label: 'Intermediate' },
    expert: { color: C.green, bg: C.greenSoft, icon: 'ellipse', label: 'Expert' },
  };
  return map[level?.toLowerCase()] ?? { color: C.muted, bg: C.border, icon: 'ellipse', label: level };
};

// ─── Reusable: Section Header ─────────────────────────────────────────────────
function SectionHeader({ icon, title, action, actionLabel }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionIconWrap}>
          <Ionicons name={icon} size={15} color={C.primary} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {action && (
        <TouchableOpacity style={s.sectionAction} onPress={action}>
          <Ionicons name="add" size={14} color={C.primary} />
          <Text style={s.sectionActionText}>{actionLabel || 'Add'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Reusable: Detail Row ─────────────────────────────────────────────────────
function DetailRow({ icon, label, value, last }) {
  if (!value) return null;
  return (
    <View style={[s.detailRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.detailIconBox}>
        <Ionicons name={icon} size={14} color={C.primary} />
      </View>
      <View style={s.detailContent}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Reusable: Input Field ────────────────────────────────────────────────────
function InputField({ label, value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
// Replace your existing EditProfileModal with this one.
// Only changes from the original:
//   1. Added `semester` state
//   2. Syncs semester from profile on open
//   3. Appends semester to FormData
//   4. Renders a semester selector (1–8) between Phone and Bio

function EditProfileModal({ visible, profile, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [semester, setSemester] = useState('');
  const [profilePicture, setProfilePicture] = useState(null); // { uri, type, name }
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(profile?.display_name || '');
      setPhone(profile?.phone || '');
      setBio(profile?.bio || '');
      setSemester(profile?.semester ? String(profile.semester) : '');
      setProfilePicture(null); // Reset selected image when modal opens
    }
  }, [visible, profile]);

  // Request permissions and pick image
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to change profile picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Generate a unique filename
        const fileExt = asset.uri.split('.').pop();
        const fileName = `profile_${Date.now()}.${fileExt}`;

        setProfilePicture({
          uri: asset.uri,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          name: fileName,
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take a photo');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileExt = asset.uri.split('.').pop();
        const fileName = `profile_${Date.now()}.${fileExt}`;

        setProfilePicture({
          uri: asset.uri,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          name: fileName,
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('display_name', displayName.trim());
      formData.append('phone', phone.trim());
      formData.append('bio', bio.trim());
      if (semester) formData.append('semester', Number(semester));

      // Append profile picture if selected
      if (profilePicture) {
        // @ts-ignore - React Native FormData expects this format
        formData.append('profile_picture', {
          uri: profilePicture.uri,
          type: profilePicture.type,
          name: profilePicture.name,
        });
      }

      await updateStudentProfile(formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={20} color={C.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>

            {/* ── Profile Picture Section ─────────────────────────────────── */}
            <View style={editStyles.profilePicSection}>
              <Text style={[s.inputLabel, { marginBottom: 8, textAlign: 'center' }]}>Profile Picture</Text>
              <TouchableOpacity onPress={showImagePickerOptions} activeOpacity={0.8}>
                <View style={editStyles.profilePicContainer}>
                  {profilePicture ? (
                    <Image
                      source={{ uri: profilePicture.uri }}
                      style={editStyles.profilePicPreview}
                    />
                  ) : profile?.profile_picture ? (
                    <Image
                      source={{ uri: profile.profile_picture }}
                      style={editStyles.profilePicPreview}
                    />
                  ) : (
                    <View style={editStyles.profilePicPlaceholder}>
                      <Ionicons name="camera" size={32} color={C.muted} />
                      <Text style={editStyles.profilePicPlaceholderText}>Add Photo</Text>
                    </View>
                  )}

                  {/* Edit badge */}
                  <View style={editStyles.editIconBadge}>
                    <Ionicons name="pencil" size={14} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={editStyles.profilePicHint}>
                Tap to change profile picture
              </Text>
            </View>

            <InputField
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your full name"
            />

            <InputField
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+92 300 0000000"
              keyboardType="phone-pad"
            />

            {/* Semester Selector */}
            <Text style={[s.inputLabel, { marginBottom: 8 }]}>Current Semester</Text>
            <View style={semStyles.semesterGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                const selected = semester === String(num);
                return (
                  <TouchableOpacity
                    key={num}
                    style={[semStyles.semBox, selected && semStyles.semBoxSelected]}
                    onPress={() => setSemester(String(num))}
                    activeOpacity={0.75}
                  >
                    <Text style={[semStyles.semNum, selected && semStyles.semNumSelected]}>
                      {num}
                    </Text>
                    <Text style={[semStyles.semLabel, selected && semStyles.semLabelSelected]}>
                      Sem
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <InputField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="A short bio about yourself..."
              multiline
            />

            {/* Read-only notice */}
            <View style={s.infoNotice}>
              <Ionicons name="information-circle-outline" size={15} color={C.primary} />
              <Text style={s.infoNoticeText}>
                Roll number, degree and email are managed by the university and cannot be changed here.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, saving && s.primaryBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.primaryBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Semester grid styles (scoped so they don't pollute the main StyleSheet) ──
const semStyles = StyleSheet.create({
  semesterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  semBox: {
    width: '22%',          // 4 per row with gap
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  semBoxSelected: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  semNum: {
    fontSize: 18,
    fontWeight: '800',
    color: C.muted,
  },
  semNumSelected: {
    color: C.primary,
  },
  semLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  semLabelSelected: {
    color: C.primary,
  },
});

// ─── Add Skill Modal ──────────────────────────────────────────────────────────
function AddSkillModal({ visible, onClose, onSaved }) {
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState(SKILL_CATEGORIES[0]);
  const [proficiency, setProficiency] = useState(PROFICIENCY_LEVELS[0]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSkillName('');
    setCategory(SKILL_CATEGORIES[0]);
    setProficiency(PROFICIENCY_LEVELS[0]);
  };

  const handleAdd = async () => {
    if (!skillName.trim()) {
      Alert.alert('Validation', 'Please enter a skill name.');
      return;
    }
    try {
      setSaving(true);
      await addStudentSkill({
        skill_name: skillName.trim(),
        category,
        proficiency_level: proficiency,
      });
      reset();
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add skill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add New Skill</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={20} color={C.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
            <InputField
              label="Skill Name"
              value={skillName}
              onChangeText={setSkillName}
              placeholder="e.g. Python, React Native, SQL..."
            />

            {/* Category Selector */}
            <Text style={[s.inputLabel, { marginBottom: 8 }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {SKILL_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[s.chip, category === cat && s.chipSelected]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[s.chipText, category === cat && s.chipTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Proficiency Selector */}
            <Text style={[s.inputLabel, { marginBottom: 8 }]}>Proficiency Level</Text>
            <View style={s.proficiencyRow}>
              {PROFICIENCY_LEVELS.map(level => {
                const meta = proficiencyMeta(level);
                const selected = proficiency === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      s.profChip,
                      { borderColor: selected ? meta.color : C.border },
                      selected && { backgroundColor: meta.bg },
                    ]}
                    onPress={() => setProficiency(level)}
                  >
                    <View style={[s.profDot, { backgroundColor: meta.color }]} />
                    <Text style={[s.profChipText, selected && { color: meta.color, fontWeight: '700' }]}>
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, saving && s.primaryBtnDisabled, { marginTop: 24 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Add Skill</Text>
                </>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Skill Card ───────────────────────────────────────────────────────────────
function SkillCard({ skill, index }) {
  const meta = proficiencyMeta(skill.proficiency_level);
  return (
    <View style={s.skillCard}>
      {/* Category badge top-right */}
      {skill.category && (
        <View style={s.skillCategoryBadge}>
          <Text style={s.skillCategoryText}>{skill.category}</Text>
        </View>
      )}
      <Text style={s.skillCardName}>{skill.name}</Text>
      {skill.proficiency_level && (
        <View style={[s.skillProfBadge, { backgroundColor: meta.bg }]}>
          <View style={[s.profDot, { backgroundColor: meta.color, width: 6, height: 6 }]} />
          <Text style={[s.skillProfText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentProfileScreen({ navigation }) {
  const { userData, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [addSkillVisible, setAddSkillVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await getStudentProfile();
      console.log('📥 Profile response:', JSON.stringify(res.data, null, 2));
      setProfile(res.data);
    } catch (err) {
      console.log('❌ Fetch profile error:', err?.response?.data);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = profile?.display_name || userData?.display_name || 'Student';
  const detailedSkills = profile?.detailed_skills ?? [];
  const simpleSkills = profile?.skills ?? [];
  const hasSkills = detailedSkills.length > 0 || simpleSkills.length > 0;

  // ── Animated header opacity on scroll ────────────────────────────────────
  const headerBg = scrollY.interpolate({
    inputRange: [80, 160],
    outputRange: ['rgba(248,248,252,0)', 'rgba(248,248,252,1)'],
    extrapolate: 'clamp',
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={s.center}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="person-circle-outline" size={52} color={C.muted} />
        </View>
        <Text style={s.emptyTitle}>Profile unavailable</Text>
        <Text style={s.emptySubtext}>We couldn't load your data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchProfile}>
          <Ionicons name="refresh-outline" size={16} color={C.primary} />
          <Text style={s.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ── Floating nav header ───────────────────────────────────────── */}
      <Animated.View style={[s.floatingHeader, { backgroundColor: headerBg }]}>
        {/* <Text style={s.floatingHeaderTitle} numberOfLines={1}>{displayName}</Text> */}
      </Animated.View>

      <Animated.ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* ════════════════════════════════════════════════════════════
            HERO SECTION
        ════════════════════════════════════════════════════════════ */}
        <View style={s.hero}>
          {/* Background decorative blob */}
          <View style={s.heroBlobA} />
          <View style={s.heroBlobB} />

          {/* Avatar */}
          {/* Avatar */}
          <View style={s.avatarRing}>
            {profile?.profile_picture ? (
              <Image
                source={{ uri: profile.profile_picture }}
                style={s.avatarImage}
              />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials(displayName)}</Text>
              </View>
            )}
          </View>

          {/* Name & Email */}
          <Text style={s.heroName}>{displayName}</Text>
          <Text style={s.heroEmail}>{profile.email || userData?.email}</Text>

          {/* Pills row */}
          <View style={s.heroPillRow}>
            {profile.batch && (
              <View style={s.heroPill}>
                <Ionicons name="calendar-outline" size={11} color={C.primary} />
                <Text style={s.heroPillText}>Batch {profile.batch}</Text>
              </View>
            )}
            {profile.semester && (
              <View style={s.heroPill}>
                <Ionicons name="layers-outline" size={11} color={C.primary} />
                <Text style={s.heroPillText}>Sem {profile.semester}</Text>
              </View>
            )}
            {profile.degree && (
              <View style={[s.heroPill, { flexShrink: 1 }]}>
                <Ionicons name="school-outline" size={11} color={C.primary} />
                <Text style={s.heroPillText} numberOfLines={1}>{profile.degree}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio ? (
            <Text style={s.heroBio}>{profile.bio}</Text>
          ) : null}

          {/* Edit Button */}
          <TouchableOpacity
            style={s.editProfileBtn}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil" size={14} color="#fff" />
            <Text style={s.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════
            STATS ROW
        ════════════════════════════════════════════════════════════ */}
        <View style={s.statsRow}>
          <StatBox
            value={detailedSkills.length || simpleSkills.length}
            label="Skills"
            icon="code-slash-outline"
          />
          <View style={s.statsDivider} />
          <StatBox
            value={profile.semester ?? '—'}
            label="Semester"
            icon="layers-outline"
          />
          <View style={s.statsDivider} />
          <StatBox
            value={profile.roll_number ? profile.roll_number.split('-').pop() : '—'}
            label="Registration No."
            icon="id-card-outline"
          />
        </View>

        {/* ════════════════════════════════════════════════════════════
            PERSONAL INFORMATION
        ════════════════════════════════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader icon="person-outline" title="Personal Information" />
          <DetailRow icon="id-card-outline" label="Roll Number" value={profile.roll_number} />
          <DetailRow icon="school-outline" label="Degree" value={profile.degree} />
          <DetailRow icon="layers-outline" label="Semester" value={profile.semester ? `Semester ${profile.semester}` : null} />
          <DetailRow icon="calendar-outline" label="Batch" value={profile.batch} last />
        </View>

        {/* ════════════════════════════════════════════════════════════
            CONTACT INFORMATION
        ════════════════════════════════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader icon="call-outline" title="Contact Information" action={() => setEditVisible(true)} actionLabel="Edit" />
          <DetailRow icon="mail-outline" label="Email" value={profile.email || userData?.email} />
          <DetailRow icon="call-outline" label="Phone" value={profile.phone} last />
          {!profile.phone && (
            <TouchableOpacity style={s.emptyFieldRow} onPress={() => setEditVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={s.emptyFieldText}>Add phone number</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ════════════════════════════════════════════════════════════
            BIO
        ════════════════════════════════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader icon="chatbubble-ellipses-outline" title="About" action={() => setEditVisible(true)} actionLabel="Edit" />
          {profile.bio ? (
            <Text style={s.bioText}>{profile.bio}</Text>
          ) : (
            <TouchableOpacity style={s.emptyFieldRow} onPress={() => setEditVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={s.emptyFieldText}>Add a bio</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ════════════════════════════════════════════════════════════
            SKILLS
        ════════════════════════════════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader
            icon="code-slash-outline"
            title="Skills"
            action={() => setAddSkillVisible(true)}
            actionLabel="Add Skill"
          />

          {!hasSkills ? (
            <View style={s.emptySkills}>
              <Ionicons name="construct-outline" size={32} color={C.border} />
              <Text style={s.emptySkillsTitle}>No skills yet</Text>
              <Text style={s.emptySkillsSub}>Add your first skill to get matched with mentors</Text>
              <TouchableOpacity style={s.addFirstSkillBtn} onPress={() => setAddSkillVisible(true)}>
                <Ionicons name="add" size={15} color={C.primary} />
                <Text style={s.addFirstSkillText}>Add Your First Skill</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Detailed skills grid */}
              {detailedSkills.length > 0 && (
                <View style={s.skillGrid}>
                  {detailedSkills.map((skill, i) => (
                    <SkillCard key={skill.id || i} skill={skill} index={i} />
                  ))}
                </View>
              )}

              {/* Simple skills fallback */}
              {detailedSkills.length === 0 && simpleSkills.length > 0 && (
                <View style={s.simpleSkillsWrap}>
                  {simpleSkills.map((skill, i) => (
                    <View key={i} style={s.simpleSkillPill}>
                      <Text style={s.simpleSkillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Add more */}
              <TouchableOpacity style={s.addMoreRow} onPress={() => setAddSkillVisible(true)}>
                <Ionicons name="add-circle-outline" size={16} color={C.primary} />
                <Text style={s.addMoreText}>Add another skill</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ════════════════════════════════════════════════════════════
            MENTOR CTA BANNER
        ════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={s.mentorBanner}
          onPress={() => navigation.navigate('Mentors')}
          activeOpacity={0.88}
        >
          <View style={s.mentorBannerIcon}>
            <Ionicons name="people" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.mentorBannerTitle}>Find a Mentor</Text>
            <Text style={s.mentorBannerSub}>Connect with alumni working in your field</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>

        {/* ════════════════════════════════════════════════════════════
    LOGOUT
════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={logout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color={C.coral} />
          <Text style={s.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

      </Animated.ScrollView>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      <EditProfileModal
        visible={editVisible}
        profile={profile}
        onClose={() => setEditVisible(false)}
        onSaved={fetchProfile}
      />
      <AddSkillModal
        visible={addSkillVisible}
        onClose={() => setAddSkillVisible(false)}
        onSaved={fetchProfile}
      />
    </View>
  );
}

// ─── Stats Box ────────────────────────────────────────────────────────────────
function StatBox({ value, label, icon }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // ── Loader / Error
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.bg, gap: 10, paddingHorizontal: 32,
  },
  loadingText: { fontSize: 14, color: C.muted, marginTop: 4 },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.divider,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySubtext: { fontSize: 14, color: C.muted, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.primary,
    borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10,
    marginTop: 6,
  },
  retryText: { color: C.primary, fontWeight: '600', fontSize: 14 },

  // ── Floating header
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  floatingHeaderTitle: { fontSize: 16, fontWeight: '700', color: C.text },

  // ── Hero
  hero: {
    backgroundColor: C.card,
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
    marginBottom: 4,
  },
  heroBlobA: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.primarySoft,
    top: -60, right: -60, opacity: 0.6,
  },
  heroBlobB: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#EDE9FE',
    bottom: -30, left: -30, opacity: 0.5,
  },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 3, borderColor: C.primaryBorder,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    backgroundColor: C.card,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  heroName: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  heroEmail: { fontSize: 13, color: C.muted, marginTop: 3, marginBottom: 12 },
  heroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primarySoft,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.primaryBorder,
  },
  heroPillText: { fontSize: 12, fontWeight: '600', color: C.primary },
  heroBio: {
    fontSize: 13, color: C.subtext, textAlign: 'center',
    lineHeight: 20, marginBottom: 18, maxWidth: 280,
    fontStyle: 'italic',
  },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary,
    borderRadius: 22, paddingHorizontal: 22, paddingVertical: 10,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  editProfileBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: C.card,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingVertical: 18,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    elevation: 1,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: C.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2, fontWeight: '500' },
  statsDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  // ── Cards
  card: {
    backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    marginHorizontal: 16, marginTop: 12,
    paddingTop: 16, paddingHorizontal: 16, paddingBottom: 6,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    elevation: 1,
  },

  // ── Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  sectionAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primarySoft,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  sectionActionText: { fontSize: 12, fontWeight: '600', color: C.primary },

  // ── Detail rows
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  detailIconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  detailContent: { flex: 1 },
  detailLabel: {
    fontSize: 10, fontWeight: '600', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1,
  },
  detailValue: { fontSize: 14, color: C.text, fontWeight: '500' },

  // ── Bio text
  bioText: {
    fontSize: 14, color: C.subtext, lineHeight: 22,
    paddingBottom: 10, fontStyle: 'italic',
  },

  // ── Empty field rows
  emptyFieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingBottom: 10,
  },
  emptyFieldText: { fontSize: 13, color: C.primary, fontWeight: '500' },

  // ── Skills grid
  skillGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingBottom: 4,
  },
  skillCard: {
    backgroundColor: C.bg,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 12,
    minWidth: '45%', flex: 1,
    maxWidth: '50%',
  },
  skillCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.primarySoft,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    marginBottom: 6,
  },
  skillCategoryText: { fontSize: 9, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  skillCardName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
  skillProfBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  skillProfText: { fontSize: 10, fontWeight: '700' },

  simpleSkillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  simpleSkillPill: {
    backgroundColor: C.primarySoft,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: C.primaryBorder,
  },
  simpleSkillText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  // Empty skills state
  emptySkills: {
    alignItems: 'center', paddingVertical: 24, gap: 6, paddingBottom: 16,
  },
  emptySkillsTitle: { fontSize: 15, fontWeight: '700', color: C.subtext },
  emptySkillsSub: { fontSize: 12, color: C.muted, textAlign: 'center', maxWidth: 220 },
  addFirstSkillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8, marginTop: 8,
  },
  addFirstSkillText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  addMoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 12, paddingBottom: 6,
    borderTopWidth: 1, borderTopColor: C.divider,
    marginTop: 8,
  },
  addMoreText: { fontSize: 13, color: C.primary, fontWeight: '500' },

  // ── Mentor Banner
  mentorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: C.primarySoft,
    borderRadius: 16, borderWidth: 1, borderColor: C.primaryBorder,
    padding: 16,
  },
  mentorBannerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  mentorBannerTitle: { fontSize: 14, fontWeight: '700', color: C.primaryDark, marginBottom: 2 },
  mentorBannerSub: { fontSize: 12, color: C.primary, opacity: 0.75 },

  // ── Proficiency dot
  profDot: {
    width: 7, height: 7, borderRadius: 4,
  },

  // ── Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.divider,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.divider,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Input
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 12, fontWeight: '700', color: C.subtext,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text, backgroundColor: C.bg,
  },
  inputMultiline: { height: 90, paddingTop: 12 },

  // ── Chips
  chip: {
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginRight: 8, backgroundColor: C.bg,
  },
  chipSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  chipText: { fontSize: 13, color: C.subtext, fontWeight: '500' },
  chipTextSelected: { color: C.primary, fontWeight: '700' },

  // ── Proficiency chips
  proficiencyRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  profChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 10, backgroundColor: C.bg,
  },
  profChipText: { fontSize: 12, color: C.subtext, fontWeight: '600' },

  // ── Primary Button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.primary,
    borderRadius: 14, paddingVertical: 14,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: C.coralSoft,
    borderRadius: 16, borderWidth: 1, borderColor: '#FECACA',
    paddingVertical: 14,
  },
  logoutBtnText: {
    fontSize: 14, fontWeight: '600', color: C.coral,
  },

  // ── Info Notice
  infoNotice: {
    flexDirection: 'row', gap: 8,
    backgroundColor: C.primarySoft,
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.primaryBorder,
    marginBottom: 20, alignItems: 'flex-start',
  },
  infoNoticeText: { flex: 1, fontSize: 12, color: C.primary, lineHeight: 18 },

  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
});


const editStyles = StyleSheet.create({
  profilePicSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePicContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profilePicPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: C.primary,
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.primarySoft,
    borderWidth: 2,
    borderColor: C.primaryBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicPlaceholderText: {
    fontSize: 11,
    color: C.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: C.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profilePicHint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },
});