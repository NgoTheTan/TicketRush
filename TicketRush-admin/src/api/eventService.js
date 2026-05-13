// src/api/eventService.js
import api from './apiClient.js';

const eventService = {
  // Public - list events
  list: async ({ search, page = 0, size = 12 } = {}) => {
    const res = await api.get('/api/v1/events', { search, page, size });
    return { data: res.data, meta: res.meta };
  },

  // Public - event detail
  get: async (eventId) => {
    const res = await api.get(`/api/v1/events/${eventId}`);
    return res.data;
  },

  // Admin
  adminList: async ({ search, status, page = 0, size = 20 } = {}) => {
    const res = await api.get('/api/v1/admin/events', { search, status, page, size });
    return { data: res.data, meta: res.meta };
  },

  adminGetEvent: async (eventId) => {
    const res = await api.get(`/api/v1/admin/events/${eventId}`);
    return res.data;
  },

  adminCreate: async (payload) => {
    const res = await api.post('/api/v1/admin/events', payload);
    return res.data;
  },

  adminUploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // apiClient needs to be able to handle FormData without setting Content-Type to application/json
    const token = localStorage.getItem('tr_token');
    const res = await fetch('http://localhost:8080/api/v1/admin/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    if (!res.ok) throw new Error('Upload ảnh thất bại');
    const body = await res.json();
    return body.data; // Should contain { url: '...' }
  },

  adminUpdate: async (eventId, payload) => {
    const res = await api.patch(`/api/v1/admin/events/${eventId}`, payload);
    return res.data;
  },

  adminChangeStatus: async (eventId, status) => {
    const res = await api.patch(`/api/v1/admin/events/${eventId}/status?status=${status}`, {});
    return res.data;
  },

  adminDelete: async (eventId) => {
    await api.delete(`/api/v1/admin/events/${eventId}`);
  },

  // Seat zones
  getSeatZones: async (eventId) => {
    const res = await api.get(`/api/v1/admin/events/${eventId}/seat-zones`);
    return res.data;
  },

  getSeatMap: async (eventId) => {
    const res = await api.get(`/api/v1/admin/events/${eventId}/seat-map`);
    return res.data;
  },

  saveSeatZones: async (eventId, zones) => {
    const res = await api.post(`/api/v1/admin/events/${eventId}/seat-zones`, { zones });
    return res.data;
  },
};

export default eventService;
