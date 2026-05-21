// src/pages/admin/EditEventPage.jsx
import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Button, CustomSelect, DatePicker, showToast, Spinner, ErrorState } from '../components/ui/index.jsx';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const toFullUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

const CATEGORY_OPTIONS = [
  { value: '', label: 'Chọn thể loại' },
  { value: 'Ca nhạc', label: 'Ca nhạc' },
  { value: 'Sân khấu & Nghệ thuật', label: 'Sân khấu & Nghệ thuật' },
  { value: 'Thể thao', label: 'Thể thao' },
  { value: 'Hội thảo & Workshop', label: 'Hội thảo & Workshop' },
  { value: 'Tham quan & Trải nghiệm', label: 'Tham quan & Trải nghiệm' },
  { value: 'Khác', label: 'Khác' },
];

const CITY_OPTIONS = [
  { value: '', label: 'Chọn thành phố' },
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'Thành phố Hồ Chí Minh', label: 'Thành phố Hồ Chí Minh' },
  { value: 'Vị trí khác', label: 'Vị trí khác' },
];

const normalizeCityOption = (city) => {
  const normalized = (city || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'hà nội') return 'Hà Nội';
  if (['thành phố hồ chí minh', 'tp. hồ chí minh', 'tp hồ chí minh', 'hồ chí minh'].includes(normalized)) {
    return 'Thành phố Hồ Chí Minh';
  }
  return 'Vị trí khác';
};

const Field = ({ label, name, required, errors, children }) => (
  <div>
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
  </div>
);

const toDatetimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function EditEventPage({ eventId }) {
  const { navigate, goBack } = useRouter();
  const [form, setForm] = useState({ name: '', description: '', category: '', venue: '', city: '', eventDate: '', locationUrl: '', imageUrl: '' });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  useEffect(() => {
    eventService.adminGetEvent(eventId)
      .then(data => {
        setForm({
          name: data.name || '',
          description: data.description || '',
          category: data.category || '',
          venue: data.venue || '',
          city: normalizeCityOption(data.city),
          eventDate: toDatetimeLocal(data.eventDate),
          locationUrl: data.locationUrl || '',
          imageUrl: data.imageUrl || ''
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setInitLoading(false));
  }, [eventId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tên sự kiện không được để trống';
    if (!form.category) e.category = 'Vui lòng chọn thể loại';
    if (!form.venue.trim()) e.venue = 'Địa điểm không được để trống';
    if (!form.city.trim()) e.city = 'Thành phố không được để trống';
    if (!form.eventDate) e.eventDate = 'Vui lòng chọn ngày tổ chức';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      let finalImageUrl = form.imageUrl;
      if (imageFile) {
        const uploadResult = await eventService.adminUploadImage(imageFile);
        finalImageUrl = uploadResult.url;
      }

      await eventService.adminUpdate(eventId, {
        ...form,
        imageUrl: finalImageUrl,
        eventDate: new Date(form.eventDate).toISOString(),
      });
      showToast('Đã cập nhật sự kiện thành công!', 'success');
      navigate(`/admin/events/${eventId}/view`);
    } catch (err) {
      showToast(err.message, 'error');
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally { setLoading(false); }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        <button onClick={goBack}
          className="text-sm text-indigo-600 flex items-center gap-1 mb-6 hover:text-indigo-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
        </button>
        <h1 className="text-2xl font-black text-slate-900 mb-8">Chỉnh sửa sự kiện</h1>

        {initLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <Field label="Tên sự kiện" name="name" required errors={errors}>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Summer Music Festival 2026"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? 'border-red-400' : 'border-slate-200'}`} />
            </Field>

            <Field label="Mô tả" name="description" errors={errors}>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={4} placeholder="Mô tả chi tiết về sự kiện..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </Field>

            <Field label="Thể loại" name="category" required errors={errors}>
              <CustomSelect
                value={form.category}
                onChange={e => set('category', e.target.value)}
                options={CATEGORY_OPTIONS}
                placeholderValue=""
                className={errors.category ? 'rounded-xl ring-1 ring-red-400' : ''}
              />
            </Field>

            <Field label="Địa điểm" name="venue" required errors={errors}>
              <input value={form.venue} onChange={e => set('venue', e.target.value)}
                placeholder="Nhà hát lớn Hà Nội"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.venue ? 'border-red-400' : 'border-slate-200'}`} />
            </Field>

            <Field label="Thành phố" name="city" required errors={errors}>
              <CustomSelect
                value={form.city}
                onChange={e => set('city', e.target.value)}
                options={CITY_OPTIONS}
                placeholderValue=""
                className={errors.city ? 'rounded-xl ring-1 ring-red-400' : ''}
              />
            </Field>

            <Field label="Ngày & giờ tổ chức" name="eventDate" required errors={errors}>
              <DatePicker
                mode="datetime"
                value={form.eventDate}
                onChange={(value) => set('eventDate', value)}
                error={Boolean(errors.eventDate)}
                placeholder="Chọn ngày và giờ tổ chức"
              />
            </Field>

            <Field label="URL địa chỉ (Google Maps)" name="locationUrl" errors={errors}>
              <input value={form.locationUrl} onChange={e => set('locationUrl', e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </Field>

            <Field label="Ảnh Banner" name="imageFile" errors={errors}>
              {form.imageUrl && !imageFile && (
                <div className="mb-2 w-32 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={toFullUrl(form.imageUrl)} alt="Current banner" className="w-full h-full object-cover" />
                </div>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={e => setImageFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              {imageFile && <p className="text-xs text-slate-500 mt-2">Đã chọn ảnh mới: {imageFile.name}</p>}
              {!imageFile && form.imageUrl && <p className="text-xs text-slate-500 mt-2">Chọn ảnh mới để thay thế ảnh hiện tại</p>}
            </Field>

            <div className="pt-2 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3">
                <Button type="submit" loading={loading}>Lưu thay đổi</Button>
              <Button type="button" variant="secondary" onClick={goBack}>Hủy</Button>
              </div>
              <button type="button" onClick={() => navigate(`/admin/events/${eventId}/seats`)}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">chair</span> Cấu hình ghế
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
