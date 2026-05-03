// src/pages/VirtualWaitingRoomPage.jsx
// ⚠️ Backend Sprint 3 NOT YET IMPLEMENTED
// This is a UI shell using mock data. See FRONTEND_BACKEND_GAPS.md for details.
import { useState, useEffect } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useBooking } from '../contexts/BookingContext.jsx';
import { queueService } from '../api/services.js';
import { showToast } from '../components/ui/index.jsx';

export default function VirtualWaitingRoomPage({ eventId }) {
  const { navigate } = useRouter();
  const { currentEvent, startBooking } = useBooking();
  const [session, setSession] = useState(null);
  const [position, setPosition] = useState(null);
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState('IDLE'); // IDLE | WAITING | ADMITTED

  // Mock banner
  const isMock = import.meta.env.VITE_ENABLE_MOCK_QUEUE === 'true';

  const join = async () => {
    setJoining(true);
    try {
      const s = await queueService.joinQueue(eventId);
      setSession(s);
      setPosition(s.position);
      setStatus('WAITING');
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setJoining(false); }
  };

  // Mock polling — Sprint 3 will replace with real API
  useEffect(() => {
    if (status !== 'WAITING') return;
    const id = setInterval(async () => {
      const res = await queueService.getPosition(session?.queueToken);
      setPosition(res.position);
      if (res.status === 'ADMITTED') {
        clearInterval(id);
        setStatus('ADMITTED');
        showToast('Đến lượt bạn rồi! Hãy chọn ghế nhanh nhé.', 'success');
        setTimeout(() => navigate(`/events/${eventId}/seats`), 2000);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [status, session]);

  const eventName = currentEvent?.name || `Sự kiện #${eventId}`;

  return (
    <div className="min-h-screen bg-[#fcf8ff] flex flex-col font-[Inter]">
      <Header />

      {isMock && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-center text-xs text-amber-700 font-medium">
          🔧 Mock mode — Backend Sprint 3 chưa implement. Xem FRONTEND_BACKEND_GAPS.md
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 px-8 py-10 text-white text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl">people_outline</span>
            </div>
            <h1 className="text-xl font-black mb-1">Phòng chờ ảo</h1>
            <p className="text-indigo-300 text-sm">{eventName}</p>
          </div>

          <div className="px-8 py-8">
            {status === 'IDLE' && (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-6">
                  Sự kiện đang có lượng truy cập cao. Vui lòng xếp hàng để đảm bảo công bằng.
                </p>
                <button onClick={join} disabled={joining}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {joining ? 'Đang xếp hàng...' : 'Tham gia hàng chờ'}
                </button>
              </div>
            )}

            {status === 'WAITING' && session && (
              <div className="text-center">
                <div className="mb-6">
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2">Vị trí của bạn</p>
                  <div className="text-6xl font-black text-indigo-600">#{position}</div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '40%' }} />
                </div>

                <p className="text-sm text-slate-500 mb-1">Ước tính: <strong className="text-slate-700">~{Math.ceil(position / 5)} phút</strong></p>
                <p className="text-xs text-slate-400">Đừng đóng trang này nhé!</p>

                <div className="mt-6 flex justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              </div>
            )}

            {status === 'ADMITTED' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl text-emerald-600" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Đến lượt bạn rồi!</h2>
                <p className="text-sm text-slate-500 mb-4">Đang chuyển hướng đến trang chọn ghế...</p>
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
