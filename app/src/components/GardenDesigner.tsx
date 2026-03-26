import React, { useState, useCallback } from 'react';
import { GardenSpec, GardenBed, BedType, SunRequirement, PropertyConfig } from '../types/garden';
import { Canvas } from './Canvas';
import { SunSimulator } from './SunSimulator';
import { GuidePanel } from './GuidePanel';
import { WelcomeScreen } from './WelcomeScreen';
// GardenPropertyEditor available for future use

interface GardenDesignerProps {
  spec: GardenSpec;
  onAddBed: (bed: { name: string; type: BedType; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x?: number; y?: number }) => string;
  onSetPlant: (bedId: string, row: number, col: number, plantId: string | null) => void;
  onUpdateStatus: (bedId: string, row: number, col: number, status: any) => void;
  onResize: (bedId: string, width: number, length: number) => void;
  onRemoveBed: (bedId: string) => void;
  onUpdateBed: (bedId: string, updates: Partial<GardenBed>) => void;
  // Garden management
  onSaveAs?: (name: string) => void;
  onLoadGarden?: (id: string) => void;
  onDeleteGarden?: (id: string) => void;
  onLoadSample?: () => void;
  onReset?: () => void;
  onExportJSON?: () => void;
  onImportJSON?: (file: File) => void;
  savedGardens?: { id: string; name: string; updatedAt: string }[];
}

const DEFAULT_PROPERTY: PropertyConfig = {
  lot_width_ft: 30,
  lot_depth_ft: 20,
  house_x: 0,
  house_y: 0,
  house_width_ft: 0,
  house_depth_ft: 0,
  orientation_deg: 0,
};

export const GardenDesigner: React.FC<GardenDesignerProps> = ({
  spec, onAddBed, onSetPlant, onUpdateStatus, onResize, onRemoveBed, onUpdateBed,
  onSaveAs, onLoadGarden, onDeleteGarden, onLoadSample, onReset, onExportJSON, onImportJSON, savedGardens,
}) => {
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [showSunSim, setShowSunSim] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [shadowPolygons, setShadowPolygons] = useState<Array<{ points: string; opacity: number }>>([]);
  const [sunHourMap, setSunHourMap] = useState<Map<string, number>>(new Map());

  const property = spec.property ?? DEFAULT_PROPERTY;
  const selectedBed = spec.beds.find(b => b.id === selectedBedId) ?? null;
  const hasContent = spec.beds.length > 0;

  const handleAddBedToCanvas = useCallback((bed: { name: string; type: BedType; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x: number; y: number }) => {
    const id = onAddBed(bed);
    onUpdateBed(id, { x: bed.x, y: bed.y });
    setSelectedBedId(id);
    return id;
  }, [onAddBed, onUpdateBed]);

  const handleUpdateBed = useCallback((bedId: string, updates: Partial<GardenBed>) => {
    if (updates.widthFt !== undefined || updates.lengthFt !== undefined) {
      const bed = spec.beds.find(b => b.id === bedId);
      if (bed) {
        const newW = updates.widthFt ?? bed.widthFt;
        const newL = updates.lengthFt ?? bed.lengthFt;
        if (newW !== bed.widthFt || newL !== bed.lengthFt) onResize(bedId, newW, newL);
      }
      const { widthFt, lengthFt, ...rest } = updates;
      if (Object.keys(rest).length > 0) onUpdateBed(bedId, rest);
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

  if (!hasContent) {
    return (
      <WelcomeScreen
        onStart={(w, d) => {
          window.dispatchEvent(new CustomEvent('update-property', {
            detail: { ...property, lot_width_ft: w, lot_depth_ft: d },
          }));
          const centerX = (w / 2) - 2;
          const centerY = (d / 2) - 2;
          onAddBed({
            name: 'Bed 1',
            type: 'raised' as BedType,
            widthFt: 4,
            lengthFt: 4,
            sunExposure: 'full_sun' as SunRequirement,
            x: centerX,
            y: centerY,
          });
        }}
        onLoadSample={onLoadSample}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Minimal toolbar */}
      <div className="px-4 py-2 flex items-center gap-2 shrink-0 border-b" style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'rgba(180,210,180,0.15)' }}>
        <button onClick={handleStartCreateBed} className="btn-primary text-xs py-1.5 px-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Bed
        </button>
        <div className="w-px h-5 bg-parchment-200 mx-1" />
        <button onClick={() => setShowSunSim(!showSunSim)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showSunSim ? 'bg-gold-100 text-gold-700' : 'text-parchment-400 hover:text-parchment-600'}`}>
          Sun
        </button>
        <button onClick={() => setShowGrid(!showGrid)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showGrid ? 'text-parchment-600' : 'text-parchment-400'}`}>
          Grid
        </button>
        <div className="w-px h-5 bg-parchment-200 mx-1" />
        <div className="flex items-center rounded-lg" style={{ background: 'rgba(240,245,241,0.5)' }}>
          <button onClick={() => (window as any).__canvasZoomOut?.()} className="px-2 py-1 text-parchment-500 text-sm">-</button>
          <button onClick={() => (window as any).__canvasZoomFit?.()} className="px-2 py-1 text-parchment-400 text-[10px]">Fit</button>
          <button onClick={() => (window as any).__canvasZoomIn?.()} className="px-2 py-1 text-parchment-500 text-sm">+</button>
        </div>
        <div className="flex-1" />
        <span className="text-[11px] text-parchment-400">
          {spec.beds.length} bed{spec.beds.length !== 1 ? 's' : ''} &middot; scroll to zoom &middot; alt+drag to pan
        </span>
      </div>

      {/* Main layout: Canvas + Guide Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
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

          {/* Sun simulator overlay */}
          {showSunSim && (
            <div className="absolute top-2 left-2 z-10 rounded-xl shadow-lg p-3" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(180,210,180,0.3)', maxWidth: '280px' }}>
              <SunSimulator
                property={property}
                spec={spec}
                onShadowsUpdate={setShadowPolygons}
                onSunHoursUpdate={setSunHourMap}
              />
            </div>
          )}
        </div>

        {/* Docked Guide Panel */}
        <GuidePanel
          spec={spec}
          selectedBed={selectedBed}
          onSetPlant={onSetPlant}
          onUpdateStatus={onUpdateStatus}
          onResize={onResize}
          onRemoveBed={onRemoveBed}
          onUpdateBed={onUpdateBed}
          onAddBed={onAddBed}
          onSaveAs={onSaveAs}
          onLoadGarden={onLoadGarden}
          onDeleteGarden={onDeleteGarden}
          onLoadSample={onLoadSample}
          onReset={onReset}
          onExportJSON={onExportJSON}
          onImportJSON={onImportJSON}
          savedGardens={savedGardens}
          onDeselectBed={() => setSelectedBedId(null)}
        />
      </div>
    </div>
  );
};
