// src/pages/BookingSuccessPage.jsx
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useBooking } from '../contexts/BookingContext.jsx';
import { formatCurrency, formatDate } from '../components/ui/index.jsx';

export default function BookingSuccessPage() {
  const { navigate } = useRouter();
  const { checkoutResult, clearBooking } = useBooking();

  if (!checkoutResult) {
    navigate('/');
    return null;
  }

  const { order, tickets } = checkoutResult;

  const handleViewTickets = () => {
    clearBooking();
    navigate('/my-tickets');
  };

  return (
    <div className="min-h-screen bg-[#fcf8ff] flex items-center justify-center p-4 font-[Inter]">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-[0px_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        {/* Success header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 pt-10 pb-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-white" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
            </div>
            <h1 className="text-2xl font-black mb-2">Đặt vé thành công! 🎉</h1>
            <p className="text-emerald-100 text-sm">Cảm ơn bạn đã tin tưởng TicketRush</p>
          </div>
        </div>

        {/* Order info */}
        <div className="px-8 py-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Mã đơn hàng</p>
              <p className="text-lg font-mono font-bold text-slate-900 mt-0.5">{order?.orderCode}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Tổng thanh toán</p>
              <p className="text-lg font-black text-emerald-600 mt-0.5">{formatCurrency(order?.totalAmount)}</p>
            </div>
          </div>
          {order?.event && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <p className="font-bold text-slate-800 text-sm">{order.event.name}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">location_on</span>
                {order.event.venue}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                {formatDate(order.event.eventDate)}
              </p>
            </div>
          )}
        </div>

        {/* Tickets */}
        {tickets && tickets.length > 0 && (
          <div className="px-8 py-6">
            <p className="text-sm font-bold text-slate-700 mb-3">Vé của bạn ({tickets.length} vé)</p>
            <div className="space-y-2">
              {tickets.map(t => (
                <div key={t.ticketId} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">{t.zoneName} — Hàng {t.rowLabel}, Ghế {t.seatNumber}</p>
                    <p className="text-xs text-indigo-500 font-mono mt-0.5">#{t.ticketCode?.slice(0, 8)}...</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">VALID</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          <button onClick={handleViewTickets}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
            🎟️ Xem vé của tôi
          </button>
          <button onClick={() => { clearBooking(); navigate('/'); }}
            className="w-full py-3.5 border border-slate-200 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors">
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
