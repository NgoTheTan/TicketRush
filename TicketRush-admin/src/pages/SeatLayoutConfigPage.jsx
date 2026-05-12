import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Button, Spinner, formatCurrency, showToast } from '../components/ui/index.jsx';

const GRID_ROWS = 25;
const GRID_COLS = 40;
const ZONE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// Generate a random ID for zones
const generateId = () => Math.random().toString(36).substr(2, 9);

// Point-in-polygon algorithm (Ray-Casting)
const isPointInPolygon = (pt, vs) => {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].col, yi = vs[i].row;
    const xj = vs[j].col, yj = vs[j].row;
    const intersect = ((yi > pt.row) !== (yj > pt.row))
        && (pt.col < (xj - xi) * (pt.row - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Bresenham's line algorithm to get all cells on the boundary
const getLinePoints = (p1, p2) => {
  const points = [];
  let x0 = p1.col, y0 = p1.row;
  const x1 = p2.col, y1 = p2.row;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  
  while (true) {
    points.push({ row: y0, col: x0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return points;
};

const getPolygonBoundary = (vs) => {
  const boundary = [];
  for (let i = 0; i < vs.length; i++) {
    const j = (i + 1) % vs.length;
    boundary.push(...getLinePoints(vs[i], vs[j]));
  }
  return boundary;
};

export default function SeatLayoutConfigPage({ eventId }) {
  const { navigate } = useRouter();
  const [event, setEvent] = useState(null);
  
  // Zones: { id, name, price, currency, colorCode }
  const [zones, setZones] = useState([
    { id: generateId(), name: 'Khu A', price: 500000, currency: 'VND', colorCode: ZONE_COLORS[0] }
  ]);
  const [activeZone, setActiveZone] = useState(zones[0].id);
  
  // Grid: 2D array [row][col] storing zoneId
  const [grid, setGrid] = useState(() => Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null)));
  
  // App States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Polygon Draw Mode States
  const [drawMode, setDrawMode] = useState('BRUSH'); // 'BRUSH' | 'POLYGON'
  const [polygonPoints, setPolygonPoints] = useState([]); // [{row, col}]
  const [hoverPoint, setHoverPoint] = useState(null); // {row, col}

  // Load existing data
  useEffect(() => {
    Promise.all([
      eventService.get(eventId),
      eventService.getSeatMap(eventId).catch(() => null),
    ]).then(([ev, mapRes]) => {
      setEvent(ev);
      if (mapRes && mapRes.zones && mapRes.zones.length > 0) {
        const loadedZones = [];
        const newGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
        
        mapRes.zones.forEach((z, i) => {
          const zId = generateId();
          loadedZones.push({
            id: zId,
            name: z.name || z.zoneName,
            price: z.price,
            currency: z.currency || 'VND',
            colorCode: z.colorCode || ZONE_COLORS[i % ZONE_COLORS.length]
          });
          
          if (z.rows) {
            z.rows.forEach(r => {
              let rIdx = 0;
              for (let j = 0; j < r.rowLabel.length; j++) {
                rIdx = rIdx * 26 + (r.rowLabel.charCodeAt(j) - 65 + 1);
              }
              rIdx -= 1; 

              r.seats.forEach(s => {
                const cIdx = s.seatNumber;
                if (rIdx < GRID_ROWS && cIdx < GRID_COLS) {
                  newGrid[rIdx][cIdx] = zId;
                }
              });
            });
          }
        });
        
        setZones(loadedZones);
        setGrid(newGrid);
        setActiveZone(loadedZones[0].id);
      }
    }).catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [eventId]);

  const handlePaint = useCallback((r, c) => {
    setGrid(prev => {
      const next = [...prev];
      next[r] = [...next[r]];
      next[r][c] = (drawMode === 'ERASE_BRUSH' || drawMode === 'ERASE_POLYGON') ? null : activeZone;
      return next;
    });
  }, [activeZone, drawMode]);

  const onMouseDown = (r, c) => {
    if (drawMode === 'BRUSH' || drawMode === 'ERASE_BRUSH') {
      setIsMouseDown(true);
      handlePaint(r, c);
    } else {
      // Polygon Mode: Add point
      setPolygonPoints(prev => [...prev, { row: r, col: c }]);
    }
  };

  const onMouseEnter = (r, c) => {
    if (drawMode === 'BRUSH' || drawMode === 'ERASE_BRUSH') {
      if (isMouseDown) handlePaint(r, c);
    } else {
      // Polygon Mode: Update hover point
      if (polygonPoints.length > 0) {
        setHoverPoint({ row: r, col: c });
      }
    }
  };

  const finishPolygon = () => {
    if (polygonPoints.length < 3) {
      showToast('Đa giác phải có ít nhất 3 điểm', 'error');
      return;
    }
    
    const boundaryPoints = getPolygonBoundary(polygonPoints);
    
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const pt = { row: r, col: c };
          // Check if point is inside polygon OR is exactly on the boundary
          if (isPointInPolygon(pt, polygonPoints) || boundaryPoints.some(p => p.row === r && p.col === c)) {
            next[r][c] = (drawMode === 'ERASE_POLYGON') ? null : activeZone;
          }
        }
      }
      return next;
    });
    
    setPolygonPoints([]);
    setHoverPoint(null);
  };

  const cancelPolygon = () => {
    setPolygonPoints([]);
    setHoverPoint(null);
  };
  
  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const addZone = () => {
    const newId = generateId();
    setZones(z => [...z, {
      id: newId, name: '', price: '', currency: 'VND', colorCode: ZONE_COLORS[z.length % ZONE_COLORS.length]
    }]);
    setActiveZone(newId);
  };

  const updateZone = (id, k, v) => setZones(z => z.map(x => x.id === id ? { ...x, [k]: v } : x));
  
  const removeZone = (id) => {
    setZones(z => {
      const newZones = z.filter(x => x.id !== id);
      setActiveZone(prev => prev === id ? (newZones[0]?.id || '') : prev);
      return newZones;
    });
    setGrid(prev => prev.map(row => row.map(cell => cell === id ? null : cell)));
  };

  const clearGrid = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ ghế trên sơ đồ?')) {
      setGrid(Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null)));
    }
  };

  const handleSave = async () => {
    const invalid = zones.find(z => !z.name || z.price === '' || z.price === null);
    if (invalid) { showToast('Vui lòng nhập tên và giá cho tất cả các loại ghế', 'error'); return; }

    const payloadZones = zones.map(z => {
      const customSeats = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (grid[r][c] === z.id) {
            customSeats.push({ row: r, col: c });
          }
        }
      }
      return {
        name: z.name,
        price: Number(z.price),
        currency: z.currency || 'VND',
        colorCode: z.colorCode,
        totalRows: GRID_ROWS,
        seatsPerRow: GRID_COLS,
        customSeats
      };
    }).filter(z => z.customSeats.length > 0);

    if (payloadZones.length === 0) {
      if (!confirm('Sơ đồ hiện tại đang trống. Xác nhận lưu?')) return;
    }

    setSaving(true);
    try {
      await eventService.saveSeatZones(eventId, payloadZones);
      showToast('Đã lưu cấu hình sơ đồ ghế thành công!', 'success');
      navigate('/admin/events');
    } catch (err) {
      if (err.code === 'SEAT_CONFIG_LOCKED') showToast('Không thể thay đổi cấu hình khi sự kiện đang mở bán', 'error');
      else showToast(err.message, 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></AdminLayout>;
  const canEdit = !event || event.status === 'UPCOMING';

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto flex gap-8 flex-col xl:flex-row">
        
        {/* Left Sidebar - Settings */}
        <div className="w-full xl:w-80 flex-shrink-0 space-y-6">
          <div>
            <button onClick={() => navigate('/admin/events')} className="text-sm text-indigo-600 flex items-center gap-1 mb-4 hover:text-indigo-700">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
            </button>
            <h1 className="text-2xl font-black text-slate-900">Thiết kế sơ đồ</h1>
            {event && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{event.name}</p>}
          </div>

          {!canEdit && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
              <span className="material-symbols-outlined text-amber-500">warning</span>
              <p className="text-sm text-amber-700">Sự kiện đang <strong>{event?.status}</strong> — không thể thay đổi.</p>
            </div>
          )}

          {/* Draw Modes */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-6">
            <button 
              onClick={() => { setDrawMode('BRUSH'); cancelPolygon(); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${drawMode === 'BRUSH' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[18px]">brush</span> Cọ vẽ
            </button>
            <button 
              onClick={() => setDrawMode('POLYGON')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${drawMode === 'POLYGON' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[18px]">pentagon</span> Đa giác
            </button>
            <button 
              onClick={() => { setDrawMode('ERASE_BRUSH'); cancelPolygon(); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${drawMode === 'ERASE_BRUSH' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[18px]">ink_eraser</span> Cục tẩy
            </button>
            <button 
              onClick={() => setDrawMode('ERASE_POLYGON')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${drawMode === 'ERASE_POLYGON' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[18px]">format_shapes</span> Tẩy đa giác
            </button>
          </div>

          {/* Polygon actions */}
          {(drawMode === 'POLYGON' || drawMode === 'ERASE_POLYGON') && polygonPoints.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-sm font-medium text-indigo-800 mb-3 text-center">Đang vẽ đa giác: {polygonPoints.length} điểm</p>
              <div className="flex gap-2">
                <Button onClick={finishPolygon} fullWidth className="!py-2 !text-xs">Hoàn thành</Button>
                <Button onClick={cancelPolygon} variant="secondary" fullWidth className="!py-2 !text-xs">Hủy bỏ</Button>
              </div>
            </div>
          )}

          {/* Tools */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Khu vực ghế</h3>
            
            <div className="space-y-3">
              {zones.map(z => {
                const count = grid.flat().filter(id => id === z.id).length;
                return (
                  <div key={z.id} 
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${activeZone === z.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:bg-slate-50'}`}
                    onClick={() => setActiveZone(z.id)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input type="color" value={z.colorCode} onChange={e => updateZone(z.id, 'colorCode', e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border-0 p-0" />
                        <input value={z.name} onChange={e => updateZone(z.id, 'name', e.target.value)}
                          placeholder="Tên khu vực" className="text-sm font-semibold bg-transparent w-24 focus:outline-none" />
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeZone(z.id); }} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Giá:</span>
                        <input type="number" value={z.price === '' ? '' : z.price} onChange={e => updateZone(z.id, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-20 px-1 py-0.5 border border-slate-200 rounded bg-white" />
                        <select value={z.currency || 'VND'} onChange={e => updateZone(z.id, 'currency', e.target.value)} className="w-16 px-1 py-0.5 border border-slate-200 rounded bg-white ml-1">
                          <option value="VND">VND</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                      <span className="font-semibold text-slate-600">{count} ghế</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={addZone} className="w-full mt-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex justify-center items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">add</span> Thêm loại vé
            </button>

          </div>

          {canEdit && (
            <div className="flex flex-col gap-3">
              <Button onClick={handleSave} loading={saving} fullWidth>
                <span className="material-symbols-outlined text-[18px]">save</span> Lưu cấu hình
              </Button>
              <Button variant="secondary" onClick={clearGrid} fullWidth>Xóa toàn bộ lưới</Button>
            </div>
          )}
        </div>

        {/* Right - Canvas */}
        <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-8 min-h-[600px] shadow-inner relative select-none">
          
          <div className="mb-10 text-center">
            <div className="w-64 h-12 bg-slate-800 text-white flex items-center justify-center rounded-b-3xl mx-auto shadow-lg relative">
              <span className="font-black tracking-[0.2em] text-sm opacity-50 uppercase">Stage</span>
              {/* Lights effect */}
              <div className="absolute -bottom-4 w-full flex justify-center gap-8 opacity-40 blur-md">
                <div className="w-10 h-10 bg-indigo-500 rounded-full"></div>
                <div className="w-10 h-10 bg-pink-500 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Grid Canvas Wrapper */}
          <div className="inline-block bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
            
            {/* SVG Overlay for Polygon Drawing */}
            {(drawMode === 'POLYGON' || drawMode === 'ERASE_POLYGON') && (
              <svg className="absolute pointer-events-none" style={{ left: 24, top: 24, width: GRID_COLS * 28, height: GRID_ROWS * 28, zIndex: 10 }}>
                {polygonPoints.length > 0 && (
                  <polyline
                    points={polygonPoints.map(p => `${p.col * 28 + 12},${p.row * 28 + 12}`).join(' ')}
                    fill="none" stroke={drawMode === 'ERASE_POLYGON' ? '#ef4444' : '#6366f1'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  />
                )}
                {polygonPoints.length > 0 && hoverPoint && (
                  <line 
                    x1={polygonPoints[polygonPoints.length - 1].col * 28 + 12} 
                    y1={polygonPoints[polygonPoints.length - 1].row * 28 + 12}
                    x2={hoverPoint.col * 28 + 12} 
                    y2={hoverPoint.row * 28 + 12}
                    stroke={drawMode === 'ERASE_POLYGON' ? '#ef4444' : '#6366f1'} strokeWidth="3" strokeDasharray="6,6" opacity="0.6" strokeLinecap="round"
                  />
                )}
                {polygonPoints.map((p, i) => (
                  <circle key={i} cx={p.col * 28 + 12} cy={p.row * 28 + 12} r="5" fill="#fff" stroke={drawMode === 'ERASE_POLYGON' ? '#ef4444' : '#6366f1'} strokeWidth="2" />
                ))}
              </svg>
            )}

            <div className="flex flex-col gap-1" onMouseLeave={() => { setIsMouseDown(false); setHoverPoint(null); }}>
              {grid.map((row, r) => (
                <div key={r} className="flex gap-1">
                  {row.map((cell, c) => {
                    const zone = cell ? zones.find(z => z.id === cell) : null;
                    return (
                      <div key={`${r}-${c}`}
                        onMouseDown={() => canEdit && onMouseDown(r, c)}
                        onMouseEnter={() => canEdit && onMouseEnter(r, c)}
                        className={`w-6 h-6 rounded-t-lg rounded-b-sm border-b-2 transition-transform active:scale-90 ${(drawMode === 'POLYGON' || drawMode === 'ERASE_POLYGON') ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400' : 'cursor-crosshair'} ${!cell ? 'bg-slate-100 border-slate-200 hover:bg-slate-200' : 'shadow-sm'}`}
                        style={zone ? { backgroundColor: zone.colorCode, borderColor: 'rgba(0,0,0,0.2)' } : {}}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mt-6 text-center">
            {drawMode === 'BRUSH' || drawMode === 'ERASE_BRUSH' ? (
              <>Kéo chuột (Drag) để vẽ hoặc xóa nhanh nhiều ghế.</>
            ) : (
              <>Click để đánh dấu các đỉnh của đa giác. Bấm <strong>Hoàn thành</strong> để thực hiện.</>
            )}
          </p>
        </div>

      </div>
    </AdminLayout>
  );
}
