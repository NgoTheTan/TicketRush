// src/pages/SeatSelectionPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useBooking } from '../contexts/BookingContext.jsx';
import { seatService } from '../api/services.js';
import { Spinner, ErrorState, formatCurrency, showToast } from '../components/ui/index.jsx';

// Countdown timer component
function Countdown({ expiresAt, onExpired }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSecs(remaining);
      if (remaining === 0) onExpired?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  if (!expiresAt || secs === 0) return null;

  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const urgent = secs < 120;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm
      ${urgent ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
      <span className="material-symbols-outlined text-[16px]">timer</span>
      Hết hạn sau {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
    </div>
  );
}

// Individual seat button
function SeatButton({ seat, onClick, loading }) {
  const { status, heldByMe, seatNumber } = seat;
  let cls = 'w-6 h-6 rounded transition-all ';
  if (status === 'AVAILABLE') cls += 'bg-white border border-slate-300 hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer active:scale-90';
  else if (heldByMe) cls += 'bg-indigo-600 cursor-pointer hover:bg-indigo-700 active:scale-90 ring-2 ring-indigo-300';
  else if (status === 'LOCKED') cls += 'bg-slate-300 cursor-not-allowed';
  else if (status === 'SOLD') cls += 'bg-red-400 cursor-not-allowed';

  return (
    <button disabled={status !== 'AVAILABLE' && !heldByMe} onClick={() => onClick?.(seat)}
      title={`${seat.rowLabel}${seatNumber} — ${status}`}
      className={cls + (loading ? ' opacity-50' : '')}>
      {heldByMe && <span className="material-symbols-outlined text-[12px] text-white">check</span>}
      {status === 'SOLD' && <span className="material-symbols-outlined text-[12px] text-white">close</span>}
    </button>
  );
}

export default function SeatSelectionPage({ eventId }) {
  const { navigate } = useRouter();
  const { currentEvent, holdData, updateHold, clearHold } = useBooking();
  const [seatMap, setSeatMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingSeatId, setActingSeatId] = useState(null);
  const [expired, setExpired] = useState(false);

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

  // Check for active hold on load (page refresh recovery)
  useEffect(() => {
    if (!holdData && eventId) {
      seatService.getActiveHold(eventId).then(hold => {
        if (hold) updateHold(hold);
      }).catch(() => {});
    }
  }, [eventId]);

  const handleSeatClick = async (seat) => {
    if (actingSeatId) return;

    if (seat.heldByMe) {
      // Release
      setActingSeatId(seat.seatId);
      try {
        const result = await seatService.releaseSeat(eventId, seat.seatId);
        if (result?.allSelectedSeats?.length === 0) {
          clearHold();
        } else if (result) {
          updateHold(result);
        }
        showToast('Đã bỏ chọn ghế', 'info');
        await loadSeatMap();
      } catch (err) {
        showToast(err.message, 'error');
      } finally { setActingSeatId(null); }
    } else if (seat.status === 'AVAILABLE') {
      // Hold
      const currentCount = holdData?.allSelectedSeats?.length || 0;
      if (currentCount >= 2) {
        showToast('Bạn chỉ có thể giữ tối đa 2 ghế', 'error');
        return;
      }
      setActingSeatId(seat.seatId);
      try {
        const result = await seatService.holdSeat(eventId, seat.seatId);
        updateHold(result);
        showToast(`Đã giữ ghế ${seat.rowLabel}${seat.seatNumber}`, 'success');
        await loadSeatMap();
      } catch (err) {
        if (err.code === 'SEAT_NOT_AVAILABLE') {
          showToast('Ghế vừa được người khác giữ, vui lòng chọn ghế khác', 'error');
          await loadSeatMap();
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
    if (!holdData || holdData.allSelectedSeats.length === 0) {
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
            <button onClick={() => navigate(`/events/${eventId}`)} className="text-sm text-indigo-600 hover:text-indigo-700 mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
            </button>
            <h1 className="text-xl font-bold text-slate-900">{eventName}</h1>
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
                {/* Stage */}
                <div className="mb-8 text-center">
                  <div className="w-3/4 mx-auto h-3 bg-gradient-to-r from-transparent via-slate-300 to-transparent rounded-full mb-2" />
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Sân khấu</p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-6 text-xs text-slate-500">
                  {[
                    { color: 'bg-white border border-slate-300', label: 'Có sẵn' },
                    { color: 'bg-indigo-600', label: 'Đang chọn' },
                    { color: 'bg-slate-300', label: 'Đã giữ' },
                    { color: 'bg-red-400', label: 'Đã bán' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded ${color}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Zones */}
                <div className="space-y-8">
                  {seatMap.zones?.map(zone => (
                    <div key={zone.zoneId}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.colorCode || '#6366f1' }} />
                        <h3 className="font-semibold text-sm text-slate-700">{zone.zoneName}</h3>
                        <span className="text-xs text-slate-400 ml-auto">{formatCurrency(zone.price)}</span>
                      </div>
                      {zone.rows?.map(row => (
                        <div key={row.rowLabel} className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-slate-400 w-5 text-center font-mono">{row.rowLabel}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {row.seats?.map(seat => (
                              <SeatButton key={seat.seatId} seat={seat}
                                onClick={handleSeatClick} loading={actingSeatId === seat.seatId} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4">Ghế đã chọn</h3>

              {(!holdData || holdData.allSelectedSeats?.length === 0) ? (
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
                disabled={!holdData || holdData.allSelectedSeats?.length === 0 || expired}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm
                  hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
                Tiến hành thanh toán
              </button>

              {expired && (
                <p className="text-xs text-red-500 text-center mt-2">Phiên giữ ghế đã hết hạn. Vui lòng chọn lại.</p>
              )}

              <p className="text-xs text-slate-400 text-center mt-3">Tối đa 2 ghế • Giữ trong 10 phút</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
