import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GardenSpec, GardenBed, SunRequirement, PropertyConfig } from '../types/garden';
import { getPlantById } from '../data/plants';

interface CanvasProps {
  spec: GardenSpec;
  selectedBedId: string | null;
  onSelectBed: (bedId: string | null) => void;
  onUpdateBed: (bedId: string, updates: Partial<GardenBed>) => void;
  onAddBed: (bed: { name: string; type: 'raised'; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x: number; y: number }) => string;
  onDropPlant: (bedId: string, row: number, col: number, plantId: string) => void;
  showSunSim: boolean;
  sunHourMap?: Map<string, number>;
  shadowPolygons?: Array<{ points: string; opacity: number }>;
  showGrid: boolean;
  property: PropertyConfig;
}

const CELL_SIZE = 1; // 1 foot per cell in world coords

const sunExposureColors: Record<SunRequirement, string> = {
  full_sun: '#fbbf24',
  partial_sun: '#86efac',
  partial_shade: '#4ade80',
  full_shade: '#166534',
};

const sunExposureFills: Record<SunRequirement, string> = {
  full_sun: '#fef3c7',
  partial_sun: '#dcfce7',
  partial_shade: '#bbf7d0',
  full_shade: '#d1fae5',
};

export const Canvas: React.FC<CanvasProps> = ({
  spec,
  selectedBedId,
  onSelectBed,
  onUpdateBed,
  onAddBed,
  onDropPlant,
  showSunSim,
  sunHourMap,
  shadowPolygons,
  showGrid,
  property,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // View state
  const [viewBox, setViewBox] = useState({ x: -5, y: -5, w: 60, h: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });

  // Drag state for beds
  const [draggingBed, setDraggingBed] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resize state
  const [resizingBed, setResizingBed] = useState<string | null>(null);

  // New bed creation state
  const [isCreating, setIsCreating] = useState(false);
  const [createStart, setCreateStart] = useState<{ x: number; y: number } | null>(null);
  const [createEnd, setCreateEnd] = useState<{ x: number; y: number } | null>(null);

  // Convert screen coords to world coords
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    return {
      x: viewBox.x + sx * viewBox.w,
      y: viewBox.y + sy * viewBox.h,
    };
  }, [viewBox]);

  const snapToGrid = (val: number) => Math.round(val);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const world = screenToWorld(e.clientX, e.clientY);

    setViewBox(prev => {
      const newW = Math.max(10, Math.min(200, prev.w * zoomFactor));
      const newH = Math.max(8, Math.min(160, prev.h * zoomFactor));
      const newX = world.x - (world.x - prev.x) * (newW / prev.w);
      const newY = world.y - (world.y - prev.y) * (newH / prev.h);
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, [screenToWorld]);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or alt+click to pan
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y });
      e.preventDefault();
      return;
    }

    if (isCreating && e.button === 0) {
      const world = screenToWorld(e.clientX, e.clientY);
      const snapped = { x: snapToGrid(world.x), y: snapToGrid(world.y) };
      setCreateStart(snapped);
      setCreateEnd(snapped);
      e.preventDefault();
      return;
    }

    // If clicking on empty space, deselect
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.classList.contains('canvas-bg') || target.classList.contains('grid-line')) {
      onSelectBed(null);
    }
  }, [isCreating, screenToWorld, viewBox, onSelectBed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (e.clientX - panStart.x) / rect.width * viewBox.w;
      const dy = (e.clientY - panStart.y) / rect.height * viewBox.h;
      setViewBox(prev => ({ ...prev, x: panStart.vx - dx, y: panStart.vy - dy }));
      return;
    }

    if (createStart && isCreating) {
      const world = screenToWorld(e.clientX, e.clientY);
      setCreateEnd({ x: snapToGrid(world.x), y: snapToGrid(world.y) });
      return;
    }

    if (draggingBed) {
      const world = screenToWorld(e.clientX, e.clientY);
      const snappedX = snapToGrid(world.x - dragOffset.x);
      const snappedY = snapToGrid(world.y - dragOffset.y);
      onUpdateBed(draggingBed, { x: snappedX, y: snappedY });
      return;
    }

    if (resizingBed) {
      const bed = spec.beds.find(b => b.id === resizingBed);
      if (!bed) return;
      const world = screenToWorld(e.clientX, e.clientY);
      const bx = bed.x ?? 0;
      const by = bed.y ?? 0;
      const newW = Math.max(1, Math.min(12, snapToGrid(world.x - bx)));
      const newL = Math.max(1, Math.min(12, snapToGrid(world.y - by)));
      if (newW !== bed.widthFt || newL !== bed.lengthFt) {
        // We'll call resize through onUpdateBed — the parent handles square array adjustment
        onUpdateBed(resizingBed, { widthFt: newW, lengthFt: newL });
      }
    }
  }, [isPanning, panStart, viewBox, createStart, isCreating, draggingBed, dragOffset, resizingBed, screenToWorld, onUpdateBed, spec.beds]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (createStart && createEnd && isCreating) {
      const x = Math.min(createStart.x, createEnd.x);
      const y = Math.min(createStart.y, createEnd.y);
      const w = Math.max(1, Math.abs(createEnd.x - createStart.x));
      const h = Math.max(1, Math.abs(createEnd.y - createStart.y));
      if (w >= 1 && h >= 1) {
        const bedNum = spec.beds.length + 1;
        onAddBed({
          name: `Bed ${bedNum}`,
          type: 'raised',
          widthFt: w,
          lengthFt: h,
          sunExposure: 'full_sun',
          x,
          y,
        });
      }
      setCreateStart(null);
      setCreateEnd(null);
      setIsCreating(false);
      return;
    }

    if (draggingBed) {
      setDraggingBed(null);
    }
    if (resizingBed) {
      setResizingBed(null);
    }
  }, [isPanning, createStart, createEnd, isCreating, draggingBed, resizingBed, spec.beds.length, onAddBed]);

  // Bed drag start
  const handleBedMouseDown = (bedId: string, e: React.MouseEvent) => {
    if (isCreating) return;
    e.stopPropagation();
    onSelectBed(bedId);
    const bed = spec.beds.find(b => b.id === bedId);
    if (!bed) return;
    const world = screenToWorld(e.clientX, e.clientY);
    setDragOffset({ x: world.x - (bed.x ?? 0), y: world.y - (bed.y ?? 0) });
    setDraggingBed(bedId);
  };

  // Resize handle
  const handleResizeMouseDown = (bedId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingBed(bedId);
  };

  // Drag-and-drop from plant palette
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const plantId = e.dataTransfer.getData('text/plantId');
    if (!plantId) return;

    const world = screenToWorld(e.clientX, e.clientY);

    // Find which bed/square was dropped on
    for (const bed of spec.beds) {
      const bx = bed.x ?? 0;
      const by = bed.y ?? 0;
      if (world.x >= bx && world.x < bx + bed.widthFt && world.y >= by && world.y < by + bed.lengthFt) {
        const col = Math.floor(world.x - bx);
        const row = Math.floor(world.y - by);
        if (row >= 0 && row < bed.lengthFt && col >= 0 && col < bed.widthFt) {
          onDropPlant(bed.id, row, col, plantId);
        }
        return;
      }
    }
  };

  // Allow parent to trigger "create bed" mode
  useEffect(() => {
    const handler = () => setIsCreating(true);
    window.addEventListener('canvas-start-create-bed', handler);
    return () => window.removeEventListener('canvas-start-create-bed', handler);
  }, []);

  // Zoom controls
  const zoomIn = () => setViewBox(prev => ({ ...prev, w: prev.w * 0.8, h: prev.h * 0.8 }));
  const zoomOut = () => setViewBox(prev => ({ ...prev, w: prev.w * 1.25, h: prev.h * 1.25 }));
  const zoomFit = () => setViewBox({ x: -5, y: -5, w: property.lot_width_ft + 10, h: property.lot_depth_ft + 10 });

  // Expose zoom controls
  useEffect(() => {
    (window as any).__canvasZoomIn = zoomIn;
    (window as any).__canvasZoomOut = zoomOut;
    (window as any).__canvasZoomFit = zoomFit;
  });

  const pixelsPerFoot = containerRef.current ? containerRef.current.clientWidth / viewBox.w : 10;
  const showSquares = pixelsPerFoot > 20; // Show SFG grid when zoomed in enough

  return (
    <div ref={containerRef} className="relative w-full h-full bg-earth-100 overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ cursor: isPanning ? 'grabbing' : isCreating ? 'crosshair' : 'default' }}
      >
        {/* Background */}
        <rect
          className="canvas-bg"
          x={viewBox.x - 100}
          y={viewBox.y - 100}
          width={viewBox.w + 200}
          height={viewBox.h + 200}
          fill="#f5f0e8"
        />

        {/* Grid */}
        {showGrid && (
          <g opacity={0.15}>
            {Array.from({ length: Math.ceil(viewBox.w) + 2 }, (_, i) => {
              const x = Math.floor(viewBox.x) + i;
              return (
                <line
                  key={`vg${x}`}
                  className="grid-line"
                  x1={x} y1={viewBox.y}
                  x2={x} y2={viewBox.y + viewBox.h}
                  stroke="#8B7355"
                  strokeWidth={x % 5 === 0 ? 0.08 : 0.03}
                />
              );
            })}
            {Array.from({ length: Math.ceil(viewBox.h) + 2 }, (_, i) => {
              const y = Math.floor(viewBox.y) + i;
              return (
                <line
                  key={`hg${y}`}
                  className="grid-line"
                  x1={viewBox.x} y1={y}
                  x2={viewBox.x + viewBox.w} y2={y}
                  stroke="#8B7355"
                  strokeWidth={y % 5 === 0 ? 0.08 : 0.03}
                />
              );
            })}
          </g>
        )}

        {/* Ruler labels */}
        {showGrid && (
          <g>
            {Array.from({ length: Math.ceil(viewBox.w / 5) + 1 }, (_, i) => {
              const x = Math.floor(viewBox.x / 5) * 5 + i * 5;
              return (
                <text key={`rx${x}`} x={x} y={viewBox.y + 0.8} fontSize={0.6} fill="#8B7355" textAnchor="middle">
                  {x}'
                </text>
              );
            })}
            {Array.from({ length: Math.ceil(viewBox.h / 5) + 1 }, (_, i) => {
              const y = Math.floor(viewBox.y / 5) * 5 + i * 5;
              return (
                <text key={`ry${y}`} x={viewBox.x + 0.3} y={y + 0.2} fontSize={0.6} fill="#8B7355">
                  {y}'
                </text>
              );
            })}
          </g>
        )}

        {/* Property boundary */}
        <rect
          x={0} y={0}
          width={property.lot_width_ft}
          height={property.lot_depth_ft}
          fill="none"
          stroke="#8B7355"
          strokeWidth={0.15}
          strokeDasharray="0.5 0.3"
        />
        <text x={property.lot_width_ft / 2} y={-0.5} fontSize={0.7} fill="#8B7355" textAnchor="middle" fontWeight="bold">
          Property: {property.lot_width_ft}' x {property.lot_depth_ft}'
        </text>

        {/* House footprint */}
        <rect
          x={property.house_x}
          y={property.house_y}
          width={property.house_width_ft}
          height={property.house_depth_ft}
          fill="#d4c5a9"
          stroke="#8B7355"
          strokeWidth={0.12}
        />
        <text
          x={property.house_x + property.house_width_ft / 2}
          y={property.house_y + property.house_depth_ft / 2}
          fontSize={0.8}
          fill="#5c4a2e"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="bold"
        >
          House ({property.house_width_ft}' x {property.house_depth_ft}')
        </text>

        {/* Sun shadow overlay */}
        {showSunSim && shadowPolygons && shadowPolygons.map((sp, i) => (
          <polygon
            key={`shadow-${i}`}
            points={sp.points}
            fill="#1a1a2e"
            opacity={sp.opacity}
          />
        ))}

        {/* Garden beds */}
        {spec.beds.map(bed => {
          const bx = bed.x ?? 0;
          const by = bed.y ?? 0;
          const isSelected = bed.id === selectedBedId;
          const borderColor = sunExposureColors[bed.sunExposure];
          const fillColor = sunExposureFills[bed.sunExposure];

          // Sun hour coloring override
          let bedFill = fillColor;
          if (showSunSim && sunHourMap) {
            const hours = sunHourMap.get(bed.id) ?? 6;
            if (hours >= 6) bedFill = '#fef3c7';
            else if (hours >= 4) bedFill = '#dcfce7';
            else bedFill = '#d1fae5';
          }

          return (
            <g key={bed.id}>
              {/* Bed background */}
              <rect
                x={bx}
                y={by}
                width={bed.widthFt}
                height={bed.lengthFt}
                fill={bedFill}
                stroke={isSelected ? '#166534' : borderColor}
                strokeWidth={isSelected ? 0.15 : 0.08}
                rx={0.1}
                onMouseDown={(e) => handleBedMouseDown(bed.id, e)}
                style={{ cursor: draggingBed === bed.id ? 'grabbing' : 'grab' }}
              />

              {/* SFG grid squares when zoomed in */}
              {showSquares && (
                <g>
                  {bed.squares.map((row, ri) =>
                    row.map((square, ci) => {
                      const plant = square.plantId ? getPlantById(square.plantId) : null;
                      const sqX = bx + ci;
                      const sqY = by + ri;
                      return (
                        <g key={`${ri}-${ci}`}>
                          <rect
                            x={sqX}
                            y={sqY}
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            fill="transparent"
                            stroke="#d4c5a9"
                            strokeWidth={0.02}
                          />
                          {plant && (
                            <>
                              {/* Spacing circle */}
                              <circle
                                cx={sqX + 0.5}
                                cy={sqY + 0.5}
                                r={0.4}
                                fill={plant.color || '#86efac'}
                                opacity={0.3}
                              />
                              <text
                                x={sqX + 0.5}
                                y={sqY + 0.55}
                                fontSize={0.5}
                                textAnchor="middle"
                                dominantBaseline="central"
                              >
                                {plant.icon}
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })
                  )}
                </g>
              )}

              {/* Bed label */}
              <text
                x={bx + bed.widthFt / 2}
                y={by - 0.3}
                fontSize={0.5}
                fill="#374151"
                textAnchor="middle"
                fontWeight="600"
                pointerEvents="none"
              >
                {bed.name}
              </text>

              {/* Measurement labels */}
              <text
                x={bx + bed.widthFt / 2}
                y={by + bed.lengthFt + 0.7}
                fontSize={0.4}
                fill="#6b7280"
                textAnchor="middle"
                pointerEvents="none"
              >
                {bed.widthFt}' x {bed.lengthFt}'
              </text>

              {/* Resize handle (bottom-right corner) */}
              {isSelected && (
                <rect
                  x={bx + bed.widthFt - 0.4}
                  y={by + bed.lengthFt - 0.4}
                  width={0.4}
                  height={0.4}
                  fill="#166534"
                  rx={0.05}
                  style={{ cursor: 'se-resize' }}
                  onMouseDown={(e) => handleResizeMouseDown(bed.id, e)}
                />
              )}
            </g>
          );
        })}

        {/* New bed creation preview */}
        {createStart && createEnd && (
          <rect
            x={Math.min(createStart.x, createEnd.x)}
            y={Math.min(createStart.y, createEnd.y)}
            width={Math.max(1, Math.abs(createEnd.x - createStart.x))}
            height={Math.max(1, Math.abs(createEnd.y - createStart.y))}
            fill="#86efac"
            fillOpacity={0.3}
            stroke="#166534"
            strokeWidth={0.1}
            strokeDasharray="0.3 0.15"
          />
        )}

        {/* Compass rose */}
        <g transform={`translate(${viewBox.x + viewBox.w - 3}, ${viewBox.y + 3}) rotate(${property.orientation_deg})`}>
          <circle r={1.5} fill="white" fillOpacity={0.8} stroke="#8B7355" strokeWidth={0.05} />
          <line x1={0} y1={-1.2} x2={0} y2={-0.3} stroke="#dc2626" strokeWidth={0.1} />
          <line x1={0} y1={0.3} x2={0} y2={1.2} stroke="#374151" strokeWidth={0.06} />
          <line x1={-1.2} y1={0} x2={1.2} y2={0} stroke="#374151" strokeWidth={0.06} />
          <text x={0} y={-1.3} fontSize={0.5} fill="#dc2626" textAnchor="middle" fontWeight="bold">N</text>
          <text x={0} y={1.6} fontSize={0.4} fill="#374151" textAnchor="middle">S</text>
          <text x={1.5} y={0.15} fontSize={0.4} fill="#374151" textAnchor="middle">E</text>
          <text x={-1.5} y={0.15} fontSize={0.4} fill="#374151" textAnchor="middle">W</text>
        </g>
      </svg>

      {/* Mini-map */}
      {viewBox.w < property.lot_width_ft * 0.8 && (
        <div className="absolute bottom-3 right-3 border border-earth-300 bg-white rounded shadow-md" style={{ width: 120, height: 96 }}>
          <svg viewBox={`-2 -2 ${property.lot_width_ft + 4} ${property.lot_depth_ft + 4}`} className="w-full h-full">
            <rect x={0} y={0} width={property.lot_width_ft} height={property.lot_depth_ft} fill="#f5f0e8" stroke="#8B7355" strokeWidth={0.5} />
            <rect x={property.house_x} y={property.house_y} width={property.house_width_ft} height={property.house_depth_ft} fill="#d4c5a9" stroke="#8B7355" strokeWidth={0.3} />
            {spec.beds.map(bed => (
              <rect
                key={bed.id}
                x={bed.x ?? 0}
                y={bed.y ?? 0}
                width={bed.widthFt}
                height={bed.lengthFt}
                fill={sunExposureColors[bed.sunExposure]}
                opacity={0.6}
              />
            ))}
            {/* Viewport indicator */}
            <rect
              x={viewBox.x}
              y={viewBox.y}
              width={viewBox.w}
              height={viewBox.h}
              fill="none"
              stroke="#2563eb"
              strokeWidth={0.5}
            />
          </svg>
        </div>
      )}

      {/* Create bed mode indicator */}
      {isCreating && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-forest-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
          Click and drag on canvas to place bed. Press Esc to cancel.
        </div>
      )}
    </div>
  );
};
