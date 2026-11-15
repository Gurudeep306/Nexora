import type { CSSProperties } from 'react'
import { assetUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AccentKey } from '@/components/social/feed/types'
import '@/components/social/feed/social.css'

/*
 * Profile covers: generated, slowly drifting gradient "shaders" built only
 * from theme tokens (so every theme and light/dark gets its own take), or an
 * uploaded image.
 */

const blob = (x: number, y: number, c: string, s = 45) => `radial-gradient(${s + 10}% ${s + 25}% at ${x}% ${y}%, ${c}, transparent 72%)`
const T = {
  brand: 'var(--color-accent-brand)',
  info: 'var(--color-state-info)',
  success: 'var(--color-state-success)',
  warning: 'var(--color-state-warning)',
  danger: 'var(--color-state-error)',
  muted: 'var(--color-text-muted)',
  surface: 'var(--color-bg-surface-3)',
}

export const COVERS: Record<string, { label: string; a: string; b: string; grid?: boolean; still?: boolean }> = {
  // The default: a calm surface with a hairline grid, no colour and no drift.
  plain: { label: 'Plain', a: 'none', b: 'none', grid: true, still: true },
  aurora: { label: 'Aurora', a: `${blob(15, 30, T.brand)}, ${blob(80, 20, T.info, 40)}`, b: blob(60, 85, T.success, 50) },
  nebula: { label: 'Nebula', a: `${blob(25, 70, T.brand, 50)}, ${blob(85, 30, T.danger, 35)}`, b: blob(50, 20, T.info, 35) },
  ember: { label: 'Ember', a: `${blob(20, 80, T.danger, 50)}, ${blob(70, 30, T.warning, 45)}`, b: blob(90, 90, T.brand, 30) },
  lagoon: { label: 'Lagoon', a: `${blob(10, 20, T.info, 50)}, ${blob(75, 70, T.success, 45)}`, b: blob(45, 40, T.brand, 30) },
  orchid: { label: 'Orchid', a: `${blob(30, 30, T.danger, 40)}, ${blob(75, 60, T.brand, 50)}`, b: blob(10, 90, T.warning, 30) },
  dawn: { label: 'Dawn', a: `${blob(20, 30, T.warning, 50)}, ${blob(80, 70, T.danger, 40)}`, b: blob(55, 15, T.info, 30) },
  graphite: { label: 'Graphite', a: `${blob(30, 40, T.surface, 70)}, ${blob(80, 30, T.muted, 35)}`, b: blob(60, 80, T.brand, 25), grid: true },
  matrix: { label: 'Matrix', a: `${blob(20, 60, T.success, 50)}, ${blob(80, 20, T.info, 30)}`, b: blob(60, 90, T.success, 30), grid: true },
}
export const COVER_IDS = Object.keys(COVERS)

export const ACCENTS: Record<AccentKey, { label: string; color: string }> = {
  brand: { label: 'Brand', color: T.brand },
  info: { label: 'Sky', color: T.info },
  success: { label: 'Mint', color: T.success },
  warning: { label: 'Amber', color: T.warning },
  danger: { label: 'Rose', color: T.danger },
}

export function CoverArt({ cover, className, still }: { cover: string; className?: string; still?: boolean }) {
  const isImage = cover.startsWith('/uploads/')
  const preset = COVERS[cover] ?? COVERS.plain
  if (isImage) {
    return (
      <div className={cn('relative overflow-hidden bg-bg-surface-2', className)}>
        <img src={assetUrl(cover)} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="ng-cover-fade" />
      </div>
    )
  }
  return (
    <div className={cn('ng-cover', preset.still && 'ng-cover--plain', (still || preset.still) && '[&::after]:!animate-none [&::before]:!animate-none', className)} style={{ '--ng-cover-a': preset.a, '--ng-cover-b': preset.b } as CSSProperties}>
      {preset.grid ? <div className="ng-cover-grid" /> : <div className="ng-cover-grain" />}
      {!still && !preset.still && <div className="ng-cover-fade" />}
    </div>
  )
}
