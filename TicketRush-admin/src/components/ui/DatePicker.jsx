import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const pad = (value) => String(value).padStart(2, '0');

function parsePickerValue(value) {
  if (!value) return null;

  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0] = timePart.split(':').map(Number);

  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day, hour || 0, minute || 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function normalizeDate(value) {
  const parsed = parsePickerValue(value);
  return parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) : null;
}

function toDateValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toPickerValue(date, mode) {
  const dateValue = toDateValue(date);
  if (mode !== 'datetime') return dateValue;
  return `${dateValue}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isSameDay(a, b) {
  return Boolean(a && b) &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isBeforeDay(a, b) {
  if (!a || !b) return false;
  return new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() < b.getTime();
}

function isAfterDay(a, b) {
  if (!a || !b) return false;
  return new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() > b.getTime();
}

function formatDisplayValue(value, mode) {
  const parsed = parsePickerValue(value);
  if (!parsed) return '';

  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);

  if (mode !== 'datetime') return dateLabel;
  return `${dateLabel} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function buildCalendarCells(viewDate) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const firstCell = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(firstCell);
    cell.setDate(firstCell.getDate() + index);
    return cell;
  });
}

function buildYearOptions(viewDate, minDate, maxDate, minYear, maxYear) {
  const currentYear = new Date().getFullYear();
  const viewYear = viewDate.getFullYear();
  const start = Math.min(minYear ?? minDate?.getFullYear() ?? currentYear - 5, viewYear);
  const end = Math.max(maxYear ?? maxDate?.getFullYear() ?? currentYear + 10, viewYear);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function DatePicker({
  value = '',
  onChange,
  mode = 'date',
  placeholder,
  min,
  max,
  minYear,
  maxYear,
  minuteStep = 5,
  disabled = false,
  error = false,
  align = 'left',
  className = '',
}) {
  const selectedDate = useMemo(() => parsePickerValue(value), [value]);
  const minDate = useMemo(() => normalizeDate(min), [min]);
  const maxDate = useMemo(() => normalizeDate(max), [max]);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const [popoverStyle, setPopoverStyle] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(320, Math.max(280, window.innerWidth - 24));
    const height = popoverRef.current?.offsetHeight || (mode === 'datetime' ? 430 : 370);
    const gap = 8;
    const edge = 12;
    const spaceBelow = window.innerHeight - rect.bottom - gap - edge;
    const spaceAbove = rect.top - gap - edge;
    const openUp = spaceBelow < height && spaceAbove > spaceBelow;
    const rawTop = openUp ? rect.top - height - gap : rect.bottom + gap;
    const maxTop = Math.max(edge, window.innerHeight - height - edge);
    const rawLeft = align === 'right' ? rect.right - width : rect.left;
    const maxLeft = Math.max(edge, window.innerWidth - width - edge);

    setPopoverStyle({
      top: `${Math.min(Math.max(edge, rawTop), maxTop)}px`,
      left: `${Math.min(Math.max(edge, rawLeft), maxLeft)}px`,
      width: `${width}px`,
    });
  }, [align, mode]);

  useEffect(() => {
    if (!open) return undefined;

    const frame = window.requestAnimationFrame(updatePopoverPosition);
    document.addEventListener('scroll', updatePopoverPosition, true);
    window.addEventListener('resize', updatePopoverPosition);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const calendarCells = useMemo(() => buildCalendarCells(viewDate), [viewDate]);
  const yearOptions = useMemo(
    () => buildYearOptions(viewDate, minDate, maxDate, minYear, maxYear),
    [viewDate, minDate, maxDate, minYear, maxYear],
  );

  const displayValue = formatDisplayValue(value, mode);
  const placeholderText = placeholder || (mode === 'datetime' ? 'Chọn ngày và giờ' : 'Chọn ngày');
  const selectedHour = selectedDate?.getHours() ?? 19;
  const selectedMinute = selectedDate?.getMinutes() ?? 0;
  const minuteOptions = useMemo(() => {
    const options = Array.from(
      { length: Math.ceil(60 / minuteStep) },
      (_, index) => Math.min(index * minuteStep, 59),
    );
    return options.includes(selectedMinute) ? options : [...options, selectedMinute].sort((a, b) => a - b);
  }, [minuteStep, selectedMinute]);

  const isDateDisabled = (date) => isBeforeDay(date, minDate) || isAfterDay(date, maxDate);

  const emitChange = (date) => {
    onChange?.(toPickerValue(date, mode));
  };

  const handleSelectDate = (date) => {
    if (isDateDisabled(date)) return;

    const next = new Date(date);
    if (mode === 'datetime') {
      next.setHours(selectedHour, selectedMinute, 0, 0);
      emitChange(next);
      return;
    }

    emitChange(next);
    setOpen(false);
  };

  const handleTimeChange = (part, nextValue) => {
    if (!selectedDate) return;
    const next = new Date(selectedDate);
    if (part === 'hour') next.setHours(Number(nextValue));
    if (part === 'minute') next.setMinutes(Number(nextValue));
    next.setSeconds(0, 0);
    emitChange(next);
  };

  const handleToday = () => {
    const today = new Date();
    if (isDateDisabled(today)) return;

    const next = new Date(today.getFullYear(), today.getMonth(), today.getDate(), selectedHour, selectedMinute);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    emitChange(next);
    if (mode !== 'datetime') setOpen(false);
  };

  const changeMonth = (offset) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const toggleOpen = () => {
    if (!open && selectedDate) {
      setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
    setOpen((current) => !current);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`flex min-h-[42px] w-full items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          error
            ? 'border-red-400 text-slate-900'
            : open
              ? 'border-indigo-300 text-slate-900 ring-2 ring-indigo-100'
              : 'border-slate-200 text-slate-900 hover:border-indigo-300'
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[19px] text-indigo-500">calendar_month</span>
        <span className={`min-w-0 flex-1 truncate ${displayValue ? '' : 'text-slate-400'}`}>
          {displayValue || placeholderText}
        </span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onChange?.('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onChange?.('');
              }
            }}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Xóa ngày đã chọn"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </span>
        )}
        <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="fixed z-[90] rounded-lg border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
          style={popoverStyle || { visibility: 'hidden' }}
          role="dialog"
          aria-label="Chọn ngày"
        >
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Tháng trước"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="grid min-w-0 flex-1 grid-cols-[1.2fr_0.8fr] gap-2">
              <select
                value={viewDate.getMonth()}
                onChange={(event) => setViewDate(new Date(viewDate.getFullYear(), Number(event.target.value), 1))}
                className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Chọn tháng"
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index}>{month}</option>
                ))}
              </select>
              <select
                value={viewDate.getFullYear()}
                onChange={(event) => setViewDate(new Date(Number(event.target.value), viewDate.getMonth(), 1))}
                className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Chọn năm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Tháng sau"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1.5">{day}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((date) => {
              const outsideMonth = date.getMonth() !== viewDate.getMonth();
              const selected = isSameDay(date, selectedDate);
              const today = isSameDay(date, new Date());
              const blocked = isDateDisabled(date);

              return (
                <button
                  key={date.getTime()}
                  type="button"
                  disabled={blocked}
                  onClick={() => handleSelectDate(date)}
                  className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : blocked
                        ? 'cursor-not-allowed text-slate-300'
                        : today
                          ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          : outsideMonth
                            ? 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'
                            : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {mode === 'datetime' && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                <span className="material-symbols-outlined text-[16px] text-indigo-500">schedule</span>
                Giờ tổ chức
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedHour}
                  disabled={!selectedDate}
                  onChange={(event) => handleTimeChange('hour', event.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:text-slate-400"
                  aria-label="Chọn giờ"
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>{pad(hour)} giờ</option>
                  ))}
                </select>
                <select
                  value={selectedMinute}
                  disabled={!selectedDate}
                  onChange={(event) => handleTimeChange('minute', event.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:text-slate-400"
                  aria-label="Chọn phút"
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>{pad(minute)} phút</option>
                  ))}
                </select>
              </div>
              {!selectedDate && (
                <p className="mt-2 text-xs text-slate-400">Chọn ngày trước, sau đó chỉnh giờ.</p>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onChange?.('')}
              disabled={!value}
              className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Xóa
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                disabled={isDateDisabled(new Date())}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Hôm nay
              </button>
              {mode === 'datetime' && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={!selectedDate}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Xong
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
