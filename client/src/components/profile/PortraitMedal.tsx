import { RankGlyph } from '@/components/ui/RankGlyph'
import { useId, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * The profile portrait as a medal: a fine ink ring, a clay arc that fills to
 * the real progress through the current level, and the handle and level set
 * in small capitals around the edge like the rim of a coin. The arc draws in
 * once; under reduced motion it is simply shown.
 */
export function PortraitMedal({ children, handle, level, name, progress }: { children: ReactNode; handle: string; level: number; name: string; progress: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const still = useReducedMotion()
  const S = 168
  const c = S / 2
  const ring = 66 // the ink ring just outside the photo
  const textR = 76 // the rim text
  const pct = Math.max(0, Math.min(1, progress))
  const unit = `@${handle} · level ${level} · ${name} · `.toUpperCase()
  // Repeat the line so it wraps the rim evenly (about 5.6px per mono capital).
  const circumference = 2 * Math.PI * textR
  const label = unit.repeat(Math.max(1, Math.round(circumference / (unit.length * 5.6))))
  return (
    <div className="pf-medal" style={{ width: S, height: S }}>
      <svg className="pf-medal-svg" viewBox={`0 0 ${S} ${S}`} width={S} height={S} aria-hidden="true">
        <defs>
          <path id={`${id}r`} d={`M${c} ${c - textR}A${textR} ${textR} 0 1 1 ${c - 0.01} ${c - textR}`} />
        </defs>
        <circle cx={c} cy={c} r={ring} className="pf-medal-ring" />
        <circle cx={c} cy={c} r={ring + 4} className="pf-medal-track" />
        <motion.circle
          cx={c}
          cy={c}
          r={ring + 4}
          className="pf-medal-arc"
          transform={`rotate(-90 ${c} ${c})`}
          initial={{ pathLength: still ? pct : 0 }}
          animate={{ pathLength: pct }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
        <text className="pf-medal-text">
          <textPath href={`#${id}r`} startOffset="0" textLength={circumference - 2} lengthAdjust="spacing">
            {label}
          </textPath>
        </text>
      </svg>
      <div className="pf-medal-photo">{children}</div>
      {/* The rank badge, pinned to the rim like a medal's seal. */}
      <span className="pf-medal-badge">
        <RankGlyph level={level} size={46} animated={false} />
      </span>
    </div>
  )
}
