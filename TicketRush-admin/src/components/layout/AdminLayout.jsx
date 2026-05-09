// src/components/layout/AdminLayout.jsx
import { useRouter } from '../../contexts/RouterContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

const menuItems = [
  { icon: 'dashboard', label: 'Dashboard', to: '/admin/dashboard' },
  { icon: 'event', label: 'Sự kiện', to: '/admin/events' },
  { icon: 'receipt_long', label: 'Đơn hàng', to: '/admin/orders' },
];

export default function AdminLayout({ children }) {
  const { navigate, path } = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="bg-slate-950 text-slate-400 w-64 flex-shrink-0 flex flex-col py-6 border-r border-slate-800">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-2xl" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
            <span className="text-white font-bold text-lg tracking-tighter">TicketRush</span>
          </div>
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1 block">Admin Panel</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map(item => {
            const active = path === item.to || path.startsWith(item.to + '/');
            return (
              <button key={item.to} onClick={() => navigate(item.to)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-2 px-2 truncate">{user?.email}</div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
