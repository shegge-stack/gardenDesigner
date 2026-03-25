import React, { useMemo, useState } from 'react';
import { GardenSpec, ShoppingItem } from '../types/garden';
import { getPlantById } from '../data/plants';

interface ShoppingListProps {
  spec: GardenSpec;
  onUpdateList: (items: ShoppingItem[]) => void;
  onToggleItem: (itemId: string) => void;
}

type Category = ShoppingItem['category'];
const categoryLabels: Record<Category, string> = {
  seeds: 'Seeds & Starts',
  transplants: 'Transplants',
  soil_amendments: 'Soil & Amendments',
  infrastructure: 'Infrastructure',
  tools: 'Tools & Supplies',
};
const categoryIcons: Record<Category, string> = {
  seeds: '🌱',
  transplants: '🪴',
  soil_amendments: '🧱',
  infrastructure: '🏗️',
  tools: '🧰',
};

export const ShoppingList: React.FC<ShoppingListProps> = ({ spec, onUpdateList, onToggleItem }) => {
  const [showGenerator, setShowGenerator] = useState(false);

  // Auto-generate shopping list from garden plan
  const generatedItems = useMemo(() => {
    const items: ShoppingItem[] = [];
    const plantCounts: Record<string, number> = {};

    // Count plants across all beds
    spec.beds.forEach(bed => {
      bed.squares.flat().forEach(square => {
        if (square.plantId) {
          plantCounts[square.plantId] = (plantCounts[square.plantId] || 0) + 1;
        }
      });
    });

    // Generate seed items
    Object.entries(plantCounts).forEach(([plantId, count]) => {
      const plant = getPlantById(plantId);
      if (!plant) return;

      const seedsNeeded = count * plant.spacing_per_sqft;
      const packetSeeds = 30; // average seeds per packet
      const packets = Math.ceil(seedsNeeded / packetSeeds);
      const isTransplant = plant.frost_tolerance === 'tender' && plant.seed_start_weeks_before_frost;

      items.push({
        id: `seed_${plantId}`,
        name: `${plant.icon} ${plant.common_name} seeds`,
        category: 'seeds',
        quantity: packets,
        unit: packets === 1 ? 'packet' : 'packets',
        estimatedCost: packets * 3.5,
        purchased: false,
        plantId,
      });

      if (isTransplant && plant.spacing_per_sqft <= 2) {
        // For plants with 1-2 per sqft, you might buy transplants instead
        items.push({
          id: `transplant_${plantId}`,
          name: `${plant.icon} ${plant.common_name} transplants`,
          category: 'transplants',
          quantity: count * plant.spacing_per_sqft,
          unit: 'plants',
          estimatedCost: count * plant.spacing_per_sqft * 4,
          purchased: false,
          plantId,
        });
      }
    });

    // Add soil amendments based on bed size
    const totalSqFt = spec.beds.reduce((sum, b) => sum + b.widthFt * b.lengthFt, 0);
    const raisedBeds = spec.beds.filter(b => b.type === 'raised');

    if (totalSqFt > 0) {
      items.push({
        id: 'compost',
        name: 'Compost',
        category: 'soil_amendments',
        quantity: Math.ceil(totalSqFt / 4),
        unit: 'cubic ft',
        estimatedCost: Math.ceil(totalSqFt / 4) * 5,
        purchased: false,
        plantId: null,
      });

      items.push({
        id: 'fertilizer',
        name: 'All-purpose organic fertilizer (e.g., Espoma Garden-tone)',
        category: 'soil_amendments',
        quantity: Math.ceil(totalSqFt / 100),
        unit: 'bags',
        estimatedCost: Math.ceil(totalSqFt / 100) * 18,
        purchased: false,
        plantId: null,
      });
    }

    if (raisedBeds.length > 0) {
      const raisedSqFt = raisedBeds.reduce((sum, b) => sum + b.widthFt * b.lengthFt, 0);
      items.push({
        id: 'raised_bed_mix',
        name: 'Raised bed soil mix',
        category: 'soil_amendments',
        quantity: Math.ceil((raisedSqFt * 0.75) / 2), // 9 inches deep, 2 cu ft bags
        unit: 'bags (2 cu ft)',
        estimatedCost: Math.ceil((raisedSqFt * 0.75) / 2) * 12,
        purchased: false,
        plantId: null,
      });
    }

    // Infrastructure
    const needsSupport = Object.keys(plantCounts).filter(id => {
      const p = getPlantById(id);
      return p?.needs_support;
    });

    if (needsSupport.length > 0) {
      const tomatoCount = plantCounts['tomato'] || 0;
      const cherryCount = plantCounts['cherry_tomato'] || 0;
      if (tomatoCount + cherryCount > 0) {
        items.push({
          id: 'tomato_cages',
          name: 'Tomato cages (heavy duty)',
          category: 'infrastructure',
          quantity: tomatoCount + cherryCount,
          unit: 'cages',
          estimatedCost: (tomatoCount + cherryCount) * 8,
          purchased: false,
          plantId: null,
        });
      }

      const climbingPlants = needsSupport.filter(id => !['tomato', 'cherry_tomato'].includes(id));
      if (climbingPlants.length > 0) {
        items.push({
          id: 'trellis',
          name: 'Trellis netting or cattle panel',
          category: 'infrastructure',
          quantity: climbingPlants.length,
          unit: 'pieces',
          estimatedCost: climbingPlants.length * 25,
          purchased: false,
          plantId: null,
        });
      }
    }

    // General tools/supplies
    items.push({
      id: 'mulch',
      name: 'Straw mulch',
      category: 'tools',
      quantity: Math.ceil(totalSqFt / 40),
      unit: 'bales',
      estimatedCost: Math.ceil(totalSqFt / 40) * 8,
      purchased: false,
      plantId: null,
    });

    items.push({
      id: 'garden_twine',
      name: 'Garden twine',
      category: 'tools',
      quantity: 1,
      unit: 'roll',
      estimatedCost: 6,
      purchased: false,
      plantId: null,
    });

    items.push({
      id: 'labels',
      name: 'Plant labels / markers',
      category: 'tools',
      quantity: Object.keys(plantCounts).length,
      unit: 'labels',
      estimatedCost: 5,
      purchased: false,
      plantId: null,
    });

    return items;
  }, [spec]);

  const handleGenerate = () => {
    // Merge with existing purchased state
    const existingPurchased = new Set(spec.shoppingList.filter(i => i.purchased).map(i => i.id));
    const merged = generatedItems.map(item => ({
      ...item,
      purchased: existingPurchased.has(item.id),
    }));
    onUpdateList(merged);
    setShowGenerator(false);
  };

  const displayItems = spec.shoppingList.length > 0 ? spec.shoppingList : [];
  const categories = ['seeds', 'transplants', 'soil_amendments', 'infrastructure', 'tools'] as Category[];

  const totalCost = displayItems.reduce((sum, i) => sum + i.estimatedCost, 0);
  const purchasedCost = displayItems.filter(i => i.purchased).reduce((sum, i) => sum + i.estimatedCost, 0);
  const purchasedCount = displayItems.filter(i => i.purchased).length;

  return (
    <div className="p-8 max-w-5xl mx-auto page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(95,154,100,0.7)' }}>Shopping</p>
          <h1 className="text-4xl text-parchment-900 italic" style={{ fontFamily: 'var(--font-display)' }}>Gather Your Supplies</h1>
          <p className="text-parchment-500 text-sm mt-1">Everything you need, from seed to harvest</p>
        </div>
        <button onClick={() => setShowGenerator(true)} className="btn-primary">
          Regenerate from Garden
        </button>
      </div>

      {showGenerator && (
        <div className="bg-harvest-50 border border-harvest-300 rounded-xl p-4">
          <p className="text-sm text-harvest-800 mb-2">
            This will regenerate your shopping list based on your current garden beds and plantings.
            Purchased status will be preserved for matching items.
          </p>
          <div className="flex gap-2">
            <button onClick={handleGenerate}
              className="px-4 py-2 bg-harvest-600 text-white rounded-lg text-sm hover:bg-harvest-700">
              Generate List
            </button>
            <button onClick={() => setShowGenerator(false)}
              className="px-4 py-2 text-soil-500 text-sm hover:text-soil-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-earth-200 p-4 text-center shadow-sm">
          <p className="text-sm text-soil-500">Total Items</p>
          <p className="text-2xl font-bold text-soil-800">{displayItems.length}</p>
          <p className="text-xs text-soil-400">{purchasedCount} purchased</p>
        </div>
        <div className="bg-white rounded-xl border border-earth-200 p-4 text-center shadow-sm">
          <p className="text-sm text-soil-500">Estimated Total</p>
          <p className="text-2xl font-bold text-forest-600">${totalCost.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-earth-200 p-4 text-center shadow-sm">
          <p className="text-sm text-soil-500">Remaining</p>
          <p className="text-2xl font-bold text-harvest-600">${(totalCost - purchasedCost).toFixed(0)}</p>
        </div>
      </div>

      {/* Progress */}
      {displayItems.length > 0 && (
        <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-soil-600">Shopping Progress</span>
            <span className="text-sm font-medium text-soil-700">
              {purchasedCount}/{displayItems.length} items ({displayItems.length > 0 ? Math.round((purchasedCount / displayItems.length) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full bg-earth-100 rounded-full h-3">
            <div
              className="bg-forest-500 rounded-full h-3 transition-all"
              style={{ width: `${displayItems.length > 0 ? (purchasedCount / displayItems.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Items by Category */}
      {displayItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-earth-200 p-12 text-center shadow-sm">
          <span className="text-5xl block mb-4">🛒</span>
          <h2 className="text-xl font-semibold text-soil-700 mb-2">No shopping list yet</h2>
          <p className="text-soil-500 mb-6 max-w-md mx-auto">
            Add some plants to your garden beds, then click "Regenerate from Garden" to auto-generate your shopping list.
          </p>
        </div>
      ) : (
        categories.map(category => {
          const catItems = displayItems.filter(i => i.category === category);
          if (catItems.length === 0) return null;
          const catTotal = catItems.reduce((sum, i) => sum + i.estimatedCost, 0);

          return (
            <div key={category} className="bg-white rounded-xl border border-earth-200 shadow-sm overflow-hidden">
              <div className="bg-earth-50 border-b border-earth-200 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-soil-700 flex items-center gap-2">
                  <span>{categoryIcons[category]}</span>
                  {categoryLabels[category]}
                </h3>
                <span className="text-sm text-soil-500">${catTotal.toFixed(0)} est.</span>
              </div>
              <div className="divide-y divide-earth-100">
                {catItems.map(item => (
                  <div key={item.id} className={`px-4 py-3 flex items-center gap-3 transition-colors ${item.purchased ? 'bg-forest-50/30' : ''}`}>
                    <button
                      onClick={() => onToggleItem(item.id)}
                      className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                        item.purchased
                          ? 'border-forest-500 bg-forest-500'
                          : 'border-earth-300 hover:border-forest-400'
                      }`}
                    >
                      {item.purchased && <span className="text-white text-xs">&#10003;</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.purchased ? 'text-soil-400 line-through' : 'text-soil-700'}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-soil-400">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <span className={`text-sm font-medium ${item.purchased ? 'text-soil-400' : 'text-soil-600'}`}>
                      ${item.estimatedCost.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
