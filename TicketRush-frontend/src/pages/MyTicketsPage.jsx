// src/pages/MyTicketsPage.jsx
import { useState, useEffect } from 'react';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
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

  const load = async (p) => {
    setLoading(true); setError(null);
    try {
      const { data, meta: m } = await ticketService.myTickets({ page: p, size: 20 });
      setTickets(data || []);
      setMeta(m);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  return (
    <div className="min-h-screen bg-[#fcf8ff] font-[Inter]">
      <Header />
      <div className="max-w-screen-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-black text-indigo-600 mb-2">Vé của tôi</h1>
        <p className="text-sm text-slate-500 mb-8">Quản lý và xem lịch sử vé đã đặt</p>

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
            {tickets.map(ticket => (
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

            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button disabled={!meta.hasPrevious} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">← Trước</button>
                <span className="px-4 py-2 text-sm text-slate-500">Trang {meta.page + 1} / {meta.totalPages}</span>
                <button disabled={!meta.hasNext} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">Tiếp →</button>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
