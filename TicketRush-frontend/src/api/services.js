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

  /**
   * Hủy đơn hàng PENDING — gọi khi user nhấn Quay lại / Hủy thanh toán.
   * Backend sẽ: Order→CANCELLED, Hold→RELEASED, Ghế→AVAILABLE.
   */
  cancelOrder: async (orderId) => {
    await api.delete(`/api/v1/orders/${orderId}`);
  },

  confirmCheckout: async (holdId) => {
    const res = await api.post(`/api/v1/checkout/${holdId}/confirm`, {});
    return res.data; // CheckoutResponse { order, tickets[] }
  },

  getOrder: async (orderId) => {
    const res = await api.get(`/api/v1/orders/${orderId}`);
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

// ── Queue service (always-on for ON_SALE events) ─────────────
export const queueService = {
  /**
   * GET /api/v1/queue/{eventId}/status
   * Check queue status before joining.
   */
  getQueueStatus: async (eventId) => {
    const res = await api.get(`/api/v1/queue/${eventId}/status`);
    return res.data;
  },

  /**
   * POST /api/v1/queue/{eventId}/join
   * Join queue or resume existing session (idempotent).
   * Returns { sessionId, queueToken, position, estimatedWaitSeconds, joinedAt }
   */
  joinQueue: async (eventId) => {
    const res = await api.post(`/api/v1/queue/${eventId}/join`, {});
    return res.data;
  },

  /**
   * GET /api/v1/queue/position/{token}
   * Poll every 2s. Returns { status, position, estimatedWaitSeconds, accessToken?, accessExpiresAt? }
   */
  getPosition: async (token) => {
    const res = await api.get(`/api/v1/queue/position/${token}`);
    return res.data;
  },

  // ── System Queue (login-level) ──────────────────────────────

  /** POST /api/v1/queue/system/join — join sau khi login */
  joinSystemQueue: async () => {
    const res = await api.post('/api/v1/queue/system/join', {});
    return res.data;
  },

  /** GET /api/v1/queue/system/status */
  getSystemQueueStatus: async () => {
    const res = await api.get('/api/v1/queue/system/status');
    return res.data;
  },
};

