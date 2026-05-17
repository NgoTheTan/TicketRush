// src/api/authService.js
import api from './apiClient.js';

const authService = {
  login: async (email, password) => {
    const res = await api.post('/api/v1/auth/login', { email, password });
    return res.data; // { token, user }
  },

  register: async (payload) => {
    const res = await api.post('/api/v1/auth/register', payload);
    return res.data; // { token, user }
  },

  forgotPassword: async (email) => {
    const res = await api.post('/api/v1/auth/forgot-password', { email });
    return res.data;
  },

  verifyResetOtp: async (payload) => {
    const res = await api.post('/api/v1/auth/verify-reset-otp', payload);
    return res.data;
  },

  resetPassword: async (payload) => {
    const res = await api.post('/api/v1/auth/reset-password', payload);
    return res.data;
  },

  me: async () => {
    const res = await api.get('/api/v1/auth/me');
    return res.data; // { id, fullName, email, role, profile }
  },

  updateAvatar: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.upload('/api/v1/auth/me/avatar', formData);
    return res.data; // { avatarUrl }
  },

  logout: async () => {
    await api.post('/api/v1/auth/logout', {}).catch(() => {});
    localStorage.removeItem('tr_token');
    localStorage.removeItem('tr_user');
  },
};

export default authService;
