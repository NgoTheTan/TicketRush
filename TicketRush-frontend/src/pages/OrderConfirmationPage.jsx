// src/pages/OrderConfirmationPage.jsx
import { useState, useEffect, useRef } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useBooking } from '../contexts/BookingContext.jsx';
import { orderService } from '../api/services.js';
import { Spinner, formatCurrency, formatDate, showToast } from '../components/ui/index.jsx';

export default function OrderConfirmationPage({ eventId }) {
  const { navigate } = useRouter();
  const { currentEvent, holdData, pendingOrder, setPendingOrder, setCheckout } = useBooking();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const creatingOrderForHold = useRef(null);

  // Step 1: Create order from hold
  useEffect(() => {
    const holdId = holdData?.holdId;

    if (!holdId) {
      navigate(`/events/${eventId}/seats`);
      return;
    }

    if (pendingOrder?.holdId === holdId) {
      setOrder(pendingOrder.order);
      setLoading(false);
      return;
    }

    if (creatingOrderForHold.current === holdId) return;
    creatingOrderForHold.current = holdId;
    setLoading(true);
    setError(null);

    orderService.createOrder(holdId)
      .then(o => {
        setOrder(o);
        setPendingOrder({ holdId, order: o });
      })
      .catch(err => {
        if (err.code === 'HOLD_EXPIRED') {
          showToast('Phiên giữ ghế đã hết hạn. Vui lòng chọn lại.', 'error');
          navigate(`/events/${eventId}/seats`);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [eventId, holdData?.holdId, navigate, pendingOrder, setPendingOrder]);

  // Step 2: Confirm payment
  const handleConfirm = async () => {
    if (!holdData?.holdId) return;
    setConfirming(true);
    try {
      const result = await orderService.confirmCheckout(holdData.holdId);
      setCheckout(result);
      navigate('/booking-success');
    } catch (err) {
      if (err.code === 'HOLD_EXPIRED') {
        showToast('Thời gian giữ ghế đã hết. Vui lòng chọn lại.', 'error');
        navigate(`/events/${eventId}/seats`);
      } else {
        showToast(err.message, 'error');
      }
    } finally { setConfirming(false); }
  };

  const eventName = currentEvent?.name || order?.event?.name || `Sự kiện #${eventId}`;

  if (loading) return <><Header /><div className="flex justify-center py-32"><Spinner size="lg" /></div></>;

  if (error) return (
    <><Header />
    <div className="max-w-2xl mx-auto py-20 px-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <button onClick={() => navigate(`/events/${eventId}/seats`)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Quay lại chọn ghế</button>
    </div></>
  );

  return (
    <div className="min-h-screen bg-[#fcf8ff] font-[Inter]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate(`/events/${eventId}/seats`)}
          className="text-sm text-indigo-600 hover:text-indigo-700 mb-6 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">Xác nhận đặt vé</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          {/* Event info */}
          <div className="p-6 border-b border-slate-100">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Sự kiện</p>
            <h2 className="font-bold text-slate-900 text-lg">{eventName}</h2>
            {order?.event && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                  {formatDate(order.event.eventDate)}
                </p>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  {order.event.venue}
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="p-6 space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Ghế đã chọn</p>
            {(order?.items || holdData?.allSelectedSeats || []).map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.zoneName}</p>
                  <p className="text-xs text-slate-500">Hàng {item.rowLabel}, Ghế {item.seatNumber}</p>
                </div>
                <p className="text-sm font-bold text-slate-800">{formatCurrency(item.unitPrice || item.price)}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="px-6 py-4 bg-slate-50 flex justify-between items-center">
            <span className="font-bold text-slate-900">Tổng cộng</span>
            <span className="text-xl font-black text-indigo-600">
              {formatCurrency(order?.totalAmount || holdData?.totalAmount)}
            </span>
          </div>
        </div>

        {/* Order code */}
        {order?.orderCode && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 text-center">
            <p className="text-xs text-indigo-400 uppercase font-semibold tracking-wide">Mã đơn hàng</p>
            <p className="text-lg font-mono font-bold text-indigo-700 mt-1">{order.orderCode}</p>
          </div>
        )}

        {/* Mock payment note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <span className="material-symbols-outlined text-amber-500">info</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Thanh toán giả lập</p>
            <p className="text-xs text-amber-600">Đây là môi trường demo. Bấm xác nhận để hoàn tất đặt vé.</p>
          </div>
        </div>

        <button onClick={handleConfirm} disabled={confirming}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all">
          {confirming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang xử lý...
            </span>
          ) : '✓ XÁC NHẬN THANH TOÁN'}
        </button>
      </div>
    </div>
  );
}
