import { useState, useEffect, useCallback } from 'react';
import { GardenSpec, GardenBed, GardenTask, ShoppingItem, HarvestLog, BedSquare } from '../types/garden';

const STORAGE_KEY = 'gardenDesigner_spec';

function makeBed(
  id: string, name: string, type: GardenBed['type'],
  widthFt: number, lengthFt: number, sun: GardenBed['sunExposure'],
  x: number, y: number
): GardenBed {
  const squares: BedSquare[][] = [];
  for (let row = 0; row < lengthFt; row++) {
    const rowSquares: BedSquare[] = [];
    for (let col = 0; col < widthFt; col++) {
      rowSquares.push({ plantId: null, status: 'planned', plantedDate: null, notes: '' });
    }
    squares.push(rowSquares);
  }
  return { id, name, type, widthFt, lengthFt, sunExposure: sun, squares, x, y };
}

function createDefaultSpec(): GardenSpec {
  return {
    version: '1.0.0',
    zone: '4b',
    lastFrostDate: 'May 10',
    firstFrostDate: 'Sep 28',
    property: {
      lot_width_ft: 30,
      lot_depth_ft: 20,
      house_x: 0,
      house_y: 0,
      house_width_ft: 0,
      house_depth_ft: 0,
      orientation_deg: 0,
    },
    beds: [],
    tasks: [],
    harvestLog: [],
    shoppingList: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Sam's backyard garden — 258" x 198" fenced space, water faucet NW corner
function createSamsGarden(): GardenSpec {
  return {
    version: '1.0.0',
    zone: '4b',
    lastFrostDate: 'May 10',
    firstFrostDate: 'Sep 28',
    property: {
      lot_width_ft: 22,  // 258" ≈ 21.5'
      lot_depth_ft: 17,  // 198" ≈ 16.5'
      house_x: 0,
      house_y: 0,
      house_width_ft: 0,
      house_depth_ft: 0,
      orientation_deg: 315, // N is upper-left per compass
    },
    beds: [
      // Top row (north side, along fence)
      makeBed('nw_corner', 'NW Corner Bed', 'raised', 2, 2, 'full_sun', 2, 1),
      makeBed('north_left', 'North Bed Left', 'in_ground', 6, 2, 'full_sun', 5, 1),
      makeBed('north_right', 'North Bed Right', 'in_ground', 6, 2, 'full_sun', 12, 1),
      makeBed('ne_corner', 'NE Corner Bed', 'in_ground', 4, 2, 'full_sun', 18, 1),
      // Center raised beds (vertical orientation)
      makeBed('center_left', 'Center Raised Bed 1', 'raised', 2, 6, 'full_sun', 6, 5),
      makeBed('center_mid', 'Center Raised Bed 2', 'raised', 2, 6, 'full_sun', 10, 5),
      makeBed('center_right', 'Center Raised Bed 3', 'raised', 2, 6, 'full_sun', 14, 5),
      // Bottom row (south side)
      makeBed('south_left', 'South Raised Bed', 'raised', 6, 2, 'full_sun', 2, 14),
      makeBed('south_center', 'South Center Space', 'in_ground', 6, 2, 'full_sun', 9, 14),
      makeBed('south_right', 'South Right Space', 'in_ground', 6, 2, 'full_sun', 16, 14),
    ],
    tasks: [],
    harvestLog: [],
    shoppingList: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadSpec(): GardenSpec {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load garden spec:', e);
  }
  return createDefaultSpec();
}

export function useGardenSpec() {
  const [spec, setSpec] = useState<GardenSpec>(loadSpec);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...spec, updatedAt: new Date().toISOString() }));
    } catch (e) {
      console.error('Failed to save garden spec:', e);
    }
  }, [spec]);

  const updateSpec = useCallback((updater: (prev: GardenSpec) => GardenSpec) => {
    setSpec(prev => updater(prev));
  }, []);

  const addBed = useCallback((bed: Omit<GardenBed, 'id' | 'squares'>) => {
    const id = `bed_${Date.now()}`;
    const squares: BedSquare[][] = [];
    for (let row = 0; row < bed.lengthFt; row++) {
      const rowSquares: BedSquare[] = [];
      for (let col = 0; col < bed.widthFt; col++) {
        rowSquares.push({ plantId: null, status: 'planned', plantedDate: null, notes: '' });
      }
      squares.push(rowSquares);
    }
    setSpec(prev => ({
      ...prev,
      beds: [...prev.beds, { ...bed, id, squares }],
    }));
    return id;
  }, []);

  const updateBed = useCallback((bedId: string, updates: Partial<GardenBed>) => {
    setSpec(prev => ({
      ...prev,
      beds: prev.beds.map(b => b.id === bedId ? { ...b, ...updates } : b),
    }));
  }, []);

  const removeBed = useCallback((bedId: string) => {
    setSpec(prev => ({
      ...prev,
      beds: prev.beds.filter(b => b.id !== bedId),
    }));
  }, []);

  const setSquarePlant = useCallback((bedId: string, row: number, col: number, plantId: string | null) => {
    setSpec(prev => ({
      ...prev,
      beds: prev.beds.map(b => {
        if (b.id !== bedId) return b;
        const newSquares = b.squares.map((r, ri) =>
          r.map((s, ci) => {
            if (ri === row && ci === col) {
              return { ...s, plantId, status: plantId ? 'planned' as const : 'planned' as const, plantedDate: null };
            }
            return s;
          })
        );
        return { ...b, squares: newSquares };
      }),
    }));
  }, []);

  const updateSquareStatus = useCallback((bedId: string, row: number, col: number, status: BedSquare['status']) => {
    setSpec(prev => ({
      ...prev,
      beds: prev.beds.map(b => {
        if (b.id !== bedId) return b;
        const newSquares = b.squares.map((r, ri) =>
          r.map((s, ci) => {
            if (ri === row && ci === col) {
              return { ...s, status, plantedDate: status === 'seeded' || status === 'transplanted' ? new Date().toISOString() : s.plantedDate };
            }
            return s;
          })
        );
        return { ...b, squares: newSquares };
      }),
    }));
  }, []);

  const addTask = useCallback((task: Omit<GardenTask, 'id'>) => {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setSpec(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...task, id }],
    }));
    return id;
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<GardenTask>) => {
    setSpec(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setSpec(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
    }));
  }, []);

  const addHarvestEntry = useCallback((entry: Omit<HarvestLog, 'id'>) => {
    const id = `harvest_${Date.now()}`;
    setSpec(prev => ({
      ...prev,
      harvestLog: [...prev.harvestLog, { ...entry, id }],
    }));
  }, []);

  const updateShoppingList = useCallback((items: ShoppingItem[]) => {
    setSpec(prev => ({
      ...prev,
      shoppingList: items,
    }));
  }, []);

  const toggleShoppingItem = useCallback((itemId: string) => {
    setSpec(prev => ({
      ...prev,
      shoppingList: prev.shoppingList.map(i =>
        i.id === itemId ? { ...i, purchased: !i.purchased } : i
      ),
    }));
  }, []);

  const resizeBed = useCallback((bedId: string, newWidth: number, newLength: number) => {
    setSpec(prev => ({
      ...prev,
      beds: prev.beds.map(b => {
        if (b.id !== bedId) return b;
        const newSquares: BedSquare[][] = [];
        for (let row = 0; row < newLength; row++) {
          const rowSquares: BedSquare[] = [];
          for (let col = 0; col < newWidth; col++) {
            if (row < b.squares.length && col < b.squares[0]?.length) {
              rowSquares.push(b.squares[row][col]);
            } else {
              rowSquares.push({ plantId: null, status: 'planned', plantedDate: null, notes: '' });
            }
          }
          newSquares.push(rowSquares);
        }
        return { ...b, widthFt: newWidth, lengthFt: newLength, squares: newSquares };
      }),
    }));
  }, []);

  // Garden management — save/load/export multiple gardens
  const GARDENS_INDEX_KEY = 'gardenDesigner_gardens';

  const listSavedGardens = useCallback((): { id: string; name: string; updatedAt: string }[] => {
    try {
      const index = localStorage.getItem(GARDENS_INDEX_KEY);
      return index ? JSON.parse(index) : [];
    } catch { return []; }
  }, []);

  const saveGardenAs = useCallback((name: string) => {
    const id = `garden_${Date.now()}`;
    const gardenToSave = { ...spec, updatedAt: new Date().toISOString() };
    localStorage.setItem(`gardenDesigner_${id}`, JSON.stringify(gardenToSave));
    const index = listSavedGardens();
    index.push({ id, name, updatedAt: gardenToSave.updatedAt });
    localStorage.setItem(GARDENS_INDEX_KEY, JSON.stringify(index));
    return id;
  }, [spec, listSavedGardens]);

  const loadGarden = useCallback((id: string) => {
    try {
      const stored = localStorage.getItem(`gardenDesigner_${id}`);
      if (stored) {
        const loaded = JSON.parse(stored);
        setSpec(loaded);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
      }
    } catch (e) { console.error('Failed to load garden:', e); }
  }, []);

  const deleteGarden = useCallback((id: string) => {
    localStorage.removeItem(`gardenDesigner_${id}`);
    const index = listSavedGardens().filter(g => g.id !== id);
    localStorage.setItem(GARDENS_INDEX_KEY, JSON.stringify(index));
  }, [listSavedGardens]);

  const loadSampleGarden = useCallback(() => {
    const sample = createSamsGarden();
    setSpec(sample);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
  }, []);

  const resetGarden = useCallback(() => {
    const fresh = createDefaultSpec();
    setSpec(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const exportGardenJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garden-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [spec]);

  const importGardenJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.version && imported.beds) {
          setSpec(imported);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
        }
      } catch (err) { console.error('Invalid garden file:', err); }
    };
    reader.readAsText(file);
  }, []);

  return {
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
    // Garden management
    listSavedGardens,
    saveGardenAs,
    loadGarden,
    deleteGarden,
    loadSampleGarden,
    resetGarden,
    exportGardenJSON,
    importGardenJSON,
  };
}
