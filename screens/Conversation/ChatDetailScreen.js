// ChatDetailScreen.js – full updated version

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import {
  clearChat as clearChatApi,
  deleteMessage as deleteMessageApi,
  editMessage as editMessageApi,
  getMessages,
  markConversationAsRead,
  sendMessage,
  uploadChatImage,
} from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primarySoft: '#EEF2FF',
  bg: '#F0F2F8',
  card: '#FFFFFF',
  text: '#0F0F23',
  subtext: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  myBubble: '#4F46E5',
  otherBubble: '#FFFFFF',
  myText: '#FFFFFF',
  otherText: '#0F0F23',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  warning: '#F59E0B',
  green: '#10B981',
  overlay: 'rgba(0,0,0,0.45)',
  inputBg: '#FFFFFF',
  editBg: '#FFF7ED',
  editBorder: '#F59E0B',
};

const EDIT_DELETE_MS = 3 * 60 * 1000;
const canModify = (createdAt) =>
  Date.now() - new Date(createdAt).getTime() < EDIT_DELETE_MS;

// ─── Utilities ────────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSep(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDate(messages) {
  const groups = [];
  let lastDate = null;
  messages.forEach(msg => {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDate) {
      groups.push({ type: 'separator', id: `sep-${msg._id}`, label: formatDateSep(msg.createdAt) });
      lastDate = day;
    }
    groups.push({ type: 'message', ...msg });
  });
  return groups;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ uri, name, size = 30 }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={[avS.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[avS.txt, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}
const avS = StyleSheet.create({
  wrap: { backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  txt: { fontWeight: '800', color: C.primary },
});

// ─── Image bubble ─────────────────────────────────────────────────────────────
function ImageBubble({ uri, isMe, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[imgB.wrap, isMe ? imgB.me : imgB.other]}>
      <Image source={{ uri }} style={imgB.img} resizeMode="cover" />
    </TouchableOpacity>
  );
}
const imgB = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 2 },
  me: { borderBottomRightRadius: 4 },
  other: { borderBottomLeftRadius: 4 },
  img: { width: 210, height: 160 },
});

