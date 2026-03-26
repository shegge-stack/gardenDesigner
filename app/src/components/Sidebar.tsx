import React, { useState } from 'react';
import { GardenSpec } from '../types/garden';
import { exportGardenPdf } from '../utils/exportPdf';
import { getSeasonPhase } from '../utils/calendar';

export type View = 'designer' | 'library' | 'plan';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: View) => void;
  spec?: GardenSpec;
}

const navItems: { view: View; label: string; emoji: string }[] = [
  { view: 'designer', label: 'My Garden', emoji: '🌿' },
  { view: 'library', label: 'Plants', emoji: '🌱' },
  { view: 'plan', label: 'Plan', emoji: '📋' },
];

const seasonEmoji: Record<string, string> = {
  'Indoor Seeding': '🌱',
  'Planning': '📝',
  'Cool Season Planting': '🥬',
  'Warm Season Planting': '🌻',
  'Growing Season': '☀️',
  'Harvest': '🎃',
  'Fall Cleanup': '🍂',
  'Winter Rest': '❄️',
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, spec }) => {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const season = getSeasonPhase(new Date());
  const sEmoji = seasonEmoji[season.phase] || '🌿';

  return (
    <aside
      className="w-16 min-h-screen flex flex-col items-center shrink-0 relative z-30"
      style={{
        background: 'linear-gradient(180deg, #122415 0%, #18301b 40%, #1d3820 80%, #18301b 100%)',
        borderRight: '1px solid rgba(95,154,100,0.1)',
      }}
    >
      {/* Logo */}
      <div className="pt-5 pb-6">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl animate-float"
          style={{
            background: 'linear-gradient(135deg, rgba(95,154,100,0.25), rgba(67,125,72,0.15))',
            border: '1px solid rgba(95,154,100,0.2)',
            animationDuration: '6s',
          }}
        >
          🌿
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1.5">
        {navItems.map(item => {
          const isActive = currentView === item.view;
          return (
            <div key={item.view} className="relative">
              <button
                onClick={() => onViewChange(item.view)}
                onMouseEnter={() => setTooltip(item.label)}
                onMouseLeave={() => setTooltip(null)}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition-all duration-200"
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(95,154,100,0.3), rgba(67,125,72,0.2))',
                  boxShadow: '0 0 12px rgba(95,154,100,0.15), inset 0 0 0 1px rgba(95,154,100,0.25)',
                } : {
                  opacity: 0.45,
                }}
                title={item.label}
              >
                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {item.emoji}
                </span>
              </button>
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full"
                  style={{ background: 'rgba(143,186,145,0.6)' }} />
              )}
              {/* Tooltip */}
              {tooltip === item.label && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap pointer-events-none z-50 animate-sprout"
                  style={{
                    background: 'rgba(26,48,32,0.95)',
                    color: 'rgba(143,186,145,0.9)',
                    border: '1px solid rgba(95,154,100,0.2)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom — Season + Export */}
      <div className="pb-4 flex flex-col items-center gap-2">
        {/* Season indicator */}
        <div className="relative">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-base"
            onMouseEnter={() => setTooltip(season.phase)}
            onMouseLeave={() => setTooltip(null)}
            style={{ opacity: 0.5 }}
            title={season.phase}
          >
            {sEmoji}
          </div>
          {tooltip === season.phase && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap pointer-events-none z-50 animate-sprout"
              style={{ background: 'rgba(26,48,32,0.95)', color: 'rgba(143,186,145,0.9)', border: '1px solid rgba(95,154,100,0.2)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
            >
              {season.phase}
            </div>
          )}
        </div>

        {/* Export PDF */}
        <div className="relative">
          <button
            onClick={() => spec && exportGardenPdf(spec)}
            onMouseEnter={() => setTooltip('Export PDF')}
            onMouseLeave={() => setTooltip(null)}
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
            style={{ opacity: 0.35 }}
            title="Export PDF"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(143,186,145,0.8)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </button>
          {tooltip === 'Export PDF' && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap pointer-events-none z-50 animate-sprout"
              style={{ background: 'rgba(26,48,32,0.95)', color: 'rgba(143,186,145,0.9)', border: '1px solid rgba(95,154,100,0.2)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
            >
              Export PDF
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
