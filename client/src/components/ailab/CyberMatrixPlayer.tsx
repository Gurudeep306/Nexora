import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Volume2, VolumeX, Sparkles, Terminal } from 'lucide-react'
import { Button } from '@/components/ui'

export interface KineticCell {
  id: string
  v: any
  addr?: string
  role?: string
  elevation?: number
}

export interface VisualizationFrame {
  step: number
  explanation: string
  cells: KineticCell[]
  pointers: Record<string, number>
  roles: Record<string, string>
  soundEffect?: string
  codeLine?: number
}

export interface VisualizationSpec {
  title: string
  algorithm: string
  data_structure: string
  time_complexity: string
  space_complexity: string
  source_code?: string
  pseudo_lines?: string[]
  total_frames: number
  frames: VisualizationFrame[]
}

interface Props {
  visualization: VisualizationSpec
}

export function CyberMatrixPlayer({ visualization }: Props) {
  const { title, algorithm, time_complexity, space_complexity, pseudo_lines, frames } = visualization
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const activeFrame = frames[currentStep] || frames[0]
  const total = frames.length

  // Web Audio Synthesizer
  const playSound = (type?: string) => {
    if (!audioEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') void ctx.resume()

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'swap') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(440, now)
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12)
        gain.gain.setValueAtTime(0.12, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
        osc.start(now)
        osc.stop(now + 0.12)
      } else if (type === 'compare') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(520, now)
        gain.gain.setValueAtTime(0.1, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        osc.start(now)
        osc.stop(now + 0.08)
      } else if (type === 'done') {
        // Major chime
        ;[523.25, 659.25, 783.99].forEach((freq, idx) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.type = 'sine'
          o.frequency.value = freq
          g.gain.setValueAtTime(0.08, now + idx * 0.06)
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25)
          o.connect(g)
          g.connect(ctx.destination)
          o.start(now + idx * 0.06)
          o.stop(now + idx * 0.06 + 0.25)
        })
      } else {
        // default hop
        osc.type = 'sine'
        osc.frequency.setValueAtTime(320, now)
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.07)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
        osc.start(now)
        osc.stop(now + 0.07)
      }
    } catch {
      /* AudioContext not allowed before user gesture */
    }
  }

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= total - 1) {
          setIsPlaying(false)
          return prev
        }
        const next = prev + 1
        playSound(frames[next]?.soundEffect)
        return next
      })
    }, 1200)
    return () => clearInterval(timer)
  }, [isPlaying, total, frames, audioEnabled])

  const goToStep = (step: number) => {
    const clamped = Math.max(0, Math.min(total - 1, step))
    setCurrentStep(clamped)
    playSound(frames[clamped]?.soundEffect)
  }

  const roleColors: Record<string, string> = {
    active: 'border-cyan text-cyan shadow-[0_0_18px_rgba(6,182,212,0.45)] bg-cyan/10',
    compare: 'border-amber-400 text-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.55)] bg-amber-400/10',
    swap: 'border-pink-500 text-pink-300 shadow-[0_0_24px_rgba(236,72,153,0.6)] bg-pink-500/10',
    done: 'border-emerald-400 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.4)] bg-emerald-400/10',
    found: 'border-yellow-300 text-yellow-200 shadow-[0_0_28px_rgba(253,224,71,0.7)] bg-yellow-300/15',
    idle: 'border-white/10 text-foreground-dim bg-white/[0.03]',
  }

  const pointerStyles: Record<string, { bg: string; text: string }> = {
    left: { bg: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]', text: 'text-white' },
    low: { bg: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]', text: 'text-white' },
    right: { bg: 'bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]', text: 'text-white' },
    high: { bg: 'bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]', text: 'text-white' },
    mid: { bg: 'bg-cyan-500 shadow-[0_0_14px_rgba(6,182,212,0.7)]', text: 'text-black' },
    pivot: { bg: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]', text: 'text-black' },
    i: { bg: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.6)]', text: 'text-white' },
    j: { bg: 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]', text: 'text-black' },
    start: { bg: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]', text: 'text-white' },
    end: { bg: 'bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]', text: 'text-white' },
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-cyan/40 bg-[#070b14]/90 p-4 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_25px_rgba(6,182,212,0.15)] backdrop-blur-xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg border border-cyan/50 bg-cyan/15 text-cyan shadow-[0_0_10px_rgba(6,182,212,0.4)]">
            <Sparkles className="size-4 animate-pulse" />
          </span>
          <div>
            <h4 className="font-display text-sm font-semibold tracking-wide text-white">{title}</h4>
            <div className="flex items-center gap-2 text-[11px] text-foreground-dim">
              <span>{algorithm}</span>
              <span>·</span>
              <span className="font-mono text-cyan">{time_complexity}</span>
              <span>·</span>
              <span className="font-mono text-pink-400">{space_complexity}</span>
            </div>
          </div>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => {
            setAudioEnabled((a) => !a)
            if (!audioEnabled) playSound('hop')
          }}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
            audioEnabled
              ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
              : 'border-white/10 bg-white/5 text-foreground-dim hover:text-white'
          }`}
          title="Toggle Synthesizer Sound FX"
        >
          {audioEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          <span>Audio FX</span>
        </button>
      </div>

      {/* Kinetic 3D Interactive Stage */}
      <div className="relative my-4 flex min-h-[170px] flex-col items-center justify-center overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-4 pt-10">
        {/* Cells Row with FLIP animation */}
        <div className="relative flex items-center justify-center gap-3">
          {activeFrame.cells.map((cell, idx) => {
            const role = cell.role || activeFrame.roles[idx] || 'idle'
            const isElevated = role === 'swap' || role === 'compare' || role === 'active' || role === 'found'
            const styleClass = roleColors[role] || roleColors.idle

            // Gather pointers pointing to this index
            const matchingPointers = Object.entries(activeFrame.pointers).filter(([_, pIdx]) => pIdx === idx)

            return (
              <div key={cell.id} className="relative flex flex-col items-center">
                {/* Pointer Lasers Above Cell */}
                <div className="absolute -top-7 flex gap-1">
                  {matchingPointers.map(([name]) => {
                    const ptr = pointerStyles[name] || { bg: 'bg-cyan-500', text: 'text-black' }
                    return (
                      <motion.div
                        key={name}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${ptr.bg} ${ptr.text}`}
                      >
                        {name} ↓
                      </motion.div>
                    )
                  })}
                </div>

                {/* The 3D Parabolic Hopped Cell */}
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  animate={{
                    y: isElevated ? -18 : 0,
                    scale: isElevated ? 1.12 : 1,
                  }}
                  className={`flex size-13 flex-col items-center justify-center rounded-xl border-2 font-mono text-base font-bold transition-shadow duration-300 ${styleClass}`}
                >
                  <span>{cell.v}</span>
                </motion.div>

                {/* Index & Memory Address */}
                <span className="mt-1 font-mono text-[10px] text-foreground-faint">[{idx}]</span>
                {cell.addr && (
                  <span className="font-mono text-[8px] text-white/20">{cell.addr}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Dual HUD: Step Narration & Pseudo-Code Sync */}
      <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs md:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-foreground-dim">
            <span className="font-mono uppercase text-cyan">Step Narration</span>
            <span className="font-mono text-foreground-faint">
              Frame {currentStep + 1} of {total}
            </span>
          </div>
          <p className="min-h-10 text-xs leading-relaxed text-foreground-bright">{activeFrame.explanation}</p>
        </div>

        {pseudo_lines && pseudo_lines.length > 0 && (
          <div className="rounded-lg border border-white/5 bg-black/60 p-2 font-mono text-[11px]">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-foreground-faint">
              <Terminal className="size-3 text-cyan" />
              <span>Pseudo-Code Synchronization</span>
            </div>
            <div className="space-y-0.5">
              {pseudo_lines.map((line, i) => {
                const isActive = activeFrame.codeLine === i + 1
                return (
                  <div
                    key={i}
                    className={`rounded px-1.5 py-0.5 transition-colors ${
                      isActive ? 'bg-cyan/20 font-bold text-cyan' : 'text-foreground-faint'
                    }`}
                  >
                    <span className="mr-2 text-white/20">{String(i + 1).padStart(2, '0')}</span>
                    {line}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            title="Step Backward"
          >
            <SkipBack className="size-3.5" />
          </Button>

          <Button
            variant={isPlaying ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsPlaying((p) => !p)}
            className="min-w-20"
          >
            {isPlaying ? (
              <>
                <Pause className="size-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Play
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep >= total - 1}
            title="Step Forward"
          >
            <SkipForward className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(0)}
            title="Reset to Frame 1"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>

        {/* Timeline Scrub Slider */}
        <div className="flex flex-1 items-center gap-2 px-2 sm:max-w-xs">
          <span className="font-mono text-[10px] text-foreground-faint">1</span>
          <input
            type="range"
            min={0}
            max={total - 1}
            value={currentStep}
            onChange={(e) => goToStep(parseInt(e.target.value, 10))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-cyan"
            aria-label="Timeline scrubber"
          />
          <span className="font-mono text-[10px] text-foreground-faint">{total}</span>
        </div>
      </div>
    </div>
  )
}
