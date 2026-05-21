// src/api/apiClient.js
// Centralized API client using native fetch
// Base URL from environment variable

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function getToken() {
  return sessionStorage.getItem('tr_token');
}

function buildHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function buildQueryString(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    if (Array.isArray(value)) {
      value.filter(v => v != null && v !== '').forEach(v => qs.append(key, v));
      return;
    }
    qs.append(key, value);
  });
  return qs.toString();
}

async function handleResponse(res) {
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const code = body?.error?.code || 'UNKNOWN_ERROR';
    const message = body?.error?.message || `HTTP ${res.status}`;
    const err = new Error(message);
    err.code = code;
    err.status = res.status;
    err.details = body?.error?.details || {};
    throw err;
  }

  return body; // { success, data, meta }
}

const api = {
  get: async (path, params) => {
    let url = `${BASE_URL}${path}`;
    if (params) {
      const qs = buildQueryString(params);
      if (qs) url += `?${qs}`;
    }
    const res = await fetch(url, { headers: buildHeaders() });
    return handleResponse(res);
  },

  post: async (path, body) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  patch: async (path, body) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  put: async (path, body) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  delete: async (path) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    return handleResponse(res);
  },

  upload: async (path, formData) => {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },
};

export default api;
