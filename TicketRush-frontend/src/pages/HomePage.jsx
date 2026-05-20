// src/pages/HomePage.jsx
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Spinner, EmptyState, ErrorState, Badge, formatCurrency, eventStatusLabel, eventStatusVariant, formatDate } from '../components/ui/index.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);
const formatDateInputLabel = (value) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

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
  const initialFromDate = params?.fromDate || '';
  const initialToDate = params?.toDate || '';
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [city, setCity] = useState(initialCity);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [filterOpen, setFilterOpen] = useState(false);
  const [timeFilterOpen, setTimeFilterOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState({ fromDate: initialFromDate, toDate: initialToDate });
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    try {
      const data = await eventService.trending();
      setTrendingEvents(data || []);
    } catch (err) {
      console.error('Error loading trending events:', err);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  const load = useCallback(async (s, p, c, selectedCity, selectedFromDate, selectedToDate) => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await eventService.list({
        search: s || undefined,
        category: c || undefined,
        city: selectedCity || undefined,
        fromDate: selectedFromDate || undefined,
        toDate: selectedToDate || undefined,
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
      load(search, page, category, city, fromDate, toDate);
      loadTrending();
    }
  });

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    setSearch(params?.search || '');
    setCategory(params?.category || '');
    setCity(params?.city || '');
    setFromDate(params?.fromDate || '');
    setToDate(params?.toDate || '');
    setDateDraft({ fromDate: params?.fromDate || '', toDate: params?.toDate || '' });
    setPage(0);
  }, [params?.search, params?.category, params?.city, params?.fromDate, params?.toDate]);

  useEffect(() => {
    load(search, page, category, city, fromDate, toDate);
  }, [search, page, category, city, fromDate, toDate, load]);

  const updateFilters = (next) => {
    const nextSearch = Object.prototype.hasOwnProperty.call(next, 'search') ? next.search : search;
    const nextCategory = Object.prototype.hasOwnProperty.call(next, 'category') ? next.category : category;
    const nextCity = Object.prototype.hasOwnProperty.call(next, 'city') ? next.city : city;
    const nextFromDate = Object.prototype.hasOwnProperty.call(next, 'fromDate') ? next.fromDate : fromDate;
    const nextToDate = Object.prototype.hasOwnProperty.call(next, 'toDate') ? next.toDate : toDate;

    setSearch(nextSearch);
    setCategory(nextCategory);
    setCity(nextCity);
    setFromDate(nextFromDate);
    setToDate(nextToDate);
    setPage(0);
    navigate('/', {
      search: nextSearch || undefined,
      category: nextCategory || undefined,
      city: nextCity || undefined,
      fromDate: nextFromDate || undefined,
      toDate: nextToDate || undefined,
    });
  };

  const clearFilters = () => {
    updateFilters({ search: '', category: '', city: '', fromDate: '', toDate: '' });
    setDateDraft({ fromDate: '', toDate: '' });
  };

  const applyDateFilter = () => {
    if (!dateDraft.fromDate || !dateDraft.toDate) return;
    const [normalizedFromDate, normalizedToDate] = dateDraft.fromDate <= dateDraft.toDate
      ? [dateDraft.fromDate, dateDraft.toDate]
      : [dateDraft.toDate, dateDraft.fromDate];

    updateFilters({ fromDate: normalizedFromDate, toDate: normalizedToDate });
    setDateDraft({ fromDate: normalizedFromDate, toDate: normalizedToDate });
    setTimeFilterOpen(false);
  };

  const clearDateFilter = () => {
    setDateDraft({ fromDate: '', toDate: '' });
    updateFilters({ fromDate: '', toDate: '' });
  };

  const hasActiveDateFilter = Boolean(fromDate && toDate);
  const dateFilterLabel = hasActiveDateFilter
    ? `${formatDateInputLabel(fromDate)} - ${formatDateInputLabel(toDate)}`
    : 'Thời gian';
  const hasActiveFilters = Boolean(search || category || city || fromDate || toDate);
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

      {/* Trending Events Section */}
      {!hasActiveFilters && trendingEvents.length > 0 && (
        <div className="max-w-screen-xl mx-auto px-6 pt-10">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-bold text-indigo-600">Sự kiện xu hướng</h2>
          </div>
          
          <div className="relative group">
            {/* Scroll Container */}
            <div className="flex overflow-x-auto gap-6 pb-6 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-indigo-200">
              {trendingEvents.map((event) => (
                <div 
                  key={event.id}
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="flex-none w-[calc(100%/1.25)] sm:w-[calc(100%/2.2)] md:w-[calc(100%/3.2)] lg:w-[calc(100%/4.2)] snap-start cursor-pointer transition-all duration-300 hover:-translate-y-1.5"
                >
                  <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 transition-all duration-300 group/card bg-slate-50">
                    {event.imageUrl ? (
                      <img 
                        src={toFullUrl(event.imageUrl)} 
                        alt={event.name} 
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                        <span className="material-symbols-outlined text-5xl text-indigo-300">event</span>
                      </div>
                    )}
                    {/* Shadow overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-6 pt-8 pb-12">
        <div className="flex flex-col gap-5 mb-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-indigo-600">{search ? `Kết quả cho "${search}"` : 'Sự kiện đang mở bán'}</h2>
              {meta && <p className="text-sm text-slate-500 mt-1">{meta.totalElements} sự kiện</p>}
            </div>
            <div className="relative flex flex-wrap items-center justify-start sm:justify-end gap-3 w-full sm:w-auto">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-indigo-600 font-medium hover:text-indigo-700 whitespace-nowrap">
                  Xóa bộ lọc
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFilterOpen((open) => !open);
                  setTimeFilterOpen(false);
                }}
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
              <button
                type="button"
                onClick={() => {
                  setTimeFilterOpen((open) => !open);
                  setFilterOpen(false);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  timeFilterOpen || hasActiveDateFilter
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                aria-expanded={timeFilterOpen}
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                <span className="max-w-[180px] truncate">{dateFilterLabel}</span>
                {hasActiveDateFilter && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] leading-5 text-center">
                    1
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

              {timeFilterOpen && (
                <div className="absolute right-0 top-full mt-3 w-[min(92vw,420px)] bg-white rounded-xl border border-slate-200 shadow-xl p-5 z-30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Lọc theo thời gian</h3>
                    <button
                      type="button"
                      onClick={() => setTimeFilterOpen(false)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Đóng lọc thời gian"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Từ ngày</span>
                      <input
                        type="date"
                        value={dateDraft.fromDate}
                        onChange={(e) => setDateDraft((draft) => ({ ...draft, fromDate: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Đến ngày</span>
                      <input
                        type="date"
                        value={dateDraft.toDate}
                        onChange={(e) => setDateDraft((draft) => ({ ...draft, toDate: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-5">
                    <button
                      type="button"
                      onClick={clearDateFilter}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Xóa thời gian
                    </button>
                    <button
                      type="button"
                      onClick={applyDateFilter}
                      disabled={!dateDraft.fromDate || !dateDraft.toDate}
                      className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}
        {error && !loading && <ErrorState message={error} onRetry={() => load(search, page, category, city, fromDate, toDate)} />}
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
