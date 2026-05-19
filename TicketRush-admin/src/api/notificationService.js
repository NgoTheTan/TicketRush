import api from './apiClient.js';

const notificationService = {
  list: async ({ page = 0, size = 20 } = {}) => {
    const res = await api.get('/api/v1/notifications', { page, size });
    return { data: res.data, meta: res.meta };
  },

  unreadCount: async () => {
    const res = await api.get('/api/v1/notifications/unread-count');
    return res.data?.count ?? 0;
  },

  markRead: async (notificationId) => {
    const res = await api.patch(`/api/v1/notifications/${notificationId}/read`, {});
    return res.data;
  },

  markAllRead: async () => {
    await api.patch('/api/v1/notifications/read-all', {});
  },

  deleteOne: async (notificationId) => {
    await api.delete(`/api/v1/notifications/${notificationId}`);
  },

  deleteSelected: async (notificationIds) => {
    if (!notificationIds?.length) return;
    const qs = notificationIds.map((id) => `ids=${encodeURIComponent(id)}`).join('&');
    await api.delete(`/api/v1/notifications?${qs}`);
  },

  deleteAll: async () => {
    await api.delete('/api/v1/notifications/all');
  },
};

export default notificationService;
