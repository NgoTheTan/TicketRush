// src/pages/ForgotPasswordPage.jsx
import { useEffect, useState } from 'react';
import authService from '../api/authService.js';
import { useRouter } from '../contexts/RouterContext.jsx';
import { Button, showToast } from '../components/ui/index.jsx';

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

export default function ForgotPasswordPage({ modal = false }) {
  const { navigate, params } = useRouter();
  const [step, setStep] = useState('verify');
  const [form, setForm] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!modal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const closeModal = () => navigate('/');
  const openLogin = () => navigate('/login', modalQuery(params));
  const passwordMeetsRules = PASSWORD_RULES.every((rule) => rule.test(form.newPassword));
  const confirmMatches = form.newPassword.length > 0 && form.confirmPassword === form.newPassword;

  const sendOtp = async () => {
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Vui lòng nhập email';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSendingOtp(true);
    try {
      await authService.forgotPassword(form.email.trim());
      showToast('Nếu email tồn tại, mã OTP đã được gửi đến hộp thư của bạn.', 'success');
      setOtpSent(true);
      setErrors({});
    } catch (err) {
      setErrors({ form: err.message || 'Không thể gửi mã OTP' });
    } finally {
      setSendingOtp(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Vui lòng nhập email';
    if (!/^[0-9]{6}$/.test(form.otp.trim())) nextErrors.otp = 'Mã OTP phải gồm 6 chữ số';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setVerifyingOtp(true);
    try {
      await authService.verifyResetOtp({
        email: form.email.trim(),
        otp: form.otp.trim(),
      });
      showToast('Mã OTP hợp lệ. Vui lòng đặt mật khẩu mới.', 'success');
      setErrors({});
      setStep('password');
    } catch (err) {
      setErrors({ otp: err.message || 'Mã OTP không hợp lệ' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!/^[0-9]{6}$/.test(form.otp.trim())) nextErrors.form = 'Vui lòng xác nhận lại mã OTP';
    if (!passwordMeetsRules) nextErrors.newPassword = 'Mật khẩu chưa đáp ứng đủ tiêu chí';
    if (!confirmMatches) nextErrors.confirmPassword = 'Mật khẩu không khớp';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setResetting(true);
    try {
      await authService.resetPassword({
        email: form.email.trim(),
        otp: form.otp.trim(),
        newPassword: form.newPassword,
      });
      showToast('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.', 'success');
      navigate('/login', modalQuery(params));
    } catch (err) {
      if (err.code === 'AUTH_RESET_OTP_INVALID' || err.code === 'AUTH_RESET_OTP_EXPIRED') {
        setStep('verify');
      }
      setErrors({ form: err.message || 'Không thể đổi mật khẩu' });
    } finally {
      setResetting(false);
    }
  };

  const formCard = (
    <div className="relative w-full max-w-[480px] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0px_24px_80px_rgba(15,23,42,0.24)]">
      {modal && (
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Đóng quên mật khẩu"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      )}

      <div className="max-h-[calc(100vh-3rem)] overflow-y-auto bg-white [scrollbar-gutter:stable]">
        <div className="pt-8 pb-6 px-8 text-center border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="material-symbols-outlined text-2xl text-indigo-600" style={{fontVariationSettings:"'FILL' 1"}}>lock_reset</span>
            <span className="text-xl font-black text-indigo-600 tracking-tighter">TicketRush</span>
          </div>
          <h2 id="forgot-password-title" className="text-xl font-bold text-slate-900 mt-3">Đặt lại mật khẩu</h2>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'verify' ? 'Nhập email, gửi mã OTP và xác nhận mã.' : 'Đặt mật khẩu mới cho tài khoản của bạn.'}
          </p>
        </div>

        {errors.form && (
          <div className="mx-8 mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {errors.form}
          </div>
        )}

        {step === 'verify' ? (
          <form onSubmit={submitOtp} className="px-8 py-6 space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Email</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] leading-none">mail</span>
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      set('email', e.target.value);
                      setOtpSent(false);
                    }}
                    placeholder="email@example.com"
                    required
                    className={`h-[46px] w-full pl-10 pr-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.email ? 'border-red-400' : 'border-slate-200'}`}
                  />
                </div>
                <Button
                  type="button"
                  onClick={sendOtp}
                  loading={sendingOtp}
                  className="h-[46px] shrink-0 px-4 sm:w-[132px]"
                >
                  {otpSent ? 'Gửi lại' : 'Gửi OTP'}
                </Button>
              </div>
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Mã OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.otp}
                onChange={(e) => set('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.otp ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.otp && <p className="text-xs text-red-600 mt-1">{errors.otp}</p>}
            </div>

            <Button type="submit" loading={verifyingOtp} fullWidth>Xác nhận OTP</Button>

            <p className="text-center text-sm text-slate-500">
              Đã nhớ mật khẩu?{' '}
              <button type="button" onClick={openLogin} className="font-semibold text-indigo-600 hover:text-indigo-700">
                Đăng nhập
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={submitReset} className="px-8 py-6 space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <span className="material-symbols-outlined text-[18px] leading-none">check_circle</span>
              <span className="min-w-0 truncate">{form.email.trim()}</span>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.newPassword}
                  onFocus={() => setPasswordTouched(true)}
                  onChange={(e) => {
                    setPasswordTouched(true);
                    set('newPassword', e.target.value);
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.newPassword ? 'border-red-400' : 'border-slate-200'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword}</p>}
              <PasswordRequirements password={form.newPassword} visible={passwordTouched && form.newPassword.length > 0} />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onFocus={() => setConfirmTouched(true)}
                  onChange={(e) => {
                    setConfirmTouched(true);
                    set('confirmPassword', e.target.value);
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}
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
              <ConfirmPasswordStatus complete={confirmMatches} visible={confirmTouched} />
            </div>

            <Button type="submit" loading={resetting} fullWidth>Đổi mật khẩu</Button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep('verify')} className="font-semibold text-slate-500 hover:text-slate-700">
                Đổi email
              </button>
            </div>
          </form>
        )}
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
        aria-labelledby="forgot-password-title"
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
