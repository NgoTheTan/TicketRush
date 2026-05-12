// src/components/layout/Header.jsx
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';

function TicketMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-6 h-6 text-indigo-600 shrink-0"
      fill="currentColor"
    >
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v1.18a2.75 2.75 0 0 0 0 4.64v1.18A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-1.18a2.75 2.75 0 0 0 0-4.64V6.5Zm2 0v.93c.98.66 1.62 1.77 1.62 3.07s-.64 2.41-1.62 3.07v3.93h11V13.5c-.98-.66-1.62-1.77-1.62-3.07s.64-2.41 1.62-3.07V6.5h-11Zm4.25 4.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { navigate, path } = useRouter();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Trang chủ', to: '/' },
    ...(isAuthenticated ? [{ label: 'Vé của tôi', to: '/my-tickets' }] : []),
  ];

  return (
    <header className="bg-white border-b border-slate-100 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 lg:px-12 h-20 w-full max-w-screen-2xl mx-auto">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-2xl font-black tracking-tighter text-indigo-600">
          <TicketMark />
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
              <button onClick={() => navigate('/profile')}
                className="hidden md:block text-sm text-slate-600 max-w-[120px] truncate hover:text-indigo-600 transition-colors">
                {user?.fullName}
              </button>

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
