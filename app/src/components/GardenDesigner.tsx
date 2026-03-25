import React, { useState, useCallback } from 'react';
import { GardenSpec, GardenBed, BedType, PlantStatus, SunRequirement, PropertyConfig } from '../types/garden';
import { Canvas } from './Canvas';
import { PlantPalette } from './PlantPalette';
import { BedEditor } from './BedEditor';
import { SunSimulator } from './SunSimulator';
import { GardenPropertyEditor } from './GardenPropertyEditor';
import { DesignChat } from './DesignChat';

interface GardenDesignerProps {
  spec: GardenSpec;
  onAddBed: (bed: { name: string; type: BedType; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x?: number; y?: number }) => string;
  onSetPlant: (bedId: string, row: number, col: number, plantId: string | null) => void;
  onUpdateStatus: (bedId: string, row: number, col: number, status: PlantStatus) => void;
  onResize: (bedId: string, width: number, length: number) => void;
  onRemoveBed: (bedId: string) => void;
  onUpdateBed: (bedId: string, updates: Partial<GardenBed>) => void;
}

const DEFAULT_PROPERTY: PropertyConfig = {
  lot_width_ft: 50,
  lot_depth_ft: 80,
  house_x: 10,
  house_y: 10,
  house_width_ft: 30,
  house_depth_ft: 25,
  orientation_deg: 0,
};

