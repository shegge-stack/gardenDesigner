import React from 'react';
import { Plant } from '../types/garden';
import { getPlantById } from '../data/plants';

interface PlantDetailModalProps {
  plant: Plant;
  onClose: () => void;
}

export const PlantDetailModal: React.FC<PlantDetailModalProps> = ({ plant, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-parchment-900/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with color band */}
        <div
          className="h-2 w-full rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${plant.color}, ${plant.color}60)` }}
        />

        <div className="p-6">
          {/* Title Row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl"
                style={{ backgroundColor: `${plant.color}15` }}
              >
                {plant.icon}
              </div>
              <div>
                <h2 className="text-2xl text-parchment-900" style={{ fontFamily: 'var(--font-display)' }}>
                  {plant.common_name}
                </h2>
                <p className="text-sm text-parchment-400 italic">{plant.botanical_name}</p>
                <p className="text-xs text-parchment-500 mt-1">Family: {plant.family}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-parchment-100 hover:bg-parchment-200 flex items-center justify-center text-parchment-500 hover:text-parchment-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-parchment-600 mb-6 leading-relaxed">{plant.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Days to maturity', value: `${plant.days_to_maturity}`, unit: 'days' },
              { label: 'Per square foot', value: `${plant.spacing_per_sqft}`, unit: 'plants' },
              { label: 'Yield per plant', value: plant.yield_per_plant_lbs ? `${plant.yield_per_plant_lbs}` : '—', unit: 'lbs' },
              { label: 'Water need', value: plant.water_need.charAt(0).toUpperCase() + plant.water_need.slice(1), unit: '' },
            ].map((stat, i) => (
              <div key={i} className="bg-parchment-50 rounded-lg p-3 text-center">
                <p className="text-xs text-parchment-400 mb-1">{stat.label}</p>
                <p className="text-xl font-light text-parchment-800" style={{ fontFamily: 'var(--font-display)' }}>
                  {stat.value}
                </p>
                {stat.unit && <p className="text-[10px] text-parchment-400">{stat.unit}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Zone 4b Calendar */}
            <div>
              <h3 className="text-sm font-semibold text-parchment-800 mb-3 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '0' }}>
                Zone 4b Dates
              </h3>
              <div className="space-y-2">
                {plant.zone_4_seed_start_date && (
                  <div className="flex items-center gap-3 bg-purple-50 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-xs text-purple-600 flex-1">Start indoors</span>
                    <span className="text-xs font-semibold text-purple-700">{plant.zone_4_seed_start_date}</span>
                  </div>
                )}
                {plant.zone_4_transplant_date && (
                  <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-xs text-blue-600 flex-1">Transplant outdoors</span>
                    <span className="text-xs font-semibold text-blue-700">{plant.zone_4_transplant_date}</span>
                  </div>
                )}
                {plant.zone_4_direct_sow_date && (
                  <div className="flex items-center gap-3 bg-sage-50 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-sage-400" />
                    <span className="text-xs text-sage-600 flex-1">Direct sow</span>
                    <span className="text-xs font-semibold text-sage-700">{plant.zone_4_direct_sow_date}</span>
                  </div>
                )}
                {plant.harvest_start_date && (
                  <div className="flex items-center gap-3 bg-gold-50 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-gold-400" />
                    <span className="text-xs text-gold-600 flex-1">Harvest window</span>
                    <span className="text-xs font-semibold text-gold-700">
                      {plant.harvest_start_date}{plant.harvest_end_date ? ` - ${plant.harvest_end_date}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Companions */}
            <div>
              <h3 className="text-sm font-semibold text-parchment-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                Companion Planting
              </h3>
              {plant.companions_good.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] text-sage-600 font-medium uppercase tracking-wider mb-1.5">Good companions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {plant.companions_good.map(id => {
                      const p = getPlantById(id);
                      return (
                        <span key={id} className="badge bg-sage-50 text-sage-700 text-[11px]">
                          {p ? `${p.icon} ${p.common_name}` : id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {plant.companions_bad.length > 0 && (
                <div>
                  <p className="text-[11px] text-terra-600 font-medium uppercase tracking-wider mb-1.5">Avoid planting with</p>
                  <div className="flex flex-wrap gap-1.5">
                    {plant.companions_bad.map(id => {
                      const p = getPlantById(id);
                      return (
                        <span key={id} className="badge bg-terra-50 text-terra-600 text-[11px]">
                          {p ? `${p.icon} ${p.common_name}` : id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Growing Tips */}
          {plant.growing_tips.length > 0 && (
            <div className="mt-6 pt-6 border-t border-parchment-100">
              <h3 className="text-sm font-semibold text-parchment-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                Growing Tips
              </h3>
              <div className="space-y-2">
                {plant.growing_tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sage-50 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-sage-600">{i + 1}</span>
                    </div>
                    <p className="text-sm text-parchment-600 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Varieties & Pests */}
          <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-parchment-100">
            {plant.varieties.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-parchment-800 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  Recommended Varieties
                </h3>
                <ul className="space-y-1">
                  {plant.varieties.map((v, i) => (
                    <li key={i} className="text-xs text-parchment-600 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-sage-400" />
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plant.pests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-parchment-800 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  Common Pests & Disease
                </h3>
                <ul className="space-y-1">
                  {plant.pests.map((p, i) => (
                    <li key={i} className="text-xs text-parchment-600 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-terra-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mt-6 pt-4 border-t border-parchment-100 flex flex-wrap gap-1.5">
            {plant.tags.map(tag => (
              <span key={tag} className="badge bg-parchment-100 text-parchment-500 text-[10px]">
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
