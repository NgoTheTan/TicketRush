// src/pages/admin/CreateEventPage.jsx
import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';
import eventService from '../../api/eventService.js';
import { Button, showToast } from '../../components/ui/index.jsx';

export default function CreateEventPage() {
  const { navigate } = useRouter();
  const [form, setForm] = useState({ name: '', description: '', venue: '', eventDate: '', imageUrl: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tên sự kiện không được để trống';
    if (!form.venue.trim()) e.venue = 'Địa điểm không được để trống';
    if (!form.eventDate) e.eventDate = 'Vui lòng chọn ngày tổ chức';
    else if (new Date(form.eventDate) <= new Date()) e.eventDate = 'Ngày tổ chức phải trong tương lai';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const event = await eventService.adminCreate({
        ...form,
        eventDate: new Date(form.eventDate).toISOString(),
      });
      showToast('Đã tạo sự kiện thành công!', 'success');
      navigate(`/admin/events/${event.id}/seats`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setLoading(false); }
  };

  const Field = ({ label, name, required, children }) => (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        <button onClick={() => navigate('/admin/events')}
          className="text-sm text-indigo-600 flex items-center gap-1 mb-6 hover:text-indigo-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
        </button>
        <h1 className="text-2xl font-black text-slate-900 mb-8">Tạo sự kiện mới</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
          <Field label="Tên sự kiện" name="name" required>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Summer Music Festival 2026"
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? 'border-red-400' : 'border-slate-200'}`} />
          </Field>

          <Field label="Mô tả" name="description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Mô tả chi tiết về sự kiện..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </Field>

          <Field label="Địa điểm" name="venue" required>
            <input value={form.venue} onChange={e => set('venue', e.target.value)}
              placeholder="Nhà hát lớn Hà Nội"
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.venue ? 'border-red-400' : 'border-slate-200'}`} />
          </Field>

          <Field label="Ngày & giờ tổ chức" name="eventDate" required>
            <input type="datetime-local" value={form.eventDate} onChange={e => set('eventDate', e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.eventDate ? 'border-red-400' : 'border-slate-200'}`} />
          </Field>

          <Field label="URL ảnh banner" name="imageUrl">
            <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </Field>

          <div className="pt-2 flex gap-3">
            <Button type="submit" loading={loading}>Tạo sự kiện</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/events')}>Hủy</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
