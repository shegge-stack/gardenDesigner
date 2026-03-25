import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { GardenDesigner } from './components/GardenDesigner';
import { PlantLibrary } from './components/PlantLibrary';
import { PlantingCalendar } from './components/PlantingCalendar';
import { TaskManager } from './components/TaskManager';
import { ShoppingList } from './components/ShoppingList';
import { useGardenSpec } from './hooks/useGardenSpec';
import { PropertyConfig } from './types/garden';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

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
    const pathMap: Record<string, string> = {
      dashboard: '/',
      designer: '/design',
      library: '/plants',
      calendar: '/calendar',
      tasks: '/tasks',
      shopping: '/shopping',
    };
    navigate(pathMap[view] || '/');
  };

  // Map current path to view name for sidebar active state
  const pathToView: Record<string, string> = {
    '/': 'dashboard',
    '/design': 'designer',
    '/plants': 'library',
    '/calendar': 'calendar',
    '/tasks': 'tasks',
    '/shopping': 'shopping',
  };
  const currentView = pathToView[location.pathname] || 'dashboard';

  return (
    <div className="flex min-h-screen">
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => handleNavigate(view)}
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
        <Routes>
          <Route path="/" element={<Dashboard spec={spec} onNavigate={handleNavigate} />} />
          <Route path="/design" element={
            <GardenDesigner
              spec={spec}
              onAddBed={addBed}
              onSetPlant={setSquarePlant}
              onUpdateStatus={updateSquareStatus}
              onResize={resizeBed}
              onRemoveBed={removeBed}
              onUpdateBed={updateBed}
            />
          } />
          <Route path="/plants" element={<PlantLibrary />} />
          <Route path="/calendar" element={<PlantingCalendar spec={spec} />} />
          <Route path="/tasks" element={
            <TaskManager
              spec={spec}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onRemoveTask={removeTask}
              onAddHarvest={addHarvestEntry}
            />
          } />
          <Route path="/shopping" element={
            <ShoppingList
              spec={spec}
              onUpdateList={updateShoppingList}
              onToggleItem={toggleShoppingItem}
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
