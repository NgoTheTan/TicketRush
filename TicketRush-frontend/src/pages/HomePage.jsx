// src/pages/HomePage.jsx - with autocomplete + debounce
import { useState, useEffect, useRef } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Spinner, EmptyState, ErrorState, Badge, formatCurrency, eventStatusLabel, eventStatusVariant, formatDate } from '../components/ui/index.jsx';

function EventCard({ event, onClick }) {
  return (
    <div onClick={onClick} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
              <span className="material-symbols-outlined text-6xl text-indigo-300">event</span>
            </div>}
        <div className="absolute top-3 left-3"><Badge label={eventStatusLabel(event.status)} variant={eventStatusVariant(event.status)} /></div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-slate-900 text-base leading-snug mb-2 line-clamp-2">{event.name}</h3>
        <div className="flex items-center gap-1 text-sm text-slate-500 mb-1">
          <span className="material-symbols-outlined text-[15px]">calendar_today</span>
          <span>{formatDate(event.eventDate)}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <span className="material-symbols-outlined text-[15px]">location_on</span>
          <span className="truncate">{event.venue}</span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400">Từ</p>
            <p className="text-indigo-600 font-bold text-sm">{formatCurrency(event.priceFrom)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Còn lại</p>
            <p className="text-sm font-semibold text-slate-700">{event.availableSeats ?? '—'} ghế</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { navigate } = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);
  const debounceTimer = useRef(null);

  const load = async (s, p) => {
    setLoading(true); setError(null);
    try {
      const { data, meta: m } = await eventService.list({ search: s || undefined, page: p, size: 12 });
      setEvents(data || []); setMeta(m);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // Debounced suggest handler
  const handleSearchInput = (value) => {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await eventService.suggest(value.trim());
        setSuggestions(result);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Suggest error:', err);
        setSuggestions([]);
      }
    }, 300); // 300ms debounce
  };

  const handleSelectSuggestion = (eventName) => {
    setSearchInput(eventName);
    setSuggestions([]);
    setShowSuggestions(false);
    setPage(0);
    setSearch(eventName);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  useEffect(() => { load(search, page); }, [search, page]);

  return (
    <div className="min-h-screen bg-[#fcf8ff] font-[Inter]">
      <Header />
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-screen-xl mx-auto px-6 py-20">
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight mb-4 leading-tight">Khám phá sự kiện<br className="hidden lg:block" /> đỉnh cao</h1>
          <p className="text-lg text-indigo-200 mb-10 max-w-xl">Đặt vé dễ dàng cho các sự kiện âm nhạc, hội thảo và giải trí hàng đầu.</p>
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl relative">
            <div className="flex-1 flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-indigo-300">search</span>
              <input 
                value={searchInput} 
                onChange={e => handleSearchInput(e.target.value)} 
                onFocus={() => showSuggestions && setSuggestions(suggestions.length > 0 ? suggestions : [])}
                placeholder="Tìm kiếm sự kiện..."
                className="flex-1 bg-transparent text-white placeholder-indigo-300 outline-none text-sm" />
            </div>
            <button type="submit" className="bg-white text-indigo-700 font-bold px-6 rounded-xl hover:bg-indigo-50 transition-colors text-sm">Tìm kiếm</button>
            
            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 max-w-2xl">
                <div className="max-h-80 overflow-y-auto">
                  {suggestions.map((sugg) => (
                    <button
                      key={sugg.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(sugg.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                    >
                      <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                        {sugg.imageUrl ? (
                          <img src={sugg.imageUrl} alt={sugg.name} className="w-full h-full object-cover" />
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
        </div>
      </div>
      {/* Events */}
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{search ? `Kết quả cho "${search}"` : 'Sự kiện đang mở bán'}</h2>
            {meta && <p className="text-sm text-slate-500 mt-1">{meta.totalElements} sự kiện</p>}
          </div>
          {search && <button onClick={() => { setSearch(''); setSearchInput(''); setPage(0); }} className="text-sm text-indigo-600 font-medium">Xóa bộ lọc</button>}
        </div>
        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}
        {error && !loading && <ErrorState message={error} onRetry={() => load(search, page)} />}
        {!loading && !error && events.length === 0 && (
          <EmptyState icon="🎭" title="Không có sự kiện nào"
            description={search ? `Không tìm thấy sự kiện cho "${search}"` : 'Chưa có sự kiện nào. Hãy quay lại sau!'}
            action={search && <button onClick={() => { setSearch(''); setSearchInput(''); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Xem tất cả</button>} />
        )}
        {!loading && events.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map(e => <EventCard key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />)}
            </div>
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button disabled={!meta.hasPrevious} onClick={() => setPage(p => p-1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">← Trước</button>
                <span className="px-4 py-2 text-sm text-slate-500">Trang {meta.page+1} / {meta.totalPages}</span>
                <button disabled={!meta.hasNext} onClick={() => setPage(p => p+1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">Tiếp →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
