// src/components/ui/UnifiedSeatGrid.jsx (admin)

export default function UnifiedSeatGrid({ seatMap, onSeatClick, actingSeatId, mode = 'admin' }) {
  const zones = (seatMap?.zones ?? []).filter(zone =>
    zone.rows?.some(row => row.seats?.length)
  );

  if (!zones.length) return null;

  const zoneList = zones.map(zone => ({
    id: zone.zoneId,
    name: zone.zoneName,
    color: zone.colorCode || '#6366f1',
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-xs text-slate-600">
        {zoneList.map(zone => (
          <div key={zone.id} className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: zone.color, opacity: 0.85 }}
            />
            <span>{zone.name}</span>
          </div>
        ))}
        <span className="text-slate-300 select-none">|</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300" />
          <span>Đã bán</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-slate-800 border border-slate-900" />
          <span>Đang giữ chỗ</span>
        </div>
      </div>

      <div className="mb-8 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1.5">
          Sân khấu
        </p>
        <div className="w-2/3 mx-auto h-2.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent rounded-full" />
      </div>

      <div className="space-y-8">
        {zones.map(zone => (
          <ZoneSeatGrid
            key={zone.zoneId}
            zone={zone}
            mode={mode}
            actingSeatId={actingSeatId}
            onSeatClick={onSeatClick}
          />
        ))}
      </div>
    </div>
  );
}

function ZoneSeatGrid({ zone, mode, actingSeatId, onSeatClick }) {
  const rows = [...(zone.rows ?? [])]
    .filter(row => row.seats?.length)
    .sort((a, b) => compareRowLabels(a.rowLabel, b.rowLabel));

  const cols = [...new Set(
    rows.flatMap(row => (row.seats ?? []).map(seat => seat.seatNumber))
  )].sort((a, b) => a - b);

  if (!rows.length || !cols.length) return null;

  const grid = {};
  for (const row of rows) {
    grid[row.rowLabel] = {};
    for (const seat of row.seats ?? []) {
      grid[row.rowLabel][seat.seatNumber] = seat;
    }
  }

  const counts = countSeats(rows);
  const zoneColor = zone.colorCode || '#6366f1';

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded shrink-0"
            style={{ backgroundColor: zoneColor }}
          />
          <h3 className="font-bold text-sm text-slate-800 truncate">{zone.zoneName}</h3>
          {zone.price != null && (
            <span className="text-xs font-semibold text-indigo-600">
              {formatVnd(zone.price)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>{counts.available}/{counts.total} còn trống</span>
          {counts.locked > 0 && <span>{counts.locked} đang giữ</span>}
          {counts.sold > 0 && <span>{counts.sold} đã bán</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="w-fit mx-auto">
          <div className="mb-1"><ColumnNumbers cols={cols} /></div>

          {rows.map(row => (
            <div key={`${zone.zoneId}-${row.rowLabel}`} className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-slate-400 font-mono w-5 text-center shrink-0 select-none">
                {row.rowLabel}
              </span>
              {cols.map(col => {
                const seat = grid[row.rowLabel][col];
                if (!seat) return <div key={col} className="w-6 h-6 shrink-0" />;
                return (
                  <SeatCell
                    key={seat.seatId}
                    seat={seat}
                    zone={zone}
                    mode={mode}
                    acting={actingSeatId === seat.seatId}
                    onClick={onSeatClick ? () => onSeatClick(seat, zone) : undefined}
                  />
                );
              })}
            </div>
          ))}

          <div className="mt-1"><ColumnNumbers cols={cols} /></div>
        </div>
      </div>
    </section>
  );
}

function ColumnNumbers({ cols }) {
  return (
    <div className="flex items-center gap-1 select-none">
      <div className="w-5 shrink-0" />
      {cols.map(col => (
        <div key={col} className="w-6 shrink-0 text-center text-[9px] text-slate-400 font-mono leading-none">
          {col}
        </div>
      ))}
    </div>
  );
}

function SeatCell({ seat, zone, mode, acting, onClick }) {
  const { status, heldByMe } = seat;
  const zoneColor = zone.colorCode || '#6366f1';

  let style = {};
  let extraCls = '';
  let tooltip = '';
  let interactive = false;

  if (status === 'SOLD') {
    style = { backgroundColor: '#cbd5e1', borderColor: '#94a3b8' };
    extraCls = 'cursor-not-allowed opacity-70';
    tooltip = 'Đã bán';
  } else if (mode === 'user' && heldByMe) {
    style = { backgroundColor: '#4f46e5', borderColor: '#4338ca', boxShadow: '0 0 0 2px #a5b4fc' };
    extraCls = 'cursor-pointer active:scale-90';
    tooltip = 'Đang chọn (của bạn)';
    interactive = true;
  } else if (status === 'AVAILABLE') {
    style = { backgroundColor: zoneColor, borderColor: adjustBorder(zoneColor), opacity: 0.82 };
    extraCls = mode === 'user'
      ? 'cursor-pointer hover:opacity-100 hover:scale-110 active:scale-90'
      : 'cursor-default hover:opacity-100';
    tooltip = 'Có sẵn';
    interactive = mode === 'user';
  } else if (status === 'LOCKED') {
    style = { backgroundColor: '#1e293b', borderColor: '#0f172a' };
    extraCls = 'cursor-not-allowed opacity-80';
    tooltip = 'Đang giữ chỗ';
  }

  return (
    <button
      type="button"
      disabled={!interactive || acting}
      title={`${zone.zoneName} ${seat.rowLabel}${seat.seatNumber} - ${tooltip}`}
      onClick={interactive ? onClick : undefined}
      className={`w-6 h-6 shrink-0 rounded border-2 transition-all
        ${extraCls} ${acting ? 'opacity-40 animate-pulse' : ''}`}
      style={style}
    />
  );
}

function countSeats(rows) {
  const counts = { total: 0, available: 0, locked: 0, sold: 0 };
  for (const row of rows) {
    for (const seat of row.seats ?? []) {
      counts.total += 1;
      if (seat.status === 'AVAILABLE') counts.available += 1;
      else if (seat.status === 'LOCKED') counts.locked += 1;
      else if (seat.status === 'SOLD') counts.sold += 1;
    }
  }
  return counts;
}

function compareRowLabels(a = '', b = '') {
  if (a.length !== b.length) return a.length - b.length;
  return a.localeCompare(b);
}

function formatVnd(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function adjustBorder(hex) {
  try {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - 40);
    const g = Math.max(0, ((n >> 8) & 0xff) - 40);
    const b = Math.max(0, (n & 0xff) - 40);
    return `rgb(${r},${g},${b})`;
  } catch { return hex; }
}
