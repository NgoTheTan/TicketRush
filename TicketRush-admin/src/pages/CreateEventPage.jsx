// src/pages/admin/CreateEventPage.jsx
import { useState, useRef } from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useCreateEventDraft } from '../contexts/CreateEventDraftContext.jsx';
import { Button, CustomSelect, DatePicker } from '../components/ui/index.jsx';

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

const Field = ({ label, name, required, errors, children }) => (
  <div>
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
  </div>
);

export default function CreateEventPage() {
  const { navigate } = useRouter();
  const { draft, setDraft, clearDraft } = useCreateEventDraft();
  const [form, setForm] = useState(() => draft?.form || { name: '', description: '', category: '', venue: '', city: '', eventDate: '', locationUrl: '' });
  const [imageFile, setImageFile] = useState(() => draft?.imageFile || null);
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tên sự kiện không được để trống';
    if (!form.category) e.category = 'Vui lòng chọn thể loại';
    if (!form.venue.trim()) e.venue = 'Địa điểm không được để trống';
    if (!form.city.trim()) e.city = 'Thành phố không được để trống';
    if (!form.eventDate) e.eventDate = 'Vui lòng chọn ngày tổ chức';
    else if (new Date(form.eventDate) <= new Date()) e.eventDate = 'Ngày tổ chức phải trong tương lai';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setDraft({ form, imageFile });
    navigate('/admin/events/new/seats');
  };

  const handleCancel = () => {
    clearDraft();
    navigate('/admin/events');
  };



  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        <button onClick={handleCancel}
          className="text-sm text-indigo-600 flex items-center gap-1 mb-6 hover:text-indigo-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
        </button>
        <h1 className="text-2xl font-black text-slate-900 mb-8">Tạo sự kiện mới</h1>

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
            <input type="file" accept="image/*" ref={fileInputRef} onChange={e => setImageFile(e.target.files[0] || null)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            {imageFile && <p className="text-xs text-slate-500 mt-2">Đã chọn: {imageFile.name}</p>}
          </Field>

          <div className="pt-2 flex gap-3">
            <Button type="submit">
              <span className="material-symbols-outlined text-[18px]">chair</span> Cấu hình ghế
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancel}>Hủy</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