// ─── Context menu (bottom sheet) ─────────────────────────────────────────────
function ContextMenu({ visible, message, isMe, onEdit, onDelete, onClose }) {
  const within = message ? canModify(message.createdAt) : false;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cm.overlay} onPress={onClose}>
        <Pressable style={cm.sheet} onPress={e => e.stopPropagation()}>
          <View style={cm.handle} />

          {message && (
            <View style={cm.preview}>
              <Text style={cm.previewLabel}>Message</Text>
              <Text style={cm.previewText} numberOfLines={3}>
                {message.messageType === 'image' ? '📷 Image' : message.content}
              </Text>
            </View>
          )}

          <View style={cm.divider} />

          {isMe && within && message?.messageType !== 'image' && (
            <TouchableOpacity style={cm.row} onPress={onEdit} activeOpacity={0.7}>
              <View style={[cm.iconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="pencil-outline" size={18} color={C.primary} />
              </View>
              <Text style={cm.rowText}>Edit Message</Text>
              <Ionicons name="chevron-forward" size={15} color={C.muted} />
            </TouchableOpacity>
          )}

          {isMe && within && (
            <TouchableOpacity style={cm.row} onPress={onDelete} activeOpacity={0.7}>
              <View style={[cm.iconWrap, { backgroundColor: C.dangerSoft }]}>
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </View>
              <Text style={[cm.rowText, { color: C.danger }]}>Delete Message</Text>
              <Ionicons name="chevron-forward" size={15} color={C.muted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={cm.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={cm.cancelText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  preview: { paddingHorizontal: 20, paddingVertical: 14 },
  previewLabel: { fontSize: 10, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  previewText: { fontSize: 14, color: C.subtext, lineHeight: 20 },
  divider: { height: 1, backgroundColor: C.divider, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  cancel: { marginHorizontal: 16, marginTop: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: C.subtext },
});

// ─── Fullscreen image viewer ──────────────────────────────────────────────────
function ImageViewer({ uri, onClose }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={iv.overlay} onPress={onClose}>
        <Image source={{ uri }} style={iv.img} resizeMode="contain" />
        <TouchableOpacity style={iv.close} onPress={onClose}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}
const iv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  img: { width: '100%', height: '85%' },
  close: { position: 'absolute', top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
});

// ─── Custom chat header (replaces native header) ─────────────────────────────
// ─── Custom chat header (replaces native header) ─────────────────────────────
function ChatHeader({ participantName, participantPicture, participantUsername, onBack, onMenu, onProfilePress }) {
  return (
    <View style={chH.wrap}>
      <TouchableOpacity onPress={onBack} style={chH.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="arrow-back" size={26} color={C.text} />
      </TouchableOpacity>

      {/* ── Tappable avatar + name area ── */}
      <TouchableOpacity onPress={onProfilePress} style={chH.center} activeOpacity={0.7}>
        <Avatar uri={participantPicture} name={participantName} size={36} />
        <View style={{ marginLeft: 8 }}>
          <Text style={chH.name} numberOfLines={1}>{participantName || 'Chat'}</Text>
          {participantUsername ? (
            <Text style={chH.handle}>@{participantUsername}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={onMenu} style={chH.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="ellipsis-vertical" size={20} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}

const chH = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    paddingTop: 44
  },
  backBtn: { padding: 6, marginRight: 4 },
  center: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-start', marginLeft: 4 },
  name: { fontSize: 16, fontWeight: '700', color: C.text },
  handle: { fontSize: 12, color: C.muted },
  menuBtn: { padding: 8 },
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChatDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userData } = useContext(AuthContext);

  const {
    participantId,
    participantName,
    participantPicture,
    participantUsername,
  } = route.params;

  // Core state
  const [messages, setMessages] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Image upload
  const [imageUploading, setImageUploading] = useState(false);

  // Edit mode
  const [editingMsg, setEditingMsg] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState({ visible: false, message: null });

  // Image viewer
  const [viewingImage, setViewingImage] = useState(null);

  // Conversation ID (extracted from messages for clearChat)
  const conversationIdRef = useRef(null);

  const flatListRef = useRef(null);
  const pollingRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Read mark ────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (msgs) => {
    const hasUnread = msgs.some(m => !m.isRead && m.senderId !== userData?.id);
    if (hasUnread) {
      try {
        await markConversationAsRead(participantId);
      } catch (_) { }
    }
  }, [participantId, userData?.id]);

  // ─── Fetch messages ───────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const res = await getMessages(participantId);
      const msgs = res.data || [];

      if (msgs.length > 0 && msgs[0].conversationId) {
        conversationIdRef.current = msgs[0].conversationId;
      }

      setMessages(msgs);
      setGrouped(groupByDate(msgs));
      markAsRead(msgs);
    } catch (err) {
      console.error('fetchMessages:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [participantId, markAsRead]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages(true);
      pollingRef.current = setInterval(() => fetchMessages(false), 4000);
      return () => clearInterval(pollingRef.current);
    }, [fetchMessages])
  );

  // ─── Send text ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    try {
      setSending(true);
      setText('');
      await sendMessage({ receiverId: participantId, content, messageType: 'text' });
      await fetchMessages(false);
    } catch (err) {
      console.error('sendMessage:', err?.response?.data || err.message);
      setText(content);
    } finally {
      setSending(false);
    }
  };

  // ─── Image pick + upload + send ───────────────────────────────────────────
  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Allow access to your photo library to send images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}.jpg`,
      });

      setImageUploading(true);
      const uploadRes = await uploadChatImage(formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await sendMessage({
        receiverId: participantId,
        content: 'Image',
        messageType: 'image',
        imageUrl: uploadRes.data.url,
      });

      await fetchMessages(false);
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload the image. Please try again.');
      console.error('uploadChatImage:', err?.response?.data || err.message);
    } finally {
      setImageUploading(false);
    }
  };

  // ─── Edit message ─────────────────────────────────────────────────────────
  const handleStartEdit = (message) => {
    setContextMenu({ visible: false, message: null });
    setEditingMsg({ _id: message._id, original: message.content });
    setText(message.content);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleCancelEdit = () => {
    setEditingMsg(null);
    setText('');
  };

  const handleSubmitEdit = async () => {
    const content = text.trim();
    if (!content || !editingMsg || editSubmitting) return;
    try {
      setEditSubmitting(true);
      await editMessageApi(editingMsg._id, { content });
      setEditingMsg(null);
      setText('');
      await fetchMessages(false);
    } catch (err) {
      Alert.alert('Edit Failed', 'Could not edit the message. The 3-minute window may have expired.');
      console.error('editMessage:', err?.response?.data || err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─── Delete message ───────────────────────────────────────────────────────
  const handleDeleteMessage = (message) => {
    setContextMenu({ visible: false, message: null });
    Alert.alert(
      'Delete Message',
      'This message will be removed for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessageApi(message._id);
              await fetchMessages(false);
            } catch (err) {
              Alert.alert('Delete Failed', 'Could not delete the message. The 3-minute window may have expired.');
              console.error('deleteMessage:', err?.response?.data || err.message);
            }
          },
        },
      ]
    );
  };

  // ─── Clear chat ───────────────────────────────────────────────────────────
  const handleClearChat = () => {
    const convId = conversationIdRef.current;
    if (!convId) {
      Alert.alert('No messages', 'There is nothing to clear yet.');
      return;
    }
    Alert.alert(
      'Clear Chat',
      'This will clear the conversation for you only. The other person will still see it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearChatApi(convId);
              setMessages([]);
              setGrouped([]);
            } catch (err) {
              Alert.alert('Error', 'Could not clear the chat.');
              console.error('clearChat:', err?.response?.data || err.message);
            }
          },
        },
      ]
    );
  };

  // ─── Context menu ─────────────────────────────────────────────────────────
  const handleLongPress = (message) => {
    if (message.type === 'separator') return;
    setContextMenu({ visible: true, message });
  };

  // ─── Render message ───────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    if (item.type === 'separator') {
      return (
        <View style={s.dateSep}>
          <View style={s.dateSepLine} />
          <Text style={s.dateSepText}>{item.label}</Text>
          <View style={s.dateSepLine} />
        </View>
      );
    }

    const isMe = item.senderId === userData?.id;
    const isImage = item.messageType === 'image';
    const isEdited = item.isEdited === true;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={380}
      >
        <View style={[s.msgWrap, isMe ? s.msgWrapMe : s.msgWrapOther]}>
          {!isMe && (
            <View style={s.msgAvatarWrap}>
              <Avatar uri={participantPicture} name={participantName} size={28} />
            </View>
          )}

          <View style={s.bubbleCol}>
            <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther, isImage && s.bubbleImage]}>
              {isImage && item.imageUrl ? (
                <ImageBubble
                  uri={item.imageUrl}
                  isMe={isMe}
                  onPress={() => setViewingImage(item.imageUrl)}
                />
              ) : (
                <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextOther]}>
                  {item.content}
                </Text>
              )}
            </View>

            <View style={[s.msgMeta, isMe ? s.msgMetaMe : s.msgMetaOther]}>
              {isEdited && (
                <Text style={s.editedTag}>edited · </Text>
              )}
              <Text style={s.msgTime}>{formatTime(item.createdAt)}</Text>
              {isMe && (
                <Text style={[s.readReceipt, item.isRead ? s.readReceiptRead : s.readReceiptSent]}>
                  {item.isRead ? ' ✓✓' : ' ✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Input bar handlers ───────────────────────────────────────────────────
  const isEditMode = !!editingMsg;
  const canSend = text.trim().length > 0;
  const isBusy = sending || editSubmitting || imageUploading;

  const handlePressMain = () => {
    if (isEditMode) handleSubmitEdit();
    else handleSend();
  };
  // ─── Navigate to participant's public profile ────────────────────────────────
  const handleProfilePress = () => {
    navigation.navigate('PublicProfile', {
      userId: participantId,
    });
  };

  // ─── Header menu handler ──────────────────────────────────────────────────
  const handleHeaderMenu = () => {
    Alert.alert(
      'Chat Options',
      null,
      [
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: handleClearChat,
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  // ─── Main return ───────────────────────────────────────────────────────────
  return (
    <>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <SafeAreaView style={s.safeArea}>
          {/* ── Custom chat header (no native header flash) ───────────────── */}
          <ChatHeader
            participantName={participantName}
            participantPicture={participantPicture}
            participantUsername={participantUsername}
            onBack={() => navigation.goBack()}
            onMenu={handleHeaderMenu}
            onProfilePress={handleProfilePress}   // 👈 add this
          />

          <FlatList
            ref={flatListRef}
            data={grouped}
            keyExtractor={(item, idx) => item._id || item.id || String(idx)}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          />

          {/* Edit mode banner */}
          {isEditMode && (
            <View style={s.editBanner}>
              <View style={s.editBannerAccent} />
              <View style={s.editBannerBody}>
                <Text style={s.editBannerLabel}>Editing message</Text>
                <Text style={s.editBannerOrig} numberOfLines={1}>{editingMsg.original}</Text>
              </View>
              <TouchableOpacity onPress={handleCancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input bar */}
          <View style={[s.inputBar, isEditMode && s.inputBarEdit]}>
            {!isEditMode && (
              <TouchableOpacity
                style={s.attachBtn}
                onPress={handlePickImage}
                disabled={isBusy}
                activeOpacity={0.7}
              >
                {imageUploading
                  ? <ActivityIndicator size="small" color={C.primary} />
                  : <Ionicons name="image-outline" size={22} color={C.primary} />
                }
              </TouchableOpacity>
            )}

            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder={isEditMode ? 'Edit your message…' : 'Type a message…'}
              placeholderTextColor={C.muted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />

            <TouchableOpacity
              style={[s.sendBtn, (!canSend || isBusy) && s.sendBtnDisabled, isEditMode && s.sendBtnEdit]}
              onPress={handlePressMain}
              disabled={!canSend || isBusy}
              activeOpacity={0.8}
            >
              {isBusy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name={isEditMode ? 'checkmark' : 'send'} size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <ContextMenu
        visible={contextMenu.visible}
        message={contextMenu.message}
        isMe={contextMenu.message?.senderId === userData?.id}
        onEdit={() => handleStartEdit(contextMenu.message)}
        onDelete={() => handleDeleteMessage(contextMenu.message)}
        onClose={() => setContextMenu({ visible: false, message: null })}
      />

      <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
    </>
  );
}

// ─── Screen styles (unchanged from your original) ───────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safeArea: { flex: 1, paddingBottom: Platform.OS === 'android' ? 8 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },

  // Date separator
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, paddingHorizontal: 4 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: C.divider },
  dateSepText: { fontSize: 11, color: C.muted, fontWeight: '700', marginHorizontal: 10, textTransform: 'uppercase', letterSpacing: 0.6 },

  // Message row
  msgWrap: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', maxWidth: '100%' },
  msgWrapMe: { justifyContent: 'flex-end' },
  msgWrapOther: { justifyContent: 'flex-start' },
  msgAvatarWrap: { marginRight: 6, marginBottom: 18 },

  // Bubble
  bubbleCol: { maxWidth: '75%' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { backgroundColor: C.myBubble, borderBottomRightRadius: 5 },
  bubbleOther: { backgroundColor: C.otherBubble, borderBottomLeftRadius: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  bubbleImage: { padding: 3 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextMe: { color: C.myText },
  bubbleTextOther: { color: C.otherText },

  // Meta row
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  msgMetaMe: { justifyContent: 'flex-end' },
  msgMetaOther: { justifyContent: 'flex-start' },
  editedTag: { fontSize: 10, color: C.muted, fontStyle: 'italic' },
  msgTime: { fontSize: 10, color: C.muted },
  readReceipt: { fontSize: 10 },
  readReceiptSent: { color: C.muted },
  readReceiptRead: { color: C.primaryLight },

  // Edit banner
  editBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.editBg, borderTopWidth: 1, borderTopColor: C.editBorder, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  editBannerAccent: { width: 3, height: '100%', borderRadius: 2, backgroundColor: C.warning, position: 'absolute', left: 0, top: 0, bottom: 0 },
  editBannerBody: { flex: 1, marginLeft: 6 },
  editBannerLabel: { fontSize: 11, fontWeight: '700', color: C.warning, textTransform: 'uppercase', letterSpacing: 0.5 },
  editBannerOrig: { fontSize: 13, color: C.subtext, marginTop: 1 },

  // Input bar
  inputBar: { flexDirection: 'row', padding: 10, paddingHorizontal: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.divider, alignItems: 'flex-end', gap: 8 },
  inputBarEdit: { borderTopColor: C.editBorder },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, minHeight: 42, maxHeight: 110, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.38 },
  sendBtnEdit: { backgroundColor: C.green },
});