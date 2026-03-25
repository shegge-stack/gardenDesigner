import React, { useState, useMemo } from 'react';
import { GardenSpec, GardenTask, HarvestLog, ShoppingItem } from '../types/garden';
import { getPlantById, plants } from '../data/plants';
import { getCurrentWeekTasks, getSeasonPhase, getMonthFraction, MONTH_ABBREVS } from '../utils/calendar';
import { Plant } from '../types/garden';
import { PlantDetailModal } from './PlantDetailModal';

interface PlanViewProps {
  spec: GardenSpec;
  onAddTask: (task: Omit<GardenTask, 'id'>) => string;
  onUpdateTask: (taskId: string, updates: Partial<GardenTask>) => void;
  onRemoveTask: (taskId: string) => void;
  onAddHarvest: (entry: Omit<HarvestLog, 'id'>) => void;
  onUpdateShoppingList: (items: ShoppingItem[]) => void;
  onToggleShoppingItem: (itemId: string) => void;
}

export const PlanView: React.FC<PlanViewProps> = ({
  spec, onAddTask: _onAddTask, onUpdateTask, onRemoveTask: _onRemoveTask, onAddHarvest: _onAddHarvest,
  onUpdateShoppingList, onToggleShoppingItem,
}) => {
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const now = new Date();
  const season = getSeasonPhase(now);
  const weekTasks = getCurrentWeekTasks(now);

  const pendingTasks = useMemo(() => spec.tasks.filter(t => t.status === 'pending').sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [spec.tasks]);
  const totalHarvested = useMemo(() => spec.harvestLog.reduce((sum, h) => sum + h.quantityLbs, 0), [spec.harvestLog]);

  const plantIdsInGarden = useMemo(() => {
    const ids = new Set<string>();
    spec.beds.forEach(b => b.squares.flat().forEach(s => { if (s.plantId) ids.add(s.plantId); }));
    return ids;
  }, [spec]);

  const displayPlants = useMemo(() => {
    return [...plants].filter(p => plantIdsInGarden.has(p.id) || true).sort((a, b) => {
      const aStart = getMonthFraction(a.zone_4_seed_start_date || a.zone_4_direct_sow_date) ?? 12;
      const bStart = getMonthFraction(b.zone_4_seed_start_date || b.zone_4_direct_sow_date) ?? 12;
      return aStart - bStart;
    }).slice(0, 20); // Show top 20 relevant plants
  }, [plantIdsInGarden]);

  const currentFraction = now.getMonth() + now.getDate() / 30;

  const getBarStyle = (startStr: string | null, endStr: string | null, color: string) => {
    const start = getMonthFraction(startStr);
    const end = getMonthFraction(endStr);
    if (start === null) return null;
    const effectiveEnd = end ?? start + 0.5;
    return {
      left: `${(start / 12) * 100}%`,
      width: `${Math.max(((effectiveEnd - start) / 12) * 100, 1.5)}%`,
      backgroundColor: color,
    };
  };

  // Auto-generate shopping list
  const generateShoppingList = () => {
    const items: ShoppingItem[] = [];
    const plantCounts: Record<string, number> = {};
    spec.beds.forEach(bed => bed.squares.flat().forEach(sq => { if (sq.plantId) plantCounts[sq.plantId] = (plantCounts[sq.plantId] || 0) + 1; }));

    Object.entries(plantCounts).forEach(([plantId, count]) => {
      const plant = getPlantById(plantId);
      if (!plant) return;
      items.push({ id: `seed_${plantId}`, name: `${plant.icon} ${plant.common_name} seeds`, category: 'seeds', quantity: Math.ceil(count * plant.spacing_per_sqft / 30), unit: 'packet', estimatedCost: 3.5, purchased: false, plantId });
    });

    const totalSqFt = spec.beds.reduce((sum, b) => sum + b.widthFt * b.lengthFt, 0);
    if (totalSqFt > 0) {
      items.push({ id: 'compost', name: 'Compost', category: 'soil_amendments', quantity: Math.ceil(totalSqFt / 4), unit: 'cu ft', estimatedCost: Math.ceil(totalSqFt / 4) * 5, purchased: false, plantId: null });
      items.push({ id: 'mulch', name: 'Straw mulch', category: 'tools', quantity: Math.ceil(totalSqFt / 40), unit: 'bales', estimatedCost: Math.ceil(totalSqFt / 40) * 8, purchased: false, plantId: null });
    }

    const existing = new Set(spec.shoppingList.filter(i => i.purchased).map(i => i.id));
    onUpdateShoppingList(items.map(i => ({ ...i, purchased: existing.has(i.id) })));
  };

  const displayItems = spec.shoppingList;
  const totalCost = displayItems.reduce((sum, i) => sum + i.estimatedCost, 0);
  const purchasedCount = displayItems.filter(i => i.purchased).length;

  return (
    <div className="p-8 max-w-5xl mx-auto page-enter space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(95,154,100,0.7)' }}>Your Plan</p>
        <h1 className="text-3xl text-parchment-900 italic" style={{ fontFamily: 'var(--font-display)' }}>
          From Seed to Harvest
        </h1>
        <p className="text-parchment-500 mt-1 text-sm">{season.phase} &middot; {season.description}</p>
        <div className="leaf-divider mt-5" />
      </div>

      {/* This Week */}
      <section>
        <h2 className="text-lg text-parchment-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>This Week</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {weekTasks.slice(0, 6).map((task, i) => (
            <div key={i} className="rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-parchment-700"
              style={{ background: 'rgba(240,245,241,0.7)', border: '1px solid rgba(180,210,180,0.2)' }}>
              <span className="text-sage-400 mt-0.5">&#8226;</span>
              {task}
            </div>
          ))}
        </div>
      </section>

      {/* Compact Calendar */}
      <section>
        <h2 className="text-lg text-parchment-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>Season Timeline</h2>
        <div className="bg-white rounded-xl overflow-x-auto" style={{ border: '1px solid rgba(180,210,180,0.2)' }}>
          {/* Month headers */}
          <div className="flex border-b" style={{ borderColor: 'rgba(180,210,180,0.15)' }}>
            <div className="w-32 shrink-0 px-3 py-1.5 text-[10px] text-parchment-400 uppercase tracking-wider" style={{ background: 'rgba(240,245,241,0.5)' }}>Plant</div>
            <div className="flex-1 flex relative min-w-[600px]">
              {MONTH_ABBREVS.map(m => (
                <div key={m} className="flex-1 text-center py-1.5 text-[10px] text-parchment-400">{m}</div>
              ))}
              <div className="absolute top-0 bottom-0 w-px bg-terra-300 z-10" style={{ left: `${(getMonthFraction('May 10')! / 12) * 100}%` }} />
              <div className="absolute top-0 bottom-0 w-px bg-blue-300 z-10" style={{ left: `${(getMonthFraction('Sep 28')! / 12) * 100}%` }} />
              <div className="absolute top-0 bottom-0 w-px bg-red-500 z-20" style={{ left: `${(currentFraction / 12) * 100}%` }} />
            </div>
          </div>
          {displayPlants.map(plant => {
            const inGarden = plantIdsInGarden.has(plant.id);
            return (
              <div key={plant.id} onClick={() => setSelectedPlant(plant)}
                className={`flex border-b cursor-pointer transition-colors hover:bg-parchment-50 ${inGarden ? 'bg-sage-50/20' : ''}`}
                style={{ borderColor: 'rgba(180,210,180,0.1)' }}>
                <div className="w-32 shrink-0 px-3 py-1.5 flex items-center gap-1.5 text-[11px]" style={{ background: 'rgba(240,245,241,0.3)' }}>
                  <span>{plant.icon}</span>
                  <span className="truncate text-parchment-700">{plant.common_name}</span>
                </div>
                <div className="flex-1 relative min-w-[600px] py-1">
                  {plant.zone_4_seed_start_date && (() => {
                    const s = getBarStyle(plant.zone_4_seed_start_date, plant.zone_4_transplant_date || plant.zone_4_seed_start_date, '#a78bfa');
                    return s ? <div className="absolute h-2 rounded-sm top-1.5" style={s} /> : null;
                  })()}
                  {plant.harvest_start_date && (() => {
                    const s = getBarStyle(plant.harvest_start_date, plant.harvest_end_date, '#f59e0b');
                    return s ? <div className="absolute h-2 rounded-sm top-1.5" style={s} /> : null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg text-parchment-800" style={{ fontFamily: 'var(--font-display)' }}>Tasks</h2>
          <span className="text-xs text-parchment-400">{pendingTasks.length} pending</span>
        </div>
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-parchment-400 italic">No pending tasks. They'll appear when you add plants with planting dates.</p>
        ) : (
          <div className="space-y-1.5">
            {pendingTasks.slice(0, 8).map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white" style={{ border: '1px solid rgba(180,210,180,0.2)' }}>
                <button onClick={() => onUpdateTask(task.id, { status: 'completed', completedDate: new Date().toISOString() })}
                  className="w-4 h-4 rounded border-2 shrink-0 transition-colors hover:border-sage-500" style={{ borderColor: 'rgba(180,210,180,0.4)' }} />
                <span className="text-sm text-parchment-700 flex-1">{task.title}</span>
                <span className="text-[11px] text-parchment-400">{new Date(task.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shopping List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg text-parchment-800" style={{ fontFamily: 'var(--font-display)' }}>Shopping List</h2>
          <button onClick={generateShoppingList} className="text-xs font-medium transition-colors" style={{ color: '#437d48' }}>
            Regenerate
          </button>
        </div>
        {displayItems.length === 0 ? (
          <div className="text-center py-8 rounded-xl" style={{ background: 'rgba(240,245,241,0.5)', border: '1px solid rgba(180,210,180,0.15)' }}>
            <p className="text-sm text-parchment-400 italic">Add plants to your beds, then click Regenerate</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden bg-white" style={{ border: '1px solid rgba(180,210,180,0.2)' }}>
            <div className="px-4 py-2 flex items-center justify-between text-xs" style={{ background: 'rgba(240,245,241,0.5)', borderBottom: '1px solid rgba(180,210,180,0.15)' }}>
              <span className="text-parchment-500">{purchasedCount}/{displayItems.length} purchased</span>
              <span className="font-medium" style={{ color: '#437d48' }}>${totalCost.toFixed(0)} est.</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(180,210,180,0.1)' }}>
              {displayItems.map(item => (
                <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
                  <button onClick={() => onToggleShoppingItem(item.id)}
                    className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${item.purchased ? 'bg-sage-500 border-sage-500' : ''}`}
                    style={!item.purchased ? { borderColor: 'rgba(180,210,180,0.4)' } : undefined}>
                    {item.purchased && <span className="text-white text-[8px]">✓</span>}
                  </button>
                  <span className={`text-sm flex-1 ${item.purchased ? 'text-parchment-400 line-through' : 'text-parchment-700'}`}>{item.name}</span>
                  <span className="text-[11px] text-parchment-400">{item.quantity} {item.unit}</span>
                  <span className="text-[11px] text-parchment-500 w-12 text-right">${item.estimatedCost.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Harvest */}
      {totalHarvested > 0 && (
        <section>
          <h2 className="text-lg text-parchment-800 mb-2" style={{ fontFamily: 'var(--font-display)' }}>Harvest Log</h2>
          <p className="text-sm text-parchment-500">{totalHarvested.toFixed(1)} lbs harvested across {spec.harvestLog.length} entries</p>
        </section>
      )}

      {selectedPlant && <PlantDetailModal plant={selectedPlant} onClose={() => setSelectedPlant(null)} />}
    </div>
  );
};
