import { plants } from '../data/plants';

export type Compatibility = 'good' | 'bad' | 'neutral';

export function checkCompanionCompatibility(plantId1: string, plantId2: string): Compatibility {
  const plant1 = plants.find(p => p.id === plantId1);
  const plant2 = plants.find(p => p.id === plantId2);

  if (!plant1 || !plant2) return 'neutral';
  if (plantId1 === plantId2) return 'neutral';

  // Check if plant2 is in plant1's good companions or vice versa
  const isGood1 = plant1.companions_good.some(c =>
    plant2.id.includes(c) || plant2.common_name.toLowerCase().includes(c) || plant2.family.toLowerCase().includes(c)
  );
  const isGood2 = plant2.companions_good.some(c =>
    plant1.id.includes(c) || plant1.common_name.toLowerCase().includes(c) || plant1.family.toLowerCase().includes(c)
  );

  // Check if plant2 is in plant1's bad companions or vice versa
  const isBad1 = plant1.companions_bad.some(c =>
    plant2.id.includes(c) || plant2.common_name.toLowerCase().includes(c) || plant2.family.toLowerCase().includes(c) || plant2.crop_rotation_family.includes(c)
  );
  const isBad2 = plant2.companions_bad.some(c =>
    plant1.id.includes(c) || plant1.common_name.toLowerCase().includes(c) || plant1.family.toLowerCase().includes(c) || plant1.crop_rotation_family.includes(c)
  );

  if (isBad1 || isBad2) return 'bad';
  if (isGood1 || isGood2) return 'good';
  return 'neutral';
}

export function getBedCompatibilityScore(plantIds: (string | null)[]): { good: number; bad: number; total: number } {
  const validIds = plantIds.filter((id): id is string => id !== null);
  const uniqueIds = [...new Set(validIds)];
  let good = 0;
  let bad = 0;
  let total = 0;

  for (let i = 0; i < uniqueIds.length; i++) {
    for (let j = i + 1; j < uniqueIds.length; j++) {
      const compat = checkCompanionCompatibility(uniqueIds[i], uniqueIds[j]);
      total++;
      if (compat === 'good') good++;
      if (compat === 'bad') bad++;
    }
  }

  return { good, bad, total };
}

export function getCompatibilityColor(compat: Compatibility): string {
  switch (compat) {
    case 'good': return '#22c55e';
    case 'bad': return '#ef4444';
    default: return '#9ca3af';
  }
}
