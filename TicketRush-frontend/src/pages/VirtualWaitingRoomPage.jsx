// src/pages/VirtualWaitingRoomPage.jsx
// Virtual Queue — luôn xuất hiện với mọi user trước khi vào seat selection.
// Khi ít người: admitted nhanh (~3 giây).
// Khi đông: hiển thị vị trí, ước tính thời gian, không cho tải lại.
import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useBooking } from '../contexts/BookingContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { queueService } from '../api/services.js';
import { showToast } from '../components/ui/index.jsx';

// ── Animated position counter ─────────────────────────────────
function PositionDisplay({ position }) {
  return (
    <div className="relative flex items-center justify-center w-28 h-28 mx-auto mb-6">
      {/* Outer ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="#e0e7ff" strokeWidth="5" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#6366f1" strokeWidth="5"
          strokeDasharray="276" strokeDashoffset="69"
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-black text-indigo-600 leading-none">{position}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">vị trí</div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
const SESSION_KEY = (eventId) => `tr_queue_${eventId}`;

export default function VirtualWaitingRoomPage({ eventId }) {
  const { navigate } = useRouter();
  const { currentEvent } = useBooking();
  const { isAuthenticated } = useAuth();

  // phase: 'joining' | 'waiting' | 'admitted' | 'error'
  const [phase, setPhase]         = useState('joining');
  const [session, setSession]     = useState(null);
  const [position, setPosition]   = useState(null);
  const [waitSecs, setWaitSecs]   = useState(null);
  const [errMsg, setErrMsg]       = useState('');
  const pollRef                   = useRef(null);
  const mountedRef                = useRef(true);

  const eventName = currentEvent?.name || `Sự kiện #${eventId}`;

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Enter seat selection when admitted ─────────────────────
  const enterSeatSelection = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    // Clear stored session
    sessionStorage.removeItem(SESSION_KEY(eventId));
    showToast('Đến lượt bạn rồi! Vào chọn ghế nhé 🎉', 'success');
    setTimeout(() => {
      if (mountedRef.current) navigate(`/events/${eventId}/seats`);
    }, 1500);
  }, [eventId, navigate]);

  // ── Start polling position ─────────────────────────────────
  const startPolling = useCallback((token) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const res = await queueService.getPosition(token);

        if (!mountedRef.current) return;

        if (res.status === 'ADMITTED') {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase('admitted');
          setPosition(0);
          enterSeatSelection();
          return;
        }

        // WAITING
        setPosition(res.position);
        setWaitSecs(res.estimatedWaitSeconds);
        setPhase('waiting');

      } catch (err) {
        if (!mountedRef.current) return;
        if (err.code === 'QUEUE_TOKEN_EXPIRED' || err.code === 'QUEUE_TOKEN_INVALID') {
          // Session expired → rejoin
          sessionStorage.removeItem(SESSION_KEY(eventId));
          if (pollRef.current) clearInterval(pollRef.current);
          await joinQueue();
        } else {
          setErrMsg(err.message || 'Lỗi kết nối. Đang thử lại...');
        }
      }
    };

    // Poll immediately, then every 2s
    poll();
    pollRef.current = setInterval(poll, 2000);
  }, [enterSeatSelection, eventId]);

  // ── Join or resume queue ───────────────────────────────────
  const joinQueue = useCallback(async () => {
    if (!mountedRef.current) return;
    setPhase('joining');
    setErrMsg('');

    try {
      // Try to restore from sessionStorage first
      const stored = sessionStorage.getItem(SESSION_KEY(eventId));
      let token = stored;

      if (!stored) {
        const res = await queueService.joinQueue(eventId);
        token = res.queueToken;
        sessionStorage.setItem(SESSION_KEY(eventId), token);
        setSession(res);

        // If already admitted on join (fast-path for low traffic)
        if (res.estimatedWaitSeconds === 0) {
          // Will be confirmed via first poll
        }
      }

      if (mountedRef.current) {
        startPolling(token);
      }

    } catch (err) {
      if (!mountedRef.current) return;
      setPhase('error');
      setErrMsg(err.message || 'Không thể tham gia hàng chờ. Vui lòng thử lại.');
    }
  }, [eventId, startPolling]);

  // ── Auto-join on mount ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { returnUrl: `/events/${eventId}/waiting` });
      return;
    }
    joinQueue();
  }, [eventId, isAuthenticated]);

  // ── Prevent reload message ─────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (phase === 'waiting') {
        e.preventDefault();
        e.returnValue = 'Bạn đang trong hàng chờ. Tải lại trang có thể mất vị trí!';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col font-[Inter]">
        <Header />

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {/* Card */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-white text-center shadow-2xl">

              {/* Event name */}
              <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold mb-1">Hàng chờ sự kiện</p>
              <h2 className="font-bold text-white text-lg mb-6 line-clamp-2 leading-snug">{eventName}</h2>

              {/* ── JOINING phase ── */}
              {phase === 'joining' && (
                <div className="py-6">
                  <div className="w-14 h-14 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-300 text-sm">Đang xác nhận vị trí của bạn...</p>
                </div>
              )}

              {/* ── WAITING phase ── */}
              {phase === 'waiting' && position != null && (
                <>
                  <PositionDisplay position={position} />

                  <p className="text-white text-base font-medium leading-relaxed mb-1">
                    Bạn đang ở vị trí thứ{' '}
                    <span className="text-indigo-300 font-black">{position}</span>{' '}
                    trong hàng đợi.
                  </p>
                  <p className="text-slate-400 text-sm">
                    Vui lòng không tải lại trang...
                  </p>
                </>
              )}

              {/* ── ADMITTED phase ── */}
              {phase === 'admitted' && (
                <div className="py-4">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-400">
                    <span className="material-symbols-outlined text-4xl text-emerald-400"
                      style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Đến lượt bạn rồi!</h3>
                  <p className="text-slate-300 text-sm mb-4">Đang chuyển sang trang chọn ghế...</p>
                  <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
                </div>
              )}

              {/* ── ERROR phase ── */}
              {phase === 'error' && (
                <div className="py-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-2xl text-red-400">error</span>
                  </div>
                  <p className="text-red-300 text-sm mb-4">{errMsg}</p>
                  <button onClick={joinQueue}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors">
                    Thử lại
                  </button>
                </div>
              )}
            </div>

            {/* Back link */}
            <div className="mt-8 text-center">
              <button onClick={() => navigate(`/events/${eventId}`)}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2">
                ← Quay lại trang sự kiện
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
