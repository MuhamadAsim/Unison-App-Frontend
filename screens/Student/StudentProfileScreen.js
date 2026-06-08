import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
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
import { AuthContext } from '../../context/AuthContext';
import {
  addSkill,
  deleteSkill,
  followUser,
  getFollowers,
  getFollowing,
  getStudentProfile,
  requestProfileUpgrade,
  unfollowUser,
  updateProfile,
} from '../../services/api';

// ─── Design Tokens ─────────────────────────────────────────────────────────
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

const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'expert'];
const SKILL_CATEGORIES = [
  'Programming', 'Data Science', 'Web Development', 'Mobile Development',
  'DevOps', 'Design', 'Machine Learning', 'Database', 'Networking', 'Other',
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const proficiencyMeta = (level = '') => {
  const map = {
    beginner:     { color: C.amber, bg: C.amberSoft, label: 'Beginner' },
    intermediate: { color: C.blue,  bg: C.blueSoft,  label: 'Intermediate' },
    expert:       { color: C.green, bg: C.greenSoft, label: 'Expert' },
  };
  return map[level?.toLowerCase()] ?? { color: C.muted, bg: C.border, label: level };
};

const pickImageFromLibrary = async (aspect = [1, 1]) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please grant camera roll permissions.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const ext = asset.uri.split('.').pop();
  return {
    uri: asset.uri,
    type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    name: `upload_${Date.now()}.${ext}`,
  };
};

// ─── Reusable Components ─────────────────────────────────────────────────────
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

// ─── [NEW] Followers / Following Modal ───────────────────────────────────────
// Shows a bottom-sheet list of either followers or following users.
// Each row shows avatar, display_name, username, role, and a follow/unfollow button
// so the user can manage their network without leaving the screen.
function ConnectionListModal({ visible, title, users, onClose, onFollowToggle, followingIds }) {
  const renderUser = ({ item }) => {
    const isFollowing = followingIds.has(item.id);
    return (
      <View style={connStyles.row}>
        <View style={connStyles.avatarWrap}>
          {item.profile_picture ? (
            <Image source={{ uri: item.profile_picture }} style={connStyles.avatar} />
          ) : (
            <View style={[connStyles.avatar, connStyles.avatarFallback]}>
              <Text style={connStyles.avatarText}>{initials(item.display_name)}</Text>
            </View>
          )}
        </View>
        <View style={connStyles.info}>
          <Text style={connStyles.name} numberOfLines={1}>{item.display_name}</Text>
          <Text style={connStyles.username}>@{item.username}</Text>
          {item.role && (
            <View style={connStyles.rolePill}>
              <Text style={connStyles.roleText}>{item.role}</Text>
            </View>
          )}
        </View>
        {/* Follow / Unfollow toggle per user */}
        <TouchableOpacity
          style={[connStyles.followBtn, isFollowing && connStyles.followingBtn]}
          onPress={() => onFollowToggle(item.id, isFollowing)}
        >
          <Text style={[connStyles.followBtnText, isFollowing && connStyles.followingBtnText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalSheet, { maxHeight: '75%' }]}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={20} color={C.subtext} />
            </TouchableOpacity>
          </View>
          {users.length === 0 ? (
            <View style={connStyles.emptyWrap}>
              <Ionicons name="people-outline" size={40} color={C.border} />
              <Text style={connStyles.emptyText}>No users yet</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item, i) => item.id ?? String(i)}
              renderItem={renderUser}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const connStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '700', color: C.text },
  username: { fontSize: 12, color: C.muted },
  rolePill: {
    alignSelf: 'flex-start', backgroundColor: C.primarySoft,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 2,
  },
  roleText: { fontSize: 10, fontWeight: '700', color: C.primary, textTransform: 'capitalize' },
  followBtn: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  followingBtn: { backgroundColor: C.primarySoft, borderColor: C.primaryBorder },
  followBtnText: { fontSize: 12, fontWeight: '700', color: C.primary },
  followingBtnText: { color: C.primaryDark },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: C.muted, fontWeight: '500' },
});

