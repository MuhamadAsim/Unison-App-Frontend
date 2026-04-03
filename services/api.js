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




// ─── ALUMNI MODULE ────────────────────────────────────────────────────────────
export const getAlumniProfile = () => api.get(`/alumni/me`);                        // GET  /alumni/me
export const updateAlumniProfile = (data) => api.put(`/alumni/me`, data);                  // PUT  /alumni/me
export const addWorkExperience = (data) => api.post(`/alumni/work-experience`, data);    // POST /alumni/work-experience
export const updateWorkExperience = (id, data) => api.put(`/alumni/work-experience/${id}`, data); // PUT /alumni/work-experience/:id
export const deleteWorkExperience = (id) => api.delete(`/alumni/work-experience/${id}`);  // DEL  /alumni/work-experience/:id
export const addAlumniSkill = (data) => api.post(`/alumni/skills`, data);             // POST /alumni/skills
export const deleteAlumniSkill = (skillId) => api.delete(`/alumni/skills/${skillId}`);      // DEL  /alumni/skills/:skill_id
export const getNetwork = () => api.get(`/alumni/network`);                   // GET  /alumni/network
export const getBatchmates = () => api.get(`/alumni/batch-mates`);               // GET  /alumni/batch-mates



// ─── STUDENT MODULE ───────────────────────────────────────────────────────────
export const getStudentProfile = () => api.get(`/student/me`);          // GET  /student/me
export const updateStudentProfile = (data, config = {}) => api.put('/student/me', data, config);
export const addStudentSkill = (data) => api.post(`/student/skills`, data); // POST /student/skills
export const getMentors = () => api.get(`/student/mentors`);     // GET  /student/mentors
export const getStudentConnections = () => api.get(`/student/connections`);   // GET  /student/connections - Get accepted mentorship connections



// ─── CONNECTIONS MODULE ───────────────────────────────────────────────────────
export const getConnectionStatus = (targetId) => api.get(`/connections/status/${targetId}`);             // GET   /connections/status/:target_id
export const removeConnection = (targetId) => api.delete(`/connections/${targetId}`);                    // DEL   /connections/:target_id
export const connectUser = (targetId, data) => api.post(`/connections/request/${targetId}`, data);       // POST  /connections/request/:target_id
export const getConnectionRequests = () => api.get(`/connections/requests`);                             // GET   /connections/requests
export const respondToConnection = (senderId, data) => api.patch(`/connections/requests/${senderId}/respond`, data); // PATCH /connections/requests/:sender_id/respond



// ─── OPPORTUNITIES MODULE ─────────────────────────────────────────────────────
export const getOpportunities = (params) => api.get(`/opportunities`, { params }); // GET  /opportunities
export const getOpportunityById = (id) => api.get(`/opportunities/${id}`);        // GET  /opportunities/:id
export const postOpportunity = (data) => api.post(`/opportunities`, data);       // POST /opportunities
export const getMyOpportunities = () => api.get(`/opportunities/my-posts`);    // GET  /opportunities/my-posts
export const updateOpportunity = (id, data) => api.put(`/opportunities/${id}`, data); // PUT /opportunities/:id
export const deleteOpportunity = (id) => api.delete(`/opportunities/${id}`);    // DEL  /opportunities/:id



// ─── SEARCH MODULE ────────────────────────────────────────────────────────────
export const searchAlumni = (params) => api.get(`/search/alumni`, { params });        // GET /search/alumni
export const searchOpportunities = (params) => api.get(`/search/opportunities`, { params }); // GET /search/opportunities
export const searchUserByUsername = (username) => api.get(`/search/user/${username}`);       // GET /search/user/:username
export const getAllSkills = () => api.get(`/skills/all`);                       // GET /skills/all



// ─── NETWORK ANALYTICS MODULE ─────────────────────────────────────────────────
export const getTopConnected = () => api.get(`/network/centrality`);              // GET /network/centrality
export const getShortestPath = (from, to) => api.get(`/network/shortest-path`, { params: { from, to } }); // GET /network/shortest-path?from=&to=
export const getTopCompanies = () => api.get(`/network/top-companies`);           // GET /network/top-companies
export const getSkillTrends = () => api.get(`/network/skill-trends`);            // GET /network/skill-trends
export const getBatchAnalysis = () => api.get(`/network/batch-analysis`);          // GET /network/batch-analysis



// ─── NOTIFICATIONS MODULE ─────────────────────────────────────────────────────
export const getNotifications = () => api.get(`/notifications`);                   // GET   /notifications
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);     // PATCH /notifications/:id/read

// ─── PROFILES MODULE ────────────────────────────────────────────────────────────
export const getPublicProfile = (id) => api.get(`/profiles/user/${id}`);          // GET   /profiles/user/:id

export default api;