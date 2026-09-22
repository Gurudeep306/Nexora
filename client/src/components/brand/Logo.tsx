import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Nexora mark — a faceted hex "rift" with an N cut through it. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#f43f5e" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75z" fill={`url(#${id}g)`} />
      <path d="M16 1.5 28.6 8.75 16 16 3.4 8.75z" fill={`url(#${id}s)`} />
      <path
        d="M10.5 22V10.5l11 11V10"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-[family-name:var(--font-brand)] text-[17px] tracking-[0.14em] text-foreground', className)}>
      NEXORA
    </span>
  )
}
