// ChatDetailScreen.js – improved version

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

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
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
  warningSoft: '#FFFBEB',
  green: '#10B981',
  overlay: 'rgba(0,0,0,0.45)',
  inputBg: '#FFFFFF',
  editBg: '#FFFBEB',
  editBorder: '#FCD34D',
  optimisticText: '#A5B4FC', // lighter color for pending messages
};

const EDIT_DELETE_MS = 3 * 60 * 1000;
const canModify = (createdAt) => Date.now() - new Date(createdAt).getTime() < EDIT_DELETE_MS;
const TEMP_ID_PREFIX = 'temp_';
const isTempMessage = (id) => String(id).startsWith(TEMP_ID_PREFIX);

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
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
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

// ─── Image Bubble ─────────────────────────────────────────────────────────────
function ImageBubble({ uri, isMe, onPress, isPending }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[imgB.wrap, isMe ? imgB.me : imgB.other]}>
      <Image source={{ uri }} style={[imgB.img, isPending && imgB.imgPending]} resizeMode="cover" />
      {isPending && (
        <View style={imgB.pendingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}
const imgB = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 2 },
  me: { borderBottomRightRadius: 4 },
  other: { borderBottomLeftRadius: 4 },
  img: { width: 210, height: 160 },
  imgPending: { opacity: 0.65 },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});

