// src/pages/ProfilePage.jsx
import { useState, useEffect, useRef } from 'react';
import Header from '../components/layout/Header.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import authService from '../api/authService.js';
import api from '../api/apiClient.js';
import { Button, showToast } from '../components/ui/index.jsx';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

export default function ProfilePage() {
  const { navigate } = useRouter();
  const avatarInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tab, setTab] = useState('info'); // 'info' | 'password'

  // Form state
  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '', gender: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    authService.me().then(data => {
      setProfile(data);
      setForm({
        fullName:    data.fullName || '',
        phone:       data.profile?.phone || '',
        dateOfBirth: data.profile?.dateOfBirth || '',
        gender:      data.profile?.gender || '',
      });
    }).catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ảnh đại diện không được vượt quá 2MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await authService.updateAvatar(file);
      setProfile(prev => ({
        ...prev,
        profile: {
          ...(prev?.profile ?? {}),
          avatarUrl: result.avatarUrl,
        },
      }));
      showToast('Đã cập nhật ảnh đại diện!', 'success');
    } catch (err) {
      showToast(err.message || 'Cập nhật ảnh đại diện thất bại', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/v1/auth/me', {
        fullName:    form.fullName || undefined,
        phone:       form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender:      form.gender || undefined,
      });
      showToast('Đã cập nhật thông tin!', 'success');
    } catch (err) {
      showToast(err.message || 'Cập nhật thất bại', 'error');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!pwForm.currentPassword) e2.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (pwForm.newPassword.length < 8) e2.newPassword = 'Mật khẩu mới phải ít nhất 8 ký tự';
    if (pwForm.newPassword !== pwForm.confirmPassword) e2.confirmPassword = 'Mật khẩu không khớp';
    setErrors(e2);
    if (Object.keys(e2).length) return;

    setSaving(true);
    try {
      await api.put('/api/v1/auth/me', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      showToast('Đã đổi mật khẩu!', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (err.code === 'AUTH_INVALID_CREDENTIALS') {
        setErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' });
      } else {
        showToast(err.message, 'error');
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <>
      <Header />
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#fcf8ff] font-[Inter]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-black text-slate-900 mb-1">Tài khoản của tôi</h1>
        <p className="text-sm text-slate-500 mb-8">Quản lý thông tin cá nhân và bảo mật</p>

        {/* Avatar & role */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6 flex flex-wrap items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-2xl font-black text-indigo-600">
              {profile?.profile?.avatarUrl ? (
                <img
                  src={toFullUrl(profile.profile.avatarUrl)}
                  alt={profile?.fullName || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile?.fullName || 'U')[0].toUpperCase()
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="font-bold text-slate-900 text-lg">{profile?.fullName}</p>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
              Khách hàng
            </span>
          </div>
          <div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              loading={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
            >
              Đổi ảnh
            </Button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
          {[{ id: 'info', label: 'Thông tin cá nhân' }, { id: 'password', label: 'Đổi mật khẩu' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Info tab */}
        {tab === 'info' && (
          <form onSubmit={handleSaveInfo} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Họ và tên</label>
              <input value={form.fullName} onChange={e => set('fullName', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Email</label>
              <input value={profile?.email} disabled
                className="w-full px-3 py-2.5 border border-slate-100 bg-slate-50 rounded-lg text-sm text-slate-400 cursor-not-allowed" />
              <p className="text-xs text-slate-400 mt-1">Email không thể thay đổi</p>
            </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Số điện thoại</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Ngày sinh</label>
                    <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Giới tính</label>
                    <select value={form.gender} onChange={e => set('gender', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- Chọn --</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                </div>

            <div className="pt-2 flex gap-3">
              <Button type="submit" loading={saving}>Lưu thay đổi</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/')}>Huỷ</Button>
            </div>
          </form>
        )}

        {/* Password tab */}
        {tab === 'password' && (
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            {[
              { key: 'currentPassword', label: 'Mật khẩu hiện tại' },
              { key: 'newPassword',     label: 'Mật khẩu mới' },
              { key: 'confirmPassword', label: 'Xác nhận mật khẩu mới' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">{label}</label>
                <input type="password" value={pwForm[key]}
                  onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${errors[key] ? 'border-red-400' : 'border-slate-200'}`} />
                {errors[key] && <p className="text-xs text-red-600 mt-1">{errors[key]}</p>}
              </div>
            ))}
            <div className="pt-2">
              <Button type="submit" loading={saving} fullWidth>Đổi mật khẩu</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
