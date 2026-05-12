// src/pages/SignInPage.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { Button, Input, showToast } from '../components/ui/index.jsx';

export default function SignInPage() {
  const { login } = useAuth();
  const { navigate, params } = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      showToast('Đăng nhập thành công!', 'success');
      navigate(params.returnUrl || '/');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf8ff] font-[Inter]">
      <main className="w-full max-w-5xl mx-4 flex flex-col md:flex-row min-h-[600px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden">

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

            <h2 className="text-2xl font-bold text-slate-900 mb-1">Đăng nhập vào TicketRush</h2>
            <p className="text-sm text-slate-500 mb-8">Chào mừng bạn quay lại! Vui lòng nhập thông tin để tiếp tục.</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-[calc(0.75rem-1px)] flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] leading-none">mail</span>
                  </span>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                    placeholder="nhap@email.com" required
                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mật khẩu</label>
                  <a href="#" className="text-xs text-indigo-600 font-medium hover:text-indigo-700">Quên mật khẩu?</a>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-[calc(0.75rem-1px)] flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] leading-none">lock</span>
                  </span>
                  <input type={showPw ? 'text' : 'password'} value={form.password}
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

            <div className="grid grid-cols-2 gap-3">
              {['Google', 'Facebook'].map(p => (
                <button key={p} type="button"
                  className="py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  {p}
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Chưa có tài khoản?{' '}
              <button onClick={() => navigate('/register')} className="font-semibold text-indigo-600 hover:text-indigo-700">
                Đăng ký ngay
              </button>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
