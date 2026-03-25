import { GardenSpec, BedType, SunRequirement } from '../types/garden';
import { plants } from '../data/plants';
import { getSeasonPhase, getCurrentWeekTasks, LAST_FROST_DATE } from './calendar';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Tool definitions for Gemini function calling
const gardenTools = [
  {
    name: 'resize_garden',
    description: 'Set the garden space dimensions in feet. Use this when the user wants to change how big their garden area is. Convert inches to feet if needed (divide by 12).',
    parameters: {
      type: 'object',
      properties: {
        width_ft: { type: 'number', description: 'Garden width in feet' },
        depth_ft: { type: 'number', description: 'Garden depth in feet' },
      },
      required: ['width_ft', 'depth_ft'],
    },
  },
  {
    name: 'add_bed',
    description: 'Create a new garden bed on the canvas. Types: raised, in_ground, container, barrel, hanging, trellis, trough.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the bed' },
        type: { type: 'string', enum: ['raised', 'in_ground', 'container', 'barrel', 'hanging', 'trellis', 'trough'] },
        width_ft: { type: 'number', description: 'Width in feet' },
        length_ft: { type: 'number', description: 'Length in feet' },
        sun: { type: 'string', enum: ['full_sun', 'partial_sun', 'partial_shade', 'full_shade'], description: 'Sun exposure' },
        x: { type: 'number', description: 'X position on canvas in feet from left edge' },
        y: { type: 'number', description: 'Y position on canvas in feet from top edge' },
      },
      required: ['name', 'type', 'width_ft', 'length_ft'],
    },
  },
  {
    name: 'plant_in_bed',
    description: 'Place a specific plant in a bed square. Use the plant ID from the database.',
    parameters: {
      type: 'object',
      properties: {
        bed_id: { type: 'string', description: 'ID of the bed' },
        row: { type: 'number', description: 'Row index (0-based)' },
        col: { type: 'number', description: 'Column index (0-based)' },
        plant_id: { type: 'string', description: 'Plant ID from the database' },
      },
      required: ['bed_id', 'row', 'col', 'plant_id'],
    },
  },
  {
    name: 'remove_bed',
    description: 'Remove a bed from the garden by its ID.',
    parameters: {
      type: 'object',
      properties: {
        bed_id: { type: 'string', description: 'ID of the bed to remove' },
      },
      required: ['bed_id'],
    },
  },
  {
    name: 'fill_bed',
    description: 'Auto-fill empty squares in a bed with recommended plants for the current season.',
    parameters: {
      type: 'object',
      properties: {
        bed_id: { type: 'string', description: 'ID of the bed to fill' },
        plant_ids: { type: 'array', items: { type: 'string' }, description: 'List of plant IDs to use for filling' },
      },
      required: ['bed_id'],
    },
  },
];

