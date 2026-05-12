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
};

export default eventService;
