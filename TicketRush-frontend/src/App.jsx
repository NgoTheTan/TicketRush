// src/App.jsx — Main app with hash router and auth guards
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { BookingProvider } from './contexts/BookingContext.jsx';
import { RouterProvider, useRouter, matchRoute } from './contexts/RouterContext.jsx';
import { ToastContainer } from './components/ui/index.jsx';
import CustomerLayout from './components/layout/CustomerLayout.jsx';

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

function Router() {
  const { path } = useRouter();
  const customer = (page) => <CustomerLayout>{page}</CustomerLayout>;
  const authModal = (modal) => customer(
    <>
      <HomePage />
      {modal}
    </>
  );

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
  if (m) return customer(<EventDetailsPage eventId={m.id} />);

  m = matchRoute('/events/:id/seats', path);
  if (m) return <RequireAuth>{customer(<SeatSelectionPage eventId={m.id} />)}</RequireAuth>;

  m = matchRoute('/events/:id/checkout', path);
  if (m) return <RequireAuth>{customer(<OrderConfirmationPage eventId={m.id} />)}</RequireAuth>;

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
        <BookingProvider>
          <Router />
          <ToastContainer />
        </BookingProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