function buildSystemPrompt(spec: GardenSpec): string {
  const now = new Date();
  const season = getSeasonPhase(now);
  const daysToFrost = Math.ceil((LAST_FROST_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const weekTasks = getCurrentWeekTasks(now);

  const bedSummary = spec.beds.map(b => {
    const filled = b.squares.flat().filter(s => s.plantId).length;
    const total = b.widthFt * b.lengthFt;
    const plantList = [...new Set(b.squares.flat().filter(s => s.plantId).map(s => s.plantId))].join(', ');
    return `  - ${b.name} (id: ${b.id}): ${b.widthFt}'×${b.lengthFt}' ${b.type}, ${filled}/${total} planted${plantList ? `, plants: ${plantList}` : ''}`;
  }).join('\n');

  const plantDb = plants.map(p =>
    `${p.id}: ${p.icon} ${p.common_name} | ${p.spacing_per_sqft}/sqft | ${p.days_to_maturity}d | ${p.frost_tolerance} | start: ${p.zone_4_seed_start_date || 'n/a'} | transplant: ${p.zone_4_transplant_date || 'n/a'} | sow: ${p.zone_4_direct_sow_date || 'n/a'} | companions: ${p.companions_good.join(',')} | avoid: ${p.companions_bad.join(',')}`
  ).join('\n');

  return `You are a garden design assistant for Zone 4b Minnesota (Twin Cities area).
You help users design, plan, and manage their vegetable gardens.

CURRENT STATE:
- Date: ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
- Season: ${season.phase} — ${season.description}
- Days to last frost (May 10): ${daysToFrost > 0 ? daysToFrost : 'Past'}
- Garden space: ${spec.property?.lot_width_ft ?? 30}' × ${spec.property?.lot_depth_ft ?? 20}' (${(spec.property?.lot_width_ft ?? 30) * (spec.property?.lot_depth_ft ?? 20)} sqft)

BEDS (${spec.beds.length}):
${bedSummary || '  No beds created yet.'}

THIS WEEK'S TASKS:
${weekTasks.map(t => `  - ${t}`).join('\n') || '  No specific tasks.'}

PLANT DATABASE (${plants.length} plants for Zone 4b):
${plantDb}

RULES:
1. Always convert inches to feet when the user gives dimensions in inches (divide by 12, round to nearest 0.5).
2. When adding beds, auto-position them with spacing so they don't overlap. Use x,y coordinates in feet.
3. When suggesting plants, check companion compatibility — never put bad companions together.
4. All planting dates are for Zone 4b Twin Cities (last frost May 10, first frost Sep 28).
5. Be concise and actionable. Use the tools to make changes — don't just describe what to do.
6. When filling beds, choose season-appropriate plants with good companion pairings.
7. Use markdown for formatting: **bold** for emphasis, bullet points with •.
8. Respond conversationally but keep it brief — 2-4 sentences plus any tool calls.`;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export interface GeminiResponse {
  text: string;
  toolCalls: ToolCall[];
}

export async function chatWithGemini(
  apiKey: string,
  messages: GeminiMessage[],
  spec: GardenSpec,
): Promise<GeminiResponse> {
  const systemPrompt = buildSystemPrompt(spec);

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: messages,
    tools: [{
      function_declarations: gardenTools,
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('No response from Gemini');

  const parts = candidate.content?.parts || [];
  let text = '';
  const toolCalls: ToolCall[] = [];

  for (const part of parts) {
    if (part.text) {
      text += part.text;
    }
    if (part.functionCall) {
      toolCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args || {},
      });
    }
  }

  return { text, toolCalls };
}

// Execute tool calls against the garden
export function executeToolCall(
  call: ToolCall,
  spec: GardenSpec,
  actions: {
    addBed: (bed: { name: string; type: BedType; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x?: number; y?: number }) => string;
    setPlant: (bedId: string, row: number, col: number, plantId: string | null) => void;
    removeBed: (bedId: string) => void;
  },
): string {
  switch (call.name) {
    case 'resize_garden': {
      const w = Math.round(call.args.width_ft * 2) / 2; // round to 0.5
      const d = Math.round(call.args.depth_ft * 2) / 2;
      window.dispatchEvent(new CustomEvent('update-property', {
        detail: { ...spec.property, lot_width_ft: w, lot_depth_ft: d },
      }));
      return `Resized garden to ${w}' × ${d}' (${Math.round(w * d)} sqft)`;
    }

    case 'add_bed': {
      const type = (call.args.type || 'raised') as BedType;
      const sun = (call.args.sun || 'full_sun') as SunRequirement;
      const w = call.args.width_ft || 4;
      const l = call.args.length_ft || 4;
      const x = call.args.x ?? 2;
      const y = call.args.y ?? 2;
      actions.addBed({ name: call.args.name || `${type} ${w}'×${l}'`, type, widthFt: w, lengthFt: l, sunExposure: sun, x, y });
      return `Created ${call.args.name || type} (${w}'×${l}')`;
    }

    case 'plant_in_bed': {
      const bed = spec.beds.find(b => b.id === call.args.bed_id);
      if (!bed) return `Bed ${call.args.bed_id} not found`;
      const plant = plants.find(p => p.id === call.args.plant_id);
      if (!plant) return `Plant ${call.args.plant_id} not found`;
      actions.setPlant(call.args.bed_id, call.args.row, call.args.col, call.args.plant_id);
      return `Planted ${plant.icon} ${plant.common_name} in ${bed.name}`;
    }

    case 'remove_bed': {
      const bed = spec.beds.find(b => b.id === call.args.bed_id);
      if (!bed) return `Bed not found`;
      actions.removeBed(call.args.bed_id);
      return `Removed ${bed.name}`;
    }

    case 'fill_bed': {
      const bed = spec.beds.find(b => b.id === call.args.bed_id);
      if (!bed) return `Bed not found`;
      const plantIds = call.args.plant_ids || plants.slice(0, 6).map(p => p.id);
      let count = 0;
      bed.squares.forEach((row, ri) => row.forEach((sq, ci) => {
        if (!sq.plantId && count < plantIds.length) {
          actions.setPlant(bed.id, ri, ci, plantIds[count % plantIds.length]);
          count++;
        }
      }));
      return `Filled ${bed.name} with ${count} plants`;
    }

    default:
      return `Unknown tool: ${call.name}`;
  }
}
