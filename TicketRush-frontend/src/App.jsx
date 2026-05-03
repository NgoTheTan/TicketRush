// src/App.jsx — Main app with hash router and auth guards
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { BookingProvider } from './contexts/BookingContext.jsx';
import { RouterProvider, useRouter, matchRoute } from './contexts/RouterContext.jsx';
import { ToastContainer } from './components/ui/index.jsx';

// Pages
import SignInPage from './pages/SignInPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import HomePage from './pages/HomePage.jsx';
import EventDetailsPage from './pages/EventDetailsPage.jsx';
import SeatSelectionPage from './pages/SeatSelectionPage.jsx';
import OrderConfirmationPage from './pages/OrderConfirmationPage.jsx';
import BookingSuccessPage from './pages/BookingSuccessPage.jsx';
import MyTicketsPage from './pages/MyTicketsPage.jsx';
import TicketDetailsPage from './pages/TicketDetailsPage.jsx';
import VirtualWaitingRoomPage from './pages/VirtualWaitingRoomPage.jsx';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import EventManagementPage from './pages/admin/EventManagementPage.jsx';
import CreateEventPage from './pages/admin/CreateEventPage.jsx';
import SeatLayoutConfigPage from './pages/admin/SeatLayoutConfigPage.jsx';
import OrderManagementPage from './pages/admin/OrderManagementPage.jsx';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const { path, navigate } = useRouter();
  if (!isAuthenticated) {
    navigate('/login', { returnUrl: path });
    return null;
  }
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  if (!isAuthenticated) { navigate('/login'); return null; }
  if (!isAdmin) { navigate('/'); return null; }
  return children;
}

function Router() {
  const { path } = useRouter();

  // Static routes
  if (path === '/' || path === '') return <HomePage />;
  if (path === '/login') return <SignInPage />;
  if (path === '/register') return <SignUpPage />;
  if (path === '/booking-success') return <RequireAuth><BookingSuccessPage /></RequireAuth>;
  if (path === '/my-tickets') return <RequireAuth><MyTicketsPage /></RequireAuth>;

  // Admin routes
  if (path === '/admin/dashboard') return <RequireAdmin><AdminDashboardPage /></RequireAdmin>;
  if (path === '/admin/events') return <RequireAdmin><EventManagementPage /></RequireAdmin>;
  if (path === '/admin/events/new') return <RequireAdmin><CreateEventPage /></RequireAdmin>;
  if (path === '/admin/orders') return <RequireAdmin><OrderManagementPage /></RequireAdmin>;

  // Dynamic routes
  let m;

  m = matchRoute('/events/:id', path);
  if (m) return <EventDetailsPage eventId={m.id} />;

  m = matchRoute('/events/:id/seats', path);
  if (m) return <RequireAuth><SeatSelectionPage eventId={m.id} /></RequireAuth>;

  m = matchRoute('/events/:id/checkout', path);
  if (m) return <RequireAuth><OrderConfirmationPage eventId={m.id} /></RequireAuth>;

  m = matchRoute('/events/:id/waiting', path);
  if (m) return <RequireAuth><VirtualWaitingRoomPage eventId={m.id} /></RequireAuth>;

  m = matchRoute('/tickets/:id', path);
  if (m) return <RequireAuth><TicketDetailsPage ticketId={m.id} /></RequireAuth>;

  m = matchRoute('/admin/events/:id/seats', path);
  if (m) return <RequireAdmin><SeatLayoutConfigPage eventId={m.id} /></RequireAdmin>;

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
        <BookingProvider>
          <Router />
          <ToastContainer />
        </BookingProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
