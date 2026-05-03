// src/pages/admin/SeatLayoutConfigPage.jsx
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';
import eventService from '../../api/eventService.js';
import { Button, Spinner, formatCurrency, showToast } from '../../components/ui/index.jsx';

const ZONE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function ZoneConfig({ zone, index, onChange, onRemove }) {
  const set = (k, v) => onChange(index, { ...zone, [k]: v });
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm cursor-pointer"
            style={{ backgroundColor: zone.colorCode }}
            onClick={() => {
              const next = ZONE_COLORS[(ZONE_COLORS.indexOf(zone.colorCode) + 1) % ZONE_COLORS.length];
              set('colorCode', next);
            }} />
          <span className="font-semibold text-sm text-slate-700">Khu vực {index + 1}</span>
        </div>
        <button onClick={() => onRemove(index)} className="text-xs text-red-500 hover:text-red-700">Xóa</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Tên khu vực *</label>
          <input value={zone.name} onChange={e => set('name', e.target.value)}
            placeholder="Khu A - VIP"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Giá vé (VND) *</label>
          <input type="number" value={zone.price} onChange={e => set('price', Number(e.target.value))}
            placeholder="500000" min="0"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Số hàng *</label>
          <input type="number" value={zone.totalRows} onChange={e => set('totalRows', Number(e.target.value))}
            min="1" max="30"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Ghế/hàng *</label>
          <input type="number" value={zone.seatsPerRow} onChange={e => set('seatsPerRow', Number(e.target.value))}
            min="1" max="50"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div className="text-xs text-slate-400">
        Tổng: <strong className="text-slate-600">{(zone.totalRows || 0) * (zone.seatsPerRow || 0)} ghế</strong>
        {zone.price > 0 && <> — Giá: <strong className="text-indigo-600">{formatCurrency(zone.price)}</strong></>}
      </div>
    </div>
  );
}

export default function SeatLayoutConfigPage({ eventId }) {
  const { navigate } = useRouter();
  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([{ name: '', price: 0, totalRows: 5, seatsPerRow: 10, colorCode: ZONE_COLORS[0] }]);
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      eventService.get(eventId),
      eventService.getSeatZones(eventId).catch(() => []),
    ]).then(([ev, zns]) => {
      setEvent(ev);
      if (zns && zns.length > 0) {
        setExisting(zns);
        setZones(zns.map(z => ({
          name: z.name, price: z.price, totalRows: z.totalRows, seatsPerRow: z.seatsPerRow, colorCode: z.colorCode || ZONE_COLORS[0]
        })));
      }
    }).catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [eventId]);

  const addZone = () => setZones(z => [...z, {
    name: '', price: 0, totalRows: 5, seatsPerRow: 10, colorCode: ZONE_COLORS[z.length % ZONE_COLORS.length]
  }]);

  const updateZone = (i, val) => setZones(z => z.map((x, idx) => idx === i ? val : x));
  const removeZone = (i) => setZones(z => z.filter((_, idx) => idx !== i));

  const totalSeats = zones.reduce((s, z) => s + (z.totalRows || 0) * (z.seatsPerRow || 0), 0);

  const handleSave = async () => {
    const invalid = zones.find(z => !z.name || !z.price || !z.totalRows || !z.seatsPerRow);
    if (invalid) { showToast('Vui lòng điền đầy đủ thông tin cho tất cả khu vực', 'error'); return; }

    if (!confirm(`Xác nhận lưu cấu hình ${zones.length} khu vực — ${totalSeats} ghế?\n\nLưu ý: Thao tác này sẽ xóa cấu hình ghế cũ.`)) return;
    setSaving(true);
    try {
      await eventService.saveSeatZones(eventId, zones);
      showToast('Đã lưu cấu hình ghế thành công!', 'success');
      navigate('/admin/events');
    } catch (err) {
      if (err.code === 'SEAT_CONFIG_LOCKED') showToast('Không thể thay đổi cấu hình khi sự kiện đang mở bán', 'error');
      else showToast(err.message, 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></AdminLayout>;

  const canEdit = !event || event.status === 'UPCOMING';

  return (
    <AdminLayout>
      <div className="p-8 max-w-3xl">
        <button onClick={() => navigate('/admin/events')} className="text-sm text-indigo-600 flex items-center gap-1 mb-4 hover:text-indigo-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">Cấu hình sơ đồ ghế</h1>
          {event && <p className="text-sm text-slate-500 mt-1">{event.name}</p>}
        </div>

        {!canEdit && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
            <span className="material-symbols-outlined text-amber-500">warning</span>
            <p className="text-sm text-amber-700">Sự kiện đang <strong>{event?.status}</strong> — không thể thay đổi cấu hình ghế.</p>
          </div>
        )}

        {existing.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            ℹ️ Đang chỉnh sửa cấu hình hiện có ({existing.length} khu vực, {existing.reduce((s, z) => s + z.totalSeats, 0)} ghế).
          </div>
        )}

        <div className="space-y-4 mb-6">
          {zones.map((zone, i) => (
            <ZoneConfig key={i} zone={zone} index={i} onChange={updateZone} onRemove={removeZone} />
          ))}
        </div>

        {canEdit && (
          <button onClick={addZone} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[18px]">add</span> Thêm khu vực
          </button>
        )}

        {totalSeats > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex justify-between items-center">
            <span className="text-sm font-semibold text-indigo-800">Tổng cộng</span>
            <span className="text-xl font-black text-indigo-600">{totalSeats} ghế</span>
          </div>
        )}

        {canEdit && (
          <div className="flex gap-3">
            <Button onClick={handleSave} loading={saving}>
              <span className="material-symbols-outlined text-[16px]">save</span>
              Lưu cấu hình ghế
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/events')}>Hủy</Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
