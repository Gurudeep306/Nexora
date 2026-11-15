import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'motion/react'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * One phrase at a time, rising into place and leaving upwards: a glimpse of
 * how much there is to watch. Static (first phrase, then the rest listed
 * for screen readers) under reduced motion.
 */
export function CyclingPhrase({ phrases, every = 2800 }: { phrases: string[]; every?: number }) {
  const still = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (still) return
    const t = setInterval(() => setI((x) => (x + 1) % phrases.length), every)
    return () => clearInterval(t)
  }, [still, every, phrases.length])
  return (
    <span className="lp-cycle">
      <span className="sr-only">{phrases.join(', ')}</span>
      <span aria-hidden="true" className="lp-cycle-window">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i}
            className="lp-cycle-word"
            initial={{ opacity: 0, y: '0.6em' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-0.6em' }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {phrases[i]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}

/** Two slow rows of subject names drifting in opposite directions. Pauses on hover; wraps as plain text under reduced motion. */
export function Marquee({ rows }: { rows: string[][] }) {
  return (
    <div className="lp-marquee" aria-hidden="true">
      {rows.map((row, r) => (
        <div key={r} className={`lp-marquee-row ${r % 2 ? 'is-reverse' : ''}`}>
          <div className="lp-marquee-track">
            {[...row, ...row].map((s, k) => (
              <span key={k} className="lp-marquee-item">
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** A number that counts up once, the first time it scrolls into view. */
export function CountUp({ to, format = (n) => n.toLocaleString('en-IN'), suffix = '' }: { to: number; format?: (n: number) => string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const still = useReducedMotion()
  const [n, setN] = useState(still ? to : 0)
  useEffect(() => {
    if (!seen || still) return
    const c = animate(0, to, { duration: 1.4, ease: EASE, onUpdate: (v) => setN(Math.round(v)) })
    return () => c.stop()
  }, [seen, still, to])
  return (
    <span ref={ref}>
      <span aria-hidden="true">
        {format(still ? to : n)}
        {suffix}
      </span>
      <span className="sr-only">
        {format(to)}
        {suffix}
      </span>
    </span>
  )
}

/** The eleven levels, each bar wider than the last, filling one after another as the ladder comes into view. */
const LEVELS = ['Bit', 'Byte', 'Kilobyte', 'Megabyte', 'Gigabyte', 'Terabyte', 'Petabyte', 'Exabyte', 'Zettabyte', 'Yottabyte', '∞ Overflow']
export function LevelLadder() {
  const ref = useRef<HTMLOListElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -20% 0px' })
  const still = useReducedMotion()
  return (
    <ol ref={ref} className="m-0 grid list-none gap-2 p-0" aria-label="The eleven levels, from Bit to ∞ Overflow">
      {LEVELS.map((name, k) => (
        <li key={name} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4">
          <span className={`ed-ui-sm ${k === LEVELS.length - 1 ? 'text-[var(--ed-ink)]' : 'ed-muted'}`}>{name}</span>
          <span className="lp-rung" style={{ width: `${18 + k * 8.2}%` }}>
            <motion.span
              className={`lp-rung-fill ${k === LEVELS.length - 1 ? 'is-top' : ''}`}
              initial={{ scaleX: still ? 1 : 0 }}
              animate={{ scaleX: seen || still ? 1 : 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: still ? 0 : 0.15 + k * 0.09 }}
            />
          </span>
        </li>
      ))}
    </ol>
  )
}
