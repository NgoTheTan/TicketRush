// src/pages/HomePage.jsx
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Spinner, EmptyState, ErrorState, Badge, formatCurrency, eventStatusLabel, eventStatusVariant, formatDate } from '../components/ui/index.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tất cả thể loại' },
  { value: 'Ca nhạc', label: 'Ca nhạc' },
  { value: 'Sân khấu & Nghệ thuật', label: 'Sân khấu & Nghệ thuật' },
  { value: 'Thể thao', label: 'Thể thao' },
  { value: 'Hội thảo & Workshop', label: 'Hội thảo & Workshop' },
  { value: 'Tham quan & Trải nghiệm', label: 'Tham quan & Trải nghiệm' },
  { value: 'Khác', label: 'Khác' },
];

const CITY_OPTIONS = [
  { value: '', label: 'Tất cả thành phố' },
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'Thành phố Hồ Chí Minh', label: 'Thành phố Hồ Chí Minh' },
  { value: 'Vị trí khác', label: 'Vị trí khác' },
];

function EventCard({ event, onClick }) {
  const location = [event.venue, event.city].filter(Boolean).join(' • ');

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
        {event.category && (
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-2">{event.category}</p>
        )}
        <div className="flex items-center gap-1 text-sm text-slate-500 mb-1">
          <span className="material-symbols-outlined text-[15px]">calendar_today</span>
          <span>{formatDate(event.eventDate)}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <span className="material-symbols-outlined text-[15px]">location_on</span>
          <span className="truncate">{location || '-'}</span>
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

function FilterOptionGroup({ icon, title, value, options, onChange }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-indigo-500 text-[20px]">{icon}</span>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const checked = value === option.value;

          return (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => onChange(checked ? '' : option.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                checked
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-indigo-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">
                {checked ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span className="font-medium leading-snug">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { navigate, params } = useRouter();
  const initialSearch = params?.search || '';
  const initialCategory = params?.category || '';
  const initialCity = params?.city || '';
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [city, setCity] = useState(initialCity);
  const [filterOpen, setFilterOpen] = useState(false);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async (s, p, c, selectedCity) => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await eventService.list({
        search: s || undefined,
        category: c || undefined,
        city: selectedCity || undefined,
        page: p,
        size: 12,
      });
      setEvents(data || []);
      setMeta(m);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useWebSocket('/topic/events', (msg) => {
    if (msg?.type === 'EVENT_LIST_UPDATED') {
      load(search, page, category, city);
    }
  });

  useEffect(() => {
    setSearch(params?.search || '');
    setCategory(params?.category || '');
    setCity(params?.city || '');
    setPage(0);
  }, [params?.search, params?.category, params?.city]);

  useEffect(() => {
    load(search, page, category, city);
  }, [search, page, category, city, load]);

  const updateFilters = (next) => {
    const nextSearch = Object.prototype.hasOwnProperty.call(next, 'search') ? next.search : search;
    const nextCategory = Object.prototype.hasOwnProperty.call(next, 'category') ? next.category : category;
    const nextCity = Object.prototype.hasOwnProperty.call(next, 'city') ? next.city : city;

    setSearch(nextSearch);
    setCategory(nextCategory);
    setCity(nextCity);
    setPage(0);
    navigate('/', {
      search: nextSearch || undefined,
      category: nextCategory || undefined,
      city: nextCity || undefined,
    });
  };

  const clearFilters = () => {
    updateFilters({ search: '', category: '', city: '' });
  };

  const hasActiveFilters = Boolean(search || category || city);
  const activeFilterCount = [category, city].filter(Boolean).length;

  return (
    <div className="font-[Inter]">
      <div className="bg-white border-b border-slate-100">
        <nav className="max-w-screen-xl mx-auto px-6 py-3 overflow-x-auto" aria-label="Lọc theo thể loại">
          <div className="flex items-center gap-2 min-w-max">
            {CATEGORY_OPTIONS.filter((option) => option.value).map((option) => {
              const active = category === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFilters({ category: active ? '' : option.value })}
                  className={`px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

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
        <div className="flex flex-col gap-5 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-indigo-600">{search ? `Kết quả cho "${search}"` : 'Sự kiện đang mở bán'}</h2>
              {meta && <p className="text-sm text-slate-500 mt-1">{meta.totalElements} sự kiện</p>}
            </div>
            <div className="relative flex items-center gap-3 shrink-0">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-indigo-600 font-medium hover:text-indigo-700 whitespace-nowrap">
                  Xóa bộ lọc
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  filterOpen || activeFilterCount
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                aria-expanded={filterOpen}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] leading-5 text-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-full mt-3 w-[min(92vw,720px)] bg-white rounded-xl border border-slate-200 shadow-xl p-5 z-30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Lọc sự kiện</h3>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Đóng bộ lọc"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FilterOptionGroup
                      icon="location_on"
                      title="Thành phố"
                      value={city}
                      options={CITY_OPTIONS}
                      onChange={(value) => updateFilters({ city: value })}
                    />
                    <FilterOptionGroup
                      icon="category"
                      title="Thể loại"
                      value={category}
                      options={CATEGORY_OPTIONS}
                      onChange={(value) => updateFilters({ category: value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}
        {error && !loading && <ErrorState message={error} onRetry={() => load(search, page, category, city)} />}
        {!loading && !error && events.length === 0 && (
          <EmptyState
            icon="🎭"
            title="Không có sự kiện nào"
            description={hasActiveFilters ? 'Không tìm thấy sự kiện phù hợp với bộ lọc hiện tại.' : 'Chưa có sự kiện nào. Hãy quay lại sau!'}
            action={hasActiveFilters && <button onClick={clearFilters} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Xem tất cả</button>}
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
