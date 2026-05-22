// src/components/ui/Pagination.jsx
// Hiển thị danh sách số trang kiểu: 1 2 3 ... 8 9 10

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  const current = meta.page;        // 0-indexed
  const total = meta.totalPages;

  // Build page number list with ellipsis
  const buildPages = () => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages = [];
    // Always show first page
    pages.push(0);
    if (current > 3) pages.push('...');
    // Window around current
    const start = Math.max(1, current - 2);
    const end = Math.min(total - 2, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 4) pages.push('...');
    // Always show last page
    pages.push(total - 1);
    return pages;
  };

  const pages = buildPages();

  return (
    <div className="flex items-center justify-center gap-1 mt-10 flex-wrap">
      {/* Prev */}
      <button
        disabled={!meta.hasPrevious}
        onClick={() => onPageChange(current - 1)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Trang trước"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="inline-flex h-9 w-9 items-center justify-center text-sm text-slate-400 select-none">
            ···
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition-all ${
              page === current
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'
            }`}
            aria-current={page === current ? 'page' : undefined}
          >
            {page + 1}
          </button>
        )
      )}

      {/* Next */}
      <button
        disabled={!meta.hasNext}
        onClick={() => onPageChange(current + 1)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Trang tiếp"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  );
}
