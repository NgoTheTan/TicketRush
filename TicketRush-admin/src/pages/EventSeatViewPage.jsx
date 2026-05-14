// src/pages/EventSeatViewPage.jsx
import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import {
  Spinner, ErrorState, Badge,
  eventStatusLabel, eventStatusVariant,
  formatCurrency, formatDate,
  showToast, useConfirm,
} from '../components/ui/index.jsx';
import UnifiedSeatGrid from '../components/ui/UnifiedSeatGrid.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';

// ── Status transition config ──────────────────────────────────
const NEXT_STATUS = { UPCOMING: 'ON_SALE', ON_SALE: 'ENDED' };
const STATUS_ACTION_LABELS = {
  ON_SALE: {
    title: 'Mở bán sự kiện',
    message: 'Sự kiện sẽ được chuyển sang trạng thái đang mở bán. Người dùng sẽ có thể mua vé ngay sau đó.',
    confirmLabel: 'Mở bán ngay',
    variant: 'info',
  },
  ENDED: {
    title: 'Kết thúc sự kiện',
    message: 'Sự kiện sẽ được đánh dấu là đã kết thúc. Hành động này không thể hoàn tác.',
    confirmLabel: 'Xác nhận kết thúc',
    variant: 'warning',
  },
  CANCELLED: {
    title: 'Hủy sự kiện',
    message: 'Sự kiện sẽ bị hủy bỏ. Người dùng đã mua vé có thể bị ảnh hưởng.',
    confirmLabel: 'Xác nhận hủy',
    variant: 'danger',
  },
};

// ── WS Status Indicator ───────────────────────────────────────
function WsIndicator({ connected }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full
        ${connected ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}
      title={connected ? 'Cập nhật ghế realtime đang bật' : 'Không có kết nối realtime'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
      {connected ? 'Live' : 'Offline'}
    </div>
  );
}

