import { useRouter } from '../../contexts/RouterContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDashboardState } from '../../contexts/DashboardStateContext.jsx';

const menuItems = [
  { icon: 'dashboard', label: 'Dashboard', to: '/admin/dashboard' },
  { icon: 'event', label: 'Sự kiện', to: '/admin/events' },
  { icon: 'receipt_long', label: 'Đơn hàng', to: '/admin/orders' },
];

export default function AdminLayout({ children }) {
  const { navigate, path } = useRouter();
  const { user, logout } = useAuth();
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useDashboardState();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`bg-sky-50 text-slate-600 flex-shrink-0 flex flex-col py-6 border-r border-sky-200 shadow-sm
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[80px]' : 'w-64'}`}
      >
        {/* Header with stable hamburger */}
        <div className="flex items-center h-10 mb-8 overflow-hidden">
          <div className="w-[80px] flex-shrink-0 flex justify-center">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors"
              title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
          </div>

          <div className={`flex flex-col min-w-0 flex-1 ml-1 transition-all duration-300 ${collapsed ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'}`}>
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-sky-600 text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                confirmation_number
              </span>
              <span className="text-sky-700 font-bold text-base tracking-tighter whitespace-nowrap">TicketRush</span>
            </div>
            <span className="text-[10px] text-sky-400 font-medium uppercase tracking-wider whitespace-nowrap">Admin Panel</span>
          </div>
        </div>

        {/* Nav with stable icons */}
        <nav className={`flex-1 space-y-2 transition-all duration-300 ${collapsed ? 'px-1.5' : 'px-3'}`}>
          {menuItems.map(item => {
            const active = path === item.to || path.startsWith(item.to + '/');
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`w-full group relative flex transition-all duration-300 overflow-hidden rounded-xl
                  ${collapsed ? 'h-[72px] flex-col justify-center items-center' : 'h-12 flex-row items-center'}
                  ${active
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-sky-700 hover:bg-sky-100'
                  }`}
              >
                {/* Icon Anchor - Fixed width part to keep icon stable */}
                <div className={`flex-shrink-0 flex items-center justify-center transition-all duration-300 ${collapsed ? 'w-full h-8' : 'w-[80px] h-full'}`}>
                  <span className={`material-symbols-outlined transition-all duration-300 ${collapsed ? 'text-[24px]' : 'text-[22px]'}`}>
                    {item.icon}
                  </span>
                </div>

                {/* Text part */}
                <span className={`font-medium transition-all duration-300 whitespace-nowrap
                  ${collapsed 
                    ? 'text-[10px] w-full text-center px-1 opacity-100 mt-0.5' 
                    : 'text-[15px] flex-1 text-left opacity-100'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom part with stable logout icon */}
        <div className={`pt-4 border-t border-sky-200 transition-all duration-300 ${collapsed ? 'px-1.5' : 'px-3'}`}>
          {!collapsed && (
            <div className="text-xs text-sky-400 mb-2 px-3 truncate transition-all duration-300">
              {user?.email}
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex transition-all duration-300 overflow-hidden rounded-xl
              ${collapsed ? 'h-[72px] flex-col justify-center items-center' : 'h-12 flex-row items-center'}
              text-slate-500 hover:text-sky-700 hover:bg-sky-100`}
          >
            <div className={`flex-shrink-0 flex items-center justify-center transition-all duration-300 ${collapsed ? 'w-full h-8' : 'w-[80px] h-full'}`}>
              <span className={`material-symbols-outlined transition-all duration-300 ${collapsed ? 'text-[22px]' : 'text-[20px]'}`}>
                logout
              </span>
            </div>
            <span className={`font-medium transition-all duration-300 whitespace-nowrap
              ${collapsed ? 'text-[10px] w-full text-center leading-tight' : 'text-[15px] flex-1 text-left'}`}>
              Đăng xuất
            </span>
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
