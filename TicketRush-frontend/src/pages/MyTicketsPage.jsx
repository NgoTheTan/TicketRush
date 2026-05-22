// src/pages/MyTicketsPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useRouter } from '../contexts/RouterContext.jsx';
import { ticketService } from '../api/services.js';
import { Spinner, EmptyState, ErrorState, Badge, formatDate, formatCurrency } from '../components/ui/index.jsx';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

export default function MyTicketsPage() {
  const { navigate } = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const load = async (p) => {
    setLoading(true); setError(null);
    try {
      const { data, meta: m } = await ticketService.myTickets({ page: p, size: 100 });
      setTickets(data || []);
      setMeta(m);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  // Rút trích danh sách sự kiện unique từ vé
  const eventOptions = (() => {
    const map = new Map();
    tickets.forEach(t => {
      if (!t.event?.id) return;
      if (!map.has(t.event.id)) {
        map.set(t.event.id, { ...t.event, count: 0 });
      }
      map.get(t.event.id).count += 1;
    });
    return Array.from(map.values());
  })();

  const filteredTickets = selectedEventId
    ? tickets.filter(t => t.event?.id === selectedEventId)
    : tickets;

  return (
    <div className="font-[Inter]">
      <div className="max-w-screen-lg mx-auto px-6 py-10">

        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-indigo-600 mb-1">Vé của tôi</h1>
            <p className="text-sm text-slate-500">Quản lý và xem lịch sử vé đã đặt</p>
          </div>

          {/* Event filter — chỉ hiện khi đã có vé */}
          {!loading && tickets.length > 0 && (
            <div className="w-full sm:w-96">
              <EventFilterPicker
                options={eventOptions}
                value={selectedEventId}
                onChange={setSelectedEventId}
              />
            </div>
          )}
        </div>

        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={() => load(page)} />}

        {!loading && !error && tickets.length === 0 && (
          <EmptyState icon="🎟️" title="Bạn chưa có vé nào"
            description="Khám phá các sự kiện đang mở bán và đặt vé ngay!"
            action={
              <button onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
                Khám phá sự kiện
              </button>
            } />
        )}

        {!loading && tickets.length > 0 && (
          <div className="space-y-4">
            {/* Kết quả lọc rỗng */}
            {filteredTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-4xl">🔍</span>
                <p className="text-sm text-slate-500">Không có vé nào cho sự kiện này.</p>
                <button
                  onClick={() => setSelectedEventId(null)}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Xem tất cả vé
                </button>
              </div>
            )}

            {filteredTickets.map(ticket => (
              <div key={ticket.ticketId}
                onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex">
                {/* Color bar */}
                <div className="w-1.5 bg-indigo-600 flex-shrink-0" />
                {/* Event image */}
                <div className="w-24 h-24 flex-shrink-0 bg-slate-100 overflow-hidden m-4 rounded-lg">
                  {ticket.event?.imageUrl
                    ? <img src={toFullUrl(ticket.event.imageUrl)} alt={ticket.event.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-slate-300">event</span>
                      </div>}
                </div>
                {/* Info */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{ticket.event?.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {ticket.event?.venue}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                        {formatDate(ticket.event?.eventDate)}
                      </p>
                    </div>
                    <Badge label={ticket.status === 'VALID' ? 'Hợp lệ' : ticket.status} variant={ticket.status === 'VALID' ? 'success' : 'default'} />
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{ticket.seat?.zoneName} — Hàng {ticket.seat?.rowLabel}, Ghế {ticket.seat?.seatNumber}</span>
                    <span className="font-bold text-indigo-600">{formatCurrency(ticket.seat?.price)}</span>
                  </div>
                </div>
                <div className="flex items-center pr-4">
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </div>
              </div>
            ))}

            {meta && meta.totalPages > 1 && !selectedEventId && (
              <div className="flex justify-center gap-2 mt-6">
                <button disabled={!meta.hasPrevious} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">← Trước</button>
                <span className="px-4 py-2 text-sm text-slate-500">Trang {meta.page + 1} / {meta.totalPages}</span>
                <button disabled={!meta.hasNext} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">Tiếp →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── EventFilterPicker ──────────────────────────────────────────
function EventFilterPicker({ options = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 384);
    const height = popoverRef.current?.offsetHeight || 220;
    const gap = 8;
    const edge = 12;
    const spaceBelow = window.innerHeight - rect.bottom - gap - edge;
    const spaceAbove = rect.top - gap - edge;
    const openUp = spaceBelow < height && spaceAbove > spaceBelow;
    const rawTop = openUp ? rect.top - height - gap : rect.bottom + gap;
    const maxTop = Math.max(edge, window.innerHeight - height - edge);
    // Align right edge of popover with right edge of trigger
    const rawLeft = rect.right - width;
    const maxLeft = Math.max(edge, window.innerWidth - width - edge);

    setPopoverStyle({
      top: `${Math.min(Math.max(edge, rawTop), maxTop)}px`,
      left: `${Math.min(Math.max(edge, rawLeft), maxLeft)}px`,
      width: `${width}px`,
    });
  };

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOut = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleOut);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOut);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const selected = options.find(e => e.id === value) || null;

  const handleSelect = (id) => {
    onChange(id === value ? null : id);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex min-h-[42px] w-full items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${open
            ? 'border-indigo-300 text-slate-900 ring-2 ring-indigo-100'
            : 'border-slate-200 text-slate-900 hover:border-indigo-300'
          }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`material-symbols-outlined text-[19px] ${selected ? 'text-indigo-600' : 'text-indigo-400'}`}>
          confirmation_number
        </span>
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {selected ? selected.name : 'Lọc theo sự kiện'}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange(null); } }}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Xóa bộ lọc"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </span>
        )}
        <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          role="listbox"
          aria-label="Chọn sự kiện"
          className="fixed z-[90] rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] overflow-hidden"
          style={popoverStyle || { visibility: 'hidden' }}
        >
          {/* Tất cả option */}
          <div className="p-1.5 border-b border-slate-100">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => { onChange(null); setOpen(false); }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                ${!value
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 border border-indigo-300'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${!value ? 'text-indigo-600' : 'text-slate-400'}`}>
                grid_view
              </span>
              <span className="flex-1">Tất cả sự kiện</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {options.reduce((s, e) => s + e.count, 0)}
              </span>
              {!value && (
                <span className="material-symbols-outlined text-[18px] text-indigo-600">check</span>
              )}
            </button>
          </div>

          {/* Danh sách sự kiện */}
          <div className="p-1.5 flex flex-col gap-0.5 max-h-64 overflow-y-auto">
            {options.map(evt => {
              const isActive = value === evt.id;
              return (
                <button
                  key={evt.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(evt.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all text-left
                    ${isActive
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 border border-indigo-300 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent font-medium'
                    }`}
                >
                  {/* Thumbnail */}
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                    {evt.imageUrl
                      ? <img src={toFullUrl(evt.imageUrl)} alt={evt.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px] text-slate-300">event</span>
                        </div>
                    }
                  </div>
                  <span className="flex-1 min-w-0 truncate">{evt.name}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0
                    ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    {evt.count}
                  </span>
                  {isActive && (
                    <span className="material-symbols-outlined text-[18px] text-indigo-600 flex-shrink-0">check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
