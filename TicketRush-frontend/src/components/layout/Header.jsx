// src/components/layout/Header.jsx
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';
import eventService from '../../api/eventService.js';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

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
  const { navigate, path, params } = useRouter();
  const routeSearch = path === '/' ? params?.search || '' : '';
  const [searchInput, setSearchInput] = useState(routeSearch);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const debounceTimer = useRef(null);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

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
    navigate('/logout');
  };

  const handleProfileClick = () => {
    setShowAccountMenu(false);
    navigate('/profile');
  };

  const handleSearchInput = (value) => {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await eventService.suggest(value.trim());
        setSuggestions(result);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Suggest error:', err);
        setSuggestions([]);
      }
    }, 300);
  };

  const runSearch = (value) => {
    const keyword = value.trim();
    setSuggestions([]);
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

  const handleSelectSuggestion = (eventName) => {
    setSearchInput(eventName);
    runSearch(eventName);
  };

  const navLinks = [
    { label: 'Trang chủ', to: '/' },
    ...(isAuthenticated ? [{ label: 'Vé của tôi', to: '/my-tickets' }] : []),
  ];

  const avatarUrl = user?.profile?.avatarUrl || user?.avatarUrl;
  const avatarInitial = (user?.fullName || user?.email || 'U').trim()[0]?.toUpperCase() || 'U';

  return (
    <header className="bg-white border-b border-sky-100 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sticky top-0 z-50">
      <div className="flex items-center gap-2 lg:gap-6 px-4 lg:px-12 h-16 lg:h-20 w-full max-w-screen-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-2xl font-black tracking-tighter text-indigo-600 shrink-0"
        >
          <TicketMark />
          <span className="hidden sm:inline">TicketRush</span>
        </button>

        <nav className="flex items-center gap-1 shrink-0">
          {navLinks.map((link) => {
            const isActive = path === link.to;
            const isTicket = link.to === '/my-tickets';
            return (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                title={link.label}
                className={`inline-flex items-center gap-2 rounded-full font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                } ${
                  isTicket
                    ? 'px-2.5 py-2 sm:px-4 sm:py-2 text-sm'
                    : 'px-4 py-2 text-sm'
                }`}
              >
                {isTicket && (
                  <span className="material-symbols-outlined text-[18px] leading-none">confirmation_number</span>
                )}
                <span className={isTicket ? 'hidden sm:inline' : ''}>{link.label}</span>
                {!isTicket && <span className="hidden sm:inline">»</span>}
              </button>
            );
          })}
        </nav>

        {/* Search — full bar on lg+, icon-only button on smaller screens */}
        <form onSubmit={handleSubmit} className="w-auto lg:flex-1 lg:max-w-xl ml-auto relative flex items-center justify-end">
          {/* Full search bar (lg+) */}
          <div className="hidden lg:flex w-full items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-indigo-300 focus-within:bg-white transition-colors">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            <input
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => searchInput.trim() && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Tìm kiếm sự kiện..."
              className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 min-w-0"
            />
            <button type="submit" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors shrink-0">
              Tìm
            </button>
          </div>

          {/* Icon-only search button (< lg) */}
          <button
            type="submit"
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            aria-label="Tìm kiếm"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="max-h-80 overflow-y-auto">
                {suggestions.map((sugg) => (
                  <button
                    key={sugg.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(sugg.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                  >
                    <div className="w-11 h-11 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                      {sugg.imageUrl ? (
                        <img src={toFullUrl(sugg.imageUrl)} alt={sugg.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                          <span className="material-symbols-outlined text-indigo-400 text-xl">event</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{sugg.name}</p>
                      <p className="text-xs text-slate-500 truncate">{sugg.venue}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[18px] flex-shrink-0">arrow_forward</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {isAuthenticated ? (
            <div ref={accountMenuRef} className="relative flex items-center gap-2">
              <span className="hidden md:block text-sm font-bold text-slate-800 max-w-[120px] truncate">
                {user?.fullName}
              </span>
              <button
                type="button"
                onClick={() => setShowAccountMenu((v) => !v)}
                className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-sm font-bold text-indigo-600 border border-indigo-100 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                aria-haspopup="menu"
                aria-expanded={showAccountMenu}
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
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Đăng nhập
              </button>
              <button
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
  );
}
