import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import eventService from '../api/eventService.js';
import { Button, Spinner, showToast } from '../components/ui/index.jsx';

const GRID_ROWS = 25;
const GRID_COLS = 40;
const CELL_SIZE = 28;
const CELL_CENTER_OFFSET = 12;
const EDGE_LABEL_OFFSET = 13;
const RECTANGLE_RESIZE_HANDLES = [
  { key: 'nw', label: 'góc trên trái', cursor: 'nwse-resize', style: { left: -7, top: -7 } },
  { key: 'n', label: 'cạnh trên', cursor: 'ns-resize', style: { left: '50%', top: -7, transform: 'translateX(-50%)' } },
  { key: 'ne', label: 'góc trên phải', cursor: 'nesw-resize', style: { right: -7, top: -7 } },
  { key: 'e', label: 'cạnh phải', cursor: 'ew-resize', style: { right: -7, top: '50%', transform: 'translateY(-50%)' } },
  { key: 'se', label: 'góc dưới phải', cursor: 'nwse-resize', style: { right: -7, bottom: -7 } },
  { key: 's', label: 'cạnh dưới', cursor: 'ns-resize', style: { left: '50%', bottom: -7, transform: 'translateX(-50%)' } },
  { key: 'sw', label: 'góc dưới trái', cursor: 'nesw-resize', style: { left: -7, bottom: -7 } },
  { key: 'w', label: 'cạnh trái', cursor: 'ew-resize', style: { left: -7, top: '50%', transform: 'translateY(-50%)' } },
];
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

