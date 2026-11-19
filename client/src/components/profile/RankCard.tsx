import { motion, useReducedMotion } from 'motion/react'
import { RankGlyph } from '@/components/ui'
import { LEVELS } from '@/components/landing/motifs'
import type { Showcase } from '@/components/social/feed/types'
import { LevelRules } from './LevelRules'

/**
 * The rank card on the profile's rail: the rank's glyph, its name, and the two
 * things the next rank needs (XP and solves), each as a hairline meter with
 * the real numbers. At the top rank it says so instead of showing meters.
 */
export function RankCard({ s }: { s: NonNullable<Showcase['stats']> }) {
  const still = useReducedMotion()
  const lv = s.level
  const top = lv.level >= LEVELS.length
  const next = top ? null : LEVELS[lv.level]
  const xpPct = lv.xpForNext ? Math.min(100, (lv.xpInLevel / lv.xpForNext) * 100) : 100
  const gated = !!lv.probGated && lv.probsForNext != null
  const solvesPct = gated && lv.probsForNext ? Math.min(100, ((lv.probsInLevel ?? 0) / lv.probsForNext) * 100) : 100
  const xpLeft = Math.max(0, lv.xpForNext - lv.xpInLevel)
  const solvesLeft = gated ? Math.max(0, (lv.probsForNext ?? 0) - (lv.probsInLevel ?? 0)) : 0

  return (
    <section className="pf-rank" aria-label="Rank">
      <div className="pf-rank-head">
        <RankGlyph level={lv.level} size={56} />
        <div className="min-w-0">
          <p className="pf-rank-kicker">
            Level {lv.level} of {LEVELS.length}
          </p>
          <p className="pf-rank-name">{lv.name}</p>
        </div>
      </div>
      {top ? (
        <p className="pf-rank-line">The top of the ladder. Every solve from here is for the joy of it.</p>
      ) : (
        <>
          <Meter label="XP" pct={xpPct} still={!!still} figure={xpLeft > 0 ? `${xpLeft.toLocaleString('en-IN')} to go` : 'Done'} done={xpLeft === 0} />
          {gated && <Meter label="Solves" pct={solvesPct} still={!!still} figure={solvesLeft > 0 ? `${solvesLeft.toLocaleString('en-IN')} to go` : 'Done'} done={solvesLeft === 0} />}
          <p className="pf-rank-line">
            Next: <strong>{next}</strong>
          </p>
        </>
      )}
      <LevelRules currentLevel={lv.level} />
    </section>
  )
}

function Meter({ label, pct, figure, done, still }: { label: string; pct: number; figure: string; done: boolean; still: boolean }) {
  return (
    <div className="pf-rank-meter">
      <div className="pf-rank-meter-row">
        <span>{label}</span>
        <span className={done ? 'pf-rank-done' : undefined}>{figure}</span>
      </div>
      <div className="pf-rank-track" role="progressbar" aria-label={`${label} toward the next level`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <motion.span initial={still ? false : { width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.3, 1] }} />
      </div>
    </div>
  )
}
