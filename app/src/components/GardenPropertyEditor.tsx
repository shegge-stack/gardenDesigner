import React, { useState, useEffect } from 'react';
import { PropertyConfig } from '../types/garden';

interface GardenPropertyEditorProps {
  property: PropertyConfig;
  onUpdate: (updates: Partial<PropertyConfig>) => void;
}

export const GardenPropertyEditor: React.FC<GardenPropertyEditorProps> = ({ property, onUpdate }) => {
  const [width, setWidth] = useState(property.lot_width_ft);
  const [depth, setDepth] = useState(property.lot_depth_ft);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [houseW, setHouseW] = useState(property.house_width_ft);
  const [houseD, setHouseD] = useState(property.house_depth_ft);
  const [houseX, setHouseX] = useState(property.house_x);
  const [houseY, setHouseY] = useState(property.house_y);

  useEffect(() => {
    setWidth(property.lot_width_ft);
    setDepth(property.lot_depth_ft);
    setHouseW(property.house_width_ft);
    setHouseD(property.house_depth_ft);
    setHouseX(property.house_x);
    setHouseY(property.house_y);
  }, [property]);

  const hasChanges =
    width !== property.lot_width_ft ||
    depth !== property.lot_depth_ft ||
    houseW !== property.house_width_ft ||
    houseD !== property.house_depth_ft ||
    houseX !== property.house_x ||
    houseY !== property.house_y;

  const handleApply = () => {
    onUpdate({
      lot_width_ft: Math.max(5, width),
      lot_depth_ft: Math.max(5, depth),
      house_width_ft: Math.max(0, houseW),
      house_depth_ft: Math.max(0, houseD),
      house_x: houseX,
      house_y: houseY,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-parchment-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-parchment-100 bg-parchment-50">
        <h3 className="text-xs font-semibold text-parchment-700 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0' }}>
          Garden Space
        </h3>
        <p className="text-[10px] text-parchment-400 mt-0.5">Set the overall dimensions of your garden area</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Garden dimensions */}
        <div>
          <label className="text-[11px] font-medium text-parchment-500 uppercase tracking-wider block mb-1">
            Garden Dimensions (feet)
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="number"
                min={5}
                max={200}
                value={width}
                onChange={e => setWidth(Math.max(1, Number(e.target.value)))}
                className="w-full text-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-parchment-400">width</span>
            </div>
            <span className="text-parchment-400 text-sm">&times;</span>
            <div className="flex-1 relative">
              <input
                type="number"
                min={5}
                max={200}
                value={depth}
                onChange={e => setDepth(Math.max(1, Number(e.target.value)))}
                className="w-full text-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-parchment-400">depth</span>
            </div>
          </div>
          <p className="text-[10px] text-parchment-400 mt-1">{width * depth} total sqft ({(width * depth / 43560).toFixed(3)} acres)</p>
        </div>

        {/* Advanced: House footprint */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full text-left text-[11px] text-parchment-500 hover:text-parchment-700 flex items-center gap-1 py-1"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
          House / structure on lot
        </button>

        {showAdvanced && (
          <div className="pl-3 border-l-2 border-parchment-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-parchment-400 block mb-0.5">House width</label>
                <input type="number" min={0} value={houseW} onChange={e => setHouseW(Number(e.target.value))} className="w-full text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-parchment-400 block mb-0.5">House depth</label>
                <input type="number" min={0} value={houseD} onChange={e => setHouseD(Number(e.target.value))} className="w-full text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-parchment-400 block mb-0.5">Position X</label>
                <input type="number" value={houseX} onChange={e => setHouseX(Number(e.target.value))} className="w-full text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-parchment-400 block mb-0.5">Position Y</label>
                <input type="number" value={houseY} onChange={e => setHouseY(Number(e.target.value))} className="w-full text-xs" />
              </div>
            </div>
            <p className="text-[10px] text-parchment-300">Set to 0x0 to hide the house footprint</p>
          </div>
        )}

        {/* Apply */}
        <button
          onClick={handleApply}
          disabled={!hasChanges}
          className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
            hasChanges
              ? 'bg-sage-600 text-white hover:bg-sage-700'
              : 'bg-parchment-100 text-parchment-400 cursor-not-allowed'
          }`}
        >
          {hasChanges ? 'Apply Garden Dimensions' : 'No changes'}
        </button>
      </div>
    </div>
  );
};
