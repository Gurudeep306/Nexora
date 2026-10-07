import { useState, useMemo, useEffect } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  GitBranch,
  BarChart2,
  Network,
  HardDrive,
  Clock,
  Grid,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type GateQuestion } from './types'

/* =========================================================================
   1. AUTOMATA (DFA) VISUALIZER (TOC)
   ========================================================================= */
export function DfaVisualizer({
  title = 'Interactive Finite Automaton (DFA)',
  description = 'DFA accepting strings over {0, 1} with even 0s and odd 1s',
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
  const [isPlaying, setIsPlaying] = useState(false)

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
    setIsPlaying(false)
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

  useEffect(() => {
    if (!isPlaying) return
    if (step >= inputString.length) {
      setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      stepForward()
    }, 700)
    return () => clearTimeout(timer)
  }, [isPlaying, step, inputString, currentState])

  const isFinished = step >= inputString.length
  const isAccepted = isFinished && currentState === 'q1'

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
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
            className="w-28 rounded-lg border border-border bg-bg-surface px-2.5 py-1 font-mono text-[13px] text-text-primary outline-none focus:border-accent-brand"
            placeholder="e.g. 10101"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            disabled={isFinished}
            className="btn-primary inline-flex items-center gap-1 !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40"
          >
            {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
            {isPlaying ? 'Pause' : 'Auto Play'}
          </button>
          <button
            type="button"
            onClick={stepForward}
            disabled={isFinished || isPlaying}
            className="btn-secondary inline-flex items-center gap-1 !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40"
          >
            <ChevronRight className="size-3" /> Step ({step}/{inputString.length})
          </button>
          <button
            type="button"
            onClick={reset}
            className="btn-secondary inline-flex items-center gap-1 !py-1 !px-2 !text-[12px] cursor-pointer"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>

        {isFinished && (
          <div
            className={cn(
              'ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-bold',
              isAccepted ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30',
            )}
          >
            {isAccepted ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {isAccepted ? 'STRING ACCEPTED' : 'STRING REJECTED'}
          </div>
        )}
      </div>

      {/* SVG Canvas */}
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

      {/* Execution Trace */}
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

/* =========================================================================
   2. 5-STAGE PIPELINE HAZARD VISUALIZER (COA)
   ========================================================================= */
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

  const timing = useForwarding
    ? [
        { inst: instructions[0].name, cycles: [1, 2, 3, 4, 5] },
        { inst: instructions[1].name, cycles: [2, 3, 4, 5, 6] },
        { inst: instructions[2].name, cycles: [3, 4, 5, 6, 7] },
        { inst: instructions[3].name, cycles: [4, 5, 6, 7, 8] },
      ]
    : [
        { inst: instructions[0].name, cycles: [1, 2, 3, 4, 5] },
        { inst: instructions[1].name, cycles: [2, 3, 5, 6, 7], stalls: [4] },
        { inst: instructions[2].name, cycles: [3, 4, 6, 7, 8], stalls: [5] },
        { inst: instructions[3].name, cycles: [4, 5, 7, 8, 9], stalls: [6] },
      ]

  const maxCycles = useForwarding ? 8 : 9

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">5-Stage RISC Pipeline Execution Diagram</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-text-muted">Data Forwarding:</span>
          <button
            type="button"
            onClick={() => setUseForwarding((f) => !f)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-[11.5px] font-bold transition-all cursor-pointer',
              useForwarding
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
            )}
          >
            {useForwarding ? '⚡ Enabled (0 Stalls)' : '❌ Disabled (Stall Bubbles)'}
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left font-mono text-[12px]">
          <thead>
            <tr className="border-b border-border/70 text-text-muted">
              <th className="py-2 pr-3 font-sans font-bold text-text-secondary">Instruction</th>
              {Array.from({ length: maxCycles }).map((_, i) => (
                <th key={i} className="px-1.5 py-2 text-center font-bold">
                  CC{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {timing.map((row, idx) => (
              <tr key={idx} className="hover:bg-bg-surface-2/60">
                <td className="py-2 pr-3 font-semibold text-text-primary whitespace-nowrap">{row.inst}</td>
                {Array.from({ length: maxCycles }).map((_, cIdx) => {
                  const cc = cIdx + 1
                  const stageIndex = row.cycles.indexOf(cc)
                  const isStall = (row as any).stalls?.includes(cc)

                  return (
                    <td key={cIdx} className="p-1 text-center">
                      {isStall ? (
                        <span className="inline-block rounded bg-red-500/20 px-1.5 py-0.5 text-[10.5px] font-bold text-red-400 border border-red-500/30">
                          STALL
                        </span>
                      ) : stageIndex !== -1 ? (
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[11px] font-bold text-white shadow-xs',
                            stageIndex === 0 && 'bg-blue-600',
                            stageIndex === 1 && 'bg-indigo-600',
                            stageIndex === 2 && 'bg-amber-600',
                            stageIndex === 3 && 'bg-purple-600',
                            stageIndex === 4 && 'bg-emerald-600',
                          )}
                        >
                          {stages[stageIndex]}
                        </span>
                      ) : (
                        <span className="text-border/40">·</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11.5px] text-text-muted border-t border-border/60 pt-2">
        <span>CPI = {((maxCycles) / instructions.length).toFixed(2)} cycles/inst</span>
        <span>Speedup with Forwarding: ~{(9 / 8).toFixed(2)}×</span>
      </div>
    </div>
  )
}

/* =========================================================================
   3. CACHE ARCHITECTURE VISUALIZER (COA)
   ========================================================================= */
export function CacheVisualizer() {
  const [cacheSizeKB, setCacheSizeKB] = useState(64)
  const [blockSize, setBlockSize] = useState(32)
  const [ways, setWays] = useState(4)

  const addrBits = 32
  const offsetBits = Math.log2(blockSize)
  const totalBlocks = (cacheSizeKB * 1024) / blockSize
  const numSets = totalBlocks / ways
  const indexBits = Math.log2(numSets)
  const tagBits = addrBits - indexBits - offsetBits

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
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
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-2 py-1 text-[12px] font-semibold text-text-primary cursor-pointer"
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
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-2 py-1 text-[12px] font-semibold text-text-primary cursor-pointer"
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
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-2 py-1 text-[12px] font-semibold text-text-primary cursor-pointer"
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

      <div className="mt-4">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Bit Partitioning:</span>
        <div className="mt-1.5 flex h-14 overflow-hidden rounded-xl border border-border text-center font-mono text-[12px]">
          <div
            style={{ flex: tagBits }}
            className="flex flex-col justify-center bg-indigo-500/20 border-r border-border p-1 text-indigo-300"
          >
            <span className="font-bold text-[13px]">TAG</span>
            <span className="text-[11px]">{tagBits} bits</span>
          </div>

          <div
            style={{ flex: indexBits }}
            className="flex flex-col justify-center bg-cyan-500/20 border-r border-border p-1 text-cyan-300"
          >
            <span className="font-bold text-[13px]">SET INDEX</span>
            <span className="text-[11px]">{indexBits} bits</span>
          </div>

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

/* =========================================================================
   4. SORTING & PARTITIONING ANIMATOR (ALGORITHMS)
   ========================================================================= */
export function SortingVisualizer() {
  const [stepIdx, setStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Simulation steps for Lomuto Partition with Pivot = 10 (last element):
  // i starts at -1, j scans from 0 to 5
  const steps = useMemo(() => [
    { arr: [38, 27, 43, 3, 9, 82, 10], pivot: 6, i: -1, j: 0, desc: 'Initial array. Choose last element A[6] = 10 as Pivot. i = -1.' },
    { arr: [38, 27, 43, 3, 9, 82, 10], pivot: 6, i: -1, j: 0, desc: 'Compare A[0]=38 with Pivot=10. 38 > 10. No swap. Advance j.' },
    { arr: [38, 27, 43, 3, 9, 82, 10], pivot: 6, i: -1, j: 1, desc: 'Compare A[1]=27 with Pivot=10. 27 > 10. No swap. Advance j.' },
    { arr: [38, 27, 43, 3, 9, 82, 10], pivot: 6, i: -1, j: 2, desc: 'Compare A[2]=43 with Pivot=10. 43 > 10. No swap. Advance j.' },
    { arr: [3, 27, 43, 38, 9, 82, 10], pivot: 6, i: 0, j: 3, desc: 'Compare A[3]=3 with Pivot=10. 3 <= 10! Increment i to 0. Swap A[0] (38) with A[3] (3).' },
    { arr: [3, 9, 43, 38, 27, 82, 10], pivot: 6, i: 1, j: 4, desc: 'Compare A[4]=9 with Pivot=10. 9 <= 10! Increment i to 1. Swap A[1] (27) with A[4] (9).' },
    { arr: [3, 9, 43, 38, 27, 82, 10], pivot: 6, i: 1, j: 5, desc: 'Compare A[5]=82 with Pivot=10. 82 > 10. No swap. Scanner loop finished.' },
    { arr: [3, 9, 10, 38, 27, 82, 43], pivot: 2, i: 2, j: 6, desc: 'Place Pivot: Swap A[i+1] (A[2]=43) with Pivot A[6] (10). Pivot 10 is now in its FINAL sorted position at index 2!' },
  ], [])

  const current = steps[stepIdx] || steps[0]

  useEffect(() => {
    if (!isPlaying) return
    if (stepIdx >= steps.length - 1) {
      setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setStepIdx((s) => Math.min(s + 1, steps.length - 1))
    }, 1100)
    return () => clearTimeout(timer)
  }, [isPlaying, stepIdx, steps.length])

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <BarChart2 className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">QuickSort Lomuto Partition Step Animator</h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            disabled={stepIdx >= steps.length - 1}
            className="btn-primary inline-flex items-center gap-1 !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40"
          >
            {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
            {isPlaying ? 'Pause' : 'Auto Play'}
          </button>
          <button
            type="button"
            onClick={() => setStepIdx((s) => Math.min(s + 1, steps.length - 1))}
            disabled={stepIdx >= steps.length - 1 || isPlaying}
            className="btn-secondary inline-flex items-center gap-1 !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40"
          >
            <ChevronRight className="size-3" /> Step ({stepIdx + 1}/{steps.length})
          </button>
          <button
            type="button"
            onClick={() => { setStepIdx(0); setIsPlaying(false); }}
            className="btn-secondary inline-flex items-center gap-1 !py-1 !px-2 !text-[12px] cursor-pointer"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      </div>

      {/* Live Array Visualizer Bars */}
      <div className="mt-4 flex items-end justify-center gap-3 sm:gap-4 h-36 px-2 pb-2 pt-6 bg-bg-surface/80 rounded-xl border border-border/60">
        {current.arr.map((val, idx) => {
          const isPivot = idx === current.pivot
          const isI = idx === current.i
          const isJ = idx === current.j
          const isSortedPivot = stepIdx === steps.length - 1 && idx === 2

          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end select-none">
              <span className="text-[11px] font-mono font-bold text-text-secondary">{val}</span>
              <div
                style={{ height: `${Math.max(22, (val / 82) * 85)}px` }}
                className={cn(
                  'w-9 sm:w-11 rounded-t-lg transition-all duration-300 flex items-center justify-center font-mono text-[12px] font-bold shadow-md',
                  isSortedPivot
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-400'
                    : isPivot
                    ? 'bg-amber-500 text-black ring-2 ring-amber-300 animate-pulse'
                    : isJ
                    ? 'bg-cyan-500 text-white'
                    : isI
                    ? 'bg-purple-600 text-white'
                    : 'bg-indigo-600/40 text-text-primary border border-indigo-500/40',
                )}
              >
                {val}
              </div>
              <span className="text-[10px] font-mono text-text-muted">[{idx}]</span>
              <div className="h-4 text-[10px] font-bold font-mono">
                {isPivot && <span className="text-amber-400">PIVOT</span>}
                {isI && !isPivot && <span className="text-purple-400">i</span>}
                {isJ && !isPivot && <span className="text-cyan-400">j</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Spatial Narration Box */}
      <div className="mt-3 rounded-xl border border-accent-brand/30 bg-accent-brand/10 p-3 text-[13px] leading-relaxed text-text-primary flex items-start gap-2.5">
        <Sparkles className="size-4 text-accent-brand shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-accent-brand">Step {stepIdx + 1}: </span>
          {current.desc}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>Partition Time Complexity: $\Theta(n)$</span>
        <span>Recurrence: $T(n) = T(k) + T(n-k-1) + \Theta(n)$</span>
      </div>
    </div>
  )
}

/* =========================================================================
   5. GRAPH MST & SHORTEST PATH VISUALIZER (ALGO / DM)
   ========================================================================= */
export function GraphVisualizer() {
  const [step, setStep] = useState(0)

  // Kruskal's MST step simulation on a 5-node graph:
  // Edges sorted by weight: (C,D: 2), (A,B: 3), (B,C: 4), (B,D: 5 - cycle), (A,D: 6), (D,E: 7)
  const steps = [
    { edge: null, mstCost: 0, desc: 'Initial Graph with 5 vertices {A, B, C, D, E}. Edges sorted in non-decreasing order of weight.' },
    { edge: 'CD', cost: 2, mstCost: 2, desc: 'Consider edge (C, D) of weight 2: Connects separate components. Added to MST! Total = 2.' },
    { edge: 'AB', cost: 3, mstCost: 5, desc: 'Consider edge (A, B) of weight 3: Connects separate components. Added to MST! Total = 5.' },
    { edge: 'BC', cost: 4, mstCost: 9, desc: 'Consider edge (B, C) of weight 4: Connects component {A,B} with {C,D}. Added to MST! Total = 9.' },
    { edge: 'BD', cost: 5, mstCost: 9, isCycle: true, desc: 'Consider edge (B, D) of weight 5: Cycle detected between B, C, and D! REJECTED.' },
    { edge: 'DE', cost: 7, mstCost: 16, desc: 'Consider edge (D, E) of weight 7: Connects E. MST now has V-1 = 4 edges. Finished! Final MST Weight = 16.' },
  ]

  const current = steps[step]

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">Kruskal's Minimum Spanning Tree (MST) Visualizer</h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
            disabled={step >= steps.length - 1}
            className="btn-primary inline-flex items-center gap-1 !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40"
          >
            <ChevronRight className="size-3" /> Step ({step + 1}/{steps.length})
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="btn-secondary inline-flex items-center gap-1 !py-1 !px-2 !text-[12px] cursor-pointer"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      </div>

      {/* SVG Graph Canvas */}
      <div className="relative mt-3 flex justify-center rounded-xl bg-bg-surface/80 p-2 border border-border/60">
        <svg viewBox="0 0 360 210" className="h-48 w-full max-w-[420px] select-none">
          {/* Edges */}
          {/* A(60,60) - B(180,50) wt: 3 */}
          <line
            x1="60" y1="60" x2="180" y2="50"
            stroke={step >= 2 ? '#10b981' : '#475569'}
            strokeWidth={step >= 2 ? '3.5' : '1.5'}
            className="transition-all duration-300"
          />
          <text x="120" y="45" className="fill-text-secondary text-[11px] font-mono font-bold" textAnchor="middle">w=3</text>

          {/* B(180,50) - C(300,70) wt: 4 */}
          <line
            x1="180" y1="50" x2="300" y2="70"
            stroke={step >= 3 ? '#10b981' : '#475569'}
            strokeWidth={step >= 3 ? '3.5' : '1.5'}
            className="transition-all duration-300"
          />
          <text x="240" y="52" className="fill-text-secondary text-[11px] font-mono font-bold" textAnchor="middle">w=4</text>

          {/* C(300,70) - D(220,160) wt: 2 */}
          <line
            x1="300" y1="70" x2="220" y2="160"
            stroke={step >= 1 ? '#10b981' : '#475569'}
            strokeWidth={step >= 1 ? '3.5' : '1.5'}
            className="transition-all duration-300"
          />
          <text x="270" y="125" className="fill-text-secondary text-[11px] font-mono font-bold" textAnchor="middle">w=2</text>

          {/* B(180,50) - D(220,160) wt: 5 (cycle rejected) */}
          <line
            x1="180" y1="50" x2="220" y2="160"
            stroke={step >= 4 ? '#ef4444' : '#475569'}
            strokeWidth={step >= 4 ? '2' : '1.5'}
            strokeDasharray={step >= 4 ? '4,4' : undefined}
            className="transition-all duration-300"
          />
          <text x="190" y="110" className="fill-text-secondary text-[11px] font-mono font-bold" textAnchor="middle">w=5</text>

          {/* D(220,160) - E(90,165) wt: 7 */}
          <line
            x1="220" y1="160" x2="90" y2="165"
            stroke={step >= 5 ? '#10b981' : '#475569'}
            strokeWidth={step >= 5 ? '3.5' : '1.5'}
            className="transition-all duration-300"
          />
          <text x="155" y="178" className="fill-text-secondary text-[11px] font-mono font-bold" textAnchor="middle">w=7</text>

          {/* Vertices */}
          {[
            { id: 'A', x: 60, y: 60 },
            { id: 'B', x: 180, y: 50 },
            { id: 'C', x: 300, y: 70 },
            { id: 'D', x: 220, y: 160 },
            { id: 'E', x: 90, y: 165 },
          ].map((v) => (
            <g key={v.id}>
              <circle
                cx={v.x}
                cy={v.y}
                r="16"
                className="fill-bg-surface-2 stroke-accent-brand transition-all"
                strokeWidth="2"
              />
              <text x={v.x} y={v.y + 4} textAnchor="middle" className="fill-text-primary text-[12px] font-bold font-mono">
                {v.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-accent-brand/10 p-3 text-[13px] border border-accent-brand/30">
        <span className="text-text-primary">{current.desc}</span>
        <span className="font-mono font-bold text-accent-brand shrink-0 ml-2">Total MST: {current.mstCost}</span>
      </div>
    </div>
  )
}

/* =========================================================================
   6. VIRTUAL MEMORY PAGE REPLACEMENT VISUALIZER (OS)
   ========================================================================= */
export function PageReplacementVisualizer() {
  const refString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3]
  const [stepIdx, setStepIdx] = useState(0)

  // Precomputed trace for LRU (3 frames)
  const lruSteps = [
    { page: 7, frames: [7, null, null], hit: false, desc: 'Page 7 arrives. Page Fault! Loaded into Frame 0.' },
    { page: 0, frames: [7, 0, null], hit: false, desc: 'Page 0 arrives. Page Fault! Loaded into Frame 1.' },
    { page: 1, frames: [7, 0, 1], hit: false, desc: 'Page 1 arrives. Page Fault! Loaded into Frame 2.' },
    { page: 2, frames: [2, 0, 1], hit: false, desc: 'Page 2 arrives. Page Fault! Frame full. Least recently used 7 is evicted!' },
    { page: 0, frames: [2, 0, 1], hit: true, desc: 'Page 0 arrives. PAGE HIT! 0 is already in Frame 1. Marked most recent.' },
    { page: 3, frames: [2, 0, 3], hit: false, desc: 'Page 3 arrives. Page Fault! Least recently used 1 is evicted!' },
    { page: 0, frames: [2, 0, 3], hit: true, desc: 'Page 0 arrives. PAGE HIT! 0 is already in memory.' },
    { page: 4, frames: [4, 0, 3], hit: false, desc: 'Page 4 arrives. Page Fault! Least recently used 2 is evicted!' },
    { page: 2, frames: [4, 0, 2], hit: false, desc: 'Page 2 arrives. Page Fault! Least recently used 3 is evicted!' },
    { page: 3, frames: [4, 3, 2], hit: false, desc: 'Page 3 arrives. Page Fault! Least recently used 0 is evicted!' },
  ]

  const current = lruSteps[stepIdx] || lruSteps[0]
  const totalFaults = lruSteps.slice(0, stepIdx + 1).filter((s) => !s.hit).length

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <HardDrive className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">Virtual Memory Page Replacement Simulator</h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStepIdx((s) => Math.min(s + 1, lruSteps.length - 1))}
            disabled={stepIdx >= lruSteps.length - 1}
            className="btn-primary inline-flex items-center gap-1 !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40"
          >
            <ChevronRight className="size-3" /> Step ({stepIdx + 1}/{lruSteps.length})
          </button>
          <button
            type="button"
            onClick={() => setStepIdx(0)}
            className="btn-secondary inline-flex items-center gap-1 !py-1 !px-2 !text-[12px] cursor-pointer"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      </div>

      {/* Reference String Ribbon */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[11px] font-bold text-text-muted mr-1">Ref String:</span>
        {refString.map((p, i) => (
          <span
            key={i}
            className={cn(
              'flex size-7 items-center justify-center rounded-lg font-mono text-[12px] font-bold transition-all',
              i === stepIdx
                ? 'bg-accent-brand text-white shadow-md scale-110 ring-2 ring-accent-brand/40'
                : i < stepIdx
                ? 'bg-bg-surface text-text-secondary border border-border'
                : 'bg-bg-surface-2/50 text-text-muted',
            )}
          >
            {p}
          </span>
        ))}
      </div>

      {/* 3 Memory Frames Box */}
      <div className="mt-3 grid grid-cols-3 gap-3 p-3 bg-bg-surface rounded-xl border border-border text-center">
        {current.frames.map((f, i) => (
          <div key={i} className="rounded-lg border border-border/80 bg-bg-surface-2 p-3">
            <span className="text-[10.5px] font-bold text-text-muted block mb-1">Frame {i}</span>
            <span className="text-xl font-mono font-bold text-text-primary">
              {f !== null ? f : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Live Verdict Banner */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-accent-brand/10 p-3 text-[13px] border border-accent-brand/30">
        <span className="text-text-primary">{current.desc}</span>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-bold',
              current.hit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
            )}
          >
            {current.hit ? 'HIT' : 'FAULT'}
          </span>
          <span className="font-mono font-bold text-accent-brand">Total Faults: {totalFaults}</span>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   7. CPU PROCESS SCHEDULING GANTT VISUALIZER (OS)
   ========================================================================= */
export function CpuSchedulingVisualizer() {
  const processes = [
    { id: 'P1', at: 0, bt: 4, color: 'bg-blue-600' },
    { id: 'P2', at: 1, bt: 3, color: 'bg-emerald-600' },
    { id: 'P3', at: 2, bt: 1, color: 'bg-amber-600' },
    { id: 'P4', at: 3, bt: 2, color: 'bg-purple-600' },
  ]

  // FCFS Gantt Execution:
  // P1: 0 to 4
  // P2: 4 to 7
  // P3: 7 to 8
  // P4: 8 to 10
  const gantt = [
    { p: 'P1', start: 0, end: 4, width: '40%', color: 'bg-blue-600' },
    { p: 'P2', start: 4, end: 7, width: '30%', color: 'bg-emerald-600' },
    { p: 'P3', start: 7, end: 8, width: '10%', color: 'bg-amber-600' },
    { p: 'P4', start: 8, end: 10, width: '20%', color: 'bg-purple-600' },
  ]

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">CPU Process Scheduling (FCFS Gantt Chart)</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">Total Run Time = 10 units</span>
      </div>

      {/* Gantt Chart Bar */}
      <div className="mt-4">
        <div className="flex h-12 w-full overflow-hidden rounded-xl border border-border font-mono text-[12px] font-bold text-white shadow-sm">
          {gantt.map((slot, i) => (
            <div
              key={i}
              style={{ width: slot.width }}
              className={cn('flex items-center justify-center border-r border-border/80 last:border-r-0', slot.color)}
            >
              {slot.p}
            </div>
          ))}
        </div>

        {/* Timeline markers */}
        <div className="mt-1 flex justify-between font-mono text-[11px] text-text-muted px-1">
          <span>0</span>
          <span>4</span>
          <span>7</span>
          <span>8</span>
          <span>10</span>
        </div>
      </div>

      {/* Process Metrics Table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left font-mono text-[11.5px]">
          <thead>
            <tr className="border-b border-border/70 text-text-muted">
              <th className="py-1">Process</th>
              <th className="py-1">Arrival (AT)</th>
              <th className="py-1">Burst (BT)</th>
              <th className="py-1">Completion (CT)</th>
              <th className="py-1">Turnaround (TAT=CT-AT)</th>
              <th className="py-1">Waiting (WT=TAT-BT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-text-primary">
            {processes.map((p) => {
              const ct = p.id === 'P1' ? 4 : p.id === 'P2' ? 7 : p.id === 'P3' ? 8 : 10
              const tat = ct - p.at
              const wt = tat - p.bt
              return (
                <tr key={p.id}>
                  <td className="py-1 font-bold text-accent-brand">{p.id}</td>
                  <td>{p.at}</td>
                  <td>{p.bt}</td>
                  <td>{ct}</td>
                  <td>{tat}</td>
                  <td>{wt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-text-muted border-t border-border/60 pt-2">
        <span>Average Turnaround Time = (4+6+6+7)/4 = 5.75</span>
        <span className="font-bold text-accent-brand">Average Waiting Time = (0+3+5+5)/4 = 3.25</span>
      </div>
    </div>
  )
}

/* =========================================================================
   8. KARNAUGH MAP (K-MAP) 4-VARIABLE VISUALIZER (DL)
   ========================================================================= */
export function KMapVisualizer() {
  const [cells, setCells] = useState<number[]>([
    0, 1, 0, 1,
    1, 1, 1, 1,
    0, 0, 0, 0,
    1, 0, 1, 0,
  ])

  const toggleCell = (idx: number) => {
    setCells((prev) => {
      const next = [...prev]
      next[idx] = next[idx] === 1 ? 0 : 1
      return next
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Grid className="size-4 text-accent-brand" />
          <h4 className="text-[13px] font-bold text-text-primary">4-Variable Karnaugh Map (K-Map) Interactive Grid</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">Click any cell to toggle 0 / 1</span>
      </div>

      <div className="mt-3 flex justify-center">
        <div className="inline-block border border-border rounded-xl bg-bg-surface p-3">
          <div className="grid grid-cols-5 gap-1.5 font-mono text-[12px] text-center items-center">
            {/* Top Header */}
            <span className="text-[11px] font-bold text-accent-brand">AB \ CD</span>
            <span className="font-bold text-text-muted">00</span>
            <span className="font-bold text-text-muted">01</span>
            <span className="font-bold text-text-muted">11</span>
            <span className="font-bold text-text-muted">10</span>

            {/* Row 00 */}
            <span className="font-bold text-text-muted">00</span>
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleCell(i)}
                className={cn(
                  'size-9 rounded-lg font-bold text-[14px] transition-all cursor-pointer',
                  cells[i] === 1 ? 'bg-accent-brand text-white shadow-sm' : 'bg-bg-surface-2 text-text-muted hover:bg-bg-surface-2/80',
                )}
              >
                {cells[i]}
              </button>
            ))}

            {/* Row 01 */}
            <span className="font-bold text-text-muted">01</span>
            {[4, 5, 6, 7].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleCell(i)}
                className={cn(
                  'size-9 rounded-lg font-bold text-[14px] transition-all cursor-pointer',
                  cells[i] === 1 ? 'bg-accent-brand text-white shadow-sm' : 'bg-bg-surface-2 text-text-muted hover:bg-bg-surface-2/80',
                )}
              >
                {cells[i]}
              </button>
            ))}

            {/* Row 11 */}
            <span className="font-bold text-text-muted">11</span>
            {[8, 9, 10, 11].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleCell(i)}
                className={cn(
                  'size-9 rounded-lg font-bold text-[14px] transition-all cursor-pointer',
                  cells[i] === 1 ? 'bg-accent-brand text-white shadow-sm' : 'bg-bg-surface-2 text-text-muted hover:bg-bg-surface-2/80',
                )}
              >
                {cells[i]}
              </button>
            ))}

            {/* Row 10 */}
            <span className="font-bold text-text-muted">10</span>
            {[12, 13, 14, 15].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleCell(i)}
                className={cn(
                  'size-9 rounded-lg font-bold text-[14px] transition-all cursor-pointer',
                  cells[i] === 1 ? 'bg-accent-brand text-white shadow-sm' : 'bg-bg-surface-2 text-text-muted hover:bg-bg-surface-2/80',
                )}
              >
                {cells[i]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11.5px] font-mono text-text-muted border-t border-border/60 pt-2">
        <span>Active Minterms: $\Sigma m({cells.map((c, i) => c === 1 ? i : null).filter((v) => v !== null).join(', ') || 'none'})$</span>
        <span className="font-bold text-accent-brand">Gray code adjacency: single bit flips</span>
      </div>
    </div>
  )
}

/* =========================================================================
   9. BINARY SEARCH TREE & HEAP VISUALIZER (PDS / ALGO)
   ========================================================================= */
export function TreeVisualizer({
  initialKeys = [50, 30, 70, 20, 40, 60, 80],
}: {
  initialKeys?: number[]
}) {
  const [keys] = useState<number[]>(initialKeys)
  const [step, setStep] = useState(keys.length)
  const [isPlaying, setIsPlaying] = useState(false)

  const activeKeys = keys.slice(0, step)
  const sortedInorder = useMemo(() => [...activeKeys].sort((a, b) => a - b), [activeKeys])

  useEffect(() => {
    if (!isPlaying) return
    if (step >= keys.length) {
      setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setStep((s) => s + 1)
    }, 800)
    return () => clearTimeout(timer)
  }, [isPlaying, step, keys.length])

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-emerald-400" />
          <h4 className="text-[13px] font-bold text-text-primary">
            Binary Search Tree (BST) & Heap Balance Animator
          </h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          Inorder = Left → Root → Right (Strictly Ascending)
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="btn-primary !px-3 !py-1.5 !text-[12px] flex items-center gap-1 cursor-pointer"
          >
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {isPlaying ? 'Pause' : 'Play Insertion'}
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(keys.length, s + 1))}
            disabled={step >= keys.length}
            className="btn-secondary !px-3 !py-1.5 !text-[12px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <ChevronRight className="size-3.5" /> Next Node
          </button>
          <button
            type="button"
            onClick={() => {
              setStep(1)
              setIsPlaying(false)
            }}
            className="btn-secondary !px-2.5 !py-1.5 !text-[12px] flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
        </div>

        <span className="text-[12px] font-mono text-emerald-400 font-bold">
          Nodes Active: {step} / {keys.length}
        </span>
      </div>

      {/* SVG Canvas for Tree */}
      <div className="relative mt-3 flex justify-center rounded-xl bg-slate-950/80 p-3 border border-border/60">
        <svg viewBox="0 0 460 210" className="h-48 w-full max-w-[440px] select-none">
          {/* Branches */}
          {step >= 2 && <line x1="230" y1="35" x2="130" y2="95" stroke="#38bdf8" strokeWidth="2" />}
          {step >= 3 && <line x1="230" y1="35" x2="330" y2="95" stroke="#38bdf8" strokeWidth="2" />}
          {step >= 4 && <line x1="130" y1="95" x2="80" y2="155" stroke="#64748b" strokeWidth="2" />}
          {step >= 5 && <line x1="130" y1="95" x2="180" y2="155" stroke="#64748b" strokeWidth="2" />}
          {step >= 6 && <line x1="330" y1="95" x2="280" y2="155" stroke="#64748b" strokeWidth="2" />}
          {step >= 7 && <line x1="330" y1="95" x2="380" y2="155" stroke="#64748b" strokeWidth="2" />}

          {/* Root */}
          {step >= 1 && (
            <g className="animate-in zoom-in duration-200">
              <circle cx="230" cy="35" r="18" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
              <text x="230" y="40" textAnchor="middle" fill="#fef08a" fontSize="13" fontWeight="bold">
                {keys[0]}
              </text>
            </g>
          )}

          {/* Level 1 Left & Right */}
          {step >= 2 && (
            <g className="animate-in zoom-in duration-200">
              <circle cx="130" cy="95" r="17" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
              <text x="130" y="100" textAnchor="middle" fill="#bae6fd" fontSize="12" fontWeight="bold">
                {keys[1]}
              </text>
            </g>
          )}
          {step >= 3 && (
            <g className="animate-in zoom-in duration-200">
              <circle cx="330" cy="95" r="17" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
              <text x="330" y="100" textAnchor="middle" fill="#bae6fd" fontSize="12" fontWeight="bold">
                {keys[2]}
              </text>
            </g>
          )}

          {/* Level 2 Leaves */}
          {step >= 4 && (
            <g className="animate-in zoom-in duration-200">
              <circle cx="80" cy="155" r="15" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
              <text x="80" y="159" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="bold">
                {keys[3]}
              </text>
            </g>
          )}
          {step >= 5 && (
            <g className="animate-in zoom-in duration-200">
              <circle cx="180" cy="155" r="15" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
              <text x="180" y="159" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="bold">
                {keys[4]}
              </text>
            </g>
          )}
          {step >= 6 && (
            <g className="animate-in zoom-in duration-200">
              <circle cx="280" cy="155" r="15" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
              <text x="280" y="159" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="bold">
                {keys[5]}
              </text>
            </g>
          )}
          {step >= 7 && (
            <g className="animate-in zoom-in duration-200">
              <circle cx="380" cy="155" r="15" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
              <text x="380" y="159" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="bold">
                {keys[6]}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-[12px] font-mono border-t border-border/60 pt-2">
        <span className="text-text-muted">
          BST Inorder Traversal:{' '}
          <span className="font-bold text-emerald-400">{sortedInorder.join(' → ')}</span>
        </span>
        <span className="text-[11px] text-text-muted">Min Key: {sortedInorder[0]} · Max Key: {sortedInorder[sortedInorder.length - 1]}</span>
      </div>
    </div>
  )
}

/* =========================================================================
   10. STACK LIFO & EXPRESSION VISUALIZER (PDS)
   ========================================================================= */
export function StackVisualizer() {
  const [tokens] = useState(['A', 'B', '+', 'C', '*', 'D', '-'])
  const [idx, setIdx] = useState(0)
  const [stack, setStack] = useState<string[]>([])
  const [output, setOutput] = useState<string[]>([])

  const stepForward = () => {
    if (idx >= tokens.length) return
    const tok = tokens[idx]
    if (['+', '-', '*', '/'].includes(tok)) {
      setStack((s) => [...s, tok])
    } else {
      setOutput((o) => [...o, tok])
    }
    setIdx((i) => i + 1)
  }

  const reset = () => {
    setIdx(0)
    setStack([])
    setOutput([])
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-sky-400" />
          <h4 className="text-[13px] font-bold text-text-primary">
            LIFO Stack & Expression Evaluator
          </h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          Top of Stack (TOS) · Infix to Postfix Conversion
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stepForward}
            disabled={idx >= tokens.length}
            className="btn-primary !px-3 !py-1.5 !text-[12px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <ChevronRight className="size-3.5" /> Next Token ({tokens[idx] || 'End'})
          </button>
          <button
            type="button"
            onClick={reset}
            className="btn-secondary !px-2.5 !py-1.5 !text-[12px] flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
        </div>

        <div className="text-[12px] font-mono text-text-muted">
          Token Stream: {tokens.map((t, i) => (
            <span key={i} className={cn('px-1 py-0.5 rounded', i === idx ? 'bg-sky-500/20 text-sky-400 font-bold' : '')}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Visual Stack Chamber */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-bg-surface p-3 flex flex-col items-center">
          <span className="text-[11px] font-mono text-text-muted mb-2">Stack Chamber (LIFO)</span>
          <div className="w-24 h-36 border-b-4 border-l-4 border-r-4 border-sky-400 rounded-b-lg flex flex-col-reverse p-1 gap-1 bg-slate-950/60">
            {stack.map((item, i) => (
              <div
                key={i}
                className="w-full py-1 text-center font-mono font-bold text-[13px] rounded bg-sky-500 text-white shadow-xs animate-in slide-in-from-top-2"
              >
                {item}
              </div>
            ))}
            {stack.length === 0 && (
              <span className="m-auto text-[11px] font-mono text-slate-500">Empty</span>
            )}
          </div>
          <span className="text-[10px] font-mono text-sky-400 mt-1">TOS (Top of Stack)</span>
        </div>

        <div className="rounded-xl border border-border bg-bg-surface p-3 flex flex-col">
          <span className="text-[11px] font-mono text-text-muted mb-2">Postfix Output Queue</span>
          <div className="flex-1 flex flex-wrap items-start content-start gap-1.5 p-2 rounded-lg bg-slate-950/60 font-mono text-[13px]">
            {output.map((tok, i) => (
              <span key={i} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                {tok}
              </span>
            ))}
            {output.length === 0 && <span className="text-slate-500 text-[11px]">No output yet</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   11. LOGIC GATES & MULTIPLEXER SIMULATOR (DL)
   ========================================================================= */
export function CircuitVisualizer() {
  const [a, setA] = useState<0 | 1>(1)
  const [b, setB] = useState<0 | 1>(0)
  const [sel, setSel] = useState<0 | 1>(0)

  // 2-to-1 Multiplexer equation: F = (!sel & a) | (sel & b)
  const output = sel === 0 ? a : b

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-amber-400" />
          <h4 className="text-[13px] font-bold text-text-primary">
            2:1 Multiplexer & Gate Logic Simulator
          </h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          {'Equation: $F = \\overline{S_0} \\cdot I_0 + S_0 \\cdot I_1$'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Toggle Inputs */}
        <div className="rounded-xl border border-border bg-bg-surface p-3 flex flex-col gap-2">
          <span className="text-[11px] font-mono text-text-muted">Interactive Input Pins:</span>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-sky-400">Input I₀ (a):</span>
            <button
              type="button"
              onClick={() => setA((v) => (v === 1 ? 0 : 1))}
              className={cn(
                'size-8 rounded-lg font-mono font-bold text-[13px] transition-all cursor-pointer',
                a === 1 ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-800 text-slate-400',
              )}
            >
              {a}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-indigo-400">Input I₁ (b):</span>
            <button
              type="button"
              onClick={() => setB((v) => (v === 1 ? 0 : 1))}
              className={cn(
                'size-8 rounded-lg font-mono font-bold text-[13px] transition-all cursor-pointer',
                b === 1 ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-800 text-slate-400',
              )}
            >
              {b}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-2">
            <span className="text-[12px] font-bold text-amber-400">Select S₀:</span>
            <button
              type="button"
              onClick={() => setSel((v) => (v === 1 ? 0 : 1))}
              className={cn(
                'size-8 rounded-lg font-mono font-bold text-[13px] transition-all cursor-pointer',
                sel === 1 ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-800 text-slate-400',
              )}
            >
              {sel}
            </button>
          </div>
        </div>

        {/* Live MUX Schematic Box */}
        <div className="sm:col-span-2 rounded-xl border border-border bg-slate-950/80 p-4 flex flex-col items-center justify-center relative">
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-4 font-mono text-[12px]">
              <span className={cn('font-bold', a === 1 ? 'text-sky-400' : 'text-slate-500')}>
                I₀: {a} ────
              </span>
              <span className={cn('font-bold', b === 1 ? 'text-indigo-400' : 'text-slate-500')}>
                I₁: {b} ────
              </span>
            </div>

            <div className="w-24 h-24 rounded-xl border-2 border-amber-400/80 bg-amber-500/10 flex flex-col items-center justify-center relative shadow-lg">
              <span className="text-[12px] font-black text-amber-300 font-mono">2:1 MUX</span>
              <span className="text-[10px] text-text-muted mt-1">S₀ = {sel}</span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-amber-400 font-bold">────</span>
              <div
                className={cn(
                  'px-3 py-1.5 rounded-lg font-mono font-black text-[15px] border',
                  output === 1
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-500 border-slate-800',
                )}
              >
                Output F = {output}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] font-mono text-emerald-400">
            Path Activated:{' '}
            {sel === 0 ? `I₀ (${a}) routed to F` : `I₁ (${b}) routed to F`}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   12. SLIDING WINDOW PROTOCOL VISUALIZER (COMPUTER NETWORKS)
   ========================================================================= */
export function SlidingWindowVisualizer() {
  const [windowSize, setWindowSize] = useState(4)
  const [sendBase, setSendBase] = useState(0)
  const [nextSeq, setNextSeq] = useState(0)
  const [inFlight, setInFlight] = useState<number[]>([])
  const [acked, setAcked] = useState<number[]>([])
  const [lost, setLost] = useState<number | null>(null)

  const totalPackets = 8

  const sendNext = () => {
    if (nextSeq < sendBase + windowSize && nextSeq < totalPackets) {
      setInFlight((prev) => [...prev, nextSeq])
      setNextSeq((n) => n + 1)
    }
  }

  const receiveAck = () => {
    if (inFlight.length === 0) return
    const pkt = inFlight[0]
    setInFlight((prev) => prev.slice(1))
    setAcked((prev) => [...prev, pkt])
    if (pkt === sendBase) {
      setSendBase((b) => b + 1)
    }
  }

  const dropPacket = () => {
    if (inFlight.length === 0) return
    const pkt = inFlight[0]
    setInFlight((prev) => prev.slice(1))
    setLost(pkt)
    // Timeout retransmit simulation
    setTimeout(() => {
      setLost(null)
      setNextSeq(sendBase)
      setInFlight([])
    }, 1200)
  }

  const reset = () => {
    setSendBase(0)
    setNextSeq(0)
    setInFlight([])
    setAcked([])
    setLost(null)
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-sky-400" />
          <h4 className="text-[13px] font-bold text-text-primary">Sliding Window Protocol Simulator</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">Window Size W = {windowSize} · Go-Back-N Protocol</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold text-text-secondary">Window Size:</label>
          <select
            value={windowSize}
            onChange={(e) => {
              setWindowSize(Number(e.target.value))
              reset()
            }}
            className="rounded-lg border border-border bg-bg-surface px-2 py-1 font-mono text-[12px] text-text-primary"
          >
            <option value={2}>W = 2</option>
            <option value={3}>W = 3</option>
            <option value={4}>W = 4</option>
            <option value={5}>W = 5</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={sendNext}
            disabled={nextSeq >= sendBase + windowSize || nextSeq >= totalPackets}
            className="btn-primary !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40"
          >
            Transmit Packet ({nextSeq})
          </button>
          <button
            type="button"
            onClick={receiveAck}
            disabled={inFlight.length === 0}
            className="btn-secondary !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40 text-emerald-400 border-emerald-500/30"
          >
            ACK Return
          </button>
          <button
            type="button"
            onClick={dropPacket}
            disabled={inFlight.length === 0}
            className="btn-secondary !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40 text-rose-400 border-rose-500/30"
          >
            Simulate Loss
          </button>
          <button
            type="button"
            onClick={reset}
            className="btn-secondary !py-1 !px-2 !text-[12px] cursor-pointer"
          >
            <RotateCcw className="size-3" />
          </button>
        </div>
      </div>

      {/* Sender Sequence Strip */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-1.5">
          <span>Sender Buffer Frames (Base: {sendBase}, NextSeq: {nextSeq})</span>
          <span className="text-emerald-400">ACKed: {acked.length}/{totalPackets}</span>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: totalPackets }).map((_, i) => {
            const isAcked = acked.includes(i)
            const isInFlight = inFlight.includes(i)
            const isInWindow = i >= sendBase && i < sendBase + windowSize
            const isLostPkt = lost === i

            return (
              <div
                key={i}
                className={cn(
                  'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all',
                  isAcked && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
                  isInFlight && 'border-sky-400 bg-sky-500/20 text-sky-200 animate-pulse',
                  isLostPkt && 'border-rose-500 bg-rose-500/20 text-rose-300',
                  !isAcked && !isInFlight && !isLostPkt && isInWindow && 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300',
                  !isAcked && !isInFlight && !isLostPkt && !isInWindow && 'border-border/60 bg-bg-surface text-text-muted opacity-50',
                )}
              >
                <span className="font-mono text-[14px] font-black">{i}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  {isAcked ? 'ACK' : isInFlight ? 'WIRE' : isLostPkt ? 'DROP' : isInWindow ? 'WIN' : 'WAIT'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   13. SUBNET CALCULATOR VISUALIZER (COMPUTER NETWORKS)
   ========================================================================= */
export function SubnetVisualizer() {
  const [prefix, setPrefix] = useState(24)

  const totalIps = Math.pow(2, 32 - prefix)
  const usableHosts = Math.max(0, totalIps - 2)

  // Subnet mask string
  const maskOctets = useMemo(() => {
    let bits = ''.padStart(prefix, '1').padEnd(32, '0')
    const octets = []
    for (let i = 0; i < 4; i++) {
      octets.push(parseInt(bits.slice(i * 8, (i + 1) * 8), 2))
    }
    return octets.join('.')
  }, [prefix])

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-emerald-400" />
          <h4 className="text-[13px] font-bold text-text-primary">IPv4 Subnet & Host Bit Slicer</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">CIDR /32 Partition Explorer</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold text-text-secondary">CIDR Prefix:</label>
          <input
            type="range"
            min={16}
            max={30}
            value={prefix}
            onChange={(e) => setPrefix(Number(e.target.value))}
            className="w-36 accent-accent-brand cursor-pointer"
          />
          <span className="font-mono text-[13px] font-bold text-accent-brand">/{prefix}</span>
        </div>
      </div>

      {/* Bit Split Strip */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-1.5">
          <span>32-Bit Division (Network vs Host)</span>
          <span>Mask: {maskOctets}</span>
        </div>
        <div className="flex h-7 rounded-xl overflow-hidden border border-border shadow-xs">
          <div
            style={{ width: `${(prefix / 32) * 100}%` }}
            className="bg-sky-500/30 border-r border-sky-400 flex items-center justify-center text-[11px] font-mono font-bold text-sky-300"
          >
            Network Bits ({prefix})
          </div>
          <div
            style={{ width: `${((32 - prefix) / 32) * 100}%` }}
            className="bg-emerald-500/30 flex items-center justify-center text-[11px] font-mono font-bold text-emerald-300"
          >
            Host Bits ({32 - prefix})
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
        <div className="rounded-xl border border-border/70 bg-bg-surface p-2">
          <span className="text-[10px] text-text-muted">Total Addresses</span>
          <p className="text-[14px] font-bold text-sky-400">{totalIps.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-bg-surface p-2">
          <span className="text-[10px] text-text-muted">Usable Hosts</span>
          <p className="text-[14px] font-bold text-emerald-400">{usableHosts.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-bg-surface p-2">
          <span className="text-[10px] text-text-muted">Network ID</span>
          <p className="text-[14px] font-bold text-text-primary">192.168.1.0</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-bg-surface p-2">
          <span className="text-[10px] text-text-muted">Broadcast ID</span>
          <p className="text-[14px] font-bold text-amber-400">192.168.1.{totalIps - 1}</p>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   14. RELATIONAL ALGEBRA VISUALIZER (DATABASES)
   ========================================================================= */
export function RelationalAlgebraVisualizer() {
  const [op, setOp] = useState<'select' | 'project' | 'all'>('select')

  const rows = [
    { id: 101, name: 'Alice', dept: 'CS', marks: 85 },
    { id: 102, name: 'Bob', dept: 'EE', marks: 72 },
    { id: 103, name: 'Carol', dept: 'CS', marks: 91 },
    { id: 104, name: 'David', dept: 'ME', marks: 64 },
  ]

  const matches = (r: typeof rows[0]) => {
    if (op === 'select') return r.marks >= 80
    return true
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <HardDrive className="size-4 text-amber-400" />
          <h4 className="text-[13px] font-bold text-text-primary">Relational Algebra Operator Engine</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">Database Query Transformation</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-[12px] font-semibold text-text-secondary">Expression:</label>
        <button
          type="button"
          onClick={() => setOp('select')}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[11px] font-mono border transition-all cursor-pointer',
            op === 'select' ? 'border-accent-brand bg-accent-brand/20 text-white font-bold' : 'border-border bg-bg-surface text-text-muted',
          )}
        >
          σ(Marks ≥ 80)(Student)
        </button>
        <button
          type="button"
          onClick={() => setOp('project')}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[11px] font-mono border transition-all cursor-pointer',
            op === 'project' ? 'border-accent-brand bg-accent-brand/20 text-white font-bold' : 'border-border bg-bg-surface text-text-muted',
          )}
        >
          π(Name, Dept)(Student)
        </button>
        <button
          type="button"
          onClick={() => setOp('all')}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[11px] font-mono border transition-all cursor-pointer',
            op === 'all' ? 'border-accent-brand bg-accent-brand/20 text-white font-bold' : 'border-border bg-bg-surface text-text-muted',
          )}
        >
          Raw Relation
        </button>
      </div>

      {/* Relation Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-bg-surface">
        <table className="w-full text-left font-mono text-[12px]">
          <thead className="bg-bg-surface-2/70 text-text-secondary border-b border-border">
            <tr>
              {op !== 'project' && <th className="p-2">RollNo</th>}
              <th className="p-2">Name</th>
              <th className="p-2">Dept</th>
              {op !== 'project' && <th className="p-2">Marks</th>}
              <th className="p-2 text-right">Predicate Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pass = matches(r)
              return (
                <tr
                  key={r.id}
                  className={cn(
                    'border-b border-border/50 transition-colors',
                    pass ? 'bg-emerald-500/10 text-text-primary' : 'opacity-40 text-text-muted',
                  )}
                >
                  {op !== 'project' && <td className="p-2 font-bold">{r.id}</td>}
                  <td className="p-2 text-accent-brand font-semibold">{r.name}</td>
                  <td className="p-2">{r.dept}</td>
                  {op !== 'project' && <td className="p-2">{r.marks}</td>}
                  <td className="p-2 text-right">
                    {pass ? (
                      <span className="text-emerald-400 font-bold">✓ Included in Output</span>
                    ) : (
                      <span className="text-rose-400">✗ Filtered Out</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* =========================================================================
   15. RECURSION CALL STACK VISUALIZER (PDS / PROGRAMMING)
   ========================================================================= */
export function RecursionVisualizer() {
  const [step, setStep] = useState(0)

  const states = [
    { frames: ['fact(4)'], action: 'Invoke fact(4): Calls fact(3)', val: null },
    { frames: ['fact(4)', 'fact(3)'], action: 'Push fact(3): Calls fact(2)', val: null },
    { frames: ['fact(4)', 'fact(3)', 'fact(2)'], action: 'Push fact(2): Calls fact(1)', val: null },
    { frames: ['fact(4)', 'fact(3)', 'fact(2)', 'fact(1)'], action: 'Push fact(1): Base Case (n=1) Reached!', val: 1 },
    { frames: ['fact(4)', 'fact(3)', 'fact(2)'], action: 'Unwind fact(1): Return 1 → fact(2) returns 2 * 1 = 2', val: 2 },
    { frames: ['fact(4)', 'fact(3)'], action: 'Unwind fact(2): Return 2 → fact(3) returns 3 * 2 = 6', val: 6 },
    { frames: ['fact(4)'], action: 'Unwind fact(3): Return 6 → fact(4) returns 4 * 6 = 24', val: 24 },
    { frames: [], action: 'Execution Complete: Final Answer = 24', val: 24 },
  ]

  const curr = states[step]

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-purple-400" />
          <h4 className="text-[13px] font-bold text-text-primary">Recursive Call Stack Tracer</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">fact(n) = n * fact(n-1)</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(s + 1, states.length - 1))}
          disabled={step === states.length - 1}
          className="btn-primary !py-1 !px-2.5 !text-[12px] cursor-pointer disabled:opacity-40"
        >
          Next Step ({step + 1}/{states.length})
        </button>
        <button
          type="button"
          onClick={() => setStep(0)}
          className="btn-secondary !py-1 !px-2 !text-[12px] cursor-pointer"
        >
          <RotateCcw className="size-3" /> Reset
        </button>
        <span className="font-mono text-[12px] text-accent-brand ml-2">{curr.action}</span>
      </div>

      {/* Call Stack Chamber */}
      <div className="mt-3 flex flex-col-reverse gap-1.5 p-3 rounded-xl border border-border bg-bg-surface min-h-[140px] justify-start">
        {curr.frames.length === 0 ? (
          <div className="text-center py-6 text-[12px] font-mono text-emerald-400 font-bold">
            ✓ Stack Empty · Final Result Returned: {curr.val}
          </div>
        ) : (
          curr.frames.map((f, i) => (
            <div
              key={f}
              className={cn(
                'rounded-lg border px-3 py-1.5 font-mono text-[12px] flex items-center justify-between transition-all',
                i === curr.frames.length - 1
                  ? 'border-purple-500 bg-purple-500/20 text-purple-200 font-bold shadow-xs'
                  : 'border-border/70 bg-bg-surface-2 text-text-muted',
              )}
            >
              <span>{f}</span>
              <span className="text-[10px] text-text-muted">{i === curr.frames.length - 1 ? 'ACTIVE TOP' : 'SUSPENDED'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   16. MATRIX & EIGENVALUE VISUALIZER (LINEAR ALGEBRA)
   ========================================================================= */
export function MatrixVisualizer() {
  const [a, setA] = useState(2)
  const [b, setB] = useState(1)
  const [c, setC] = useState(1)
  const [d, setD] = useState(2)

  const trace = a + d
  const det = a * d - b * c

  // Characteristic equation: λ² - trace*λ + det = 0
  const disc = trace * trace - 4 * det
  const l1 = disc >= 0 ? ((trace + Math.sqrt(disc)) / 2).toFixed(2) : `${(trace/2).toFixed(1)} + ${(Math.sqrt(-disc)/2).toFixed(1)}i`
  const l2 = disc >= 0 ? ((trace - Math.sqrt(disc)) / 2).toFixed(2) : `${(trace/2).toFixed(1)} - ${(Math.sqrt(-disc)/2).toFixed(1)}i`

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Grid className="size-4 text-emerald-400" />
          <h4 className="text-[13px] font-bold text-text-primary">2×2 Matrix Invariant & Eigenvalue Engine</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">det(A - λI) = 0</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-6">
        {/* Matrix Bracket Input */}
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[28px] text-text-muted">[</span>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              value={a}
              onChange={(e) => setA(Number(e.target.value))}
              className="w-12 rounded border border-border bg-bg-surface p-1 text-center text-[13px] font-bold text-sky-400"
            />
            <input
              type="number"
              value={b}
              onChange={(e) => setB(Number(e.target.value))}
              className="w-12 rounded border border-border bg-bg-surface p-1 text-center text-[13px] font-bold text-text-primary"
            />
            <input
              type="number"
              value={c}
              onChange={(e) => setC(Number(e.target.value))}
              className="w-12 rounded border border-border bg-bg-surface p-1 text-center text-[13px] font-bold text-text-primary"
            />
            <input
              type="number"
              value={d}
              onChange={(e) => setD(Number(e.target.value))}
              className="w-12 rounded border border-border bg-bg-surface p-1 text-center text-[13px] font-bold text-sky-400"
            />
          </div>
          <span className="text-[28px] text-text-muted">]</span>
        </div>

        {/* Invariant Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center flex-1">
          <div className="rounded-xl border border-border bg-bg-surface p-2">
            <span className="text-[10px] text-text-muted">Trace (Σλ)</span>
            <p className="text-[14px] font-bold text-sky-400">{trace}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-surface p-2">
            <span className="text-[10px] text-text-muted">Determinant (Πλ)</span>
            <p className="text-[14px] font-bold text-emerald-400">{det}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-surface p-2">
            <span className="text-[10px] text-text-muted">Eigenvalue λ₁</span>
            <p className="text-[14px] font-bold text-accent-brand">{l1}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-surface p-2">
            <span className="text-[10px] text-text-muted">Eigenvalue λ₂</span>
            <p className="text-[14px] font-bold text-amber-400">{l2}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   17. BAYES' PROBABILITY TREE VISUALIZER (PROBABILITY & STATS)
   ========================================================================= */
export function ProbabilityTreeVisualizer() {
  const [pA, setPA] = useState(0.6)
  const [pBgA, setPBgA] = useState(0.8)
  const [pBgAbar, setPBgAbar] = useState(0.3)

  const pAbar = 1 - pA
  const pAandB = pA * pBgA
  const pAbarandB = pAbar * pBgAbar
  const pB = pAandB + pAbarandB
  const pAgB = pB > 0 ? (pAandB / pB).toFixed(3) : '0'

  return (
    <div className="rounded-2xl border border-border bg-bg-surface-2/40 p-4 font-sans text-text-primary shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" />
          <h4 className="text-[13px] font-bold text-text-primary">Bayes' Theorem 2-Stage Probability Tree</h4>
        </div>
        <span className="text-[11px] font-mono text-text-muted">P(A|B) = P(A ∩ B) / P(B)</span>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-text-muted">Prior P(A) = {pA.toFixed(2)}</label>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={pA}
            onChange={(e) => setPA(Number(e.target.value))}
            className="w-full accent-accent-brand cursor-pointer"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-muted">Branch P(B|A) = {pBgA.toFixed(2)}</label>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={pBgA}
            onChange={(e) => setPBgA(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-muted">Branch P(B|Ā) = {pBgAbar.toFixed(2)}</label>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={pBgAbar}
            onChange={(e) => setPBgAbar(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Bayes Outcome Box */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
        <div className="rounded-xl border border-border bg-bg-surface p-2">
          <span className="text-[10px] text-text-muted">Joint P(A ∩ B)</span>
          <p className="text-[14px] font-bold text-sky-400">{pAandB.toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-surface p-2">
          <span className="text-[10px] text-text-muted">Joint P(Ā ∩ B)</span>
          <p className="text-[14px] font-bold text-amber-400">{pAbarandB.toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-surface p-2">
          <span className="text-[10px] text-text-muted">Total P(B)</span>
          <p className="text-[14px] font-bold text-text-primary">{pB.toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2">
          <span className="text-[10px] text-emerald-400 font-bold">Posterior P(A|B)</span>
          <p className="text-[15px] font-black text-emerald-300">{pAgB}</p>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   UNIVERSAL GATE VISUALIZER RESOLVER
   Automatically detects and mounts interactive visual animated solutions!
   ========================================================================= */
export function GateVisualizer({
  q,
  subject,
  topic,
}: {
  q?: GateQuestion
  subject: string
  topic: string
}) {
  const subj = (subject || '').toLowerCase()
  const top = (topic || '').toLowerCase()
  const txt = (q?.text || '').toLowerCase()
  const tags = (q?.tags || []).map((t) => t.toLowerCase()).join(' ')

  const detectedVisualizer = useMemo(() => {
    // 1. Automata / TOC
    if (subj === 'toc' || top.includes('dfa') || top.includes('regular') || txt.includes('dfa') || txt.includes('automata')) {
      return 'dfa'
    }
    // 2. CPU Pipeline
    if ((subj === 'coa' || subj === 'arch') && (top.includes('pipeline') || txt.includes('pipeline') || txt.includes('hazard') || txt.includes('stall'))) {
      return 'pipeline'
    }
    // 3. Cache Memory
    if ((subj === 'coa' || subj === 'arch') && (top.includes('cache') || txt.includes('cache') || txt.includes('associative') || txt.includes('tag'))) {
      return 'cache'
    }
    // 4. Sorting & Partitioning
    if (subj === 'algo' && (top.includes('sort') || txt.includes('quicksort') || txt.includes('partition') || txt.includes('mergesort') || tags.includes('sort'))) {
      return 'sort'
    }
    // 5. Binary Trees & BST & Heaps
    if (top.includes('tree') || top.includes('bst') || top.includes('heap') || txt.includes('binary tree') || txt.includes('binary search tree') || txt.includes('heap')) {
      return 'tree'
    }
    // 6. Stack & Expression Evaluation
    if (top.includes('stack') || txt.includes('stack') || txt.includes('postfix') || txt.includes('infix')) {
      return 'stack'
    }
    // 7. Graph MST & Shortest Path
    if ((subj === 'algo' || subj === 'dm') && (top.includes('graph') || txt.includes('spanning tree') || txt.includes('mst') || txt.includes('kruskal') || txt.includes('dijkstra'))) {
      return 'graph'
    }
    // 8. Page Replacement / Virtual Memory
    if (subj === 'os' && (top.includes('page') || txt.includes('lru') || txt.includes('fifo') || txt.includes('page replacement') || txt.includes('page fault'))) {
      return 'page'
    }
    // 9. CPU Scheduling
    if (subj === 'os' && (top.includes('sched') || txt.includes('gantt') || txt.includes('turnaround') || txt.includes('waiting time') || txt.includes('round robin'))) {
      return 'cpu'
    }
    // 10. Digital Logic / K-Map
    if (subj === 'dl' && (top.includes('k-map') || txt.includes('k-map') || txt.includes('karnaugh') || txt.includes('minterm'))) {
      return 'kmap'
    }
    // 11. Multiplexer & Logic Gates
    if (subj === 'dl' || top.includes('multiplexer') || top.includes('mux') || txt.includes('multiplexer')) {
      return 'circuit'
    }
    // 12. Networking - Subnet
    if (subj === 'cn' && (top.includes('ip') || top.includes('subnet') || top.includes('network') || txt.includes('subnet') || txt.includes('cidr') || txt.includes('mask') || txt.includes('ip address'))) {
      return 'subnet'
    }
    // 13. Networking - Sliding Window / TCP
    if (subj === 'cn' && (top.includes('window') || top.includes('transport') || txt.includes('window') || txt.includes('sliding') || txt.includes('tcp') || txt.includes('handshake') || txt.includes('flow control') || txt.includes('congestion'))) {
      return 'sliding'
    }
    // 14. Database - Relational Algebra / SQL
    if ((subj === 'db' || subj === 'dbw') && (top.includes('algebra') || top.includes('sql') || top.includes('query') || top.includes('relat') || txt.includes('relational') || txt.includes('select') || txt.includes('join') || txt.includes('sql') || txt.includes('table'))) {
      return 'relational'
    }
    // 15. Programming - Recursion & Call Stack
    if ((subj === 'pds' || subj === 'pdsa' || subj === 'algo') && (txt.includes('recurs') || txt.includes('call stack') || top.includes('recurs') || txt.includes('fibonacci') || txt.includes('factorial') || txt.includes('function'))) {
      return 'recursion'
    }
    // 16. Linear Algebra - Matrix & Eigenvalues
    if ((subj === 'la' || subj === 'math') && (top.includes('matri') || top.includes('eigen') || top.includes('determinant') || txt.includes('matrix') || txt.includes('matrices') || txt.includes('eigenvalue') || txt.includes('determinant'))) {
      return 'matrix'
    }
    // 17. Probability & Statistics - Bayes' Theorem
    if ((subj === 'prob' || subj === 'ga') && (top.includes('prob') || top.includes('bayes') || txt.includes('bayes') || txt.includes('probability') || txt.includes('conditional probability') || txt.includes('events'))) {
      return 'prob'
    }

    return null
  }, [subj, top, txt, tags])

  const [activeTab, setActiveTab] = useState<string | null>(detectedVisualizer)

  useEffect(() => {
    setActiveTab(detectedVisualizer)
  }, [detectedVisualizer])

  if (!activeTab && !detectedVisualizer) return null

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-accent-brand/40 bg-bg-surface-2/60 shadow-lg">
      {/* Visualizer Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-gradient-to-r from-accent-brand/15 via-transparent to-transparent px-4 py-2">
        <div className="flex items-center gap-1.5 text-accent-brand">
          <Zap className="size-4 animate-bounce" />
          <span className="text-[12px] font-black uppercase tracking-wider">
            Interactive Visual Animated Solution
          </span>
        </div>

        {/* Quick Switcher */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          {detectedVisualizer === 'dfa' && <span className="text-text-muted">Automata State Runner</span>}
          {detectedVisualizer === 'pipeline' && <span className="text-text-muted">RISC Pipeline Execution</span>}
          {detectedVisualizer === 'cache' && <span className="text-text-muted">Cache Slicer</span>}
          {detectedVisualizer === 'sort' && <span className="text-text-muted">Lomuto Partition Tracer</span>}
          {detectedVisualizer === 'tree' && <span className="text-text-muted">BST / Heap Balancer</span>}
          {detectedVisualizer === 'stack' && <span className="text-text-muted">Stack Evaluator</span>}
          {detectedVisualizer === 'circuit' && <span className="text-text-muted">Logic Gate Simulator</span>}
          {detectedVisualizer === 'graph' && <span className="text-text-muted">Kruskal MST Step Engine</span>}
          {detectedVisualizer === 'page' && <span className="text-text-muted">Page Replacement Simulator</span>}
          {detectedVisualizer === 'cpu' && <span className="text-text-muted">CPU Scheduling Timeline</span>}
          {detectedVisualizer === 'kmap' && <span className="text-text-muted">4-Var K-Map Minimizer</span>}
          {detectedVisualizer === 'sliding' && <span className="text-text-muted">Sliding Window Protocol Simulator</span>}
          {detectedVisualizer === 'subnet' && <span className="text-text-muted">IPv4 Subnet Calculator</span>}
          {detectedVisualizer === 'relational' && <span className="text-text-muted">Relational Algebra Engine</span>}
          {detectedVisualizer === 'recursion' && <span className="text-text-muted">Recursive Call Stack Tracer</span>}
          {detectedVisualizer === 'matrix' && <span className="text-text-muted">2×2 Matrix & Eigenvalue Visualizer</span>}
          {detectedVisualizer === 'prob' && <span className="text-text-muted">Bayes' Probability Tree</span>}
        </div>
      </div>

      <div className="p-3">
        {activeTab === 'dfa' && <DfaVisualizer />}
        {activeTab === 'pipeline' && <PipelineVisualizer />}
        {activeTab === 'cache' && <CacheVisualizer />}
        {activeTab === 'sort' && <SortingVisualizer />}
        {activeTab === 'tree' && <TreeVisualizer />}
        {activeTab === 'stack' && <StackVisualizer />}
        {activeTab === 'circuit' && <CircuitVisualizer />}
        {activeTab === 'graph' && <GraphVisualizer />}
        {activeTab === 'page' && <PageReplacementVisualizer />}
        {activeTab === 'cpu' && <CpuSchedulingVisualizer />}
        {activeTab === 'kmap' && <KMapVisualizer />}
        {activeTab === 'sliding' && <SlidingWindowVisualizer />}
        {activeTab === 'subnet' && <SubnetVisualizer />}
        {activeTab === 'relational' && <RelationalAlgebraVisualizer />}
        {activeTab === 'recursion' && <RecursionVisualizer />}
        {activeTab === 'matrix' && <MatrixVisualizer />}
        {activeTab === 'prob' && <ProbabilityTreeVisualizer />}
      </div>
    </div>
  )
}

