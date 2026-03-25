import React, { useState, useMemo } from 'react';
import { plants } from '../data/plants';
import { PlantCard } from './PlantCard';
import { PlantDetailModal } from './PlantDetailModal';
import { Plant } from '../types/garden';

type SortKey = 'name' | 'maturity' | 'spacing' | 'yield';
type FilterFamily = 'all' | 'vegetable' | 'herb' | 'vine' | 'root' | 'leafy';

export const PlantLibrary: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [filterFamily, setFilterFamily] = useState<FilterFamily>('all');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const filtered = useMemo(() => {
    let result = [...plants];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.common_name.toLowerCase().includes(q) ||
        p.botanical_name.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (filterFamily !== 'all') {
      const familyMap: Record<string, string[]> = {
        vegetable: ['Solanaceae', 'Cucurbitaceae', 'Fabaceae', 'Poaceae', 'Brassicaceae'],
        herb: ['Lamiaceae', 'Apiaceae'],
        vine: ['Cucurbitaceae', 'Fabaceae'],
        root: ['Apiaceae', 'Amaryllidaceae', 'Chenopodiaceae'],
        leafy: ['Chenopodiaceae', 'Asteraceae', 'Brassicaceae'],
      };
      if (filterFamily === 'herb') {
        result = result.filter(p =>
          p.tags.includes('herb') || familyMap.herb.includes(p.family)
        );
      } else {
        result = result.filter(p => familyMap[filterFamily]?.includes(p.family));
      }
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'maturity': return a.days_to_maturity - b.days_to_maturity;
        case 'spacing': return b.spacing_per_sqft - a.spacing_per_sqft;
        case 'yield': return (b.yield_per_plant_lbs ?? 0) - (a.yield_per_plant_lbs ?? 0);
        default: return a.common_name.localeCompare(b.common_name);
      }
    });

    return result;
  }, [search, sortBy, filterFamily]);

  const familyCounts = useMemo(() => ({
    all: plants.length,
    vegetable: plants.filter(p => ['Solanaceae', 'Cucurbitaceae', 'Fabaceae', 'Poaceae', 'Brassicaceae'].includes(p.family)).length,
    herb: plants.filter(p => p.tags.includes('herb') || ['Lamiaceae', 'Apiaceae'].includes(p.family)).length,
    root: plants.filter(p => ['Apiaceae', 'Amaryllidaceae', 'Chenopodiaceae'].includes(p.family) && !p.tags.includes('herb')).length,
    leafy: plants.filter(p => ['Chenopodiaceae', 'Asteraceae', 'Brassicaceae'].includes(p.family)).length,
    vine: plants.filter(p => p.growth_habit?.toLowerCase().includes('vine') || p.growth_habit?.toLowerCase().includes('sprawl')).length,
  }), []);

  return (
    <div className="p-8 max-w-7xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(95,154,100,0.7)' }}>
          Plant Library
        </p>
        <h1 className="text-4xl text-parchment-900 italic" style={{ fontFamily: 'var(--font-display)' }}>
          What will you cultivate?
        </h1>
        <p className="text-parchment-500 mt-2 text-sm">
          {plants.length} plants &middot; Zone 4b Minnesota &middot; UMN Extension data
        </p>
        <div className="leaf-divider mt-6" />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search plants, families, or tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-parchment-200 rounded-xl text-sm"
          />
        </div>

        <div className="flex gap-1.5">
          {(['all', 'vegetable', 'herb', 'root', 'leafy'] as FilterFamily[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterFamily(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterFamily === f
                  ? 'bg-sage-600 text-white'
                  : 'bg-white border border-parchment-200 text-parchment-600 hover:border-parchment-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1 opacity-60">{familyCounts[f]}</span>
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="px-3 py-2 bg-white border border-parchment-200 rounded-lg text-xs text-parchment-600"
        >
          <option value="name">Sort: A-Z</option>
          <option value="maturity">Sort: Days to maturity</option>
          <option value="spacing">Sort: Most per sqft</option>
          <option value="yield">Sort: Highest yield</option>
        </select>
      </div>

      {/* Results Count */}
      <p className="text-xs text-parchment-400 mb-4">
        Showing {filtered.length} plant{filtered.length !== 1 ? 's' : ''}
        {search && ` matching "${search}"`}
      </p>

      {/* Plant Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(plant => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onClick={() => setSelectedPlant(plant)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-parchment-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-parchment-100 mx-auto flex items-center justify-center mb-3 text-2xl">
            &#9752;
          </div>
          <p className="text-parchment-500 text-sm">No plants match your search</p>
          <button onClick={() => { setSearch(''); setFilterFamily('all'); }} className="text-sage-600 text-xs font-medium mt-2 hover:text-sage-700">Clear filters</button>
        </div>
      )}

      {selectedPlant && (
        <PlantDetailModal
          plant={selectedPlant}
          onClose={() => setSelectedPlant(null)}
        />
      )}
    </div>
  );
};
