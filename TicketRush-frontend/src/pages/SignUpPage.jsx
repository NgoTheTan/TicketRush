// src/pages/SignUpPage.jsx
import { createContext, useContext, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { Button, showToast } from '../components/ui/index.jsx';

const SignUpFieldContext = createContext(null);

function Field({ label, name, type = 'text', placeholder, children }) {
  const { form, errors, setValue } = useContext(SignUpFieldContext);

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">{label}</label>
      {children || (
        <input type={type} value={form[name]} onChange={e => setValue(name, e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            ${errors[name] ? 'border-red-400' : 'border-slate-200'}`} />
      )}
      {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
    </div>
  );
}

export default function SignUpPage() {
  const { register } = useAuth();
  const { navigate } = useRouter();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    phone: '', dateOfBirth: '', gender: 'MALE',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên';
    if (!form.email) e.email = 'Vui lòng nhập email';
    if (form.password.length < 8) e.password = 'Mật khẩu phải ít nhất 8 ký tự';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Mật khẩu không khớp';
    if (!/^[0-9]{10,11}$/.test(form.phone)) e.phone = 'Số điện thoại không hợp lệ';
    if (!form.dateOfBirth) e.dateOfBirth = 'Vui lòng nhập ngày sinh';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
      });
      showToast('Đăng ký thành công!', 'success');
      navigate('/');
    } catch (err) {
      if (err.code === 'AUTH_EMAIL_ALREADY_EXISTS') {
        setErrors({ email: 'Email này đã được sử dụng' });
      } else {
        showToast(err.message || 'Đăng ký thất bại', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldProps = { form, errors, setValue: set };

  return (
    <div className="min-h-screen bg-[#fcf8ff] flex items-center justify-center p-4 font-[Inter]">
      <div className="w-full max-w-[480px] bg-white shadow-[0px_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="material-symbols-outlined text-2xl text-indigo-600" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
            <span className="text-xl font-black text-indigo-600 tracking-tighter">TicketRush</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-3">Tạo tài khoản mới</h2>
          <p className="text-sm text-slate-500 mt-1">Đăng ký để bắt đầu đặt vé ngay hôm nay</p>
        </div>

        {/* Form */}
        <SignUpFieldContext.Provider value={fieldProps}>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <Field label="Họ và tên" name="fullName" placeholder="Nguyễn Văn A" />
          <Field label="Email" name="email" type="email" placeholder="email@example.com" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Mật khẩu" name="password" type="password" placeholder="••••••••" />
            <Field label="Xác nhận mật khẩu" name="confirmPassword" type="password" placeholder="••••••••" />
          </div>

          <Field label="Số điện thoại" name="phone" type="tel" placeholder="09xxxxxxxx" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ngày sinh" name="dateOfBirth" type="date" />
            <Field label="Giới tính" name="gender">
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
          </div>

          <div className="pt-2">
            <Button type="submit" loading={loading} fullWidth>Tạo tài khoản</Button>
          </div>

          <p className="text-center text-sm text-slate-500">
            Đã có tài khoản?{' '}
            <button type="button" onClick={() => navigate('/login')} className="font-semibold text-indigo-600 hover:text-indigo-700">
              Đăng nhập
            </button>
          </p>
        </form>
        </SignUpFieldContext.Provider>
      </div>
    </div>
  );
}
