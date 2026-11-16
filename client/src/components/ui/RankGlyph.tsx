import { cn } from '@/lib/utils'

/**
 * The rank badges.
 *
 * Rift levels (Bit → ∞ Overflow) tell one story — data growing from a single
 * bit until it overflows. Every badge is a seal: a rim with eleven notches
 * (the lit ones count your level), and an emblem for the tier:
 *
 *   1 Bit        a single bit             7 Petabyte   a hex lattice
 *   2 Byte       eight bits in a ring     8 Exabyte    a world in orbit
 *   3 Kilobyte   a block of memory        9 Zettabyte  a galaxy
 *   4 Megabyte   stacked platters        10 Yottabyte  a supernova
 *   5 Gigabyte   a cube of storage       11 ∞ Overflow infinity, breaking the rim
 *   6 Terabyte   a server stack
 *
 * From Gigabyte the rim doubles; from Zettabyte it is engraved. Each tier
 * has its own colour token (--rank-1 … --rank-11 in index.css, tuned for
 * light and dark). No glows, no gradients: ink, tint and line.
 *
 * Subject ranks (Novice → Master) are moon phases: the moon fills as you
 * master the subject (SubjectRankGlyph).
 */
export const RIFT_TIERS = [
  { level: 1, name: 'Bit', color: 'var(--rank-1)', motto: 'A single bit' },
  { level: 2, name: 'Byte', color: 'var(--rank-2)', motto: 'Eight bits together' },
  { level: 3, name: 'Kilobyte', color: 'var(--rank-3)', motto: 'A block of memory' },
  { level: 4, name: 'Megabyte', color: 'var(--rank-4)', motto: 'Platters spinning' },
  { level: 5, name: 'Gigabyte', color: 'var(--rank-5)', motto: 'A cube of storage' },
  { level: 6, name: 'Terabyte', color: 'var(--rank-6)', motto: 'A server stack' },
  { level: 7, name: 'Petabyte', color: 'var(--rank-7)', motto: 'A lattice of machines' },
  { level: 8, name: 'Exabyte', color: 'var(--rank-8)', motto: 'A world of data' },
  { level: 9, name: 'Zettabyte', color: 'var(--rank-9)', motto: 'A galaxy of it' },
  { level: 10, name: 'Yottabyte', color: 'var(--rank-10)', motto: 'A supernova' },
  { level: 11, name: '∞ Overflow', color: 'var(--rank-11)', motto: 'Past every limit' },
] as const

export function tierFor(level: number) {
  return RIFT_TIERS[Math.min(Math.max(Math.round(level) || 1, 1), RIFT_TIERS.length) - 1]
}

const f = (n: number) => n.toFixed(2)
const at = (r: number, deg: number, cx = 32, cy = 32): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}
function polygon(n: number, r: number, rot = -90, cx = 32, cy = 32) {
  return Array.from({ length: n }, (_, i) => at(r, rot + (360 / n) * i, cx, cy).map(f).join(',')).join(' ')
}
function star(n: number, r1: number, r2: number, rot = -90) {
  return Array.from({ length: n * 2 }, (_, i) => at(i % 2 ? r2 : r1, rot + (180 / n) * i).map(f).join(',')).join(' ')
}
/** An isometric box: top, left and right faces. */
function iso(cx: number, cy: number, w: number, h: number) {
  const dx = w / 2
  const dy = w / 4
  return {
    top: `${f(cx)},${f(cy - dy)} ${f(cx + dx)},${f(cy)} ${f(cx)},${f(cy + dy)} ${f(cx - dx)},${f(cy)}`,
    left: `${f(cx - dx)},${f(cy)} ${f(cx)},${f(cy + dy)} ${f(cx)},${f(cy + dy + h)} ${f(cx - dx)},${f(cy + h)}`,
    right: `${f(cx)},${f(cy + dy)} ${f(cx + dx)},${f(cy)} ${f(cx + dx)},${f(cy + h)} ${f(cx)},${f(cy + dy + h)}`,
  }
}

