import React, { useState } from 'react';
import { GardenSpec } from '../types/garden';
import { exportGardenPdf } from '../utils/exportPdf';

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

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, spec }) => {
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <aside
      className="w-14 min-h-screen flex flex-col items-center shrink-0 relative z-30"
      style={{ background: 'linear-gradient(180deg, #0f2212 0%, #152717 40%, #1a3020 100%)' }}
    >
      {/* Logo */}
      <div className="pt-4 pb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'rgba(95,154,100,0.2)', border: '1px solid rgba(95,154,100,0.15)' }}
        >
          🌿
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map(item => {
          const isActive = currentView === item.view;
          return (
            <div key={item.view} className="relative">
              <button
                onClick={() => onViewChange(item.view)}
                onMouseEnter={() => setTooltip(item.label)}
                onMouseLeave={() => setTooltip(null)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-150"
                style={isActive ? {
                  background: 'rgba(95,154,100,0.25)',
                  boxShadow: 'inset 0 0 0 1px rgba(95,154,100,0.3)',
                } : {
                  opacity: 0.5,
                }}
                title={item.label}
              >
                {item.emoji}
              </button>
              {tooltip === item.label && (
                <div
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-50"
                  style={{
                    background: '#1a3020',
                    color: 'rgba(143,186,145,0.9)',
                    border: '1px solid rgba(95,154,100,0.2)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="pb-4 flex flex-col items-center gap-1">
        <button
          onClick={() => spec && exportGardenPdf(spec)}
          onMouseEnter={() => setTooltip('Export PDF')}
          onMouseLeave={() => setTooltip(null)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative"
          style={{ opacity: 0.4 }}
          title="Export PDF"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(143,186,145,0.8)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          {tooltip === 'Export PDF' && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-50"
              style={{ background: '#1a3020', color: 'rgba(143,186,145,0.9)', border: '1px solid rgba(95,154,100,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            >Export PDF</div>
          )}
        </button>
      </div>
    </aside>
  );
};
