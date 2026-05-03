// src/pages/TicketDetailsPage.jsx
import { useState, useEffect, useRef } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { ticketService } from '../api/services.js';
import { Spinner, ErrorState, formatDate, formatCurrency } from '../components/ui/index.jsx';

// Simple QR code renderer using canvas (no external dep)
function QRCode({ value, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw placeholder QR pattern (visual only - not functional QR)
    ctx.fillStyle = '#1e1b4b';
    const cell = size / 21;

    // Corner marks
    const corner = (x, y) => {
      ctx.fillRect(x * cell, y * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((x+1) * cell, (y+1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect((x+2) * cell, (y+2) * cell, 3 * cell, 3 * cell);
    };
    corner(0, 0); corner(14, 0); corner(0, 14);

    // Data pattern from ticket code chars
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      const row = Math.floor(i / 10) + 8;
      const col = (i % 10) + 2;
      if (row < 19 && col < 19) {
        if (code % 2 === 0) {
          ctx.fillRect(col * cell, row * cell, cell - 1, cell - 1);
        }
      }
    }

    // Finder pattern dots
    ctx.fillStyle = '#1e1b4b';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect((8 + i) * cell, 6 * cell, cell - 1, cell - 1);
    }

    // Bottom text
    ctx.fillStyle = '#6366f1';
    ctx.font = `${Math.max(8, size / 25)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(value.slice(0, 8).toUpperCase(), size / 2, size - 6);
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg shadow-inner" />;
}

export default function TicketDetailsPage({ ticketId }) {
  const { navigate } = useRouter();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticketId) return;
    ticketService.getTicket(ticketId)
      .then(t => setTicket(t))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <><Header /><div className="flex justify-center py-32"><Spinner size="lg" /></div></>;
  if (error) return <><Header /><div className="max-w-lg mx-auto py-20 px-6"><ErrorState message={error} /></div></>;
  if (!ticket) return null;

  return (
    <div className="min-h-screen bg-[#fcf8ff] font-[Inter]">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-10">
        <button onClick={() => navigate('/my-tickets')}
          className="text-sm text-indigo-600 hover:text-indigo-700 mb-6 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Vé của tôi
        </button>

        {/* Ticket card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-xl" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
              <span className="font-black tracking-tighter text-lg">TicketRush</span>
            </div>
            <h2 className="font-bold text-xl leading-tight mt-2">{ticket.event?.name}</h2>
            <div className="flex items-center gap-1 text-indigo-200 text-sm mt-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {ticket.event?.venue}
            </div>
          </div>

          {/* Dashed divider */}
          <div className="flex items-center px-4 py-2">
            <div className="w-4 h-4 rounded-full bg-[#fcf8ff] border border-slate-100 -ml-6" />
            <div className="flex-1 border-dashed border-t-2 border-slate-200 mx-2" />
            <div className="w-4 h-4 rounded-full bg-[#fcf8ff] border border-slate-100 -mr-6" />
          </div>

          {/* Details */}
          <div className="px-6 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Khu vực</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{ticket.seat?.zoneName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Ghế</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">Hàng {ticket.seat?.rowLabel} — Số {ticket.seat?.seatNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Ngày diễn ra</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{formatDate(ticket.event?.eventDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Giá vé</p>
                <p className="font-bold text-indigo-600 text-sm mt-0.5">{formatCurrency(ticket.seat?.price)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Mã đơn hàng</p>
              <p className="font-mono font-bold text-slate-700 text-sm mt-0.5">{ticket.order?.orderCode}</p>
            </div>
          </div>

          {/* Dashed divider */}
          <div className="flex items-center px-4 py-2">
            <div className="w-4 h-4 rounded-full bg-[#fcf8ff] border border-slate-100 -ml-6" />
            <div className="flex-1 border-dashed border-t-2 border-slate-200 mx-2" />
            <div className="w-4 h-4 rounded-full bg-[#fcf8ff] border border-slate-100 -mr-6" />
          </div>

          {/* QR */}
          <div className="px-6 pb-8 flex flex-col items-center">
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-4">Mã QR vào cổng</p>
            <QRCode value={ticket.ticketCode} size={180} />
            <p className="text-xs font-mono text-slate-400 mt-3 text-center break-all max-w-[180px]">
              {ticket.ticketCode}
            </p>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
              {ticket.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
