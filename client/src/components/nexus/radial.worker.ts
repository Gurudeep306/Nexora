/// <reference lib="webworker" />
import { computeRadial, type RadialInput } from './radial'

/* Lays the radial Nexus out off the main thread. */
self.onmessage = (e: MessageEvent<{ id: number; version: string; subjects: RadialInput[] }>) => {
  const { id, version, subjects } = e.data
  const layout = computeRadial(subjects, version)
  ;(self as unknown as Worker).postMessage({ id, layout }, [layout.xy.buffer])
}
