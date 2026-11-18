/**
 * The Hive mark's geometry and a small static glyph, shared by the Hive app
 * (hive/HiveLogo.tsx, which animates it) and the rest of the site (the Dock,
 * menus, search) through <Icon name="hive" />. An H in three strokes whose
 * bar runs on into the clay full stop — same grid, weights and clay as the
 * NexoraGuru mark (./traversal.ts). A brand mark: it does not change with the
 * chosen icon set.
 */
import { HIVE_STOP, HIVE_STROKES, hiveWeight } from './hiveGeometry'

/** `weight` overrides the stroke (as an icon it matches the line icons beside it). */
export function HiveGlyph({ size = 24, weight, className, ...rest }: { size?: number; weight?: number; className?: string } & React.SVGProps<SVGSVGElement>) {
  const sw = weight ?? hiveWeight(size)
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="none" focusable="false" {...rest}>
      <g stroke="currentColor" strokeWidth={sw} strokeLinecap="round">
        {HIVE_STROKES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle cx={HIVE_STOP[0]} cy={HIVE_STOP[1]} r={+Math.max(1.9, sw * 0.72).toFixed(2)} fill="var(--ed-clay, #D97757)" />
    </svg>
  )
}
