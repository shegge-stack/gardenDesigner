import React, { useState, useEffect } from 'react';
import { GardenBed, BedSquare, PlantStatus, BedType, SunRequirement } from '../types/garden';
import { plants, getPlantById } from '../data/plants';
import { checkCompanionCompatibility, getBedCompatibilityScore } from '../utils/companions';

interface BedEditorProps {
  bed: GardenBed;
  onSetPlant: (bedId: string, row: number, col: number, plantId: string | null) => void;
  onUpdateStatus: (bedId: string, row: number, col: number, status: PlantStatus) => void;
  onResize: (bedId: string, width: number, length: number) => void;
  onRemove: (bedId: string) => void;
  onUpdateBed: (bedId: string, updates: Partial<GardenBed>) => void;
}

const statusColors: Record<PlantStatus, string> = {
  planned: '#d1d5db',
  seeded: '#93c5fd',
  sprouted: '#86efac',
  hardening: '#fde68a',
  transplanted: '#6ee7b7',
  growing: '#22c55e',
  harvesting: '#fbbf24',
  done: '#a78bfa',
};

const statusOptions: PlantStatus[] = ['planned', 'seeded', 'sprouted', 'hardening', 'transplanted', 'growing', 'harvesting', 'done'];

const ROTATION_FAMILIES: Record<string, string> = {
  nightshade: '#ef4444',
  cucurbit: '#f59e0b',
  legume: '#22c55e',
  brassica: '#3b82f6',
  allium: '#a855f7',
  umbellifer: '#f97316',
  goosefoot: '#ec4899',
  herb: '#6366f1',
  composite: '#14b8a6',
  grass: '#eab308',
  carrot: '#f97316',
  fruit: '#e11d48',
};

const bedTypeOptions: { value: BedType; label: string; icon: string }[] = [
  { value: 'raised', label: 'Raised Bed', icon: '🟫' },
  { value: 'in_ground', label: 'In-Ground', icon: '🟩' },
  { value: 'container', label: 'Container/Pot', icon: '🪴' },
  { value: 'barrel', label: 'Barrel Planter', icon: '🪣' },
  { value: 'hanging', label: 'Hanging Planter', icon: '🌿' },
  { value: 'trellis', label: 'Trellis/Vertical', icon: '🪜' },
  { value: 'trough', label: 'Trough/Window Box', icon: '📦' },
];

