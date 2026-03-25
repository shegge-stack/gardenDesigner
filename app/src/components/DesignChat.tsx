import React, { useState, useRef, useEffect } from 'react';
import { GardenSpec, BedType, SunRequirement } from '../types/garden';
import { plants } from '../data/plants';

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
  role: 'user' | 'assistant';
  text: string;
  actions?: ChatAction[];
}

interface ChatAction {
  label: string;
  onClick: () => void;
}

// Simple pattern-matching garden assistant
function generateResponse(
  input: string,
  spec: GardenSpec,
  actions: {
    addBed: (bed: { name: string; type: BedType; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x?: number; y?: number }) => string;
    setPlant: (bedId: string, row: number, col: number, plantId: string | null) => void;
  }
): { text: string; actions?: ChatAction[] } {
  const lower = input.toLowerCase();

  // Greeting
  if (/^(hi|hello|hey|howdy)/i.test(lower)) {
    return {
      text: `Welcome to your garden! You have ${spec.beds.length} beds set up. What would you like to do? I can help you add beds, suggest plants, plan layouts, or answer growing questions.`,
      actions: [
        { label: 'Add a raised bed', onClick: () => actions.addBed({ name: 'New Raised Bed', type: 'raised', widthFt: 4, lengthFt: 8, sunExposure: 'full_sun', x: 2, y: 2 }) },
        { label: 'What should I plant now?', onClick: () => {} },
        { label: 'Help me plan my layout', onClick: () => {} },
      ]
    };
  }

  // Add bed requests
  if (/add.*(bed|planter|raised|trough|barrel|trellis|container)/i.test(lower)) {
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
    const name = nameMatch ? nameMatch[1] : `New ${type.replace('_', ' ')} ${w}'×${l}'`;

    return {
      text: `I'll create a ${w}'×${l}' ${type.replace('_', ' ')} bed for you. Want me to go ahead?`,
      actions: [
        {
          label: `Create ${w}'×${l}' ${type.replace('_', ' ')}`,
          onClick: () => {
            const nextX = (spec.beds.length % 4) * 5 + 2;
            const nextY = Math.floor(spec.beds.length / 4) * 4 + 2;
            actions.addBed({ name, type, widthFt: w, lengthFt: l, sunExposure: 'full_sun', x: nextX, y: nextY });
          }
        },
        ...(sizeMatch ? [] : [
          { label: 'Make it 4×4 instead', onClick: () => actions.addBed({ name, type, widthFt: 4, lengthFt: 4, sunExposure: 'full_sun', x: 2, y: 2 }) },
          { label: 'Make it 2×6 instead', onClick: () => actions.addBed({ name, type, widthFt: 2, lengthFt: 6, sunExposure: 'full_sun', x: 2, y: 2 }) },
        ]),
      ]
    };
  }

  // What to plant now
  if (/what.*(plant|grow|start|sow).*now/i.test(lower) || /plant.*now/i.test(lower) || /what.*should.*plant/i.test(lower)) {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed

    let recommendation = '';
    const suggested: string[] = [];

    if (month <= 2) { // Jan-Mar
      recommendation = 'It\'s indoor seed starting season! Start these seeds indoors now:';
      suggested.push('onion', 'leek', 'celery', 'broccoli', 'cabbage', 'pepper', 'eggplant');
    } else if (month <= 3) { // April
      recommendation = 'Start tomatoes and peppers indoors, and sow cool-season crops outside:';
      suggested.push('tomato', 'cherry_tomato', 'pepper', 'pea', 'spinach', 'lettuce', 'radish');
    } else if (month <= 4) { // May
      recommendation = 'After last frost (May 10), transplant warm crops and direct sow:';
      suggested.push('tomato', 'pepper', 'cucumber', 'zucchini', 'bush_bean', 'corn', 'basil');
    } else if (month <= 6) { // Jun-Jul
      recommendation = 'Plant fall crops and succession sow for continuous harvest:';
      suggested.push('kale', 'beet', 'carrot', 'lettuce', 'broccoli', 'turnip');
    } else {
      recommendation = 'Focus on harvesting and garden cleanup. Plant garlic in October for next year!';
      suggested.push('garlic', 'kale', 'spinach');
    }

    const matchedPlants = suggested.map(id => plants.find(p => p.id === id)).filter(Boolean);

    return {
      text: `${recommendation}\n\n${matchedPlants.map(p => `${p!.icon} **${p!.common_name}** — ${p!.zone_4_seed_start_date ? `Start indoors: ${p!.zone_4_seed_start_date}` : `Direct sow: ${p!.zone_4_direct_sow_date}`}`).join('\n')}`,
      actions: spec.beds.length > 0 ? [
        { label: 'Auto-fill my first bed', onClick: () => {
          const bed = spec.beds[0];
          if (!bed) return;
          let sq = 0;
          for (const plantId of suggested) {
            if (sq >= bed.widthFt * bed.lengthFt) break;
            const row = Math.floor(sq / bed.widthFt);
            const col = sq % bed.widthFt;
            if (!bed.squares[row]?.[col]?.plantId) {
              actions.setPlant(bed.id, row, col, plantId);
              sq++;
            } else {
              sq++;
            }
          }
        }},
      ] : [
        { label: 'Create a bed first', onClick: () => actions.addBed({ name: 'Veggie Bed', type: 'raised', widthFt: 4, lengthFt: 8, sunExposure: 'full_sun', x: 2, y: 2 }) },
      ]
    };
  }

  // Companion planting
  if (/companion|what.*goes.*with|plant.*next.*to|pair.*with/i.test(lower)) {
    const plantNameMatch = plants.find(p =>
      lower.includes(p.common_name.toLowerCase()) || lower.includes(p.id)
    );

    if (plantNameMatch) {
      const goods = plantNameMatch.companions_good.map(id => plants.find(p => p.id === id)).filter(Boolean);
      const bads = plantNameMatch.companions_bad.map(id => plants.find(p => p.id === id)).filter(Boolean);

      return {
        text: `**${plantNameMatch.icon} ${plantNameMatch.common_name}** companion guide:\n\n` +
          (goods.length > 0 ? `✅ **Good companions:** ${goods.map(p => `${p!.icon} ${p!.common_name}`).join(', ')}\n\n` : '') +
          (bads.length > 0 ? `❌ **Avoid:** ${bads.map(p => `${p!.icon} ${p!.common_name}`).join(', ')}` : ''),
      };
    }

    return {
      text: 'Which plant would you like companion recommendations for? Try asking "What goes with tomatoes?" or "What should I plant next to peppers?"',
    };
  }

  // Layout help
  if (/layout|arrange|plan|design|organize/i.test(lower)) {
    return {
      text: `Here are some layout tips for your ${spec.property?.lot_width_ft ?? 0}'×${spec.property?.lot_depth_ft ?? 0}' space:\n\n` +
        '• **Tall plants on the north side** so they don\'t shade shorter ones\n' +
        '• **Leave 2\' paths** between beds for access\n' +
        '• **Orient beds north-south** for even sun distribution\n' +
        '• **Group by water needs** — drought-tolerant herbs away from water-loving tomatoes\n' +
        '• **Place trellises on the north or west edge** of your garden',
      actions: [
        { label: 'Create a starter layout', onClick: () => {
          actions.addBed({ name: 'Veggie Bed 1', type: 'raised', widthFt: 4, lengthFt: 8, sunExposure: 'full_sun', x: 2, y: 2 });
          actions.addBed({ name: 'Veggie Bed 2', type: 'raised', widthFt: 4, lengthFt: 8, sunExposure: 'full_sun', x: 8, y: 2 });
          actions.addBed({ name: 'Herb Trough', type: 'trough', widthFt: 6, lengthFt: 2, sunExposure: 'full_sun', x: 2, y: 12 });
          actions.addBed({ name: 'Trellis', type: 'trellis', widthFt: 2, lengthFt: 6, sunExposure: 'full_sun', x: 14, y: 2 });
        }},
      ]
    };
  }

  // Space/area questions
  if (/how (much|many)|space|size|area|dimension/i.test(lower)) {
    const totalSqFt = spec.beds.reduce((sum, b) => sum + b.widthFt * b.lengthFt, 0);
    const gardenArea = (spec.property?.lot_width_ft ?? 0) * (spec.property?.lot_depth_ft ?? 0);
    return {
      text: `Your garden space is **${spec.property?.lot_width_ft}'×${spec.property?.lot_depth_ft}'** (${gardenArea} sqft).\n\n` +
        `You have **${spec.beds.length} beds** using **${totalSqFt} sqft** — that's ${gardenArea > 0 ? Math.round(totalSqFt / gardenArea * 100) : 0}% of your space.\n\n` +
        `For a family of 2-4, 200-400 sqft of growing area is recommended. You can edit your garden dimensions in the right panel when no bed is selected.`,
    };
  }

  // Garden info
  if (/status|overview|summary/i.test(lower)) {
    const totalPlants = spec.beds.reduce((sum, b) => sum + b.squares.flat().filter(s => s.plantId).length, 0);
    return {
      text: `**Your Garden at a Glance:**\n\n` +
        `• ${spec.beds.length} beds\n` +
        `• ${totalPlants} plants placed\n` +
        `• Zone 4b — last frost May 10\n` +
        `• ${spec.tasks.filter(t => t.status === 'pending').length} pending tasks\n` +
        `• ${spec.harvestLog.reduce((sum, h) => sum + h.quantityLbs, 0).toFixed(1)} lbs harvested`,
    };
  }

  // Fallback
  return {
    text: 'I can help you with:\n\n' +
      '• **"Add a 4x8 raised bed"** — create beds by size and type\n' +
      '• **"What should I plant now?"** — seasonal recommendations\n' +
      '• **"What goes with tomatoes?"** — companion planting\n' +
      '• **"Help me plan my layout"** — arrangement tips\n' +
      '• **"How much space do I have?"** — area calculations\n' +
      '• **"Garden status"** — overview of your plan\n\n' +
      'Try asking me anything about your garden!',
  };
}

