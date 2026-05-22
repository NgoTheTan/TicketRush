// src/pages/admin/OrderManagementPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { orderService } from '../api/services.js';
import { Spinner, EmptyState, Badge, formatCurrency, formatDate, showToast, CustomSelect, Pagination } from '../components/ui/index.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { useRouter } from '../contexts/RouterContext.jsx';

const STATUS_OPTS = [
  { value: '', label: 'Tất cả' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'EXPIRED', label: 'Hết hạn' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const statusVariant = s => ({ PAID:'success', PENDING:'warning', EXPIRED:'default', CANCELLED:'error' }[s]||'default');
const statusLabel   = s => ({ PAID:'Đã thanh toán', PENDING:'Chờ xử lý', EXPIRED:'Hết hạn', CANCELLED:'Đã hủy' }[s]||s);

// ── WS Status Indicator ───────────────────────────────────────
function WsIndicator({ connected, newCount }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full transition-all
      ${connected ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-slate-400 bg-slate-100'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
      {connected ? 'Live' : 'Offline'}
      {newCount > 0 && (
        <span className="ml-1 bg-indigo-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold animate-bounce">
          +{newCount}
        </span>
      )}
    </div>
  );
}

// ── Order Detail Modal ────────────────────────────────────────
export function OrderDetailModal({ orderId, onClose, onStatusChange }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    orderService.adminGetOrder(orderId)
      .then(setOrder)
      .catch(err => { showToast(err.message, 'error'); onClose(); })
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleAdminCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await orderService.adminCancelOrder(orderId);
      showToast('Đã hủy đơn hàng thành công', 'success');
      onStatusChange?.();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-900">Chi tiết đơn hàng</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : order ? (
          <div className="p-6 space-y-5">
            {/* Order info */}
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono font-black text-indigo-600 text-lg">{order.orderCode}</p>
                <p className="text-xs text-slate-400 mt-0.5">Tạo lúc {formatDate(order.createdAt)}</p>
              </div>
              <Badge label={statusLabel(order.status)} variant={statusVariant(order.status)} />
            </div>

            {/* Customer */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2">Khách hàng</p>
              <p className="font-semibold text-slate-800">{order.customer?.fullName || '—'}</p>
              <p className="text-sm text-slate-500">{order.customer?.email}</p>
              {order.customer?.phone && <p className="text-sm text-slate-500">{order.customer.phone}</p>}
            </div>

            {/* Event */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2">Sự kiện</p>
              <p className="font-semibold text-slate-800">{order.event?.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">{order.event?.venue}</p>
              <p className="text-sm text-slate-500">{formatDate(order.event?.eventDate)}</p>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2">Ghế đặt</p>
              <div className="space-y-2">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-indigo-800">{item.zoneName}</p>
                      <p className="text-xs text-indigo-600">Hàng {item.rowLabel} — Ghế {item.seatNumber}</p>
                      {item.ticket && (
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Vé: {item.ticket.ticketCode?.slice(0,8).toUpperCase()}...
                          <span className={`ml-2 font-semibold ${item.ticket.status === 'VALID' ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {item.ticket.status}
                          </span>
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-indigo-700">{formatCurrency(item.unitPrice)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <span className="font-bold text-slate-900">Tổng thanh toán</span>
              <span className="text-xl font-black text-emerald-600">{formatCurrency(order.totalAmount)}</span>
            </div>

            {order.paidAt && (
              <p className="text-xs text-slate-400 text-right">Thanh toán lúc {formatDate(order.paidAt)}</p>
            )}

            {/* Admin cancel action */}
            {order.status === 'PENDING' && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleAdminCancel}
                  disabled={cancelling}
                  className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {cancelling ? 'Đang hủy...' : '✕ Hủy đơn hàng này'}
                </button>
                <p className="text-xs text-slate-400 text-center mt-1">
                  Ghế sẽ được trả lại để người khác có thể đặt
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function OrderManagementPage() {
  const { params } = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params?.search || '');
  const [searchInput, setSearchInput] = useState(params?.search || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const debounceTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await orderService.adminListOrders({
        search: search || undefined,
        status: statusFilter || undefined,
        page, size: 20,
      });
      setOrders(data || []);
      setMeta(m);
      setNewOrderCount(0); // reset badge khi đã reload
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setLoading(false); }
  }, [search, statusFilter, page]);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setPage(0);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearch(value);
    }, 400);
  };

  useEffect(() => { load(); }, [load]);

  // ── WebSocket: nhận cập nhật đơn hàng real-time ──────────
  const handleWsMessage = useCallback((msg) => {
    if (!msg.orderId) return;

    // Cập nhật order trong list nếu đang hiển thị
    setOrders(prev => {
      const exists = prev.some(o => o.orderId === msg.orderId);

      // Nếu đơn hàng mới tạo hoặc vừa được thanh toán thành công
      if (msg.type === 'ORDER_CREATED' || msg.type === 'ORDER_PAID') {
        // Thêm vào đầu danh sách nếu tab hiện tại là Tất cả hoặc khớp với status
        if (!statusFilter || statusFilter === msg.status) {
          if (!exists) {
            setNewOrderCount(c => c + 1);
            const newOrder = {
              orderId: msg.orderId,
              orderCode: msg.orderCode,
              status: msg.status,
              totalAmount: msg.totalAmount,
              customer: { fullName: msg.customerName, email: msg.customerEmail },
              event: { name: msg.eventName },
              createdAt: msg.timestamp,
              paidAt: msg.type === 'ORDER_PAID' ? msg.timestamp : null,
            };
            return [newOrder, ...prev.slice(0, 19)]; // giữ tối đa 20
          }
        }
      }

      if (exists) {
        // Cập nhật status của order đã có
        return prev.map(o =>
          o.orderId === msg.orderId
            ? { ...o, status: msg.status, paidAt: msg.type === 'ORDER_PAID' ? msg.timestamp : o.paidAt }
            : o
        );
      }

      return prev;
    });
  }, [statusFilter]);

  // Subscribe tới global order topic (tất cả events)
  useWebSocket('/topic/admin/orders/global', handleWsMessage, true,
    useCallback(() => setWsConnected(true), []));


  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Quản lý Đơn hàng</h1>
            {meta && <p className="text-sm text-slate-500 mt-1">{meta.totalElements} đơn hàng</p>}
          </div>
          <div className="flex items-center gap-3">
            <WsIndicator connected={wsConnected} newCount={newOrderCount} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input value={searchInput} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Tìm theo mã đơn, email..." className="flex-1 text-sm outline-none" />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            options={STATUS_OPTS}
          />
        </div>

        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : orders.length === 0 ? <EmptyState icon="📋" title="Không có đơn hàng nào" />
          : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-6 py-3">Mã đơn</th>
                  <th className="px-6 py-3">Khách hàng</th>
                  <th className="px-6 py-3">Sự kiện</th>
                  <th className="px-6 py-3">Tổng tiền</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map(o => (
                  <tr key={o.orderId}
                    onClick={() => setSelectedOrderId(o.orderId)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors
                      ${o.status === 'PENDING' ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">{o.orderCode}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800 text-xs">{o.customer?.fullName || '—'}</p>
                      <p className="text-xs text-slate-400">{o.customer?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-[150px] truncate">{o.event?.name || '—'}</td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-900">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-6 py-4"><Badge label={statusLabel(o.status)} variant={statusVariant(o.status)} /></td>
                    <td className="px-6 py-4 text-xs text-slate-400">{formatDate(o.paidAt || o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {meta && meta.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination meta={meta} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusChange={load}
        />
      )}
    </AdminLayout>
  );
}