export const GardenDesigner: React.FC<GardenDesignerProps> = ({
  spec, onAddBed, onSetPlant, onUpdateStatus, onResize, onRemoveBed, onUpdateBed
}) => {
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [showSunSim, setShowSunSim] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [shadowPolygons, setShadowPolygons] = useState<Array<{ points: string; opacity: number }>>([]);
  const [sunHourMap, setSunHourMap] = useState<Map<string, number>>(new Map());

  const property = spec.property ?? DEFAULT_PROPERTY;
  const selectedBed = spec.beds.find(b => b.id === selectedBedId) ?? null;

  const handleAddBedToCanvas = useCallback((bed: { name: string; type: BedType; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x: number; y: number }) => {
    const id = onAddBed(bed);
    // Set position via update since addBed may not support x/y
    onUpdateBed(id, { x: bed.x, y: bed.y });
    setSelectedBedId(id);
    return id;
  }, [onAddBed, onUpdateBed]);

  const handleUpdateBed = useCallback((bedId: string, updates: Partial<GardenBed>) => {
    // If width/length changed, also resize the squares array
    if (updates.widthFt !== undefined || updates.lengthFt !== undefined) {
      const bed = spec.beds.find(b => b.id === bedId);
      if (bed) {
        const newW = updates.widthFt ?? bed.widthFt;
        const newL = updates.lengthFt ?? bed.lengthFt;
        if (newW !== bed.widthFt || newL !== bed.lengthFt) {
          onResize(bedId, newW, newL);
        }
      }
      // Also apply other updates (like position)
      const { widthFt, lengthFt, ...rest } = updates;
      if (Object.keys(rest).length > 0) {
        onUpdateBed(bedId, rest);
      }
    } else {
      onUpdateBed(bedId, updates);
    }
  }, [spec.beds, onResize, onUpdateBed]);

  const handleDropPlant = useCallback((bedId: string, row: number, col: number, plantId: string) => {
    onSetPlant(bedId, row, col, plantId);
  }, [onSetPlant]);

  const handleStartCreateBed = () => {
    window.dispatchEvent(new Event('canvas-start-create-bed'));
  };

  const handleShadowsUpdate = useCallback((shadows: Array<{ points: string; opacity: number }>) => {
    setShadowPolygons(shadows);
  }, []);

  const handleSunHoursUpdate = useCallback((map: Map<string, number>) => {
    setSunHourMap(map);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="bg-white border-b border-parchment-200 px-4 py-2 flex items-center gap-2 shrink-0">
        <button onClick={handleStartCreateBed} className="btn-primary text-xs py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Bed
        </button>
        <div className="w-px h-5 bg-parchment-200 mx-1" />
        <button
          onClick={() => setShowSunSim(!showSunSim)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showSunSim ? 'bg-gold-100 text-gold-700 border border-gold-300' : 'text-parchment-500 hover:bg-parchment-100'
          }`}
        >
          Sun Sim
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showGrid ? 'bg-parchment-100 text-parchment-700 border border-parchment-300' : 'text-parchment-500 hover:bg-parchment-100'
          }`}
        >
          Grid
        </button>
        <div className="w-px h-5 bg-parchment-200 mx-1" />
        <div className="flex items-center bg-parchment-100 rounded-lg">
          <button onClick={() => (window as any).__canvasZoomOut?.()} className="px-2 py-1 text-parchment-600 hover:text-parchment-800 text-sm font-medium">-</button>
          <div className="w-px h-4 bg-parchment-200" />
          <button onClick={() => (window as any).__canvasZoomFit?.()} className="px-2.5 py-1 text-parchment-500 hover:text-parchment-700 text-[10px] font-medium uppercase">Fit</button>
          <div className="w-px h-4 bg-parchment-200" />
          <button onClick={() => (window as any).__canvasZoomIn?.()} className="px-2 py-1 text-parchment-600 hover:text-parchment-800 text-sm font-medium">+</button>
        </div>
        <div className="flex-1" />
        <span className="text-[11px] text-parchment-400">
          {spec.beds.length} bed{spec.beds.length !== 1 ? 's' : ''} &middot; Alt+drag to pan &middot; Scroll to zoom
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Plant Palette */}
        <PlantPalette spec={spec} selectedBedId={selectedBedId} />

        {/* Center: Canvas */}
        <div className="flex-1 relative">
          <Canvas
            spec={spec}
            selectedBedId={selectedBedId}
            onSelectBed={setSelectedBedId}
            onUpdateBed={handleUpdateBed}
            onAddBed={handleAddBedToCanvas}
            onDropPlant={handleDropPlant}
            showSunSim={showSunSim}
            sunHourMap={showSunSim ? sunHourMap : undefined}
            shadowPolygons={showSunSim ? shadowPolygons : undefined}
            showGrid={showGrid}
            property={property}
          />
        </div>

        {/* Right: Detail panel */}
        <div className="w-[320px] bg-white border-l border-earth-200 overflow-y-auto shrink-0">
          {showSunSim && (
            <div className="p-3 border-b border-earth-200">
              <SunSimulator
                property={property}
                spec={spec}
                onShadowsUpdate={handleShadowsUpdate}
                onSunHoursUpdate={handleSunHoursUpdate}
              />
            </div>
          )}

          {selectedBed ? (
            <div className="p-0">
              <BedEditor
                bed={selectedBed}
                onSetPlant={onSetPlant}
                onUpdateStatus={onUpdateStatus}
                onResize={onResize}
                onRemove={(bedId) => { onRemoveBed(bedId); setSelectedBedId(null); }}
                onUpdateBed={onUpdateBed}
              />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Garden Space Settings */}
              <GardenPropertyEditor property={property} onUpdate={(updates) => {
                const merged = { ...property, ...updates };
                // Update spec.property via onUpdateBed hack — we pass through updateSpec
                // We need to call the parent's updateSpec. For now use onUpdateBed's parent scope.
                // Actually, we can dispatch a custom event that App picks up.
                window.dispatchEvent(new CustomEvent('update-property', { detail: merged }));
              }} />

              {/* Help Text */}
              <div className="text-center text-parchment-400 py-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-parchment-300">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>
                </svg>
                <p className="text-xs mb-1">Click a bed on the canvas to edit it</p>
                <p className="text-[11px] text-parchment-300">Or click "Add Bed" and drag to create</p>
              </div>

              {/* How to use guide */}
              <div className="bg-sage-50 rounded-xl border border-sage-200 p-4">
                <h4 className="text-xs font-semibold text-sage-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '0' }}>
                  How to Plant
                </h4>
                <div className="space-y-2 text-[11px] text-sage-600">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sage-500 mt-px">1.</span>
                    <span>Select a bed by clicking it on the canvas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sage-500 mt-px">2.</span>
                    <span>Click any square in the planting grid</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sage-500 mt-px">3.</span>
                    <span>Pick a plant from the list — green = good companion, red = avoid</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sage-500 mt-px">4.</span>
                    <span><strong>Or drag</strong> from the left plant palette onto a bed</span>
                  </div>
                </div>
              </div>

              {/* SFG Reference */}
              <div className="bg-parchment-50 rounded-xl border border-parchment-200 p-4">
                <h4 className="text-xs font-semibold text-parchment-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '0' }}>
                  SFG Spacing Guide
                </h4>
                <div className="space-y-1.5 text-[11px] text-parchment-600">
                  <div className="flex justify-between"><span className="font-medium">16/sqft</span><span>Carrot, Radish, Green Onion</span></div>
                  <div className="flex justify-between"><span className="font-medium">9/sqft</span><span>Beet, Spinach, Bean, Turnip</span></div>
                  <div className="flex justify-between"><span className="font-medium">4/sqft</span><span>Lettuce, Basil, Chard, Parsley</span></div>
                  <div className="flex justify-between"><span className="font-medium">1/sqft</span><span>Tomato, Pepper, Broccoli, Kale</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Assistant */}
      <DesignChat
        spec={spec}
        onAddBed={onAddBed}
        onSetPlant={onSetPlant}
        onRemoveBed={onRemoveBed}
        isOpen={showChat}
        onToggle={() => setShowChat(!showChat)}
      />
    </div>
  );
};
