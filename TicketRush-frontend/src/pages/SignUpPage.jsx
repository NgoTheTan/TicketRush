// src/pages/SignUpPage.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { Button, showToast } from '../components/ui/index.jsx';

const SignUpFieldContext = createContext(null);
const PASSWORD_RULES = [
  { id: 'length', label: 'Mật khẩu cần ít nhất 8 ký tự', test: (value) => value.length >= 8 },
  { id: 'uppercase', label: 'Mật khẩu cần ít nhất một chữ hoa', test: (value) => /[A-Z]/.test(value) },
  { id: 'lowercase', label: 'Mật khẩu cần ít nhất một chữ thường', test: (value) => /[a-z]/.test(value) },
  { id: 'number', label: 'Mật khẩu cần ít nhất một chữ số', test: (value) => /[0-9]/.test(value) },
  { id: 'special', label: 'Mật khẩu cần ít nhất một ký tự đặc biệt', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

function modalQuery(params) {
  return params?.returnUrl ? { returnUrl: params.returnUrl } : undefined;
}

function RequirementItem({ complete, children }) {
  return (
    <li className={`grid min-h-6 grid-cols-[22px_1fr] items-center gap-2 text-xs ${complete ? 'text-emerald-600' : 'text-slate-500'}`}>
      <span className="material-symbols-outlined inline-flex h-[22px] w-[22px] items-center justify-center text-[20px] leading-none">
        {complete ? 'check_circle' : 'radio_button_unchecked'}
      </span>
      <span className="leading-5">{children}</span>
    </li>
  );
}

function PasswordRequirements({ password, visible }) {
  if (!visible) return null;

  return (
    <ul className="mt-2 space-y-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      {PASSWORD_RULES.map((rule) => (
        <RequirementItem key={rule.id} complete={rule.test(password)}>
          {rule.label}
        </RequirementItem>
      ))}
    </ul>
  );
}

function ConfirmPasswordStatus({ complete, visible }) {
  if (!visible) return null;

  return (
    <ul className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <RequirementItem complete={complete}>Mật khẩu trùng khớp</RequirementItem>
    </ul>
  );
}

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

export default function SignUpPage({ modal = false }) {
  const { register } = useAuth();
  const { navigate, params } = useRouter();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    phone: '', dateOfBirth: '', gender: 'MALE',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (!modal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal]);

  const closeModal = () => navigate('/');
  const openLogin = () => navigate('/login', modalQuery(params));
  const passwordMeetsRules = PASSWORD_RULES.every((rule) => rule.test(form.password));
  const confirmMatches = form.password.length > 0 && form.confirmPassword === form.password;
  const showPasswordCriteria = passwordTouched && form.password.length > 0;
  const showConfirmCriteria = confirmPasswordTouched;

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên';
    if (!form.email) e.email = 'Vui lòng nhập email';
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu';
    else if (!passwordMeetsRules) e.password = 'Mật khẩu chưa đáp ứng đủ tiêu chí';
    if (!form.confirmPassword) e.confirmPassword = 'Vui lòng nhập lại mật khẩu';
    else if (!confirmMatches) e.confirmPassword = 'Mật khẩu không khớp';
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
      navigate('/system-queue', { returnUrl: params.returnUrl || '/' });
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

  const formCard = (
    <div className="relative w-full max-w-[520px] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0px_24px_80px_rgba(15,23,42,0.24)]">
      {modal && (
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Đóng đăng ký"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      )}

      <div className="max-h-[calc(100vh-3rem)] overflow-y-auto bg-white [scrollbar-gutter:stable]">
        {/* Header */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="material-symbols-outlined text-2xl text-indigo-600" style={{fontVariationSettings:"'FILL' 1"}}>confirmation_number</span>
            <span className="text-xl font-black text-indigo-600 tracking-tighter">TicketRush</span>
          </div>
          <h2 id="signup-title" className="text-xl font-bold text-slate-900 mt-3">Tạo tài khoản mới</h2>
          <p className="text-sm text-slate-500 mt-1">Đăng ký để bắt đầu đặt vé ngay hôm nay</p>
        </div>

        {/* Form */}
        <SignUpFieldContext.Provider value={fieldProps}>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <Field label="Họ và tên" name="fullName" placeholder="Nguyễn Văn A" />
          <Field label="Email" name="email" type="email" placeholder="email@example.com" />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onFocus={() => setPasswordTouched(true)}
                onChange={(e) => {
                  setPasswordTouched(true);
                  set('password', e.target.value);
                }}
                placeholder="••••••••"
                className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  ${errors.password ? 'border-red-400' : 'border-slate-200'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
            <PasswordRequirements password={form.password} visible={showPasswordCriteria} />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Xác nhận mật khẩu</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onFocus={() => setConfirmPasswordTouched(true)}
                onChange={(e) => {
                  setConfirmPasswordTouched(true);
                  set('confirmPassword', e.target.value);
                }}
                placeholder="••••••••"
                className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
            <ConfirmPasswordStatus complete={confirmMatches} visible={showConfirmCriteria} />
          </div>

          <Field label="Số điện thoại" name="phone" type="tel" placeholder="09xxxxxxxx" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <button type="button" onClick={openLogin} className="font-semibold text-indigo-600 hover:text-indigo-700">
              Đăng nhập
            </button>
          </p>
        </form>
        </SignUpFieldContext.Provider>
      </div>
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
        aria-labelledby="signup-title"
      >
        {formCard}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf8ff] flex items-center justify-center p-4 font-[Inter]">
      {formCard}
    </div>
  );
}
