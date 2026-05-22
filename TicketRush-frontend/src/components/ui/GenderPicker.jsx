import { useEffect, useRef, useState } from 'react';

const GENDER_OPTIONS = [
  {
    value: 'MALE',
    label: 'Nam',
    icon: 'male',
    color: 'text-blue-600',
    activeBg: 'bg-blue-50',
    activeRing: 'ring-blue-200',
    activeBorder: 'border-blue-400',
  },
  {
    value: 'FEMALE',
    label: 'Nữ',
    icon: 'female',
    color: 'text-pink-500',
    activeBg: 'bg-pink-50',
    activeRing: 'ring-pink-200',
    activeBorder: 'border-pink-400',
  },
  {
    value: 'OTHER',
    label: 'Khác',
    icon: 'transgender',
    color: 'text-violet-500',
    activeBg: 'bg-violet-50',
    activeRing: 'ring-violet-200',
    activeBorder: 'border-violet-400',
  },
];

export function GenderPicker({ value = '', onChange, error = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const selected = GENDER_OPTIONS.find((opt) => opt.value === value) || null;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = popoverRef.current?.offsetHeight || 160;
    const gap = 8;
    const edge = 12;
    const spaceBelow = window.innerHeight - rect.bottom - gap - edge;
    const spaceAbove = rect.top - gap - edge;
    const openUp = spaceBelow < height && spaceAbove > spaceBelow;
    const rawTop = openUp ? rect.top - height - gap : rect.bottom + gap;
    const maxTop = Math.max(edge, window.innerHeight - height - edge);
    const rawLeft = rect.left;
    const maxLeft = Math.max(edge, window.innerWidth - width - edge);

    setPopoverStyle({
      top: `${Math.min(Math.max(edge, rawTop), maxTop)}px`,
      left: `${Math.min(Math.max(edge, rawLeft), maxLeft)}px`,
      width: `${width}px`,
    });
  };

  useEffect(() => {
    if (!open) return undefined;

    const frame = window.requestAnimationFrame(updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const handleSelect = (optValue) => {
    onChange?.(optValue);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button — matches DatePicker style exactly */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex min-h-[42px] w-full items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          error
            ? 'border-red-400 text-slate-900'
            : open
              ? 'border-indigo-300 text-slate-900 ring-2 ring-indigo-100'
              : 'border-slate-200 text-slate-900 hover:border-indigo-300'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Icon */}
        <span className={`material-symbols-outlined text-[19px] ${selected ? selected.color : 'text-indigo-500'}`}>
          {selected ? selected.icon : 'wc'}
        </span>

        {/* Label */}
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected ? selected.label : 'Chọn giới tính'}
        </span>

        {/* Clear button */}
        {value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange?.('');
              }
            }}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Xóa lựa chọn"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </span>
        )}

        {/* Chevron */}
        <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Popover dropdown */}
      {open && (
        <div
          ref={popoverRef}
          role="listbox"
          aria-label="Chọn giới tính"
          className="fixed z-[90] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
          style={popoverStyle || { visibility: 'hidden' }}
        >
          <div className="p-1.5 flex flex-col gap-0.5">
            {GENDER_OPTIONS.map((opt) => {
              const isActive = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                    ${isActive
                      ? `${opt.activeBg} ${opt.color} ring-1 ${opt.activeRing} border ${opt.activeBorder}`
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? opt.color : 'text-slate-400'}`}>
                    {opt.icon}
                  </span>
                  <span className="flex-1">{opt.label}</span>
                  {isActive && (
                    <span className={`material-symbols-outlined text-[18px] ${opt.color}`}>check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
