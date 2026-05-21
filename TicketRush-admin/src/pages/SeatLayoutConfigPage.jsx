import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { useRouter } from '../contexts/RouterContext.jsx';
import { useCreateEventDraft } from '../contexts/CreateEventDraftContext.jsx';
import eventService from '../api/eventService.js';
import { Button, Spinner, showToast, useConfirm } from '../components/ui/index.jsx';

const INITIAL_GRID_ROWS = 25;
const INITIAL_GRID_COLS = 40;
const GRID_EXPAND_ROWS = 8;
const GRID_EXPAND_COLS = 10;
const MAX_GRID_ROWS = 120;
const MAX_GRID_COLS = 180;
const BASE_SEAT_SIZE = 24;
const BASE_CELL_GAP = 4;
const CANVAS_PADDING = 40;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;
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
const createEmptyGrid = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(null));
const getGridDimensions = (grid) => ({
  rowCount: grid.length,
  colCount: grid[0]?.length || 0,
});

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

const getPointBounds = (points, rowCount, colCount) => points.reduce((bounds, point) => ({
  minRow: Math.min(bounds.minRow, point.row),
  maxRow: Math.max(bounds.maxRow, point.row),
  minCol: Math.min(bounds.minCol, point.col),
  maxCol: Math.max(bounds.maxCol, point.col),
}), {
  minRow: rowCount - 1,
  maxRow: 0,
  minCol: colCount - 1,
  maxCol: 0,
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getResizedRectangleFrame = (frame, handle, point, rowCount, colCount) => {
  const currentTop = frame.row;
  const currentLeft = frame.col;
  const currentBottom = frame.row + frame.rows - 1;
  const currentRight = frame.col + frame.cols - 1;

  let top = currentTop;
  let left = currentLeft;
  let bottom = currentBottom;
  let right = currentRight;

  if (handle.includes('n')) top = clamp(point.row, 0, currentBottom);
  if (handle.includes('s')) bottom = clamp(point.row, currentTop, rowCount - 1);
  if (handle.includes('w')) left = clamp(point.col, 0, currentRight);
  if (handle.includes('e')) right = clamp(point.col, currentLeft, colCount - 1);

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

const getPointCenter = (point, metrics) => ({
  x: point.col * metrics.cellStep + metrics.seatSize / 2,
  y: point.row * metrics.cellStep + metrics.seatSize / 2,
});

const getEdgeLengthText = (start, end) => {
  const dx = Math.abs(end.col - start.col);
  const dy = Math.abs(end.row - start.row);
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return null;
  return dx === 0 || dy === 0 ? String(length) : length.toFixed(1);
};

const getEdgeLabel = (start, end, rowCount, colCount, metrics) => {
  const text = getEdgeLengthText(start, end);
  if (!text) return null;

  const startCenter = getPointCenter(start, metrics);
  const endCenter = getPointCenter(end, metrics);
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
  const canvasWidth = colCount * metrics.cellStep - metrics.gapSize;
  const canvasHeight = rowCount * metrics.cellStep - metrics.gapSize;
  const x = Math.min(Math.max((startCenter.x + endCenter.x) / 2 + nx * EDGE_LABEL_OFFSET, width / 2), canvasWidth - width / 2);
  const y = Math.min(Math.max((startCenter.y + endCenter.y) / 2 + ny * EDGE_LABEL_OFFSET, 8), canvasHeight - 8);

  return { text, x, y, width };
};

function EdgeLengthLabel({ edge, muted = false, rowCount, colCount, metrics }) {
  const label = getEdgeLabel(edge.start, edge.end, rowCount, colCount, metrics);
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
  rowCount,
  colCount,
  metrics,
}) {
  const width = colCount * metrics.cellStep - metrics.gapSize;
  const height = rowCount * metrics.cellStep - metrics.gapSize;

  return (
    <svg className="absolute pointer-events-none" style={{ left: CANVAS_PADDING, top: CANVAS_PADDING, width, height, zIndex: 10 }}>
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
          x1={getPointCenter(previewEdge.start, metrics).x}
          y1={getPointCenter(previewEdge.start, metrics).y}
          x2={getPointCenter(previewEdge.end, metrics).x}
          y2={getPointCenter(previewEdge.end, metrics).y}
          stroke={drawingStrokeColor}
          strokeWidth="3"
          strokeDasharray="6,6"
          opacity="0.6"
          strokeLinecap="round"
        />
      )}
      {polygonEdges.map(edge => (
        <EdgeLengthLabel key={edge.key} edge={edge} rowCount={rowCount} colCount={colCount} metrics={metrics} />
      ))}
      {previewEdge && <EdgeLengthLabel edge={previewEdge} muted rowCount={rowCount} colCount={colCount} metrics={metrics} />}
      {polygonPoints.map((p, i) => (
        <circle
          key={i}
          cx={getPointCenter(p, metrics).x}
          cy={getPointCenter(p, metrics).y}
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
  zoneColorById,
  canEdit,
  drawMode,
  metrics,
  onCellMouseDown,
  onCellMouseEnter,
  onGridMouseLeave,
}) {
  const getEventCell = (event) => {
    const cell = event.target.closest('[data-seat-cell="true"]');
    if (!cell || !gridRef.current?.contains(cell)) return null;
    return {
      row: Number(cell.dataset.row),
      col: Number(cell.dataset.col),
    };
  };

  const handleMouseDown = (event) => {
    if (!canEdit) return;
    const cell = getEventCell(event);
    if (!cell) return;
    event.preventDefault();
    onCellMouseDown(cell.row, cell.col);
  };

  const handleMouseOver = (event) => {
    if (!canEdit) return;
    const cell = getEventCell(event);
    if (!cell) return;
    onCellMouseEnter(cell.row, cell.col);
  };

  return (
    <div
      ref={gridRef}
      className={`flex flex-col ${drawMode === 'RECTANGLE' ? 'cursor-default' : 'cursor-crosshair'}`}
      style={{ gap: metrics.gapSize, contain: 'layout paint style' }}
      onMouseDown={handleMouseDown}
      onMouseOver={handleMouseOver}
      onMouseLeave={onGridMouseLeave}
    >
      {grid.map((row, rowIndex) => (
        <SeatRow
          key={rowIndex}
          row={row}
          rowIndex={rowIndex}
          zoneColorById={zoneColorById}
          metrics={metrics}
        />
      ))}
    </div>
  );
});

const SeatRow = memo(function SeatRow({
  row,
  rowIndex,
  zoneColorById,
  metrics,
}) {
  return (
    <div
      className="flex"
      style={{ gap: metrics.gapSize, contentVisibility: 'auto', containIntrinsicSize: `${metrics.seatSize}px` }}
    >
      {row.map((cell, colIndex) => {
        const zoneColor = cell ? zoneColorById.get(cell) : null;

        return (
          <SeatDraftCell
            key={`${rowIndex}-${colIndex}`}
            cell={cell}
            zoneColor={zoneColor}
            rowIndex={rowIndex}
            colIndex={colIndex}
            metrics={metrics}
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
  metrics,
}) {
  const emptyClass = !cell ? 'bg-slate-100 border-slate-200 hover:bg-slate-200' : 'shadow-sm';

  return (
    <div
      data-seat-cell="true"
      data-row={rowIndex}
      data-col={colIndex}
      className={`shrink-0 rounded-t-lg rounded-b-sm border-b-2 hover:ring-2 hover:ring-indigo-300 active:scale-95 ${emptyClass}`}
      style={{
        width: metrics.seatSize,
        height: metrics.seatSize,
        ...(zoneColor ? { backgroundColor: zoneColor, borderColor: 'rgba(0,0,0,0.2)' } : {}),
      }}
    />
  );
});

export default function SeatLayoutConfigPage({ eventId, createMode = false }) {
  const { navigate, goBack } = useRouter();
  const { draft, clearDraft } = useCreateEventDraft();
  const [confirmDialog, confirm] = useConfirm();
  const isCreating = createMode || !eventId;
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
  const [grid, setGrid] = useState(() => createEmptyGrid(INITIAL_GRID_ROWS, INITIAL_GRID_COLS));
  
  // App States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Polygon Draw Mode States
  const [drawMode, setDrawMode] = useState('BRUSH'); // 'BRUSH' | 'POLYGON' | 'RECTANGLE' | 'ERASE_BRUSH' | 'ERASE_POLYGON'
  const [polygonPoints, setPolygonPoints] = useState([]); // [{row, col}]
  const [hoverPoint, setHoverPoint] = useState(null); // {row, col}
  const [rectangleSize, setRectangleSize] = useState({ cols: '10', rows: '5' });
  const [rectangleFrame, setRectangleFrame] = useState(null); // {row, col, rows, cols}
  const [rectangleDrag, setRectangleDrag] = useState(null); // {rowOffset, colOffset}
  const [rectangleResize, setRectangleResize] = useState(null); // {handle, frame}
  const { rowCount, colCount } = getGridDimensions(grid);
  const gridMetrics = useMemo(() => {
    const seatSize = BASE_SEAT_SIZE * zoom;
    const gapSize = BASE_CELL_GAP * zoom;
    return {
      seatSize,
      gapSize,
      cellStep: seatSize + gapSize,
    };
  }, [zoom]);
  const gridCanvasWidth = colCount * gridMetrics.cellStep - gridMetrics.gapSize;
  const gridCanvasHeight = rowCount * gridMetrics.cellStep - gridMetrics.gapSize;

  // Load existing data
  useEffect(() => {
    if (isCreating) {
      if (!draft?.form) {
        showToast('Vui lòng nhập thông tin sự kiện trước khi cấu hình ghế', 'error');
        navigate('/admin/events/new');
        return;
      }

      setEvent({ ...draft.form, status: 'UPCOMING' });
      setLoading(false);
      return;
    }

    Promise.all([
      eventService.get(eventId),
      eventService.getSeatMap(eventId).catch(() => null),
    ]).then(([ev, mapRes]) => {
      setEvent(ev);
      if (mapRes && mapRes.zones && mapRes.zones.length > 0) {
        const loadedZones = [];
        
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

        const nextRowCount = Math.min(MAX_GRID_ROWS, Math.max(INITIAL_GRID_ROWS, maxR + 1));
        const nextColCount = Math.min(MAX_GRID_COLS, Math.max(INITIAL_GRID_COLS, maxC + 1));
        const newGrid = createEmptyGrid(nextRowCount, nextColCount);
        const rOffset = Math.max(0, Math.floor((nextRowCount - (maxR + 1)) / 2));
        const cOffset = Math.max(0, Math.floor((nextColCount - (maxC + 1)) / 2));

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
                if (finalR >= 0 && finalR < nextRowCount && finalC >= 0 && finalC < nextColCount) {
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
  }, [draft, eventId, isCreating, navigate]);

  const canEdit = isCreating || !event || event.status === 'UPCOMING';

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
    const bounds = getPointBounds(points, rowCount, colCount);
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
  }, [activeZone, colCount, rowCount]);

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
    row: clamp(frame.row, 0, rowCount - frame.rows),
    col: clamp(frame.col, 0, colCount - frame.cols),
  }), [colCount, rowCount]);

  const getGridPointFromClient = useCallback((clientX, clientY) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      row: clamp(Math.floor((clientY - rect.top) / gridMetrics.cellStep), 0, rowCount - 1),
      col: clamp(Math.floor((clientX - rect.left) / gridMetrics.cellStep), 0, colCount - 1),
    };
  }, [colCount, gridMetrics.cellStep, rowCount]);

  const createRectangleFrame = () => {
    const cols = Number(rectangleSize.cols);
    const rows = Number(rectangleSize.rows);

    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
      showToast('Chiều dài và chiều rộng phải là số nguyên dương', 'error');
      return;
    }

    if (cols > colCount || rows > rowCount) {
      showToast(`Kích thước tối đa là ${colCount} x ${rowCount}`, 'error');
      return;
    }

    setPolygonPoints([]);
    setHoverPoint(null);
    setRectangleSize({ cols: String(cols), rows: String(rows) });
    setRectangleFrame({
      cols,
      rows,
      row: Math.floor((rowCount - rows) / 2),
      col: Math.floor((colCount - cols) / 2),
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

  const expandGrid = (direction) => {
    if (!canEdit) return;
    if ((direction === 'LEFT' || direction === 'RIGHT') && colCount >= MAX_GRID_COLS) {
      showToast(`Sơ đồ đã đạt tối đa ${MAX_GRID_COLS} cột`, 'error');
      return;
    }
    if (direction === 'DOWN' && rowCount >= MAX_GRID_ROWS) {
      showToast(`Sơ đồ đã đạt tối đa ${MAX_GRID_ROWS} hàng`, 'error');
      return;
    }

    flushBrushPaintQueue();
    cancelPolygon();
    cancelRectangle();

    setGrid(prev => {
      const currentRows = prev.length;
      const currentCols = prev[0]?.length || INITIAL_GRID_COLS;

      if (direction === 'LEFT') {
        const addedCols = Math.min(GRID_EXPAND_COLS, MAX_GRID_COLS - currentCols);
        return prev.map(row => [...Array(addedCols).fill(null), ...row]);
      }
      if (direction === 'RIGHT') {
        const addedCols = Math.min(GRID_EXPAND_COLS, MAX_GRID_COLS - currentCols);
        return prev.map(row => [...row, ...Array(addedCols).fill(null)]);
      }

      const addedRows = Math.min(GRID_EXPAND_ROWS, MAX_GRID_ROWS - currentRows);
      return [...prev, ...createEmptyGrid(addedRows, currentCols)];
    });
  };

  const updateZoom = (delta) => {
    setZoom(prev => Number(clamp(prev + delta, MIN_ZOOM, MAX_ZOOM).toFixed(2)));
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

      const nextFrame = getResizedRectangleFrame(rectangleResize.frame, rectangleResize.handle, point, rowCount, colCount);
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
  }, [colCount, getGridPointFromClient, rectangleResize, rowCount]);

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

      for (let r = 0; r < prev.length; r++) {
        let nextRow = null;

        for (let c = 0; c < prev[r].length; c++) {
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

  const clearGrid = async () => {
    const ok = await confirm({
      title: 'Xóa toàn bộ lưới',
      message: 'Tất cả ghế đã vẽ trên sơ đồ hiện tại sẽ bị xóa. Khu vực vé và giá vẫn được giữ lại.',
      confirmLabel: 'Xóa lưới',
      cancelLabel: 'Giữ lại',
      variant: 'warning',
    });
    if (!ok) return;

    setGrid(prev => createEmptyGrid(prev.length, prev[0]?.length || INITIAL_GRID_COLS));
    cancelPolygon();
    cancelRectangle();
  };

  const handleCancelConfig = async () => {
    const ok = await confirm({
      title: isCreating ? 'Hủy tạo sự kiện' : 'Hủy chỉnh sửa sơ đồ',
      message: isCreating
        ? 'Bản nháp sự kiện và sơ đồ ghế đang vẽ sẽ bị bỏ.'
        : 'Các thay đổi trên sơ đồ ghế chưa lưu sẽ bị bỏ.',
      confirmLabel: isCreating ? 'Hủy tạo' : 'Bỏ thay đổi',
      cancelLabel: 'Tiếp tục vẽ',
      variant: 'warning',
    });
    if (!ok) return;

    cancelPolygon();
    cancelRectangle();
    if (isCreating) {
      clearDraft();
      navigate('/admin/events');
    } else {
      navigate(eventId ? `/admin/events/${eventId}/view` : '/admin/events');
    }
  };

  const handleSave = async () => {
    const invalid = zones.find(z => !z.name || z.price === '' || z.price === null);
    if (invalid) { showToast('Vui lòng nhập tên và giá cho tất cả các loại ghế', 'error'); return; }

    let minR = rowCount, maxR = -1;
    let minC = colCount, maxC = -1;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
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
      showToast(isCreating
        ? 'Vui lòng vẽ ít nhất một ghế trước khi tạo sự kiện'
        : 'Vui lòng vẽ ít nhất một ghế trước khi lưu cấu hình', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        if (!draft?.form) {
          showToast('Bản nháp sự kiện không còn tồn tại. Vui lòng nhập lại thông tin sự kiện.', 'error');
          navigate('/admin/events/new');
          return;
        }

        let finalImageUrl = null;
        if (draft.imageFile) {
          const uploadResult = await eventService.adminUploadImage(draft.imageFile);
          finalImageUrl = uploadResult.url;
        }

        const created = await eventService.adminCreateWithSeatZones({
          event: {
            ...draft.form,
            imageUrl: finalImageUrl,
            eventDate: new Date(draft.form.eventDate).toISOString(),
          },
          zones: payloadZones,
        });
        clearDraft();
        showToast('Đã tạo sự kiện và lưu cấu hình ghế thành công!', 'success');
        navigate(`/admin/events/${created.id}/view`);
      } else {
        await eventService.saveSeatZones(eventId, payloadZones);
        showToast('Đã lưu cấu hình sơ đồ ghế thành công!', 'success');
        navigate('/admin/events');
      }
    } catch (err) {
      if (err.code === 'SEAT_CONFIG_LOCKED') showToast('Không thể thay đổi cấu hình khi sự kiện đang mở bán', 'error');
      else showToast(err.message, 'error');
    } finally { setSaving(false); }
  };

  const zoneColorKey = zones.map(z => `${z.id}:${z.colorCode}`).join('|');
  const zoneColorById = useMemo(() => new Map(zones.map(z => [z.id, z.colorCode])), [zoneColorKey]);
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
    polygonPoints.map(p => `${getPointCenter(p, gridMetrics).x},${getPointCenter(p, gridMetrics).y}`).join(' ')
  ), [gridMetrics, polygonPoints]);

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></AdminLayout>;
  const activeZoneConfig = zonesById.get(activeZone);
  const activeZoneColor = activeZoneConfig?.colorCode || ZONE_COLORS[0];
  const drawingStrokeColor = drawMode === 'ERASE_POLYGON' ? '#ef4444' : activeZoneColor;
  const rectangleTextColor = getReadableTextColor(activeZoneColor);

  return (
    <AdminLayout>
      {confirmDialog}
      <div className="p-8 max-w-7xl mx-auto flex gap-8 flex-col xl:flex-row">
        
        {/* Left Sidebar - Settings */}
        <div className="w-full xl:w-80 flex-shrink-0 space-y-6">
          <div>
            <button onClick={goBack} className="text-sm text-indigo-600 flex items-center gap-1 mb-4 hover:text-indigo-700">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
            </button>
            <h1 className="text-2xl font-black text-slate-900">
              {isCreating ? 'Cấu hình ghế sự kiện mới' : 'Thiết kế sơ đồ'}
            </h1>
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
                    max={colCount}
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
                    max={rowCount}
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
                <span className="material-symbols-outlined text-[18px]">{isCreating ? 'event_available' : 'save'}</span>
                {isCreating ? 'Tạo sự kiện' : 'Lưu cấu hình'}
              </Button>
              <Button variant="secondary" onClick={clearGrid} fullWidth>Xóa toàn bộ lưới</Button>
              <Button variant="ghost" onClick={handleCancelConfig} fullWidth>Hủy</Button>
            </div>
          )}
        </div>

        {/* Right - Canvas */}
        <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl border border-slate-200 p-8 min-h-[600px] shadow-inner relative select-none">
          <div className="sticky top-0 left-0 z-40 flex justify-end pointer-events-none mb-4">
            <div className="pointer-events-auto inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => updateZoom(-ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                title="Thu nhỏ"
                aria-label="Thu nhỏ sơ đồ ghế"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                title="Đặt lại zoom"
                className="min-w-14 px-2 h-8 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => updateZoom(ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                title="Phóng to"
                aria-label="Phóng to sơ đồ ghế"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
          <div className="w-max min-w-full flex flex-col items-center">
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
            <div
              className="inline-block bg-white p-10 rounded-xl shadow-sm border border-slate-200 relative"
              style={{ minWidth: gridCanvasWidth + CANVAS_PADDING * 2, minHeight: gridCanvasHeight + CANVAS_PADDING * 2 }}
            >
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => expandGrid('LEFT')}
                    disabled={colCount >= MAX_GRID_COLS}
                    title={`Mở rộng sang trái thêm ${GRID_EXPAND_COLS} cột`}
                    aria-label="Mở rộng sơ đồ sang trái"
                    className="absolute left-2 top-1/2 z-30 w-8 h-8 -translate-y-1/2 inline-flex items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-md hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => expandGrid('RIGHT')}
                    disabled={colCount >= MAX_GRID_COLS}
                    title={`Mở rộng sang phải thêm ${GRID_EXPAND_COLS} cột`}
                    aria-label="Mở rộng sơ đồ sang phải"
                    className="absolute right-2 top-1/2 z-30 w-8 h-8 -translate-y-1/2 inline-flex items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-md hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => expandGrid('DOWN')}
                    disabled={rowCount >= MAX_GRID_ROWS}
                    title={`Mở rộng xuống dưới thêm ${GRID_EXPAND_ROWS} hàng`}
                    aria-label="Mở rộng sơ đồ xuống dưới"
                    className="absolute bottom-2 left-1/2 z-30 w-8 h-8 -translate-x-1/2 inline-flex items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-md hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </button>
                </>
              )}
              
              {/* SVG Overlay for Polygon Drawing */}
              {(drawMode === 'POLYGON' || drawMode === 'ERASE_POLYGON') && (
                <PolygonOverlay
                  polygonLinePoints={polygonLinePoints}
                  polygonPoints={polygonPoints}
                  polygonEdges={polygonEdges}
                  previewEdge={previewEdge}
                  drawingStrokeColor={drawingStrokeColor}
                  rowCount={rowCount}
                  colCount={colCount}
                  metrics={gridMetrics}
                />
              )}

              {drawMode === 'RECTANGLE' && rectangleFrame && (
                <div
                  onMouseDown={startRectangleDrag}
                  className={`absolute z-20 rounded-md border-2 ${canEdit ? 'cursor-move' : 'cursor-not-allowed'}`}
                  style={{
                    left: CANVAS_PADDING + rectangleFrame.col * gridMetrics.cellStep,
                    top: CANVAS_PADDING + rectangleFrame.row * gridMetrics.cellStep,
                    width: Math.max(8, rectangleFrame.cols * gridMetrics.cellStep - gridMetrics.gapSize),
                    height: Math.max(8, rectangleFrame.rows * gridMetrics.cellStep - gridMetrics.gapSize),
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
                zoneColorById={zoneColorById}
                canEdit={canEdit}
                drawMode={drawMode}
                metrics={gridMetrics}
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

      </div>
    </AdminLayout>
  );
}
