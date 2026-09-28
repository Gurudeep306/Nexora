import { cn } from '@/lib/utils'

/*
 * "The Rift" — a GPU-safe, pure-CSS aurora backdrop. Layered radial gradients
 * drift slowly behind a dark scrim so foreground text always keeps contrast.
 * Replaces the WebGL shader, whose per-pixel hash degraded to colored static
 * on GPUs without highp fragment support.
 */
export function RiftBackground({
  className,
  grid = true,
  intensity = 1,
}: {
  className?: string
  grid?: boolean
  intensity?: number
}) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden="true"
      style={{ opacity: Math.min(1, 0.4 * intensity + 0.22) }}
    >
      {/* Drifting aurora blobs */}
      <div className="rift-blob rift-blob-a" />
      <div className="rift-blob rift-blob-b" />
      <div className="rift-blob rift-blob-c" />

      {/* Perspective horizon grid */}
      {grid && <div className="rift-grid" />}

      {/* Dark scrim keeps content readable over the aurora */}
      <div className="rift-scrim" />
    </div>
  )
}
