import { useId, useMemo } from 'react'
import { buildFrames } from './frames'
import type { VizSpec } from './schema'
import { VizScene } from './VizScene'
import './viz.css'

/**
 * A still of an animation's first frame, drawn by the real scene renderer (no
 * picture files), for cards that point to a subject. Decorative: the card's own
 * text names the subject, so the drawing is hidden from screen readers.
 */
export function VizThumb({ spec, className }: { spec: VizSpec; className?: string }) {
  const uid = useId()
  const frame = useMemo(() => buildFrames(spec, 'wide')[0], [spec])
  if (!frame) return null
  return (
    <span className={className} aria-hidden="true">
      <VizScene spec={spec} layout="wide" frame={frame} sketch={null} titleId={`${uid}-t`} descId={`${uid}-d`} />
    </span>
  )
}
