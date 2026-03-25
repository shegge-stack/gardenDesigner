// Zone 4b Twin Cities frost dates
export const LAST_FROST_DATE = new Date(2026, 4, 10); // May 10
export const FIRST_FROST_DATE = new Date(2026, 8, 28); // Sept 28

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_ABBREVS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function parseMonthDay(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split(' ');
  if (parts.length !== 2) return null;
  const monthIndex = MONTH_ABBREVS.indexOf(parts[0]);
  if (monthIndex === -1) return null;
  const day = parseInt(parts[1]);
  if (isNaN(day)) return null;
  return new Date(2026, monthIndex, day);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function isInWindow(dateStr: string | null, today: Date, windowDays: number = 14): boolean {
  const date = parseMonthDay(dateStr);
  if (!date) return false;
  const diff = date.getTime() - today.getTime();
  const daysDiff = diff / (1000 * 60 * 60 * 24);
  return daysDiff >= -windowDays && daysDiff <= windowDays;
}

export function isPast(dateStr: string | null, today: Date): boolean {
  const date = parseMonthDay(dateStr);
  if (!date) return false;
  return date.getTime() < today.getTime();
}

export function isFuture(dateStr: string | null, today: Date): boolean {
  const date = parseMonthDay(dateStr);
  if (!date) return false;
  return date.getTime() > today.getTime();
}

export function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

export function getMonthFraction(dateStr: string | null): number | null {
  const date = parseMonthDay(dateStr);
  if (!date) return null;
  return date.getMonth() + date.getDate() / 30;
}

export function getCurrentWeekTasks(today: Date): string[] {
  const month = today.getMonth();
  const day = today.getDate();

  const tasks: string[] = [];

  // March late
  if (month === 2 && day >= 15) {
    tasks.push('Start tomato and pepper seeds indoors under lights');
    tasks.push('Start onion seeds indoors if not already done');
    tasks.push('Start broccoli, cauliflower, and cabbage seeds indoors');
    tasks.push('Check stored garlic and seed potatoes for sprouting');
  }

  // April early
  if (month === 3 && day <= 15) {
    tasks.push('Direct sow peas, spinach, and radishes as soon as soil is workable');
    tasks.push('Harden off cool-season transplants');
    tasks.push('Prepare raised beds — add compost and turn soil');
    tasks.push('Set up trellises for peas');
  }

  // April late
  if (month === 3 && day > 15) {
    tasks.push('Transplant broccoli, cabbage, kale, and lettuce');
    tasks.push('Direct sow carrots, beets, and more radishes');
    tasks.push('Start hardening off warm-season seedlings');
    tasks.push('Direct sow cilantro and dill');
  }

  // May early
  if (month === 4 && day <= 15) {
    tasks.push('Watch frost forecasts closely — have row cover ready');
    tasks.push('Direct sow beans and corn after May 10');
    tasks.push('Plant potatoes when soil reaches 45F');
    tasks.push('Succession plant lettuce and radishes');
  }

  // May late
  if (month === 4 && day > 15) {
    tasks.push('Transplant tomatoes, peppers, eggplant after May 20');
    tasks.push('Direct sow cucumbers, squash, and zucchini');
    tasks.push('Plant basil outdoors once nights are above 50F');
    tasks.push('Set up tomato cages and cucumber trellises');
  }

  // June
  if (month === 5) {
    tasks.push('Watch for pests — handpick cabbage worms and potato beetles');
    tasks.push('Succession plant beans and lettuce');
    tasks.push('Harvest peas, radishes, and early lettuce');
    tasks.push('Prune tomato suckers and tie to supports');
    tasks.push('Keep on top of weeding — mulch to suppress');
  }

  // July
  if (month === 6) {
    tasks.push('Harvest summer crops: beans, cucumbers, zucchini');
    tasks.push('Start fall brassica seeds indoors');
    tasks.push('Watch for and treat squash vine borers');
    tasks.push('Deep water during dry spells — 1 inch per week minimum');
    tasks.push('Cut garlic scapes for cooking');
  }

  // August
  if (month === 7) {
    tasks.push('Harvest garlic when lower leaves brown');
    tasks.push('Transplant fall broccoli and cabbage');
    tasks.push('Direct sow fall spinach and lettuce');
    tasks.push('Start saving seeds from best plants');
    tasks.push('Keep harvesting to encourage production');
  }

  // September
  if (month === 8) {
    tasks.push('Watch frost forecast — cover tender crops or harvest');
    tasks.push('Harvest winter squash before hard frost');
    tasks.push('Pull spent plants and add to compost');
    tasks.push('Plant garlic in late September/early October');
    tasks.push('Harvest root crops and store');
  }

  // October
  if (month === 9) {
    tasks.push('Plant garlic cloves 4-6 weeks before ground freezes');
    tasks.push('Mulch garlic bed with 4-6 inches of straw');
    tasks.push('Clean and store garden tools');
    tasks.push('Add compost to empty beds for spring');
    tasks.push('Harvest kale — it is sweeter after frost');
  }

  return tasks;
}

export function getSeasonPhase(today: Date): { phase: string; description: string; color: string } {
  const month = today.getMonth();
  const day = today.getDate();

  if (month <= 1 || (month === 2 && day < 15)) {
    return { phase: 'Planning', description: 'Order seeds, plan garden layout', color: '#6366f1' };
  }
  if (month === 2 || (month === 3 && day < 10)) {
    return { phase: 'Indoor Seeding', description: 'Start warm-season seeds indoors', color: '#8b5cf6' };
  }
  if (month === 3 || (month === 4 && day < 10)) {
    return { phase: 'Cool Season Planting', description: 'Peas, greens, and brassicas go out', color: '#3b82f6' };
  }
  if (month === 4) {
    return { phase: 'Warm Season Planting', description: 'Tomatoes, peppers, and squash after frost', color: '#22c55e' };
  }
  if (month >= 5 && month <= 6) {
    return { phase: 'Growing Season', description: 'Maintain, water, and start harvesting', color: '#16a34a' };
  }
  if (month === 7) {
    return { phase: 'Peak Harvest', description: 'Harvest abundance, preserve for winter', color: '#eab308' };
  }
  if (month === 8) {
    return { phase: 'Fall Transition', description: 'Fall crops in, protect from frost', color: '#f97316' };
  }
  if (month >= 9 && month <= 10) {
    return { phase: 'Season Close', description: 'Final harvests, plant garlic, clean up', color: '#dc2626' };
  }
  return { phase: 'Rest', description: 'Plan next year, order seed catalogs', color: '#6b7280' };
}