// ── Zone stat card ────────────────────────────────────────────
function ZoneStatCard({ zone }) {
  const total   = (zone.availableCount ?? 0) + (zone.lockedCount ?? 0) + (zone.soldCount ?? 0);
  const fillPct = total > 0 ? Math.round(((zone.soldCount ?? 0) / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.colorCode || '#6366f1' }} />
        <p className="font-semibold text-sm text-slate-800 truncate">{zone.zoneName}</p>
        <span className="ml-auto text-xs font-bold text-indigo-600">{formatCurrency(zone.price)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        {[
          { label: 'Có sẵn',   value: zone.availableCount ?? 0, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Đang giữ', value: zone.lockedCount   ?? 0, color: 'text-amber-700',  bg: 'bg-amber-50' },
          { label: 'Đã bán',   value: zone.soldCount     ?? 0, color: 'text-rose-700',  bg: 'bg-rose-50'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg py-2`}>
            <p className={`text-lg font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${fillPct}%` }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1 text-right">Đã bán {fillPct}%</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function EventSeatViewPage({ eventId }) {
  const { navigate } = useRouter();
  const [seatMap, setSeatMap]       = useState(null);
  const [event, setEvent]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [acting, setActing]         = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [confirmDialog, confirm]    = useConfirm();

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const [mapData, eventData] = await Promise.all([
        eventService.getSeatMap(eventId),
        eventService.adminGetEvent(eventId),
      ]);
      setSeatMap(mapData);
      setEvent(eventData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // ── WebSocket: cập nhật ghế real-time ─────────────────────
  const handleWsMessage = useCallback((msg) => {
    if (!msg.seatId || !msg.status) return;

    setSeatMap(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        zones: prev.zones.map(zone => ({
          ...zone,
          rows: zone.rows.map(row => ({
            ...row,
            seats: row.seats.map(seat =>
              seat.seatId === msg.seatId
                ? { ...seat, status: msg.status }
                : seat
            ),
          })),
        })),
      };
    });
  }, []);

  useWebSocket(
    eventId ? `/topic/admin/seats/${eventId}` : null,
    handleWsMessage,
    !!eventId,
    useCallback(() => setWsConnected(true), [])
  );

  // ── Status change ──────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    const cfg = STATUS_ACTION_LABELS[newStatus] || {
      title: 'Xác nhận thay đổi trạng thái',
      message: 'Bạn có chắc chắn muốn thay đổi trạng thái sự kiện này không?',
      confirmLabel: 'Xác nhận',
      variant: 'info',
    };
    const ok = await confirm(cfg);
    if (!ok) return;
    setActing(true);
    try {
      await eventService.adminChangeStatus(eventId, newStatus);
      showToast('Đã cập nhật trạng thái sự kiện thành công', 'success');
      load(); // reload để cập nhật badge
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActing(false);
    }
  };

  // ── Totals ─────────────────────────────────────────────────
  const totals = (() => {
    let available = 0, locked = 0, sold = 0;
    seatMap?.zones?.forEach(z =>
      z.rows?.forEach(r => r.seats?.forEach(s => {
        if (s.status === 'AVAILABLE') available++;
        else if (s.status === 'LOCKED') locked++;
        else if (s.status === 'SOLD') sold++;
      }))
    );
    return { available, locked, sold };
  })();

  const totalSeats = totals.available + totals.locked + totals.sold;
  const nextStatus = event ? NEXT_STATUS[event.status] : null;

  return (
    <AdminLayout>
      {confirmDialog}
      <div className="p-6 max-w-screen-2xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
          <button
            onClick={() => navigate('/admin/events')}
            className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Quản lý Sự kiện
          </button>
          <span>/</span>
          <span className="text-slate-700 font-medium truncate">{event?.name ?? `Sự kiện #${eventId}`}</span>
          <span>/</span>
          <span className="text-slate-400">Chi tiết sự kiện</span>
        </div>

        {loading && <div className="flex justify-center py-32"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={load} />}

        {!loading && seatMap && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

            {/* ── Left: Seat map ── */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h1 className="text-lg font-black text-slate-900">
                        {event?.name ?? `Sự kiện #${eventId}`}
                      </h1>
                      <WsIndicator connected={wsConnected} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{event?.venue}{event?.eventDate ? ` · ${formatDate(event.eventDate)}` : ''}</span>
                      {event?.locationUrl && (
                        <a href={event.locationUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">location_on</span> Bản đồ
                        </a>
                      )}
                    </p>
                  </div>

                  {/* Status badge + action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event?.status && (
                      <Badge label={eventStatusLabel(event.status)} variant={eventStatusVariant(event.status)} />
                    )}

                    {event?.status !== 'ON_SALE' && event?.status !== 'ENDED' && event?.status !== 'CANCELLED' && (
                      <button
                        onClick={() => navigate(`/admin/events/${eventId}/edit`)}
                        disabled={acting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-700 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Chỉnh sửa
                      </button>
                    )}

                    {/* Nút chuyển trạng thái tiếp theo */}
                    {nextStatus && (
                      <button
                        onClick={() => handleStatusChange(nextStatus)}
                        disabled={acting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {nextStatus === 'ON_SALE' ? 'sell' : 'event_available'}
                        </span>
                        {nextStatus === 'ON_SALE' ? 'Mở bán' : 'Kết thúc'}
                      </button>
                    )}

                    {/* Nút Hủy */}
                    {(event?.status === 'UPCOMING' || event?.status === 'ON_SALE') && (
                      <button
                        onClick={() => handleStatusChange('CANCELLED')}
                        disabled={acting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        Hủy sự kiện
                      </button>
                    )}

                    {/* Làm mới */}
                    <button
                      onClick={load}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">refresh</span>
                      Làm mới
                    </button>
                  </div>
                </div>

                {/* Summary bar */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                  {[
                    { label: 'Tổng ghế',     value: totalSeats,    color: 'text-slate-800' },
                    { label: 'Đã bán',        value: totals.sold,   color: 'text-rose-600'  },
                    { label: 'Đang giữ chỗ', value: totals.locked, color: 'text-amber-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="py-3 text-center">
                      <p className={`text-2xl font-black ${color}`}>{value}</p>
                      <p className="text-[11px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="p-6">
                  {/* Unified seat grid — legend nằm trong component */}
                  <UnifiedSeatGrid seatMap={seatMap} mode="admin" />
                </div>
              </div>
            </div>

            {/* ── Right: Zone stats ── */}
            <div className="xl:col-span-1 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide px-1">
                Thống kê theo khu vực
              </h2>
              {seatMap.zones?.map(zone => (
                <ZoneStatCard key={zone.zoneId} zone={zone} />
              ))}

              {/* Overall progress */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-3">Tổng quan</p>
                <div className="space-y-2">
                  {[
                    { label: 'Có sẵn',       value: totals.available, color: 'bg-indigo-300' },
                    { label: 'Đang giữ chỗ', value: totals.locked,    color: 'bg-amber-400' },
                    { label: 'Đã bán',        value: totals.sold,      color: 'bg-rose-500'  },
                  ].map(({ label, value, color }) => {
                    const pct = totalSeats > 0 ? Math.round((value / totalSeats) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">{label}</span>
                          <span className="font-semibold text-slate-800">
                            {value} <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
