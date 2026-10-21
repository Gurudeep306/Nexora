/// <reference lib="webworker" />
import { computeLayout, type LayoutInput } from './lattice'

/* Computes the web's layout off the main thread (BFS, pinning, regions). */
self.onmessage = (e: MessageEvent<{ id: number; version: string; clusters: LayoutInput[] }>) => {
  const { id, version, clusters } = e.data
  const layout = computeLayout(clusters, version)
  ;(self as unknown as Worker).postMessage({ id, layout }, [layout.xy.buffer, layout.parent.buffer, layout.depth.buffer, layout.bucket.buffer, layout.pins.buffer, layout.levels.buffer])
}
