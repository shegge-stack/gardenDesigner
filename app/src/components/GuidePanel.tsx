import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GardenSpec, GardenBed, BedType, SunRequirement, PropertyConfig } from '../types/garden';
import { plants, getPlantById } from '../data/plants';
import { getCurrentWeekTasks, getSeasonPhase, isInWindow, LAST_FROST_DATE } from '../utils/calendar';
import { getBedCompatibilityScore } from '../utils/companions';
import { chatWithGemini, executeToolCall, GeminiMessage } from '../utils/gemini';
import { BedEditor } from './BedEditor';
import { PlantStatus } from '../types/garden';

interface GuidePanelProps {
  spec: GardenSpec;
  selectedBed: GardenBed | null;
  onSetPlant: (bedId: string, row: number, col: number, plantId: string | null) => void;
  onUpdateStatus: (bedId: string, row: number, col: number, status: PlantStatus) => void;
  onResize: (bedId: string, width: number, length: number) => void;
  onRemoveBed: (bedId: string) => void;
  onUpdateBed: (bedId: string, updates: Partial<GardenBed>) => void;
  onAddBed: (bed: { name: string; type: BedType; widthFt: number; lengthFt: number; sunExposure: SunRequirement; x?: number; y?: number }) => string;
  // Garden management
  onSaveAs?: (name: string) => void;
  onLoadGarden?: (id: string) => void;
  onDeleteGarden?: (id: string) => void;
  onLoadSample?: () => void;
  onReset?: () => void;
  onExportJSON?: () => void;
  onImportJSON?: (file: File) => void;
  savedGardens?: { id: string; name: string; updatedAt: string }[];
  onDeselectBed: () => void;
}

type PanelMode = 'guide' | 'chat';

// Chat types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  actions?: { label: string; icon?: string; variant?: 'primary' | 'secondary'; onClick: () => void }[];
}

