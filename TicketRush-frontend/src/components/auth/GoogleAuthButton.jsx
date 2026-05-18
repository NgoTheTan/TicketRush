import { useEffect, useRef } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let googleScriptPromise;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Không tải được Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

export default function GoogleAuthButton({
  onCredential,
  onError,
  loading = false,
  text = 'signin_with',
}) {
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleButtonRef.current) return undefined;

    if (!googleClientId) {
      googleButtonRef.current.innerHTML = '';
      return undefined;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: onCredential,
          ux_mode: 'popup',
        });

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          locale: 'vi',
          width: Math.min(400, googleButtonRef.current.clientWidth || 320),
        });
      })
      .catch(() => {
        if (!cancelled) {
          onError?.('Không tải được nút đăng nhập Google. Vui lòng kiểm tra kết nối và thử lại.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId, onCredential, onError, text]);

  return (
    <div className="min-h-11">
      {googleClientId ? (
        <div className="relative flex justify-center">
          <div ref={googleButtonRef} className={loading ? 'pointer-events-none opacity-60' : ''} />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <div className="h-5 w-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled
          className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed"
        >
          Chưa cấu hình Google Client ID
        </button>
      )}
    </div>
  );
}