export const DesignChat: React.FC<DesignChatProps> = ({
  spec, onAddBed, onSetPlant, onRemoveBed: _onRemoveBed, isOpen, onToggle
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Welcome to your garden studio! I can help you design your space — try asking me to add beds, suggest plants, or plan your layout.',
      actions: [
        { label: 'What should I plant now?', onClick: () => handleSend('What should I plant now?') },
        { label: 'Help me plan my layout', onClick: () => handleSend('Help me plan my layout') },
        { label: 'Add a 4×8 raised bed', onClick: () => handleSend('Add a 4x8 raised bed') },
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: messageText,
    };

    const response = generateResponse(messageText, spec, {
      addBed: onAddBed,
      setPlant: onSetPlant,
    });

    const assistantMsg: ChatMessage = {
      id: `assist_${Date.now()}`,
      role: 'assistant',
      text: response.text,
      actions: response.actions,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
  };

  // Simple markdown-ish rendering
  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/• /g, '<span style="color:rgba(95,154,100,0.7)">&#8226;</span> ');
      return <p key={i} className={`${line.trim() === '' ? 'h-2' : ''}`} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-xl z-50 transition-transform hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #437d48, #2b502e)',
          boxShadow: '0 4px 20px rgba(45,80,46,0.3)',
        }}
        title="Open garden assistant"
      >
        🌱
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] h-[520px] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(200,210,200,0.5)',
        boxShadow: '0 8px 40px rgba(30,50,30,0.15)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1f3b22, #2b502e)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <div>
            <p className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>
              Garden Assistant
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(143,186,145,0.7)' }}>
              Ask me anything about your garden
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ fontSize: '13px' }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user'
                ? 'bg-sage-600 text-white rounded-br-md'
                : 'bg-parchment-100 text-parchment-800 rounded-bl-md'
            }`}>
              <div className="space-y-1 leading-relaxed text-[13px]">
                {renderText(msg.text)}
              </div>
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        action.onClick();
                        if (action.label.startsWith('Create') || action.label.startsWith('Auto') || action.label.startsWith('Make')) {
                          setMessages(prev => [...prev, {
                            id: `action_${Date.now()}`,
                            role: 'assistant',
                            text: `Done! ${action.label}. Check the canvas to see the changes.`,
                          }]);
                        } else {
                          handleSend(action.label);
                        }
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                      style={msg.role === 'user' ? {
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                      } : {
                        background: 'rgba(95,154,100,0.12)',
                        color: '#437d48',
                        border: '1px solid rgba(95,154,100,0.2)',
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-parchment-200 shrink-0">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your garden..."
            className="flex-1 text-sm rounded-xl border-parchment-200 py-2"
            style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic' }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-all disabled:opacity-40"
            style={{
              background: input.trim() ? 'linear-gradient(135deg, #437d48, #2b502e)' : '#c5bbac',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};
