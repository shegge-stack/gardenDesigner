import React, { useState, useRef } from 'react';
import { GardenSpec } from '../types/garden';
import { exportGardenPdf } from '../utils/exportPdf';

export type View = 'dashboard' | 'designer' | 'library' | 'calendar' | 'tasks' | 'shopping';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: View) => void;
  spec?: GardenSpec;
  onSaveAs?: (name: string) => void;
  onLoadGarden?: (id: string) => void;
  onDeleteGarden?: (id: string) => void;
  onLoadSample?: () => void;
  onReset?: () => void;
  onExportJSON?: () => void;
  onImportJSON?: (file: File) => void;
  savedGardens?: { id: string; name: string; updatedAt: string }[];
}

const navItems: { view: View; label: string; icon: string; desc: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: '&#9679;', desc: 'Overview' },
  { view: 'designer', label: 'Design', icon: '&#9724;', desc: 'Bed layout' },
  { view: 'library', label: 'Plants', icon: '&#9752;', desc: 'Browse plants' },
  { view: 'calendar', label: 'Calendar', icon: '&#9684;', desc: 'Season timeline' },
  { view: 'tasks', label: 'Tasks', icon: '&#10003;', desc: 'Activities' },
  { view: 'shopping', label: 'Shop', icon: '&#9998;', desc: 'Materials list' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, onViewChange, spec,
  onSaveAs, onLoadGarden, onDeleteGarden, onLoadSample, onReset,
  onExportJSON, onImportJSON, savedGardens = [],
}) => {
  const [showGardenMenu, setShowGardenMenu] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plantCount = spec?.beds.reduce((sum, b) =>
    sum + b.squares.flat().filter(s => s.plantId).length, 0) ?? 0;

  return (
    <aside className="w-[220px] min-h-screen flex flex-col shrink-0 select-none relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0f2212 0%, #152717 30%, #1a3020 60%, #152717 100%)',
      }}
    >
      {/* Decorative vine overlay on sidebar */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(ellipse 60px 80px at 10% 20%, rgba(140,200,140,1), transparent),
            radial-gradient(ellipse 40px 100px at 90% 50%, rgba(140,200,140,1), transparent),
            radial-gradient(ellipse 70px 60px at 20% 80%, rgba(140,200,140,1), transparent),
            radial-gradient(ellipse 50px 70px at 80% 90%, rgba(140,200,140,1), transparent)`
        }}
      />

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(95,154,100,0.3), rgba(67,125,72,0.2))',
              border: '1px solid rgba(95,154,100,0.25)',
            }}
          >
            🌿
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Garden Designer
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase" style={{ color: 'rgba(143, 186, 145, 0.7)' }}>
              Zone 4b &middot; Twin Cities
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 relative z-10">
        {navItems.map(item => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group ${
                isActive
                  ? 'text-white'
                  : 'hover:text-white/80'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, rgba(95,154,100,0.25), rgba(67,125,72,0.15))',
                border: '1px solid rgba(95,154,100,0.2)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              } : {
                color: 'rgba(143, 186, 145, 0.6)',
                border: '1px solid transparent',
              }}
            >
              <span
                className={`w-5 text-center text-sm ${isActive ? 'text-sage-200' : 'group-hover:text-sage-300'}`}
                style={!isActive ? { color: 'rgba(95,154,100,0.4)' } : undefined}
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-tight">{item.label}</p>
                <p className="text-[10px] leading-tight" style={{ color: isActive ? 'rgba(143,186,145,0.7)' : 'rgba(143,186,145,0.35)' }}>{item.desc}</p>
              </div>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(143,186,145,0.6)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Garden Stats */}
      <div className="mx-3 my-3 rounded-xl p-3 relative z-10" style={{
        background: 'linear-gradient(135deg, rgba(95,154,100,0.12), rgba(45,80,46,0.08))',
        border: '1px solid rgba(95,154,100,0.15)',
      }}>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {spec?.beds.length ?? 0}
            </p>
            <p className="text-[10px] text-sage-500 uppercase tracking-wider">Beds</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {plantCount}
            </p>
            <p className="text-[10px] text-sage-500 uppercase tracking-wider">Plants</p>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-sage-700/50 text-[11px] text-sage-500 space-y-0.5">
          <div className="flex justify-between">
            <span>Last frost</span><span className="text-sage-400">May 10</span>
          </div>
          <div className="flex justify-between">
            <span>First frost</span><span className="text-sage-400">Sep 28</span>
          </div>
          <div className="flex justify-between">
            <span>Season</span><span className="text-sage-400">141 days</span>
          </div>
        </div>
      </div>

      {/* Garden Management */}
      <div className="px-3 pb-3 space-y-1.5">
        <button
          onClick={() => setShowGardenMenu(!showGardenMenu)}
          className="w-full px-3 py-2 rounded-lg text-sm text-sage-400 hover:bg-sage-800 hover:text-sage-200 transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            My Gardens
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${showGardenMenu ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
        </button>

        {showGardenMenu && (
          <div className="bg-sage-800/80 rounded-lg p-2 space-y-0.5 text-[12px]">
            {showSaveInput ? (
              <div className="flex gap-1 p-1">
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Garden name..."
                  className="flex-1 px-2 py-1 bg-sage-900 border border-sage-600 rounded text-xs text-white placeholder-sage-500"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && saveName.trim()) {
                      onSaveAs?.(saveName.trim());
                      setSaveName('');
                      setShowSaveInput(false);
                    }
                    if (e.key === 'Escape') setShowSaveInput(false);
                  }}
                />
                <button
                  onClick={() => {
                    if (saveName.trim()) { onSaveAs?.(saveName.trim()); setSaveName(''); setShowSaveInput(false); }
                  }}
                  className="px-2 py-1 bg-sage-600 rounded text-[11px] text-white hover:bg-sage-500"
                >Save</button>
              </div>
            ) : (
              <button onClick={() => setShowSaveInput(true)} className="w-full text-left px-2 py-1.5 text-sage-400 hover:text-white hover:bg-sage-700 rounded">
                Save current as...
              </button>
            )}

            {savedGardens.length > 0 && (
              <div className="border-t border-sage-700 pt-1 mt-1">
                {savedGardens.map(g => (
                  <div key={g.id} className="flex items-center gap-1 px-2 py-1 hover:bg-sage-700 rounded group">
                    <button onClick={() => onLoadGarden?.(g.id)} className="flex-1 text-left text-sage-400 hover:text-white truncate">{g.name}</button>
                    <button onClick={() => onDeleteGarden?.(g.id)} className="text-sage-600 hover:text-red-400 opacity-0 group-hover:opacity-100 text-[10px]">x</button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-sage-700 pt-1 mt-1 space-y-0.5">
              <button onClick={onLoadSample} className="w-full text-left px-2 py-1.5 text-sage-400 hover:text-white hover:bg-sage-700 rounded">Load sample garden</button>
              <button onClick={onReset} className="w-full text-left px-2 py-1.5 text-sage-400 hover:text-white hover:bg-sage-700 rounded">New blank garden</button>
              <button onClick={onExportJSON} className="w-full text-left px-2 py-1.5 text-sage-400 hover:text-white hover:bg-sage-700 rounded">Export JSON</button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-2 py-1.5 text-sage-400 hover:text-white hover:bg-sage-700 rounded">Import JSON</button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onImportJSON?.(f); e.target.value = ''; }} />
            </div>
          </div>
        )}

        <button
          onClick={() => spec && exportGardenPdf(spec)}
          className="w-full px-3 py-2 rounded-lg text-sm text-sage-400 hover:bg-sage-800 hover:text-sage-200 transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Export PDF
        </button>
      </div>
    </aside>
  );
};
