// src/contexts/NotificationContext.jsx
// Context quản lý thông báo toàn cục — WebSocket connection sống suốt vòng đời app,
// không bị ngắt khi user điều hướng giữa các trang.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import notificationService from '../api/notificationService.js';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popup, setPopup] = useState(null);
  const popupTimerRef = useRef(null);
  const notificationReadStateRef = useRef(new Map());

  // ── Load danh sách thông báo từ API ─────────────────────────
  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [{ data }, count] = await Promise.all([
        notificationService.list({ page: 0, size: 20 }),
        notificationService.unreadCount(),
      ]);
      const next = data || [];
      notificationReadStateRef.current = new Map(
        next.map((n) => [n.id, Boolean(n.read)])
      );
      setNotifications(next);
      setUnreadCount(count);
    } catch {
      notificationReadStateRef.current = new Map();
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Cleanup popup timer khi unmount
  useEffect(() => {
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  // ── Show popup ────────────────────────────────────────────────
  const showPopup = useCallback((notification) => {
    setPopup(notification);
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => setPopup(null), 6000);
  }, []);

  // ── Nhận notification realtime qua WebSocket ─────────────────
  // Connection này tồn tại LIÊN TỤC suốt vòng đời app,
  // không bị mất khi user chuyển trang.
  const handleRealtimeNotification = useCallback((notification) => {
    if (!notification?.id) return;

    const previousRead = notificationReadStateRef.current.get(notification.id);
    const keepReadState = previousRead === true && !notification.read;
    const nextRead = keepReadState ? true : Boolean(notification.read);
    const normalized = keepReadState
      ? { ...notification, read: true, readAt: notification.readAt || new Date().toISOString() }
      : notification;

    notificationReadStateRef.current.set(notification.id, nextRead);
    setNotifications((current) => [
      normalized,
      ...current.filter((item) => item.id !== notification.id),
    ].slice(0, 20));

    if (previousRead === undefined) {
      if (!nextRead) setUnreadCount((c) => c + 1);
      showPopup(normalized);
      return;
    }

    if (previousRead !== nextRead) {
      setUnreadCount((c) => nextRead ? Math.max(0, c - 1) : c + 1);
    }
  }, [showPopup]);

  // Subscribe WebSocket — topic dựa trên user.id, enabled khi đã đăng nhập
  useWebSocket(
    user?.id ? `/topic/notifications/users/${user.id}` : null,
    handleRealtimeNotification,
    isAuthenticated && !!user?.id,
  );

  // ── Actions ───────────────────────────────────────────────────
  const markRead = useCallback(async (notificationId) => {
    try {
      const updated = await notificationService.markRead(notificationId);
      const readAt = updated?.readAt || new Date().toISOString();
      const wasUnread = notificationReadStateRef.current.get(notificationId) !== true;
      notificationReadStateRef.current.set(notificationId, true);
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, read: true, readAt } : item
        )
      );
      return updated;
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await notificationService.markAllRead();
    notificationReadStateRef.current = new Map(
      Array.from(notificationReadStateRef.current.keys()).map((id) => [id, true])
    );
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true, readAt: item.readAt || new Date().toISOString() }))
    );
  }, [unreadCount]);

  const deleteOne = useCallback(async (notificationId) => {
    const wasUnread = notificationReadStateRef.current.get(notificationId) !== true;
    await notificationService.deleteOne(notificationId);
    notificationReadStateRef.current.delete(notificationId);
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
  }, []);

  const deleteSelected = useCallback(async (ids) => {
    if (!ids?.length) return;
    const deletedUnread = notifications.filter(
      (item) => ids.includes(item.id) && !item.read
    ).length;
    await notificationService.deleteSelected(ids);
    ids.forEach((id) => notificationReadStateRef.current.delete(id));
    setNotifications((current) => current.filter((item) => !ids.includes(item.id)));
    setUnreadCount((c) => Math.max(0, c - deletedUnread));
  }, [notifications]);

  const dismissPopup = useCallback(() => {
    setPopup(null);
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      popup,
      showPopup,
      dismissPopup,
      markRead,
      markAllRead,
      deleteOne,
      deleteSelected,
      reload: load,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
