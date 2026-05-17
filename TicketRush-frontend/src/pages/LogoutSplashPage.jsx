// src/pages/LogoutSplashPage.jsx
// Màn hình tạm biệt xuất hiện ngay sau khi nhấn Đăng xuất.
// Tự chuyển về trang chủ sau 2.2 giây.
import { useEffect, useRef } from 'react';
import { useRouter } from '../contexts/RouterContext.jsx';

export default function LogoutSplashPage() {
  const { navigate } = useRouter();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const t = setTimeout(() => {
      if (mountedRef.current) navigate('/');
    }, 2200);
    return () => {
      mountedRef.current = false;
      clearTimeout(t);
    };
  }, [navigate]);

  return (
    <>
      <style>{`
        @keyframes tr-fade-in  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes tr-scale-in { from { opacity:0; transform:scale(0.6); }        to { opacity:1; transform:scale(1); }   }
        @keyframes tr-pulse-ring {
          0%   { transform:scale(1);   opacity:.5; }
          60%  { transform:scale(1.45); opacity:0; }
          100% { transform:scale(1.45); opacity:0; }
        }
        .tr-fade-in  { animation: tr-fade-in  .55s cubic-bezier(.22,1,.36,1) both; }
        .tr-scale-in { animation: tr-scale-in .45s cubic-bezier(.34,1.56,.64,1) .1s both; }
        .tr-pulse-ring { animation: tr-pulse-ring 1.6s ease-out infinite; }
        .tr-delay-1 { animation-delay: .18s; }
        .tr-delay-2 { animation-delay: .30s; }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center p-6 font-[Inter]"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1060 50%, #0d0d2b 100%)' }}
      >
        <div
          className="tr-fade-in w-full max-w-sm text-center"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '24px',
            padding: '48px 40px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Icon vòng tròn + wave */}
          <div className="relative w-20 h-20 mx-auto mb-8 flex items-center justify-center">
            {/* Pulsing rings */}
            <div
              className="tr-pulse-ring absolute inset-0 rounded-full"
              style={{ border: '2px solid rgba(99,102,241,0.5)' }}
            />
            <div
              className="tr-pulse-ring absolute inset-0 rounded-full"
              style={{ border: '2px solid rgba(99,102,241,0.3)', animationDelay: '0.4s' }}
            />
            {/* Icon circle */}
            <div
              className="tr-scale-in w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))',
                border: '2px solid rgba(99,102,241,0.6)',
              }}
            >
              <span
                className="material-symbols-outlined text-4xl"
                style={{ color: '#a5b4fc', fontVariationSettings: "'FILL' 1" }}
              >
                waving_hand
              </span>
            </div>
          </div>

          {/* Text */}
          <h2
            className="tr-fade-in tr-delay-1 text-2xl font-black text-white mb-3 leading-snug"
          >
            Bạn đã thoát!
          </h2>
          <p
            className="tr-fade-in tr-delay-2 text-base font-medium"
            style={{ color: '#94a3b8' }}
          >
            Hẹn gặp lại bạn lần sau!
          </p>

          {/* Progress bar */}
          <div
            className="mt-8 mx-auto rounded-full overflow-hidden"
            style={{ height: '3px', background: 'rgba(255,255,255,0.08)', width: '80px' }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                animation: 'tr-progress 2.2s linear forwards',
              }}
            />
          </div>
          <style>{`
            @keyframes tr-progress { from { width:0%; } to { width:100%; } }
          `}</style>
        </div>
      </div>
    </>
  );
}
