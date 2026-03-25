import React, { useState, useMemo } from 'react';
import { plants } from '../data/plants';
import { GardenSpec } from '../types/garden';
import { MONTH_ABBREVS, getMonthFraction } from '../utils/calendar';
import { PlantDetailModal } from './PlantDetailModal';
import { Plant } from '../types/garden';

interface PlantingCalendarProps {
  spec: GardenSpec;
}

type CalendarFilter = 'all' | 'in_garden' | 'cool_season' | 'warm_season';

export const PlantingCalendar: React.FC<PlantingCalendarProps> = ({ spec }) => {
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const plantIdsInGarden = useMemo(() => {
    const ids = new Set<string>();
    spec.beds.forEach(b => b.squares.flat().forEach(s => { if (s.plantId) ids.add(s.plantId); }));
    return ids;
  }, [spec]);

  const displayPlants = useMemo(() => {
    let filtered = [...plants];
    if (filter === 'in_garden') {
      filtered = filtered.filter(p => plantIdsInGarden.has(p.id));
    } else if (filter === 'cool_season') {
      filtered = filtered.filter(p => p.frost_tolerance === 'hardy' || p.frost_tolerance === 'semi_hardy');
    } else if (filter === 'warm_season') {
      filtered = filtered.filter(p => p.frost_tolerance === 'tender');
    }
    return filtered.sort((a, b) => {
      const aStart = getMonthFraction(a.zone_4_seed_start_date || a.zone_4_direct_sow_date) ?? 12;
      const bStart = getMonthFraction(b.zone_4_seed_start_date || b.zone_4_direct_sow_date) ?? 12;
      return aStart - bStart;
    });
  }, [filter, plantIdsInGarden]);

  // Current date marker (March 24)
  const currentFraction = 2 + 24 / 30; // Month 2 (March, 0-indexed) + day fraction

  const getBarStyle = (startStr: string | null, endStr: string | null, color: string, opacity: number = 1) => {
    const start = getMonthFraction(startStr);
    const end = getMonthFraction(endStr);
    if (start === null) return null;
    const effectiveEnd = end ?? start + 0.5;
    const leftPercent = (start / 12) * 100;
    const widthPercent = Math.max(((effectiveEnd - start) / 12) * 100, 1.5);
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: color,
      opacity,
    };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(95,154,100,0.7)' }}>Calendar</p>
          <h1 className="text-4xl text-parchment-900 italic" style={{ fontFamily: 'var(--font-display)' }}>The Seasons Unfold</h1>
          <p className="text-parchment-500 text-sm mt-1">Zone 4b &middot; Last frost May 10 &middot; First frost Sep 28</p>
        </div>
        <div className="flex gap-1.5">
          {(['all', 'in_garden', 'cool_season', 'warm_season'] as CalendarFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-sage-600 text-white'
                  : 'bg-white border border-parchment-200 text-parchment-600 hover:border-parchment-300'
              }`}
            >
              {f === 'all' ? 'All Plants' :
                f === 'in_garden' ? 'In My Garden' :
                f === 'cool_season' ? 'Cool Season' : 'Warm Season'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-parchment-200 p-3 flex flex-wrap gap-5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-2.5 rounded-sm bg-purple-400" />
          <span className="text-[11px] text-parchment-600">Indoor Seed Start</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white shadow-sm" />
          <span className="text-[11px] text-parchment-600">Transplant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sage-500 border-2 border-white shadow-sm" />
          <span className="text-[11px] text-parchment-600">Direct Sow</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2.5 rounded-sm bg-gold-400" />
          <span className="text-[11px] text-parchment-600">Harvest Window</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-terra-400" />
          <span className="text-[11px] text-parchment-600">Last Frost (May 10)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-blue-500" />
          <span className="text-[11px] text-parchment-600">First Frost (Sep 28)</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-earth-200 shadow-sm overflow-x-auto">
        {/* Month headers */}
        <div className="flex border-b border-earth-200 sticky top-0 bg-white z-10">
          <div className="w-40 shrink-0 px-4 py-2 border-r border-earth-200 bg-earth-50">
            <span className="text-xs font-medium text-soil-500">Plant</span>
          </div>
          <div className="flex-1 flex relative min-w-[720px]">
            {MONTH_ABBREVS.map((month) => (
              <div key={month} className="flex-1 text-center py-2 text-xs font-medium text-soil-500 border-r border-earth-100">
                {month}
              </div>
            ))}
            {/* Last frost line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
              style={{ left: `${(getMonthFraction('May 10')! / 12) * 100}%` }}
            />
            {/* First frost line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
              style={{ left: `${(getMonthFraction('Sep 28')! / 12) * 100}%` }}
            />
            {/* Current date */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-20"
              style={{ left: `${(currentFraction / 12) * 100}%` }}
            >
              <div className="absolute -top-0.5 -left-2 w-4 h-1 bg-red-600 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Plant rows */}
        <div>
          {displayPlants.map(plant => {
            const inGarden = plantIdsInGarden.has(plant.id);
            return (
              <div
                key={plant.id}
                className={`flex border-b border-earth-100 hover:bg-earth-50 transition-colors cursor-pointer ${inGarden ? 'bg-forest-50/30' : ''}`}
                onClick={() => setSelectedPlant(plant)}
              >
                <div className="w-40 shrink-0 px-4 py-2 border-r border-earth-200 flex items-center gap-2">
                  <span className="text-lg">{plant.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-soil-700 truncate">{plant.common_name}</p>
                    <p className="text-[10px] text-soil-400">{plant.days_to_maturity}d</p>
                  </div>
                  {inGarden && <span className="text-[10px] text-forest-600 bg-forest-100 px-1 rounded ml-auto shrink-0">in garden</span>}
                </div>
                <div className="flex-1 relative min-w-[720px] py-1.5">
                  {/* Indoor seed start */}
                  {plant.zone_4_seed_start_date && (() => {
                    const style = getBarStyle(
                      plant.zone_4_seed_start_date,
                      plant.zone_4_transplant_date || plant.zone_4_seed_start_date,
                      '#a78bfa'
                    );
                    return style ? (
                      <div className="absolute h-3 rounded-sm top-1" style={style} title={`Start indoors: ${plant.zone_4_seed_start_date}`} />
                    ) : null;
                  })()}

                  {/* Transplant point */}
                  {plant.zone_4_transplant_date && (() => {
                    const frac = getMonthFraction(plant.zone_4_transplant_date);
                    return frac !== null ? (
                      <div
                        className="absolute w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white shadow"
                        style={{ left: `${(frac / 12) * 100}%`, top: '4px' }}
                        title={`Transplant: ${plant.zone_4_transplant_date}`}
                      />
                    ) : null;
                  })()}

                  {/* Direct sow */}
                  {plant.zone_4_direct_sow_date && (() => {
                    const frac = getMonthFraction(plant.zone_4_direct_sow_date);
                    return frac !== null ? (
                      <div
                        className="absolute w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white shadow"
                        style={{ left: `${(frac / 12) * 100}%`, top: '4px' }}
                        title={`Direct sow: ${plant.zone_4_direct_sow_date}`}
                      />
                    ) : null;
                  })()}

                  {/* Growing period (transplant/sow to harvest start) */}
                  {(() => {
                    const sowDate = plant.zone_4_transplant_date || plant.zone_4_direct_sow_date;
                    if (!sowDate || !plant.harvest_start_date) return null;
                    const style = getBarStyle(sowDate, plant.harvest_start_date, '#86efac', 0.6);
                    return style ? (
                      <div className="absolute h-3 rounded-sm top-5" style={style} title="Growing period" />
                    ) : null;
                  })()}

                  {/* Harvest window */}
                  {plant.harvest_start_date && (() => {
                    const style = getBarStyle(plant.harvest_start_date, plant.harvest_end_date, '#f59e0b');
                    return style ? (
                      <div className="absolute h-3 rounded-sm top-5" style={style} title={`Harvest: ${plant.harvest_start_date} - ${plant.harvest_end_date}`} />
                    ) : null;
                  })()}

                  {/* Last frost line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-200"
                    style={{ left: `${(getMonthFraction('May 10')! / 12) * 100}%` }}
                  />
                  {/* First frost line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-blue-200"
                    style={{ left: `${(getMonthFraction('Sep 28')! / 12) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {displayPlants.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-earth-200">
          <span className="text-4xl block mb-3">📅</span>
          <p className="text-soil-500">
            {filter === 'in_garden'
              ? 'No plants in your garden yet. Add some beds and plants first!'
              : 'No plants match this filter'}
          </p>
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
