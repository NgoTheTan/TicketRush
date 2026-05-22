import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';
import eventService from '../../api/eventService.js';
import Footer from './Footer.jsx';
import NotificationCenter from '../notifications/NotificationCenter.jsx';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

function TicketMark({ className = 'w-7 h-7 text-indigo-600 shrink-0' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
    >
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

export default function CustomerLayout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { navigate, path, params } = useRouter();
  const routeSearch = path === '/' ? params?.search || '' : '';
  const [searchInput, setSearchInput] = useState(routeSearch);
  const [eventOptions, setEventOptions] = useState([]);
  const [eventOptionsLoaded, setEventOptionsLoaded] = useState(false);
  const [eventOptionsLoading, setEventOptionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    setSearchInput(routeSearch);
  }, [routeSearch]);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (!accountMenuRef.current?.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleLogout = async () => {
    setShowAccountMenu(false);
    await logout();
    navigate('/');
  };

  const handleProfileClick = () => {
    setShowAccountMenu(false);
    navigate('/profile');
  };

  const loadEventOptions = async () => {
    if (eventOptionsLoaded || eventOptionsLoading) {
      return;
    }
    setEventOptionsLoading(true);
    try {
      const { data } = await eventService.list({ page: 0, size: 50 });
      setEventOptions(data || []);
      setEventOptionsLoaded(true);
    } catch (err) {
      console.error('Load event options error:', err);
      setEventOptions([]);
    } finally {
      setEventOptionsLoading(false);
    }
  };

  const openSearchSuggestions = () => {
    setShowSuggestions(true);
    loadEventOptions();
  };

  const handleSearchInput = (value) => {
    setSearchInput(value);
    setShowSuggestions(true);
    loadEventOptions();
  };

  const runSearch = (value) => {
    const keyword = value.trim();
    setShowSuggestions(false);
    if (keyword) {
      navigate('/', { search: keyword });
    } else {
      navigate('/');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch(searchInput);
  };

  const handleSelectSuggestion = (event) => {
    setSearchInput(event.name);
    setShowSuggestions(false);
    navigate(`/events/${event.id}`);
  };

  const avatarUrl = user?.profile?.avatarUrl || user?.avatarUrl;
  const avatarInitial = (user?.fullName || user?.email || 'U').trim()[0]?.toUpperCase() || 'U';
  const filteredEvents = eventOptions.filter((event) =>
    event.name?.toLowerCase().includes(searchInput.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fcf8ff] font-[Inter]">
      <header className="sticky top-0 h-20 bg-white border-b border-slate-100 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] z-40">
        <div className="flex h-full w-full items-center gap-2 md:gap-4 px-4 md:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex shrink-0 cursor-pointer items-center gap-0.5 text-2xl font-black tracking-tighter text-indigo-600"
            aria-label="Về trang chủ"
          >
            <TicketMark />
            <span className="hidden sm:inline"><RushText className="text-indigo-600" /></span>
          </button>

          <form
            onSubmit={handleSubmit}
            className="flex-1 sm:max-w-md md:max-w-2xl relative mx-2 sm:mx-auto"
          >
            <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 sm:px-4 sm:py-2.5 focus-within:border-indigo-300 focus-within:bg-white transition-colors w-full">
              <span className="material-symbols-outlined text-slate-400 text-[18px] sm:text-[20px]">search</span>
              <input
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={openSearchSuggestions}
                onClick={openSearchSuggestions}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Tìm kiếm..."
                className="flex-1 bg-transparent outline-none text-xs sm:text-sm text-slate-700 placeholder-slate-400 min-w-0"
              />
              <button type="submit" className="cursor-pointer text-[10px] sm:text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                Tìm
              </button>
            </div>

            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="max-h-[340px] overflow-y-auto py-1">
                  {eventOptionsLoading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-slate-500">
                      <span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      Đang tải sự kiện...
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Không tìm thấy sự kiện nào</p>
                  ) : (
                    filteredEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSuggestion(event)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                    >
                      <div className="w-11 h-11 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                        {event.imageUrl ? (
                          <img src={toFullUrl(event.imageUrl)} alt={event.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                            <span className="material-symbols-outlined text-indigo-400 text-xl">event</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{event.name}</p>
                        <p className="text-xs text-slate-500 truncate">{event.venue}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-[18px] flex-shrink-0">arrow_forward</span>
                    </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </form>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/my-tickets')}
                  className={`flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors
                    ${path === '/my-tickets' || path.startsWith('/tickets/')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  title="Vé của tôi"
                >
                  <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                  <span className="hidden sm:inline">Vé của tôi</span>
                </button>

                <NotificationCenter />

                <div ref={accountMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAccountMenu((value) => !value)}
                    className="w-10 h-10 cursor-pointer rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-sm font-bold text-indigo-600 border border-indigo-100 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={showAccountMenu}
                    aria-label="Tài khoản"
                  >
                    {avatarUrl ? (
                      <img src={toFullUrl(avatarUrl)} alt={user?.fullName || 'Avatar'} className="w-full h-full object-cover" />
                    ) : (
                      avatarInitial
                    )}
                  </button>

                  {showAccountMenu && (
                    <div className="absolute right-0 top-full mt-3 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50" role="menu">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
                          navigate('/my-tickets');
                        }}
                        className="sm:hidden w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">confirmation_number</span>
                        Vé của tôi
                      </button>
                      <button
                        type="button"
                        onClick={handleProfileClick}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">account_circle</span>
                        Thông tin của tôi
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-5rem)] bg-[#fcf8ff]">
        {children}
      </main>

      {path === '/' && <Footer />}
    </div>
  );
}
