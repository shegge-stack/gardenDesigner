import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { GardenDesigner } from './components/GardenDesigner';
import { PlantLibrary } from './components/PlantLibrary';
import { PlanView } from './components/PlanView';
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

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PropertyConfig>).detail;
      updateSpec(prev => ({ ...prev, property: detail }));
    };
    window.addEventListener('update-property', handler);
    return () => window.removeEventListener('update-property', handler);
  }, [updateSpec]);

  const handleNavigate = (view: string) => {
    const paths: Record<string, string> = { designer: '/', library: '/plants', plan: '/plan' };
    navigate(paths[view] || '/');
  };

  const pathToView: Record<string, string> = { '/': 'designer', '/plants': 'library', '/plan': 'plan' };
  const currentView = pathToView[location.pathname] || 'designer';

  return (
    <div className="flex min-h-screen">
      <Sidebar currentView={currentView} onViewChange={handleNavigate} spec={spec} />
      <main className="flex-1 overflow-y-auto bg-parchment-50 min-h-screen paper-grain">
        <Routes>
          <Route path="/" element={
            <GardenDesigner
              spec={spec}
              onAddBed={addBed}
              onSetPlant={setSquarePlant}
              onUpdateStatus={updateSquareStatus}
              onResize={resizeBed}
              onRemoveBed={removeBed}
              onUpdateBed={updateBed}
              onSaveAs={saveGardenAs}
              onLoadGarden={loadGarden}
              onDeleteGarden={deleteGarden}
              onLoadSample={loadSampleGarden}
              onReset={resetGarden}
              onExportJSON={exportGardenJSON}
              onImportJSON={importGardenJSON}
              savedGardens={listSavedGardens()}
            />
          } />
          <Route path="/plants" element={<PlantLibrary />} />
          <Route path="/plan" element={
            <PlanView
              spec={spec}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onRemoveTask={removeTask}
              onAddHarvest={addHarvestEntry}
              onUpdateShoppingList={updateShoppingList}
              onToggleShoppingItem={toggleShoppingItem}
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
