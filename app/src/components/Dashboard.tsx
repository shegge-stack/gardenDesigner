import React, { useMemo } from 'react';
import { GardenSpec } from '../types/garden';
import { getPlantById, plants } from '../data/plants';
import { WeatherWidget } from './WeatherWidget';

interface DashboardProps {
  spec: GardenSpec;
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ spec, onNavigate }) => {
  const daysToFrost = useMemo(() => {
    const now = new Date();
    const frost = new Date(now.getFullYear(), 4, 10); // May 10
    const diff = Math.ceil((frost.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, []);

  const daysSinceFrost = useMemo(() => {
    const now = new Date();
    const frost = new Date(now.getFullYear(), 4, 10);
    if (now > frost) {
      return Math.floor((now.getTime() - frost.getTime()) / (1000 * 60 * 60 * 24));
    }
    return null;
  }, []);

  const season = useMemo(() => {
    if (daysToFrost > 30) return { label: 'Indoor Seeding', phase: 'early', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
    if (daysToFrost > 0) return { label: 'Hardening Off', phase: 'pre', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (daysSinceFrost !== null && daysSinceFrost < 30) return { label: 'Transplant Season', phase: 'transplant', color: 'text-sage-600', bg: 'bg-sage-50', border: 'border-sage-200' };
    if (daysSinceFrost !== null && daysSinceFrost < 100) return { label: 'Growing Season', phase: 'grow', color: 'text-sage-600', bg: 'bg-sage-50', border: 'border-sage-200' };
    return { label: 'Season Wrap-up', phase: 'fall', color: 'text-terra-600', bg: 'bg-terra-50', border: 'border-terra-200' };
  }, [daysToFrost, daysSinceFrost]);

  const plantCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    spec.beds.forEach(b => b.squares.flat().forEach(s => {
      if (s.plantId) counts[s.plantId] = (counts[s.plantId] || 0) + 1;
    }));
    return counts;
  }, [spec]);

  const totalPlants = Object.values(plantCountMap).reduce((a, b) => a + b, 0);
  const uniquePlants = Object.keys(plantCountMap).length;
  const pendingTasks = spec.tasks.filter(t => t.status === 'pending').length;
  const totalHarvestedLbs = spec.harvestLog.reduce((sum, h) => sum + h.quantityLbs, 0);

  // Urgent actions for the current time
  const urgentActions = useMemo(() => {
    const actions: { icon: string; text: string; urgency: 'high' | 'medium' | 'info'; action?: string }[] = [];

    if (daysToFrost > 0 && daysToFrost <= 60) {
      const seedStartPlants = plants.filter(p =>
        p.seed_start_weeks_before_frost && p.seed_start_weeks_before_frost * 7 >= daysToFrost - 7 &&
        p.seed_start_weeks_before_frost * 7 <= daysToFrost + 14
      );
      seedStartPlants.forEach(p => {
        actions.push({
          icon: p.icon,
          text: `Start ${p.common_name} seeds indoors now`,
          urgency: p.seed_start_weeks_before_frost! * 7 <= daysToFrost ? 'high' : 'medium',
        });
      });
    }

    if (daysToFrost <= 14 && daysToFrost > 0) {
      actions.push({
        icon: '🌡',
        text: 'Harden off seedlings — begin setting them outside for increasing hours',
        urgency: 'high',
      });
    }

    if (actions.length === 0) {
      actions.push({
        icon: '📋',
        text: 'Plan your beds and add plants to get personalized timing alerts',
        urgency: 'info',
      });
    }

    return actions.slice(0, 5);
  }, [daysToFrost]);

  return (
    <div className="p-8 max-w-6xl mx-auto page-enter">
      {/* Header — Conservatory welcome */}
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(95,154,100,0.7)' }}>
              Welcome to your garden
            </p>
            <h1 className="text-4xl text-parchment-900 italic" style={{ fontFamily: 'var(--font-display)' }}>
              What shall we grow today?
            </h1>
            <p className="text-parchment-500 mt-2 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              <span className="mx-2 text-parchment-300">&middot;</span>
              Zone 4b, Twin Cities
            </p>
          </div>
          <div className={`${season.bg} ${season.border} border rounded-full px-4 py-1.5 flex items-center gap-2`}>
            <div className={`w-2 h-2 rounded-full ${season.color.replace('text-', 'bg-')} animate-pulse`} />
            <span className={`text-sm font-medium ${season.color}`}>{season.label}</span>
          </div>
        </div>
        <div className="leaf-divider mt-6" />
      </div>

      {/* Weather Widget */}
      <WeatherWidget />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6 mt-6">
        {[
          { label: 'Garden Beds', value: spec.beds.length, sub: `${totalPlants} squares planted`, onClick: () => onNavigate('designer') },
          { label: 'Plant Varieties', value: uniquePlants, sub: `of ${plants.length} available`, onClick: () => onNavigate('library') },
          { label: 'Days to Last Frost', value: daysToFrost > 0 ? daysToFrost : 'Past', sub: 'May 10 average', onClick: () => onNavigate('calendar') },
          { label: 'Tasks Pending', value: pendingTasks, sub: `${totalHarvestedLbs.toFixed(1)} lbs harvested`, onClick: () => onNavigate('tasks') },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={stat.onClick}
            className="bg-white rounded-xl border border-parchment-200 p-5 text-left card-hover group"
          >
            <p className="text-xs font-medium text-parchment-500 uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-3xl font-light text-parchment-900" style={{ fontFamily: 'var(--font-display)' }}>
              {stat.value}
            </p>
            <p className="text-xs text-parchment-400 mt-1 group-hover:text-sage-500 transition-colors">{stat.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Urgent Actions - 3 cols */}
        <div className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-parchment-800" style={{ fontFamily: 'var(--font-display)' }}>
              Action Items
            </h2>
            <span className="text-xs text-parchment-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="space-y-2">
            {urgentActions.map((action, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 flex items-start gap-3 ${
                  action.urgency === 'high'
                    ? 'bg-terra-50 border-terra-200'
                    : action.urgency === 'medium'
                    ? 'bg-gold-50 border-gold-200'
                    : 'bg-white border-parchment-200'
                }`}
              >
                <span className="text-xl mt-0.5">{action.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    action.urgency === 'high' ? 'text-terra-800' :
                    action.urgency === 'medium' ? 'text-gold-800' : 'text-parchment-700'
                  }`}>{action.text}</p>
                  {action.urgency === 'high' && (
                    <p className="text-xs text-terra-500 mt-0.5">Do this now — you're in the window</p>
                  )}
                </div>
                <span className={`badge ${
                  action.urgency === 'high' ? 'bg-terra-200 text-terra-700' :
                  action.urgency === 'medium' ? 'bg-gold-200 text-gold-700' : 'bg-parchment-100 text-parchment-500'
                }`}>
                  {action.urgency === 'high' ? 'Urgent' : action.urgency === 'medium' ? 'Soon' : 'Tip'}
                </span>
              </div>
            ))}
          </div>

          {/* Recent Tasks */}
          {spec.tasks.length > 0 && (
            <div className="bg-white rounded-xl border border-parchment-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-parchment-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-parchment-700">Upcoming Tasks</h3>
                <button onClick={() => onNavigate('tasks')} className="text-xs text-sage-600 hover:text-sage-700 font-medium">View all</button>
              </div>
              <div className="divide-y divide-parchment-100">
                {spec.tasks
                  .filter(t => t.status === 'pending')
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .slice(0, 4)
                  .map(task => {
                    const plant = task.plantId ? getPlantById(task.plantId) : null;
                    return (
                      <div key={task.id} className="px-4 py-2.5 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                        <span className="text-sm text-parchment-700 flex-1">{task.title}</span>
                        {plant && <span className="text-xs text-parchment-400">{plant.icon}</span>}
                        <span className="text-xs text-parchment-400">
                          {new Date(task.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Beds Overview - 2 cols */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-parchment-800" style={{ fontFamily: 'var(--font-display)' }}>
              Garden Beds
            </h2>
            <button onClick={() => onNavigate('designer')} className="text-xs text-sage-600 hover:text-sage-700 font-medium">Edit layout</button>
          </div>

          {spec.beds.length === 0 ? (
            <div className="bg-white rounded-xl border border-parchment-200 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-sage-50 mx-auto flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage-400"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
              </div>
              <p className="text-sm text-parchment-500 mb-3">No beds created yet</p>
              <button onClick={() => onNavigate('designer')} className="btn-primary text-xs">
                Create your first bed
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {spec.beds.map(bed => {
                const filledSquares = bed.squares.flat().filter(s => s.plantId).length;
                const totalSquares = bed.widthFt * bed.lengthFt;
                const fillPercent = totalSquares > 0 ? (filledSquares / totalSquares) * 100 : 0;

                return (
                  <button
                    key={bed.id}
                    onClick={() => onNavigate('designer')}
                    className="w-full bg-white rounded-xl border border-parchment-200 p-4 text-left card-hover"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          bed.type === 'raised' ? 'bg-terra-400' :
                          bed.type === 'container' ? 'bg-gold-400' :
                          bed.type === 'barrel' ? 'bg-amber-600' :
                          bed.type === 'hanging' ? 'bg-purple-400' :
                          bed.type === 'trellis' ? 'bg-blue-400' :
                          bed.type === 'trough' ? 'bg-zinc-400' : 'bg-sage-400'
                        }`} />
                        <h4 className="text-sm font-medium text-parchment-800">{bed.name}</h4>
                      </div>
                      <span className="text-xs text-parchment-400">
                        {bed.widthFt}' x {bed.lengthFt}'
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-parchment-100 rounded-full h-1.5">
                        <div
                          className="bg-sage-400 rounded-full h-1.5 transition-all"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-parchment-500">
                        {filledSquares}/{totalSquares}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-sage-50 rounded-xl border border-sage-200 p-4">
            <h3 className="text-xs font-semibold text-sage-700 uppercase tracking-wider mb-3">Quick Reference</h3>
            <div className="space-y-2 text-xs text-sage-600">
              <div className="flex items-center justify-between">
                <span>16/sqft</span>
                <span className="text-parchment-500">Carrots, Radish, Onion</span>
              </div>
              <div className="flex items-center justify-between">
                <span>9/sqft</span>
                <span className="text-parchment-500">Beets, Spinach, Beans</span>
              </div>
              <div className="flex items-center justify-between">
                <span>4/sqft</span>
                <span className="text-parchment-500">Lettuce, Basil, Chard</span>
              </div>
              <div className="flex items-center justify-between">
                <span>1/sqft</span>
                <span className="text-parchment-500">Tomato, Pepper, Broccoli</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
