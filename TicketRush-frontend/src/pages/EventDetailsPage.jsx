// src/pages/EventDetailsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useBooking } from '../contexts/BookingContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import eventService from '../api/eventService.js';
import { Spinner, ErrorState, Badge, formatCurrency, eventStatusLabel, eventStatusVariant, formatDate, showToast } from '../components/ui/index.jsx';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

export default function EventDetailsPage({ eventId }) {
  const { navigate } = useRouter();
  const { isAuthenticated } = useAuth();
  const { startBooking, holdData, currentEvent } = useBooking();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvent = useCallback(() => {
    if (!eventId) return;
    setLoading(true);
    eventService.get(eventId)
      .then(d => setEvent(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

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


  if (loading) return <><Header /><div className="flex justify-center py-32"><Spinner size="lg" /></div></>;
  if (error) return <><Header /><div className="max-w-2xl mx-auto py-20"><ErrorState message={error} onRetry={() => window.location.reload()} /></div></>;
  if (!event) return null;

  const canBook = event.status === 'ON_SALE';
  const totalSeats = event.zones?.reduce((s, z) => s + (z.totalSeats || 0), 0) || 0;
  const availableSeats = event.zones?.reduce((s, z) => s + (z.availableSeats || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-[#fcf8ff] font-[Inter]">
      <Header />

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
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