/** The emblem at the centre, drawn in currentColor in a 64×64 box. */
function Emblem({ level }: { level: number }) {
  const c = 'currentColor'
  switch (level) {
    case 1:
      return <circle cx="32" cy="32" r="4.5" fill={c} />
    case 2:
      return (
        <g fill={c}>
          {Array.from({ length: 8 }, (_, i) => {
            const [x, y] = at(10, -90 + i * 45)
            return <circle key={i} cx={f(x)} cy={f(y)} r={i === 0 ? 2.8 : 2.2} fillOpacity={i % 2 ? 0.55 : 1} />
          })}
        </g>
      )
    case 3:
      return (
        <g fill={c}>
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={23 + (i % 3) * 6.5} y={23 + Math.floor(i / 3) * 6.5} width="5" height="5" rx="1" fillOpacity={[1, 0.5, 1, 0.5, 1, 1, 1, 0.5, 0.5][i]} />
          ))}
        </g>
      )
    case 4:
      return (
        <g fill={c}>
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx="32" cy={24 + i * 7.5} rx="11" ry="3.4" fillOpacity={1 - i * 0.25} />
          ))}
          <rect x="31.2" y="21" width="1.6" height="20" rx="0.8" style={{ fill: 'var(--rank-ink)' }} />
        </g>
      )
    case 5: {
      const b = iso(32, 26, 22, 11)
      return (
        <g fill={c}>
          <polygon points={b.top} />
          <polygon points={b.left} fillOpacity="0.6" />
          <polygon points={b.right} fillOpacity="0.3" />
        </g>
      )
    }
    case 6:
      return (
        <g fill={c}>
          {[0, 1, 2].map((i) => {
            const b = iso(32, 20 + i * 7.5, 22, 4)
            return (
              <g key={i}>
                <polygon points={b.top} fillOpacity={i === 0 ? 1 : 0.85} />
                <polygon points={b.left} fillOpacity="0.55" />
                <polygon points={b.right} fillOpacity="0.3" />
              </g>
            )
          })}
        </g>
      )
    case 7:
      return (
        <g fill={c}>
          <polygon points={polygon(6, 4.6, 0, 32, 32)} />
          {Array.from({ length: 6 }, (_, i) => {
            const [x, y] = at(8.4, -90 + i * 60)
            return <polygon key={i} points={polygon(6, 4.6, 0, x, y)} fillOpacity={i % 2 ? 0.45 : 0.75} />
          })}
        </g>
      )
    case 8:
      return (
        <g>
          <circle cx="32" cy="32" r="6.5" fill={c} />
          <ellipse cx="32" cy="32" rx="14" ry="5.2" fill="none" stroke={c} strokeWidth="1.6" transform="rotate(-24 32 32)" />
          <circle cx={f(at(14, 200)[0])} cy={f(at(5.2, 200)[1] - 4)} r="2.2" fill={c} />
        </g>
      )
    case 9:
      return (
        <g fill="none" stroke={c} strokeLinecap="round">
          <path d="M32 32c0-5 6-7 9-3s1 11-6 12-14-4-13-12 9-13 17-11" strokeWidth="2.2" />
          <path d="M32 32c0 5-6 7-9 3s-1-11 6-12 14 4 13 12-9 13-17 11" strokeWidth="2.2" strokeOpacity="0.55" />
          <circle cx="32" cy="32" r="2.8" fill={c} stroke="none" />
        </g>
      )
    case 10:
      return (
        <g fill={c}>
          <polygon points={star(8, 15, 5.2, -90)} fillOpacity="0.45" />
          <polygon points={star(4, 15, 4.2, -90)} />
          <circle cx="32" cy="32" r="3.2" style={{ fill: 'var(--rank-ink)' }} />
        </g>
      )
    default:
      return (
        <path
          d="M20 32c0-4.5 3.5-7.5 7.5-7.5 7.5 0 9.5 15 17 15 4 0 7.5-3 7.5-7.5s-3.5-7.5-7.5-7.5c-7.5 0-9.5 15-17 15-4 0-7.5-3-7.5-7.5z"
          fill="none"
          stroke={c}
          strokeWidth="3.6"
          strokeLinecap="round"
          transform="translate(-4 0)"
        />
      )
  }
}

