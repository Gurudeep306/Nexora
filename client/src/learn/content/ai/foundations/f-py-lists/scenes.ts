/*
  Scenes for "Lists and tuples". Names point at list objects; a list can be
  changed in place, so two names on one list both see the change, while a copy
  is a separate list. The contents shown are the ones the code makes.
*/
import type { StageElement, StageSpec, StageStep } from '@/ai/stage/spec'

type G = Extract<StageElement, { type: 'graph' }>
const W = 0.75
const GAP = 0.08
/** Centre of a tokens row of n chips whose left edge is at x0. */
const rowAt = (x0: number, n: number, y: number): [number, number, number] => [x0 + (n * W + (n - 1) * GAP) / 2, y, 0]

export const ALIAS_CODE = ['a = [72, 85]', 'b = a', 'b.append(64)', 'c = a.copy()', 'c.append(99)', 'print(a, b, c)']

export function aliasScene(): StageSpec {
  const L1y = 1.1
  const L2y = -1.1
  const names = (ids: string[]): G['nodes'] =>
    [
      { id: 'a', label: 'a', at: [-3.2, 1.6] as [number, number], r: 0.36, tone: 'info' as const },
      { id: 'b', label: 'b', at: [-3.2, 0.4] as [number, number], r: 0.36, tone: 'info' as const },
      { id: 'c', label: 'c', at: [-3.2, -1.1] as [number, number], r: 0.36, tone: 'info' as const },
      { id: 'L1', label: 'list', at: [-0.6, L1y] as [number, number], r: 0.42 },
      { id: 'L2', label: 'list', at: [-0.6, L2y] as [number, number], r: 0.42 },
    ].filter((n) => ids.includes(n.id))
  const g = (ids: string[], edges: [string, string][]) => ({ id: 'g', set: { nodes: names(ids), edges: edges.map(([from, to]) => ({ from, to })) } })
  const list1 = (items: number[], hi: number[] = []) => ({ id: 'l1', set: { tokens: items.map(String), at: rowAt(0, items.length, L1y), highlight: hi, hidden: false } })
  const list2 = (items: number[], hi: number[] = []) => ({ id: 'l2', set: { tokens: items.map(String), at: rowAt(0, items.length, L2y), highlight: hi, hidden: false } })
  const line = (k: number) => ({ id: 'code', set: { active: k } })
  const steps: StageStep[] = [
    { label: 'a = [72, 85]', caption: 'Python makes a list holding 72 and 85, and points the name a at it.', set: [g(['a', 'L1'], [['a', 'L1']]), list1([72, 85]), line(0)], ms: 1500 },
    { label: 'b = a', caption: 'b = a does not copy the list. It points a second name at the same list.', set: [g(['a', 'b', 'L1'], [['a', 'L1'], ['b', 'L1']]), line(1)], ms: 1500 },
    { label: 'b.append(64)', caption: 'append changes the list itself. There is only one list, so a sees the change too.', set: [list1([72, 85, 64], [2]), line(2)], ms: 1700 },
    { label: 'c = a.copy()', caption: 'copy() makes a second, separate list with the same items, and c points at it.', set: [g(['a', 'b', 'c', 'L1', 'L2'], [['a', 'L1'], ['b', 'L1'], ['c', 'L2']]), list1([72, 85, 64]), list2([72, 85, 64]), line(3)], ms: 1700 },
    { label: 'c.append(99)', caption: 'Changing the copy leaves the first list alone. a and b still show three items.', set: [list2([72, 85, 64, 99], [3]), line(4)], pause: true, ms: 1700 },
    { label: 'print', caption: 'a and b are two names for one list; c is another list. When a change shows up where you didn’t expect it, draw this picture.', set: [line(5)], ms: 1300 },
  ]
  return {
    version: 1,
    title: 'Two names, one list',
    description: 'Names on the left, list objects on the right. a = [72, 85] makes one list; b = a points b at the same list; appending 64 through b changes the one list, so a sees it. c = a.copy() makes a second list; appending 99 to it changes only the copy.',
    dim: 2,
    camera: { position: [0, 9.6, 2], target: [0, 0, -1.2] },
    elements: [
      { id: 'g', type: 'graph', directed: true, nodes: names(['a', 'L1']), edges: [] },
      { id: 'l1', type: 'tokens', tokens: ['72', '85'], cell: W, at: rowAt(0, 2, L1y), hidden: true },
      { id: 'l2', type: 'tokens', tokens: ['72'], cell: W, at: rowAt(0, 1, L2y), hidden: true },
      { id: 'code', type: 'code', lines: ALIAS_CODE, at: [-0.6, 3.6, 0], active: -1 },
    ],
    steps,
  }
}
