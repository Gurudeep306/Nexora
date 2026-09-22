import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'

const RiftShader = lazy(() => import('./RiftShader'))

/**
 * WebGL "rift" backdrop with a pure-CSS fallback underneath — the shader
 * chunk (ogl, ~25 KB) only loads on pages that use it.
 */
export function RiftBackground({ className, grid = true, intensity = 1 }: { className?: string; grid?: boolean; intensity?: number }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 30% 20%, rgb(139 92 246 / 0.35), transparent 70%), radial-gradient(50% 40% at 80% 30%, rgb(34 211 238 / 0.15), transparent 70%), radial-gradient(40% 30% at 60% 70%, rgb(244 63 94 / 0.12), transparent 70%), #09090d',
        }}
      />
      <Suspense fallback={null}>
        <RiftShader grid={grid} intensity={intensity} />
      </Suspense>
    </div>
  )
}
