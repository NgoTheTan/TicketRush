import { useCallback, useEffect, useRef, useState } from 'react';
import notificationService from '../../api/notificationService.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';
import { useWebSocket } from '../../hooks/useWebSocket.js';

function timeLabel(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function iconFor(type) {
  if (type === 'BOOKING_SUCCESS') return 'confirmation_number';
  if (type === 'EVENT_REMINDER_24H') return 'event_upcoming';
  if (type === 'EVENT_CANCELLED_REFUND') return 'currency_exchange';
  if (type?.startsWith('ORDER_')) return 'receipt_long';
  return 'notifications';
}

export default function NotificationCenter({ variant = 'inline' }) {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [popup, setPopup] = useState(null);
  const rootRef = useRef(null);
  const popupTimerRef = useRef(null);
  const notificationReadStateRef = useRef(new Map());
  const floating = variant === 'floating';

  const showPopup = useCallback((notification) => {
    setPopup(notification);
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => setPopup(null), 6000);
  }, []);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [{ data }, count] = await Promise.all([
        notificationService.list({ page: 0, size: 20 }),
        notificationService.unreadCount(),
      ]);
      const nextNotifications = data || [];
      notificationReadStateRef.current = new Map(
        nextNotifications.map((notification) => [notification.id, Boolean(notification.read)])
      );
      setNotifications(nextNotifications);
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

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  const handleRealtimeNotification = useCallback((notification) => {
    if (!notification?.id) return;
    const previousRead = notificationReadStateRef.current.get(notification.id);
    const keepReadState = previousRead === true && !notification.read;
    const nextRead = keepReadState ? true : Boolean(notification.read);
    const normalizedNotification = keepReadState
      ? { ...notification, read: true, readAt: notification.readAt || new Date().toISOString() }
      : notification;

    notificationReadStateRef.current.set(notification.id, nextRead);
    setNotifications((current) => [
      normalizedNotification,
      ...current.filter((item) => item.id !== notification.id),
    ].slice(0, 20));

    if (previousRead === undefined) {
      if (!nextRead) {
        setUnreadCount((current) => current + 1);
      }
      if (!open) {
        showPopup(normalizedNotification);
      }
      return;
    }

    if (previousRead !== nextRead) {
      setUnreadCount((current) => (nextRead ? Math.max(0, current - 1) : current + 1));
    }
  }, [open, showPopup]);

  useWebSocket(
    user?.id ? `/topic/notifications/users/${user.id}` : null,
    handleRealtimeNotification,
    isAuthenticated && !!user?.id,
  );

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    await notificationService.markAllRead();
    notificationReadStateRef.current = new Map(
      Array.from(notificationReadStateRef.current.keys()).map((id) => [id, true])
    );
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, read: true, readAt: item.readAt || new Date().toISOString() })));
  };

  const closeSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const allVisibleSelected = notifications.length > 0 && notifications.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(notifications.map((item) => item.id)));
  };

  const toggleSelected = (notificationId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const deletedUnread = notifications.filter((item) => ids.includes(item.id) && !item.read).length;
    await notificationService.deleteSelected(ids);
    ids.forEach((id) => notificationReadStateRef.current.delete(id));
    setNotifications((current) => current.filter((item) => !ids.includes(item.id)));
    setUnreadCount((current) => Math.max(0, current - deletedUnread));
    closeSelectionMode();
  };

  const openNotification = async (notification) => {
    const wasUnread = notificationReadStateRef.current.get(notification.id) !== true;
    if (wasUnread && !notification.read) {
      try {
        const updated = await notificationService.markRead(notification.id);
        const readAt = updated?.readAt || new Date().toISOString();
        notificationReadStateRef.current.set(notification.id, true);
        setUnreadCount((current) => Math.max(0, current - 1));
        setNotifications((current) => current.map((item) =>
          item.id === notification.id ? { ...item, read: true, readAt } : item
        ));
      } catch {
        // The link navigation should still work if marking as read fails.
      }
    }
    setPopup(null);
    setOpen(false);
    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    }
  };

  const handleNotificationClick = (notification) => {
    if (selectionMode) {
      toggleSelected(notification.id);
      return;
    }
    openNotification(notification);
  };

  if (!isAuthenticated) return null;

  const toggleOpen = () => {
    if (!open) setPopup(null);
    setOpen((value) => !value);
  };

  const button = (
    <button
      type="button"
      onClick={toggleOpen}
      className={floating
        ? 'relative flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-600/25 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2'
        : 'relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors'}
      aria-label="Thông báo"
      aria-haspopup="menu"
      aria-expanded={open}
    >
      <span className="material-symbols-outlined text-[22px]">notifications</span>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <>
      <div ref={rootRef} className={floating ? 'fixed bottom-6 right-6 z-[75]' : 'relative'}>
        {button}

        {open && (
          <div
            className={`${floating ? 'absolute bottom-full right-0 mb-3' : 'absolute right-0 top-full mt-3'} w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-100 bg-white shadow-2xl`}
            role="menu"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {selectionMode ? `${selectedIds.size} đã chọn` : 'Thông báo'}
                </p>
                <p className="text-xs text-slate-400">{selectionMode ? 'Chọn thông báo cần xóa' : `${unreadCount} chưa đọc`}</p>
              </div>
              {selectionMode ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-300"
                    disabled={notifications.length === 0}
                  >
                    {allVisibleSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:text-slate-300"
                    disabled={selectedIds.size === 0}
                  >
                    Xóa
                  </button>
                  <button type="button" onClick={closeSelectionMode} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                    Hủy
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-300"
                    disabled={unreadCount === 0}
                  >
                    Đã đọc
                  </button>
                  {notifications.length > 0 && (
                    <button type="button" onClick={() => setSelectionMode(true)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                      Chọn
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto py-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
                  <p className="mt-2 text-sm font-medium text-slate-500">Chưa có thông báo</p>
                </div>
              ) : notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${notification.read ? 'bg-white' : 'bg-indigo-50/60'}`}
                  role="menuitem"
                >
                  {selectionMode && (
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[14px] ${
                        selectedIds.has(notification.id) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">check</span>
                    </span>
                  )}
                  <span className={`material-symbols-outlined mt-0.5 text-[20px] ${notification.read ? 'text-slate-400' : 'text-indigo-600'}`}>
                    {iconFor(notification.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{notification.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-500">{notification.message}</span>
                    <span className="mt-1 block text-[11px] font-medium text-slate-400">{timeLabel(notification.createdAt)}</span>
                  </span>
                  {!notification.read && <span className="mt-1 h-2 w-2 rounded-full bg-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {popup && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => openNotification(popup)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openNotification(popup);
            }
          }}
          className={`fixed right-6 z-[90] ${floating ? 'bottom-24' : 'bottom-6'} w-[min(23rem,calc(100vw-2rem))] rounded-lg border border-indigo-100 bg-white p-4 text-left shadow-2xl transition-transform hover:-translate-y-0.5`}
        >
          <div className="flex gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[22px] text-indigo-600">{iconFor(popup.type)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{popup.title}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">{popup.message}</p>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                setPopup(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  setPopup(null);
                }
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
