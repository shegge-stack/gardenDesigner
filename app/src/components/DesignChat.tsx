import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GardenSpec, GardenBed, BedType, SunRequirement } from '../types/garden';
import { plants, getPlantById } from '../data/plants';
import { checkCompanionCompatibility, getBedCompatibilityScore } from '../utils/companions';
import { getCurrentWeekTasks, getSeasonPhase, isInWindow, LAST_FROST_DATE } from '../utils/calendar';

interface DesignChatProps {
  spec: GardenSpec;
  onAddBed: (bed: { name: string; type: BedType; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x?: number; y?: number }) => string;
  onSetPlant: (bedId: string, row: number, col: number, plantId: string | null) => void;
  onRemoveBed: (bedId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  actions?: ChatAction[];
}

interface ChatAction {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}

// ---- INTELLIGENCE ENGINE ----

function findPlantByName(query: string) {
  const q = query.toLowerCase().trim();
  return plants.find(p =>
    p.common_name.toLowerCase() === q ||
    p.id === q ||
    p.id === q.replace(/\s+/g, '_') ||
    p.common_name.toLowerCase().startsWith(q) ||
    p.botanical_name.toLowerCase().includes(q)
  );
}

function findPlantsMentioned(text: string) {
  const lower = text.toLowerCase();
  return plants.filter(p =>
    lower.includes(p.common_name.toLowerCase()) ||
    lower.includes(p.id.replace(/_/g, ' '))
  );
}

function findBedByName(spec: GardenSpec, query: string) {
  const q = query.toLowerCase().trim();
  return spec.beds.find(b =>
    b.name.toLowerCase().includes(q) ||
    b.id.toLowerCase().includes(q)
  );
}

function getNextBedPosition(spec: GardenSpec) {
  const gardenW = spec.property?.lot_width_ft ?? 30;
  const cols = Math.floor((gardenW - 2) / 6);
  const idx = spec.beds.length;
  const col = idx % Math.max(cols, 1);
  const row = Math.floor(idx / Math.max(cols, 1));
  return { x: 2 + col * 6, y: 2 + row * 5 };
}

function analyzeBed(bed: GardenBed) {
  const filled = bed.squares.flat().filter(s => s.plantId);
  const total = bed.widthFt * bed.lengthFt;
  const empty = total - filled.length;
  const plantCounts: Record<string, number> = {};
  filled.forEach(s => { if (s.plantId) plantCounts[s.plantId] = (plantCounts[s.plantId] || 0) + 1; });
  const compat = getBedCompatibilityScore(filled.map(s => s.plantId));
  return { filled: filled.length, total, empty, plantCounts, compat };
}

function getSmartSuggestion(spec: GardenSpec, bed: GardenBed | null) {
  const now = new Date();
  const season = getSeasonPhase(now);
  const existingPlantIds = new Set<string>();
  spec.beds.forEach(b => b.squares.flat().forEach(s => { if (s.plantId) existingPlantIds.add(s.plantId); }));

  // Suggest plants appropriate for the season that aren't already planted
  const candidates = plants.filter(p => {
    if (existingPlantIds.has(p.id)) return false;
    // During indoor seeding, suggest things to start indoors
    if (season.phase === 'Indoor Seeding' || season.phase === 'Planning') {
      return p.seed_start_weeks_before_frost && p.seed_start_weeks_before_frost >= 4;
    }
    // During cool season, suggest hardy plants
    if (season.phase === 'Cool Season Planting') {
      return p.frost_tolerance === 'hardy' || p.frost_tolerance === 'semi_hardy';
    }
    // During warm season, suggest tender plants
    if (season.phase === 'Warm Season Planting') {
      return p.frost_tolerance === 'tender';
    }
    return true;
  });

  // If we have a specific bed, check companion compatibility
  if (bed) {
    const bedPlantIds = [...new Set(bed.squares.flat().filter(s => s.plantId).map(s => s.plantId!))];
    if (bedPlantIds.length > 0) {
      // Sort by most compatible
      candidates.sort((a, b) => {
        const aScore = bedPlantIds.reduce((sum, id) => {
          const c = checkCompanionCompatibility(a.id, id);
          return sum + (c === 'good' ? 2 : c === 'bad' ? -3 : 0);
        }, 0);
        const bScore = bedPlantIds.reduce((sum, id) => {
          const c = checkCompanionCompatibility(b.id, id);
          return sum + (c === 'good' ? 2 : c === 'bad' ? -3 : 0);
        }, 0);
        return bScore - aScore;
      });
    }
  }

  return candidates.slice(0, 6);
}

// ---- RESPONSE GENERATOR ----

type Actions = {
  addBed: DesignChatProps['onAddBed'];
  setPlant: DesignChatProps['onSetPlant'];
  removeBed: DesignChatProps['onRemoveBed'];
};

function respond(input: string, spec: GardenSpec, actions: Actions): { text: string; actions?: ChatAction[] } {
  const lower = input.toLowerCase().trim();
  const now = new Date();
  const season = getSeasonPhase(now);
  const daysToFrost = Math.ceil((LAST_FROST_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // ---- RESIZE / CHANGE BED DIMENSIONS ----
  if (/resize|change.*size|change.*dimension|make.*bigger|make.*smaller|(\d+)\s*[x×]\s*(\d+).*bed/i.test(lower)) {
    const sizeMatch = lower.match(/(\d+)\s*[x×]\s*(\d+)/);
    if (sizeMatch) {
      const w = parseInt(sizeMatch[1]);
      const l = parseInt(sizeMatch[2]);
      return {
        text: `To resize a bed to ${w}'×${l}', click the bed on the canvas. In the right panel under **Bed Properties**, change the width and length, then click **Apply Changes**.`,
      };
    }
    return {
      text: 'Click any bed on the canvas to select it. The right panel shows editable **width** and **length** fields. Change them and click **Apply Changes**.',
    };
  }

  // ---- REMOVE / DELETE BED ----
  if (/remove|delete|clear.*bed/i.test(lower)) {
    const bedRef = findBedByName(spec, lower.replace(/remove|delete|clear/gi, '').trim());
    if (bedRef) {
      return {
        text: `Remove **${bedRef.name}** (${bedRef.widthFt}'×${bedRef.lengthFt}')?`,
        actions: [
          { label: `Remove ${bedRef.name}`, icon: '🗑', variant: 'secondary', onClick: () => actions.removeBed(bedRef.id) },
        ],
      };
    }
    if (spec.beds.length > 0) {
      return {
        text: 'Which bed do you want to remove?',
        actions: spec.beds.slice(0, 6).map(b => ({
          label: b.name,
          variant: 'secondary' as const,
          onClick: () => actions.removeBed(b.id),
        })),
      };
    }
    return { text: 'No beds to remove. Try adding one first!' };
  }

  // ---- CLEAR ALL PLANTS FROM BED ----
  if (/clear.*plant|empty.*bed|start over/i.test(lower)) {
    const bedRef = findBedByName(spec, lower.replace(/clear|empty|plant|from|start|over/gi, '').trim());
    if (bedRef) {
      return {
        text: `Clear all plants from **${bedRef.name}**?`,
        actions: [{
          label: `Clear ${bedRef.name}`,
          icon: '🧹',
          onClick: () => {
            bedRef.squares.forEach((row, ri) => row.forEach((_, ci) => {
              actions.setPlant(bedRef.id, ri, ci, null);
            }));
          },
        }],
      };
    }
    return { text: 'Which bed should I clear? Click the bed on the canvas, or tell me its name.' };
  }

  // ---- ADD BED ----
  if (/add|create|new|make/i.test(lower) && /bed|planter|raised|trough|barrel|trellis|container|hang/i.test(lower)) {
    const sizeMatch = lower.match(/(\d+)\s*[x×]\s*(\d+)/);
    const w = sizeMatch ? parseInt(sizeMatch[1]) : 4;
    const l = sizeMatch ? parseInt(sizeMatch[2]) : 8;

    let type: BedType = 'raised';
    if (/barrel/i.test(lower)) type = 'barrel';
    else if (/trough|window/i.test(lower)) type = 'trough';
    else if (/trellis|vertical/i.test(lower)) type = 'trellis';
    else if (/hang/i.test(lower)) type = 'hanging';
    else if (/container|pot/i.test(lower)) type = 'container';
    else if (/in.?ground/i.test(lower)) type = 'in_ground';

    const nameMatch = lower.match(/(?:called|named)\s+"?([^"]+)"?/i);
    const pos = getNextBedPosition(spec);
    const typeLabel = type.replace(/_/g, ' ');

    const doAdd = (bw: number, bl: number) => {
      const name = nameMatch?.[1] || `${typeLabel} ${bw}'×${bl}'`;
      actions.addBed({ name, type, widthFt: bw, lengthFt: bl, sunExposure: 'full_sun', x: pos.x, y: pos.y });
    };

    return {
      text: `Creating a **${w}'×${l}' ${typeLabel}**. Pick a size:`,
      actions: [
        { label: `${w}'×${l}'`, icon: '✓', variant: 'primary', onClick: () => doAdd(w, l) },
        ...(w !== 4 || l !== 8 ? [{ label: "4'×8'", onClick: () => doAdd(4, 8) }] : []),
        ...(w !== 4 || l !== 4 ? [{ label: "4'×4'", onClick: () => doAdd(4, 4) }] : []),
        ...(w !== 2 || l !== 6 ? [{ label: "2'×6'", onClick: () => doAdd(2, 6) }] : []),
        ...(w !== 3 || l !== 6 ? [{ label: "3'×6'", onClick: () => doAdd(3, 6) }] : []),
      ].slice(0, 4) as ChatAction[],
    };
  }

  // ---- PLANT SOMETHING IN A BED ----
  if (/plant\s+(\w+)/i.test(lower) && !/what.*plant/i.test(lower)) {
    const mentioned = findPlantsMentioned(lower);
    if (mentioned.length > 0 && spec.beds.length > 0) {
      const plant = mentioned[0];
      // Find first bed with empty space
      const targetBed = spec.beds.find(b => b.squares.flat().some(s => !s.plantId));
      if (targetBed) {
        return {
          text: `Plant **${plant.icon} ${plant.common_name}** — where?`,
          actions: spec.beds.filter(b => b.squares.flat().some(s => !s.plantId)).slice(0, 4).map(bed => ({
            label: bed.name,
            icon: plant.icon,
            onClick: () => {
              // Fill next empty square
              for (let r = 0; r < bed.squares.length; r++) {
                for (let c = 0; c < bed.squares[r].length; c++) {
                  if (!bed.squares[r][c].plantId) {
                    actions.setPlant(bed.id, r, c, plant.id);
                    return;
                  }
                }
              }
            },
          })),
        };
      }
    }
  }

  // ---- FILL / AUTO-PLANT A BED ----
  if (/fill|auto.?plant|populate/i.test(lower)) {
    const bedRef = findBedByName(spec, lower.replace(/fill|auto.?plant|populate|with|plants/gi, '').trim()) || spec.beds[0];
    if (!bedRef) return { text: 'Create a bed first, then I can fill it with plants.' };

    const suggestions = getSmartSuggestion(spec, bedRef);
    return {
      text: `I'll fill **${bedRef.name}** with the best plants for the current season and companion compatibility:`,
      actions: [
        {
          label: `Auto-fill ${bedRef.name}`,
          icon: '🌱',
          variant: 'primary',
          onClick: () => {
            let idx = 0;
            bedRef.squares.forEach((row, ri) => row.forEach((sq, ci) => {
              if (!sq.plantId && idx < suggestions.length) {
                actions.setPlant(bedRef.id, ri, ci, suggestions[idx % suggestions.length].id);
                idx++;
              }
            }));
          },
        },
        ...suggestions.slice(0, 3).map(p => ({
          label: `${p.icon} ${p.common_name}`,
          onClick: () => {
            for (let r = 0; r < bedRef.squares.length; r++) {
              for (let c = 0; c < bedRef.squares[r].length; c++) {
                if (!bedRef.squares[r][c].plantId) {
                  actions.setPlant(bedRef.id, r, c, p.id);
                  return;
                }
              }
            }
          },
        })),
      ],
    };
  }

  // ---- WHAT SHOULD I PLANT / SEASONAL ADVICE ----
  if (/what.*(plant|grow|start|sow)|should.*plant|recommend/i.test(lower)) {
    const suggestions = getSmartSuggestion(spec, null);

    const urgent = plants.filter(p => isInWindow(p.zone_4_seed_start_date, now, 10));
    const lines = [`**${season.phase}** — ${season.description}\n`];

    if (urgent.length > 0) {
      lines.push('**Start now (in the window):**');
      urgent.forEach(p => lines.push(`${p.icon} ${p.common_name} — ${p.zone_4_seed_start_date}`));
      lines.push('');
    }

    if (suggestions.length > 0) {
      lines.push('**Top picks for your garden:**');
      suggestions.slice(0, 5).forEach(p => {
        const date = p.zone_4_seed_start_date || p.zone_4_direct_sow_date || p.zone_4_transplant_date || '';
        lines.push(`${p.icon} ${p.common_name} — ${date}`);
      });
    }

    if (daysToFrost > 0) {
      lines.push(`\n*${daysToFrost} days until last frost (May 10)*`);
    }

    const firstBedWithSpace = spec.beds.find(b => b.squares.flat().some(s => !s.plantId));

    return {
      text: lines.join('\n'),
      actions: firstBedWithSpace ? [
        {
          label: `Fill ${firstBedWithSpace.name}`,
          icon: '🌱',
          variant: 'primary',
          onClick: () => {
            let idx = 0;
            firstBedWithSpace.squares.forEach((row, ri) => row.forEach((sq, ci) => {
              if (!sq.plantId && idx < suggestions.length) {
                actions.setPlant(firstBedWithSpace.id, ri, ci, suggestions[idx].id);
                idx++;
              }
            }));
          },
        },
      ] : [
        { label: 'Add a bed to get started', icon: '+', onClick: () => {
          const pos = getNextBedPosition(spec);
          actions.addBed({ name: 'Veggie Bed', type: 'raised', widthFt: 4, lengthFt: 8, sunExposure: 'full_sun', x: pos.x, y: pos.y });
        }},
      ],
    };
  }

  // ---- COMPANION PLANTING ----
  if (/companion|goes.*with|next.*to|pair|compatible/i.test(lower)) {
    const plant = findPlantsMentioned(lower)[0] || findPlantByName(lower.replace(/what|companion|goes|with|next|to|pair|compatible|for|plant/gi, '').trim());

    if (plant) {
      const goods = plant.companions_good.map(id => getPlantById(id) || plants.find(p => p.common_name.toLowerCase().includes(id))).filter(Boolean);
      const bads = plant.companions_bad.map(id => getPlantById(id) || plants.find(p => p.common_name.toLowerCase().includes(id))).filter(Boolean);

      return {
        text: `**${plant.icon} ${plant.common_name}** companions:\n\n` +
          (goods.length > 0 ? `✅ ${goods.map(p => `${p!.icon} ${p!.common_name}`).join('  ')}\n\n` : '') +
          (bads.length > 0 ? `❌ ${bads.map(p => `${p!.icon} ${p!.common_name}`).join('  ')}` : '✅ No known bad companions'),
      };
    }

    // List all plants as quick buttons
    return {
      text: 'Which plant? Tap one:',
      actions: ['tomato', 'pepper', 'cucumber', 'basil', 'carrot', 'lettuce'].map(id => {
        const p = getPlantById(id);
        return p ? { label: `${p.icon} ${p.common_name}`, onClick: () => {} } : null;
      }).filter(Boolean) as ChatAction[],
    };
  }

  // ---- BED ANALYSIS ----
  if (/analyze|check|review|how.*look|bed.*status/i.test(lower)) {
    if (spec.beds.length === 0) return { text: 'No beds to analyze. Add one first!' };

    const lines: string[] = [];
    spec.beds.forEach(bed => {
      const a = analyzeBed(bed);
      const pctFull = Math.round(a.filled / a.total * 100);
      const plantList = Object.entries(a.plantCounts).map(([id, n]) => {
        const p = getPlantById(id);
        return p ? `${p.icon}×${n}` : '';
      }).filter(Boolean).join(' ');

      lines.push(`**${bed.name}** (${bed.widthFt}'×${bed.lengthFt}') — ${pctFull}% full, ${a.empty} empty`);
      if (plantList) lines.push(`  ${plantList}`);
      if (a.compat.bad > 0) lines.push(`  ⚠️ ${a.compat.bad} bad companion pairing${a.compat.bad > 1 ? 's' : ''}`);
      if (a.compat.good > 0) lines.push(`  ✅ ${a.compat.good} good pairing${a.compat.good > 1 ? 's' : ''}`);
      lines.push('');
    });

    return { text: lines.join('\n') };
  }

  // ---- THIS WEEK / TASKS ----
  if (/this week|what.*do|task|todo|schedule/i.test(lower)) {
    const tasks = getCurrentWeekTasks(now);
    if (tasks.length === 0) return { text: 'No specific tasks for this week. Enjoy your garden!' };
    return {
      text: `**This week's tasks** (${season.phase}):\n\n${tasks.map(t => `• ${t}`).join('\n')}`,
    };
  }

  // ---- SPECIFIC PLANT INFO ----
  const mentionedPlant = findPlantsMentioned(lower)[0] || findPlantByName(lower);
  if (mentionedPlant && lower.length < 30) {
    const p = mentionedPlant;
    const lines = [
      `**${p.icon} ${p.common_name}** *(${p.botanical_name})*\n`,
      `**Spacing:** ${p.spacing_per_sqft}/sqft  |  **Days:** ${p.days_to_maturity}  |  **Yield:** ${p.yield_per_plant_lbs}lbs`,
      `**Sun:** ${p.sun_requirement.replace(/_/g, ' ')}  |  **Water:** ${p.water_need}  |  **Frost:** ${p.frost_tolerance}`,
    ];
    if (p.zone_4_seed_start_date) lines.push(`**Start indoors:** ${p.zone_4_seed_start_date}`);
    if (p.zone_4_transplant_date) lines.push(`**Transplant:** ${p.zone_4_transplant_date}`);
    if (p.zone_4_direct_sow_date) lines.push(`**Direct sow:** ${p.zone_4_direct_sow_date}`);
    if (p.varieties.length > 0) lines.push(`\n**MN varieties:** ${p.varieties.slice(0, 3).join(', ')}`);

    const firstBed = spec.beds.find(b => b.squares.flat().some(s => !s.plantId));
    return {
      text: lines.join('\n'),
      actions: firstBed ? [{
        label: `Plant in ${firstBed.name}`,
        icon: p.icon,
        variant: 'primary',
        onClick: () => {
          for (let r = 0; r < firstBed.squares.length; r++) {
            for (let c = 0; c < firstBed.squares[r].length; c++) {
              if (!firstBed.squares[r][c].plantId) {
                actions.setPlant(firstBed.id, r, c, p.id);
                return;
              }
            }
          }
        },
      }] : undefined,
    };
  }

  // ---- OVERVIEW / STATUS ----
  if (/status|overview|summary|garden/i.test(lower) || /^(hi|hello|hey)$/i.test(lower)) {
    const totalPlants = spec.beds.reduce((sum, b) => sum + b.squares.flat().filter(s => s.plantId).length, 0);
    const totalSqFt = spec.beds.reduce((sum, b) => sum + b.widthFt * b.lengthFt, 0);

    return {
      text: `**${season.phase}** — ${season.description}\n\n` +
        `You have **${spec.beds.length} beds** (${totalSqFt} sqft) with **${totalPlants} plants** placed.\n` +
        (daysToFrost > 0 ? `${daysToFrost} days until last frost.\n\n` : '\n') +
        'What would you like to do?',
      actions: [
        { label: 'What to plant', icon: '🌱', onClick: () => {} },
        { label: 'Add a bed', icon: '+', onClick: () => {} },
        { label: 'Analyze beds', icon: '🔍', onClick: () => {} },
        { label: "This week's tasks", icon: '📋', onClick: () => {} },
      ],
    };
  }

  // ---- HELP / FALLBACK ----
  return {
    text: 'I can help you:',
    actions: [
      { label: 'Add a bed', onClick: () => {} },
      { label: 'What to plant now', onClick: () => {} },
      { label: 'Companion check', onClick: () => {} },
      { label: 'Analyze my beds', onClick: () => {} },
      { label: "This week's tasks", onClick: () => {} },
      { label: 'Fill a bed', onClick: () => {} },
    ],
  };
}

// ---- COMPONENT ----

export const DesignChat: React.FC<DesignChatProps> = ({
  spec, onAddBed, onSetPlant, onRemoveBed, isOpen, onToggle
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show welcome on first open
  const [welcomed, setWelcomed] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      if (!welcomed) {
        const response = respond('hello', spec, { addBed: onAddBed, setPlant: onSetPlant, removeBed: onRemoveBed });
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          text: response.text,
          actions: response.actions,
        }]);
        setWelcomed(true);
      }
    }
  }, [isOpen]);

  const handleSend = useCallback((text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', text: messageText };
    const response = respond(messageText, spec, { addBed: onAddBed, setPlant: onSetPlant, removeBed: onRemoveBed });
    const assistantMsg: ChatMessage = {
      id: `a${Date.now()}`,
      role: 'assistant',
      text: response.text,
      actions: response.actions,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
  }, [input, spec, onAddBed, onSetPlant, onRemoveBed]);

  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      let html = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/• /g, '<span class="text-sage-400">&#8226;</span> ')
        .replace(/(✅|❌|⚠️)/g, '<span class="mr-1">$1</span>');
      return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-xl z-50 transition-all hover:scale-110 hover:shadow-2xl group"
        style={{
          background: 'linear-gradient(135deg, #437d48, #2b502e)',
          boxShadow: '0 4px 20px rgba(45,80,46,0.3)',
        }}
      >
        <span className="group-hover:scale-110 transition-transform">🌱</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[560px] rounded-2xl flex flex-col z-50 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(180,200,180,0.4)',
        boxShadow: '0 12px 48px rgba(30,50,30,0.18), 0 2px 8px rgba(30,50,30,0.08)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ background: 'linear-gradient(135deg, #1a3020, #2b502e)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(95,154,100,0.2)' }}>
            🌿
          </div>
          <div>
            <p className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Garden Assistant
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(143,186,145,0.6)' }}>
              Design &middot; Plant &middot; Grow
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${
              msg.role === 'user'
                ? 'rounded-br-lg text-white'
                : 'rounded-bl-lg'
            }`}
              style={msg.role === 'user'
                ? { background: 'linear-gradient(135deg, #437d48, #356539)' }
                : { background: 'rgba(240,245,241,0.9)', border: '1px solid rgba(180,210,180,0.3)' }
              }
            >
              <div className="space-y-0.5 text-[13px]">
                {renderText(msg.text)}
              </div>
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {msg.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        action.onClick();
                        // If this is a direct action (not a follow-up question), confirm it
                        const isDirectAction = action.variant === 'primary' ||
                          /^(create|add|remove|clear|auto|fill|plant in)/i.test(action.label);
                        if (isDirectAction) {
                          setMessages(prev => [...prev, {
                            id: `sys${Date.now()}`,
                            role: 'system',
                            text: `✓ ${action.label}`,
                          }]);
                        } else {
                          handleSend(action.label);
                        }
                      }}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-all hover:scale-[1.02] ${
                        action.variant === 'primary'
                          ? 'text-white shadow-sm'
                          : ''
                      }`}
                      style={action.variant === 'primary'
                        ? { background: 'linear-gradient(135deg, #437d48, #356539)' }
                        : msg.role === 'user'
                          ? { background: 'rgba(255,255,255,0.15)', color: 'white' }
                          : { background: 'white', border: '1px solid rgba(180,210,180,0.4)', color: '#356539' }
                      }
                    >
                      {action.icon && <span className="mr-1">{action.icon}</span>}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* System messages (confirmations) */}
        {messages.filter(m => m.role === 'system').length > 0 && null}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions Bar */}
      <div className="px-3 py-1.5 border-t border-parchment-100 flex gap-1 overflow-x-auto shrink-0">
        {['What to plant', 'Add bed', 'Analyze', 'Tasks', 'Fill bed'].map(q => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
            style={{ background: 'rgba(240,245,241,0.8)', color: '#437d48', border: '1px solid rgba(180,210,180,0.3)' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-parchment-200 shrink-0">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add a 4x8 raised bed..."
            className="flex-1 text-[13px] rounded-xl py-2 px-3"
            style={{ border: '1px solid rgba(180,210,180,0.4)' }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-all disabled:opacity-30"
            style={{
              background: input.trim() ? 'linear-gradient(135deg, #437d48, #2b502e)' : '#d0d0c8',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};
