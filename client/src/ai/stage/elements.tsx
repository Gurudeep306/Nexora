/*
  Drawing one Stage element: the registry picks the kit's drawer.
*/
import { REGISTRY } from './registry'
import type { StageElement } from './spec'
import type { ElCtx } from './kits/shared'

export function StageEl({ el, c }: { el: StageElement; c: ElCtx }) {
  if (el.hidden && !(el.opacity && el.opacity > 0)) return null
  const Draw = REGISTRY[el.type] as React.ComponentType<{ el: StageElement; c: ElCtx }>
  return <Draw el={el} c={c} />
}
