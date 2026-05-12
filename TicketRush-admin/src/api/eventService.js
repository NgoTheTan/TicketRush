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

  adminCreate: async (payload) => {
    const res = await api.post('/api/v1/admin/events', payload);
    return res.data;
  },

  adminUpdate: async (eventId, payload) => {
    const res = await api.patch(`/api/v1/admin/events/${eventId}`, payload);
    return res.data;
  },

  adminChangeStatus: async (eventId, status) => {
    const res = await api.patch(`/api/v1/admin/events/${eventId}/status?status=${status}`, {});
    return res.data;
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
