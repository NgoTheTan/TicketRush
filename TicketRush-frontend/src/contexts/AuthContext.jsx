// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../api/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tr_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('tr_token'));
  const [loading, setLoading] = useState(false);

  const saveAuth = useCallback((tokenValue, userData) => {
    localStorage.setItem('tr_token', tokenValue);
    localStorage.setItem('tr_user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('tr_token');
    localStorage.removeItem('tr_user');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      saveAuth(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, [saveAuth]);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const data = await authService.register(payload);
      saveAuth(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, [saveAuth]);

  const logout = useCallback(async () => {
    await authService.logout();
    clearAuth();
  }, [clearAuth]);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      isAuthenticated,
      login, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
