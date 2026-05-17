// src/pages/SystemQueuePage.jsx
// Màn hình chờ xuất hiện ngay sau khi đăng nhập.
// Khi được admit → chuyển vào giao diện chính (homepage / returnUrl).
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { queueService } from '../api/services.js';
import { showToast } from '../components/ui/index.jsx';

const SYS_QUEUE_KEY = 'tr_sysqueue_token';

function PulsingRing() {
  return (
    <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
      <div className="absolute inset-2 rounded-full border-4 border-indigo-500/30 animate-ping"
        style={{ animationDelay: '0.3s' }} />
      <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-400
        flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-indigo-300">confirmation_number</span>
      </div>
    </div>
  );
}

function PositionBadge({ position }) {
  return (
    <div className="flex flex-col items-center mb-6">
      <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold mb-2">
        Vị trí của bạn
      </p>
      <div className="text-7xl font-black text-white tabular-nums leading-none">
        {position}
      </div>
    </div>
  );
}

function WaitSeconds({ seconds }) {
  if (!seconds || seconds <= 0) return null;
  const display = seconds < 60
    ? `${seconds} giây`
    : `${Math.ceil(seconds / 60)} phút`;
  return (
    <div className="bg-white/10 rounded-xl px-5 py-2.5 mb-5 text-sm text-center">
      <span className="text-slate-300">Ước tính: </span>
      <span className="text-white font-bold">~{display}</span>
    </div>
  );
}

export default function SystemQueuePage() {
  const { navigate, params } = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  // returnUrl: nơi user muốn đến sau khi qua queue
  const returnUrl = params?.returnUrl || '/';

  // phase: 'joining' | 'waiting' | 'admitted' | 'error'
  const [phase, setPhase]     = useState('joining');
  const [position, setPos]    = useState(null);
  const [waitSecs, setWait]   = useState(null);
  const [errMsg, setErr]      = useState('');
  const pollRef               = useRef(null);
  const mountedRef            = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearInterval(pollRef.current);
    };
  }, []);

  // Khi được admit → vào giao diện chính
  const goToMain = useCallback(() => {
    clearInterval(pollRef.current);
    sessionStorage.removeItem(SYS_QUEUE_KEY);
    setPhase('admitted');
    showToast('Chào mừng bạn đến TicketRush! 🎉', 'success');
    setTimeout(() => {
      if (mountedRef.current) navigate(returnUrl);
    }, 1200);
  }, [navigate, returnUrl]);

  // Poll position mỗi 2 giây
  const startPolling = useCallback((token) => {
    clearInterval(pollRef.current);
    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const res = await queueService.getPosition(token);
        if (!mountedRef.current) return;
        if (res.status === 'ADMITTED') {
          clearInterval(pollRef.current);
          goToMain();
          return;
        }
        setPos(res.position);
        setWait(res.estimatedWaitSeconds);
        setPhase('waiting');
      } catch (err) {
        if (!mountedRef.current) return;
        if (err.code === 'QUEUE_TOKEN_EXPIRED' || err.code === 'QUEUE_TOKEN_INVALID') {
          sessionStorage.removeItem(SYS_QUEUE_KEY);
          clearInterval(pollRef.current);
          joinQueue();
        }
        // Ignore transient network errors
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
  }, [goToMain]);

  // Join hoặc resume system queue
  // Luôn gọi API joinSystemQueue để backend quyết định:
  //   - WAITING cũ → resume (giữ vị trí, idempotent khi tải lại)
  //   - ADMITTED cũ → expire + tạo WAITING mới (buộc chờ lại khi login lại)
  const joinQueue = useCallback(async () => {
    if (!mountedRef.current) return;
    setPhase('joining');
    setErr('');
    try {
      const res = await queueService.joinSystemQueue();
      const token = res.queueToken;
      // Lưu token để poll có thể dùng khi trang bị reload giữa chừng
      sessionStorage.setItem(SYS_QUEUE_KEY, token);
      setPos(res.position);
      setWait(res.estimatedWaitSeconds);
      if (mountedRef.current) startPolling(token);
    } catch (err) {
      if (!mountedRef.current) return;
      setPhase('error');
      setErr(err.message || 'Không thể tham gia hàng chờ.');
    }
  }, [startPolling]);

  // Auto-join khi mount (user đã authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    joinQueue();
  }, [isAuthenticated]);

  // Cảnh báo khi reload trong lúc chờ
  useEffect(() => {
    const fn = (e) => {
      if (phase === 'waiting') {
        e.preventDefault();
        e.returnValue = 'Bạn đang trong hàng chờ — tải lại có thể mất vị trí!';
      }
    };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [phase]);

  const handleLogout = async () => {
    sessionStorage.removeItem(SYS_QUEUE_KEY);
    await logout();
    navigate('/logout');
  };

  return (
    <>
      <style>{`
        @keyframes ping { 75%,100% { transform:scale(1.5); opacity:0; } }
        .animate-ping { animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900
        flex flex-col items-center justify-center p-6 font-[Inter]">

        {/* Top bar */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-indigo-400"
              style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
            <span className="text-white font-black tracking-tighter text-lg">TicketRush</span>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm hidden sm:block">{user.fullName}</span>
              <button onClick={handleLogout}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 px-3 py-1.5 rounded-lg">
                Đăng xuất
              </button>
            </div>
          )}
        </div>

        {/* Queue card */}
        <div className="w-full max-w-sm text-center">

          {/* ── JOINING ── */}
          {phase === 'joining' && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
              <div className="w-14 h-14 border-2 border-indigo-400/30 border-t-indigo-400
                rounded-full animate-spin mx-auto mb-5" />
              <p className="text-white font-semibold mb-1">Đang xác nhận vị trí...</p>
              <p className="text-slate-400 text-sm">Vui lòng chờ trong giây lát</p>
            </div>
          )}

          {/* ── WAITING ── */}
          {phase === 'waiting' && position != null && (
            <div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-5">
                <PulsingRing />

                <PositionBadge position={position} />

                <p className="text-white text-base font-medium mb-1 leading-relaxed">
                  Bạn đang ở vị trí thứ{' '}
                  <span className="text-indigo-300 font-black">{position}</span>{' '}
                  trong hàng đợi
                </p>
                <p className="text-slate-400 text-sm mb-5">Vui lòng không tải lại trang...</p>

                <WaitSeconds seconds={waitSecs} />

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cập nhật mỗi 2 giây · 50 người/lượt
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  Hệ thống bảo vệ công bằng cho mọi người dùng
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Không tải lại — bạn sẽ mất vị trí trong hàng
                </div>
              </div>
            </div>
          )}

          {/* ── ADMITTED ── */}
          {phase === 'admitted' && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full
                flex items-center justify-center mx-auto mb-4 border-2 border-emerald-400">
                <span className="material-symbols-outlined text-4xl text-emerald-400"
                  style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
              </div>
              <h2 className="text-xl font-black text-white mb-2">Chào mừng!</h2>
              <p className="text-slate-300 text-sm mb-4">Đang vào giao diện chính...</p>
              <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400
                rounded-full animate-spin mx-auto" />
            </div>
          )}

          {/* ── ERROR ── */}
          {phase === 'error' && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
              <div className="w-12 h-12 bg-red-500/20 rounded-full
                flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl text-red-400">error</span>
              </div>
              <p className="text-red-300 text-sm mb-5">{errMsg}</p>
              <button onClick={joinQueue}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm
                  font-semibold hover:bg-indigo-500 transition-colors">
                Thử lại
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
