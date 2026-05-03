// src/components/layout/Header.jsx
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';

export default function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { navigate, path } = useRouter();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = isAdmin
    ? [
        { label: 'Dashboard', to: '/admin/dashboard' },
        { label: 'Sự kiện', to: '/admin/events' },
        { label: 'Đơn hàng', to: '/admin/orders' },
      ]
    : [
        { label: 'Trang chủ', to: '/' },
        ...(isAuthenticated ? [{ label: 'Vé của tôi', to: '/my-tickets' }] : []),
      ];

  return (
    <header className="bg-white border-b border-slate-100 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 lg:px-12 h-20 w-full max-w-screen-2xl mx-auto">
        <button onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/')}
          className="flex items-center gap-2 text-2xl font-black tracking-tighter text-indigo-600">
          <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
          TicketRush
        </button>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <button key={link.to} onClick={() => navigate(link.to)}
              className={`text-sm font-medium transition-colors ${path === link.to ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden md:block text-sm text-slate-600 max-w-[120px] truncate">{user?.fullName}</span>
              {isAdmin && <span className="hidden md:block px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">Admin</span>}
              <button onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Đăng nhập
              </button>
              <button onClick={() => navigate('/register')}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                Đăng ký
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
