import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'

const COLORS = ['var(--color-primary-light)', 'var(--color-accent)', 'var(--color-info)', 'var(--color-warning)', 'var(--color-success)']

/**
 * One-shot burst of rift shards — plays when you get Accepted.
 * Change `burstKey` to fire again. Skipped entirely for reduced-motion users.
 */
/** Small seeded PRNG so a burst is deterministic for its key (keeps render pure). */
function seeded(key: string | number) {
  let h = 2166136261
  for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function Confetti({ burstKey, count = 46 }: { burstKey: string | number; count?: number }) {
  const reduce = useReducedMotion()
  const pieces = useMemo(
    () => {
      const rand = seeded(burstKey)
      return Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + rand() * 0.4
        const dist = 160 + rand() * 260
        return {
          id: `${burstKey}-${i}`,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.75 - 80,
          rot: rand() * 720 - 360,
          size: 6 + rand() * 8,
          shape: i % 3,
          color: COLORS[i % COLORS.length],
          delay: rand() * 0.08,
        }
      })
    },
    [burstKey, count],
  )
  if (reduce) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden="true">
      <div className="absolute top-1/3 left-1/2">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute block"
            style={{
              width: p.size,
              height: p.shape === 1 ? p.size / 2.5 : p.size,
              background: p.color,
              borderRadius: p.shape === 0 ? '9999px' : p.shape === 1 ? '2px' : '1px',
              clipPath: p.shape === 2 ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined,
              boxShadow: `0 0 8px ${p.color}`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: p.x, y: [0, p.y, p.y + 220], opacity: [1, 1, 0], rotate: p.rot, scale: 1 }}
            transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut', times: [0, 0.45, 1] }}
          />
        ))}
      </div>
    </div>,
    document.body,
  )
}
