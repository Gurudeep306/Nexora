import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import './sorting-loader.css'

/**
 * The page loader as a tiny live lesson: seven ink bars sorting themselves
 * with insertion sort, one step every ~450 ms. The bar being placed is clay,
 * the sorted part is ink, and one serif line says what just happened
 * ("41 is bigger than 23, so 23 slides left"). When the row is sorted it
 * rests for a beat, then shuffles and starts again. Under reduced motion the
 * bars stand still, sorted, with "Loading…".
 */

type Frame = { arr: number[]; key: number; sorted: number; text: string }

/** Every step of insertion sort on `start`, as frames. */
function frames(start: number[]): Frame[] {
  const a = start.slice()
  const out: Frame[] = [{ arr: a.slice(), key: -1, sorted: 1, text: 'Insertion sort: the first bar is a sorted row of one.' }]
  for (let i = 1; i < a.length; i++) {
    const v = a[i]
    out.push({ arr: a.slice(), key: i, sorted: i, text: `Take ${v} and walk it left into the sorted part.` })
    let j = i - 1
    while (j >= 0 && a[j] > v) {
      a[j + 1] = a[j]
      a[j] = v
      out.push({ arr: a.slice(), key: j, sorted: i + 1, text: `${a[j + 1]} is bigger than ${v}, so ${v} slides left.` })
      j--
    }
    out.push({ arr: a.slice(), key: j + 1, sorted: i + 1, text: j >= 0 ? `${a[j]} is smaller: ${v} stops here.` : `${v} is the smallest so far: it goes first.` })
  }
  out.push({ arr: a.slice(), key: -1, sorted: a.length, text: 'Sorted. Every bar is in order.' })
  return out
}

/** A deterministic shuffle per round (keeps renders pure). */
function shuffled(round: number): number[] {
  const base = [12, 23, 31, 41, 54, 67, 78]
  let s = 2166136261 ^ (round * 16777619)
  const rand = () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0
    return ((s ^= s >>> 16) >>> 0) / 4294967296
  }
  const a = base.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function SortingLoader({ className, label = 'Loading' }: { className?: string; label?: string }) {
  const still = useReducedMotion()
  const [round, setRound] = useState(0)
  const [step, setStep] = useState(0)
  const seq = useMemo(() => frames(shuffled(round)), [round])
  useEffect(() => {
    if (still) return
    const last = step >= seq.length - 1
    const t = window.setTimeout(
      () => {
        if (last) {
          setRound((r) => r + 1)
          setStep(0)
        } else setStep((s) => s + 1)
      },
      last ? 1400 : 460,
    )
    return () => window.clearTimeout(t)
  }, [step, seq, still])
  const f = still ? { arr: [12, 23, 31, 41, 54, 67, 78], key: -1, sorted: 7, text: '' } : seq[Math.min(step, seq.length - 1)]
  const max = 78
  return (
    <div className={cn('sl', className)} role="status" aria-live="off">
      <span className="sr-only">{label}…</span>
      <div className="sl-bars" aria-hidden="true">
        {/* Fixed DOM order (by value); only the position moves, so each bar slides. */}
        {[...f.arr].sort((a, b) => a - b).map((v) => {
          const i = f.arr.indexOf(v)
          return (
            <span key={v} className={cn('sl-bar', i === f.key && 'is-key', i < f.sorted && i !== f.key && 'is-sorted')} style={{ height: `${18 + (v / max) * 62}%`, left: `${(i / 7) * 100 + 1.5}%` }}>
              <span className="sl-val">{v}</span>
            </span>
          )
        })}
      </div>
      <p className="sl-text" aria-hidden="true">
        {still ? `${label}…` : f.text}
      </p>
    </div>
  )
}
