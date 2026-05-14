// src/components/ui/UnifiedSeatGrid.jsx  (frontend)
// Hiển thị toàn bộ ghế trên lưới tọa độ thống nhất.
// Chỉ render các cột thực sự có ghế — không có ghost columns.

export default function UnifiedSeatGrid({ seatMap, onSeatClick, actingSeatId, mode = 'user', currentHeldSeatIds = [] }) {
  if (!seatMap?.zones?.length) return null;

  // ── Build index: rowLabel → colNum → { seat, zone } ──────────
  const grid = {};
  const colSet = new Set();

  for (const zone of seatMap.zones) {
    for (const row of (zone.rows ?? [])) {
      if (!grid[row.rowLabel]) grid[row.rowLabel] = {};
      for (const seat of (row.seats ?? [])) {
        grid[row.rowLabel][seat.seatNumber] = { seat, zone };
        colSet.add(seat.seatNumber);
      }
    }
  }

  // Chỉ render các cột có ghế
  const cols = [...colSet].sort((a, b) => a - b);

  const rowLabels = Object.keys(grid).sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });

  if (!rowLabels.length || !cols.length) return null;

  const zoneList = seatMap.zones.map(z => ({
    id: z.zoneId,
    name: z.zoneName,
    color: z.colorCode || '#6366f1',
  }));

  const ColNumbers = () => (
    <div className="flex items-center gap-1 select-none">
      <div className="w-5 shrink-0" />
      {cols.map(col => (
        <div key={col} className="w-6 shrink-0 text-center text-[9px] text-slate-400 font-mono leading-none">
          {col}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-xs text-slate-500">
        {zoneList.map(z => (
          <div key={z.id} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: z.color, opacity: 0.85 }} />
            <span>{z.name}</span>
          </div>
        ))}
        <span className="text-slate-300 select-none">|</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-slate-300 border border-slate-400" />
          <span>Đã bán</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-slate-800 border border-slate-900" />
          <span>Đang giữ chỗ</span>
        </div>
      </div>

      {/* Stage */}
      <div className="mb-8 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1.5">
          Sân khấu
        </p>
        <div className="w-2/3 mx-auto h-2.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent rounded-full" />
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="w-fit mx-auto">
          {/* Top column numbers */}
          <div className="mb-1"><ColNumbers /></div>

          {/* Seat rows */}
          {rowLabels.map(rowLabel => {
            const rowCells = grid[rowLabel];
            return (
              <div key={rowLabel} className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-slate-400 font-mono w-5 text-center shrink-0 select-none">
                  {rowLabel}
                </span>
                {cols.map(col => {
                  const cell = rowCells[col];
                  if (!cell) return <div key={col} className="w-6 h-6 shrink-0" />;
                  return (
                    <SeatCell
                      key={cell.seat.seatId}
                      seat={cell.seat}
                      zone={cell.zone}
                      mode={mode}
                      acting={actingSeatId === cell.seat.seatId}
                      isHeldByMe={currentHeldSeatIds.includes(cell.seat.seatId)}
                      onClick={onSeatClick ? () => onSeatClick(cell.seat, cell.zone) : undefined}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Bottom column numbers */}
          <div className="mt-1"><ColNumbers /></div>
        </div>
      </div>
    </div>
  );
}

function SeatCell({ seat, zone, mode, acting, onClick, isHeldByMe }) {
  const status = seat.status;
  const heldByMe = seat.heldByMe || isHeldByMe;
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
      title={tooltip}
      onClick={interactive ? onClick : undefined}
      className={`w-6 h-6 shrink-0 rounded border-2 transition-all
        ${extraCls} ${acting ? 'opacity-40 animate-pulse' : ''}`}
      style={style}
    />
  );
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
