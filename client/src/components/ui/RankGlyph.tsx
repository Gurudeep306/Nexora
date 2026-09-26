import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Unique emblem for each Rift level (Bit → ∞ Overflow). Every tier adds
 * geometry to the core symbol so rank is readable at a glance — used in the
 * sidebar, Hub, profiles and the leaderboard.
 */
export const RIFT_TIERS = [
  { level: 1, name: 'Bit', color: 'color-foreground-dim' },
  { level: 2, name: 'Byte', color: 'color-primary' },
  { level: 3, name: 'Kilobyte', color: 'color-accent' },
  { level: 4, name: 'Megabyte', color: 'color-info' },
  { level: 5, name: 'Gigabyte', color: 'color-primary' },
  { level: 6, name: 'Terabyte', color: 'color-primary-dark' },
  { level: 7, name: 'Petabyte', color: 'color-error' },
  { level: 8, name: 'Exabyte', color: 'color-accent-dark' },
  { level: 9, name: 'Zettabyte', color: 'color-warning' },
  { level: 10, name: 'Yottabyte', color: 'color-warning-dark' },
  { level: 11, name: '∞ Overflow', color: 'color-xp' },
] as const

export function tierFor(level: number) {
  return RIFT_TIERS[Math.min(Math.max(Math.round(level) || 1, 1), RIFT_TIERS.length) - 1]
}

function polygon(n: number, r: number, rot = -90, cx = 32, cy = 32) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}
function star(n: number, r1: number, r2: number) {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180
    const r = i % 2 ? r2 : r1
    return `${(32 + r * Math.cos(a)).toFixed(2)},${(32 + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

/* Core symbol per level, drawn in a 64×64 box. */
function Core({ level, c }: { level: number; c: string }) {
  switch (level) {
    case 1:
      return <circle cx="32" cy="32" r="5" fill={c} />
    case 2:
      return (
        <g fill={c}>
          <rect x="22" y="27" width="8" height="10" rx="2" />
          <rect x="34" y="27" width="8" height="10" rx="2" />
        </g>
      )
    case 3:
      return <polygon points={polygon(3, 11)} fill={c} />
    case 4:
      return <polygon points={polygon(4, 12, 0)} fill={c} />
    case 5:
      return (
        <g>
          <polygon points={polygon(5, 12)} fill={c} />
          <circle cx="32" cy="32" r="3.5" fill="#0f0f1a" />
        </g>
      )
    case 6:
      return <polygon points={star(6, 13, 7)} fill={c} />
    case 7:
      return (
        <g>
          <polygon points={star(7, 14, 7)} fill={c} />
          <circle cx="32" cy="32" r="3" fill="#0f0f1a" />
        </g>
      )
    case 8:
      return (
        <g>
          <polygon points={star(8, 14, 6.5)} fill={c} />
          <circle cx="32" cy="32" r="16.5" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="3 3" />
        </g>
      )
    case 9:
      return (
        <g>
          <polygon points={polygon(6, 15, -90)} fill="none" stroke={c} strokeWidth="2" />
          <polygon points={polygon(6, 15, -60)} fill="none" stroke={c} strokeWidth="2" />
          <polygon points={star(6, 9, 4.5)} fill={c} />
        </g>
      )
    case 10:
      return (
        <g>
          <path d="M18 40 L22 24 L28 32 L32 20 L36 32 L42 24 L46 40 Z" fill={c} />
          <rect x="18" y="41" width="28" height="4" rx="1.5" fill={c} />
          <circle cx="32" cy="18" r="2.5" fill={c} />
        </g>
      )
    default:
      return (
        <g>
          <path
            d="M20 32c0-5 4-8 8-8 7 0 9 16 16 16 4 0 8-3 8-8s-4-8-8-8c-7 0-9 16-16 16-4 0-8-3-8-8z"
            fill="none"
            stroke={c}
            strokeWidth="4"
            strokeLinecap="round"
            transform="translate(-4 0)"
          />
        </g>
      )
  }
}

export function RankGlyph({
  level,
  size = 32,
  className,
  animated = true,
  title,
}: {
  level: number
  size?: number
  className?: string
  animated?: boolean
  title?: string
}) {
  const id = useId().replace(/:/g, '')
  const tier = tierFor(level)
  const c = tier.color
  const sides = level >= 9 ? 8 : 6
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role="img"
      aria-label={title ?? `Rank: ${tier.name}`}
    >
      <title>{title ?? `Rank ${tier.level} · ${tier.name}`}</title>
      <defs>
        <radialGradient id={`rg${id}`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor={c} stopOpacity="0.35" />
          <stop offset="1" stopColor="#0f0f1a" stopOpacity="0.95" />
        </radialGradient>
        <filter id={`gl${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={level >= 6 ? 2.2 : 1.2} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Outer frame: hexagon, octagon from Zettabyte up */}
      <polygon points={polygon(sides, 29, sides === 6 ? -90 : -67.5)} fill={`url(#rg${id})`} stroke={c} strokeWidth="2.5" />
      {level >= 4 && (
        <polygon
          points={polygon(sides, 24, sides === 6 ? -90 : -67.5)}
          fill="none"
          stroke={c}
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      )}
      {level >= 11 && animated && (
        <circle cx="32" cy="32" r="27" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="4 6" opacity="0.8">
          <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="12s" repeatCount="indefinite" />
        </circle>
      )}
      <g filter={`url(#gl${id})`}>
        <Core level={tier.level} c={c} />
      </g>
    </svg>
  )
}