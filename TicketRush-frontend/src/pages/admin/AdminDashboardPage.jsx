// src/pages/admin/AdminDashboardPage.jsx
// ⚠️ Dashboard analytics (Sprint 4) NOT YET IMPLEMENTED on backend
// Revenue/fill rate/audience data shown as MOCK. See FRONTEND_BACKEND_GAPS.md
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';
import eventService from '../../api/eventService.js';
import { orderService } from '../../api/services.js';
import { formatCurrency, Spinner } from '../../components/ui/index.jsx';

const MOCK_LABEL = '— (mock)';

function StatCard({ icon, label, value, sub, color = 'indigo', mock }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">{label}</p>
          {mock && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-medium">Mock</span>}
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { navigate } = useRouter();
  const [events, setEvents] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eventService.adminList({ size: 10 }).catch(() => ({ data: [] })),
      orderService.adminListOrders({ size: 5 }).catch(() => ({ data: [] })),
    ]).then(([evRes, orRes]) => {
      setEvents(evRes.data || []);
      setRecentOrders(orRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const onSaleCount = events.filter(e => e.status === 'ON_SALE').length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Tổng quan hoạt động hệ thống</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Analytics (Sprint 4) — đang dùng mock
          </div>
        </div>

        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon="event" label="Sự kiện đang mở bán" value={onSaleCount} color="indigo" />
              <StatCard icon="payments" label="Doanh thu (hôm nay)" value={MOCK_LABEL} color="green" mock />
              <StatCard icon="chair" label="Tỷ lệ lấp đầy" value={MOCK_LABEL} color="amber" mock />
              <StatCard icon="receipt_long" label="Đơn hàng mới" value={recentOrders.length} color="indigo" sub="Trong danh sách gần đây" />
            </div>

            {/* Events table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-6">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">Sự kiện gần đây</h2>
                <button onClick={() => navigate('/admin/events')} className="text-sm text-indigo-600 font-medium">Xem tất cả</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-6 py-3">Sự kiện</th>
                      <th className="px-6 py-3">Trạng thái</th>
                      <th className="px-6 py-3">Ghế bán</th>
                      <th className="px-6 py-3">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {events.slice(0, 5).map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/events/${e.id}`)}>
                        <td className="px-6 py-3 font-medium text-slate-800">{e.name}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                            ${e.status === 'ON_SALE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600">{e.soldSeats ?? 0} / {e.totalSeats ?? '—'}</td>
                        <td className="px-6 py-3 font-semibold text-slate-700 italic text-xs text-slate-400">mock</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">Đơn hàng gần đây</h2>
                <button onClick={() => navigate('/admin/orders')} className="text-sm text-indigo-600 font-medium">Xem tất cả</button>
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">Chưa có đơn hàng nào</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {recentOrders.map(o => (
                    <div key={o.orderId} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                      <div>
                        <p className="font-mono text-sm font-semibold text-slate-700">{o.orderCode}</p>
                        <p className="text-xs text-slate-400">{o.customer?.fullName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-slate-800">{formatCurrency(o.totalAmount)}</p>
                        <span className={`text-xs font-semibold ${o.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
