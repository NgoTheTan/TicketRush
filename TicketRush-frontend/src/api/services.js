// src/api/seatService.js
import api from './apiClient.js';

export const seatService = {
  getSeatMap: async (eventId) => {
    const res = await api.get(`/api/v1/events/${eventId}/seats`);
    return res.data; // { eventId, zones[] }
  },

  holdSeat: async (eventId, seatId) => {
    const res = await api.post(`/api/v1/events/${eventId}/seats/${seatId}/hold`, {});
    return res.data; // { holdId, expiresAt, remainingSeconds, heldSeat, allSelectedSeats, totalAmount }
  },

  releaseSeat: async (eventId, seatId) => {
    const res = await api.delete(`/api/v1/events/${eventId}/seats/${seatId}/hold`);
    return res.data;
  },

  getActiveHold: async (eventId) => {
    const res = await api.get('/api/v1/holds/active', { eventId });
    return res.data; // ActiveHoldResponse or null
  },
};

// src/api/orderService.js
export const orderService = {
  createOrder: async (holdId) => {
    const res = await api.post('/api/v1/orders', { holdId });
    return res.data; // OrderResponse
  },

  confirmCheckout: async (holdId) => {
    const res = await api.post(`/api/v1/checkout/${holdId}/confirm`, {});
    return res.data; // CheckoutResponse { order, tickets[] }
  },

  getOrder: async (orderId) => {
    const res = await api.get(`/api/v1/orders/${orderId}`);
    return res.data;
  },

  // Admin
  adminListOrders: async ({ search, status, eventId, page = 0, size = 20 } = {}) => {
    const res = await api.get('/api/v1/admin/orders', { search, status, eventId, page, size });
    return { data: res.data, meta: res.meta };
  },

  adminGetOrder: async (orderId) => {
    const res = await api.get(`/api/v1/admin/orders/${orderId}`);
    return res.data;
  },
};

// src/api/ticketService.js
export const ticketService = {
  myTickets: async ({ status, page = 0, size = 20 } = {}) => {
    const res = await api.get('/api/v1/tickets/my', { status, page, size });
    return { data: res.data, meta: res.meta };
  },

  getTicket: async (ticketId) => {
    const res = await api.get(`/api/v1/tickets/${ticketId}`);
    return res.data;
  },
};

// src/api/queueService.js  [MOCK - Sprint 3 backend not yet implemented]
export const queueService = {
  // TODO Sprint 3: POST /api/v1/queue/{eventId}/join
  joinQueue: async (eventId) => {
    console.warn('[queueService] Backend not yet implemented. Using mock.');
    return {
      sessionId: Math.floor(Math.random() * 1000),
      queueToken: 'mock-token-' + Date.now(),
      position: Math.floor(Math.random() * 300) + 50,
      estimatedWaitSeconds: Math.floor(Math.random() * 300) + 60,
    };
  },

  // TODO Sprint 3: GET /api/v1/queue/position/{token}
  getPosition: async (token) => {
    console.warn('[queueService] Backend not yet implemented. Using mock.');
    return {
      status: 'WAITING',
      position: Math.floor(Math.random() * 50) + 1,
      estimatedWaitSeconds: Math.floor(Math.random() * 120) + 30,
    };
  },

  // TODO Sprint 3: GET /api/v1/queue/{eventId}/status
  getQueueStatus: async (eventId) => {
    return { queueActive: false };
  },
};
