import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import {
  addEducation,
  addSkill,
  addWorkExperience,
  deleteEducation,
  deleteOpportunity,
  deleteSkill,
  deleteWorkExperience,
  getAlumniProfile,
  getFollowers,
  getFollowing,
  getMyOpportunities,
  getPartnerProfile,
  updateEducation,
  updateProfile,
  updateWorkExperience
} from '../../services/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#534AB7',
  primaryDark: '#3730A3',
  primarySoft: '#EEEDFE',
  primaryBorder: '#C7D2FE',
  bg: '#F4F4F8',
  card: '#FFFFFF',
  text: '#1A1A2E',
  subtext: '#6B7280',
  muted: '#9CA3AF',
  border: '#E8E8F0',
  divider: '#F3F4F6',
  green: '#059669', greenSoft: '#D1FAE5',
  amber: '#D97706', amberSoft: '#FEF3C7',
  blue: '#2563EB', blueSoft: '#DBEAFE',
  coral: '#DC2626', coralSoft: '#FEE2E2',
  shadow: 'rgba(83,74,183,0.10)',
};

const BACKDROP_HEIGHT = 180;
const AVATAR_SIZE = 88;

const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'expert'];
const SKILL_CATEGORIES = [
  'Programming', 'Data Science', 'Web Development', 'Mobile Development',
  'DevOps', 'Design', 'Machine Learning', 'Database', 'Networking', 'Other',
];
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'freelance'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const proficiencyMeta = level => {
  const map = {
    beginner: { color: C.amber, bg: C.amberSoft, label: 'Beginner' },
    intermediate: { color: C.blue, bg: C.blueSoft, label: 'Intermediate' },
    expert: { color: C.green, bg: C.greenSoft, label: 'Expert' },
  };
  return map[level?.toLowerCase()] ?? { color: C.muted, bg: C.border, label: level ?? '' };
};

const employmentMeta = type => {
  const map = {
    'full-time': { color: C.green, bg: C.greenSoft, label: 'Full-time' },
    'part-time': { color: C.blue, bg: C.blueSoft, label: 'Part-time' },
    'freelance': { color: C.amber, bg: C.amberSoft, label: 'Freelance' },
  };
  return map[type] ?? { color: C.muted, bg: C.border, label: type ?? '' };
};

const formatDateRange = (start, end, isCurrent) => {
  const fmt = d => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  const s = fmt(start);
  const e = isCurrent ? 'Present' : fmt(end);
  if (!s && !e) return '';
  if (!s) return e;
  if (!e) return s;
  return `${s} – ${e}`;
};

const pickImageFromLibrary = async (aspect = [1, 1]) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please grant camera roll access.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const ext = asset.uri.split('.').pop();
  return { uri: asset.uri, type: `image/${ext === 'jpg' ? 'jpeg' : ext}`, name: `upload_${Date.now()}.${ext}` };
};

// ─── Shared Primitives ────────────────────────────────────────────────────────
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

function DetailRow({ icon, label, value, last, onPress }) {
  if (!value) return null;
  const inner = (
    <View style={[s.detailRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.detailIconBox}>
        <Ionicons name={icon} size={14} color={C.primary} />
      </View>
      <View style={s.detailContent}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={[s.detailValue, onPress && { color: C.primary }]} numberOfLines={1}>{value}</Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={14} color={C.primary} />}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress}>{inner}</TouchableOpacity>;
  return inner;
}

function InputField({ label, value, onChangeText, placeholder, multiline, keyboardType, editable = true }) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMultiline, !editable && s.inputReadOnly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={editable}
      />
    </View>
  );
}