export const GuidePanel: React.FC<GuidePanelProps> = ({
  spec, selectedBed, onSetPlant, onUpdateStatus, onResize, onRemoveBed, onUpdateBed,
  onAddBed, onSaveAs, onLoadGarden, onDeleteGarden: _del, onLoadSample, onReset,
  onExportJSON, onImportJSON, savedGardens = [], onDeselectBed,
}) => {
  const [mode, setMode] = useState<PanelMode>('guide');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const placeholders = [
    'What should I grow this season?',
    'Add a 4x8 raised bed...',
    'What goes well with tomatoes?',
    'My garden is 20 feet wide...',
    'Help me fill my bed with plants',
    'Is it too late to start peppers?',
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPlaceholderIdx(i => (i + 1) % placeholders.length), 4000);
    return () => clearInterval(timer);
  }, []);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const season = getSeasonPhase(now);
  const weekTasks = getCurrentWeekTasks(now);
  const daysToFrost = Math.ceil((LAST_FROST_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const totalPlants = spec.beds.reduce((sum, b) => sum + b.squares.flat().filter(s => s.plantId).length, 0);
  const totalSqFt = spec.beds.reduce((sum, b) => sum + b.widthFt * b.lengthFt, 0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Switch to guide when bed is selected, so bed editor shows
  useEffect(() => {
    if (selectedBed) setMode('guide');
  }, [selectedBed?.id]);

  // Gemini conversation history
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const geminiApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

  // ---- CHAT ENGINE — Gemini with local fallback ----
  const handleChat = useCallback(async (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg) return;

    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', text: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setMode('chat');

    // Try Gemini first
    if (geminiApiKey) {
      setIsThinking(true);
      try {
        const newHistory: GeminiMessage[] = [
          ...geminiHistory,
          { role: 'user', parts: [{ text: msg }] },
        ];

        const response = await chatWithGemini(geminiApiKey, newHistory, spec);

        // Execute any tool calls
        const toolResults: string[] = [];
        for (const call of response.toolCalls) {
          const result = executeToolCall(call, spec, {
            addBed: onAddBed,
            setPlant: onSetPlant,
            removeBed: onRemoveBed,
          });
          toolResults.push(result);
        }

        // Build response text
        let responseText = response.text || '';
        if (toolResults.length > 0) {
          if (responseText) responseText += '\n\n';
          responseText += toolResults.map(r => `✓ ${r}`).join('\n');
        }
        if (!responseText) responseText = 'Done!';

        const assistantMsg: ChatMessage = {
          id: `a${Date.now()}`,
          role: 'assistant',
          text: responseText,
        };

        setChatMessages(prev => [...prev, assistantMsg]);
        setGeminiHistory([
          ...newHistory,
          { role: 'model', parts: [{ text: responseText }] },
        ]);
      } catch (err) {
        console.error('Gemini error, falling back to local:', err);
        // Fall back to local pattern matching
        const response = generateResponse(msg, spec, {
          addBed: onAddBed, setPlant: onSetPlant, removeBed: onRemoveBed,
        });
        const assistantMsg: ChatMessage = {
          id: `a${Date.now()}`,
          role: 'assistant',
          text: response.text,
          actions: response.actions,
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      } finally {
        setIsThinking(false);
      }
    } else {
      // No API key — use local pattern matching
      const response = generateResponse(msg, spec, {
        addBed: onAddBed, setPlant: onSetPlant, removeBed: onRemoveBed,
      });
      const assistantMsg: ChatMessage = {
        id: `a${Date.now()}`,
        role: 'assistant',
        text: response.text,
        actions: response.actions,
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    }
  }, [chatInput, spec, onAddBed, onSetPlant, onRemoveBed, geminiApiKey, geminiHistory]);

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.trim() === '') return <div key={i} className="h-1" />;
      let html = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/• /g, '<span class="text-sage-400">&#8226;</span> ');
      return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  };

  return (
    <div className="w-[340px] flex flex-col h-full shrink-0 border-l" style={{ borderColor: 'rgba(180,210,180,0.2)', background: 'rgba(255,255,255,0.97)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b" style={{ borderColor: 'rgba(180,210,180,0.15)' }}>
        <div className="flex items-center gap-2">
          {selectedBed ? (
            <>
              <button onClick={onDeselectBed} className="text-parchment-400 hover:text-parchment-600 text-xs">←</button>
              <p className="text-sm font-semibold text-parchment-800" style={{ fontFamily: 'var(--font-display)' }}>
                {selectedBed.name}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-parchment-800" style={{ fontFamily: 'var(--font-display)' }}>
              {mode === 'chat' ? 'Garden Assistant' : 'Garden Guide'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!selectedBed && (
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(180,210,180,0.3)' }}>
              <button
                onClick={() => setMode('guide')}
                className="px-2.5 py-1 text-[10px] font-medium transition-colors"
                style={mode === 'guide' ? { background: 'rgba(95,154,100,0.15)', color: '#437d48' } : { color: '#a89882' }}
              >Guide</button>
              <button
                onClick={() => { setMode('chat'); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="px-2.5 py-1 text-[10px] font-medium transition-colors"
                style={mode === 'chat' ? { background: 'rgba(95,154,100,0.15)', color: '#437d48' } : { color: '#a89882' }}
              >Chat</button>
            </div>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#a89882' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>
      </div>

      {/* Menu dropdown */}
      {showMenu && (
        <div className="absolute right-4 top-14 z-50 rounded-xl shadow-xl p-2 text-[12px] w-48" style={{ background: 'white', border: '1px solid rgba(180,210,180,0.3)' }}>
          {showSaveInput ? (
            <div className="flex gap-1 p-1">
              <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Name..." className="flex-1 px-2 py-1 text-xs rounded" autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && saveName.trim()) { onSaveAs?.(saveName.trim()); setSaveName(''); setShowSaveInput(false); setShowMenu(false); } }} />
              <button onClick={() => { if (saveName.trim()) { onSaveAs?.(saveName.trim()); setSaveName(''); setShowSaveInput(false); setShowMenu(false); } }} className="px-2 py-1 bg-sage-600 text-white rounded text-[10px]">Save</button>
            </div>
          ) : (
            <button onClick={() => setShowSaveInput(true)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-parchment-50 text-parchment-600">Save garden as...</button>
          )}
          {savedGardens.length > 0 && savedGardens.map(g => (
            <button key={g.id} onClick={() => { onLoadGarden?.(g.id); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-parchment-50 text-parchment-600 truncate">{g.name}</button>
          ))}
          <div className="border-t my-1" style={{ borderColor: 'rgba(180,210,180,0.2)' }} />
          <button onClick={() => { onLoadSample?.(); setShowMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-parchment-50 text-parchment-600">Load sample garden</button>
          <button onClick={() => { onReset?.(); setShowMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-parchment-50 text-parchment-600">New blank garden</button>
          <button onClick={onExportJSON} className="w-full text-left px-3 py-2 rounded-lg hover:bg-parchment-50 text-parchment-600">Export JSON</button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 rounded-lg hover:bg-parchment-50 text-parchment-600">Import JSON</button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onImportJSON?.(f); e.target.value = ''; setShowMenu(false); }} />
          <div className="border-t my-1" style={{ borderColor: 'rgba(180,210,180,0.2)' }} />
          <button onClick={() => { setChatMessages([]); setGeminiHistory([]); setMode('guide'); setShowMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-parchment-50 text-parchment-600">Clear conversation</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* BED EDITOR MODE */}
        {selectedBed ? (
          <BedEditor
            bed={selectedBed}
            onSetPlant={onSetPlant}
            onUpdateStatus={onUpdateStatus}
            onResize={onResize}
            onRemove={(id) => { onRemoveBed(id); onDeselectBed(); }}
            onUpdateBed={onUpdateBed}
          />
        ) : mode === 'guide' ? (
          /* GUIDE MODE */
          <div className="p-4 space-y-5 stagger-children">
            {/* Warm seasonal greeting */}
            <div className="text-center pt-2">
              <p className="text-3xl mb-2 animate-float" style={{ animationDuration: '5s' }}>
                {season.phase === 'Indoor Seeding' ? '🌱' : season.phase === 'Growing Season' ? '☀️' : '🌿'}
              </p>
              <h3 className="text-lg text-parchment-800 italic" style={{ fontFamily: 'var(--font-display)' }}>
                {season.phase === 'Indoor Seeding' ? 'Time to start your seeds' :
                 season.phase === 'Cool Season Planting' ? 'Cool crops are calling' :
                 season.phase === 'Warm Season Planting' ? 'The garden awaits' :
                 'Your garden is growing'}
              </h3>
              <p className="text-sm text-parchment-500 mt-1 leading-relaxed">
                {season.description}
                {daysToFrost > 0 && <><br /><span className="font-medium text-sage-600">{daysToFrost} days until last frost</span></>}
              </p>
            </div>

            {/* Garden at a glance — visual, not tabular */}
            <div className="rounded-2xl p-4" style={{
              background: 'linear-gradient(135deg, rgba(240,245,241,0.9), rgba(255,252,240,0.6))',
              border: '1px solid rgba(180,210,180,0.2)',
            }}>
              <div className="flex items-center justify-around text-center">
                <div>
                  <p className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>{spec.beds.length}</p>
                  <p className="text-[10px] text-parchment-400 mt-0.5">beds</p>
                </div>
                <div className="w-px h-8" style={{ background: 'rgba(180,210,180,0.3)' }} />
                <div>
                  <p className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>{totalPlants}</p>
                  <p className="text-[10px] text-parchment-400 mt-0.5">plants</p>
                </div>
                <div className="w-px h-8" style={{ background: 'rgba(180,210,180,0.3)' }} />
                <div>
                  <p className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>{totalSqFt}</p>
                  <p className="text-[10px] text-parchment-400 mt-0.5">sqft</p>
                </div>
              </div>
            </div>

            {/* This Week — checklist style */}
            {weekTasks.length > 0 && (
              <div>
                <h3 className="text-sm text-parchment-700 mb-2 italic" style={{ fontFamily: 'var(--font-display)' }}>This Week</h3>
                <div className="space-y-2">
                  {weekTasks.slice(0, 4).map((task, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-[13px] text-parchment-600"
                      style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(180,210,180,0.15)' }}>
                      <span className="text-sage-400 mt-0.5 text-base">○</span>
                      <span className="leading-relaxed">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions — larger, inviting cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Add a bed', icon: '🪴', desc: 'Raised, barrel, trellis...', action: () => { const pos = getNextPos(spec); onAddBed({ name: `Bed ${spec.beds.length + 1}`, type: 'raised', widthFt: 4, lengthFt: 4, sunExposure: 'full_sun', x: pos.x, y: pos.y }); } },
                { label: 'What to plant', icon: '🌱', desc: 'Seasonal suggestions', action: () => handleChat('What should I plant now?') },
                { label: 'Fill a bed', icon: '✨', desc: 'Auto-plant with companions', action: () => handleChat('Fill my bed with the best plants') },
                { label: 'Check my beds', icon: '🔍', desc: 'Companion analysis', action: () => handleChat('Analyze my beds') },
              ].map(({ label, icon, desc, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="rounded-2xl p-3.5 text-left transition-all duration-200 hover:scale-[1.03] group"
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(180,210,180,0.25)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <span className="text-xl block mb-1 group-hover:scale-110 transition-transform inline-block">{icon}</span>
                  <p className="text-xs font-semibold text-parchment-800">{label}</p>
                  <p className="text-[10px] text-parchment-400 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>

            {/* Garden Dimensions — editable inline */}
            <GardenDimensions property={spec.property} />

            {/* Gentle guidance */}
            <div className="text-center pb-2">
              <p className="text-xs text-parchment-400 italic leading-relaxed">
                Click a bed to edit it, or ask me anything below.<br />
                Try: "My garden is 20 feet by 15 feet"
              </p>
            </div>
          </div>
        ) : (
          /* CHAT MODE */
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🌿</p>
                  <p className="text-sm text-parchment-500 italic" style={{ fontFamily: 'var(--font-display)' }}>What shall we grow?</p>
                  <p className="text-[11px] text-parchment-400 mt-2">Try: "Add a 4x8 raised bed" or "What goes with tomatoes?"</p>
                </div>
              )}
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                    msg.role === 'user' ? 'rounded-br-lg text-white' : 'rounded-bl-lg'
                  } ${msg.role === 'system' ? 'text-center w-full' : ''}`}
                    style={
                      msg.role === 'user' ? { background: 'linear-gradient(135deg, #437d48, #356539)' } :
                      msg.role === 'system' ? { background: 'transparent', color: '#437d48', fontSize: '11px' } :
                      { background: 'rgba(240,245,241,0.9)', border: '1px solid rgba(180,210,180,0.3)' }
                    }
                  >
                    <div className="space-y-0.5 leading-relaxed">{renderMarkdown(msg.text)}</div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.actions.map((action, i) => (
                          <button key={i} onClick={() => {
                            action.onClick();
                            const isDirect = action.variant === 'primary' || /^(create|add|remove|clear|auto|fill|plant)/i.test(action.label);
                            if (isDirect) {
                              setChatMessages(prev => [...prev, { id: `s${Date.now()}`, role: 'system', text: `✓ ${action.label}` }]);
                            } else {
                              handleChat(action.label);
                            }
                          }}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-all hover:scale-[1.02]"
                            style={action.variant === 'primary'
                              ? { background: 'linear-gradient(135deg, #437d48, #356539)', color: 'white' }
                              : msg.role === 'user'
                                ? { background: 'rgba(255,255,255,0.15)', color: 'white' }
                                : { background: 'white', border: '1px solid rgba(180,210,180,0.4)', color: '#356539' }
                            }
                          >{action.icon && <span className="mr-1">{action.icon}</span>}{action.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-lg px-4 py-3" style={{ background: 'rgba(240,245,241,0.9)', border: '1px solid rgba(180,210,180,0.3)' }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Chat input — always visible */}
      <div className="px-3 py-2.5 shrink-0 border-t" style={{ borderColor: 'rgba(180,210,180,0.15)' }}>
        <form onSubmit={e => { e.preventDefault(); handleChat(); }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder={placeholders[placeholderIdx]}
            className="flex-1 text-[13px] rounded-xl py-2 px-3"
            style={{ border: '1px solid rgba(180,210,180,0.3)', fontStyle: 'italic' }}
          />
          <button type="submit" disabled={!chatInput.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-all disabled:opacity-30"
            style={{ background: chatInput.trim() ? 'linear-gradient(135deg, #437d48, #2b502e)' : '#d0d0c8' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

// Helper
function getNextPos(spec: GardenSpec) {
  const w = spec.property?.lot_width_ft ?? 30;
  const cols = Math.max(Math.floor((w - 2) / 6), 1);
  const idx = spec.beds.length;
  return { x: 2 + (idx % cols) * 6, y: 2 + Math.floor(idx / cols) * 5 };
}

// ---- Simplified chat respond function ----
function generateResponse(
  input: string,
  spec: GardenSpec,
  actions: { addBed: any; setPlant: any; removeBed: any }
): { text: string; actions?: any[] } {
  const lower = input.toLowerCase().trim();
  const now = new Date();
  const daysToFrost = Math.ceil((LAST_FROST_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Resize garden / property
  if (/garden.*(size|dimension|resize|width|depth|area)|resize.*garden|change.*garden.*size|how.*big|my.*garden.*is|set.*garden/i.test(lower)) {
    const sizeMatch = lower.match(/(\d+)\s*[x×']\s*(\d+)/);
    const currentW = spec.property?.lot_width_ft ?? 30;
    const currentD = spec.property?.lot_depth_ft ?? 20;
    if (sizeMatch) {
      const w = parseInt(sizeMatch[1]);
      const d = parseInt(sizeMatch[2]);
      return {
        text: `Change your garden from **${currentW}'×${currentD}'** to **${w}'×${d}'** (${w * d} sqft)?`,
        actions: [
          { label: `Set to ${w}'×${d}'`, icon: '✓', variant: 'primary', onClick: () => {
            window.dispatchEvent(new CustomEvent('update-property', { detail: { ...spec.property, lot_width_ft: w, lot_depth_ft: d } }));
          }},
        ],
      };
    }
    return {
      text: `Your garden is currently **${currentW}'×${currentD}'** (${currentW * currentD} sqft).\n\nYou can resize it right here — try:\n• "Set garden to 22x17"\n• "Make my garden 30x20"\n\nOr use the dimension inputs in the Guide panel below.`,
    };
  }

  // Add bed
  if (/add|create|new/i.test(lower) && /bed|planter|raised|trough|barrel|trellis/i.test(lower)) {
    const sizeMatch = lower.match(/(\d+)\s*[x×]\s*(\d+)/);
    const w = sizeMatch ? parseInt(sizeMatch[1]) : 4;
    const l = sizeMatch ? parseInt(sizeMatch[2]) : 4;
    let type: BedType = 'raised';
    if (/barrel/i.test(lower)) type = 'barrel';
    else if (/trough/i.test(lower)) type = 'trough';
    else if (/trellis/i.test(lower)) type = 'trellis';
    else if (/hang/i.test(lower)) type = 'hanging';
    else if (/container|pot/i.test(lower)) type = 'container';
    const pos = getNextPos(spec);
    const typeLabel = type.replace(/_/g, ' ');
    return {
      text: `**${w}'×${l}' ${typeLabel}** — ready to create.`,
      actions: [
        { label: `Create ${w}'×${l}'`, icon: '✓', variant: 'primary', onClick: () => actions.addBed({ name: `${typeLabel} ${w}'×${l}'`, type, widthFt: w, lengthFt: l, sunExposure: 'full_sun' as SunRequirement, x: pos.x, y: pos.y }) },
        ...(w !== 4 || l !== 8 ? [{ label: "4'×8'", onClick: () => actions.addBed({ name: `${typeLabel} 4'×8'`, type, widthFt: 4, lengthFt: 8, sunExposure: 'full_sun' as SunRequirement, x: pos.x, y: pos.y }) }] : []),
      ],
    };
  }

  // What to plant
  if (/what.*(plant|grow|start)|should.*plant|recommend/i.test(lower)) {
    const season = getSeasonPhase(now);
    const urgent = plants.filter(p => isInWindow(p.zone_4_seed_start_date, now, 14));
    const lines = [`**${season.phase}** — ${season.description}`];
    if (urgent.length > 0) {
      lines.push('', '**Start now:**');
      urgent.slice(0, 5).forEach(p => lines.push(`${p.icon} ${p.common_name} — ${p.zone_4_seed_start_date}`));
    }
    if (daysToFrost > 0) lines.push(`\n*${daysToFrost} days to last frost*`);
    const bed = spec.beds.find(b => b.squares.flat().some(s => !s.plantId));
    return {
      text: lines.join('\n'),
      actions: bed ? [{ label: `Auto-fill ${bed.name}`, icon: '🌱', variant: 'primary', onClick: () => {
        const suggestions = urgent.length > 0 ? urgent : plants.slice(0, 6);
        let idx = 0;
        bed.squares.forEach((row, ri) => row.forEach((sq, ci) => {
          if (!sq.plantId && idx < suggestions.length) { actions.setPlant(bed.id, ri, ci, suggestions[idx].id); idx++; }
        }));
      }}] : undefined,
    };
  }

  // Companion
  if (/companion|goes.*with|next.*to/i.test(lower)) {
    const plant = plants.find(p => lower.includes(p.common_name.toLowerCase()));
    if (plant) {
      const goods = plant.companions_good.map(id => getPlantById(id)).filter(Boolean);
      const bads = plant.companions_bad.map(id => getPlantById(id)).filter(Boolean);
      return {
        text: `**${plant.icon} ${plant.common_name}**\n\n` +
          (goods.length > 0 ? `✅ ${goods.map(p => `${p!.icon} ${p!.common_name}`).join('  ')}\n\n` : '') +
          (bads.length > 0 ? `❌ ${bads.map(p => `${p!.icon} ${p!.common_name}`).join('  ')}` : ''),
      };
    }
    return { text: 'Which plant? Try "What goes with tomatoes?"' };
  }

  // Analyze
  if (/analyze|check|review|status/i.test(lower)) {
    if (spec.beds.length === 0) return { text: 'No beds yet. Add one to get started!' };
    const lines = spec.beds.map(bed => {
      const filled = bed.squares.flat().filter(s => s.plantId).length;
      const total = bed.widthFt * bed.lengthFt;
      const compat = getBedCompatibilityScore(bed.squares.flat().map(s => s.plantId));
      return `**${bed.name}** — ${Math.round(filled/total*100)}% full` +
        (compat.bad > 0 ? ` ⚠️${compat.bad} conflicts` : '') +
        (compat.good > 0 ? ` ✅${compat.good} good` : '');
    });
    return { text: lines.join('\n') };
  }

  // Fill bed
  if (/fill|auto.*plant|populate/i.test(lower)) {
    const bed = spec.beds.find(b => b.squares.flat().some(s => !s.plantId));
    if (!bed) return { text: 'All beds are full!' };
    const suggestions = plants.filter(p => isInWindow(p.zone_4_seed_start_date, now, 30) || isInWindow(p.zone_4_direct_sow_date, now, 30)).slice(0, 8);
    return {
      text: `I'll fill **${bed.name}** with season-appropriate plants.`,
      actions: [{ label: `Fill ${bed.name}`, icon: '🌱', variant: 'primary', onClick: () => {
        let idx = 0;
        bed.squares.forEach((row, ri) => row.forEach((sq, ci) => {
          if (!sq.plantId && idx < suggestions.length) { actions.setPlant(bed.id, ri, ci, suggestions[idx % suggestions.length].id); idx++; }
        }));
      }}],
    };
  }

  // Tasks
  if (/this week|task|todo/i.test(lower)) {
    const tasks = getCurrentWeekTasks(now);
    return { text: tasks.length > 0 ? `**This week:**\n\n${tasks.map(t => `• ${t}`).join('\n')}` : 'No tasks this week.' };
  }

  // Plant lookup
  const plant = plants.find(p => lower.includes(p.common_name.toLowerCase()) || lower === p.id);
  if (plant) {
    return {
      text: `**${plant.icon} ${plant.common_name}**\n${plant.days_to_maturity}d | ${plant.spacing_per_sqft}/sqft | ${plant.yield_per_plant_lbs}lbs\n` +
        (plant.zone_4_seed_start_date ? `Start: ${plant.zone_4_seed_start_date}\n` : '') +
        (plant.zone_4_transplant_date ? `Transplant: ${plant.zone_4_transplant_date}\n` : '') +
        (plant.zone_4_direct_sow_date ? `Direct sow: ${plant.zone_4_direct_sow_date}` : ''),
    };
  }

  // Fallback
  return {
    text: 'Try:',
    actions: [
      { label: 'Add a bed', onClick: () => {} },
      { label: 'What to plant', onClick: () => {} },
      { label: 'Resize garden', onClick: () => {} },
      { label: "This week", onClick: () => {} },
    ],
  };
}

// ---- Inline Garden Dimensions Editor ----
function GardenDimensions({ property }: { property?: PropertyConfig }) {
  const [editing, setEditing] = useState(false);
  const [w, setW] = useState(property?.lot_width_ft ?? 30);
  const [d, setD] = useState(property?.lot_depth_ft ?? 20);

  useEffect(() => {
    setW(property?.lot_width_ft ?? 30);
    setD(property?.lot_depth_ft ?? 20);
  }, [property?.lot_width_ft, property?.lot_depth_ft]);

  const hasChanges = w !== (property?.lot_width_ft ?? 30) || d !== (property?.lot_depth_ft ?? 20);

  const handleApply = () => {
    window.dispatchEvent(new CustomEvent('update-property', {
      detail: { ...property, lot_width_ft: Math.max(5, w), lot_depth_ft: Math.max(5, d) },
    }));
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full rounded-xl p-3 text-left transition-all hover:scale-[1.01] group"
        style={{ background: 'rgba(240,245,241,0.5)', border: '1px solid rgba(180,210,180,0.15)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-parchment-400 uppercase tracking-wider">Garden Space</p>
            <p className="text-sm font-medium text-parchment-700 mt-0.5">
              {property?.lot_width_ft ?? 30}' × {property?.lot_depth_ft ?? 20}'
              <span className="text-parchment-400 font-normal ml-1.5">
                ({(property?.lot_width_ft ?? 30) * (property?.lot_depth_ft ?? 20)} sqft)
              </span>
            </p>
          </div>
          <span className="text-[10px] text-parchment-400 opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(240,245,241,0.7)', border: '1px solid rgba(95,154,100,0.25)' }}>
      <p className="text-[10px] text-sage-600 uppercase tracking-wider mb-2 font-medium">Garden Dimensions (feet)</p>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[9px] text-parchment-400 block mb-0.5">Width</label>
          <input
            type="number"
            min={5}
            max={200}
            value={w}
            onChange={e => setW(Math.max(1, Number(e.target.value)))}
            className="w-full text-sm py-1.5 px-2 rounded-lg"
            autoFocus
          />
        </div>
        <span className="text-parchment-400 mt-4">×</span>
        <div className="flex-1">
          <label className="text-[9px] text-parchment-400 block mb-0.5">Depth</label>
          <input
            type="number"
            min={5}
            max={200}
            value={d}
            onChange={e => setD(Math.max(1, Number(e.target.value)))}
            className="w-full text-sm py-1.5 px-2 rounded-lg"
          />
        </div>
      </div>
      <p className="text-[10px] text-parchment-400 mt-1">{w * d} sqft total</p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleApply}
          disabled={!hasChanges}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            hasChanges ? 'bg-sage-600 text-white hover:bg-sage-700' : 'bg-parchment-100 text-parchment-400'
          }`}
        >
          {hasChanges ? 'Apply' : 'No changes'}
        </button>
        <button
          onClick={() => { setW(property?.lot_width_ft ?? 30); setD(property?.lot_depth_ft ?? 20); setEditing(false); }}
          className="px-3 py-1.5 text-xs text-parchment-400 hover:text-parchment-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
