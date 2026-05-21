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

  me: async () => {
    const res = await api.get('/api/v1/auth/me');
    return res.data; // { id, fullName, email, role, profile }
  },

  logout: async () => {
    await api.post('/api/v1/auth/logout', {}).catch(() => {});
    sessionStorage.removeItem('tr_token');
    sessionStorage.removeItem('tr_user');
    localStorage.removeItem('tr_token');
    localStorage.removeItem('tr_user');
  },
};

export default authService;