// ─── Edit Profile Modal ──────────────────────────────────────────────────────
function EditProfileModal({ visible, profile, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone]             = useState('');
  const [bio, setBio]                 = useState('');
  const [semester, setSemester]       = useState('');
  const [profilePic, setProfilePic]   = useState(null);
  const [backdropPic, setBackdropPic] = useState(null);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(profile?.display_name || '');
      setPhone(profile?.phone || '');
      setBio(profile?.bio || '');
      setSemester(profile?.semester ? String(profile.semester) : '');
      setProfilePic(null);
      setBackdropPic(null);
    }
  }, [visible, profile]);

  const handlePickProfilePic = async () => {
    Alert.alert('Profile Picture', 'Choose an option', [
      {
        text: 'Take Photo', onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return Alert.alert('Permission needed', 'Camera permission required.');
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            const a = result.assets[0];
            const ext = a.uri.split('.').pop();
            setProfilePic({ uri: a.uri, type: `image/${ext === 'jpg' ? 'jpeg' : ext}`, name: `profile_${Date.now()}.${ext}` });
          }
        },
      },
      { text: 'Choose from Library', onPress: async () => { const img = await pickImageFromLibrary([1, 1]); if (img) setProfilePic(img); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePickBackdrop = async () => {
    const img = await pickImageFromLibrary([16, 9]);
    if (img) setBackdropPic(img);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      if (displayName.trim()) formData.append('display_name', displayName.trim());
      if (phone.trim())       formData.append('phone', phone.trim());
      if (bio.trim())         formData.append('bio', bio.trim());
      if (semester)           formData.append('semester', String(semester));
      if (profilePic)  formData.append('profile_picture', { uri: profilePic.uri, type: profilePic.type, name: profilePic.name });
      if (backdropPic) formData.append('backDropImage',   { uri: backdropPic.uri, type: backdropPic.type, name: backdropPic.name });
      await updateProfile(formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const profilePicUri  = profilePic?.uri  || profile?.profile_picture || null;
  const backdropPicUri = backdropPic?.uri || profile?.backDropImage   || null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={20} color={C.subtext} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
            <Text style={[s.inputLabel, { marginBottom: 8 }]}>Cover / Backdrop Image</Text>
            <TouchableOpacity onPress={handlePickBackdrop} activeOpacity={0.8} style={editStyles.backdropContainer}>
              {backdropPicUri ? (
                <Image source={{ uri: backdropPicUri }} style={editStyles.backdropPreview} resizeMode="cover" />
              ) : (
                <View style={editStyles.backdropPlaceholder}>
                  <Ionicons name="image-outline" size={28} color={C.muted} />
                  <Text style={editStyles.backdropPlaceholderText}>Tap to add cover image</Text>
                </View>
              )}
              <View style={editStyles.backdropEditBadge}>
                <Ionicons name="camera" size={13} color="#fff" />
                <Text style={editStyles.backdropEditText}>Change Cover</Text>
              </View>
            </TouchableOpacity>

            <Text style={[s.inputLabel, { marginBottom: 8, marginTop: 20 }]}>Profile Picture</Text>
            <View style={editStyles.profilePicSection}>
              <TouchableOpacity onPress={handlePickProfilePic} activeOpacity={0.8}>
                <View style={editStyles.profilePicContainer}>
                  {profilePicUri ? (
                    <Image source={{ uri: profilePicUri }} style={editStyles.profilePicPreview} />
                  ) : (
                    <View style={editStyles.profilePicPlaceholder}>
                      <Ionicons name="camera" size={28} color={C.muted} />
                      <Text style={editStyles.profilePicPlaceholderText}>Add Photo</Text>
                    </View>
                  )}
                  <View style={editStyles.editIconBadge}>
                    <Ionicons name="pencil" size={13} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={editStyles.profilePicHint}>Tap to change</Text>
            </View>

            <InputField label="Display Name" value={displayName} onChangeText={setDisplayName} placeholder="Your full name" />
            <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+92 300 0000000" keyboardType="phone-pad" />

            <Text style={[s.inputLabel, { marginBottom: 8 }]}>Current Semester</Text>
            <View style={semStyles.semesterGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                const selected = semester === String(num);
                return (
                  <TouchableOpacity key={num} style={[semStyles.semBox, selected && semStyles.semBoxSelected]} onPress={() => setSemester(String(num))} activeOpacity={0.75}>
                    <Text style={[semStyles.semNum, selected && semStyles.semNumSelected]}>{num}</Text>
                    <Text style={[semStyles.semLabel, selected && semStyles.semLabelSelected]}>Sem</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <InputField label="Bio" value={bio} onChangeText={setBio} placeholder="A short bio about yourself..." multiline />

            <View style={s.infoNotice}>
              <Ionicons name="information-circle-outline" size={15} color={C.primary} />
              <Text style={s.infoNoticeText}>
                Roll number, degree and email are managed by the university and cannot be changed here.
              </Text>
            </View>

            <TouchableOpacity style={[s.primaryBtn, saving && s.primaryBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const semStyles = StyleSheet.create({
  semesterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  semBox: { width: '22%', aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  semBoxSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  semNum: { fontSize: 18, fontWeight: '800', color: C.muted },
  semNumSelected: { color: C.primary },
  semLabel: { fontSize: 9, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  semLabelSelected: { color: C.primary },
});

// ─── Add Skill Modal ──────────────────────────────────────────────────────────
function AddSkillModal({ visible, onClose, onSaved }) {
  const [skillName, setSkillName]   = useState('');
  const [category, setCategory]     = useState(SKILL_CATEGORIES[0]);
  const [proficiency, setProficiency] = useState(PROFICIENCY_LEVELS[0]);
  const [saving, setSaving]         = useState(false);

  const reset = () => { setSkillName(''); setCategory(SKILL_CATEGORIES[0]); setProficiency(PROFICIENCY_LEVELS[0]); };

  const handleAdd = async () => {
    if (!skillName.trim()) return Alert.alert('Validation', 'Please enter a skill name.');
    try {
      setSaving(true);
      await addSkill({ skill_name: skillName.trim(), category, proficiency_level: proficiency });
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
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add New Skill</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={20} color={C.subtext} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
            <InputField label="Skill Name" value={skillName} onChangeText={setSkillName} placeholder="e.g. Python, React Native, SQL..." />
            <Text style={[s.inputLabel, { marginBottom: 8 }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {SKILL_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[s.chip, category === cat && s.chipSelected]} onPress={() => setCategory(cat)}>
                  <Text style={[s.chipText, category === cat && s.chipTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[s.inputLabel, { marginBottom: 8 }]}>Proficiency Level</Text>
            <View style={s.proficiencyRow}>
              {PROFICIENCY_LEVELS.map(level => {
                const meta = proficiencyMeta(level);
                const selected = proficiency === level;
                return (
                  <TouchableOpacity key={level} style={[s.profChip, { borderColor: selected ? meta.color : C.border }, selected && { backgroundColor: meta.bg }]} onPress={() => setProficiency(level)}>
                    <View style={[s.profDot, { backgroundColor: meta.color }]} />
                    <Text style={[s.profChipText, selected && { color: meta.color, fontWeight: '700' }]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={[s.primaryBtn, saving && s.primaryBtnDisabled, { marginTop: 24 }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Add Skill</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────
function UpgradeModal({ visible, onClose, onSaved }) {
  const [graduationYear, setGraduationYear] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (visible) setGraduationYear(''); }, [visible]);

  const handleSubmit = async () => {
    if (!graduationYear) return Alert.alert('Error', 'Graduation year is required.');
    try {
      setSaving(true);
      await requestProfileUpgrade({ graduation_year: Number(graduationYear) });
      Alert.alert('Success', 'Profile upgrade request submitted successfully.');
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Upgrade to Alumni</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}><Ionicons name="close" size={20} color={C.subtext} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
            <Text style={{ marginBottom: 20, color: C.subtext, fontSize: 14, lineHeight: 21 }}>
              Provide your graduation year to request an alumni profile upgrade. The admin will review and notify you.
            </Text>
            <InputField label="Graduation Year *" placeholder="e.g. 2025" value={graduationYear} onChangeText={setGraduationYear} keyboardType="number-pad" />
            <TouchableOpacity style={[s.primaryBtn, saving && s.primaryBtnDisabled, { marginTop: 8 }]} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Submit Request</Text>}
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Skill Card ───────────────────────────────────────────────────────────────
function SkillCard({ skill, onDelete, deleting }) {
  const meta = proficiencyMeta(skill.proficiency_level);
  return (
    <View style={s.skillCard}>
      {skill.category && (
        <View style={s.skillCategoryBadge}>
          <Text style={s.skillCategoryText}>{skill.category}</Text>
        </View>
      )}
      <View style={skillCardStyles.nameRow}>
        <Text style={[s.skillCardName, { flex: 1 }]}>{skill.skill_name || skill.name || skill.skill}</Text>
        <TouchableOpacity onPress={onDelete} disabled={deleting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={skillCardStyles.deleteBtn}>
          {deleting ? <ActivityIndicator size={10} color={C.muted} /> : <Ionicons name="close" size={12} color={C.muted} />}
        </TouchableOpacity>
      </View>
      {skill.proficiency_level && (
        <View style={[s.skillProfBadge, { backgroundColor: meta.bg }]}>
          <View style={[s.profDot, { backgroundColor: meta.color, width: 6, height: 6 }]} />
          <Text style={[s.skillProfText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      )}
    </View>
  );
}

const skillCardStyles = StyleSheet.create({
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 8 },
  deleteBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
});

// ─── [UPDATED] StatBox — now tappable for followers/following ─────────────────
function StatBox({ value, label, onPress }) {
  const inner = (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
  if (!onPress) return inner;
  return (
    <TouchableOpacity style={s.statBox} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={[s.statLabel, { color: C.primary }]}>{label}</Text>
      <Ionicons name="chevron-down" size={10} color={C.primary} style={{ marginTop: 1 }} />
    </TouchableOpacity>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
const BACKDROP_HEIGHT = 180;
const AVATAR_SIZE = 88;

function HeroSection({ profile, displayName, onEditPress }) {
  const backdropUri  = profile?.backDropImage   || null;
  const profilePicUri = profile?.profile_picture || null;

  return (
    <View style={hero.wrapper}>
      <View style={hero.backdropContainer}>
        {backdropUri ? (
          <Image source={{ uri: backdropUri }} style={hero.backdropImage} resizeMode="cover" />
        ) : (
          <View style={hero.backdropFallback}>
            <View style={hero.blobA} />
            <View style={hero.blobB} />
          </View>
        )}
        <TouchableOpacity style={hero.backdropEditBtn} onPress={onEditPress}>
          <Ionicons name="camera-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={hero.avatarRing}>
        {profilePicUri ? (
          <Image source={{ uri: profilePicUri }} style={hero.avatarImage} />
        ) : (
          <View style={hero.avatarFallback}>
            <Text style={hero.avatarText}>{initials(displayName)}</Text>
          </View>
        )}
      </View>

      <View style={hero.infoContainer}>
        <Text style={hero.name}>{displayName}</Text>
        {profile?.username ? <Text style={hero.username}>@{profile.username}</Text> : null}
        <Text style={hero.meta}>
          {[profile?.degree, profile?.batch, profile?.semester ? `Semester ${profile.semester}` : null].filter(Boolean).join(' · ')}
        </Text>
        <View style={hero.pillRow}>
          {profile?.batch    && <View style={hero.pill}><Ionicons name="calendar-outline" size={11} color={C.primary} /><Text style={hero.pillText}>Batch {profile.batch}</Text></View>}
          {profile?.semester && <View style={hero.pill}><Ionicons name="layers-outline"   size={11} color={C.primary} /><Text style={hero.pillText}>Sem {profile.semester}</Text></View>}
          {profile?.degree   && <View style={[hero.pill, { flexShrink: 1 }]}><Ionicons name="school-outline" size={11} color={C.primary} /><Text style={hero.pillText} numberOfLines={1}>{profile.degree}</Text></View>}
        </View>
        {profile?.bio ? <Text style={hero.bio}>{profile.bio}</Text> : null}
        <TouchableOpacity style={hero.editBtn} onPress={onEditPress} activeOpacity={0.85}>
          <Ionicons name="pencil" size={14} color="#fff" />
          <Text style={hero.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const hero = StyleSheet.create({
  wrapper: { backgroundColor: C.card, marginBottom: 4 },
  backdropContainer: { height: BACKDROP_HEIGHT, overflow: 'hidden', position: 'relative' },
  backdropImage: { width: '100%', height: '100%' },
  backdropFallback: { flex: 1, backgroundColor: C.primarySoft, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#C7D2FE', top: -60, right: -40, opacity: 0.7 },
  blobB: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#EDE9FE', bottom: -40, left: -20, opacity: 0.6 },
  backdropEditBtn: { position: 'absolute', bottom: 10, right: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  avatarRing: { width: AVATAR_SIZE + 6, height: AVATAR_SIZE + 6, borderRadius: (AVATAR_SIZE + 6) / 2, borderWidth: 3, borderColor: C.card, backgroundColor: C.card, alignSelf: 'center', marginTop: -(AVATAR_SIZE / 2 + 3), zIndex: 2, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: (AVATAR_SIZE + 6) / 2 },
  avatarFallback: { flex: 1, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  infoContainer: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 24 },
  name: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  username: { fontSize: 13, color: C.muted, marginTop: 2 },
  meta: { fontSize: 12, color: C.subtext, marginTop: 4, marginBottom: 10, textAlign: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.primaryBorder },
  pillText: { fontSize: 12, fontWeight: '600', color: C.primary },
  bio: { fontSize: 13, color: C.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 18, maxWidth: 280, fontStyle: 'italic' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 10, shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentProfileScreen({ navigation }) {
  const { userData, logout } = useContext(AuthContext);
  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [editVisible, setEditVisible]     = useState(false);
  const [addSkillVisible, setAddSkillVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible]   = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState(null);

  // ── [NEW] Followers / Following state ─────────────────────────────────────
  const [followers, setFollowers]         = useState([]);
  const [following, setFollowing]         = useState([]);
  // Set of IDs the current user follows — used to render Follow/Following toggle inside the modal
  const [followingIds, setFollowingIds]   = useState(new Set());
  const [connModal, setConnModal]         = useState(null); // 'followers' | 'following' | null
  const [connLoading, setConnLoading]     = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await getStudentProfile();
      setProfile(res.data);
    } catch (err) {
      if (err.response?.status === 401) logout();
      else Alert.alert('Error', err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // ── [NEW] Fetch followers and following for own profile ───────────────────
  // Called once the profile is loaded so we have the user's own ID.
  const fetchConnectionData = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setConnLoading(true);
      const [followersRes, followingRes] = await Promise.all([
        getFollowers(userId),
        getFollowing(userId),
      ]);
      const followersData = followersRes.data ?? [];
      const followingData = followingRes.data ?? [];
      setFollowers(followersData);
      setFollowing(followingData);
      // Build a Set of IDs the current user is following for quick lookup
      setFollowingIds(new Set(followingData.map(u => u.id)));
    } catch {
      // Non-critical — silently ignore, counts just show 0
    } finally {
      setConnLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  // Re-fetch connection data whenever profile loads
  useEffect(() => {
    if (profile?.id) fetchConnectionData(profile.id);
  }, [profile?.id, fetchConnectionData]);

  // ── [NEW] Follow / Unfollow toggle inside the connection list modal ────────
  const handleFollowToggle = async (targetId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetId);
        setFollowingIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
        // Update following list
        setFollowing(prev => prev.filter(u => u.id !== targetId));
      } else {
        await followUser(targetId);
        setFollowingIds(prev => new Set([...prev, targetId]));
        // Re-fetch following list to get full user object
        if (profile?.id) {
          const res = await getFollowing(profile.id);
          setFollowing(res.data ?? []);
        }
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Action failed. Please try again.');
    }
  };

  // ── [FIX] deleteSkill was referenced but never imported — use deleteStudentSkill
  const handleDeleteSkill = async (skillId) => {
    try {
      setDeletingSkillId(skillId);
      await deleteSkill(skillId);
      setProfile(prev => ({
        ...prev,
        detailed_skills: prev.detailed_skills?.filter(sk => sk.id !== skillId),
      }));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete skill');
    } finally {
      setDeletingSkillId(null);
    }
  };

  const displayName    = profile?.display_name || userData?.display_name || 'Student';
  const detailedSkills = profile?.detailed_skills ?? [];
  const simpleSkills   = profile?.skills ?? [];
  const hasSkills      = detailedSkills.length > 0 || simpleSkills.length > 0;

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
        <Ionicons name="person-circle-outline" size={52} color={C.muted} />
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
      <Animated.ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <HeroSection profile={profile} displayName={displayName} onEditPress={() => setEditVisible(true)} />

        {/* ── [UPDATED] Stats Row — now includes Followers + Following, tappable ── */}
        <View style={s.statsRow}>
          {/* Followers: taps open the followers modal */}
          <StatBox
            value={connLoading ? '…' : followers.length}
            label="Followers"
            onPress={() => setConnModal('followers')}
          />
          <View style={s.statsDivider} />
          {/* Following: taps open the following modal */}
          <StatBox
            value={connLoading ? '…' : following.length}
            label="Following"
            onPress={() => setConnModal('following')}
          />
          <View style={s.statsDivider} />
          <StatBox value={detailedSkills.length || simpleSkills.length} label="Skills" />
        </View>

        {/* ── Personal Information ── */}
        <View style={s.card}>
          <SectionHeader icon="person-outline" title="Personal Information" />
          <DetailRow icon="id-card-outline"  label="Roll Number" value={profile.roll_number} />
          <DetailRow icon="school-outline"   label="Degree"      value={profile.degree} />
          <DetailRow icon="layers-outline"   label="Semester"    value={profile.semester ? `Semester ${profile.semester}` : null} />
          <DetailRow icon="calendar-outline" label="Batch"       value={profile.batch} last />
        </View>

        {/* ── Contact Information ── */}
        <View style={s.card}>
          <SectionHeader icon="call-outline" title="Contact Information" action={() => setEditVisible(true)} actionLabel="Edit" />
          <DetailRow icon="mail-outline" label="Email" value={profile.email || userData?.email} />
          <DetailRow icon="call-outline" label="Phone" value={profile.phone} last={!profile.phone} />
          {!profile.phone && (
            <TouchableOpacity style={s.emptyFieldRow} onPress={() => setEditVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={s.emptyFieldText}>Add phone number</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Bio ── */}
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

        {/* ── Skills ── */}
        <View style={s.card}>
          <SectionHeader icon="code-slash-outline" title="Skills" action={() => setAddSkillVisible(true)} actionLabel="Add Skill" />
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
              {detailedSkills.length > 0 && (
                <View style={s.skillGrid}>
                  {detailedSkills.map((skill, i) => (
                    <SkillCard
                      key={skill.id || i}
                      skill={skill}
                      onDelete={() => handleDeleteSkill(skill.id)}
                      deleting={deletingSkillId === skill.id}
                    />
                  ))}
                </View>
              )}
              {detailedSkills.length === 0 && simpleSkills.length > 0 && (
                <View style={s.simpleSkillsWrap}>
                  {simpleSkills.map((skill, i) => (
                    <View key={i} style={s.simpleSkillPill}>
                      <Text style={s.simpleSkillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={s.addMoreRow} onPress={() => setAddSkillVisible(true)}>
                <Ionicons name="add-circle-outline" size={16} color={C.primary} />
                <Text style={s.addMoreText}>Add another skill</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Mentor CTA ── */}
        <TouchableOpacity style={s.mentorBanner} onPress={() => navigation.navigate('Mentors')} activeOpacity={0.88}>
          <View style={s.mentorBannerIcon}>
            <Ionicons name="people" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.mentorBannerTitle}>Find a Mentor</Text>
            <Text style={s.mentorBannerSub}>Connect with alumni working in your field</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>

        {/* ── Upgrade to Alumni ── */}
        {profile?.upgrade_status !== 'approved' && (
          <TouchableOpacity style={s.upgradeBtn} onPress={() => setUpgradeVisible(true)} activeOpacity={0.85}>
            <Ionicons name="star" size={18} color={C.amber} />
            <Text style={s.upgradeBtnText}>
              {profile?.upgrade_status === 'pending' ? 'Upgrade Pending…' : 'Upgrade to Alumni'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Logout ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={C.coral} />
          <Text style={s.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* ── Modals ── */}
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
      <UpgradeModal
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        onSaved={fetchProfile}
      />

      {/* ── [NEW] Followers modal ── */}
      <ConnectionListModal
        visible={connModal === 'followers'}
        title={`Followers (${followers.length})`}
        users={followers}
        followingIds={followingIds}
        onFollowToggle={handleFollowToggle}
        onClose={() => setConnModal(null)}
      />

      {/* ── [NEW] Following modal ── */}
      <ConnectionListModal
        visible={connModal === 'following'}
        title={`Following (${following.length})`}
        users={following}
        followingIds={followingIds}
        onFollowToggle={handleFollowToggle}
        onClose={() => setConnModal(null)}
      />
    </View>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 10, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: C.muted, marginTop: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySubtext: { fontSize: 14, color: C.muted, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.primary, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10, marginTop: 6 },
  retryText: { color: C.primary, fontWeight: '600', fontSize: 14 },

  statsRow: { flexDirection: 'row', backgroundColor: C.card, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingVertical: 18, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: C.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2, fontWeight: '500' },
  statsDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginHorizontal: 16, marginTop: 12, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 6, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.divider },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  sectionActionText: { fontSize: 12, fontWeight: '600', color: C.primary },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.divider },
  detailIconBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  detailValue: { fontSize: 14, color: C.text, fontWeight: '500' },

  bioText: { fontSize: 14, color: C.subtext, lineHeight: 22, paddingBottom: 10, fontStyle: 'italic' },
  emptyFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingBottom: 10 },
  emptyFieldText: { fontSize: 13, color: C.primary, fontWeight: '500' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 4 },
  skillCard: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, minWidth: '45%', flex: 1, maxWidth: '50%' },
  skillCategoryBadge: { alignSelf: 'flex-start', backgroundColor: C.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  skillCategoryText: { fontSize: 9, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  skillCardName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
  skillProfBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  skillProfText: { fontSize: 10, fontWeight: '700' },
  simpleSkillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  simpleSkillPill: { backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.primaryBorder },
  simpleSkillText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  emptySkills: { alignItems: 'center', paddingVertical: 24, gap: 6, paddingBottom: 16 },
  emptySkillsTitle: { fontSize: 15, fontWeight: '700', color: C.subtext },
  emptySkillsSub: { fontSize: 12, color: C.muted, textAlign: 'center', maxWidth: 220 },
  addFirstSkillBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, marginTop: 8 },
  addFirstSkillText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  addMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.divider, marginTop: 8 },
  addMoreText: { fontSize: 13, color: C.primary, fontWeight: '500' },

  mentorBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginTop: 16, backgroundColor: C.primarySoft, borderRadius: 16, borderWidth: 1, borderColor: C.primaryBorder, padding: 16 },
  mentorBannerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  mentorBannerTitle: { fontSize: 14, fontWeight: '700', color: C.primaryDark, marginBottom: 2 },
  mentorBannerSub: { fontSize: 12, color: C.primary, opacity: 0.75 },

  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, backgroundColor: C.amberSoft, borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A', paddingVertical: 14 },
  upgradeBtnText: { fontSize: 14, fontWeight: '700', color: C.amber },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, backgroundColor: C.coralSoft, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', paddingVertical: 14 },
  logoutBtnText: { fontSize: 14, fontWeight: '600', color: C.coral },

  profDot: { width: 7, height: 7, borderRadius: 4 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, maxHeight: '92%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.divider, marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, backgroundColor: C.bg },
  inputMultiline: { height: 90, paddingTop: 12 },

  chip: { borderWidth: 1.5, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: C.bg },
  chipSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  chipText: { fontSize: 13, color: C.subtext, fontWeight: '500' },
  chipTextSelected: { color: C.primary, fontWeight: '700' },

  proficiencyRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  profChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, backgroundColor: C.bg },
  profChipText: { fontSize: 12, color: C.subtext, fontWeight: '600' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  infoNotice: { flexDirection: 'row', gap: 8, backgroundColor: C.primarySoft, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.primaryBorder, marginBottom: 20, alignItems: 'flex-start' },
  infoNoticeText: { flex: 1, fontSize: 12, color: C.primary, lineHeight: 18 },
});

const editStyles = StyleSheet.create({
  backdropContainer: { width: '100%', height: 130, borderRadius: 16, overflow: 'hidden', backgroundColor: C.primarySoft, marginBottom: 4, position: 'relative' },
  backdropPreview: { width: '100%', height: '100%' },
  backdropPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1.5, borderColor: C.primaryBorder, borderStyle: 'dashed' },
  backdropPlaceholderText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  backdropEditBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  backdropEditText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  profilePicSection: { alignItems: 'center', marginBottom: 24 },
  profilePicContainer: { position: 'relative', marginBottom: 6 },
  profilePicPreview: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: C.primary },
  profilePicPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.primarySoft, borderWidth: 2, borderColor: C.primaryBorder, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  profilePicPlaceholderText: { fontSize: 11, color: C.primary, marginTop: 4, fontWeight: '500' },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: C.primary, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  profilePicHint: { fontSize: 11, color: C.muted },
});