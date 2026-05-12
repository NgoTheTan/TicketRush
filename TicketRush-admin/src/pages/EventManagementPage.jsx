// src/pages/admin/EventManagementPage.jsx
import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Spinner, EmptyState, Badge, eventStatusLabel, eventStatusVariant, formatDate, showToast, useConfirm } from '../components/ui/index.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'UPCOMING', label: 'Sắp diễn ra' },
  { value: 'ON_SALE', label: 'Đang mở bán' },
  { value: 'ENDED', label: 'Đã kết thúc' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_ACTION_LABELS = {
  ON_SALE: {
    title: 'Mở bán sự kiện',
    message: 'Sự kiện sẽ được chuyển sang trạng thái đang mở bán. Người dùng sẽ có thể mua vé ngay sau đó.',
    confirmLabel: 'Mở bán ngay',
    variant: 'info',
  },
  ENDED: {
    title: 'Kết thúc sự kiện',
    message: 'Sự kiện sẽ được đánh dấu là đã kết thúc. Hành động này không thể hoàn tác.',
    confirmLabel: 'Xác nhận kết thúc',
    variant: 'warning',
  },
  CANCELLED: {
    title: 'Hủy sự kiện',
    message: 'Sự kiện sẽ bị hủy bỏ. Người dùng đã mua vé có thể bị ảnh hưởng.',
    confirmLabel: 'Xác nhận hủy',
    variant: 'danger',
  },
};

export default function EventManagementPage() {
  const { navigate } = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);
  const [actingId, setActingId] = useState(null);
  const debounceTimer = useRef(null);
  const [confirmDialog, confirm] = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await eventService.adminList({ search: search || undefined, status: statusFilter || undefined, page, size: 20 });
      setEvents(data || []); setMeta(m);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, statusFilter, page]);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setPage(0);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearch(value);
    }, 400);
  };

  const handleStatusChange = async (eventId, newStatus) => {
    const cfg = STATUS_ACTION_LABELS[newStatus] || {
      title: 'Xác nhận thay đổi trạng thái',
      message: 'Bạn có chắc chắn muốn thay đổi trạng thái sự kiện này không?',
      confirmLabel: 'Xác nhận',
      variant: 'info',
    };
    const ok = await confirm(cfg);
    if (!ok) return;
    setActingId(eventId);
    try {
      await eventService.adminChangeStatus(eventId, newStatus);
      showToast('Đã cập nhật trạng thái sự kiện thành công', 'success');
      load();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setActingId(null); }
  };

  const handleDelete = async (eventId, eventName) => {
    const ok = await confirm({
      title: 'Xoá sự kiện',
      message: `Bạn có chắc chắn muốn xoá sự kiện "${eventName}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xoá sự kiện',
      cancelLabel: 'Giữ lại',
      variant: 'danger',
    });
    if (!ok) return;
    setActingId(eventId);
    try {
      await eventService.adminDelete(eventId);
      showToast('Đã xoá sự kiện thành công', 'success');
      load();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setActingId(null); }
  };

  const nextStatus = (s) => ({ UPCOMING: 'ON_SALE', ON_SALE: 'ENDED' }[s]);

  return (
    <AdminLayout>
      {confirmDialog}
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-slate-900">Quản lý Sự kiện</h1>
          <button onClick={() => navigate('/admin/events/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tạo sự kiện
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input value={searchInput} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Tìm sự kiện..." className="flex-1 text-sm outline-none" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : events.length === 0 ? (
          <EmptyState icon="📅" title="Không có sự kiện nào" action={
            <button onClick={() => navigate('/admin/events/new')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Tạo sự kiện đầu tiên</button>
          } />
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-6 py-3">Sự kiện</th>
                  <th className="px-6 py-3">Ngày</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3">Ghế</th>
                  <th className="px-6 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {events.map(e => (
                  <tr
                    key={e.id}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors relative group"
                    onClick={() => navigate(`/admin/events/${e.id}/view`)}
                  >
                     <td className="px-6 py-4">
                       <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                         {e.name}
                         <span className="material-symbols-outlined text-[14px] text-slate-300 group-hover:text-indigo-400 transition-colors">open_in_new</span>
                       </p>
                       <p className="text-xs text-slate-400 mt-0.5">{e.venue}</p>
                     </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{formatDate(e.eventDate)}</td>
                    <td className="px-6 py-4"><Badge label={eventStatusLabel(e.status)} variant={eventStatusVariant(e.status)} /></td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{e.soldSeats ?? 0}/{e.totalSeats ?? '—'}</td>
                    <td className="px-6 py-4 relative z-10" onClick={ev => ev.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/admin/events/${e.id}/seats`)}
                            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 bg-white">
                            Cấu hình ghế
                          </button>
                          {nextStatus(e.status) && (
                            <button onClick={() => handleStatusChange(e.id, nextStatus(e.status))}
                              disabled={actingId === e.id}
                              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                              {e.status === 'UPCOMING' ? 'Mở bán' : 'Kết thúc'}
                            </button>
                          )}
                          {(e.status === 'UPCOMING' || e.status === 'ON_SALE') && (
                            <button onClick={() => handleStatusChange(e.id, 'CANCELLED')}
                              disabled={actingId === e.id}
                              className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 bg-white disabled:opacity-50">
                              Hủy
                            </button>
                          )}
                          {(e.status === 'UPCOMING' || e.status === 'CANCELLED' || e.status === 'ENDED') && (
                            <button
                              onClick={() => handleDelete(e.id, e.name)}
                              disabled={actingId === e.id}
                              title="Xoá sự kiện"
                              className="flex items-center justify-center w-8 h-8 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-400 hover:text-red-700 bg-white disabled:opacity-50 transition-colors">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
                <button disabled={!meta.hasPrevious} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-slate-200 rounded text-xs disabled:opacity-40">← Trước</button>
                <span className="px-3 py-1.5 text-xs text-slate-500">Trang {meta.page + 1}/{meta.totalPages}</span>
                <button disabled={!meta.hasNext} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-slate-200 rounded text-xs disabled:opacity-40">Tiếp →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
