import { useState, useEffect } from 'react';
import { Sidebar, View } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { GardenDesigner } from './components/GardenDesigner';
import { PlantLibrary } from './components/PlantLibrary';
import { PlantingCalendar } from './components/PlantingCalendar';
import { TaskManager } from './components/TaskManager';
import { ShoppingList } from './components/ShoppingList';
import { useGardenSpec } from './hooks/useGardenSpec';
import { PropertyConfig } from './types/garden';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const {
    spec,
    updateSpec,
    addBed,
    updateBed,
    removeBed,
    setSquarePlant,
    updateSquareStatus,
    addTask,
    updateTask,
    removeTask,
    addHarvestEntry,
    updateShoppingList,
    toggleShoppingItem,
    resizeBed,
    listSavedGardens,
    saveGardenAs,
    loadGarden,
    deleteGarden,
    loadSampleGarden,
    resetGarden,
    exportGardenJSON,
    importGardenJSON,
  } = useGardenSpec();

  // Listen for property updates from GardenPropertyEditor
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PropertyConfig>).detail;
      updateSpec(prev => ({ ...prev, property: detail }));
    };
    window.addEventListener('update-property', handler);
    return () => window.removeEventListener('update-property', handler);
  }, [updateSpec]);

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        spec={spec}
        onSaveAs={saveGardenAs}
        onLoadGarden={loadGarden}
        onDeleteGarden={deleteGarden}
        onLoadSample={loadSampleGarden}
        onReset={resetGarden}
        onExportJSON={exportGardenJSON}
        onImportJSON={importGardenJSON}
        savedGardens={listSavedGardens()}
      />
      <main className="flex-1 overflow-y-auto bg-parchment-50 min-h-screen paper-grain">
        {currentView === 'dashboard' && (
          <Dashboard spec={spec} onNavigate={handleNavigate} />
        )}
        {currentView === 'designer' && (
          <GardenDesigner
            spec={spec}
            onAddBed={addBed}
            onSetPlant={setSquarePlant}
            onUpdateStatus={updateSquareStatus}
            onResize={resizeBed}
            onRemoveBed={removeBed}
            onUpdateBed={updateBed}
          />
        )}
        {currentView === 'library' && (
          <PlantLibrary />
        )}
        {currentView === 'calendar' && (
          <PlantingCalendar spec={spec} />
        )}
        {currentView === 'tasks' && (
          <TaskManager
            spec={spec}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onRemoveTask={removeTask}
            onAddHarvest={addHarvestEntry}
          />
        )}
        {currentView === 'shopping' && (
          <ShoppingList
            spec={spec}
            onUpdateList={updateShoppingList}
            onToggleItem={toggleShoppingItem}
          />
        )}
      </main>
    </div>
  );
}

export default App;
