// src/pages/admin/AdminDashboardPage.jsx — Sprint 4: Real dashboard analytics
import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { useRouter } from '../../contexts/RouterContext.jsx';
import eventService from '../../api/eventService.js';
import { dashboardService } from '../../api/services.js';
import { formatCurrency, formatDate, Spinner, EmptyState } from '../../components/ui/index.jsx';

function StatCard({ icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function FillBar({ label, pct, color }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color || '#6366f1' }} />
      </div>
    </div>
  );
}

function GenderBar({ gender, count, percentage }) {
  const genderLabel = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }[gender] || gender;
  const colors = { MALE: '#6366f1', FEMALE: '#ec4899', OTHER: '#10b981' };
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs text-slate-500 w-8">{genderLabel}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: colors[gender] || '#94a3b8' }} />
      </div>
      <span className="text-xs text-slate-600 font-medium w-12 text-right">{percentage.toFixed(1)}%</span>
      <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { navigate } = useRouter();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashLoading, setDashLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load event list on mount
  useEffect(() => {
    eventService.adminList({ size: 50 })
      .then(({ data }) => {
        setEvents(data || []);
        if (data?.length > 0) setSelectedEventId(data[0].id);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loadDashboard = useCallback(async (eventId) => {
    if (!eventId) return;
    setDashLoading(true);
    try {
      const data = await dashboardService.getDashboard(eventId);
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally { setDashLoading(false); }
  }, []);

  // Load dashboard when event selected
  useEffect(() => {
    if (selectedEventId) loadDashboard(selectedEventId);
  }, [selectedEventId, loadDashboard]);

  // Polling every 5 seconds
  useEffect(() => {
    if (!selectedEventId) return;
    const id = setInterval(() => loadDashboard(selectedEventId), 5000);
    return () => clearInterval(id);
  }, [selectedEventId, loadDashboard]);

  const s = dashboard?.summary;

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Tổng quan hoạt động hệ thống</p>
          </div>
          {/* Event selector */}
          {events.length > 0 && (
            <select value={selectedEventId || ''} onChange={e => setSelectedEventId(Number(e.target.value))}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : events.length === 0 ? (
            <EmptyState icon="📅" title="Chưa có sự kiện nào"
              action={<button onClick={() => navigate('/admin/events/new')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Tạo sự kiện đầu tiên</button>} />
          ) : (
          <>
            {dashLoading && !dashboard && <div className="flex justify-center py-12"><Spinner /></div>}

            {dashboard && s && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard icon="payments" label="Tổng doanh thu" color="green"
                    value={formatCurrency(s.totalRevenue)} sub="Chỉ tính đơn đã thanh toán" />
                  <StatCard icon="chair" label="Tỷ lệ lấp đầy" color="amber"
                    value={`${s.fillRate.toFixed(1)}%`} sub={`${s.soldSeats}/${s.totalSeats} ghế`} />
                  <StatCard icon="event" label="Sự kiện đang xem" color="indigo"
                    value={dashboard.eventName.length > 20 ? dashboard.eventName.slice(0, 20) + '…' : dashboard.eventName} />
                  <StatCard icon="lock" label="Ghế đang giữ" color="red"
                    value={s.lockedSeats} sub="Sẽ release sau 10 phút" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Fill rate by zone */}
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h2 className="font-bold text-slate-900 text-sm mb-4">Lấp đầy theo khu vực</h2>
                    {dashboard.fillRateByZone.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu</p>
                      : dashboard.fillRateByZone.map(z => (
                        <FillBar key={z.zoneId} label={z.zoneName} pct={z.fillRate} />
                      ))}
                  </div>

                  {/* Gender breakdown */}
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h2 className="font-bold text-slate-900 text-sm mb-4">Phân tích giới tính</h2>
                    {dashboard.audienceByGender.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu</p>
                      : dashboard.audienceByGender.map(g => (
                        <GenderBar key={g.gender} {...g} />
                      ))}
                  </div>

                  {/* Age breakdown */}
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h2 className="font-bold text-slate-900 text-sm mb-4">Phân tích độ tuổi</h2>
                    {dashboard.audienceByAge.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu</p>
                      : dashboard.audienceByAge.map(a => (
                        <FillBar key={a.ageGroup} label={a.ageGroup} pct={a.percentage} color="#10b981" />
                      ))}
                  </div>
                </div>

                {/* Revenue by hour */}
                {dashboard.revenueByHour.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
                    <h2 className="font-bold text-slate-900 text-sm mb-4">Doanh thu theo giờ</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="text-slate-400 uppercase tracking-wide">
                          <th className="text-left pb-2">Giờ</th>
                          <th className="text-right pb-2">Vé bán</th>
                          <th className="text-right pb-2">Doanh thu</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {dashboard.revenueByHour.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2 text-slate-600">{formatDate(r.hour)}</td>
                              <td className="py-2 text-right font-semibold">{r.ticketsSold}</td>
                              <td className="py-2 text-right font-bold text-emerald-600">{formatCurrency(r.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent orders */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900">Đơn hàng gần đây</h2>
                    <button onClick={() => navigate('/admin/orders')} className="text-sm text-indigo-600 font-medium">Xem tất cả</button>
                  </div>
                  {dashboard.recentOrders.length === 0
                    ? <p className="text-sm text-slate-400 text-center py-10">Chưa có đơn hàng nào</p>
                    : <div className="divide-y divide-slate-50">
                      {dashboard.recentOrders.map(o => (
                        <div key={o.orderId} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                          <div>
                            <p className="font-mono text-sm font-bold text-slate-700">{o.orderCode}</p>
                            <p className="text-xs text-slate-400">{o.customerName} — {o.customerEmail}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(o.totalAmount)}</p>
                            <p className="text-xs text-slate-400">{o.ticketCount} vé • {formatDate(o.paidAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                </div>

                {/* Zone revenue table */}
                {dashboard.fillRateByZone.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm mt-6">
                    <div className="px-6 py-4 border-b border-slate-100">
                      <h2 className="font-bold text-slate-900">Doanh thu theo khu vực</h2>
                    </div>
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-slate-400 uppercase tracking-wide text-left">
                        <th className="px-6 py-3">Khu vực</th>
                        <th className="px-6 py-3">Tổng ghế</th>
                        <th className="px-6 py-3">Đã bán</th>
                        <th className="px-6 py-3">Lấp đầy</th>
                        <th className="px-6 py-3">Doanh thu</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {dashboard.fillRateByZone.map(z => (
                          <tr key={z.zoneId} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-semibold text-slate-800">{z.zoneName}</td>
                            <td className="px-6 py-3 text-slate-600">{z.totalSeats}</td>
                            <td className="px-6 py-3 text-slate-600">{z.soldSeats}</td>
                            <td className="px-6 py-3">
                              <span className={`font-semibold ${z.fillRate > 75 ? 'text-emerald-600' : z.fillRate > 40 ? 'text-amber-600' : 'text-slate-600'}`}>
                                {z.fillRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-3 font-bold text-emerald-600">{formatCurrency(z.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
