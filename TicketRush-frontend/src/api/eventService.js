// src/api/eventService.js
import api from './apiClient.js';

const eventService = {
  // Public - list events
  list: async ({ search, category, city, fromDate, toDate, page = 0, size = 12 } = {}) => {
    const categories = Array.isArray(category) ? category : (category ? [category] : []);
    const res = await api.get('/api/v1/events', {
      search,
      category: categories.length ? categories : undefined,
      city,
      fromDate,
      toDate,
      page,
      size,
    });
    return { data: res.data, meta: res.meta };
  },


  // Public - autocomplete suggestions
  suggest: async (keyword) => {
    const res = await api.get('/api/v1/events/suggest', { keyword });
    return res.data || [];
  },

  // Public - event detail
  get: async (eventId) => {
    const res = await api.get(`/api/v1/events/${eventId}`);
    return res.data;
  },

  // Public - trending events
  trending: async () => {
    const res = await api.get('/api/v1/events/trending');
    return res.data || [];
  },
};

export default eventService;