// ─── Context Menu (bottom sheet) ──────────────────────────────────────────────
function ContextMenu({ visible, message, isMe, onEdit, onDelete, onClose }) {
  const within = message ? canModify(message.createdAt) : false;
  const isPending = message ? isTempMessage(message._id) : false;

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

          {isMe && within && !isPending && message?.messageType !== 'image' && (
            <TouchableOpacity style={cm.row} onPress={onEdit} activeOpacity={0.7}>
              <View style={[cm.iconWrap, { backgroundColor: C.primarySoft }]}>
                <Ionicons name="pencil-outline" size={18} color={C.primary} />
              </View>
              <Text style={cm.rowText}>Edit Message</Text>
              <Ionicons name="chevron-forward" size={15} color={C.muted} />
            </TouchableOpacity>
          )}

          {isMe && within && !isPending && (
            <TouchableOpacity style={cm.row} onPress={onDelete} activeOpacity={0.7}>
              <View style={[cm.iconWrap, { backgroundColor: C.dangerSoft }]}>
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </View>
              <Text style={[cm.rowText, { color: C.danger }]}>Delete Message</Text>
              <Ionicons name="chevron-forward" size={15} color={C.muted} />
            </TouchableOpacity>
          )}

          {isPending && (
            <View style={cm.infoRow}>
              <Ionicons name="time-outline" size={16} color={C.muted} />
              <Text style={cm.infoText}>Message is sending…</Text>
            </View>
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
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  preview: { paddingHorizontal: 20, paddingVertical: 14 },
  previewLabel: { fontSize: 10, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  previewText: { fontSize: 14, color: C.subtext, lineHeight: 20 },
  divider: { height: 1, backgroundColor: C.divider, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  infoText: { fontSize: 14, color: C.muted },
  cancel: { marginHorizontal: 16, marginTop: 8, paddingVertical: 15, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: C.subtext },
});

// ─── Fullscreen Image Viewer ──────────────────────────────────────────────────
function ImageViewer({ uri, onClose }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={iv.overlay} onPress={onClose}>
        <Image source={{ uri }} style={iv.img} resizeMode="contain" />
        <TouchableOpacity style={iv.close} onPress={onClose}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}
const iv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  img: { width: '100%', height: '85%' },
  close: {
    position: 'absolute', top: 52, right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
});

// ─── Chat Header ──────────────────────────────────────────────────────────────
function ChatHeader({ participantName, participantPicture, participantUsername, onBack, onMenu, onProfilePress }) {
  return (
    <View style={chH.wrap}>
      <TouchableOpacity onPress={onBack} style={chH.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="arrow-back" size={24} color={C.text} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onProfilePress} style={chH.center} activeOpacity={0.75}>
        <View style={chH.avatarWrap}>
          <Avatar uri={participantPicture} name={participantName} size={38} />
          {/* Online indicator dot */}
          <View style={chH.onlineDot} />
        </View>
        <View style={chH.nameWrap}>
          <Text style={chH.name} numberOfLines={1}>{participantName || 'Chat'}</Text>
          {participantUsername
            ? <Text style={chH.handle}>@{participantUsername}</Text>
            : <Text style={chH.statusText}>Tap to view profile</Text>
          }
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
    paddingHorizontal: 8,
    paddingVertical: 10,
    paddingTop: 46,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: { padding: 8, marginRight: 2 },
  center: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, marginLeft: 2 },
  avatarWrap: { position: 'relative' },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.card,
  },
  nameWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  handle: { fontSize: 12, color: C.muted, marginTop: 1 },
  statusText: { fontSize: 12, color: C.primaryLight, marginTop: 1 },
  menuBtn: { padding: 8 },
});

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={tyS.wrap}>
      <View style={[tyS.bubble]}>
        <View style={tyS.dotWrap}>
          <View style={[tyS.dot, tyS.dot1]} />
          <View style={[tyS.dot, tyS.dot2]} />
          <View style={[tyS.dot, tyS.dot3]} />
        </View>
      </View>
    </View>
  );
}
const tyS = StyleSheet.create({
  wrap: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-end' },
  bubble: {
    backgroundColor: C.otherBubble,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  dotWrap: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.muted },
  dot1: {},
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.3 },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userData } = useContext(AuthContext);

  const { participantId, participantName, participantPicture, participantUsername } = route.params;

  const [messages, setMessages] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');

  // Busy guards — separate for each action, all prevent duplicate calls
  const sendingRef = useRef(false);
  const editSubmittingRef = useRef(false);
  const imageUploadingRef = useRef(false);
  const [sendingUI, setSendingUI] = useState(false);      // for UI feedback only
  const [imageUploading, setImageUploading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [editingMsg, setEditingMsg] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, message: null });
  const [viewingImage, setViewingImage] = useState(null);

  const conversationIdRef = useRef(null);
  const flatListRef = useRef(null);
  const pollingRef = useRef(null);
  const inputRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  // ─── Mark as read ─────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (msgs) => {
    const hasUnread = msgs.some(m => !m.isRead && m.senderId !== userData?.id);
    if (hasUnread) {
      try { await markConversationAsRead(participantId); } catch (_) { }
    }
  }, [participantId, userData?.id]);

  // ─── Fetch messages (non-destructive — preserves optimistic messages) ─────
  const fetchMessages = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const res = await getMessages(participantId);
      const serverMsgs = res.data || [];

      if (serverMsgs.length > 0 && serverMsgs[0].conversationId) {
        conversationIdRef.current = serverMsgs[0].conversationId;
      }

      // Keep optimistic (temp) messages that haven't been confirmed yet
      setMessages(prev => {
        const pendingTemps = prev.filter(m => isTempMessage(m._id));
        const merged = [...serverMsgs, ...pendingTemps];
        return merged;
      });

      setGrouped(groupByDate(serverMsgs));
      markAsRead(serverMsgs);

      // Auto-scroll only when new messages arrive
      if (serverMsgs.length > lastMessageCountRef.current) {
        lastMessageCountRef.current = serverMsgs.length;
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error('fetchMessages:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [participantId, markAsRead]);

  // ─── Polling — only while screen is focused ───────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchMessages(true);
      pollingRef.current = setInterval(() => fetchMessages(false), 4000);
      return () => {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      };
    }, [fetchMessages])
  );

  // Rebuild grouped whenever messages change
  useEffect(() => {
    const real = messages.filter(m => !isTempMessage(m._id));
    const temps = messages.filter(m => isTempMessage(m._id));
    setGrouped(groupByDate([...real, ...temps]));
  }, [messages]);

  // ─── Send text (optimistic) ───────────────────────────────────────────────
  const handleSend = async () => {
    const content = text.trim();
    if (!content || sendingRef.current) return;

    sendingRef.current = true;
    setSendingUI(true);

    const tempId = `${TEMP_ID_PREFIX}${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      content,
      senderId: userData?.id,
      createdAt: new Date().toISOString(),
      messageType: 'text',
      isRead: false,
      isPending: true,
    };

    // Instant optimistic append
    setText('');
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      await sendMessage({ receiverId: participantId, content, messageType: 'text' });
      // Remove temp and get real message from next poll
      setMessages(prev => prev.filter(m => m._id !== tempId));
      await fetchMessages(false);
    } catch (err) {
      console.error('sendMessage:', err?.response?.data || err.message);
      // Revert: remove temp, restore text
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setText(content);
      Alert.alert('Send Failed', 'Your message could not be sent. Please try again.');
    } finally {
      sendingRef.current = false;
      setSendingUI(false);
    }
  };

  // ─── Image pick + upload + send (optimistic local preview) ────────────────
  const handlePickImage = async () => {
    if (imageUploadingRef.current) return;

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

      // Optimistic: show local image immediately with uploading overlay
      const tempId = `${TEMP_ID_PREFIX}img_${Date.now()}`;
      const tempMsg = {
        _id: tempId,
        content: 'Image',
        senderId: userData?.id,
        createdAt: new Date().toISOString(),
        messageType: 'image',
        imageUrl: asset.uri,     // local URI for preview
        isRead: false,
        isPending: true,
      };

      imageUploadingRef.current = true;
      setImageUploading(true);
      setMessages(prev => [...prev, tempMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}.jpg`,
      });

      const uploadRes = await uploadChatImage(formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await sendMessage({
        receiverId: participantId,
        content: 'Image',
        messageType: 'image',
        imageUrl: uploadRes.data.url,
      });

      setMessages(prev => prev.filter(m => m._id !== tempId));
      await fetchMessages(false);
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload the image. Please try again.');
      console.error('uploadChatImage:', err?.response?.data || err.message);
      // Remove failed temp
      setMessages(prev => prev.filter(m => isTempMessage(m._id) && m.messageType === 'image' ? false : true));
    } finally {
      imageUploadingRef.current = false;
      setImageUploading(false);
    }
  };

  // ─── Edit message ─────────────────────────────────────────────────────────
  const handleStartEdit = (message) => {
    setContextMenu({ visible: false, message: null });
    setEditingMsg({ _id: message._id, original: message.content });
    setText(message.content);
    setTimeout(() => inputRef.current?.focus(), 180);
  };

  const handleCancelEdit = () => {
    setEditingMsg(null);
    setText('');
  };

  const handleSubmitEdit = async () => {
    const content = text.trim();
    if (!content || !editingMsg || editSubmittingRef.current) return;

    editSubmittingRef.current = true;
    setEditSubmitting(true);

    // Optimistic: update locally
    const prevMessages = messages;
    setMessages(prev => prev.map(m =>
      m._id === editingMsg._id ? { ...m, content, isEdited: true } : m
    ));

    const savedEditingMsg = editingMsg;
    setEditingMsg(null);
    setText('');

    try {
      await editMessageApi(savedEditingMsg._id, { content });
      await fetchMessages(false);
    } catch (err) {
      // Revert
      setMessages(prevMessages);
      setEditingMsg(savedEditingMsg);
      setText(content);
      Alert.alert('Edit Failed', 'Could not edit the message. The 3-minute window may have expired.');
      console.error('editMessage:', err?.response?.data || err.message);
    } finally {
      editSubmittingRef.current = false;
      setEditSubmitting(false);
    }
  };

  // ─── Delete message (optimistic) ─────────────────────────────────────────
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
            const prevMessages = messages;
            setMessages(prev => prev.filter(m => m._id !== message._id)); // instant remove
            try {
              await deleteMessageApi(message._id);
            } catch (err) {
              setMessages(prevMessages); // revert
              Alert.alert('Delete Failed', 'The 3-minute edit window may have expired.');
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
    if (!convId) { Alert.alert('No messages', 'There is nothing to clear yet.'); return; }
    Alert.alert(
      'Clear Chat',
      'This will clear the conversation for you only. The other person will still see it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            setGrouped([]);
            try { await clearChatApi(convId); }
            catch (err) {
              Alert.alert('Error', 'Could not clear the chat.');
              console.error('clearChat:', err?.response?.data || err.message);
              fetchMessages(false); // restore
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
          <View style={s.dateSepChip}>
            <Text style={s.dateSepText}>{item.label}</Text>
          </View>
          <View style={s.dateSepLine} />
        </View>
      );
    }

    const isMe = item.senderId === userData?.id;
    const isImage = item.messageType === 'image';
    const isEdited = item.isEdited === true;
    const isPending = item.isPending === true || isTempMessage(item._id);

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
            <View style={[
              s.bubble,
              isMe ? s.bubbleMe : s.bubbleOther,
              isImage && s.bubbleImage,
              isPending && isMe && s.bubblePending,
            ]}>
              {isImage && item.imageUrl ? (
                <ImageBubble
                  uri={item.imageUrl}
                  isMe={isMe}
                  isPending={isPending}
                  onPress={() => !isPending && setViewingImage(item.imageUrl)}
                />
              ) : (
                <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextOther, isPending && s.bubbleTextPending]}>
                  {item.content}
                </Text>
              )}
            </View>

            <View style={[s.msgMeta, isMe ? s.msgMetaMe : s.msgMetaOther]}>
              {isEdited && <Text style={s.editedTag}>edited · </Text>}
              {isPending
                ? <Text style={s.pendingTag}>Sending…</Text>
                : <Text style={s.msgTime}>{formatTime(item.createdAt)}</Text>
              }
              {isMe && !isPending && (
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

  // ─── Input state ──────────────────────────────────────────────────────────
  const isEditMode = !!editingMsg;
  const canSend = text.trim().length > 0;
  const isBusy = sendingUI || editSubmitting || imageUploading;

  const handlePressMain = () => {
    if (isEditMode) handleSubmitEdit();
    else handleSend();
  };

  const handleProfilePress = () => {
    navigation.navigate('PublicProfile', { userId: participantId });
  };

  const handleHeaderMenu = () => {
    Alert.alert('Chat Options', null, [
      { text: 'Clear Chat', style: 'destructive', onPress: handleClearChat },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.loadingWrap}>
        <ChatHeader
          participantName={participantName}
          participantPicture={participantPicture}
          participantUsername={participantUsername}
          onBack={() => navigation.goBack()}
          onMenu={handleHeaderMenu}
          onProfilePress={handleProfilePress}
        />
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading messages…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────────
  const showEmpty = grouped.length === 0;

  return (
    <>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <SafeAreaView style={s.safeArea}>
          <ChatHeader
            participantName={participantName}
            participantPicture={participantPicture}
            participantUsername={participantUsername}
            onBack={() => navigation.goBack()}
            onMenu={handleHeaderMenu}
            onProfilePress={handleProfilePress}
          />

          {showEmpty ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color={C.muted} />
              </View>
              <Text style={s.emptyTitle}>Start the conversation</Text>
              <Text style={s.emptyMsg}>Say hello to {participantName?.split(' ')[0] || 'them'}!</Text>
            </View>
          ) : (
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
          )}

          {/* Edit mode banner */}
          {isEditMode && (
            <View style={s.editBanner}>
              <View style={s.editBannerAccent} />
              <View style={s.editBannerIcon}>
                <Ionicons name="pencil-outline" size={14} color={C.warning} />
              </View>
              <View style={s.editBannerBody}>
                <Text style={s.editBannerLabel}>Editing message</Text>
                <Text style={s.editBannerOrig} numberOfLines={1}>{editingMsg.original}</Text>
              </View>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={s.editBannerClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={16} color={C.subtext} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input bar */}
          <View style={[s.inputBar, isEditMode && s.inputBarEdit]}>
            {!isEditMode && (
              <TouchableOpacity
                style={[s.attachBtn, imageUploading && s.attachBtnBusy]}
                onPress={handlePickImage}
                disabled={imageUploading}
                activeOpacity={0.75}
              >
                {imageUploading
                  ? <ActivityIndicator size="small" color={C.primary} />
                  : <Ionicons name="image-outline" size={21} color={C.primary} />
                }
              </TouchableOpacity>
            )}

            <TextInput
              ref={inputRef}
              style={[s.input, isEditMode && s.inputEdit]}
              placeholder={isEditMode ? 'Edit your message…' : 'Type a message…'}
              placeholderTextColor={C.muted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />

            <TouchableOpacity
              style={[
                s.sendBtn,
                isEditMode && s.sendBtnEdit,
                (!canSend || isBusy) && s.sendBtnDisabled,
              ]}
              onPress={handlePressMain}
              disabled={!canSend || isBusy}
              activeOpacity={0.8}
            >
              {isBusy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name={isEditMode ? 'checkmark' : 'send'} size={17} color="#fff" />
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safeArea: { flex: 1, paddingBottom: Platform.OS === 'android' ? 8 : 0 },
  loadingWrap: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.muted },

  listContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12 },

  // Empty state
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 60 },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  emptyMsg: { fontSize: 14, color: C.muted },

  // Date separator
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 4 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: C.divider },
  dateSepChip: {
    backgroundColor: C.divider,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 10,
  },
  dateSepText: { fontSize: 11, color: C.subtext, fontWeight: '700', letterSpacing: 0.4 },

  // Message row
  msgWrap: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end', maxWidth: '100%' },
  msgWrapMe: { justifyContent: 'flex-end' },
  msgWrapOther: { justifyContent: 'flex-start' },
  msgAvatarWrap: { marginRight: 6, marginBottom: 18 },

  // Bubble
  bubbleCol: { maxWidth: '75%' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: {
    backgroundColor: C.myBubble,
    borderBottomRightRadius: 5,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleOther: {
    backgroundColor: C.otherBubble,
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  bubblePending: { opacity: 0.72 },
  bubbleImage: { padding: 3 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextMe: { color: C.myText },
  bubbleTextOther: { color: C.otherText },
  bubbleTextPending: { opacity: 0.8 },

  // Meta row
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  msgMetaMe: { justifyContent: 'flex-end' },
  msgMetaOther: { justifyContent: 'flex-start' },
  editedTag: { fontSize: 10, color: C.muted, fontStyle: 'italic' },
  msgTime: { fontSize: 10, color: C.muted },
  pendingTag: { fontSize: 10, color: C.primaryLight, fontStyle: 'italic' },
  readReceipt: { fontSize: 10 },
  readReceiptSent: { color: C.muted },
  readReceiptRead: { color: C.primaryLight },

  // Edit banner
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.editBg,
    borderTopWidth: 1.5,
    borderTopColor: C.editBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  editBannerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.warning,
  },
  editBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBannerBody: { flex: 1 },
  editBannerLabel: { fontSize: 11, fontWeight: '700', color: C.warning, textTransform: 'uppercase', letterSpacing: 0.6 },
  editBannerOrig: { fontSize: 13, color: C.subtext, marginTop: 1 },
  editBannerClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    alignItems: 'flex-end',
    gap: 8,
  },
  inputBarEdit: { borderTopColor: C.editBorder, backgroundColor: C.editBg },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  attachBtnBusy: { opacity: 0.6 },
  input: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 42,
    maxHeight: 120,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    lineHeight: 20,
  },
  inputEdit: {
    backgroundColor: '#FFFBEB',
    borderColor: C.editBorder,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: { opacity: 0.35, shadowOpacity: 0 },
  sendBtnEdit: { backgroundColor: C.green },
});