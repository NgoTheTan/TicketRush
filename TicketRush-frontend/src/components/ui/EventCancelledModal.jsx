// src/components/ui/EventCancelledModal.jsx
// Popup chặn toàn màn hình khi admin huỷ sự kiện trong khi người dùng đang xem trang sự kiện đó.
import { useEffect } from 'react';
import { useRouter } from '../../contexts/RouterContext.jsx';

export default function EventCancelledModal({ eventName }) {
  const { navigate } = useRouter();

  // Khoá cuộn trang nền khi modal mở
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(6px)' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="event-cancelled-title"
    >
      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden"
        style={{ animation: 'ecm-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Top accent strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />

        <div className="px-8 pt-8 pb-8 text-center">
          {/* Icon */}
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50"
            style={{ boxShadow: '0 0 0 8px rgba(239,68,68,0.08)' }}
          >
            <span
              className="material-symbols-outlined text-[36px] text-red-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              event_busy
            </span>
          </div>

          {/* Heading */}
          <h2
            id="event-cancelled-title"
            className="text-xl font-black text-slate-900 mb-2 leading-tight"
          >
            Sự kiện đã bị huỷ
          </h2>

          {/* Event name */}
          {eventName && (
            <p className="text-sm font-semibold text-indigo-600 mb-3 line-clamp-2">
              {eventName}
            </p>
          )}

          {/* Message */}
          <p className="text-sm text-slate-500 leading-relaxed mb-7">
            Ban tổ chức đã huỷ sự kiện này. Mọi giao dịch chưa hoàn tất sẽ được tự động huỷ.
            Vui lòng kiểm tra thông báo để biết thêm thông tin.
          </p>

          {/* CTA */}
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm
              hover:bg-indigo-700 active:scale-95 transition-all
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            ← Về trang chủ
          </button>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes ecm-pop {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
}
