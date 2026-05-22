// src/pages/HomePage.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Spinner, EmptyState, ErrorState, Badge, DatePicker, Pagination, formatCurrency, eventStatusLabel, eventStatusVariant, formatDate } from '../components/ui/index.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);
const formatDateInputLabel = (value) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};
const parseCategoryParam = (value) => {
  if (Array.isArray(value)) return value.flatMap(parseCategoryParam);
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};
const toCategoryParam = (value) => (value?.length ? value.join(',') : undefined);

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
  { value: '', label: 'Toàn quốc' },
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'Thành phố Hồ Chí Minh', label: 'Hồ Chí Minh' },
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

function LocationFilterGroup({ value, options, onChange }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-3 text-sm font-bold text-slate-900">Vị trí</h4>
      <div className="space-y-1">
        {options.map((option) => {
          const checked = value === option.value;

          return (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => onChange(checked ? '' : option.value)}
              className={`flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left text-sm transition-colors ${
                checked
                  ? 'text-indigo-700'
                  : 'text-slate-700 hover:text-indigo-700'
              }`}
            >
              <span className={`material-symbols-outlined text-[21px] shrink-0 ${checked ? 'text-indigo-600' : 'text-slate-300'}`}>
                {checked ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
              <span className="font-medium leading-snug">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryFilterChips({ value, options, onToggle }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-bold text-slate-900">Thể loại</h4>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                checked
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              {option.label}
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
  const initialCategories = parseCategoryParam(params?.category);
  const initialCity = params?.city || '';
  const initialFromDate = params?.fromDate || '';
  const initialToDate = params?.toDate || '';
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(initialSearch);
  const [categories, setCategories] = useState(initialCategories);
  const [city, setCity] = useState(initialCity);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [filterOpen, setFilterOpen] = useState(false);
  const [timeFilterOpen, setTimeFilterOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState({ fromDate: initialFromDate, toDate: initialToDate });
  const [filterDraft, setFilterDraft] = useState({ city: initialCity, categories: initialCategories });
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const trendingTrackRef = useRef(null);
  const activeCriteriaTrackRef = useRef(null);

  const loadTrending = useCallback(async () => {
    try {
      const data = await eventService.trending();
      setTrendingEvents(data || []);
    } catch (err) {
      console.error('Error loading trending events:', err);
    }
  }, []);

  const load = useCallback(async (s, p, selectedCategories, selectedCity, selectedFromDate, selectedToDate) => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await eventService.list({
        search: s || undefined,
        category: selectedCategories?.length ? selectedCategories : undefined,
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
      load(search, page, categories, city, fromDate, toDate);
      loadTrending();
    }
  });

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    const nextCategories = parseCategoryParam(params?.category);
    setSearch(params?.search || '');
    setCategories(nextCategories);
    setCity(params?.city || '');
    setFromDate(params?.fromDate || '');
    setToDate(params?.toDate || '');
    setDateDraft({ fromDate: params?.fromDate || '', toDate: params?.toDate || '' });
    setFilterDraft({ city: params?.city || '', categories: nextCategories });
    setPage(0);
  }, [params?.search, params?.category, params?.city, params?.fromDate, params?.toDate]);

  useEffect(() => {
    load(search, page, categories, city, fromDate, toDate);
  }, [search, page, categories, city, fromDate, toDate, load]);

  const updateFilters = (next) => {
    const nextSearch = Object.prototype.hasOwnProperty.call(next, 'search') ? next.search : search;
    const nextCategories = Object.prototype.hasOwnProperty.call(next, 'categories') ? parseCategoryParam(next.categories) : categories;
    const nextCity = Object.prototype.hasOwnProperty.call(next, 'city') ? next.city : city;
    const nextFromDate = Object.prototype.hasOwnProperty.call(next, 'fromDate') ? next.fromDate : fromDate;
    const nextToDate = Object.prototype.hasOwnProperty.call(next, 'toDate') ? next.toDate : toDate;

    setSearch(nextSearch);
    setCategories(nextCategories);
    setCity(nextCity);
    setFromDate(nextFromDate);
    setToDate(nextToDate);
    setPage(0);
    navigate('/', {
      search: nextSearch || undefined,
      category: toCategoryParam(nextCategories),
      city: nextCity || undefined,
      fromDate: nextFromDate || undefined,
      toDate: nextToDate || undefined,
    });
  };

  const toggleCategory = (currentCategories, categoryValue) => (
    currentCategories.includes(categoryValue)
      ? currentCategories.filter(value => value !== categoryValue)
      : [...currentCategories, categoryValue]
  );

  const toggleDraftCategory = (categoryValue) => {
    setFilterDraft(draft => ({
      ...draft,
      categories: toggleCategory(draft.categories, categoryValue),
    }));
  };

  const applyFilterPanel = () => {
    updateFilters({ city: filterDraft.city, categories: filterDraft.categories });
    setFilterOpen(false);
  };

  const resetFilterPanel = () => {
    setFilterDraft({ city: '', categories: [] });
    updateFilters({ city: '', categories: [] });
    setFilterOpen(false);
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
    setTimeFilterOpen(false);
  };

  const hasActiveDateFilter = Boolean(fromDate && toDate);
  const dateFilterLabel = hasActiveDateFilter
    ? `${formatDateInputLabel(fromDate)} - ${formatDateInputLabel(toDate)}`
    : 'Tất cả các ngày';
  // isSearchMode: true khi có từ khóa tìm kiếm HOẶC khi click thể loại từ nav bar
  const isCategoryNavMode = Boolean(!search && categories.length);
  const isSearchMode = Boolean(search) || isCategoryNavMode;
  const hasActiveListCriteria = Boolean(categories.length || city || fromDate || toDate);
  const activeFilterCount = categories.length + (city ? 1 : 0);
  const activeCriteria = [
    ...(city ? [{ type: 'city', value: city, label: CITY_OPTIONS.find(option => option.value === city)?.label || city }] : []),
    ...categories.map(categoryValue => ({
      type: 'category',
      value: categoryValue,
      label: CATEGORY_OPTIONS.find(option => option.value === categoryValue)?.label || categoryValue,
    })),
  ];
  const scrollTrending = (direction) => {
    const track = trendingTrackRef.current;
    if (!track) return;

    track.scrollBy({
      left: direction === 'next' ? track.clientWidth * 0.82 : -track.clientWidth * 0.82,
      behavior: 'smooth',
    });
  };
  const scrollActiveCriteria = (direction) => {
    const track = activeCriteriaTrackRef.current;
    if (!track) return;

    track.scrollBy({
      left: direction === 'next' ? track.clientWidth * 0.75 : -track.clientWidth * 0.75,
      behavior: 'smooth',
    });
  };
  const removeActiveCriterion = (criterion) => {
    if (criterion.type === 'city') {
      updateFilters({ city: '' });
      setFilterDraft(draft => ({ ...draft, city: '' }));
      return;
    }

    const nextCategories = categories.filter(value => value !== criterion.value);
    updateFilters({ categories: nextCategories });
    setFilterDraft(draft => ({ ...draft, categories: nextCategories }));
  };

  return (
    <div className="font-[Inter]">
      {!isSearchMode && (
      <div className="bg-white border-b border-slate-100">
        <nav className="max-w-screen-xl mx-auto px-6 py-3 overflow-x-auto" aria-label="Lọc theo thể loại">
          <div className="flex items-center gap-2 min-w-max">
            {CATEGORY_OPTIONS.filter((option) => option.value).map((option) => {
              const active = categories.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => navigate('/', { category: option.value })}
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
      )}

      {!isSearchMode && (
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
      )}

      {/* Trending Events Section */}
      {!isSearchMode && trendingEvents.length > 0 && (
        <div className="max-w-screen-xl mx-auto px-6 pt-10">
          <section className="relative overflow-hidden rounded-lg border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-purple-50 px-4 py-5 shadow-[0_18px_45px_rgba(79,70,229,0.12)] md:px-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="material-symbols-outlined text-[30px] text-orange-500"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  local_fire_department
                </span>
                <h2 className="truncate text-xl font-black text-indigo-700 md:text-2xl">Sự kiện xu hướng</h2>
              </div>
              {trendingEvents.length > 1 && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollTrending('prev')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Xem sự kiện xu hướng trước"
                  >
                    <span className="material-symbols-outlined text-[22px]">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTrending('next')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Xem sự kiện xu hướng tiếp theo"
                  >
                    <span className="material-symbols-outlined text-[22px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>

            <div
              ref={trendingTrackRef}
              className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {trendingEvents.map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="group flex flex-none w-[min(86vw,420px)] snap-start items-center text-left outline-none sm:w-[420px] lg:w-[390px] xl:w-[430px]"
                >
                  <span className="w-[76px] sm:w-[100px] mr-[-8px] sm:mr-[-12px] shrink-0 text-right text-[76px] font-black leading-none text-indigo-600/90 transition-colors group-hover:text-purple-600 sm:text-[96px]">
                    {index + 1}
                  </span>
                  <span className="relative block aspect-[16/9] min-w-0 flex-1 overflow-hidden rounded-lg bg-slate-100 shadow-[0_14px_28px_rgba(79,70,229,0.16)] ring-1 ring-indigo-100 transition-transform duration-300 group-hover:scale-[1.02] group-focus-visible:ring-2 group-focus-visible:ring-indigo-400">
                    {event.imageUrl ? (
                      <img
                        src={toFullUrl(event.imageUrl)}
                        alt={event.name}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                        <span className="material-symbols-outlined text-5xl text-indigo-300">event</span>
                      </span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-indigo-950/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-6 pt-8 pb-12">
        <div className="flex flex-col gap-5 mb-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-indigo-600">
                {search ? `Kết quả cho "${search}"` : isSearchMode ? 'Kết quả' : hasActiveListCriteria ? 'Kết quả' : 'Sự kiện đang mở bán'}
              </h2>
              {meta && <p className="text-sm text-slate-500 mt-1">{meta.totalElements} sự kiện</p>}
            </div>
            <div className="relative flex flex-wrap items-center justify-start sm:justify-end gap-3 w-full sm:w-auto">
              <div
                className={`inline-flex items-center rounded-lg border text-sm font-semibold transition-colors ${
                  timeFilterOpen || hasActiveDateFilter
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilterOpen((open) => !open);
                    setFilterOpen(false);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5"
                  aria-expanded={timeFilterOpen}
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span className="max-w-[180px] truncate">{dateFilterLabel}</span>
                </button>
                {hasActiveDateFilter && (
                  <button
                    type="button"
                    onClick={clearDateFilter}
                    className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700"
                    aria-label="Xóa bộ lọc thời gian"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterOpen((open) => {
                    const nextOpen = !open;
                    if (nextOpen) setFilterDraft({ city, categories });
                    return nextOpen;
                  });
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
              {activeCriteria.length > 0 && (
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[min(44vw,520px)]">
                  {activeCriteria.length > 2 && (
                    <button
                      type="button"
                      onClick={() => scrollActiveCriteria('prev')}
                      className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 md:inline-flex"
                      aria-label="Xem tiêu chí lọc trước"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                  )}
                  <div
                    ref={activeCriteriaTrackRef}
                    className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="Tiêu chí lọc đang dùng"
                  >
                    {activeCriteria.map((criterion) => (
                      <button
                        key={`${criterion.type}-${criterion.value}`}
                        type="button"
                        onClick={() => removeActiveCriterion(criterion)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                        aria-label={`Xóa ${criterion.label}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        <span>{criterion.label}</span>
                      </button>
                    ))}
                  </div>
                  {activeCriteria.length > 2 && (
                    <button
                      type="button"
                      onClick={() => scrollActiveCriteria('next')}
                      className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 md:inline-flex"
                      aria-label="Xem tiêu chí lọc tiếp theo"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  )}
                </div>
              )}

              {filterOpen && (
                <div className="absolute right-0 top-full mt-3 w-[min(92vw,760px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-30">
                  <div className="mb-4 flex items-center justify-between px-5 pt-5">
                    <h3 className="text-base font-bold text-slate-900">Bộ lọc</h3>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Đóng bộ lọc"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <div className="px-5 pb-5">
                    <LocationFilterGroup
                      value={filterDraft.city}
                      options={CITY_OPTIONS}
                      onChange={(value) => setFilterDraft(draft => ({ ...draft, city: value }))}
                    />
                    <div className="my-5 border-t border-dashed border-slate-200" />
                    <CategoryFilterChips
                      value={filterDraft.categories}
                      options={CATEGORY_OPTIONS.filter(option => option.value)}
                      onToggle={toggleDraftCategory}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={resetFilterPanel}
                      className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
                    >
                      Thiết lập lại
                    </button>
                    <button
                      type="button"
                      onClick={applyFilterPanel}
                      className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              )}

              {timeFilterOpen && (
                <div className="absolute left-0 top-full mt-3 w-[min(92vw,420px)] bg-white rounded-xl border border-slate-200 shadow-xl p-5 z-30">
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
                      <DatePicker
                        value={dateDraft.fromDate}
                        onChange={(value) => setDateDraft((draft) => ({ ...draft, fromDate: value }))}
                        placeholder="Chọn ngày bắt đầu"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Đến ngày</span>
                      <DatePicker
                        value={dateDraft.toDate}
                        onChange={(value) => setDateDraft((draft) => ({ ...draft, toDate: value }))}
                        placeholder="Chọn ngày kết thúc"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-5">
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
        {error && !loading && <ErrorState message={error} onRetry={() => load(search, page, categories, city, fromDate, toDate)} />}
        {!loading && !error && events.length === 0 && (
          <EmptyState
            icon="🎭"
            title="Không có sự kiện nào"
            description={isSearchMode
              ? 'Không tìm thấy sự kiện phù hợp với từ khóa hiện tại.'
              : hasActiveListCriteria
                ? 'Không tìm thấy sự kiện phù hợp với bộ lọc hiện tại.'
                : 'Chưa có sự kiện nào. Hãy quay lại sau!'}
          />
        )}
        {!loading && events.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((e) => <EventCard key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />)}
            </div>
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
