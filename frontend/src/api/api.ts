import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// Auth
export const login = (nickname: string, password: string) =>
  api.post('/auth/login', { nickname, password });

export const register = (nickname: string, password: string) =>
  api.post('/auth/register', { nickname, password });

// Chat
export const getConversations = () => api.get('/chat/conversations');
export const openConversation = (userId: number) =>
  api.post('/chat/conversations', { userId });
export const getMessages = (conversationId: number) =>
  api.get(`/chat/conversations/${conversationId}/messages`);
export const deleteMessageForMe = (messageId: number) =>
  api.delete(`/chat/messages/${messageId}/for-me`);
export const deleteMessageForAll = (messageId: number) =>
  api.delete(`/chat/messages/${messageId}/for-all`);

// Friends
export const getFriends = () => api.get('/friends');
export const getPendingRequests = () => api.get('/friends/requests/pending');
export const sendFriendRequest = (nickname: string) =>
  api.post('/friends/request', { nickname });
export const respondToRequest = (id: number, accept: boolean) =>
  api.post(`/friends/request/${id}/respond`, null, { params: { accept } });
export const removeFriend = (friendId: number) =>
  api.delete(`/friends/${friendId}`);

// Settings
export const getSettings = () => api.get('/settings');
export const updateMessaging = (permission: string) =>
  api.patch('/settings/messaging', { permission });
export const updateStatusVisibility = (visibility: string) =>
  api.patch('/settings/status-visibility', { visibility });
export const blockUser = (targetId: number) =>
  api.post(`/settings/block/${targetId}`);
export const unblockUser = (targetId: number) =>
  api.delete(`/settings/block/${targetId}`);
