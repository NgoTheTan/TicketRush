// src/components/ui/index.jsx
// Shared reusable UI primitives

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin ${className}`} />
  );
}

// ── Loading screen ────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf8ff]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">Đang tải...</p>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <span className="text-5xl">{icon}</span>
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <span className="text-4xl">⚠️</span>
      <p className="text-sm text-red-600 max-w-sm">{message || 'Đã có lỗi xảy ra'}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          Thử lại
        </button>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ label, variant = 'default' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default}`}>
      {label}
    </span>
  );
}

// ── Toast notification ────────────────────────────────────────
let _setToast = null;
export function ToastContainer() {
  const [toast, setToast] = useState(null);
  _setToast = setToast;
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-full px-4">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white
        ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
        <span>{toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}</span>
        <span className="flex-1">{toast.message}</span>
        <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}

import { useState } from 'react';

export function showToast(message, type = 'info') {
  if (_setToast) {
    _setToast({ message, type });
    setTimeout(() => _setToast(null), 4000);
  }
}

// ── Button ────────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', disabled, loading, className = '', type = 'button', fullWidth = false }) {
  const base = `inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-indigo-600 hover:bg-indigo-50',
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, icon, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 border rounded-lg text-sm
            ${error ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-indigo-500'}
            focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${props.className || ''}`}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, error, options = [], ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>}
      <select
        {...props}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm
          ${error ? 'border-red-400' : 'border-slate-200'}
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${props.className || ''}`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Format helpers ─────────────────────────────────────────────
export function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso));
}

export function eventStatusLabel(status) {
  return { UPCOMING: 'Sắp diễn ra', ON_SALE: 'Đang mở bán', ENDED: 'Đã kết thúc', CANCELLED: 'Đã hủy' }[status] || status;
}

export function eventStatusVariant(status) {
  return { UPCOMING: 'info', ON_SALE: 'success', ENDED: 'default', CANCELLED: 'error' }[status] || 'default';
}

export function orderStatusLabel(status) {
  return { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy' }[status] || status;
}
