// src/pages/HomePage.jsx
import { useEffect, useState } from 'react';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Spinner, EmptyState, ErrorState, Badge, formatCurrency, eventStatusLabel, eventStatusVariant, formatDate } from '../components/ui/index.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

function EventCard({ event, onClick }) {
  return (
    <div onClick={onClick} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {event.imageUrl ? (
          <img src={toFullUrl(event.imageUrl)} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
            <span className="material-symbols-outlined text-6xl text-indigo-300">event</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge label={eventStatusLabel(event.status)} variant={eventStatusVariant(event.status)} />
        </div>
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
            <p className="text-sm font-semibold text-slate-700">{event.availableSeats ?? '-'} ghế</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { navigate, params } = useRouter();
  const initialSearch = params?.search || '';
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(initialSearch);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);

  const load = async (s, p) => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await eventService.list({ search: s || undefined, page: p, size: 12 });
      setEvents(data || []);
      setMeta(m);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useWebSocket('/topic/events', (msg) => {
    if (msg?.type === 'EVENT_LIST_UPDATED') {
      load(search, page);
    }
  });

  useEffect(() => {
    const routeSearch = params?.search || '';
    setSearch(routeSearch);
    setPage(0);
  }, [params?.search]);

  useEffect(() => {
    load(search, page);
  }, [search, page]);

  const clearSearch = () => {
    setSearch('');
    setPage(0);
    navigate('/');
  };

  return (
    <div className="font-[Inter]">
      <div className="max-w-screen-xl mx-auto px-6 pt-8">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-900 to-purple-900 text-white shadow-[0px_18px_45px_rgba(79,70,229,0.18)]">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200')] bg-cover bg-center opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/80 via-purple-900/65 to-purple-900/35" />
          <div className="relative px-6 md:px-10 lg:px-12 pt-14 pb-12">
            <h1 className="text-4xl lg:text-6xl font-black tracking-tight mb-4 leading-tight">
              Khám phá sự kiện đỉnh cao
            </h1>
            <p className="text-lg text-indigo-100 max-w-4xl">
              Đặt vé dễ dàng cho các sự kiện âm nhạc, hội thảo và giải trí hàng đầu.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-indigo-600">{search ? `Kết quả cho "${search}"` : 'Sự kiện đang mở bán'}</h2>
            {meta && <p className="text-sm text-slate-500 mt-1">{meta.totalElements} sự kiện</p>}
          </div>
          {search && <button onClick={clearSearch} className="text-sm text-indigo-600 font-medium">Xóa bộ lọc</button>}
        </div>

        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}
        {error && !loading && <ErrorState message={error} onRetry={() => load(search, page)} />}
        {!loading && !error && events.length === 0 && (
          <EmptyState
            icon="🎭"
            title="Không có sự kiện nào"
            description={search ? `Không tìm thấy sự kiện cho "${search}"` : 'Chưa có sự kiện nào. Hãy quay lại sau!'}
            action={search && <button onClick={clearSearch} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Xem tất cả</button>}
          />
        )}
        {!loading && events.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((e) => <EventCard key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />)}
            </div>
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button disabled={!meta.hasPrevious} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">← Trước</button>
                <span className="px-4 py-2 text-sm text-slate-500">Trang {meta.page + 1} / {meta.totalPages}</span>
                <button disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">Tiếp →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
