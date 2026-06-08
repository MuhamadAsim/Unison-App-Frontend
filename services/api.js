import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE_URL = 'https://unison-backend-lxmu.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);




// ─────────────────────────────────────────────────────────────────────────────
// 🔐 AUTHENTICATION MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const sendOtp = (data) => api.post('/auth/send-otp', data);
export const verifyOtp = (data) => api.post('/auth/verify-otp', data);
export const register = (data, config = {}) => api.post('/auth/register', data, config);
export const login = (data) => api.post('/auth/login', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);




// ─────────────────────────────────────────────────────────────────────────────
// 👤 ALUMNI MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getAlumniProfile = () => api.get('/alumni/me');
export const updateAlumniProfile = (data) => api.put('/alumni/me', data);
export const getBatchmates = () => api.get('/alumni/batch-mates');
export const getAlumniConnections = () => api.get('/alumni/connections');
export const deleteAlumniAccount = () => api.delete('/alumni/me');



// ─────────────────────────────────────────────────────────────────────────────
// 🎓 STUDENT MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getStudentProfile = () => api.get('/student/me');
export const updateStudentProfile = (data, config = {}) => api.put('/student/me', data, config);
export const getStudentConnections = () => api.get('/student/connections');
export const requestProfileUpgrade = (data) => api.post('/student/upgrade-request', data);
export const deleteStudentAccount = () => api.delete('/student/me');



// ─────────────────────────────────────────────────────────────────────────────
// 🤝 PARTNER MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getPartnerProfile = () => api.get('/partner/me');
export const getPartnerConnections = () => api.get('/partner/connections');
export const deletePartnerAccount = () => api.delete('/partner/me');



// ─────────────────────────────────────────────────────────────────────────────
// 🧩 PROFILE MODULE (Unified — Alumni, Students & Partners)
// ─────────────────────────────────────────────────────────────────────────────
export const updateProfile = (data, config = {}) => api.put('/profile/me', data, config);
export const addWorkExperience = (data) => api.post('/profile/work-experience', data);
export const updateWorkExperience = (id, data) => api.put(`/profile/work-experience/${id}`, data);
export const deleteWorkExperience = (id) => api.delete(`/profile/work-experience/${id}`);

export const addEducation = (data) => api.post('/profile/education', data);
export const updateEducation = (id, data) => api.put(`/profile/education/${id}`, data);
export const deleteEducation = (id) => api.delete(`/profile/education/${id}`);

export const addSkill = (data) => api.post('/profile/skills', data);
export const updateSkill = (id, data) => api.put(`/profile/skills/${id}`, data);
export const deleteSkill = (id) => api.delete(`/profile/skills/${id}`);





// ─────────────────────────────────────────────────────────────────────────────
// 🔗 CONNECTIONS MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getConnectionStatus = (targetId) => api.get(`/connections/status/${targetId}`);
export const removeConnection = (targetId) => api.delete(`/connections/${targetId}`);
export const connectUser = (targetId, data = {}) => api.post(`/connections/request/${targetId}`, data);
export const getConnectionRequests = () => api.get('/connections/requests');
export const respondToConnection = (senderId, data) => api.patch(`/connections/requests/${senderId}/respond`, data);
export const getSentRequests = () => api.get('/connections/requests/sent');
export const cancelSentRequest = (targetId) => api.delete(`/connections/request/${targetId}`);
export const blockUser = (targetId) => api.post(`/connections/block/${targetId}`);
export const unblockUser = (targetId) => api.delete(`/connections/unblock/${targetId}`);
export const followUser = (targetId) => api.post(`/connections/follow/${targetId}`);
export const unfollowUser = (targetId) => api.delete(`/connections/unfollow/${targetId}`);
export const getFollowers = (targetId) => api.get(`/connections/${targetId}/followers`);
export const getFollowing = (targetId) => api.get(`/connections/${targetId}/following`);




// ─────────────────────────────────────────────────────────────────────────────
// 💼 OPPORTUNITIES MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getOpportunities = (params) => api.get('/opportunities', { params });
export const getOpportunityById = (id) => api.get(`/opportunities/${id}`);
export const postOpportunity = (data, config = {}) => api.post('/opportunities', data, config);
export const getMyOpportunities = () => api.get('/opportunities/my-posts');
export const updateOpportunity = (id, data, config = {}) => api.put(`/opportunities/${id}`, data, config);
export const deleteOpportunity = (id) => api.delete(`/opportunities/${id}`);




// ─────────────────────────────────────────────────────────────────────────────
// 🔎 SEARCH & DISCOVERY MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const searchUsers = (params) => api.get('/search/users', { params });
export const searchOpportunities = (params) => api.get('/search/opportunities', { params });
export const searchUserByUsername = (username) => api.get(`/search/user/${username}`);
export const getUserSuggestions = (query) => api.get('/search/suggestions', { params: { q: query } });
export const getAllSkills = () => api.get('/skills/all');




// ─────────────────────────────────────────────────────────────────────────────
// 🎭 PROFILES MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getSuggestions = () => api.get('/profiles/suggestions');
export const getPublicProfile = (userId) => api.get(`/profiles/user/${userId}`);




// ─────────────────────────────────────────────────────────────────────────────
// 📊 NETWORK ANALYTICS MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getTopConnected = () => api.get('/network/centrality');
export const getShortestPath = (from, to) => api.get('/network/shortest-path', { params: { from, to } });
export const getTopCompanies = () => api.get('/network/top-companies');
export const getSkillTrends = () => api.get('/network/skill-trends');
export const getBatchAnalysis = () => api.get('/network/batch-analysis');





// ─────────────────────────────────────────────────────────────────────────────
// 📬 NOTIFICATIONS MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getNotifications = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const clearAllNotifications = () => api.delete('/notifications/all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);




// ─────────────────────────────────────────────────────────────────────────────
// 💬 CHAT MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const uploadChatImage = (data, config = {}) => api.post('/chat/upload', data, config);
export const sendMessage = (data) => api.post('/chat/messages', data);
export const getConversations = () => api.get('/chat/conversations');
export const getMessages = (participantId) => api.get(`/chat/conversations/${participantId}/messages`);
export const markMessageAsRead = (messageId) => api.patch(`/chat/messages/${messageId}/read`);
export const markConversationAsRead = (participantId) => api.patch(`/chat/conversations/${participantId}/read`);
export const editMessage = (messageId, data) => api.patch(`/chat/messages/${messageId}`, data);
export const deleteMessage = (messageId) => api.delete(`/chat/messages/${messageId}`);
export const clearChat = (conversationId) => api.delete(`/chat/conversations/${conversationId}/clear`);




// ─────────────────────────────────────────────────────────────────────────────
// 📅 EVENTS MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getEvents = (params) => api.get('/events', { params });
export const getEventById = (id) => api.get(`/events/${id}`);
export const createEvent = (data, config = {}) => api.post('/events', data, config);
export const updateEvent = (id, data, config = {}) => api.put(`/events/${id}`, data, config);
export const deleteEvent = (id) => api.delete(`/events/${id}`);
export const rsvpEvent = (id, data) => api.post(`/events/${id}/rsvp`, data);
export const cancelRsvp = (id) => api.delete(`/events/${id}/rsvp`);
export const getEventAttendees = (id) => api.get(`/events/${id}/attendees`);
export const getMyEvents = () => api.get('/events/my-events');




// ─────────────────────────────────────────────────────────────────────────────
// 📱 DISCOVERY FEED MODULE
// ─────────────────────────────────────────────────────────────────────────────
export const getFeed = (params) => api.get('/feed', { params });

export default api;