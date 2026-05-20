// src/pages/SignInPage.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { Button } from '../components/ui/index.jsx';
import GoogleAuthButton from '../components/auth/GoogleAuthButton.jsx';

function modalQuery(params) {
  return params?.returnUrl ? { returnUrl: params.returnUrl } : undefined;
}

export default function SignInPage({ modal = false }) {
  const { login, loginWithGoogle } = useAuth();
  const { navigate, params } = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (!modal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal]);

  const navigateAfterClearingPassword = useCallback((to, queryParams) => {
    if (passwordInputRef.current) {
      passwordInputRef.current.value = '';
    }
    setForm((current) => ({ ...current, password: '' }));
    window.requestAnimationFrame(() => navigate(to, queryParams));
  }, [navigate]);

  const closeModal = () => navigateAfterClearingPassword('/');
  const openRegister = () => navigateAfterClearingPassword('/register', modalQuery(params));
  const openForgotPassword = () => navigateAfterClearingPassword('/forgot-password', modalQuery(params));

  const redirectAfterLogin = useCallback((user, requireProfileCompletion = false) => {
    if (user.role === 'ADMIN') {
      navigate('/admin/dashboard');
      return;
    }

    const dest = params.returnUrl || '/';
    if (requireProfileCompletion && user.profileComplete === false) {
      navigate('/profile', { completeProfile: '1', returnUrl: dest });
      return;
    }

    navigate('/system-queue', { returnUrl: dest });
  }, [navigate, params.returnUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      redirectAfterLogin(user);
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(async (response) => {
    if (!response?.credential) {
      setError('Google không trả về mã xác thực. Vui lòng thử lại.');
      return;
    }

    setError('');
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle(response.credential);
      redirectAfterLogin(user, true);
    } catch (err) {
      setError(err.message || 'Đăng nhập Google thất bại');
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, redirectAfterLogin]);

  const formCard = (
    <div className="relative w-full max-w-5xl max-h-[calc(100vh-3rem)] overflow-y-auto flex flex-col md:flex-row min-h-[600px] bg-white shadow-[0px_24px_80px_rgba(15,23,42,0.24)] rounded-xl">
      {modal && (
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Đóng đăng nhập"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      )}

      {/* Left - Image */}
      <section className="hidden md:flex w-1/2 relative overflow-hidden bg-slate-800">
        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhcQEBEBa8EGRCBwZamDCgvWwETS_AhK9CicLmc3SlQN_N3jHcEIC8dGwHq3kHP4KB-iqg27j4lW508CsjuBgjkP5AMc3yUIgYBAbU0by0ioNYKx1paHgcxQOh5WMJ39kEm77AhAKmv_tiuzjvoXWrNXFMOb-huYl8-c944GipmHqBnsC8ee84H_cXF_3gekbzl89RW5S-Yum4StBZHOfx-i1dP3tHporK1DW2JloD1QwIQ6E1_oFmfjTn72yKceRCLrfkWMvxEdzW"
          alt="Concert" className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-white" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
          <span className="text-2xl font-black text-white tracking-tighter">TicketRush</span>
        </div>
        <div className="absolute bottom-12 left-12 right-8 text-white">
          <h1 className="text-4xl font-bold leading-tight mb-3">Trải nghiệm âm nhạc đỉnh cao</h1>
          <p className="text-base opacity-80">Khám phá và đặt vé các sự kiện âm nhạc, hội thảo, và giải trí hàng đầu.</p>
        </div>
      </section>

      {/* Right - Form */}
      <section className="flex-1 flex flex-col justify-center px-8 py-12 md:px-16 lg:px-20">
        <div className="max-w-sm w-full mx-auto">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <span className="material-symbols-outlined text-3xl text-indigo-600" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
            <span className="text-2xl font-black text-indigo-600 tracking-tighter">TicketRush</span>
          </div>

          <h2 id="signin-title" className="text-2xl font-bold text-slate-900 mb-1">Đăng nhập vào TicketRush</h2>
          <p className="text-sm text-slate-500 mb-8">Chào mừng bạn quay lại! Vui lòng nhập thông tin để tiếp tục.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-[calc(0.75rem-1px)] flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[18px] leading-none">mail</span>
                </span>
                <input type="email" name="username" autoComplete="username"
                  value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                  placeholder="nhap@email.com" required
                  className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mật khẩu</label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-[calc(0.75rem-1px)] flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[18px] leading-none">lock</span>
                </span>
                <input ref={passwordInputRef} type={showPw ? 'text' : 'password'}
                  name="password" autoComplete="current-password" value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                  placeholder="••••••••" required
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute inset-y-0 right-[calc(0.75rem+1px)] flex items-center text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-[18px] leading-none">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} fullWidth>Đăng nhập</Button>
          </form>

          <div className="relative mt-6 mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2">Hoặc tiếp tục với</div>
          </div>

          <GoogleAuthButton
            loading={googleLoading}
            onCredential={handleGoogleCredential}
            onError={setError}
          />

          <p className="mt-6 text-center text-sm text-slate-500">
            Chưa có tài khoản?{' '}
            <button type="button" onClick={openRegister} className="font-semibold text-indigo-600 hover:text-indigo-700">
              Đăng ký ngay
            </button>
          </p>
        </div>
      </section>
    </div>
  );

  if (modal) {
    return (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px]"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
      >
        {formCard}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf8ff] p-4 font-[Inter]">
      {formCard}
    </div>
  );
}
