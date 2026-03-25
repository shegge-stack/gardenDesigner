import React, { useState } from 'react';
import { plants } from '../data/plants';
import { GardenSpec } from '../types/garden';
import { checkCompanionCompatibility } from '../utils/companions';

interface PlantPaletteProps {
  spec: GardenSpec;
  selectedBedId: string | null;
}

export const PlantPalette: React.FC<PlantPaletteProps> = ({ spec, selectedBedId }) => {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Count how many of each plant are placed across all beds
  const plantCounts: Record<string, number> = {};
  spec.beds.forEach(bed => {
    bed.squares.flat().forEach(sq => {
      if (sq.plantId) {
        plantCounts[sq.plantId] = (plantCounts[sq.plantId] || 0) + 1;
      }
    });
  });

  // Get plants already in the selected bed for companion checking
  const selectedBed = spec.beds.find(b => b.id === selectedBedId);
  const bedPlantIds = selectedBed
    ? [...new Set(selectedBed.squares.flat().filter(s => s.plantId).map(s => s.plantId!))]
    : [];

  const categories = [...new Set(plants.map(p => p.family))].sort();

  const filteredPlants = plants.filter(p => {
    const matchesText = p.common_name.toLowerCase().includes(filter.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.family === categoryFilter;
    return matchesText && matchesCat;
  });

  const handleDragStart = (e: React.DragEvent, plantId: string) => {
    e.dataTransfer.setData('text/plantId', plantId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-[250px] bg-white border-r border-earth-200 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-earth-200">
        <h3 className="font-semibold text-soil-800 text-sm mb-2">Plant Palette</h3>
        <input
          type="text"
          placeholder="Search plants..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full text-xs border border-earth-300 rounded-lg px-2 py-1.5 mb-2"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="w-full text-xs border border-earth-300 rounded-lg px-2 py-1.5"
        >
          <option value="all">All Families</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredPlants.map(plant => {
          const count = plantCounts[plant.id] || 0;

          // Companion compatibility with selected bed
          let companionIndicator: 'good' | 'bad' | 'neutral' = 'neutral';
          if (bedPlantIds.length > 0) {
            const hasGood = bedPlantIds.some(id => checkCompanionCompatibility(plant.id, id) === 'good');
            const hasBad = bedPlantIds.some(id => checkCompanionCompatibility(plant.id, id) === 'bad');
            if (hasGood && !hasBad) companionIndicator = 'good';
            else if (hasBad) companionIndicator = 'bad';
          }

          return (
            <div
              key={plant.id}
              draggable
              onDragStart={(e) => handleDragStart(e, plant.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors text-xs hover:bg-earth-50 ${
                companionIndicator === 'good'
                  ? 'bg-green-50 ring-1 ring-green-300'
                  : companionIndicator === 'bad'
                  ? 'bg-red-50 ring-1 ring-red-300'
                  : ''
              }`}
            >
              <span className="text-lg shrink-0">{plant.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-soil-700 truncate">{plant.common_name}</p>
                <p className="text-[10px] text-soil-400">{plant.spacing_per_sqft}/sqft</p>
              </div>
              {count > 0 && (
                <span className="bg-forest-100 text-forest-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                  {count}
                </span>
              )}
              {companionIndicator === 'good' && (
                <span className="text-green-500 text-xs shrink-0">+</span>
              )}
              {companionIndicator === 'bad' && (
                <span className="text-red-500 text-xs shrink-0">-</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-earth-200 text-[10px] text-soil-400 text-center">
        Drag plants onto bed squares
      </div>
    </div>
  );
};
