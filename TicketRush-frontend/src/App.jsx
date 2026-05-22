// src/App.jsx — Main app with hash router and auth guards
import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { BookingProvider } from './contexts/BookingContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import { RouterProvider, useRouter, matchRoute } from './contexts/RouterContext.jsx';
import { ToastContainer } from './components/ui/index.jsx';
import EventCancelledModal from './components/ui/EventCancelledModal.jsx';
import CustomerLayout from './components/layout/CustomerLayout.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';
import eventService from './api/eventService.js';

// Pages
import SignInPage from './pages/SignInPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import HomePage from './pages/HomePage.jsx';
import EventDetailsPage from './pages/EventDetailsPage.jsx';
import SeatSelectionPage from './pages/SeatSelectionPage.jsx';
import OrderConfirmationPage from './pages/OrderConfirmationPage.jsx';
import BookingSuccessPage from './pages/BookingSuccessPage.jsx';
import MyTicketsPage from './pages/MyTicketsPage.jsx';
import TicketDetailsPage from './pages/TicketDetailsPage.jsx';
import SystemQueuePage from './pages/SystemQueuePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LogoutSplashPage from './pages/LogoutSplashPage.jsx';


function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const { path, navigate } = useRouter();
  if (!isAuthenticated) {
    navigate('/login', { returnUrl: path });
    return null;
  }
  return children;
}

// ── Event Cancellation Watcher ─────────────────────────────────────────────
// Theo dõi trạng thái sự kiện hiện tại người dùng đang xem.
// Khi admin huỷ sự kiện, hiện popup chặn tương tác.
function EventCancellationWatcher({ eventId, eventName, onCancelled }) {
  const fetchedRef = useRef(false);

  const handleWsMessage = useCallback((msg) => {
    if (msg?.type !== 'EVENT_LIST_UPDATED') return;
    // Nhận thông báo cập nhật → kiểm tra trạng thái sự kiện hiện tại
    eventService.get(eventId)
      .then(data => {
        if (data?.status === 'CANCELLED') {
          onCancelled(data?.name || eventName);
        }
      })
      .catch(() => {/* ignore */});
  }, [eventId, eventName, onCancelled]);

  useWebSocket('/topic/events', handleWsMessage, !!eventId);

  // Cũng kiểm tra ngay khi mount (phòng trường hợp sự kiện đã bị huỷ từ trước)
  useEffect(() => {
    if (!eventId || fetchedRef.current) return;
    fetchedRef.current = true;
    eventService.get(eventId)
      .then(data => {
        if (data?.status === 'CANCELLED') {
          onCancelled(data?.name || eventName);
        }
      })
      .catch(() => {});
  }, [eventId, eventName, onCancelled]);

  return null;
}

// Trích eventId từ path (chạy đồng bộ, không cần effect)
function getEventIdFromPath(p) {
  const m1 = matchRoute('/events/:id', p);
  const m2 = matchRoute('/events/:id/seats', p);
  const m3 = matchRoute('/events/:id/checkout', p);
  if (m1) return m1.id;
  if (m2) return m2.id;
  if (m3) return m3.id;
  return null;
}

function Router() {
  const { path } = useRouter();
  const [cancelledEventName, setCancelledEventName] = useState(null);

  const currentEventId = getEventIdFromPath(path);

  // Reset popup khi chuyển sang sự kiện khác hoặc rời khỏi trang sự kiện
  useEffect(() => {
    setCancelledEventName(null);
  }, [currentEventId]);

  const customer = (page) => <CustomerLayout>{page}</CustomerLayout>;
  const authModal = (modal) => customer(
    <>
      <HomePage />
      {modal}
    </>
  );

  const handleCancelled = useCallback((name) => {
    setCancelledEventName(name || 'Sự kiện này');
  }, []);

  // Static routes
  if (path === '/' || path === '') return customer(<HomePage />);
  if (path === '/login') return authModal(<SignInPage modal />);
  if (path === '/forgot-password') return authModal(<ForgotPasswordPage modal />);
  if (path === '/system-queue') return <RequireAuth><SystemQueuePage /></RequireAuth>;
  if (path === '/register') return authModal(<SignUpPage modal />);
  if (path === '/booking-success') return <RequireAuth>{customer(<BookingSuccessPage />)}</RequireAuth>;
  if (path === '/my-tickets') return <RequireAuth>{customer(<MyTicketsPage />)}</RequireAuth>;
  if (path === '/profile') return <RequireAuth>{customer(<ProfilePage />)}</RequireAuth>;
  if (path === '/logout') return <LogoutSplashPage />;

  // Dynamic routes
  let m;

  m = matchRoute('/events/:id', path);
  if (m) return (
    <>
      {customer(<EventDetailsPage eventId={m.id} />)}
      <EventCancellationWatcher eventId={m.id} onCancelled={handleCancelled} />
      {cancelledEventName && <EventCancelledModal eventName={cancelledEventName} />}
    </>
  );

  m = matchRoute('/events/:id/seats', path);
  if (m) return (
    <>
      <RequireAuth>{customer(<SeatSelectionPage eventId={m.id} />)}</RequireAuth>
      <EventCancellationWatcher eventId={m.id} onCancelled={handleCancelled} />
      {cancelledEventName && <EventCancelledModal eventName={cancelledEventName} />}
    </>
  );

  m = matchRoute('/events/:id/checkout', path);
  if (m) return (
    <>
      <RequireAuth>{customer(<OrderConfirmationPage eventId={m.id} />)}</RequireAuth>
      <EventCancellationWatcher eventId={m.id} onCancelled={handleCancelled} />
      {cancelledEventName && <EventCancelledModal eventName={cancelledEventName} />}
    </>
  );

  m = matchRoute('/tickets/:id', path);
  if (m) return <RequireAuth>{customer(<TicketDetailsPage ticketId={m.id} />)}</RequireAuth>;

  // 404
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf8ff] font-[Inter]">
      <span className="text-7xl mb-4">🎭</span>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Trang không tồn tại</h1>
      <a href="#/" className="text-indigo-600 font-medium hover:text-indigo-700">← Về trang chủ</a>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <NotificationProvider>
          <BookingProvider>
            <Router />
            <ToastContainer />
          </BookingProvider>
        </NotificationProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
