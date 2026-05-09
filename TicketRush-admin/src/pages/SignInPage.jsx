// src/pages/SignInPage.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { Button, showToast } from '../components/ui/index.jsx';

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
      if (user.role !== 'ADMIN') {
        throw new Error('Tài khoản không có quyền truy cập quản trị.');
      }
      showToast('Đăng nhập thành công!', 'success');
      navigate(params.returnUrl || '/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-[Inter] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <main className="w-full max-w-md mx-4 bg-slate-800 shadow-2xl rounded-2xl overflow-hidden border border-slate-700">
        
        <div className="px-8 pt-10 pb-6 text-center border-b border-slate-700/50">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-xl mb-4 shadow-lg shadow-indigo-600/30">
            <span className="material-symbols-outlined text-3xl text-white" style={{fontVariationSettings:"'FILL' 1"}}>admin_panel_settings</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">System Admin</h2>
          <p className="text-sm text-slate-400 mt-2">Truy cập nội bộ dành cho Ban quản trị TicketRush</p>
        </div>

        <div className="px-8 py-8 bg-slate-800/50">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Email quản trị</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-[18px]">badge</span>
                <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                  placeholder="admin@ticketrush.com" required
                  className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Mật khẩu</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-[18px]">key</span>
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                  placeholder="••••••••" required
                  className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" loading={loading} fullWidth className="!py-3 !text-sm !font-bold tracking-wide !rounded-xl shadow-lg shadow-indigo-600/20">
                XÁC THỰC BẢO MẬT
              </Button>
            </div>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Kết nối mã hóa đầu cuối 256-bit
          </div>
        </div>

      </main>
    </div>
  );
}
