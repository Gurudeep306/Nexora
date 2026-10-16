/*
  Scene spec → frames. Frame 0 is the scene as authored (captioned by
  `intro`, else the title); frame i applies step i's patches on top of
  frame i − 1. Elements keep their order, so the renderer can key by id and
  let CSS transition whatever changed.
*/
import type { VizElement, VizSpec } from './schema.ts'

export interface VizFrame {
  index: number
  caption: string
  elements: VizElement[]
  /** Ids patched in this frame (the renderer draws attention to them). */
  changed: string[]
}

export function buildFrames(spec: VizSpec): VizFrame[] {
  let current = spec.elements.map((e) => ({ ...e }) as VizElement)
  const frames: VizFrame[] = [{ index: 0, caption: spec.intro || spec.title, elements: current, changed: [] }]
  spec.steps.forEach((step, i) => {
    const patches = new Map<string, Record<string, unknown>>()
    for (const p of step.patches) patches.set(p.id, { ...patches.get(p.id), ...p.set })
    current = current.map((el) => (patches.has(el.id) ? ({ ...el, ...patches.get(el.id) } as VizElement) : el))
    frames.push({ index: i + 1, caption: step.caption, elements: current, changed: [...patches.keys()] })
  })
  return frames
}

/** The text alternative: every caption in order. */
export function vizCaptions(spec: VizSpec): string[] {
  return buildFrames(spec).map((f) => f.caption)
}
