// src/components/layout/Header.jsx
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';

function TicketMark({ className = 'w-7 h-7 text-indigo-600 shrink-0' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M2.25 7.25h5M1.5 12h4.75M3 16.75h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.38" />
      <g transform="rotate(-11 14 12)">
        <path
          d="M7 6.3h10.7c.95 0 1.7.75 1.7 1.7v1.45a2.85 2.85 0 0 0 0 5.1V16c0 .95-.75 1.7-1.7 1.7H7c-.95 0-1.7-.75-1.7-1.7v-1.45a2.85 2.85 0 0 0 0-5.1V8c0-.95.75-1.7 1.7-1.7Z"
          fill="currentColor"
        />
        <path d="M10.2 8.55v6.9" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1 2" opacity="0.9" />
        <path d="M12.7 10h3.4M12.7 13.2h2.6" stroke="white" strokeWidth="1.25" strokeLinecap="round" opacity="0.95" />
      </g>
    </svg>
  );
}

function RushText({ className }) {
  return (
    <span className={`relative inline-block -skew-x-6 italic ${className}`}>
      TicketRush
      <span aria-hidden="true" className="absolute -right-3 top-1 h-0.5 w-2.5 rounded-full bg-current opacity-30" />
      <span aria-hidden="true" className="absolute -right-2 bottom-1.5 h-0.5 w-2 rounded-full bg-current opacity-20" />
    </span>
  );
}

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
          className="flex items-center gap-0.5 text-2xl font-black tracking-tighter text-indigo-600">
          <TicketMark />
          <RushText className="text-indigo-600" />
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