const getPointBounds = (points) => points.reduce((bounds, point) => ({
  minRow: Math.min(bounds.minRow, point.row),
  maxRow: Math.max(bounds.maxRow, point.row),
  minCol: Math.min(bounds.minCol, point.col),
  maxCol: Math.max(bounds.maxCol, point.col),
}), {
  minRow: GRID_ROWS - 1,
  maxRow: 0,
  minCol: GRID_COLS - 1,
  maxCol: 0,
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getResizedRectangleFrame = (frame, handle, point) => {
  const currentTop = frame.row;
  const currentLeft = frame.col;
  const currentBottom = frame.row + frame.rows - 1;
  const currentRight = frame.col + frame.cols - 1;

  let top = currentTop;
  let left = currentLeft;
  let bottom = currentBottom;
  let right = currentRight;

  if (handle.includes('n')) top = clamp(point.row, 0, currentBottom);
  if (handle.includes('s')) bottom = clamp(point.row, currentTop, GRID_ROWS - 1);
  if (handle.includes('w')) left = clamp(point.col, 0, currentRight);
  if (handle.includes('e')) right = clamp(point.col, currentLeft, GRID_COLS - 1);

  return {
    row: top,
    col: left,
    rows: bottom - top + 1,
    cols: right - left + 1,
  };
};

const isSameRectangleFrame = (a, b) => (
  a?.row === b?.row
  && a?.col === b?.col
  && a?.rows === b?.rows
  && a?.cols === b?.cols
);

const parseHexColor = (hex) => {
  if (typeof hex !== 'string') return null;

  const normalized = hex.replace('#', '').trim();
  const value = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized;

  if (!/^[\da-f]{6}$/i.test(value)) return null;

  const n = parseInt(value, 16);
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  };
};

const colorWithAlpha = (hex, alpha) => {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const getReadableTextColor = (hex) => {
  const rgb = parseHexColor(hex);
  if (!rgb) return '#ffffff';

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? '#0f172a' : '#ffffff';
};

const isSamePoint = (a, b) => a?.row === b?.row && a?.col === b?.col;

const getPointCenter = (point) => ({
  x: point.col * CELL_SIZE + CELL_CENTER_OFFSET,
  y: point.row * CELL_SIZE + CELL_CENTER_OFFSET,
});

const getEdgeLengthText = (start, end) => {
  const dx = Math.abs(end.col - start.col);
  const dy = Math.abs(end.row - start.row);
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return null;
  return dx === 0 || dy === 0 ? String(length) : length.toFixed(1);
};

const getEdgeLabel = (start, end) => {
  const text = getEdgeLengthText(start, end);
  if (!text) return null;

  const startCenter = getPointCenter(start);
  const endCenter = getPointCenter(end);
  const dx = endCenter.x - startCenter.x;
  const dy = endCenter.y - startCenter.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return null;

  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0 || (ny === 0 && nx > 0)) {
    nx *= -1;
    ny *= -1;
  }

  const width = Math.max(18, text.length * 6 + 8);
  const x = Math.min(Math.max((startCenter.x + endCenter.x) / 2 + nx * EDGE_LABEL_OFFSET, width / 2), GRID_COLS * CELL_SIZE - width / 2);
  const y = Math.min(Math.max((startCenter.y + endCenter.y) / 2 + ny * EDGE_LABEL_OFFSET, 8), GRID_ROWS * CELL_SIZE - 8);

  return { text, x, y, width };
};

function EdgeLengthLabel({ edge, muted = false }) {
  const label = getEdgeLabel(edge.start, edge.end);
  if (!label) return null;

  return (
    <g opacity={muted ? 0.72 : 1}>
      <rect
        x={label.x - label.width / 2}
        y={label.y - 8}
        width={label.width}
        height="16"
        rx="4"
        fill="#ffffff"
        stroke={muted ? '#cbd5e1' : '#94a3b8'}
      />
      <text
        x={label.x}
        y={label.y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#0f172a"
        fontSize="10"
        fontWeight="700"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      >
        {label.text}
      </text>
    </g>
  );
}

const PolygonOverlay = memo(function PolygonOverlay({
  polygonLinePoints,
  polygonPoints,
  polygonEdges,
  previewEdge,
  drawingStrokeColor,
}) {
  return (
    <svg className="absolute pointer-events-none" style={{ left: 24, top: 24, width: GRID_COLS * CELL_SIZE, height: GRID_ROWS * CELL_SIZE, zIndex: 10 }}>
      {polygonPoints.length > 0 && (
        <polyline
          points={polygonLinePoints}
          fill="none"
          stroke={drawingStrokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {previewEdge && (
        <line
          x1={getPointCenter(previewEdge.start).x}
          y1={getPointCenter(previewEdge.start).y}
          x2={getPointCenter(previewEdge.end).x}
          y2={getPointCenter(previewEdge.end).y}
          stroke={drawingStrokeColor}
          strokeWidth="3"
          strokeDasharray="6,6"
          opacity="0.6"
          strokeLinecap="round"
        />
      )}
      {polygonEdges.map(edge => (
        <EdgeLengthLabel key={edge.key} edge={edge} />
      ))}
      {previewEdge && <EdgeLengthLabel edge={previewEdge} muted />}
      {polygonPoints.map((p, i) => (
        <circle
          key={i}
          cx={getPointCenter(p).x}
          cy={getPointCenter(p).y}
          r={i === 0 && polygonPoints.length >= 3 ? '6' : '5'}
          fill="#fff"
          stroke={drawingStrokeColor}
          strokeWidth={i === 0 && polygonPoints.length >= 3 ? '3' : '2'}
        />
      ))}
    </svg>
  );
});

const SeatGrid = memo(function SeatGrid({
  gridRef,
  grid,
  zonesById,
  canEdit,
  drawMode,
  onCellMouseDown,
  onCellMouseEnter,
  onGridMouseLeave,
}) {
  return (
    <div ref={gridRef} className="flex flex-col gap-1" onMouseLeave={onGridMouseLeave}>
      {grid.map((row, rowIndex) => (
        <SeatRow
          key={rowIndex}
          row={row}
          rowIndex={rowIndex}
          zonesById={zonesById}
          canEdit={canEdit}
          drawMode={drawMode}
          onCellMouseDown={onCellMouseDown}
          onCellMouseEnter={onCellMouseEnter}
        />
      ))}
    </div>
  );
});

const SeatRow = memo(function SeatRow({
  row,
  rowIndex,
  zonesById,
  canEdit,
  drawMode,
  onCellMouseDown,
  onCellMouseEnter,
}) {
  return (
    <div className="flex gap-1">
      {row.map((cell, colIndex) => {
        const zone = cell ? zonesById.get(cell) : null;

        return (
          <SeatDraftCell
            key={`${rowIndex}-${colIndex}`}
            cell={cell}
            zoneColor={zone?.colorCode}
            rowIndex={rowIndex}
            colIndex={colIndex}
            canEdit={canEdit}
            drawMode={drawMode}
            onCellMouseDown={onCellMouseDown}
            onCellMouseEnter={onCellMouseEnter}
          />
        );
      })}
    </div>
  );
});

const SeatDraftCell = memo(function SeatDraftCell({
  cell,
  zoneColor,
  rowIndex,
  colIndex,
  canEdit,
  drawMode,
  onCellMouseDown,
  onCellMouseEnter,
}) {
  const isPolygonMode = drawMode === 'POLYGON' || drawMode === 'ERASE_POLYGON';
  const cursorClass = isPolygonMode ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400' : drawMode === 'RECTANGLE' ? 'cursor-default' : 'cursor-crosshair';
  const emptyClass = !cell ? 'bg-slate-100 border-slate-200 hover:bg-slate-200' : 'shadow-sm';

  return (
    <div
      onMouseDown={() => canEdit && onCellMouseDown(rowIndex, colIndex)}
      onMouseEnter={() => canEdit && onCellMouseEnter(rowIndex, colIndex)}
      className={`w-6 h-6 rounded-t-lg rounded-b-sm border-b-2 transition-transform active:scale-90 ${cursorClass} ${emptyClass}`}
      style={zoneColor ? { backgroundColor: zoneColor, borderColor: 'rgba(0,0,0,0.2)' } : undefined}
    />
  );
});

export default function SeatLayoutConfigPage({ eventId }) {
  const { navigate, goBack } = useRouter();
  const gridRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const brushPaintQueueRef = useRef(new Map());
  const brushPaintFrameRef = useRef(null);
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

  // Polygon Draw Mode States
  const [drawMode, setDrawMode] = useState('BRUSH'); // 'BRUSH' | 'POLYGON' | 'RECTANGLE' | 'ERASE_BRUSH' | 'ERASE_POLYGON'
  const [polygonPoints, setPolygonPoints] = useState([]); // [{row, col}]
  const [hoverPoint, setHoverPoint] = useState(null); // {row, col}
  const [rectangleSize, setRectangleSize] = useState({ cols: '10', rows: '5' });
  const [rectangleFrame, setRectangleFrame] = useState(null); // {row, col, rows, cols}
  const [rectangleDrag, setRectangleDrag] = useState(null); // {rowOffset, colOffset}
  const [rectangleResize, setRectangleResize] = useState(null); // {handle, frame}

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
        
        let maxR = 0, maxC = 0;
        mapRes.zones.forEach(z => {
          z.rows?.forEach(r => {
            let rIdx = 0;
            for (let j = 0; j < r.rowLabel.length; j++) {
              rIdx = rIdx * 26 + (r.rowLabel.charCodeAt(j) - 65 + 1);
            }
            rIdx -= 1;
            if (rIdx > maxR) maxR = rIdx;
            r.seats?.forEach(s => {
              const cIdx = s.seatNumber - 1;
              if (cIdx > maxC) maxC = cIdx;
            });
          });
        });

        const rOffset = Math.max(0, Math.floor((GRID_ROWS - (maxR + 1)) / 2));
        const cOffset = Math.max(0, Math.floor((GRID_COLS - (maxC + 1)) / 2));

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
                const cIdx = s.seatNumber - 1;
                const finalR = rIdx + rOffset;
                const finalC = cIdx + cOffset;
                if (finalR >= 0 && finalR < GRID_ROWS && finalC >= 0 && finalC < GRID_COLS) {
                  newGrid[finalR][finalC] = zId;
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

  const canEdit = !event || event.status === 'UPCOMING';

  const flushBrushPaintQueue = useCallback(() => {
    if (brushPaintFrameRef.current !== null) {
      cancelAnimationFrame(brushPaintFrameRef.current);
      brushPaintFrameRef.current = null;
    }

    const queuedCells = [...brushPaintQueueRef.current.values()];
    brushPaintQueueRef.current.clear();
    if (!queuedCells.length) return;

    setGrid(prev => {
      let next = prev;
      let changed = false;
      const clonedRows = new Map();

      for (const { row, col, value } of queuedCells) {
        if (prev[row][col] === value) continue;

        if (!changed) {
          next = [...prev];
          changed = true;
        }

        let nextRow = clonedRows.get(row);
        if (!nextRow) {
          nextRow = [...prev[row]];
          clonedRows.set(row, nextRow);
          next[row] = nextRow;
        }

        nextRow[col] = value;
      }

      return changed ? next : prev;
    });
  }, []);

  const queueBrushPaint = useCallback((row, col) => {
    const value = drawMode === 'ERASE_BRUSH' ? null : activeZone;
    brushPaintQueueRef.current.set(`${row}-${col}`, { row, col, value });

    if (brushPaintFrameRef.current === null) {
      brushPaintFrameRef.current = requestAnimationFrame(flushBrushPaintQueue);
    }
  }, [activeZone, drawMode, flushBrushPaintQueue]);

  const paintPolygon = useCallback((points, shouldErase) => {
    const boundaryPoints = getPolygonBoundary(points);
    const boundarySet = new Set(boundaryPoints.map(p => `${p.row}-${p.col}`));
    const bounds = getPointBounds(points);
    const value = shouldErase ? null : activeZone;

    setGrid(prev => {
      let next = prev;
      let changed = false;
      const clonedRows = new Map();

      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          const pt = { row: r, col: c };
          if (isPointInPolygon(pt, points) || boundarySet.has(`${r}-${c}`)) {
            if (prev[r][c] === value) continue;

            if (!changed) {
              next = [...prev];
              changed = true;
            }

            let nextRow = clonedRows.get(r);
            if (!nextRow) {
              nextRow = [...prev[r]];
              clonedRows.set(r, nextRow);
              next[r] = nextRow;
            }

            nextRow[c] = value;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [activeZone]);

  const finishPolygon = useCallback((pointsOverride) => {
    const points = Array.isArray(pointsOverride) ? pointsOverride : polygonPoints;

    if (points.length < 3) {
      showToast('Đa giác phải có ít nhất 3 điểm', 'error');
      return;
    }

    paintPolygon(points, drawMode === 'ERASE_POLYGON');
    
    setPolygonPoints([]);
    setHoverPoint(null);
  }, [drawMode, paintPolygon, polygonPoints]);

  const cancelRectangle = () => {
    setRectangleFrame(null);
    setRectangleDrag(null);
    setRectangleResize(null);
  };

  const clampRectangleFrame = useCallback((frame) => ({
    ...frame,
    row: clamp(frame.row, 0, GRID_ROWS - frame.rows),
    col: clamp(frame.col, 0, GRID_COLS - frame.cols),
  }), []);

  const getGridPointFromClient = useCallback((clientX, clientY) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      row: clamp(Math.floor((clientY - rect.top) / CELL_SIZE), 0, GRID_ROWS - 1),
      col: clamp(Math.floor((clientX - rect.left) / CELL_SIZE), 0, GRID_COLS - 1),
    };
  }, []);

  const createRectangleFrame = () => {
    const cols = Number(rectangleSize.cols);
    const rows = Number(rectangleSize.rows);

    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
      showToast('Chiều dài và chiều rộng phải là số nguyên dương', 'error');
      return;
    }

    if (cols > GRID_COLS || rows > GRID_ROWS) {
      showToast(`Kích thước tối đa là ${GRID_COLS} x ${GRID_ROWS}`, 'error');
      return;
    }

    setPolygonPoints([]);
    setHoverPoint(null);
    setRectangleSize({ cols: String(cols), rows: String(rows) });
    setRectangleFrame({
      cols,
      rows,
      row: Math.floor((GRID_ROWS - rows) / 2),
      col: Math.floor((GRID_COLS - cols) / 2),
    });
  };

  const applyRectangleFrame = () => {
    if (!rectangleFrame) {
      showToast('Vui lòng tạo khung chữ nhật trước', 'error');
      return;
    }

    if (!activeZone) {
      showToast('Vui lòng chọn một khu vực ghế', 'error');
      return;
    }

    setGrid(prev => {
      let next = prev;
      let changed = false;

      for (let r = rectangleFrame.row; r < rectangleFrame.row + rectangleFrame.rows; r++) {
        let nextRow = null;

        for (let c = rectangleFrame.col; c < rectangleFrame.col + rectangleFrame.cols; c++) {
          if (prev[r][c] === activeZone) continue;

          if (!changed) {
            next = [...prev];
            changed = true;
          }

          if (!nextRow) {
            nextRow = [...prev[r]];
            next[r] = nextRow;
          }

          nextRow[c] = activeZone;
        }
      }
      return changed ? next : prev;
    });

    cancelRectangle();
  };

  const startRectangleDrag = (event) => {
    if (!canEdit || !rectangleFrame) return;

    event.preventDefault();
    event.stopPropagation();

    const point = getGridPointFromClient(event.clientX, event.clientY);
    if (!point) return;

    setRectangleDrag({
      rowOffset: point.row - rectangleFrame.row,
      colOffset: point.col - rectangleFrame.col,
    });
    setRectangleResize(null);
  };

  const startRectangleResize = (event, handle) => {
    if (!canEdit || !rectangleFrame) return;

    event.preventDefault();
    event.stopPropagation();

    setRectangleResize({ handle, frame: rectangleFrame });
    setRectangleDrag(null);
  };

  const onMouseDown = useCallback((r, c) => {
    if (!canEdit) return;

    if (drawMode === 'BRUSH' || drawMode === 'ERASE_BRUSH') {
      isMouseDownRef.current = true;
      queueBrushPaint(r, c);
    } else if (drawMode === 'POLYGON' || drawMode === 'ERASE_POLYGON') {
      const clickedPoint = { row: r, col: c };
      if (polygonPoints.length >= 3 && isSamePoint(clickedPoint, polygonPoints[0])) {
        finishPolygon(polygonPoints);
        return;
      }

      // Polygon Mode: Add point
      setPolygonPoints(prev => {
        if (prev.some(p => isSamePoint(p, clickedPoint))) return prev;
        return [...prev, clickedPoint];
      });
    }
  }, [canEdit, drawMode, finishPolygon, polygonPoints, queueBrushPaint]);

  const onMouseEnter = useCallback((r, c) => {
    if (!canEdit) return;

    if (drawMode === 'BRUSH' || drawMode === 'ERASE_BRUSH') {
      if (isMouseDownRef.current) queueBrushPaint(r, c);
    } else if (drawMode === 'POLYGON' || drawMode === 'ERASE_POLYGON') {
      // Polygon Mode: Update hover point
      if (polygonPoints.length > 0) {
        const nextPoint = { row: r, col: c };
        setHoverPoint(prev => isSamePoint(prev, nextPoint) ? prev : nextPoint);
      }
    }
  }, [canEdit, drawMode, polygonPoints.length, queueBrushPaint]);

  const handleGridMouseLeave = useCallback(() => {
    isMouseDownRef.current = false;
    setHoverPoint(null);
    flushBrushPaintQueue();
  }, [flushBrushPaintQueue]);

  const cancelPolygon = () => {
    setPolygonPoints([]);
    setHoverPoint(null);
  };
  
  useEffect(() => {
    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      flushBrushPaintQueue();
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [flushBrushPaintQueue]);

  useEffect(() => () => {
    if (brushPaintFrameRef.current !== null) {
      cancelAnimationFrame(brushPaintFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (!rectangleDrag) return undefined;

    const handleMouseMove = (event) => {
      const point = getGridPointFromClient(event.clientX, event.clientY);
      if (!point) return;

      setRectangleFrame(prev => {
        if (!prev) return prev;

        const nextFrame = clampRectangleFrame({
          ...prev,
          row: point.row - rectangleDrag.rowOffset,
          col: point.col - rectangleDrag.colOffset,
        });

        return isSameRectangleFrame(prev, nextFrame) ? prev : nextFrame;
      });
    };

    const handleMouseUp = () => setRectangleDrag(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampRectangleFrame, getGridPointFromClient, rectangleDrag]);

  useEffect(() => {
    if (!rectangleResize) return undefined;

    const handleMouseMove = (event) => {
      const point = getGridPointFromClient(event.clientX, event.clientY);
      if (!point) return;

      const nextFrame = getResizedRectangleFrame(rectangleResize.frame, rectangleResize.handle, point);
      setRectangleFrame(prev => isSameRectangleFrame(prev, nextFrame) ? prev : nextFrame);
      setRectangleSize(prev => {
        const nextSize = { cols: String(nextFrame.cols), rows: String(nextFrame.rows) };
        return prev.cols === nextSize.cols && prev.rows === nextSize.rows ? prev : nextSize;
      });
    };

    const handleMouseUp = () => setRectangleResize(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getGridPointFromClient, rectangleResize]);

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
    setGrid(prev => {
      let next = prev;
      let changed = false;

      for (let r = 0; r < GRID_ROWS; r++) {
        let nextRow = null;

        for (let c = 0; c < GRID_COLS; c++) {
          if (prev[r][c] !== id) continue;

          if (!changed) {
            next = [...prev];
            changed = true;
          }

          if (!nextRow) {
            nextRow = [...prev[r]];
            next[r] = nextRow;
          }

          nextRow[c] = null;
        }
      }

      return changed ? next : prev;
    });
  };

  const clearGrid = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ ghế trên sơ đồ?')) {
      setGrid(Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null)));
    }
  };

  const handleSave = async () => {
    const invalid = zones.find(z => !z.name || z.price === '' || z.price === null);
    if (invalid) { showToast('Vui lòng nhập tên và giá cho tất cả các loại ghế', 'error'); return; }

    let minR = GRID_ROWS, maxR = -1;
    let minC = GRID_COLS, maxC = -1;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (grid[r][c] !== null) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }

    const payloadZones = zones.map(z => {
      const customSeats = [];
      if (maxR >= 0) {
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            if (grid[r][c] === z.id) {
              customSeats.push({ row: r - minR, col: c - minC + 1 });
            }
          }
        }
      }
      return {
        name: z.name,
        price: Number(z.price),
        currency: z.currency || 'VND',
        colorCode: z.colorCode,
        totalRows: maxR >= minR ? (maxR - minR + 1) : 0,
        seatsPerRow: maxC >= minC ? (maxC - minC + 1) : 0,
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

  const zonesById = useMemo(() => new Map(zones.map(z => [z.id, z])), [zones]);
  const zoneCounts = useMemo(() => {
    const counts = new Map();

    for (const row of grid) {
      for (const cell of row) {
        if (cell !== null) counts.set(cell, (counts.get(cell) || 0) + 1);
      }
    }

    return counts;
  }, [grid]);
  const polygonEdges = useMemo(() => polygonPoints.slice(1).map((point, index) => ({
    start: polygonPoints[index],
    end: point,
    key: `${polygonPoints[index].row}-${polygonPoints[index].col}-${point.row}-${point.col}`,
  })), [polygonPoints]);
  const previewEdge = useMemo(() => (
    polygonPoints.length > 0 && hoverPoint && !isSamePoint(polygonPoints[polygonPoints.length - 1], hoverPoint)
      ? { start: polygonPoints[polygonPoints.length - 1], end: hoverPoint, key: 'preview' }
      : null
  ), [hoverPoint, polygonPoints]);
  const polygonLinePoints = useMemo(() => (
    polygonPoints.map(p => `${getPointCenter(p).x},${getPointCenter(p).y}`).join(' ')
  ), [polygonPoints]);

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></AdminLayout>;
  const activeZoneConfig = zonesById.get(activeZone);
  const activeZoneColor = activeZoneConfig?.colorCode || ZONE_COLORS[0];
  const drawingStrokeColor = drawMode === 'ERASE_POLYGON' ? '#ef4444' : activeZoneColor;
  const rectangleTextColor = getReadableTextColor(activeZoneColor);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto flex gap-8 flex-col xl:flex-row">
        
        {/* Left Sidebar - Settings */}
        <div className="w-full xl:w-80 flex-shrink-0 space-y-6">
          <div>
            <button onClick={goBack} className="text-sm text-indigo-600 flex items-center gap-1 mb-4 hover:text-indigo-700">
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
          <div className="bg-slate-100 p-1.5 rounded-xl grid grid-cols-5 gap-1 mb-6">
            <button
              type="button"
              aria-pressed={drawMode === 'BRUSH'}
              title="Cọ vẽ"
              onClick={() => { setDrawMode('BRUSH'); cancelPolygon(); cancelRectangle(); }}
              className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${drawMode === 'BRUSH' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[24px] leading-none">brush</span>
              <span className="text-[10px] font-bold leading-none">Cọ vẽ</span>
            </button>
            <button
              type="button"
              aria-pressed={drawMode === 'POLYGON'}
              title="Đa giác"
              onClick={() => { setDrawMode('POLYGON'); cancelRectangle(); }}
              className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${drawMode === 'POLYGON' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[24px] leading-none">pentagon</span>
              <span className="text-[10px] font-bold leading-none">Đa giác</span>
            </button>
            <button
              type="button"
              aria-pressed={drawMode === 'RECTANGLE'}
              title="Chữ nhật"
              onClick={() => { setDrawMode('RECTANGLE'); cancelPolygon(); }}
              className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${drawMode === 'RECTANGLE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[24px] leading-none">crop_square</span>
              <span className="text-[10px] font-bold leading-none">Chữ nhật</span>
            </button>
            <button
              type="button"
              aria-pressed={drawMode === 'ERASE_BRUSH'}
              title="Cục tẩy"
              onClick={() => { setDrawMode('ERASE_BRUSH'); cancelPolygon(); cancelRectangle(); }}
              className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${drawMode === 'ERASE_BRUSH' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[24px] leading-none">ink_eraser</span>
              <span className="text-[10px] font-bold leading-none">Cục tẩy</span>
            </button>
            <button
              type="button"
              aria-pressed={drawMode === 'ERASE_POLYGON'}
              title="Tẩy đa giác"
              onClick={() => { setDrawMode('ERASE_POLYGON'); cancelRectangle(); }}
              className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${drawMode === 'ERASE_POLYGON' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-[24px] leading-none">format_shapes</span>
              <span className="text-[10px] font-bold leading-none">Tẩy đa giác</span>
            </button>
          </div>

          {/* Polygon actions */}
          {(drawMode === 'POLYGON' || drawMode === 'ERASE_POLYGON') && polygonPoints.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-sm font-medium text-indigo-800 mb-3 text-center">Đang vẽ đa giác: {polygonPoints.length} điểm</p>
              <div className="flex gap-2">
                <Button onClick={() => finishPolygon()} fullWidth className="!py-2 !text-xs">Hoàn thành</Button>
                <Button onClick={cancelPolygon} variant="secondary" fullWidth className="!py-2 !text-xs">Hủy bỏ</Button>
              </div>
            </div>
          )}

          {/* Rectangle actions */}
          {drawMode === 'RECTANGLE' && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-sm font-bold text-indigo-900 mb-3">Tạo khung chữ nhật</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <label className="text-xs font-semibold text-slate-600">
                  Dài (cột)
                  <input
                    type="number"
                    min="1"
                    max={GRID_COLS}
                    value={rectangleSize.cols}
                    disabled={!canEdit}
                    onChange={e => setRectangleSize(prev => ({ ...prev, cols: e.target.value }))}
                    className="mt-1 w-full px-2 py-1.5 border border-indigo-100 rounded-lg bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Rộng (hàng)
                  <input
                    type="number"
                    min="1"
                    max={GRID_ROWS}
                    value={rectangleSize.rows}
                    disabled={!canEdit}
                    onChange={e => setRectangleSize(prev => ({ ...prev, rows: e.target.value }))}
                    className="mt-1 w-full px-2 py-1.5 border border-indigo-100 rounded-lg bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={createRectangleFrame} disabled={!canEdit} fullWidth className="!py-2 !text-xs">
                  {rectangleFrame ? 'Cập nhật khung' : 'Tạo khung'}
                </Button>
                {rectangleFrame && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={applyRectangleFrame} disabled={!canEdit} fullWidth className="!py-2 !text-xs">Xác nhận vẽ</Button>
                    <Button onClick={cancelRectangle} variant="secondary" fullWidth className="!py-2 !text-xs">Bỏ khung</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tools */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Khu vực ghế</h3>
            
            <div className="space-y-3">
              {zones.map(z => {
                const count = zoneCounts.get(z.id) || 0;
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
              <PolygonOverlay
                polygonLinePoints={polygonLinePoints}
                polygonPoints={polygonPoints}
                polygonEdges={polygonEdges}
                previewEdge={previewEdge}
                drawingStrokeColor={drawingStrokeColor}
              />
            )}

            {drawMode === 'RECTANGLE' && rectangleFrame && (
              <div
                onMouseDown={startRectangleDrag}
                className={`absolute z-20 rounded-md border-2 ${canEdit ? 'cursor-move' : 'cursor-not-allowed'}`}
                style={{
                  left: 24 + rectangleFrame.col * CELL_SIZE,
                  top: 24 + rectangleFrame.row * CELL_SIZE,
                  width: Math.max(8, rectangleFrame.cols * CELL_SIZE - 4),
                  height: Math.max(8, rectangleFrame.rows * CELL_SIZE - 4),
                  borderColor: activeZoneColor,
                  backgroundColor: colorWithAlpha(activeZoneColor, 0.1),
                  boxShadow: `0 0 0 2px ${colorWithAlpha(activeZoneColor, 0.18)}`,
                }}
              >
                <div
                  className="pointer-events-none absolute -top-7 left-0 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap"
                  style={{ backgroundColor: activeZoneColor, color: rectangleTextColor }}
                >
                  {rectangleFrame.cols} x {rectangleFrame.rows}
                </div>
                {canEdit && RECTANGLE_RESIZE_HANDLES.map(handle => (
                  <button
                    key={handle.key}
                    type="button"
                    aria-label={`Kéo ${handle.label} để đổi kích thước`}
                    onMouseDown={(event) => startRectangleResize(event, handle.key)}
                    className="absolute w-3.5 h-3.5 rounded-full border-2 border-white transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      ...handle.style,
                      cursor: handle.cursor,
                      backgroundColor: activeZoneColor,
                      boxShadow: `0 1px 4px ${colorWithAlpha(activeZoneColor, 0.35)}`,
                    }}
                  />
                ))}
              </div>
            )}

            <SeatGrid
              gridRef={gridRef}
              grid={grid}
              zonesById={zonesById}
              canEdit={canEdit}
              drawMode={drawMode}
              onCellMouseDown={onMouseDown}
              onCellMouseEnter={onMouseEnter}
              onGridMouseLeave={handleGridMouseLeave}
            />
          </div>
          
          <p className="text-xs text-slate-400 mt-6 text-center">
            {drawMode === 'BRUSH' || drawMode === 'ERASE_BRUSH' ? (
              <>Kéo chuột (Drag) để vẽ hoặc xóa nhanh nhiều ghế.</>
            ) : drawMode === 'RECTANGLE' ? (
              <>Tạo khung, kéo khung để di chuyển, kéo cạnh/góc để đổi kích thước rồi bấm <strong>Xác nhận vẽ</strong>.</>
            ) : (
              <>Click để đánh dấu các đỉnh của đa giác. Bấm <strong>Hoàn thành</strong> để tự nối điểm cuối với điểm đầu.</>
            )}
          </p>
        </div>

      </div>
    </AdminLayout>
  );
}
