/*
  Scenes for "Your first Python". A Python variable is a name that points at a
  value; this scene draws exactly what the three lines below do, step by step.
*/
import type { StageElement, StageSpec } from '@/ai/stage/spec'

type G = Extract<StageElement, { type: 'graph' }>

/** marks = 72; best = marks; marks = 85 — names on the left, values on the right. */
export function namesScene(): StageSpec {
  const nodes = (show: string[], lit: string[] = []): G['nodes'] =>
    [
      { id: 'marks', label: 'marks', at: [-2.2, 0.9] as [number, number], r: 0.55, tone: 'info' as const },
      { id: 'best', label: 'best', at: [-2.2, -0.9] as [number, number], r: 0.55, tone: 'info' as const },
      { id: 'v72', label: '72', at: [2.2, 0.9] as [number, number], r: 0.5 },
      { id: 'v85', label: '85', at: [2.2, -0.9] as [number, number], r: 0.5 },
    ]
      .filter((n) => show.includes(n.id))
      .map((n) => (lit.includes(n.id) ? { ...n, tone: 'accent' as const } : n))
  const edge = (from: string, to: string) => ({ from, to })
  const set = (show: string[], edges: { from: string; to: string }[], lit: string[] = []) => [{ id: 'g', set: { nodes: nodes(show, lit), edges } }]
  return {
    version: 1,
    title: 'A variable is a name that points at a value',
    description: 'Three lines of Python drawn as names and values. marks = 72 makes the value 72 and points the name marks at it. best = marks points a second name, best, at the same 72. marks = 85 makes a new value 85 and moves only the name marks; best still points at 72.',
    dim: 2,
    camera: { position: [0, 7.6, 3], target: [0, 0, 0] },
    elements: [
      { id: 'g', type: 'graph', directed: true, nodes: nodes(['marks', 'v72']), edges: [], layout: 'given' },
      { id: 'code', type: 'code', lines: ['marks = 72', 'best = marks', 'marks = 85'], at: [0, 2.6, 0], active: -1 },
    ],
    steps: [
      { label: 'marks = 72', caption: 'Python makes the value 72, then ties the name marks to it with an arrow.', set: [...set(['marks', 'v72'], [edge('marks', 'v72')], ['v72']), { id: 'code', set: { active: 0 } }], ms: 1500 },
      { label: 'best = marks', caption: 'The right side is worked out first: marks means 72. So best points at the very same 72. Nothing is copied.', set: [...set(['marks', 'best', 'v72'], [edge('marks', 'v72'), edge('best', 'v72')], ['best']), { id: 'code', set: { active: 1 } }], ms: 1600 },
      { label: 'marks = 85', caption: 'A new value, 85. Only the name marks moves to it. best still points at 72, so best is still 72.', set: [...set(['marks', 'best', 'v72', 'v85'], [edge('marks', 'v85'), edge('best', 'v72')], ['marks', 'v85']), { id: 'code', set: { active: 2 } }], pause: true, ms: 1700 },
      { label: 'The rule', caption: 'Assignment never changes a value; it points a name at one. Keep this picture in mind: lists (later in this course) make it matter.', ms: 1200 },
    ],
  }
}
