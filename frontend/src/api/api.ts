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
  api.post('/auth/login', { nickname, password }).then((r) => r.data);

export const register = (nickname: string, password: string) =>
  api.post('/auth/register', { nickname, password }).then((r) => r.data);

// Chat
export const getConversations = () =>
  api.get('/chat/conversations').then((r) => r.data);

export const startConversation = (userId: number) =>
  api.post('/chat/conversations', { userId }).then((r) => r.data);

export const getMessages = (conversationId: number) =>
  api.get(`/chat/conversations/${conversationId}/messages`).then((r) => r.data);

export const sendMessage = (conversationId: number, content: string) =>
  api.post(`/chat/conversations/${conversationId}/messages`, { content }).then((r) => r.data);

export const deleteMessage = (messageId: number, forAll: boolean) =>
  forAll
    ? api.delete(`/chat/messages/${messageId}/for-all`).then((r) => r.data)
    : api.delete(`/chat/messages/${messageId}/for-me`).then((r) => r.data);

// Friends
export const getFriends = () =>
  api.get('/friends').then((r) => r.data);

export const getFriendRequests = () =>
  api.get('/friends/requests/incoming').then((r) => r.data);

export const getSentRequests = () =>
  api.get('/friends/requests/sent').then((r) => r.data);

export const sendFriendRequest = (nickname: string) =>
  api.post('/friends/request', { nickname }).then((r) => r.data);

export const acceptFriendRequest = (requestId: number) =>
  api.post(`/friends/request/${requestId}/accept`).then((r) => r.data);

export const declineFriendRequest = (requestId: number) =>
  api.post(`/friends/request/${requestId}/decline`).then((r) => r.data);

export const removeFriend = (friendshipId: number) =>
  api.delete(`/friends/${friendshipId}`).then((r) => r.data);

// User / Profile
export const getProfile = (userId: number) =>
  api.get(`/users/${userId}/profile`).then((r) => r.data);

export const updateNickname = (nickname: string) =>
  api.put('/users/me/nickname', { nickname }).then((r) => r.data);

export const uploadAvatar = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

// Settings
export const getSettings = () =>
  api.get('/settings').then((r) => r.data);

export const updateSettings = (settings: { whoCanMessage: string; onlineVisibility: string }) =>
  api.put('/settings', settings).then((r) => r.data);

export const getBlockedUsers = () =>
  api.get('/settings/blocked').then((r) => r.data);

export const blockUser = (userId: number) =>
  api.post(`/settings/block/${userId}`).then((r) => r.data);

export const unblockUser = (userId: number) =>
  api.delete(`/settings/block/${userId}`).then((r) => r.data);
