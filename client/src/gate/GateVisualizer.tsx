import { useState } from 'react'
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  GitBranch,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Interactive Automata (DFA) Visualizer
 * Allows students to enter an input string and trace state transitions step-by-step.
 */
export function DfaVisualizer({
  title = 'Interactive Finite Automaton (DFA)',
  description = 'DFA accepting strings over {0, 1} with an even number of 0s and odd number of 1s',
}: {
  title?: string
  description?: string
}) {
  const [inputString, setInputString] = useState('10101')
  const [step, setStep] = useState(0)
  const [currentState, setCurrentState] = useState<'q0' | 'q1' | 'q2' | 'q3'>('q0')
  const [history, setHistory] = useState<Array<{ state: 'q0' | 'q1' | 'q2' | 'q3'; symbol?: string }>>([
    { state: 'q0' },
  ])

  // Transition table for standard 4-state parity DFA:
  // q0: even 0, even 1 (start)
  // q1: even 0, odd 1 (ACCEPT)
  // q2: odd 0, even 1
  // q3: odd 0, odd 1
  const transitions: Record<'q0' | 'q1' | 'q2' | 'q3', Record<'0' | '1', 'q0' | 'q1' | 'q2' | 'q3'>> = {
    q0: { '0': 'q2', '1': 'q1' },
    q1: { '0': 'q3', '1': 'q0' },
    q2: { '0': 'q0', '1': 'q3' },
    q3: { '0': 'q1', '1': 'q2' },
  }

  const states = [
    { id: 'q0', label: 'q₀', sub: '(even, even)', x: 60, y: 55, isStart: true, isAccept: false },
    { id: 'q1', label: 'q₁', sub: '(even, odd)', x: 260, y: 55, isStart: false, isAccept: true },
    { id: 'q2', label: 'q₂', sub: '(odd, even)', x: 60, y: 175, isStart: false, isAccept: false },
    { id: 'q3', label: 'q₃', sub: '(odd, odd)', x: 260, y: 175, isStart: false, isAccept: false },
  ]

  const reset = () => {
    setStep(0)
    setCurrentState('q0')
    setHistory([{ state: 'q0' }])
  }

  const stepForward = () => {
    if (step >= inputString.length) return
    const symbol = inputString[step] as '0' | '1'
    if (symbol !== '0' && symbol !== '1') return
    const next = transitions[currentState][symbol]
    setCurrentState(next)
    setHistory((prev) => [...prev, { state: next, symbol }])
    setStep((s) => s + 1)
  }

  const isFinished = step >= inputString.length
  const isAccepted = isFinished && currentState === 'q1'

  return (
    <div className="rounded-xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">{title}</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">{description}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold text-text-secondary">Input String:</label>
          <input
            value={inputString}
            onChange={(e) => {
              const val = e.target.value.replace(/[^01]/g, '')
              setInputString(val)
              reset()
            }}
            maxLength={10}
            className="w-28 rounded-lg border border-border bg-bg-surface px-2 py-1 font-mono text-[13px] text-text-primary outline-none focus:border-accent-brand"
            placeholder="e.g. 10101"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={stepForward}
            disabled={isFinished}
            className="btn-primary inline-flex items-center gap-1 !py-1 !px-2.5 !text-[12px] disabled:opacity-40"
          >
            <Play className="size-3" /> Step ({step}/{inputString.length})
          </button>
          <button
            type="button"
            onClick={reset}
            className="btn-secondary inline-flex items-center gap-1 !py-1 !px-2 !text-[12px]"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>

        {isFinished && (
          <div
            className={cn(
              'ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-bold',
              isAccepted ? 'bg-state-success/15 text-state-success' : 'bg-state-error/15 text-state-error',
            )}
          >
            {isAccepted ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {isAccepted ? 'STRING ACCEPTED' : 'STRING REJECTED'}
          </div>
        )}
      </div>

      {/* SVG Diagram Canvas */}
      <div className="relative mt-3 flex justify-center rounded-xl bg-bg-surface/80 p-2 border border-border/60">
        <svg viewBox="0 0 340 230" className="h-52 w-full max-w-[420px] select-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="currentColor" className="text-text-muted" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="currentColor" className="text-accent-brand" />
            </marker>
          </defs>

          {/* Transitions Lines & Labels */}
          {/* q0 -> q1 (1) */}
          <line x1="88" y1="55" x2="232" y2="55" stroke="currentColor" strokeWidth="1.75" className="text-border" markerEnd="url(#arrow)" />
          <text x="160" y="46" textAnchor="middle" className="fill-text-secondary text-[11px] font-mono font-bold">1</text>

          {/* q1 -> q0 (1) */}
          <path d="M 235 68 C 160 88 160 88 85 68" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" markerEnd="url(#arrow)" />
          <text x="160" y="93" textAnchor="middle" className="fill-text-secondary text-[11px] font-mono font-bold">1</text>

          {/* q0 -> q2 (0) */}
          <line x1="60" y1="83" x2="60" y2="147" stroke="currentColor" strokeWidth="1.75" className="text-border" markerEnd="url(#arrow)" />
          <text x="50" y="118" textAnchor="middle" className="fill-text-secondary text-[11px] font-mono font-bold">0</text>

          {/* q2 -> q0 (0) */}
          <path d="M 72 150 C 90 115 90 115 72 80" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" markerEnd="url(#arrow)" />
          <text x="96" y="118" textAnchor="middle" className="fill-text-secondary text-[11px] font-mono font-bold">0</text>

          {/* q1 -> q3 (0) */}
          <line x1="260" y1="83" x2="260" y2="147" stroke="currentColor" strokeWidth="1.75" className="text-border" markerEnd="url(#arrow)" />
          <text x="272" y="118" textAnchor="middle" className="fill-text-secondary text-[11px] font-mono font-bold">0</text>

          {/* q3 -> q1 (0) */}
          <path d="M 248 150 C 230 115 230 115 248 80" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" markerEnd="url(#arrow)" />
          <text x="224" y="118" textAnchor="middle" className="fill-text-secondary text-[11px] font-mono font-bold">0</text>

          {/* q2 -> q3 (1) */}
          <line x1="88" y1="175" x2="232" y2="175" stroke="currentColor" strokeWidth="1.75" className="text-border" markerEnd="url(#arrow)" />
          <text x="160" y="166" textAnchor="middle" className="fill-text-secondary text-[11px] font-mono font-bold">1</text>

          {/* Start Arrow pointing to q0 */}
          <line x1="15" y1="55" x2="35" y2="55" stroke="currentColor" strokeWidth="2" className="text-accent-brand" markerEnd="url(#arrow-active)" />
          <text x="22" y="44" className="fill-accent-brand text-[10px] font-bold">Start</text>

          {/* States */}
          {states.map((st) => {
            const isActive = currentState === st.id
            return (
              <g key={st.id} className="cursor-pointer" onClick={() => setCurrentState(st.id as any)}>
                {/* Accept outer ring */}
                {st.isAccept && (
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="27"
                    fill="none"
                    stroke={isActive ? 'var(--color-state-success, #10b981)' : 'currentColor'}
                    strokeWidth="1.5"
                    className={isActive ? '' : 'text-text-muted'}
                  />
                )}
                {/* State main circle */}
                <circle
                  cx={st.x}
                  cy={st.y}
                  r="23"
                  className={cn(
                    'transition-all duration-300',
                    isActive
                      ? 'fill-accent-brand stroke-accent-brand drop-shadow-md'
                      : 'fill-bg-surface-2 stroke-border hover:stroke-accent-brand/60',
                  )}
                  strokeWidth="2"
                />
                <text
                  x={st.x}
                  y={st.y + 4}
                  textAnchor="middle"
                  className={cn('text-[13px] font-mono font-bold', isActive ? 'fill-white' : 'fill-text-primary')}
                >
                  {st.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Execution Trace Sequence */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px] font-mono text-text-muted">
        <span className="font-sans font-semibold text-text-secondary">Trace:</span>
        {history.map((h, i) => (
          <span key={i} className="flex items-center gap-1">
            {h.symbol && <span className="rounded bg-bg-surface px-1 py-0.2 border border-border text-accent-brand">--({h.symbol})--&gt;</span>}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 font-bold',
                i === history.length - 1 ? 'bg-accent-brand text-white' : 'bg-bg-surface border border-border text-text-secondary',
              )}
            >
              {h.state}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * 5-Stage RISC Pipeline Hazard & Timing Visualizer
 * Shows instruction execution across clock cycles with or without data forwarding.
 */
export function PipelineVisualizer({
  instructions = [
    { name: 'I1: ADD R1, R2, R3', produces: 'R1' },
    { name: 'I2: SUB R4, R1, R5', consumes: 'R1' },
    { name: 'I3: AND R6, R1, R7', consumes: 'R1' },
    { name: 'I4: OR  R8, R9, R10', consumes: '' },
  ],
}: {
  instructions?: Array<{ name: string; consumes?: string; produces?: string }>
}) {
  const [useForwarding, setUseForwarding] = useState(true)
  const stages = ['IF', 'ID', 'EX', 'MEM', 'WB']

  // Calculation of cycle allocations:
  // Without forwarding: dependent instruction I2 stalls in ID until I1 finishes WB (at CC5), so I2 EX is CC5 (2 stalls).
  // With forwarding: EX to EX forwarding directly hands R1 at CC3, so I2 continues with 0 stalls.
  const timing = useForwarding
    ? [
        { inst: instructions[0].name, cycles: [1, 2, 3, 4, 5] },
        { inst: instructions[1].name, cycles: [2, 3, 4, 5, 6] },
        { inst: instructions[2].name, cycles: [3, 4, 5, 6, 7] },
        { inst: instructions[3].name, cycles: [4, 5, 6, 7, 8] },
      ]
    : [
        { inst: instructions[0].name, cycles: [1, 2, 3, 4, 5], stalls: [] },
        { inst: instructions[1].name, cycles: [2, 3, 5, 6, 7], stalls: [4] }, // stalled at CC3-4
        { inst: instructions[2].name, cycles: [3, 4, 6, 7, 8], stalls: [5] },
        { inst: instructions[3].name, cycles: [4, 5, 7, 8, 9], stalls: [6] },
      ]

  const maxCycles = useForwarding ? 8 : 10

  return (
    <div className="rounded-xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">Pipelining & Data Hazard Simulation</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUseForwarding((f) => !f)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-[11.5px] font-semibold border transition-all cursor-pointer',
              useForwarding
                ? 'bg-state-success/15 border-state-success text-state-success'
                : 'bg-state-warning/15 border-state-warning text-state-warning',
            )}
          >
            {useForwarding ? '⚡ Operand Forwarding: ENABLED (8 Cycles)' : '⚠️ Operand Forwarding: DISABLED (10 Cycles, 2 Stalls)'}
          </button>
        </div>
      </div>

      <p className="mt-2 text-[12px] text-text-secondary">
        Notice how instruction <span className="font-mono font-bold text-text-primary">I2</span> needs{' '}
        <span className="font-mono text-accent-brand">R1</span> produced by{' '}
        <span className="font-mono font-bold text-text-primary">I1</span>.
        {useForwarding
          ? ' With forwarding, EX-to-EX bypass delivers R1 immediately at CC3 with 0 stall cycles.'
          : ' Without forwarding, I2 must stall in ID stage until I1 completes Write-Back (WB).'}
      </p>

      {/* Gantt Chart Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-bg-surface p-2">
        <div className="grid grid-cols-[140px_repeat(10,minmax(32px,1fr))] gap-1 font-mono text-[11px]">
          {/* Header Row */}
          <div className="font-bold text-text-muted py-1">Instruction</div>
          {Array.from({ length: maxCycles }).map((_, i) => (
            <div key={i} className="text-center font-bold text-text-muted py-1 bg-bg-surface-2/60 rounded">
              CC{i + 1}
            </div>
          ))}

          {/* Instruction Rows */}
          {timing.map((row, idx) => (
            <div key={idx} className="contents">
              <div className="truncate py-1.5 font-bold text-text-primary text-[11px] pr-1">{row.inst}</div>
              {Array.from({ length: maxCycles }).map((_, cIdx) => {
                const cc = cIdx + 1
                const stageIdx = row.cycles.indexOf(cc)
                const isStall = 'stalls' in row && (row as any).stalls?.includes(cc)

                if (stageIdx !== -1) {
                  const stage = stages[stageIdx]
                  const colors: Record<string, string> = {
                    IF: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
                    ID: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
                    EX: 'bg-amber-500/25 text-amber-400 border-amber-500/50 font-bold',
                    MEM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                    WB: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
                  }
                  return (
                    <div
                      key={cIdx}
                      className={cn(
                        'flex items-center justify-center rounded border py-1 text-center font-bold text-[10.5px]',
                        colors[stage] ?? 'bg-bg-surface-2 text-text-primary',
                      )}
                    >
                      {stage}
                    </div>
                  )
                }

                if (isStall) {
                  return (
                    <div
                      key={cIdx}
                      className="flex items-center justify-center rounded border border-red-500/40 bg-red-500/20 py-1 text-center font-bold text-[10px] text-red-400"
                    >
                      STALL
                    </div>
                  )
                }

                return <div key={cIdx} className="rounded py-1" />
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Cache Address Field Decomposer
 * Computes Tag, Index, and Offset bit breakdown for any address size, cache size, block size & associativity.
 */
export function CacheVisualizer({
  defaultAddressBits = 32,
  defaultCacheSizeKB = 64,
  defaultBlockSizeBytes = 64,
  defaultWays = 4,
}: {
  defaultAddressBits?: number
  defaultCacheSizeKB?: number
  defaultBlockSizeBytes?: number
  defaultWays?: number
}) {
  const [addrBits] = useState(defaultAddressBits)
  const [cacheSizeKB, setCacheSizeKB] = useState(defaultCacheSizeKB)
  const [blockSize, setBlockSize] = useState(defaultBlockSizeBytes)
  const [ways, setWays] = useState(defaultWays)

  // Calculations:
  // Offset bits = log2(Block size in bytes)
  const offsetBits = Math.round(Math.log2(blockSize))
  // Total blocks in cache = (cacheSize in bytes) / (blockSize)
  const totalBlocks = (cacheSizeKB * 1024) / blockSize
  // Number of sets = totalBlocks / ways
  const numSets = Math.max(1, totalBlocks / ways)
  // Index bits = log2(numSets)
  const indexBits = Math.round(Math.log2(numSets))
  // Tag bits = Total Address bits - Index bits - Offset bits
  const tagBits = addrBits - indexBits - offsetBits

  return (
    <div className="rounded-xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">Cache Architecture & Bit Field Breakdown</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">{addrBits}-bit Physical Address</span>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div>
          <label className="text-[11px] font-semibold text-text-muted">Cache Size</label>
          <select
            value={cacheSizeKB}
            onChange={(e) => setCacheSizeKB(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-2 py-1 text-[12px] font-semibold text-text-primary"
          >
            <option value={16}>16 KB</option>
            <option value={32}>32 KB</option>
            <option value={64}>64 KB</option>
            <option value={128}>128 KB</option>
            <option value={256}>256 KB</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-text-muted">Block Size</label>
          <select
            value={blockSize}
            onChange={(e) => setBlockSize(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-2 py-1 text-[12px] font-semibold text-text-primary"
          >
            <option value={16}>16 Bytes</option>
            <option value={32}>32 Bytes</option>
            <option value={64}>64 Bytes</option>
            <option value={128}>128 Bytes</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-text-muted">Associativity</label>
          <select
            value={ways}
            onChange={(e) => setWays(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-2 py-1 text-[12px] font-semibold text-text-primary"
          >
            <option value={1}>Direct Mapped (1-Way)</option>
            <option value={2}>2-Way Set Associative</option>
            <option value={4}>4-Way Set Associative</option>
            <option value={8}>8-Way Set Associative</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-text-muted">Total Sets</label>
          <div className="mt-1 rounded-lg border border-border bg-bg-surface px-2 py-1 text-[12px] font-mono font-bold text-accent-brand">
            {numSets} sets (2^{indexBits})
          </div>
        </div>
      </div>

      {/* Address Bit Split Diagram */}
      <div className="mt-4">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Bit Partitioning:</span>
        <div className="mt-1.5 flex h-14 overflow-hidden rounded-xl border border-border text-center font-mono text-[12px]">
          {/* TAG */}
          <div
            style={{ flex: tagBits }}
            className="flex flex-col justify-center bg-indigo-500/20 border-r border-border p-1 text-indigo-300"
          >
            <span className="font-bold text-[13px]">TAG</span>
            <span className="text-[11px]">{tagBits} bits</span>
          </div>

          {/* SET INDEX */}
          <div
            style={{ flex: indexBits }}
            className="flex flex-col justify-center bg-cyan-500/20 border-r border-border p-1 text-cyan-300"
          >
            <span className="font-bold text-[13px]">SET INDEX</span>
            <span className="text-[11px]">{indexBits} bits</span>
          </div>

          {/* BLOCK OFFSET */}
          <div
            style={{ flex: offsetBits }}
            className="flex flex-col justify-center bg-emerald-500/20 p-1 text-emerald-300"
          >
            <span className="font-bold text-[13px]">OFFSET</span>
            <span className="text-[11px]">{offsetBits} bits</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>Bit 31 (MSB)</span>
          <span>{tagBits} + {indexBits} + {offsetBits} = {addrBits} Bits Total</span>
          <span>Bit 0 (LSB)</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Universal Visualizer Resolver
 * Inspects a question subject/topic and automatically embeds the interactive visualizer.
 */
export function GateVisualizer({
  subject,
  topic,
}: {
  subject: string
  topic: string
}) {
  if (subject === 'toc' || topic === 'regular' || topic === 'dfa' || topic === 'nfa') {
    return <DfaVisualizer />
  }

  if (subject === 'coa' && (topic === 'pipeline' || topic === 'perf')) {
    return <PipelineVisualizer />
  }

  if (subject === 'coa' && (topic === 'cache' || topic === 'memory')) {
    return <CacheVisualizer />
  }

  return null
}