/** The rim: a seal; doubled from Gigabyte, engraved from Zettabyte, broken by Overflow. */
function Rim({ level, notches }: { level: number; notches: boolean }) {
  const c = 'currentColor'
  return (
    <g>
      {level >= 9 && level < 11 ? (
        <polygon points={star(28, 29.5, 27.6, -90)} fill={c} fillOpacity="0.1" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      ) : level >= 11 ? (
        // Overflow: the rim breaks at the top right, where the loop spills out.
        <g>
          <circle cx="32" cy="32" r="29" fill={c} fillOpacity="0.1" />
          <path d={`M ${at(29, -20).map(f).join(' ')} A 29 29 0 1 1 ${at(29, -62).map(f).join(' ')}`} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path d={`M ${at(25, -41).map(f).join(' ')} L ${at(33, -41).map(f).join(' ')}`} stroke={c} strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : (
        <circle cx="32" cy="32" r="29" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="2" />
      )}
      {level >= 5 && <circle cx="32" cy="32" r="25.6" fill="none" stroke={c} strokeOpacity="0.4" strokeWidth="1" />}
      {notches &&
        Array.from({ length: 11 }, (_, i) => {
          // Eleven notches across the lower arc, like a gauge: lit up to your level.
          const deg = 150 - i * 12
          const [x1, y1] = at(22.4, 180 - deg)
          const [x2, y2] = at(19.6, 180 - deg)
          return <line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeOpacity={i < level ? 1 : 0.22} />
        })}
    </g>
  )
}

export function RankGlyph({
  level,
  size = 32,
  className,
  animated: _animated = true,
  title,
}: {
  level: number
  size?: number
  className?: string
  /** Kept for callers; the badges are still (no spin, no glow). */
  animated?: boolean
  title?: string
}) {
  const tier = tierFor(level)
  // Notches only read at a decent size.
  const notches = size >= 28
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      style={{ color: tier.color }}
      data-ui="rank"
      data-tier={tier.level}
      role="img"
      aria-label={title ?? `Rank ${tier.level}: ${tier.name}`}
    >
      <title>{title ?? `Rank ${tier.level} · ${tier.name}`}</title>
      <Rim level={tier.level} notches={notches} />
      <g transform={notches ? 'translate(0 -2.5)' : undefined}>
        <Emblem level={tier.level} />
      </g>
    </svg>
  )
}

/* ── Subject ranks: moon phases ─────────────────────────────────────────── */

export const SUBJECT_TIERS = ['Novice', 'Apprentice', 'Adept', 'Expert', 'Master'] as const

/** How much of the moon is lit for a tier (0 = new moon … 4 = full). */
function Moon({ tier }: { tier: number }) {
  const c = 'currentColor'
  const r = 13
  // The lit part: a crescent, a half, a gibbous moon, then full.
  const lit = [0, 0.3, 0.5, 0.75, 1][tier]
  // The terminator is an ellipse; its x-radius sweeps from r (crescent) to 0 (half) to -r (gibbous).
  const k = Math.cos(lit * Math.PI) * r
  const sweep = k > 0 ? 0 : 1
  const d = `M32 ${32 - r} A${r} ${r} 0 0 1 32 ${32 + r} A${f(Math.abs(k))} ${r} 0 0 ${sweep} 32 ${32 - r}Z`
  return (
    <g>
      <circle cx="32" cy="32" r={r} fill={c} fillOpacity="0.14" stroke={c} strokeWidth="1.6" />
      {tier >= 4 ? <circle cx="32" cy="32" r={r} fill={c} /> : tier > 0 ? <path d={d} fill={c} /> : null}
    </g>
  )
}

export function SubjectRankGlyph({ tier, size = 32, className, title }: { tier: number; size?: number; className?: string; title?: string }) {
  const t = Math.min(Math.max(Math.round(tier) || 0, 0), 4)
  const name = SUBJECT_TIERS[t]
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      style={{ color: t >= 4 ? 'var(--color-accent-brand)' : 'var(--color-text-primary)' }}
      data-ui="subject-rank"
      role="img"
      aria-label={title ?? `Subject rank: ${name}`}
    >
      <title>{title ?? name}</title>
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Five marks round the rim, lit up to the tier. */}
      {Array.from({ length: 5 }, (_, i) => {
        const [x, y] = at(23, -90 + i * 72)
        return <circle key={i} cx={f(x)} cy={f(y)} r="1.9" fill="currentColor" fillOpacity={i <= t ? 1 : 0.2} />
      })}
      {/* Master: rays round the full moon. */}
      {t >= 4 &&
        Array.from({ length: 10 }, (_, i) => {
          const deg = -90 + 36 + i * 36
          if (i % 2) return null
          const [x1, y1] = at(16.5, deg)
          const [x2, y2] = at(19.5, deg)
          return <line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        })}
      <Moon tier={t} />
    </svg>
  )
}

/** A rank as a pill: the badge, its name and (optionally) a line under it. */
export function RankBadge({ level, size = 'md', sub, className }: { level: number; size?: 'sm' | 'md' | 'lg'; sub?: string; className?: string }) {
  const tier = tierFor(level)
  const px = size === 'sm' ? 20 : size === 'lg' ? 44 : 30
  return (
    <span className={cn('rank-badge', `is-${size}`, className)} data-tier={tier.level} style={{ ['--tier' as string]: tier.color }}>
      <RankGlyph level={tier.level} size={px} animated={false} title={`Rank ${tier.level} · ${tier.name}`} />
      <span className="min-w-0">
        <span className="rank-badge-name block truncate">{tier.name}</span>
        {size !== 'sm' && <span className="rank-badge-sub block truncate">{sub ?? `Level ${tier.level} of 11`}</span>}
      </span>
    </span>
  )
}
