import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { RouterProvider, useRouter, matchRoute } from './contexts/RouterContext.jsx';
import { DashboardStateProvider } from './contexts/DashboardStateContext.jsx';
import { CreateEventDraftProvider } from './contexts/CreateEventDraftContext.jsx';
import { ToastContainer } from './components/ui/index.jsx';

// Pages
import SignInPage from './pages/SignInPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import EventManagementPage from './pages/EventManagementPage.jsx';
import CreateEventPage from './pages/CreateEventPage.jsx';
import EditEventPage from './pages/EditEventPage.jsx';
import SeatLayoutConfigPage from './pages/SeatLayoutConfigPage.jsx';
import EventSeatViewPage from './pages/EventSeatViewPage.jsx';
import OrderManagementPage from './pages/OrderManagementPage.jsx';

function RequireAdmin({ children }) {
  const { isAdmin, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isAdmin) {
      // Nếu login rồi mà không phải admin, ép quay lại trang login báo lỗi
      navigate('/login');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  if (!isAuthenticated || !isAdmin) return null;
  return children;
}

function Router() {
  const { path } = useRouter();

  // Redirect root to dashboard
  if (path === '/' || path === '') return <RequireAdmin><AdminDashboardPage /></RequireAdmin>;
  if (path === '/login') return <SignInPage />;

  // Admin routes
  if (path === '/admin/dashboard') return <RequireAdmin><AdminDashboardPage /></RequireAdmin>;
  if (path === '/admin/events') return <RequireAdmin><EventManagementPage /></RequireAdmin>;
  if (path === '/admin/events/new') return <RequireAdmin><CreateEventPage /></RequireAdmin>;
  if (path === '/admin/events/new/seats') return <RequireAdmin><SeatLayoutConfigPage createMode /></RequireAdmin>;
  if (path === '/admin/orders') return <RequireAdmin><OrderManagementPage /></RequireAdmin>;

  // Dynamic routes
  let m;
  m = matchRoute('/admin/events/:id/edit', path);
  if (m) return <RequireAdmin><EditEventPage eventId={m.id} /></RequireAdmin>;

  m = matchRoute('/admin/events/:id/seats', path);
  if (m) return <RequireAdmin><SeatLayoutConfigPage eventId={m.id} /></RequireAdmin>;

  m = matchRoute('/admin/events/:id/view', path);
  if (m) return <RequireAdmin><EventSeatViewPage eventId={m.id} /></RequireAdmin>;

  // 404
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf8ff] font-[Inter]">
      <span className="text-7xl mb-4">🎭</span>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Trang không tồn tại</h1>
      <a href="#/" className="text-indigo-600 font-medium hover:text-indigo-700">← Về Dashboard</a>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <DashboardStateProvider>
          <CreateEventDraftProvider>
            <Router />
            <ToastContainer />
          </CreateEventDraftProvider>
        </DashboardStateProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