// Growing guidance per bed type
const bedTypeGuidance: Record<BedType, { tips: string[]; bestPlants: string[]; avoid: string[]; note: string }> = {
  raised: {
    tips: ['Fill with quality mix: 1/3 compost, 1/3 vermiculite, 1/3 peat/coir', 'Line bottom with hardware cloth to deter gophers/voles', 'Ideal depth: 12" for most crops, 18" for root crops'],
    bestPlants: ['All vegetables', 'Herbs', 'Strawberries'],
    avoid: [],
    note: 'Most versatile option — good drainage, warm soil, easy access.',
  },
  in_ground: {
    tips: ['Amend heavy clay with 3-4" compost worked into top 8"', 'Test soil pH before planting — aim for 6.0-7.0', 'Mulch 2-3" deep to retain moisture and suppress weeds'],
    bestPlants: ['Deep-rooted crops (tomatoes, squash)', 'Corn', 'Large plantings'],
    avoid: ['Root crops in rocky/clay soil without amendment'],
    note: 'Best for large gardens. Requires good native soil or amendment.',
  },
  container: {
    tips: ['Use pots with drainage holes — minimum 5 gal for most veggies', 'Water daily in summer — containers dry fast', 'Use quality potting mix, not garden soil', 'Feed every 2 weeks with liquid fertilizer'],
    bestPlants: ['Herbs', 'Peppers', 'Cherry tomatoes', 'Lettuce', 'Strawberries'],
    avoid: ['Corn', 'Large squash', 'Full-size tomatoes (need 10+ gal)'],
    note: 'Great for patios, decks, and small spaces. Needs frequent watering.',
  },
  barrel: {
    tips: ['Half wine/whiskey barrels = ~25 gal, excellent for large plants', 'Drill 4-6 drainage holes in bottom if not present', 'Potato barrels: plant in layers, hill with soil as they grow', 'Strawberry barrels: cut holes in sides for cascading plants'],
    bestPlants: ['Potatoes (tower method: 20+ lbs per barrel)', 'Tomatoes (1 per barrel)', 'Herbs (mixed planting)', 'Strawberries (side-planted)'],
    avoid: ['Corn', 'Sprawling squash'],
    note: 'Excellent for potatoes (layer method) and single large plants. Warm soil = earlier harvest.',
  },
  hanging: {
    tips: ['Use upside-down planters for tomatoes — fruit hangs down, no caging needed', 'Minimum 3 gal capacity for tomatoes, 1 gal for herbs', 'Water 1-2x daily — hanging planters dry fastest', 'Position in full sun but sheltered from wind', 'Use slow-release fertilizer pellets in soil mix'],
    bestPlants: ['Cherry tomatoes (upside-down)', 'Strawberries (cascading)', 'Herbs (basil, thyme, oregano)', 'Lettuce', 'Hot peppers'],
    avoid: ['Heavy fruits (full-size tomatoes, melons)', 'Root crops', 'Corn'],
    note: 'Saves ground space. Perfect for cherry tomatoes — no caging, good air circulation reduces disease.',
  },
  trellis: {
    tips: ['Vertical growing = 2-3x yield per ground sqft', 'Secure trellis to fence, wall, or sink posts 18" deep', 'Train vines daily during peak growth — they grow fast', 'Use soft ties (pantyhose, fabric strips) to avoid stem damage', 'Position on north side of garden so it doesn\'t shade other beds'],
    bestPlants: ['Pole beans (most productive)', 'Cucumbers (straighter fruit when hung)', 'Peas', 'Small melons/squash in slings', 'Tomatoes (cordon/single stem)'],
    avoid: ['Large pumpkins/watermelons (too heavy)', 'Root crops', 'Bush varieties'],
    note: 'Best space-maximizer. A 2x6\' trellis can yield as much as a 4x8\' bed of bush beans.',
  },
  trough: {
    tips: ['Galvanized troughs: drill drainage holes, line with landscape fabric', 'Ideal depth: 8-12" for greens/herbs, 12-18" for larger plants', 'Elevate on cinder blocks for better drainage and back-friendly access', 'Metal heats soil faster in spring = earlier planting', 'In hot summer, insulate sides or use light-colored troughs'],
    bestPlants: ['Lettuce/greens (succession sow every 2 weeks)', 'Herbs', 'Radishes', 'Carrots (if deep enough)', 'Strawberries'],
    avoid: ['Large tomatoes', 'Corn', 'Squash'],
    note: 'Stock tank/trough gardens are trendy and functional. Great for greens and herbs along a fence.',
  },
};

const sunOptions: { value: SunRequirement; label: string }[] = [
  { value: 'full_sun', label: 'Full Sun (6+ hrs)' },
  { value: 'partial_sun', label: 'Part Sun (4-6 hrs)' },
  { value: 'partial_shade', label: 'Part Shade (2-4 hrs)' },
  { value: 'full_shade', label: 'Full Shade (<2 hrs)' },
];

