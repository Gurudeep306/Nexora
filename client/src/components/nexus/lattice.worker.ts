/// <reference lib="webworker" />
import { computeLayout, type LayoutInput, type LayoutOptions } from './lattice'

/* Computes the web's layout off the main thread (BFS, pinning, regions). */
self.onmessage = (e: MessageEvent<{ id: number; version: string; clusters: LayoutInput[]; opts?: LayoutOptions }>) => {
  const { id, version, clusters, opts } = e.data
  const layout = computeLayout(clusters, version, opts)
  ;(self as unknown as Worker).postMessage({ id, layout }, [layout.xy.buffer, layout.parent.buffer, layout.depth.buffer, layout.bucket.buffer, layout.pins.buffer, layout.levels.buffer])
}