function StatBox({ value, label }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value ?? '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, sub, onAction, actionLabel }) {
  return (
    <View style={s.emptyState}>
      <Ionicons name={icon} size={32} color={C.border} />
      <Text style={s.emptyTitle}>{title}</Text>
      {sub ? <Text style={s.emptySub}>{sub}</Text> : null}
      {onAction && (
        <TouchableOpacity style={s.emptyActionBtn} onPress={onAction}>
          <Ionicons name="add" size={15} color={C.primary} />
          <Text style={s.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────
function ModalShell({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={20} color={C.subtext} />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ paddingHorizontal: 20 }}
          >
            {children}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function HeroSection({ profile, onEditPress }) {
  const backdropUri = profile?.backDropImage || null;
  const profilePicUri = profile?.profile_picture || null;
  const displayName = profile?.display_name || '';
  const isPartner = profile?.role === 'partner';

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
        <Text style={hero.username}>@{profile?.username}</Text>

        {isPartner ? (
          (profile?.job_title || profile?.affiliation) ? (
            <Text style={hero.jobLine}>
              {profile.job_title}
              {profile.job_title && profile.affiliation ? ' at ' : ''}
              {profile.affiliation}
            </Text>
          ) : null
        ) : (
          (profile?.job_role || profile?.current_company) ? (
            <Text style={hero.jobLine}>
              {profile.job_role}
              {profile.job_role && profile.current_company ? ' at ' : ''}
              {profile.current_company}
            </Text>
          ) : null
        )}

        {!isPartner && (
          <Text style={hero.meta}>
            {[
              profile?.degree,
              profile?.batch,
              profile?.graduation_year ? `Class of ${profile.graduation_year}` : null,
            ].filter(Boolean).join(' · ')}
          </Text>
        )}

        <View style={hero.pillRow}>
          {isPartner ? (
            <>
              {profile?.affiliation ? (
                <View style={hero.pill}>
                  <Ionicons name="business-outline" size={11} color={C.primary} />
                  <Text style={hero.pillText}>{profile.affiliation}</Text>
                </View>
              ) : null}
              {profile?.job_title ? (
                <View style={[hero.pill, { flexShrink: 1 }]}>
                  <Ionicons name="briefcase-outline" size={11} color={C.primary} />
                  <Text style={hero.pillText} numberOfLines={1}>{profile.job_title}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              {profile?.batch ? (
                <View style={hero.pill}>
                  <Ionicons name="calendar-outline" size={11} color={C.primary} />
                  <Text style={hero.pillText}>Batch {profile.batch}</Text>
                </View>
              ) : null}
              {profile?.graduation_year ? (
                <View style={hero.pill}>
                  <Ionicons name="ribbon-outline" size={11} color={C.primary} />
                  <Text style={hero.pillText}>Class of {profile.graduation_year}</Text>
                </View>
              ) : null}
              {profile?.degree ? (
                <View style={[hero.pill, { flexShrink: 1 }]}>
                  <Ionicons name="school-outline" size={11} color={C.primary} />
                  <Text style={hero.pillText} numberOfLines={1}>{profile.degree}</Text>
                </View>
              ) : null}
            </>
          )}
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

// ─── EDIT PROFILE MODAL ───────────────────────────────────────────────────────
function EditProfileModal({ visible, profile, onClose, onSaved, logout }) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [backdropPic, setBackdropPic] = useState(null);
  const [saving, setSaving] = useState(false);

  const isPartner = profile?.role === 'partner';

  useEffect(() => {
    if (visible) {
      setDisplayName(profile?.display_name || '');
      setBio(profile?.bio || '');
      setPhone(profile?.phone || '');
      setLinkedin(profile?.linkedin_url || '');
      setAffiliation(profile?.affiliation || '');
      setJobTitle(profile?.job_title || '');
      setProfilePic(null);
      setBackdropPic(null);
    }
  }, [visible, profile]);

  const handlePickProfile = () => {
    Alert.alert('Profile Picture', 'Choose an option', [
      {
        text: 'Take Photo', onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return Alert.alert('Permission needed', 'Camera permission required.');
          const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!r.canceled && r.assets?.[0]) {
            const a = r.assets[0];
            const ext = a.uri.split('.').pop();
            setProfilePic({ uri: a.uri, type: `image/${ext === 'jpg' ? 'jpeg' : ext}`, name: `profile_${Date.now()}.${ext}` });
          }
        },
      },
      { text: 'Choose from Library', onPress: async () => { const img = await pickImageFromLibrary([1, 1]); if (img) setProfilePic(img); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const fd = new FormData();
      if (displayName.trim()) fd.append('display_name', displayName.trim());
      if (bio.trim()) fd.append('bio', bio.trim());
      if (phone.trim()) fd.append('phone', phone.trim());
      if (linkedin.trim()) fd.append('linkedin_url', linkedin.trim());
      if (isPartner) {
        if (affiliation.trim()) fd.append('affiliation', affiliation.trim());
        if (jobTitle.trim()) fd.append('job_title', jobTitle.trim());
      }
      if (profilePic) fd.append('profile_picture', { uri: profilePic.uri, type: profilePic.type, name: profilePic.name });
      if (backdropPic) fd.append('backDropImage', { uri: backdropPic.uri, type: backdropPic.type, name: backdropPic.name });

      await updateProfile(fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 401) logout();
      else Alert.alert('Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const profilePicUri = profilePic?.uri || profile?.profile_picture || null;
  const backdropUri = backdropPic?.uri || profile?.backDropImage || null;

  return (
    <ModalShell visible={visible} title="Edit Profile" onClose={onClose}>
      <Text style={[s.inputLabel, { marginBottom: 8 }]}>Cover / Backdrop Image</Text>
      <TouchableOpacity
        onPress={async () => { const img = await pickImageFromLibrary([16, 9]); if (img) setBackdropPic(img); }}
        activeOpacity={0.8}
        style={editSt.backdropContainer}
      >
        {backdropUri ? (
          <Image source={{ uri: backdropUri }} style={editSt.backdropPreview} resizeMode="cover" />
        ) : (
          <View style={editSt.backdropPlaceholder}>
            <Ionicons name="image-outline" size={28} color={C.muted} />
            <Text style={editSt.placeholderText}>Tap to add cover image</Text>
          </View>
        )}
        <View style={editSt.backdropBadge}>
          <Ionicons name="camera" size={13} color="#fff" />
          <Text style={editSt.backdropBadgeText}>Change Cover</Text>
        </View>
      </TouchableOpacity>

      <Text style={[s.inputLabel, { marginBottom: 8, marginTop: 20 }]}>Profile Picture</Text>
      <View style={editSt.profilePicSection}>
        <TouchableOpacity onPress={handlePickProfile} activeOpacity={0.8}>
          <View style={editSt.profilePicContainer}>
            {profilePicUri ? (
              <Image source={{ uri: profilePicUri }} style={editSt.profilePicPreview} />
            ) : (
              <View style={editSt.profilePicPlaceholder}>
                <Ionicons name="camera" size={28} color={C.muted} />
                <Text style={editSt.placeholderText}>Add Photo</Text>
              </View>
            )}
            <View style={editSt.editIconBadge}>
              <Ionicons name="pencil" size={13} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
        <Text style={editSt.hint}>Tap to change</Text>
      </View>

      <InputField label="Display Name" value={displayName} onChangeText={setDisplayName} placeholder="Your full name" />
      <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+92 300 0000000" keyboardType="phone-pad" />
      <InputField label="LinkedIn URL" value={linkedin} onChangeText={setLinkedin} placeholder="https://linkedin.com/in/..." keyboardType="url" />
      <InputField label="Bio" value={bio} onChangeText={setBio} placeholder="A short bio about yourself…" multiline />

      {isPartner && (
        <>
          <InputField label="Company / Organization" value={affiliation} onChangeText={setAffiliation} placeholder="e.g. Google" />
          <InputField label="Job Title" value={jobTitle} onChangeText={setJobTitle} placeholder="e.g. HR Manager" />
        </>
      )}

      <View style={s.infoNotice}>
        <Ionicons name="information-circle-outline" size={15} color={C.primary} />
        <Text style={s.infoNoticeText}>
          {isPartner
            ? 'Your email and role are managed by the platform and cannot be changed here.'
            : 'Degree, batch, and roll number are managed by the university and cannot be changed here.'
          }
        </Text>
      </View>

      <TouchableOpacity style={[s.primaryBtn, saving && s.primaryBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Save Changes</Text>}
      </TouchableOpacity>
    </ModalShell>
  );
}

// ─── ADD WORK EXPERIENCE MODAL ────────────────────────────────────────────────
function AddWorkExperienceModal({ visible, onClose, onSaved, logout }) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [empType, setEmpType] = useState('full-time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCompany(''); setRole(''); setEmpType('full-time');
    setStartDate(''); setEndDate(''); setIsCurrent(false);
  };

  const handleSave = async () => {
    if (!company.trim()) return Alert.alert('Validation', 'Company name is required.');
    if (!role.trim()) return Alert.alert('Validation', 'Role is required.');
    if (!startDate.trim()) return Alert.alert('Validation', 'Start date is required (YYYY-MM-DD).');
    try {
      setSaving(true);
      await addWorkExperience({
        company_name: company.trim(),
        role: role.trim(),
        employment_type: empType,
        start_date: startDate.trim(),
        end_date: isCurrent ? null : (endDate.trim() || null),
        is_current: isCurrent,
      });
      reset();
      await onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 401) logout();
      else Alert.alert('Error', err.response?.data?.message || 'Failed to add work experience.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell visible={visible} title="Add Work Experience" onClose={onClose}>
      <InputField label="Company Name *" value={company} onChangeText={setCompany} placeholder="e.g. Google" />
      <InputField label="Role / Title *" value={role} onChangeText={setRole} placeholder="e.g. Software Engineer" />

      <Text style={s.inputLabel}>Employment Type</Text>
      <View style={workSt.chipRow}>
        {EMPLOYMENT_TYPES.map(t => {
          const meta = employmentMeta(t);
          const sel = empType === t;
          return (
            <TouchableOpacity
              key={t}
              style={[workSt.typeChip, sel && { borderColor: meta.color, backgroundColor: meta.bg }]}
              onPress={() => setEmpType(t)}
            >
              <Text style={[workSt.typeChipText, sel && { color: meta.color, fontWeight: '700' }]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <InputField
        label="Start Date * (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        placeholder="2022-06-01"
        keyboardType="numbers-and-punctuation"
      />

      <View style={workSt.toggleRow}>
        <Text style={s.inputLabel}>I currently work here</Text>
        <Switch
          value={isCurrent}
          onValueChange={setIsCurrent}
          trackColor={{ false: C.border, true: C.primaryBorder }}
          thumbColor={isCurrent ? C.primary : C.muted}
        />
      </View>

      {!isCurrent && (
        <InputField
          label="End Date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2024-01-01"
          keyboardType="numbers-and-punctuation"
        />
      )}

      <TouchableOpacity
        style={[s.primaryBtn, saving && s.primaryBtnDisabled, { marginTop: 8 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.primaryBtnText}>Add Experience</Text>
        }
      </TouchableOpacity>
    </ModalShell>
  );
}

// ─── EDIT WORK EXPERIENCE MODAL ───────────────────────────────────────────────
function EditWorkExperienceModal({ visible, experience, onClose, onSaved, logout }) {
  const [role, setRole] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && experience) {
      setRole(experience.role || '');
      setEndDate(experience.end_date ? experience.end_date.slice(0, 10) : '');
      setIsCurrent(experience.is_current || false);
    }
  }, [visible, experience]);

  const handleSave = async () => {
    if (!role.trim()) return Alert.alert('Validation', 'Role is required.');
    try {
      setSaving(true);
      await updateWorkExperience(experience.id, {
        role: role.trim(),
        end_date: isCurrent ? null : (endDate.trim() || null),
        is_current: isCurrent,
      });
      await onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 401) logout();
      else Alert.alert('Error', err.response?.data?.message || 'Failed to update work experience.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell visible={visible} title="Edit Work Experience" onClose={onClose}>
      <View style={workSt.readOnlyRow}>
        <Ionicons name="business-outline" size={14} color={C.primary} />
        <Text style={workSt.readOnlyLabel}>Company</Text>
        <Text style={workSt.readOnlyValue}>{experience?.company_name}</Text>
      </View>
      <View style={[workSt.readOnlyRow, { marginBottom: 20 }]}>
        <Ionicons name="calendar-outline" size={14} color={C.primary} />
        <Text style={workSt.readOnlyLabel}>Started</Text>
        <Text style={workSt.readOnlyValue}>{experience?.start_date?.slice(0, 10)}</Text>
      </View>

      <InputField label="Role / Title *" value={role} onChangeText={setRole} placeholder="e.g. Senior Engineer" />

      <View style={workSt.toggleRow}>
        <Text style={s.inputLabel}>I currently work here</Text>
        <Switch
          value={isCurrent}
          onValueChange={setIsCurrent}
          trackColor={{ false: C.border, true: C.primaryBorder }}
          thumbColor={isCurrent ? C.primary : C.muted}
        />
      </View>

      {!isCurrent && (
        <InputField
          label="End Date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2024-01-01"
          keyboardType="numbers-and-punctuation"
        />
      )}

      <TouchableOpacity
        style={[s.primaryBtn, saving && s.primaryBtnDisabled, { marginTop: 8 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.primaryBtnText}>Save Changes</Text>
        }
      </TouchableOpacity>
    </ModalShell>
  );
}

// ─── ADD SKILL MODAL ──────────────────────────────────────────────────────────
function AddSkillModal({ visible, onClose, onSaved, logout }) {
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState(SKILL_CATEGORIES[0]);
  const [proficiency, setProficiency] = useState(PROFICIENCY_LEVELS[0]);
  const [yearsExp, setYearsExp] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSkillName(''); setCategory(SKILL_CATEGORIES[0]);
    setProficiency(PROFICIENCY_LEVELS[0]); setYearsExp('');
  };

  const handleAdd = async () => {
    if (!skillName.trim()) return Alert.alert('Validation', 'Please enter a skill name.');
    try {
      setSaving(true);
      const payload = {
        skill_name: skillName.trim(),
        category,
        proficiency_level: proficiency,
      };
      if (yearsExp) payload.years_experience = Number(yearsExp);
      await addSkill(payload);
      reset();
      await onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 401) logout();
      else Alert.alert('Error', err.response?.data?.message || 'Failed to add skill.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell visible={visible} title="Add Skill" onClose={onClose}>
      <InputField
        label="Skill Name *"
        value={skillName}
        onChangeText={setSkillName}
        placeholder="e.g. Python, React Native, SQL…"
      />

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

      <Text style={[s.inputLabel, { marginBottom: 8 }]}>Proficiency Level</Text>
      <View style={s.proficiencyRow}>
        {PROFICIENCY_LEVELS.map(level => {
          const meta = proficiencyMeta(level);
          const sel = proficiency === level;
          return (
            <TouchableOpacity
              key={level}
              style={[s.profChip, { borderColor: sel ? meta.color : C.border }, sel && { backgroundColor: meta.bg }]}
              onPress={() => setProficiency(level)}
            >
              <View style={[s.profDot, { backgroundColor: meta.color }]} />
              <Text style={[s.profChipText, sel && { color: meta.color, fontWeight: '700' }]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <InputField
        label="Years of Experience (optional)"
        value={yearsExp}
        onChangeText={setYearsExp}
        placeholder="e.g. 3"
        keyboardType="number-pad"
      />

      <TouchableOpacity
        style={[s.primaryBtn, saving && s.primaryBtnDisabled, { marginTop: 8 }]}
        onPress={handleAdd}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Ionicons name="add" size={18} color="#fff" /><Text style={s.primaryBtnText}>Add Skill</Text></>
        }
      </TouchableOpacity>
    </ModalShell>
  );
}

// ─── ADD EDUCATION MODAL ──────────────────────────────────────────────────────
function AddEducationModal({ visible, onClose, onSaved, logout }) {
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUniversity(''); setDegree(''); setFieldOfStudy('');
    setStartDate(''); setEndDate(''); setIsCurrent(false);
  };

  const handleSave = async () => {
    if (!university.trim()) return Alert.alert('Validation', 'University name is required.');
    if (!degree.trim()) return Alert.alert('Validation', 'Degree is required.');
    if (!startDate.trim()) return Alert.alert('Validation', 'Start date is required (YYYY-MM-DD).');

    try {
      setSaving(true);
      await addEducation({
        university: university.trim(),
        degree: degree.trim(),
        field_of_study: fieldOfStudy.trim() || undefined,
        start_date: startDate.trim(),
        end_date: isCurrent ? null : (endDate.trim() || null),
        is_current: isCurrent,
      });
      reset();
      await onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 401) logout();
      else Alert.alert('Error', err.response?.data?.message || 'Failed to add education.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell visible={visible} title="Add Education" onClose={onClose}>
      <InputField
        label="University / Institution *"
        value={university}
        onChangeText={setUniversity}
        placeholder="e.g. University of Engineering & Technology"
      />
      <InputField
        label="Degree *"
        value={degree}
        onChangeText={setDegree}
        placeholder="e.g. BS Computer Science"
      />
      <InputField
        label="Field of Study"
        value={fieldOfStudy}
        onChangeText={setFieldOfStudy}
        placeholder="e.g. Software Engineering"
      />
      <InputField
        label="Start Date * (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        placeholder="2021-09-01"
        keyboardType="numbers-and-punctuation"
      />

      <View style={workSt.toggleRow}>
        <Text style={s.inputLabel}>Currently studying here</Text>
        <Switch
          value={isCurrent}
          onValueChange={setIsCurrent}
          trackColor={{ false: C.border, true: C.primaryBorder }}
          thumbColor={isCurrent ? C.primary : C.muted}
        />
      </View>

      {!isCurrent && (
        <InputField
          label="End Date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2025-06-01"
          keyboardType="numbers-and-punctuation"
        />
      )}

      <TouchableOpacity
        style={[s.primaryBtn, saving && s.primaryBtnDisabled, { marginTop: 8 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.primaryBtnText}>Add Education</Text>
        }
      </TouchableOpacity>
    </ModalShell>
  );
}

// ─── EDIT EDUCATION MODAL ─────────────────────────────────────────────────────
function EditEducationModal({ visible, education, onClose, onSaved, logout }) {
  const [degree, setDegree] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && education) {
      setDegree(education.degree || '');
      setEndDate(education.end_date ? education.end_date.slice(0, 10) : '');
      setIsCurrent(education.is_current || false);
    }
  }, [visible, education]);

  const handleSave = async () => {
    if (!degree.trim()) return Alert.alert('Validation', 'Degree is required.');
    try {
      setSaving(true);
      await updateEducation(education.id, {
        degree: degree.trim(),
        end_date: isCurrent ? null : (endDate.trim() || null),
        is_current: isCurrent,
      });
      await onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 401) logout();
      else Alert.alert('Error', err.response?.data?.message || 'Failed to update education.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell visible={visible} title="Edit Education" onClose={onClose}>
      <View style={workSt.readOnlyRow}>
        <Ionicons name="school-outline" size={14} color={C.primary} />
        <Text style={workSt.readOnlyLabel}>University</Text>
        <Text style={workSt.readOnlyValue} numberOfLines={2}>{education?.university}</Text>
      </View>
      {education?.field_of_study ? (
        <View style={workSt.readOnlyRow}>
          <Ionicons name="book-outline" size={14} color={C.primary} />
          <Text style={workSt.readOnlyLabel}>Field</Text>
          <Text style={workSt.readOnlyValue}>{education.field_of_study}</Text>
        </View>
      ) : null}
      <View style={[workSt.readOnlyRow, { marginBottom: 20 }]}>
        <Ionicons name="calendar-outline" size={14} color={C.primary} />
        <Text style={workSt.readOnlyLabel}>Started</Text>
        <Text style={workSt.readOnlyValue}>{education?.start_date?.slice(0, 10)}</Text>
      </View>

      <InputField
        label="Degree *"
        value={degree}
        onChangeText={setDegree}
        placeholder="e.g. Masters in AI"
      />

      <View style={workSt.toggleRow}>
        <Text style={s.inputLabel}>Currently studying here</Text>
        <Switch
          value={isCurrent}
          onValueChange={setIsCurrent}
          trackColor={{ false: C.border, true: C.primaryBorder }}
          thumbColor={isCurrent ? C.primary : C.muted}
        />
      </View>

      {!isCurrent && (
        <InputField
          label="End Date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2025-06-01"
          keyboardType="numbers-and-punctuation"
        />
      )}

      <TouchableOpacity
        style={[s.primaryBtn, saving && s.primaryBtnDisabled, { marginTop: 8 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.primaryBtnText}>Save Changes</Text>
        }
      </TouchableOpacity>
    </ModalShell>
  );
}

// ─── SKILL CARD ───────────────────────────────────────────────────────────────
function SkillCard({ skill, onDelete }) {
  const meta = proficiencyMeta(skill.proficiency_level);
  return (
    <View style={s.skillCard}>
      <TouchableOpacity style={s.skillDeleteBtn} onPress={onDelete}>
        <Ionicons name="close-circle" size={16} color={C.muted} />
      </TouchableOpacity>
      {skill.category && (
        <View style={s.skillCategoryBadge}>
          <Text style={s.skillCategoryText}>{skill.category}</Text>
        </View>
      )}
      <Text style={s.skillCardName}>{skill.skill_name || skill.name || skill.skill}</Text>
      {skill.proficiency_level && (
        <View style={[s.skillProfBadge, { backgroundColor: meta.bg }]}>
          <View style={[s.profDot, { backgroundColor: meta.color, width: 6, height: 6 }]} />
          <Text style={[s.skillProfText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      )}
    </View>
  );
}

// ─── WORK EXPERIENCE CARD ─────────────────────────────────────────────────────
function WorkExpCard({ exp, onEdit, onDelete }) {
  const meta = employmentMeta(exp.employment_type);
  const dateRange = formatDateRange(exp.start_date, exp.end_date, exp.is_current);
  return (
    <View style={workSt.card}>
      <View style={{ flex: 1 }}>
        <View style={workSt.cardTop}>
          <Text style={workSt.cardRole}>{exp.role}</Text>
          <View style={[workSt.typeBadge, { backgroundColor: meta.bg }]}>
            <Text style={[workSt.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={workSt.cardCompany}>{exp.company_name}</Text>
        {dateRange ? <Text style={workSt.cardDates}>{dateRange}</Text> : null}
      </View>
      <View style={workSt.cardActions}>
        <TouchableOpacity onPress={onEdit} style={workSt.iconBtn}>
          <Ionicons name="pencil-outline" size={18} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={workSt.iconBtn}>
          <Ionicons name="trash-outline" size={18} color={C.coral} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── EDUCATION CARD ───────────────────────────────────────────────────────────
function EducationCard({ edu, onEdit, onDelete }) {
  const dateRange = formatDateRange(edu.start_date, edu.end_date, edu.is_current);

  return (
    <View style={eduSt.card}>
      <View style={eduSt.accent} />
      <View style={{ flex: 1 }}>
        <View style={eduSt.cardTop}>
          <Text style={eduSt.cardDegree} numberOfLines={2}>{edu.degree}</Text>
          {edu.is_current && (
            <View style={eduSt.currentBadge}>
              <View style={eduSt.currentDot} />
              <Text style={eduSt.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>
        <View style={eduSt.universityRow}>
          <Ionicons name="school-outline" size={12} color={C.primary} />
          <Text style={eduSt.cardUniversity}>{edu.university}</Text>
        </View>
        {edu.field_of_study ? (
          <Text style={eduSt.cardField}>{edu.field_of_study}</Text>
        ) : null}
        {dateRange ? (
          <View style={eduSt.dateRow}>
            <Ionicons name="calendar-outline" size={11} color={C.muted} />
            <Text style={eduSt.cardDates}>{dateRange}</Text>
          </View>
        ) : null}
      </View>
      <View style={workSt.cardActions}>
        <TouchableOpacity onPress={onEdit} style={workSt.iconBtn}>
          <Ionicons name="pencil-outline" size={18} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={workSt.iconBtn}>
          <Ionicons name="trash-outline" size={18} color={C.coral} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── OPPORTUNITY CARD ─────────────────────────────────────────────────────────
function OppCard({ opp, onPress, onEdit, onDelete }) {
  const statusMeta = opp.status === 'open'
    ? { color: C.green, bg: C.greenSoft, label: 'Open' }
    : { color: C.coral, bg: C.coralSoft, label: 'Closed' };

  const deadline = opp.deadline
    ? new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <TouchableOpacity style={oppSt.card} onPress={onPress} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <View style={oppSt.cardTop}>
          <Text style={oppSt.cardTitle} numberOfLines={1}>{opp.title}</Text>
          <View style={[oppSt.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[oppSt.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>
        <Text style={oppSt.cardCompany}>{opp.company_name || opp.company}</Text>
        {deadline ? <Text style={oppSt.cardDeadline}>Deadline: {deadline}</Text> : null}
      </View>
      <View style={workSt.cardActions}>
        <TouchableOpacity onPress={onEdit} style={workSt.iconBtn}>
          <Ionicons name="pencil-outline" size={18} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={workSt.iconBtn}>
          <Ionicons name="trash-outline" size={18} color={C.coral} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── FOLLOWERS / FOLLOWING MODAL ─────────────────────────────────────────────
function FollowersFollowingModal({ visible, mode, userId, onClose, onNavigate }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible || !userId) return;

    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = mode === 'followers'
          ? await getFollowers(userId)
          : await getFollowing(userId);
        setList(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError('Failed to load. Tap to retry.');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [visible, mode, userId]);

  const title = mode === 'followers' ? 'Followers' : 'Following';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ffSt.overlay}>
        <View style={ffSt.sheet}>
          <View style={ffSt.handle} />
          <View style={ffSt.header}>
            <Text style={ffSt.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={ffSt.closeBtn}>
              <Ionicons name="close" size={20} color={C.subtext} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={ffSt.center}>
              <ActivityIndicator color={C.primary} size="large" />
            </View>
          ) : error ? (
            <View style={ffSt.center}>
              <Ionicons name="wifi-outline" size={32} color={C.muted} />
              <Text style={ffSt.errorText}>{error}</Text>
            </View>
          ) : list.length === 0 ? (
            <View style={ffSt.center}>
              <Ionicons name="people-outline" size={40} color={C.border} />
              <Text style={ffSt.emptyTitle}>No {title.toLowerCase()} yet</Text>
              <Text style={ffSt.emptySub}>
                {mode === 'followers'
                  ? 'Nobody is following this account yet.'
                  : 'Not following anyone yet.'}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {list.map((user, i) => {
                const uid = user.id ?? user.user_id;
                const name = user.display_name ?? user.name ?? user.username;
                const pic = user.profile_picture ?? null;
                const sub = [user.role, user.company ?? user.current_company]
                  .filter(Boolean).join(' at ') || user.bio || null;

                return (
                  <TouchableOpacity
                    key={uid ?? i}
                    style={ffSt.userRow}
                    activeOpacity={0.75}
                    onPress={() => {
                      onClose();
                      if (onNavigate && uid) onNavigate(uid);
                    }}
                  >
                    {pic ? (
                      <Image source={{ uri: pic }} style={ffSt.avatar} />
                    ) : (
                      <View style={ffSt.avatarFallback}>
                        <Text style={ffSt.avatarText}>{initials(name)}</Text>
                      </View>
                    )}
                    <View style={ffSt.userInfo}>
                      <Text style={ffSt.userName} numberOfLines={1}>{name}</Text>
                      {user.username ? (
                        <Text style={ffSt.userHandle}>@{user.username}</Text>
                      ) : null}
                      {sub ? (
                        <Text style={ffSt.userSub} numberOfLines={1}>{sub}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.muted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function AlumniProfileScreen({ navigation }) {
  const { logout } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [myOpps, setMyOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [addWorkVisible, setAddWorkVisible] = useState(false);
  const [editWorkVisible, setEditWorkVisible] = useState(false);
  const [addSkillVisible, setAddSkillVisible] = useState(false);
  const [selectedExp, setSelectedExp] = useState(null);
  const [addEduVisible, setAddEduVisible] = useState(false);
  const [editEduVisible, setEditEduVisible] = useState(false);
  const [selectedEdu, setSelectedEdu] = useState(null);
  const [ffVisible, setFfVisible] = useState(false);
  const [ffMode, setFfMode] = useState('followers');
  const [userId, setUserId] = useState(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const resolveUserId = async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) { setUserId(parsed.id); return; }
        }
        const storedId = await AsyncStorage.getItem('userId');
        if (storedId) setUserId(storedId);
      } catch (_) { }
    };
    resolveUserId();
  }, []);

const fetchAll = async () => {
  try {
    setLoading(true);

    const stored = await AsyncStorage.getItem('userData');
    const localProfile = stored ? JSON.parse(stored) : profile;
    const role = localProfile?.role;   // "alumni" or "partner"

    console.log('🔍 [DEBUG] determined role:', role);

    let profData;
    if (role === 'partner') {
      console.log('🔍 [DEBUG] calling getPartnerProfile()');
      const res = await getPartnerProfile();
      profData = res.data;
    } else {
      console.log('🔍 [DEBUG] calling getAlumniProfile()');
      const res = await getAlumniProfile();
      profData = res.data;

      // The alumni endpoint returns `role` as job title – rename to avoid overwriting user role
      if (profData.role && typeof profData.role === 'string') {
        profData.job_role = profData.role;
        delete profData.role;
      }
    }

    // 🔑 Preserve the user role from local storage on the profile object
    profData.role = role;

    const oppsRes = await getMyOpportunities();
    setProfile(profData);
    setMyOpps(Array.isArray(oppsRes.data) ? oppsRes.data : []);
    if (!userId && profData?.id) setUserId(profData.id);

  } catch (err) {
    console.log('🔍 [DEBUG] fetchAll error:', err.response?.status, err.response?.data);
    if (err.response?.status === 401) { logout(); return; }
    Alert.alert('Error', err.response?.data?.message || 'Failed to load profile.');
  } finally {
    setLoading(false);
  }
};

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const handleDeleteSkill = (skillId, skillName) => {
    Alert.alert('Delete Skill', `Remove "${skillName}" from your profile?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteSkill(skillId);
            fetchAll();
          } catch (err) {
            if (err.response?.status === 401) logout();
            else Alert.alert('Error', err.response?.data?.message || 'Failed to delete skill.');
          }
        },
      },
    ]);
  };

  const handleDeleteWorkExp = (expId, company) => {
    Alert.alert('Delete Experience', `Remove your experience at "${company}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteWorkExperience(expId);
            fetchAll();
          } catch (err) {
            if (err.response?.status === 401) logout();
            else Alert.alert('Error', err.response?.data?.message || 'Failed to delete experience.');
          }
        },
      },
    ]);
  };

  const handleDeleteEducation = (eduId, degreeTitle) => {
    Alert.alert('Delete Education', `Remove "${degreeTitle}" from your profile?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteEducation(eduId);
            fetchAll();
          } catch (err) {
            if (err.response?.status === 401) logout();
            else Alert.alert('Error', err.response?.data?.message || 'Failed to delete education.');
          }
        },
      },
    ]);
  };

  const handleDeleteOpp = (oppId, title) => {
    Alert.alert('Delete Opportunity', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteOpportunity(oppId);
            setMyOpps(prev => prev.filter(o => o.id !== oppId));
          } catch (err) {
            if (err.response?.status === 401) logout();
            else Alert.alert('Error', err.response?.data?.message || 'Failed to delete opportunity.');
          }
        },
      },
    ]);
  };

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
        <Text style={s.emptyTitleLg}>Profile unavailable</Text>
        <Text style={s.emptySubLg}>We could not load your data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchAll}>
          <Ionicons name="refresh-outline" size={16} color={C.primary} />
          <Text style={s.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPartner = profile.role === 'partner';

  const skills = profile.detailed_skills ?? profile.skills ?? [];
  const workExps = profile.work_experience ?? profile.work_experiences ?? [];
  const education = profile.education ?? [];

  return (
    <View style={s.root}>
      <Animated.ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <HeroSection profile={profile} onEditPress={() => setEditVisible(true)} />

        {/* Stats row */}
        <View style={s.statsRow}>
          <StatBox value={profile.connections_count ?? 0} label="Connections" />
          <View style={s.statsDivider} />
          <TouchableOpacity
            style={s.statBox}
            activeOpacity={0.7}
            onPress={() => { setFfMode('followers'); setFfVisible(true); }}
          >
            <Text style={s.statValue}>{profile.followers_count ?? 0}</Text>
            <Text style={[s.statLabel, { color: C.primary }]}>Followers</Text>
          </TouchableOpacity>
          <View style={s.statsDivider} />
          <TouchableOpacity
            style={s.statBox}
            activeOpacity={0.7}
            onPress={() => { setFfMode('following'); setFfVisible(true); }}
          >
            <Text style={s.statValue}>{profile.following_count ?? 0}</Text>
            <Text style={[s.statLabel, { color: C.primary }]}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* ── About card ────────────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="person-outline" title="About" action={() => setEditVisible(true)} actionLabel="Edit" />

          <DetailRow icon="mail-outline" label="Email" value={profile.email} />
          <DetailRow icon="call-outline" label="Phone" value={profile.phone} />

          {isPartner && (
            <>
              <DetailRow icon="business-outline" label="Company" value={profile.affiliation} />
              <DetailRow icon="briefcase-outline" label="Job Title" value={profile.job_title} />
            </>
          )}

          {!isPartner && (
            <>
              <DetailRow icon="school-outline" label="Degree" value={profile.degree} />
              <DetailRow icon="calendar-outline" label="Batch" value={profile.batch} />
              <DetailRow icon="ribbon-outline" label="Graduation Year" value={profile.graduation_year ? String(profile.graduation_year) : null} />
            </>
          )}

          <DetailRow
            icon="logo-linkedin"
            label="LinkedIn"
            value={profile.linkedin_url}
            last
            onPress={profile.linkedin_url ? () => Linking.openURL(profile.linkedin_url) : undefined}
          />

          {!profile.phone && (
            <TouchableOpacity style={s.emptyFieldRow} onPress={() => setEditVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={s.emptyFieldText}>Add phone number</Text>
            </TouchableOpacity>
          )}
          {!profile.linkedin_url && (
            <TouchableOpacity style={s.emptyFieldRow} onPress={() => setEditVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={s.emptyFieldText}>Add LinkedIn URL</Text>
            </TouchableOpacity>
          )}
          {isPartner && !profile.affiliation && (
            <TouchableOpacity style={s.emptyFieldRow} onPress={() => setEditVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={s.emptyFieldText}>Add company / organization</Text>
            </TouchableOpacity>
          )}
          {isPartner && !profile.job_title && (
            <TouchableOpacity style={s.emptyFieldRow} onPress={() => setEditVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={s.emptyFieldText}>Add job title</Text>
            </TouchableOpacity>
          )}
          {profile.bio ? (
            <Text style={s.bioText}>{profile.bio}</Text>
          ) : (
            <TouchableOpacity style={s.emptyFieldRow} onPress={() => setEditVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={C.primary} />
              <Text style={s.emptyFieldText}>Add a bio</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Work Experience card (only for alumni) ──────────────────────────── */}
        {!isPartner && (
          <View style={s.card}>
            <SectionHeader icon="briefcase-outline" title="Work Experience" action={() => setAddWorkVisible(true)} actionLabel="Add" />
            {workExps.length === 0 ? (
              <EmptyState
                icon="briefcase-outline"
                title="No work experience added yet"
                sub="Showcase your career journey"
                onAction={() => setAddWorkVisible(true)}
                actionLabel="Add First Experience"
              />
            ) : (
              <>
                {workExps.map(exp => (
                  <WorkExpCard
                    key={exp.id}
                    exp={exp}
                    onEdit={() => { setSelectedExp(exp); setEditWorkVisible(true); }}
                    onDelete={() => handleDeleteWorkExp(exp.id, exp.company_name)}
                  />
                ))}
                <TouchableOpacity style={s.addMoreRow} onPress={() => setAddWorkVisible(true)}>
                  <Ionicons name="add-circle-outline" size={16} color={C.primary} />
                  <Text style={s.addMoreText}>Add another experience</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Education card (only for alumni) ────────────────────────────────── */}
        {!isPartner && (
          <View style={s.card}>
            <SectionHeader
              icon="school-outline"
              title={`Education${education.length ? ` (${education.length})` : ''}`}
              action={() => setAddEduVisible(true)}
              actionLabel="Add"
            />
            {education.length === 0 ? (
              <EmptyState
                icon="school-outline"
                title="No education added yet"
                sub="Share your academic background"
                onAction={() => setAddEduVisible(true)}
                actionLabel="Add Education"
              />
            ) : (
              <>
                {education.map(edu => (
                  <EducationCard
                    key={edu.id}
                    edu={edu}
                    onEdit={() => { setSelectedEdu(edu); setEditEduVisible(true); }}
                    onDelete={() => handleDeleteEducation(edu.id, edu.degree)}
                  />
                ))}
                <TouchableOpacity style={s.addMoreRow} onPress={() => setAddEduVisible(true)}>
                  <Ionicons name="add-circle-outline" size={16} color={C.primary} />
                  <Text style={s.addMoreText}>Add another degree</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Skills card (only for alumni) ───────────────────────────────────── */}
        {!isPartner && (
          <View style={s.card}>
            <SectionHeader
              icon="code-slash-outline"
              title={`Skills${skills.length ? ` (${skills.length})` : ''}`}
              action={() => setAddSkillVisible(true)}
              actionLabel="Add Skill"
            />
            {skills.length === 0 ? (
              <EmptyState
                icon="construct-outline"
                title="No skills yet"
                sub="Add your expertise to stand out"
                onAction={() => setAddSkillVisible(true)}
                actionLabel="Add Your First Skill"
              />
            ) : (
              <>
                <View style={s.skillGrid}>
                  {skills.map((skill, i) => (
                    <SkillCard
                      key={skill.id || i}
                      skill={skill}
                      onDelete={() => handleDeleteSkill(
                        skill.id,
                        skill.skill_name || skill.name || skill.skill
                      )}
                    />
                  ))}
                </View>
                <TouchableOpacity style={s.addMoreRow} onPress={() => setAddSkillVisible(true)}>
                  <Ionicons name="add-circle-outline" size={16} color={C.primary} />
                  <Text style={s.addMoreText}>Add another skill</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── My Opportunities ──────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader
            icon="briefcase-outline"
            title="My Opportunities"
            action={() => navigation.navigate('PostOpportunity')}
            actionLabel="Post New"
          />
          {myOpps.length === 0 ? (
            <EmptyState
              icon="megaphone-outline"
              title="No opportunities posted yet"
              sub="Share jobs and internships with the network"
              onAction={() => navigation.navigate('PostOpportunity')}
              actionLabel="Post First Opportunity"
            />
          ) : (
            myOpps.map(opp => (
              <OppCard
                key={opp.id}
                opp={opp}
                onPress={() => navigation.navigate('OpportunityDetail', { id: opp.id })}
                onEdit={() => navigation.navigate('EditOpportunity', { opportunity: opp })}
                onDelete={() => handleDeleteOpp(opp.id, opp.title)}
              />
            ))
          )}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={C.coral} />
          <Text style={s.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* ── Followers / Following Modal ───────────────────────────────────── */}
      <FollowersFollowingModal
        visible={ffVisible}
        mode={ffMode}
        userId={userId ?? profile?.id}
        onClose={() => setFfVisible(false)}
        onNavigate={(uid) => navigation.navigate('PublicProfile', { userId: uid })}
      />

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <EditProfileModal
        visible={editVisible}
        profile={profile}
        onClose={() => setEditVisible(false)}
        onSaved={fetchAll}
        logout={logout}
      />
      <AddWorkExperienceModal
        visible={addWorkVisible}
        onClose={() => setAddWorkVisible(false)}
        onSaved={fetchAll}
        logout={logout}
      />
      <EditWorkExperienceModal
        visible={editWorkVisible}
        experience={selectedExp}
        onClose={() => { setEditWorkVisible(false); setSelectedExp(null); }}
        onSaved={fetchAll}
        logout={logout}
      />
      <AddSkillModal
        visible={addSkillVisible}
        onClose={() => setAddSkillVisible(false)}
        onSaved={fetchAll}
        logout={logout}
      />
      <AddEducationModal
        visible={addEduVisible}
        onClose={() => setAddEduVisible(false)}
        onSaved={fetchAll}
        logout={logout}
      />
      <EditEducationModal
        visible={editEduVisible}
        education={selectedEdu}
        onClose={() => { setEditEduVisible(false); setSelectedEdu(null); }}
        onSaved={fetchAll}
        logout={logout}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  username: { fontSize: 13, color: C.muted, marginTop: 3, marginBottom: 4 },
  jobLine: { fontSize: 14, color: C.primary, fontWeight: '600', marginBottom: 6 },
  meta: { fontSize: 12, color: C.subtext, marginBottom: 10, textAlign: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.primaryBorder },
  pillText: { fontSize: 12, fontWeight: '600', color: C.primary },
  bio: { fontSize: 13, color: C.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 18, maxWidth: 280, fontStyle: 'italic' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 10 },
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const workSt = StyleSheet.create({
  card: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  cardRole: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  cardCompany: { fontSize: 13, color: C.subtext, marginBottom: 2 },
  cardDates: { fontSize: 11, color: C.muted, marginTop: 2 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'column', gap: 8, marginLeft: 8 },
  iconBtn: { padding: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: { flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: C.bg },
  typeChipText: { fontSize: 12, color: C.subtext, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingVertical: 4 },
  readOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider, marginBottom: 4 },
  readOnlyLabel: { fontSize: 12, color: C.muted, fontWeight: '600', width: 60 },
  readOnlyValue: { fontSize: 13, color: C.text, flex: 1 },
});

const eduSt = StyleSheet.create({
  card: {
    backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden',
  },
  accent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: C.primary, borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, paddingLeft: 8 },
  cardDegree: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8, paddingLeft: 8 },
  universityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3, paddingLeft: 16 },
  cardUniversity: { fontSize: 13, color: C.subtext, flex: 1 },
  cardField: { fontSize: 12, color: C.muted, paddingLeft: 16, marginBottom: 4, fontStyle: 'italic' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 16, marginTop: 4 },
  cardDates: { fontSize: 11, color: C.muted },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.greenSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  currentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: C.green },
});

const oppSt = StyleSheet.create({
  card: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  cardCompany: { fontSize: 12, color: C.subtext, marginBottom: 2 },
  cardDeadline: { fontSize: 11, color: C.muted },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
});

const editSt = StyleSheet.create({
  backdropContainer: { width: '100%', height: 130, borderRadius: 16, overflow: 'hidden', backgroundColor: C.primarySoft, marginBottom: 4, position: 'relative' },
  backdropPreview: { width: '100%', height: '100%' },
  backdropPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1.5, borderColor: C.primaryBorder, borderStyle: 'dashed' },
  placeholderText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  backdropBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  backdropBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  profilePicSection: { alignItems: 'center', marginBottom: 24 },
  profilePicContainer: { position: 'relative', marginBottom: 6 },
  profilePicPreview: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: C.primary },
  profilePicPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.primarySoft, borderWidth: 2, borderColor: C.primaryBorder, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: C.primary, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  hint: { fontSize: 11, color: C.muted },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 10, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: C.muted, marginTop: 4 },
  emptyTitleLg: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySubLg: { fontSize: 14, color: C.muted, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.primary, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10, marginTop: 6 },
  retryText: { color: C.primary, fontWeight: '600', fontSize: 14 },

  statsRow: { flexDirection: 'row', backgroundColor: C.card, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingVertical: 18 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: C.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: C.muted, marginTop: 2, fontWeight: '500' },
  statsDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginHorizontal: 16, marginTop: 12, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 6 },

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
  bioText: { fontSize: 14, color: C.subtext, lineHeight: 22, paddingVertical: 10, fontStyle: 'italic' },

  emptyFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  emptyFieldText: { fontSize: 13, color: C.primary, fontWeight: '500' },

  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 6, paddingBottom: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.subtext },
  emptySub: { fontSize: 12, color: C.muted, textAlign: 'center', maxWidth: 220 },
  emptyActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, marginTop: 8 },
  emptyActionText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 4 },
  skillCard: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, minWidth: '45%', flex: 1, maxWidth: '50%', position: 'relative' },
  skillDeleteBtn: { position: 'absolute', top: 6, right: 6, zIndex: 1 },
  skillCategoryBadge: { alignSelf: 'flex-start', backgroundColor: C.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  skillCategoryText: { fontSize: 9, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  skillCardName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8, paddingRight: 20 },
  skillProfBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  skillProfText: { fontSize: 10, fontWeight: '700' },

  addMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.divider, marginTop: 8 },
  addMoreText: { fontSize: 13, color: C.primary, fontWeight: '500' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, backgroundColor: C.coralSoft, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', paddingVertical: 14 },
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
  inputReadOnly: { backgroundColor: C.divider, color: C.muted },

  chip: { borderWidth: 1.5, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: C.bg },
  chipSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  chipText: { fontSize: 13, color: C.subtext, fontWeight: '500' },
  chipTextSelected: { color: C.primary, fontWeight: '700' },

  proficiencyRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  profChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, backgroundColor: C.bg },
  profChipText: { fontSize: 12, color: C.subtext, fontWeight: '600' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  infoNotice: { flexDirection: 'row', gap: 8, backgroundColor: C.primarySoft, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.primaryBorder, marginBottom: 20, alignItems: 'flex-start' },
  infoNoticeText: { flex: 1, fontSize: 12, color: C.primary, lineHeight: 18 },
});

const AVATAR_FF = 44;
const ffSt = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, maxHeight: '80%', minHeight: 300 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.divider, marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, minHeight: 200, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 40 },
  errorText: { fontSize: 14, color: C.muted, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.subtext },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', maxWidth: 220 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 12 },
  avatar: { width: AVATAR_FF, height: AVATAR_FF, borderRadius: AVATAR_FF / 2, backgroundColor: C.primarySoft },
  avatarFallback: { width: AVATAR_FF, height: AVATAR_FF, borderRadius: AVATAR_FF / 2, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: C.text },
  userHandle: { fontSize: 12, color: C.muted, marginTop: 1 },
  userSub: { fontSize: 12, color: C.subtext, marginTop: 2 },
});