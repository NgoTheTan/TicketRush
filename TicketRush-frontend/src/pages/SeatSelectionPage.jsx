import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useBooking } from '../contexts/BookingContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { seatService } from '../api/services.js';
import { Spinner, ErrorState, formatCurrency, showToast } from '../components/ui/index.jsx';
import UnifiedSeatGrid from '../components/ui/UnifiedSeatGrid.jsx';

// ── Countdown timer ───────────────────────────────────────────
function Countdown({ expiresAt, onExpired }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const r = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSecs(r);
      if (r === 0) onExpired?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  if (!expiresAt || secs === 0) return null;
  const m = Math.floor(secs / 60), s = secs % 60;
  const urgent = secs < 120;
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm
      ${urgent ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
      <span className="material-symbols-outlined text-[16px]">timer</span>
      Hết hạn sau {String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </div>
  );
}

// ── WS realtime indicator ─────────────────────────────────────
function WsIndicator({ connected }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full
      ${connected ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}
      title={connected ? 'Realtime updates bật' : 'Không có kết nối realtime'}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
      {connected ? 'Live' : 'Offline'}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function SeatSelectionPage({ eventId }) {
  const { navigate } = useRouter();
  const { currentEvent, holdData, updateHold, clearHold } = useBooking();
  const [seatMap, setSeatMap]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [actingSeatId, setActingSeatId] = useState(null);
  const [expired, setExpired]       = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // ── Load initial seat map ─────────────────────────────────
  const loadSeatMap = useCallback(async () => {
    if (!eventId) return;
    setLoading(true); setError(null);
    try {
      const data = await seatService.getSeatMap(eventId);
      setSeatMap(data);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { loadSeatMap(); }, [loadSeatMap]);

  // Recover hold state on page refresh
  useEffect(() => {
    if (!holdData && eventId) {
      seatService.getActiveHold(eventId)
        .then(hold => { if (hold) updateHold(hold); })
        .catch(() => {});
    }
  }, [eventId]);

  const holdDataRef = useRef(holdData);
  useEffect(() => {
    holdDataRef.current = holdData;
  }, [holdData]);

  // ── WebSocket: update individual seat without full reload ──
  const handleWsMessage = useCallback((msg) => {
    // msg = { type, eventId, seatId, status, timestamp }
    if (!msg.seatId || !msg.status) return;

    setSeatMap(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        zones: prev.zones.map(zone => ({
          ...zone,
          rows: zone.rows.map(row => ({
            ...row,
            seats: row.seats.map(seat => {
              if (seat.seatId === msg.seatId) {
                const isHeldInContext = holdDataRef.current?.allSelectedSeats?.some(s => s.seatId === msg.seatId);
                return {
                  ...seat,
                  status: msg.status,
                  heldByMe: msg.status === 'LOCKED' ? (seat.heldByMe || !!isHeldInContext) : false
                };
              }
              return seat;
            }),
          })),
        })),
      };
    });
  }, []);

  useWebSocket(
    eventId ? `/topic/seats/${eventId}` : null,
    handleWsMessage,
    !!eventId,
    useCallback(() => setWsConnected(true), [])
  );

  // ── Seat interactions ─────────────────────────────────────
  const handleSeatClick = async (seat) => {
    if (actingSeatId) return;

    const isHeldByMe = seat.heldByMe || holdData?.allSelectedSeats?.some(s => s.seatId === seat.seatId);

    if (isHeldByMe) {
      setActingSeatId(seat.seatId);
      try {
        const result = await seatService.releaseSeat(eventId, seat.seatId);
        if (!result?.allSelectedSeats?.length) clearHold();
        else updateHold(result);
        setSeatMap(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            zones: prev.zones.map(zone => ({
              ...zone,
              rows: zone.rows.map(row => ({
                ...row,
                seats: row.seats.map(s =>
                  s.seatId === seat.seatId
                    ? { ...s, status: 'AVAILABLE', heldByMe: false }
                    : s
                ),
              })),
            })),
          };
        });
        showToast('Đã bỏ chọn ghế', 'info');
        // Nếu WS active sẽ tự update; nếu không thì reload
        if (!wsConnected) await loadSeatMap();
      } catch (err) {
        showToast(err.message, 'error');
      } finally { setActingSeatId(null); }

    } else if (seat.status === 'AVAILABLE') {
      if ((holdData?.allSelectedSeats?.length || 0) >= 2) {
        showToast('Bạn chỉ có thể giữ tối đa 2 ghế', 'error');
        return;
      }
      setActingSeatId(seat.seatId);
      try {
        const result = await seatService.holdSeat(eventId, seat.seatId);
        updateHold(result);
        setSeatMap(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            zones: prev.zones.map(zone => ({
              ...zone,
              rows: zone.rows.map(row => ({
                ...row,
                seats: row.seats.map(s =>
                  s.seatId === seat.seatId
                    ? { ...s, status: 'LOCKED', heldByMe: true }
                    : s
                ),
              })),
            })),
          };
        });
        showToast(`Đã giữ ghế ${seat.rowLabel}${seat.seatNumber}`, 'success');
        if (!wsConnected) await loadSeatMap();
      } catch (err) {
        if (err.code === 'SEAT_NOT_AVAILABLE') {
          showToast('Ghế vừa được người khác giữ, vui lòng chọn ghế khác', 'error');
          await loadSeatMap(); // always reload on conflict
        } else if (err.code === 'SEAT_HOLD_LIMIT_EXCEEDED') {
          showToast('Bạn chỉ có thể giữ tối đa 2 ghế', 'error');
        } else {
          showToast(err.message, 'error');
        }
      } finally { setActingSeatId(null); }
    }
  };

  const handleHoldExpired = () => {
    setExpired(true);
    clearHold();
    showToast('Thời gian giữ ghế đã hết. Vui lòng chọn lại.', 'error');
    loadSeatMap();
  };

  const handleCheckout = () => {
    if (!holdData?.allSelectedSeats?.length) {
      showToast('Vui lòng chọn ít nhất 1 ghế', 'error');
      return;
    }
    navigate(`/events/${eventId}/checkout`);
  };

  const eventName = currentEvent?.name || `Sự kiện #${eventId}`;

  return (
    <div className="min-h-screen bg-[#fcf8ff] font-[Inter]">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <button onClick={() => navigate(`/events/${eventId}`)}
              className="text-sm text-indigo-600 hover:text-indigo-700 mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{eventName}</h1>
              <WsIndicator connected={wsConnected} />
            </div>
          </div>
          {holdData?.expiresAt && !expired && (
            <Countdown expiresAt={holdData.expiresAt} onExpired={handleHoldExpired} />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seat map */}
          <div className="lg:col-span-2">
            {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}
            {error && <ErrorState message={error} onRetry={loadSeatMap} />}

            {!loading && seatMap && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <UnifiedSeatGrid
                  seatMap={seatMap}
                  onSeatClick={handleSeatClick}
                  actingSeatId={actingSeatId}
                  mode="user"
                  currentHeldSeatIds={holdData?.allSelectedSeats?.map(s => s.seatId) || []}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4">Ghế đã chọn</h3>
              {(!holdData || !holdData.allSelectedSeats?.length) ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">chair</span>
                  Chưa chọn ghế nào
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {holdData.allSelectedSeats.map(s => (
                    <div key={s.seatId} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-indigo-800">{s.zoneName}</p>
                        <p className="text-xs text-indigo-600">Hàng {s.rowLabel}, Ghế {s.seatNumber}</p>
                      </div>
                      <p className="text-sm font-bold text-indigo-700">{formatCurrency(s.price)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-slate-200 font-bold text-sm">
                    <span>Tổng cộng</span>
                    <span className="text-indigo-600">{formatCurrency(holdData.totalAmount)}</span>
                  </div>
                </div>
              )}
              <button onClick={handleCheckout}
                disabled={!holdData?.allSelectedSeats?.length || expired}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm
                  hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
                Tiến hành thanh toán
              </button>
              {expired && (
                <p className="text-xs text-red-500 text-center mt-2">Phiên giữ ghế đã hết hạn. Vui lòng chọn lại.</p>
              )}
              <p className="text-xs text-slate-400 text-center mt-3">Tối đa 2 vé / sự kiện • Giữ trong 10 phút</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
