// src/pages/EventDetailsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useBooking } from '../contexts/BookingContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import eventService from '../api/eventService.js';
import { ticketService } from '../api/services.js';
import { Spinner, ErrorState, Badge, formatCurrency, eventStatusLabel, eventStatusVariant, formatDate } from '../components/ui/index.jsx';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);
const ticketStatusLabel = (status) => ({ VALID: 'Hợp lệ', USED: 'Đã dùng', CANCELLED: 'Đã hủy' }[status] || status);
const ticketStatusVariant = (status) => ({ VALID: 'success', USED: 'default', CANCELLED: 'error' }[status] || 'default');

export default function EventDetailsPage({ eventId }) {
  const { navigate } = useRouter();
  const { isAuthenticated } = useAuth();
  const { startBooking, holdData, currentEvent } = useBooking();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownedTickets, setOwnedTickets] = useState([]);
  const [ownedTicketsLoading, setOwnedTicketsLoading] = useState(false);

  const loadEvent = useCallback(() => {
    if (!eventId) return;
    setLoading(true);
    eventService.get(eventId)
      .then(d => setEvent(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    const timer = window.setTimeout(loadEvent, 0);
    return () => window.clearTimeout(timer);
  }, [loadEvent]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!isAuthenticated || !eventId) {
        setOwnedTickets([]);
        setOwnedTicketsLoading(false);
        return;
      }

      setOwnedTicketsLoading(true);
      ticketService.myTicketsForEvent(eventId)
        .then(data => {
          if (!cancelled) setOwnedTickets(data || []);
        })
        .catch(() => {
          if (!cancelled) setOwnedTickets([]);
        })
        .finally(() => {
          if (!cancelled) setOwnedTicketsLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [eventId, isAuthenticated]);

  // Lắng nghe WebSocket: khi admin mở bán / thay đổi status → tự reload
  const handleEventsWs = useCallback((msg) => {
    if (msg?.type === 'EVENT_LIST_UPDATED') {
      loadEvent();
    }
  }, [loadEvent]);

  useWebSocket('/topic/events', handleEventsWs);

  const handleSelectSeat = () => {
    if (!isAuthenticated) {
      navigate('/login', { returnUrl: `/events/${eventId}` });
      return;
    }
    // Nếu đang có hold hợp lệ cho đúng sự kiện này → đi thẳng đến trang ghế
    const hasActiveHold = holdData?.allSelectedSeats?.length > 0
      && holdData?.expiresAt
      && new Date(holdData.expiresAt) > new Date()
      && currentEvent?.id === event?.id;

    if (!hasActiveHold) {
      startBooking(event);
    }
    navigate(`/events/${eventId}/seats`);
  };


  if (loading) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;
  if (error) return <div className="max-w-2xl mx-auto py-20"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>;
  if (!event) return null;

  const canBook = event.status === 'ON_SALE';
  const totalSeats = event.zones?.reduce((s, z) => s + (z.totalSeats || 0), 0) || 0;
  const availableSeats = event.zones?.reduce((s, z) => s + (z.availableSeats || 0), 0) || 0;

  return (
    <div className="font-[Inter]">
      {/* Banner */}
      <div className="relative h-72 lg:h-96 bg-slate-800 overflow-hidden">
        {event.imageUrl
          ? <img src={toFullUrl(event.imageUrl)} alt={event.name} className="w-full h-full object-cover opacity-80" />
          : <div className="w-full h-full bg-gradient-to-br from-indigo-800 to-purple-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-8xl text-indigo-300">event</span>
            </div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8">
          <Badge label={eventStatusLabel(event.status)} variant={eventStatusVariant(event.status)} />
          <h1 className="text-3xl lg:text-4xl font-black text-white mt-2 leading-tight">{event.name}</h1>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-8">
          {/* Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Thông tin sự kiện</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-indigo-500 text-[20px] mt-0.5">calendar_today</span>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Thời gian</p>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(event.eventDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-indigo-500 text-[20px] mt-0.5">location_on</span>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Địa điểm</p>
                   {event.locationUrl ? (
                    <a href={event.locationUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors flex items-center gap-1">
                      {event.venue}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{event.venue}</p>
                  )}
                </div>
              </div>
              {totalSeats > 0 && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-indigo-500 text-[20px] mt-0.5">chair</span>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Ghế còn lại</p>
                    <p className="text-sm font-semibold text-slate-700">{availableSeats} / {totalSeats} ghế</p>
                  </div>
                </div>
              )}
            </div>

            {event.description && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Mô tả</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>

          {/* Zones */}
          {event.zones && event.zones.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Khu vực ghế</h2>
              <div className="space-y-3">
                {event.zones.map(zone => (
                  <div key={zone.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.colorCode || '#6366f1' }} />
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{zone.name}</p>
                        <p className="text-xs text-slate-500">{zone.availableSeats} / {zone.totalSeats} ghế còn lại</p>
                      </div>
                    </div>
                    <p className="font-bold text-indigo-600 text-sm">{formatCurrency(zone.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Booking */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 sticky top-24">
            <h3 className="text-base font-bold text-slate-900 mb-4">Đặt vé ngay</h3>
            {event.zones && event.zones.length > 0 && (
              <div className="mb-5 space-y-2">
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Giá vé</p>
                {event.zones.map(zone => (
                  <div key={zone.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{zone.name}</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(zone.price)}</span>
                  </div>
                ))}
              </div>
            )}

            {canBook ? (
              <>
                {/* Hiển thị nếu đang có hold hợp lệ cho sự kiện này */}
                {holdData?.allSelectedSeats?.length > 0
                  && holdData?.expiresAt
                  && new Date(holdData.expiresAt) > new Date()
                  && currentEvent?.id === event?.id && (
                  <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-[16px]">timer</span>
                    <p className="text-xs text-amber-700 font-medium">
                      Bạn đang giữ {holdData.allSelectedSeats.length} ghế — tiếp tục để đặt vé
                    </p>
                  </div>
                )}
                <button onClick={handleSelectSeat}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all">
                  {holdData?.allSelectedSeats?.length > 0
                    && holdData?.expiresAt
                    && new Date(holdData.expiresAt) > new Date()
                    && currentEvent?.id === event?.id
                    ? '⏩ Tiếp tục đặt vé'
                    : '🎟️ Chọn ghế & Đặt vé'}
                </button>
              </>
            ) : (
              <div className={`w-full py-3.5 text-center rounded-xl font-semibold text-sm
                ${event.status === 'UPCOMING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
                {event.status === 'UPCOMING' ? 'Chưa mở bán' : event.status === 'ENDED' ? 'Đã kết thúc' : 'Đã hủy'}
              </div>
            )}

            <p className="text-xs text-slate-400 text-center mt-3">Tối đa 2 vé mỗi sự kiện</p>

            {isAuthenticated && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-900">Vé bạn đã có</h4>
                  {ownedTickets.length > 0 && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">
                      {ownedTickets.length} vé
                    </span>
                  )}
                </div>

                {ownedTicketsLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-medium text-slate-500">
                    <Spinner size="sm" />
                    Đang tải vé...
                  </div>
                ) : ownedTickets.length > 0 ? (
                  <div className="space-y-2">
                    {ownedTickets.map(ticket => (
                      <button
                        key={ticket.ticketId}
                        type="button"
                        onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                        className="flex w-full items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-3 text-left transition-colors hover:bg-indigo-50"
                      >
                        <span className="material-symbols-outlined mt-0.5 text-[18px] text-indigo-600">confirmation_number</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-slate-900">
                            {ticket.seat?.zoneName || 'Khu vực'} - Hàng {ticket.seat?.rowLabel}, ghế {ticket.seat?.seatNumber}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Mã đơn {ticket.order?.orderCode || '—'} · {formatCurrency(ticket.seat?.price)}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-2">
                          <Badge label={ticketStatusLabel(ticket.status)} variant={ticketStatusVariant(ticket.status)} />
                          <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-medium text-slate-500">
                    Bạn chưa có vé nào cho sự kiện này.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