export const BedEditor: React.FC<BedEditorProps> = ({
  bed, onSetPlant, onUpdateStatus, onResize, onRemove, onUpdateBed
}) => {
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const [plantFilter, setPlantFilter] = useState('');
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  // Editable dimensions — always visible
  const [editName, setEditName] = useState(bed.name);
  const [editWidth, setEditWidth] = useState(bed.widthFt);
  const [editLength, setEditLength] = useState(bed.lengthFt);
  const [editType, setEditType] = useState<BedType>(bed.type);
  const [editSun, setEditSun] = useState<SunRequirement>(bed.sunExposure);
  const [, setPendingChanges] = useState(false);

  // Sync when bed changes (e.g. selecting a different bed)
  useEffect(() => {
    setEditName(bed.name);
    setEditWidth(bed.widthFt);
    setEditLength(bed.lengthFt);
    setEditType(bed.type);
    setEditSun(bed.sunExposure);
    setPendingChanges(false);
    setSelectedSquare(null);
    setShowPlantPicker(false);
    setShowConfirmRemove(false);
  }, [bed.id]);

  const hasDimensionChanges = editWidth !== bed.widthFt || editLength !== bed.lengthFt;
  const hasAnyChanges = editName !== bed.name || hasDimensionChanges || editType !== bed.type || editSun !== bed.sunExposure;

  const handleSave = () => {
    const w = Math.max(1, Math.min(20, editWidth));
    const l = Math.max(1, Math.min(20, editLength));
    if (w !== bed.widthFt || l !== bed.lengthFt) {
      onResize(bed.id, w, l);
    }
    onUpdateBed(bed.id, { name: editName, type: editType, sunExposure: editSun });
    setPendingChanges(false);
  };

  const handleFieldChange = () => {
    setPendingChanges(true);
  };

  const allPlantIds = bed.squares.flat().map(s => s.plantId);
  const compatScore = getBedCompatibilityScore(allPlantIds);

  const getSquareCompanionColor = (row: number, col: number, square: BedSquare) => {
    if (!square.plantId || !selectedSquare) return undefined;
    const selSquare = bed.squares[selectedSquare.row]?.[selectedSquare.col];
    if (!selSquare?.plantId) return undefined;
    if (selectedSquare.row === row && selectedSquare.col === col) return undefined;
    const compat = checkCompanionCompatibility(selSquare.plantId, square.plantId);
    if (compat === 'good') return 'ring-2 ring-green-400';
    if (compat === 'bad') return 'ring-2 ring-red-400';
    return undefined;
  };

  const handleSquareClick = (row: number, col: number) => {
    setSelectedSquare({ row, col });
    setShowPlantPicker(true);
    setPlantFilter('');
  };

  const handlePlantSelect = (plantId: string | null) => {
    if (selectedSquare) {
      onSetPlant(bed.id, selectedSquare.row, selectedSquare.col, plantId);
    }
    setShowPlantPicker(false);
  };

  const filteredPlants = plants.filter(p =>
    p.common_name.toLowerCase().includes(plantFilter.toLowerCase())
  );

  const plantCounts: Record<string, number> = {};
  bed.squares.flat().forEach(s => {
    if (s.plantId) plantCounts[s.plantId] = (plantCounts[s.plantId] || 0) + 1;
  });

  const totalSquares = bed.widthFt * bed.lengthFt;
  const filledSquares = bed.squares.flat().filter(s => s.plantId).length;

  return (
    <div className="overflow-y-auto">
      {/* Bed Properties — Always Visible */}
      <div className="p-4 border-b border-parchment-200 bg-parchment-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-parchment-800" style={{ fontFamily: 'var(--font-display)' }}>
            Bed Properties
          </h3>
          <div className="flex items-center gap-1.5">
            {compatScore.total > 0 && (
              <div className="flex items-center gap-1 text-[10px]">
                {compatScore.good > 0 && <span className="badge bg-sage-100 text-sage-600">{compatScore.good} good</span>}
                {compatScore.bad > 0 && <span className="badge bg-terra-100 text-terra-600">{compatScore.bad} bad</span>}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="mb-3">
          <label className="text-[11px] font-medium text-parchment-500 uppercase tracking-wider block mb-1">Name</label>
          <input
            type="text"
            value={editName}
            onChange={e => { setEditName(e.target.value); handleFieldChange(); }}
            className="w-full text-sm"
          />
        </div>

        {/* Dimensions — PROMINENT */}
        <div className="mb-3">
          <label className="text-[11px] font-medium text-parchment-500 uppercase tracking-wider block mb-1">
            Dimensions (feet)
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editWidth}
                  onChange={e => { setEditWidth(Math.max(1, Number(e.target.value))); handleFieldChange(); }}
                  className="w-full text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-parchment-400">W</span>
              </div>
            </div>
            <span className="text-parchment-400 text-sm font-medium">&times;</span>
            <div className="flex-1">
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editLength}
                  onChange={e => { setEditLength(Math.max(1, Number(e.target.value))); handleFieldChange(); }}
                  className="w-full text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-parchment-400">L</span>
              </div>
            </div>
            <span className="text-xs text-parchment-400 whitespace-nowrap">{editWidth * editLength} sqft</span>
          </div>
          {hasDimensionChanges && (
            <p className="text-[10px] text-terra-500 mt-1">
              Resizing will preserve existing plants where squares still exist
            </p>
          )}
        </div>

        {/* Type & Sun — side by side */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[11px] font-medium text-parchment-500 uppercase tracking-wider block mb-1">Type</label>
            <select
              value={editType}
              onChange={e => { setEditType(e.target.value as BedType); handleFieldChange(); }}
              className="w-full text-xs"
            >
              {bedTypeOptions.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-parchment-500 uppercase tracking-wider block mb-1">Sun</label>
            <select
              value={editSun}
              onChange={e => { setEditSun(e.target.value as SunRequirement); handleFieldChange(); }}
              className="w-full text-xs"
            >
              {sunOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Growing Guidance for selected type */}
        {(() => {
          const guidance = bedTypeGuidance[editType];
          if (!guidance) return null;
          return (
            <details className="mb-3 group" open={editType !== 'raised' && editType !== 'in_ground'}>
              <summary className="text-[11px] font-medium text-sage-600 cursor-pointer hover:text-sage-700 flex items-center gap-1 select-none">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-open:rotate-90"><path d="M9 18l6-6-6-6"/></svg>
                {bedTypeOptions.find(o => o.value === editType)?.icon} Growing Guide: {bedTypeOptions.find(o => o.value === editType)?.label}
              </summary>
              <div className="mt-2 bg-sage-50 rounded-lg border border-sage-200 p-3 space-y-2">
                <p className="text-[11px] text-sage-700 font-medium">{guidance.note}</p>

                {guidance.tips.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-1">Tips</p>
                    <ul className="space-y-0.5">
                      {guidance.tips.map((tip, i) => (
                        <li key={i} className="text-[11px] text-sage-600 flex items-start gap-1.5">
                          <span className="text-sage-400 mt-0.5 shrink-0">&#8226;</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {guidance.bestPlants.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-1">Best Plants</p>
                      <div className="flex flex-wrap gap-1">
                        {guidance.bestPlants.map(p => (
                          <span key={p} className="badge bg-sage-100 text-sage-700 text-[9px]">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {guidance.avoid.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-terra-600 uppercase tracking-wider mb-1">Avoid</p>
                      <div className="flex flex-wrap gap-1">
                        {guidance.avoid.map(p => (
                          <span key={p} className="badge bg-terra-50 text-terra-600 text-[9px]">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          );
        })()}

        {/* Save / Remove */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasAnyChanges}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              hasAnyChanges
                ? 'bg-sage-600 text-white hover:bg-sage-700'
                : 'bg-parchment-100 text-parchment-400 cursor-not-allowed'
            }`}
          >
            {hasAnyChanges ? 'Apply Changes' : 'No changes'}
          </button>
          {showConfirmRemove ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onRemove(bed.id)} className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">
                Yes, remove
              </button>
              <button onClick={() => setShowConfirmRemove(false)} className="px-2 py-2 text-xs text-parchment-500 hover:text-parchment-700">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmRemove(true)}
              className="px-3 py-2 text-xs text-parchment-400 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* SFG Grid */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-parchment-700 uppercase tracking-wider">
            Planting Grid
          </h4>
          <span className="text-[11px] text-parchment-400">
            {filledSquares}/{totalSquares} planted
          </span>
        </div>

        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `repeat(${bed.widthFt}, minmax(48px, 56px))` }}
        >
          {bed.squares.map((row, ri) =>
            row.map((square, ci) => {
              const plant = square.plantId ? getPlantById(square.plantId) : null;
              const companionClass = getSquareCompanionColor(ri, ci, square);
              const isSelected = selectedSquare?.row === ri && selectedSquare?.col === ci;
              const rotationColor = plant ? ROTATION_FAMILIES[plant.crop_rotation_family] || '#9ca3af' : undefined;

              return (
                <button
                  key={`${ri}-${ci}`}
                  onClick={() => handleSquareClick(ri, ci)}
                  className={`w-full aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-105 ${
                    isSelected ? 'border-sage-500 bg-sage-50 shadow-sm' : 'border-parchment-200 hover:border-parchment-400'
                  } ${companionClass || ''}`}
                  style={{
                    borderBottomWidth: rotationColor ? '3px' : undefined,
                    borderBottomColor: rotationColor,
                  }}
                >
                  {plant ? (
                    <>
                      <span className="text-lg leading-none">{plant.icon}</span>
                      <span className="text-[8px] text-parchment-600 leading-tight mt-0.5 truncate w-full text-center px-0.5">
                        {plant.common_name}
                      </span>
                      <div className="w-2.5 h-1 rounded-full mt-0.5" style={{ backgroundColor: statusColors[square.status] }} />
                    </>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-parchment-300">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Plant summary */}
        {Object.keys(plantCounts).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(plantCounts).map(([plantId, count]) => {
              const p = getPlantById(plantId);
              if (!p) return null;
              return (
                <span key={plantId} className="badge bg-parchment-100 text-parchment-600 text-[10px]">
                  {p.icon} {p.common_name} &times;{count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Plant Picker */}
      {showPlantPicker && selectedSquare && (
        <div className="border-t border-parchment-200 p-4 bg-parchment-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-parchment-700">
              Square ({selectedSquare.row + 1}, {selectedSquare.col + 1})
            </h4>
            <div className="flex gap-2">
              {bed.squares[selectedSquare.row][selectedSquare.col].plantId && (
                <>
                  <select
                    value={bed.squares[selectedSquare.row][selectedSquare.col].status}
                    onChange={e => onUpdateStatus(bed.id, selectedSquare.row, selectedSquare.col, e.target.value as PlantStatus)}
                    className="text-[11px] py-1 px-2"
                  >
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => handlePlantSelect(null)} className="text-[11px] text-red-500 hover:text-red-700">Clear</button>
                </>
              )}
              <button onClick={() => { setShowPlantPicker(false); setSelectedSquare(null); }}
                className="text-[11px] text-parchment-400 hover:text-parchment-600">&times;</button>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search plants..."
            value={plantFilter}
            onChange={e => setPlantFilter(e.target.value)}
            className="w-full text-xs mb-2"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
            {filteredPlants.map(p => {
              const currentPlant = bed.squares[selectedSquare.row][selectedSquare.col].plantId;
              const otherPlants = bed.squares.flat().filter(s => s.plantId && s.plantId !== currentPlant).map(s => s.plantId!);
              const uniqueOthers = [...new Set(otherPlants)];
              const hasGood = uniqueOthers.some(o => checkCompanionCompatibility(p.id, o) === 'good');
              const hasBad = uniqueOthers.some(o => checkCompanionCompatibility(p.id, o) === 'bad');

              return (
                <button
                  key={p.id}
                  onClick={() => handlePlantSelect(p.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-[11px] transition-colors ${
                    hasBad ? 'bg-red-50 hover:bg-red-100' : hasGood ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-parchment-100'
                  }`}
                >
                  <span className="text-base">{p.icon}</span>
                  <span className="truncate flex-1">{p.common_name}</span>
                  {hasGood && <span className="text-green-500 text-[9px]">+</span>}
                  {hasBad && <span className="text-red-500 text-[9px]">-</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
