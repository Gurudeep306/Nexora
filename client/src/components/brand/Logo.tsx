import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * The Nexora mark: an app-icon squircle holding an N drawn as a path through
 * four nodes — a graph walk, which is what competitive programming mostly is.
 * The walk starts at the open teal node (bottom left), and ends at the lit
 * pink node (top right): from first problem to mastery.
 *
 * The same artwork is public/nexora.svg (favicon) and apple-touch-icon.png.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const u = (k: string) => `url(#${id}${k})`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn('shrink-0', className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}bg`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#2a1f7a" />
          <stop offset="0.55" stopColor="#130f3d" />
          <stop offset="1" stopColor="#0a0820" />
        </linearGradient>
        <radialGradient id={`${id}g1`} cx="0.28" cy="0.18" r="0.75">
          <stop offset="0" stopColor="#7c5cff" stopOpacity="0.75" />
          <stop offset="0.6" stopColor="#7c5cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}g2`} cx="0.85" cy="0.95" r="0.6">
          <stop offset="0" stopColor="#ff4f9a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff4f9a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={`${id}n`} x1="0.1" y1="0.9" x2="0.9" y2="0.1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="0.5" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#ff7ab6" />
        </linearGradient>
        <filter id={`${id}b`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <clipPath id={`${id}sq`}>
          <rect x="2" y="2" width="60" height="60" rx="15" />
        </clipPath>
      </defs>
      <g clipPath={u('sq')}>
        <rect width="64" height="64" fill={u('bg')} />
        <rect width="64" height="64" fill={u('g1')} />
        <rect width="64" height="64" fill={u('g2')} />
        <ellipse cx="26" cy="4" rx="34" ry="13" fill="#fff" opacity="0.06" />
      </g>
      <rect x="2.6" y="2.6" width="58.8" height="58.8" rx="14.4" fill="none" stroke={u('rim')} strokeWidth="1.2" />
      <path d="M20 45V19l24 26V19" fill="none" stroke={u('n')} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" filter={u('b')} />
      <path d="M20 45V19l24 26V19" fill="none" stroke={u('n')} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="45" r="4.4" fill="#0c0a24" stroke="#5eead4" strokeWidth="2.4" />
      <circle cx="20" cy="19" r="3.2" fill="#fff" />
      <circle cx="44" cy="45" r="3.2" fill="#fff" />
      <circle cx="44" cy="19" r="5.2" fill="#ff7ab6" opacity="0.5" filter={u('b')} />
      <circle cx="44" cy="19" r="4.4" fill="#fff" stroke="#ff7ab6" strokeWidth="2.4" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-[family-name:var(--font-brand)] text-[16px] font-semibold tracking-[0.22em] text-text-primary',
        className,
      )}
    >
      NEXORA
    </span>
  )
}
