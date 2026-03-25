import React from 'react';
import { Plant } from '../types/garden';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
}

const sunLabels: Record<string, string> = {
  full_sun: 'Full sun',
  partial_sun: 'Part sun',
  partial_shade: 'Part shade',
  full_shade: 'Shade',
};

const frostBadge: Record<string, { label: string; cls: string }> = {
  tender: { label: 'Tender', cls: 'bg-terra-100 text-terra-600' },
  semi_hardy: { label: 'Semi-hardy', cls: 'bg-gold-100 text-gold-700' },
  hardy: { label: 'Hardy', cls: 'bg-sage-100 text-sage-700' },
};

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick }) => {
  const frost = frostBadge[plant.frost_tolerance] ?? frostBadge.tender;

  return (
    <button
      onClick={onClick}
      className="rounded-xl p-0 text-left card-hover overflow-hidden group w-full"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(200,210,200,0.4)',
      }}
    >
      {/* Colored header band — botanical watercolor wash */}
      <div
        className="h-2 w-full"
        style={{ background: `linear-gradient(90deg, ${plant.color}50, ${plant.color}20, transparent)` }}
      />

      <div className="p-4">
        {/* Icon + Name */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `${plant.color}15` }}
          >
            {plant.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-parchment-800 leading-tight group-hover:text-sage-700 transition-colors">
              {plant.common_name}
            </h3>
            <p className="text-[11px] text-parchment-400 italic leading-tight mt-0.5 truncate">
              {plant.botanical_name}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-xs text-parchment-400 leading-none mb-0.5">Days</p>
            <p className="text-sm font-semibold text-parchment-700">{plant.days_to_maturity}</p>
          </div>
          <div className="text-center border-x border-parchment-100">
            <p className="text-xs text-parchment-400 leading-none mb-0.5">Per sqft</p>
            <p className="text-sm font-semibold text-parchment-700">{plant.spacing_per_sqft}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-parchment-400 leading-none mb-0.5">Yield</p>
            <p className="text-sm font-semibold text-parchment-700">
              {plant.yield_per_plant_lbs ? `${plant.yield_per_plant_lbs}lb` : '—'}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`badge text-[10px] ${frost.cls}`}>
            {frost.label}
          </span>
          <span className="badge text-[10px] bg-gold-50 text-gold-600">
            {sunLabels[plant.sun_requirement] || plant.sun_requirement}
          </span>
          {plant.tags.includes('beginner_friendly') && (
            <span className="badge text-[10px] bg-sage-50 text-sage-600">Beginner</span>
          )}
        </div>

        {/* Planting dates */}
        <div className="mt-3 pt-3 border-t border-parchment-100 space-y-1">
          {plant.zone_4_seed_start_date && (
            <div className="flex items-center gap-2 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-parchment-500">Start indoors:</span>
              <span className="text-parchment-700 font-medium">{plant.zone_4_seed_start_date}</span>
            </div>
          )}
          {plant.zone_4_transplant_date && (
            <div className="flex items-center gap-2 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-parchment-500">Transplant:</span>
              <span className="text-parchment-700 font-medium">{plant.zone_4_transplant_date}</span>
            </div>
          )}
          {plant.zone_4_direct_sow_date && (
            <div className="flex items-center gap-2 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-sage-400" />
              <span className="text-parchment-500">Direct sow:</span>
              <span className="text-parchment-700 font-medium">{plant.zone_4_direct_sow_date}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};
