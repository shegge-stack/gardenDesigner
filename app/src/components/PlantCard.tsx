import React from 'react';
import { Plant } from '../types/garden';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
}

const frostLabel: Record<string, string> = {
  tender: 'Warm lover',
  semi_hardy: 'Cool tolerant',
  hardy: 'Cold hardy',
};

function getCountdown(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const parts = dateStr.split(' ');
  if (parts.length !== 2) return null;
  const m = months[parts[0]];
  if (m === undefined) return null;
  const d = parseInt(parts[1]);
  const target = new Date(2026, m, d);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < -7) return null;
  if (diff < 0) return 'Now!';
  if (diff === 0) return 'Today!';
  if (diff <= 7) return `In ${diff} days`;
  if (diff <= 14) return `In ${Math.ceil(diff / 7)} weeks`;
  if (diff <= 60) return `In ${Math.ceil(diff / 7)} weeks`;
  return null;
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick }) => {
  const seedCountdown = getCountdown(plant.zone_4_seed_start_date);
  const sowCountdown = getCountdown(plant.zone_4_direct_sow_date);
  const countdown = seedCountdown || sowCountdown;
  const countdownLabel = seedCountdown ? 'Start seeds' : 'Direct sow';

  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-0 text-left overflow-hidden group w-full animate-sprout"
      style={{
        background: `linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.85))`,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(200,215,200,0.35)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 14px 32px -8px ${plant.color}25, 0 4px 12px -4px rgba(30,50,30,0.08), 0 0 0 1px ${plant.color}15`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      {/* Color band */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${plant.color}60, ${plant.color}20, transparent)` }} />

      <div className="p-5">
        {/* Hero icon — big and centered */}
        <div className="text-center mb-3">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300"
            style={{ backgroundColor: `${plant.color}12` }}
          >
            {plant.icon}
          </div>
        </div>

        {/* Name */}
        <h3 className="text-center text-base font-semibold text-parchment-800 leading-tight group-hover:text-sage-700 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
          {plant.common_name}
        </h3>
        <p className="text-center text-[11px] text-parchment-400 italic mt-0.5">
          {plant.botanical_name}
        </p>

        {/* Countdown — the hook */}
        {countdown && (
          <div className="text-center mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: countdown === 'Now!' ? 'linear-gradient(135deg, #437d48, #356539)' : `${plant.color}15`,
                color: countdown === 'Now!' ? 'white' : plant.color,
                border: countdown === 'Now!' ? 'none' : `1px solid ${plant.color}25`,
              }}
            >
              {countdown === 'Now!' ? '🌱' : '📅'} {countdownLabel}: {countdown}
            </span>
          </div>
        )}

        {/* Quick stats — friendly format */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-parchment-500">
          <span>{plant.days_to_maturity} days</span>
          <span className="text-parchment-300">·</span>
          <span>{plant.spacing_per_sqft}/sqft</span>
          <span className="text-parchment-300">·</span>
          <span>{plant.yield_per_plant_lbs ? `${plant.yield_per_plant_lbs} lbs` : '—'}</span>
        </div>

        {/* Tags — soft pills */}
        <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
          <span className="badge text-[10px]" style={{ background: `${plant.color}10`, color: `${plant.color}cc` }}>
            {frostLabel[plant.frost_tolerance] || plant.frost_tolerance}
          </span>
          {plant.tags.includes('beginner_friendly') && (
            <span className="badge text-[10px] bg-gold-50 text-gold-600">Beginner friendly</span>
          )}
          {plant.tags.includes('high_yield') && (
            <span className="badge text-[10px] bg-sage-50 text-sage-600">High yield</span>
          )}
        </div>
      </div>
    </button>
  );
};
