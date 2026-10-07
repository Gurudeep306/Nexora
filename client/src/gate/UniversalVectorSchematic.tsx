import { useState, useMemo } from 'react'
import {
  Cpu,
  GitBranch,
  Layers,
  Network,
  Clock,
  HardDrive,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type GateFigure } from './types'

interface UniversalVectorSchematicProps {
  questionId: string
  figures: GateFigure[]
  subject?: string
  topic?: string
  className?: string
  hideSvgDrawing?: boolean
}

type SchematicCategory =
  | 'circuit'
  | 'automata'
  | 'graph'
  | 'tree'
  | 'memory'
  | 'timing'
  | 'hasse'
  | 'network'
  | 'chart'
  | 'kmap'

interface ParsedEntity {
  name: string
  type: string
  details?: string
}

export function UniversalVectorSchematic({
  questionId,
  figures,
  subject = '',
  topic = '',
  className,
  hideSvgDrawing = false,
}: UniversalVectorSchematicProps) {
  const [selectedEntity, setSelectedEntity] = useState<ParsedEntity | null>(null)

  const fig = figures[0]
  const altText = fig?.alt || 'GATE Examination Schematic'
  const altLower = altText.toLowerCase()
  const subjLower = subject.toLowerCase()

  // 1. Detect Category
  const category: SchematicCategory = useMemo(() => {
    if (
      altLower.includes('dfa') ||
      altLower.includes('nfa') ||
      altLower.includes('automaton') ||
      altLower.includes('states a,') ||
      altLower.includes('states q') ||
      altLower.includes('state transition') ||
      altLower.includes('accepting state') ||
      altLower.includes('start state')
    ) {
      return 'automata'
    }
    if (
      altLower.includes('tree') ||
      altLower.includes('heap') ||
      altLower.includes('root') ||
      altLower.includes('b+-tree') ||
      altLower.includes('bst')
    ) {
      return 'tree'
    }
    if (
      altLower.includes('timing') ||
      altLower.includes('waveform') ||
      altLower.includes('clock cycle') ||
      altLower.includes('interrupt') ||
      altLower.includes('handshake')
    ) {
      return 'timing'
    }
    if (
      altLower.includes('hasse') ||
      altLower.includes('poset') ||
      altLower.includes('lattice') ||
      altLower.includes('chain')
    ) {
      return 'hasse'
    }
    if (
      altLower.includes('memory strip') ||
      altLower.includes('heap (fig') ||
      altLower.includes('cache') ||
      altLower.includes('address') ||
      altLower.includes('buffer') ||
      altLower.includes('hatched')
    ) {
      return 'memory'
    }
    if (
      altLower.includes('graph') ||
      altLower.includes('vertex') ||
      altLower.includes('vertices') ||
      altLower.includes('edge') ||
      altLower.includes('mst') ||
      altLower.includes('dijkstra') ||
      altLower.includes('flow network')
    ) {
      return 'graph'
    }
    if (
      altLower.includes('k-map') ||
      altLower.includes('karnaugh') ||
      altLower.includes('truth table') ||
      altLower.includes('minterm')
    ) {
      return 'kmap'
    }
    if (
      altLower.includes('host') ||
      altLower.includes('router') ||
      altLower.includes('bridge') ||
      altLower.includes('lan') ||
      altLower.includes('packet') ||
      altLower.includes('hamming')
    ) {
      return 'network'
    }
    if (
      altLower.includes('gate') ||
      altLower.includes('flip-flop') ||
      altLower.includes('multiplexer') ||
      altLower.includes('mux') ||
      altLower.includes('transistor') ||
      altLower.includes('nand') ||
      altLower.includes('nor') ||
      altLower.includes('xor') ||
      altLower.includes('inverter') ||
      subjLower === 'dl'
    ) {
      return 'circuit'
    }
    return 'chart'
  }, [altLower, subjLower])

  // Extract key entities for the inspector & schematic labeling
  const entities: ParsedEntity[] = useMemo(() => {
    const list: ParsedEntity[] = []

    if (category === 'automata') {
      const stateMatches = altText.match(/(?:states?|state)\s+([A-Za-z0-9,\s]+?)(?:\.|\;|\:|\s+with)/i)
      if (stateMatches) {
        const rawStates = stateMatches[1].split(/[\s,]+/).filter(Boolean)
        rawStates.forEach((s) => {
          const isAccept = altLower.includes('accepting') && altLower.includes(s.toLowerCase())
          const isStart = altLower.includes('start') && altLower.includes(s.toLowerCase())
          list.push({
            name: `State ${s}`,
            type: isAccept ? 'Accepting (Final)' : isStart ? 'Start State' : 'Intermediate State',
            details: `Automaton control state representing recognized prefix sequence in ${questionId}.`,
          })
        })
      }
    } else if (category === 'circuit') {
      const gateTypes = ['NAND', 'NOR', 'AND', 'OR', 'XOR', 'NOT', 'MUX', 'Flip-Flop']
      gateTypes.forEach((gt) => {
        if (altText.toUpperCase().includes(gt)) {
          list.push({
            name: `${gt} Logic Block`,
            type: 'Combinational/Sequential Component',
            details: `Active switching element processing binary signals according to ${gt} truth table.`,
          })
        }
      })
    } else if (category === 'graph') {
      const vMatch = altText.match(/vertices\s+([A-Za-z0-9,\s]+?)(?:\.|\;|\:)/i)
      if (vMatch) {
        vMatch[1].split(/[\s,]+/).filter(Boolean).slice(0, 6).forEach((v) => {
          list.push({
            name: `Vertex ${v}`,
            type: 'Graph Node',
            details: `Topological endpoint incident to graph edges and weight metrics.`,
          })
        })
      }
    } else if (category === 'tree') {
      list.push({
        name: 'Root Node',
        type: 'Tree Root',
        details: 'Topmost ancestral node of the hierarchical data structure.',
      })
      list.push({
        name: 'Left Subtree',
        type: 'Branch',
        details: 'Recursively partitioned left child nodes and leaves.',
      })
      list.push({
        name: 'Right Subtree',
        type: 'Branch',
        details: 'Recursively partitioned right child nodes and leaves.',
      })
    }

    if (list.length === 0) {
      list.push({
        name: 'Primary Schematic Node',
        type: 'System Element',
        details: `Core functional unit extracted from the examination specification (${topic || subject}).`,
      })
    }
    return list
  }, [category, altText, altLower, questionId, topic, subject])

  return (
    <div className={cn('w-full flex flex-col items-center select-none', className)}>
      {/* ── Vector Schematic Canvas ── */}
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-950/90 shadow-2xl p-4 sm:p-6">
        {/* Schematic Grid Lines (Blueprint Background) */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #020617 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px',
          }}
        />

        {/* Blueprint Top Badge */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/20 pb-3 mb-4 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
              {category === 'circuit' && <Cpu className="size-3.5" />}
              {category === 'automata' && <GitBranch className="size-3.5" />}
              {category === 'graph' && <Network className="size-3.5" />}
              {category === 'tree' && <Layers className="size-3.5" />}
              {category === 'timing' && <Clock className="size-3.5" />}
              {category === 'memory' && <HardDrive className="size-3.5" />}
              {category !== 'circuit' &&
                category !== 'automata' &&
                category !== 'graph' &&
                category !== 'tree' &&
                category !== 'timing' &&
                category !== 'memory' && <Cpu className="size-3.5" />}
            </span>
            <span className="font-mono font-bold tracking-wide text-sky-300 uppercase">
              HD Vector Reconstruction · {category.toUpperCase()} SPECIFICATION
            </span>
          </div>

          <span className="rounded-md bg-sky-950/80 px-2 py-0.5 font-mono text-[11px] text-sky-400/90 border border-sky-800/40">
            {questionId}
          </span>
        </div>

        {/* Dynamic Category SVG Renderer */}
        {!hideSvgDrawing && (
          <div className="relative z-10 w-full flex justify-center py-2">
            {category === 'automata' && <AutomataSvgRenderer onSelect={setSelectedEntity} />}
            {category === 'circuit' && <CircuitSvgRenderer onSelect={setSelectedEntity} />}
            {category === 'graph' && <GraphSvgRenderer onSelect={setSelectedEntity} />}
            {category === 'tree' && <TreeSvgRenderer onSelect={setSelectedEntity} />}
            {category === 'timing' && <TimingSvgRenderer onSelect={setSelectedEntity} />}
            {category === 'memory' && <MemorySvgRenderer onSelect={setSelectedEntity} />}
            {category === 'hasse' && <HasseSvgRenderer onSelect={setSelectedEntity} />}
            {category === 'network' && <NetworkSvgRenderer onSelect={setSelectedEntity} />}
            {category === 'kmap' && <KMapSvgRenderer onSelect={setSelectedEntity} />}
            {category === 'chart' && <ChartSvgRenderer onSelect={setSelectedEntity} />}
          </div>
        )}

        {/* Interactive Entity Details Tray */}
        <div className="relative z-10 mt-4 rounded-xl border border-sky-500/20 bg-sky-950/30 p-3 text-[12px] text-sky-200/90">
          <div className="flex items-start gap-2">
            <Info className="size-4 shrink-0 text-sky-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-sky-300">
                {selectedEntity ? selectedEntity.name : 'Schematic Overview'}:
              </span>{' '}
              <span>
                {selectedEntity ? selectedEntity.details : altText}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Component Chips */}
        {entities.length > 0 && (
          <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-mono text-slate-400 mr-1">Components:</span>
            {entities.map((ent, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedEntity(ent)}
                className={cn(
                  'rounded-lg px-2 py-0.5 text-[11px] font-mono border transition-all cursor-pointer',
                  selectedEntity?.name === ent.name
                    ? 'border-sky-400 bg-sky-500/20 text-white font-bold'
                    : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-sky-500/40 hover:text-white',
                )}
              >
                {ent.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   SUB-RENDERERS FOR EACH SCHEMATIC CATEGORY
   ========================================================================= */

// 1. Automata & TOC States
function AutomataSvgRenderer({
  onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 220" className="w-full max-w-xl select-none drop-shadow-md">
      <defs>
        <marker id="auto-arr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
        </marker>
        <marker id="auto-arr-emerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#34d399" />
        </marker>
      </defs>

      {/* Start Arrow */}
      <line x1="20" y1="110" x2="65" y2="110" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#auto-arr)" />
      <text x="35" y="100" fill="#38bdf8" fontSize="12" fontWeight="bold" fontFamily="monospace">Start</text>

      {/* State 0 (Start) */}
      <g
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={() => onSelect({ name: 'State A (Start)', type: 'Initial State', details: 'Initial automaton state on string input.' })}
      >
        <circle cx="95" cy="110" r="28" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
        <text x="95" y="115" textAnchor="middle" fill="#e2e8f0" fontSize="15" fontWeight="bold">A</text>
      </g>

      {/* Transition A -> B */}
      <path d="M 125 100 C 175 60 215 60 265 100" fill="none" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#auto-arr)" />
      <text x="195" y="65" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">0</text>

      {/* Transition B -> A (return) */}
      <path d="M 265 120 C 215 160 175 160 125 120" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#auto-arr)" />
      <text x="195" y="160" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold" fontFamily="monospace">0 / ε</text>

      {/* State 1 (Intermediate) */}
      <g
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={() => onSelect({ name: 'State B', type: 'Intermediate State', details: 'Intermediate state after reading prefix.' })}
      >
        <circle cx="295" cy="110" r="28" fill="#0f172a" stroke="#818cf8" strokeWidth="2.5" />
        <text x="295" y="115" textAnchor="middle" fill="#e2e8f0" fontSize="15" fontWeight="bold">B</text>
      </g>

      {/* Self-loop on B */}
      <path d="M 290 82 C 275 35 315 35 300 82" fill="none" stroke="#818cf8" strokeWidth="2" markerEnd="url(#auto-arr)" />
      <text x="295" y="32" textAnchor="middle" fill="#818cf8" fontSize="12" fontWeight="bold" fontFamily="monospace">1</text>

      {/* Transition B -> C */}
      <line x1="325" y1="110" x2="425" y2="110" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#auto-arr-emerald)" />
      <text x="375" y="102" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="bold" fontFamily="monospace">1</text>

      {/* State 2 (Accepting State - Double Circle) */}
      <g
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={() => onSelect({ name: 'State C (Accepting)', type: 'Final / Accept State', details: 'Accepting double-circle state indicating language membership.' })}
      >
        <circle cx="455" cy="110" r="28" fill="#064e3b" stroke="#34d399" strokeWidth="2.5" />
        <circle cx="455" cy="110" r="22" fill="none" stroke="#34d399" strokeWidth="2" />
        <text x="455" y="115" textAnchor="middle" fill="#ecfdf5" fontSize="15" fontWeight="bold">C</text>
      </g>

      {/* Self loop on C */}
      <path d="M 450 82 C 435 35 475 35 460 82" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#auto-arr-emerald)" />
      <text x="455" y="32" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold" fontFamily="monospace">0, 1</text>
    </svg>
  )
}

// 2. Logic Circuits, Multiplexers & Gates
function CircuitSvgRenderer({
  onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 220" className="w-full max-w-xl select-none drop-shadow-md">
      <defs>
        <linearGradient id="gate-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Primary Input Terminals */}
      {[
        { y: 50, label: 'A' },
        { y: 90, label: 'B' },
        { y: 130, label: 'C' },
        { y: 170, label: 'D' },
      ].map((inp) => (
        <g key={inp.label}>
          <line x1="30" y1={inp.y} x2="100" y2={inp.y} stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="30" cy={inp.y} r="4" fill="#38bdf8" />
          <text x="18" y={inp.y + 4} textAnchor="end" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">
            {inp.label}
          </text>
        </g>
      ))}

      {/* Stage 1: Gate 1 (Top AND/NAND) */}
      <g
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={() => onSelect({ name: 'Stage-1 Gate G₁', type: '2-Input Logic Gate', details: 'Evaluates boolean product of primary inputs A and B.' })}
      >
        <rect x="100" y="40" width="70" height="60" rx="8" fill="url(#gate-grad)" stroke="#38bdf8" strokeWidth="2" />
        <text x="135" y="75" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">AND₁</text>
      </g>

      {/* Stage 1: Gate 2 (Bottom OR/NOR) */}
      <g
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={() => onSelect({ name: 'Stage-1 Gate G₂', type: '2-Input Logic Gate', details: 'Evaluates boolean sum/disjunction of inputs C and D.' })}
      >
        <rect x="100" y="120" width="70" height="60" rx="8" fill="url(#gate-grad)" stroke="#818cf8" strokeWidth="2" />
        <text x="135" y="155" textAnchor="middle" fill="#818cf8" fontSize="13" fontWeight="bold">OR₂</text>
      </g>

      {/* Intermediate Connecting Wires */}
      <path d="M 170 70 L 260 70 L 290 100" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
      <path d="M 170 150 L 260 150 L 290 120" fill="none" stroke="#818cf8" strokeWidth="2.5" />

      {/* Stage 2: Output Gate (Mux or XOR) */}
      <g
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={() => onSelect({ name: 'Output Stage Gate', type: 'Synthesizing Gate', details: 'Combines stage-1 intermediate signals to form the final switching function F.' })}
      >
        <rect x="290" y="80" width="85" height="60" rx="8" fill="url(#gate-grad)" stroke="#f59e0b" strokeWidth="2" />
        <text x="332" y="115" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">NAND₃</text>
      </g>

      {/* Output Wire & Terminal */}
      <line x1="375" y1="110" x2="480" y2="110" stroke="#f59e0b" strokeWidth="3" />
      <circle cx="480" cy="110" r="5" fill="#f59e0b" />
      <text x="500" y="115" textAnchor="start" fill="#f59e0b" fontSize="16" fontWeight="black" fontFamily="monospace">
        F
      </text>
    </svg>
  )
}

// 3. Graph MST & Topologies
function GraphSvgRenderer({
  onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  const vertices = [
    { id: 'v1', x: 80, y: 70, l: 'v₁' },
    { id: 'v2', x: 270, y: 50, l: 'v₂' },
    { id: 'v3', x: 460, y: 70, l: 'v₃' },
    { id: 'v4', x: 130, y: 170, l: 'v₄' },
    { id: 'v5', x: 320, y: 170, l: 'v₅' },
    { id: 'v6', x: 440, y: 170, l: 'v₆' },
  ]

  return (
    <svg viewBox="0 0 540 220" className="w-full max-w-xl select-none drop-shadow-md">
      {/* Graph Edges */}
      <line x1="80" y1="70" x2="270" y2="50" stroke="#475569" strokeWidth="2" />
      <text x="175" y="52" fill="#94a3b8" fontSize="12" fontWeight="bold">4</text>

      <line x1="270" y1="50" x2="460" y2="70" stroke="#475569" strokeWidth="2" />
      <text x="365" y="52" fill="#94a3b8" fontSize="12" fontWeight="bold">8</text>

      <line x1="80" y1="70" x2="130" y2="170" stroke="#475569" strokeWidth="2" />
      <text x="95" y="125" fill="#94a3b8" fontSize="12" fontWeight="bold">8</text>

      {/* MST Edge (Highlighted Emerald) */}
      <line x1="270" y1="50" x2="320" y2="170" stroke="#10b981" strokeWidth="3" strokeDasharray="4 2" />
      <text x="305" y="115" fill="#10b981" fontSize="12" fontWeight="bold">2 (MST)</text>

      <line x1="130" y1="170" x2="320" y2="170" stroke="#10b981" strokeWidth="3" />
      <text x="225" y="190" fill="#10b981" fontSize="12" fontWeight="bold">3</text>

      <line x1="320" y1="170" x2="440" y2="170" stroke="#475569" strokeWidth="2" />
      <text x="380" y="190" fill="#94a3b8" fontSize="12" fontWeight="bold">7</text>

      <line x1="460" y1="70" x2="440" y2="170" stroke="#475569" strokeWidth="2" />
      <text x="460" y="125" fill="#94a3b8" fontSize="12" fontWeight="bold">9</text>

      {/* Vertices */}
      {vertices.map((v) => (
        <g
          key={v.id}
          className="cursor-pointer transition-transform hover:scale-110"
          onClick={() => onSelect({ name: `Vertex ${v.l}`, type: 'Graph Node', details: `Degree incident vertex in the network topology.` })}
        >
          <circle cx={v.x} cy={v.y} r="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
          <text x={v.x} y={v.y + 5} textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold">
            {v.l}
          </text>
        </g>
      ))}
    </svg>
  )
}

// 4. Binary Trees & Heaps
function TreeSvgRenderer({
  onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 220" className="w-full max-w-xl select-none drop-shadow-md">
      {/* Branches */}
      <line x1="270" y1="40" x2="160" y2="110" stroke="#38bdf8" strokeWidth="2" />
      <line x1="270" y1="40" x2="380" y2="110" stroke="#38bdf8" strokeWidth="2" />

      <line x1="160" y1="110" x2="100" y2="175" stroke="#64748b" strokeWidth="2" />
      <line x1="160" y1="110" x2="220" y2="175" stroke="#64748b" strokeWidth="2" />

      <line x1="380" y1="110" x2="330" y2="175" stroke="#64748b" strokeWidth="2" />
      <line x1="380" y1="110" x2="440" y2="175" stroke="#64748b" strokeWidth="2" />

      {/* Root Node */}
      <g
        className="cursor-pointer transition-transform hover:scale-110"
        onClick={() => onSelect({ name: 'Root Node (Key 50)', type: 'BST Root', details: 'Dividing key: left keys < 50, right keys > 50.' })}
      >
        <circle cx="270" cy="40" r="22" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
        <text x="270" y="45" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="bold">50</text>
      </g>

      {/* Level 1 Nodes */}
      <g
        className="cursor-pointer transition-transform hover:scale-110"
        onClick={() => onSelect({ name: 'Left Child (Key 30)', type: 'Internal Node', details: 'Parent of left leaf keys 20 and 40.' })}
      >
        <circle cx="160" cy="110" r="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
        <text x="160" y="115" textAnchor="middle" fill="#bae6fd" fontSize="13" fontWeight="bold">30</text>
      </g>
      <g
        className="cursor-pointer transition-transform hover:scale-110"
        onClick={() => onSelect({ name: 'Right Child (Key 70)', type: 'Internal Node', details: 'Parent of right leaf keys 60 and 80.' })}
      >
        <circle cx="380" cy="110" r="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
        <text x="380" y="115" textAnchor="middle" fill="#bae6fd" fontSize="13" fontWeight="bold">70</text>
      </g>

      {/* Leaves */}
      {[
        { x: 100, y: 175, key: '20' },
        { x: 220, y: 175, key: '40' },
        { x: 330, y: 175, key: '60' },
        { x: 440, y: 175, key: '80' },
      ].map((leaf) => (
        <g
          key={leaf.key}
          className="cursor-pointer transition-transform hover:scale-110"
          onClick={() => onSelect({ name: `Leaf Node (${leaf.key})`, type: 'Tree Leaf', details: 'Terminal leaf with zero children.' })}
        >
          <circle cx={leaf.x} cy={leaf.y} r="18" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
          <text x={leaf.x} y={leaf.y + 5} textAnchor="middle" fill="#d1fae5" fontSize="12" fontWeight="bold">
            {leaf.key}
          </text>
        </g>
      ))}
    </svg>
  )
}

// 5. Timing & Waveforms
function TimingSvgRenderer({
  onSelect: _onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 200" className="w-full max-w-xl select-none drop-shadow-md">
      {/* Grid vertical markers */}
      {[80, 160, 240, 320, 400, 480].map((x) => (
        <line key={x} x1={x} y1="30" x2={x} y2="170" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
      ))}

      {/* CLK Waveform */}
      <text x="20" y="55" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">CLK</text>
      <path d="M 80 60 L 120 60 L 120 40 L 160 40 L 160 60 L 200 60 L 200 40 L 240 40 L 240 60 L 280 60 L 280 40 L 320 40 L 320 60 L 360 60 L 360 40 L 400 40 L 400 60 L 440 60 L 440 40 L 480 40" fill="none" stroke="#38bdf8" strokeWidth="2.5" />

      {/* Interrupt / Data Line */}
      <text x="20" y="115" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">INT</text>
      <path d="M 80 120 L 200 120 L 200 100 L 360 100 L 360 120 L 480 120" fill="none" stroke="#f59e0b" strokeWidth="2.5" />

      {/* Service Timeline Block */}
      <rect x="200" y="140" width="160" height="26" rx="4" fill="#065f46" stroke="#34d399" strokeWidth="1.5" />
      <text x="280" y="157" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontWeight="bold">
        ISR Execution (80 µs)
      </text>

      <rect x="160" y="140" width="40" height="26" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
      <text x="180" y="157" textAnchor="middle" fill="#cbd5e1" fontSize="10">Save</text>

      <rect x="360" y="140" width="40" height="26" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
      <text x="380" y="157" textAnchor="middle" fill="#cbd5e1" fontSize="10">Restore</text>
    </svg>
  )
}

// 6. Memory Strips & Cache Frames
function MemorySvgRenderer({
  onSelect: _onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 180" className="w-full max-w-xl select-none drop-shadow-md">
      {/* Memory Strip Blocks */}
      <g>
        {/* Block 1: In use (50) */}
        <rect x="40" y="60" width="70" height="50" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        <line x1="40" y1="60" x2="110" y2="110" stroke="#38bdf8" strokeWidth="1" />
        <line x1="40" y1="110" x2="110" y2="60" stroke="#38bdf8" strokeWidth="1" />
        <text x="75" y="90" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Allocated</text>
        <text x="75" y="130" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="monospace">0..50</text>

        {/* Block 2: Free Hole (150) */}
        <rect x="110" y="60" width="90" height="50" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
        <text x="155" y="90" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="bold">FREE (150)</text>
        <text x="155" y="130" textAnchor="middle" fill="#10b981" fontSize="12" fontFamily="monospace">50..200</text>

        {/* Block 3: In use (300) */}
        <rect x="200" y="60" width="80" height="50" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        <line x1="200" y1="60" x2="280" y2="110" stroke="#38bdf8" strokeWidth="1" />
        <line x1="200" y1="110" x2="280" y2="60" stroke="#38bdf8" strokeWidth="1" />
        <text x="240" y="90" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Allocated</text>
        <text x="240" y="130" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="monospace">200..300</text>

        {/* Block 4: Free Hole (350) */}
        <rect x="280" y="60" width="120" height="50" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
        <text x="340" y="90" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="bold">FREE (350)</text>
        <text x="340" y="130" textAnchor="middle" fill="#10b981" fontSize="12" fontFamily="monospace">300..650</text>

        {/* Block 5: In use (600) */}
        <rect x="400" y="60" width="100" height="50" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        <line x1="400" y1="60" x2="500" y2="110" stroke="#38bdf8" strokeWidth="1" />
        <line x1="400" y1="110" x2="500" y2="60" stroke="#38bdf8" strokeWidth="1" />
        <text x="450" y="90" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Allocated</text>
        <text x="450" y="130" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="monospace">650..1250</text>
      </g>
    </svg>
  )
}

// 7. Hasse Diagrams & Posets
function HasseSvgRenderer({
  onSelect: _onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 220" className="w-full max-w-xl select-none drop-shadow-md">
      {/* Top element 'a' */}
      <circle cx="270" cy="40" r="18" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
      <text x="270" y="45" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="bold">a</text>

      {/* Middle level: b, c, d */}
      <circle cx="160" cy="110" r="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
      <text x="160" y="115" textAnchor="middle" fill="#bae6fd" fontSize="14" fontWeight="bold">b</text>

      <circle cx="270" cy="110" r="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
      <text x="270" y="115" textAnchor="middle" fill="#bae6fd" fontSize="14" fontWeight="bold">c</text>

      <circle cx="380" cy="110" r="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
      <text x="380" y="115" textAnchor="middle" fill="#bae6fd" fontSize="14" fontWeight="bold">d</text>

      {/* Bottom element 'e' */}
      <circle cx="270" cy="180" r="18" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
      <text x="270" y="185" textAnchor="middle" fill="#a7f3d0" fontSize="14" fontWeight="bold">e</text>

      {/* Covering relations */}
      <line x1="270" y1="58" x2="160" y2="92" stroke="#64748b" strokeWidth="2" />
      <line x1="270" y1="58" x2="270" y2="92" stroke="#64748b" strokeWidth="2" />
      <line x1="270" y1="58" x2="380" y2="92" stroke="#64748b" strokeWidth="2" />

      <line x1="160" y1="128" x2="270" y2="162" stroke="#64748b" strokeWidth="2" />
      <line x1="270" y1="128" x2="270" y2="162" stroke="#64748b" strokeWidth="2" />
      <line x1="380" y1="128" x2="270" y2="162" stroke="#64748b" strokeWidth="2" />
    </svg>
  )
}

// 8. Network Topologies & Bits
function NetworkSvgRenderer({
  onSelect: _onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 180" className="w-full max-w-xl select-none drop-shadow-md">
      {/* 7 Hamming Code Bit Boxes */}
      {[
        { bit: 7, val: '1', type: 'Data' },
        { bit: 6, val: '0', type: 'Data' },
        { bit: 5, val: '0', type: 'Data' },
        { bit: 4, val: '0', type: 'Parity' },
        { bit: 3, val: '1', type: 'Data' },
        { bit: 2, val: '1', type: 'Parity' },
        { bit: 1, val: '0', type: 'Parity' },
      ].map((b, i) => {
        const x = 50 + i * 62
        return (
          <g key={b.bit} className="cursor-pointer">
            <rect
              x={x}
              y="60"
              width="54"
              height="60"
              rx="6"
              fill={b.type === 'Parity' ? '#1e1b4b' : '#0f172a'}
              stroke={b.type === 'Parity' ? '#818cf8' : '#38bdf8'}
              strokeWidth="2"
            />
            <text x={x + 27} y="96" textAnchor="middle" fill="#f8fafc" fontSize="18" fontWeight="black" fontFamily="monospace">
              {b.val}
            </text>
            <text x={x + 27} y="50" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">
              Bit {b.bit}
            </text>
            <text x={x + 27} y="135" textAnchor="middle" fill={b.type === 'Parity' ? '#818cf8' : '#38bdf8'} fontSize="10">
              {b.type}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// 9. K-Map & Truth Tables
function KMapSvgRenderer({
  onSelect: _onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 200" className="w-full max-w-xl select-none drop-shadow-md">
      {/* Gray Code Axis Labels */}
      <text x="140" y="30" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">CD: 00</text>
      <text x="210" y="30" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">01</text>
      <text x="280" y="30" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">11</text>
      <text x="350" y="30" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">10</text>

      <text x="75" y="65" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">AB: 00</text>
      <text x="105" y="105" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">01</text>
      <text x="105" y="145" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">11</text>
      <text x="105" y="185" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">10</text>

      {/* Grid cells */}
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => {
          const val = (r + c) % 2 === 0 ? '1' : '0'
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={130 + c * 70}
                y={45 + r * 38}
                width="68"
                height="36"
                fill={val === '1' ? '#064e3b' : '#0f172a'}
                stroke="#334155"
                strokeWidth="1.5"
              />
              <text
                x={164 + c * 70}
                y={68 + r * 38}
                textAnchor="middle"
                fill={val === '1' ? '#34d399' : '#64748b'}
                fontSize="14"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {val}
              </text>
            </g>
          )
        }),
      )}
    </svg>
  )
}

// 10. General Plots & Charts
function ChartSvgRenderer({
  onSelect: _onSelect,
}: {
  onSelect: (e: ParsedEntity) => void
}) {
  return (
    <svg viewBox="0 0 540 190" className="w-full max-w-xl select-none drop-shadow-md">
      {/* Coordinate Axes */}
      <line x1="60" y1="150" x2="480" y2="150" stroke="#475569" strokeWidth="2" />
      <line x1="60" y1="150" x2="60" y2="30" stroke="#475569" strokeWidth="2" />

      {/* Curve / Bar plot */}
      <path d="M 60 150 Q 180 30 300 110 T 480 50" fill="none" stroke="#38bdf8" strokeWidth="3" />

      {/* Points */}
      <circle cx="180" cy="70" r="5" fill="#f59e0b" />
      <text x="180" y="60" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">Max</text>

      <circle cx="300" cy="110" r="5" fill="#34d399" />
      <text x="300" y="130" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold">Min</text>

      <text x="270" y="175" textAnchor="middle" fill="#94a3b8" fontSize="12">Domain Variable t</text>
      <text x="30" y="25" fill="#94a3b8" fontSize="12">f(t)</text>
    </svg>
  )
}
