/*
  Scene spec → frames. Frame 0 is the scene as authored (captioned by
  `intro`, else the title); frame i applies step i's patches on top of
  frame i − 1. Elements keep their order, so the renderer can key by id and
  let CSS transition whatever changed.

  Layouts: in the `narrow` layout (a scene with a second canvas, shown on
  phones) elements marked `only: "wide"` are dropped, and each element's
  `narrow` geometry is laid over every frame after the patches, so a step
  can recolour or relabel an element without undoing its phone position.
  Patches to an element that the layout does not draw are ignored.
*/
import { VIZ_NARROW_BELOW, type VizElement, type VizLayout, type VizSpec } from './schema.ts'

export interface VizFrame {
  index: number
  caption: string
  elements: VizElement[]
  /** Ids patched in this frame (the renderer draws attention to them). */
  changed: string[]
}

/** The layout to draw: narrow only when the scene has a narrow canvas and the figure is narrower than its threshold. */
export function pickLayout(spec: Pick<VizSpec, 'narrow'>, figureWidth: number): VizLayout {
  if (!spec.narrow || !(figureWidth > 0)) return 'wide'
  return figureWidth < (spec.narrow.below ?? VIZ_NARROW_BELOW) ? 'narrow' : 'wide'
}

/** viewBox size of the canvas for a layout. */
export function canvasSize(spec: VizSpec, layout: VizLayout = 'wide'): { width: number; height: number } {
  return layout === 'narrow' && spec.narrow ? { width: spec.narrow.width, height: spec.narrow.height } : { width: spec.width, height: spec.height }
}

const drawn = (el: VizElement, layout: VizLayout) => el.only === undefined || el.only === layout

/** Apply the layout's geometry override to one element (identity in the wide layout). */
function place(el: VizElement, base: VizElement | undefined, layout: VizLayout): VizElement {
  if (layout !== 'narrow' || !base?.narrow) return el
  return { ...el, ...base.narrow } as VizElement
}

export function buildFrames(spec: VizSpec, layout: VizLayout = 'wide'): VizFrame[] {
  const authored = spec.elements.filter((e) => drawn(e, layout))
  const base = new Map(authored.map((e) => [e.id, e]))
  let current = authored.map((e) => place({ ...e } as VizElement, e, layout))
  const frames: VizFrame[] = [{ index: 0, caption: spec.intro || spec.title, elements: current, changed: [] }]
  spec.steps.forEach((step, i) => {
    const patches = new Map<string, Record<string, unknown>>()
    for (const p of step.patches) if (base.has(p.id)) patches.set(p.id, { ...patches.get(p.id), ...p.set })
    current = current.map((el) => (patches.has(el.id) ? place({ ...el, ...patches.get(el.id) } as VizElement, base.get(el.id), layout) : el))
    frames.push({ index: i + 1, caption: step.caption, elements: current, changed: [...patches.keys()] })
  })
  return frames
}

/** The text alternative: every caption in order (the same in every layout). */
export function vizCaptions(spec: VizSpec): string[] {
  return buildFrames(spec).map((f) => f.caption)
}
