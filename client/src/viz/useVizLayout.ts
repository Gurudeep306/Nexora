/*
  Which canvas a scene draws in: its `narrow` canvas when the figure is
  narrower than the scene's threshold (phones), else the wide one. Measured
  on the element itself (not the window), so a scene in a narrow column
  switches too. Scenes without a narrow canvas never re-render for this.
*/
import { useEffect, useState, type RefObject } from 'react'
import type { VizLayout, VizSpec } from './schema'
import { pickLayout } from './frames'

export function useVizLayout(spec: VizSpec, ref: RefObject<HTMLElement | null>): VizLayout {
  // First guess from the viewport (the figure is at most the window minus the page gutters); the
  // effect below measures the element itself.
  const [layout, setLayout] = useState<VizLayout>(() => (typeof window === 'undefined' ? 'wide' : pickLayout(spec, window.innerWidth - 32)))
  useEffect(() => {
    const el = ref.current
    if (!spec.narrow || !el) return
    const update = () => setLayout(pickLayout(spec, el.clientWidth))
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [spec, ref])
  return spec.narrow ? layout : 'wide'
}
