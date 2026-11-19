/*
  Scenes for "Writing functions". Every call gets its own box of variables (a
  frame) that appears when the call starts and disappears when it returns.
  The program below is traced by hand here, value for value; the lesson's
  Python example is the same program, so the reader can step through the real
  run and compare.
*/
import type { StageSpec, StageStep } from '@/ai/stage/spec'

export const FRAMES_CODE = ['def fare(km, per_km=15):', '    total = 50 + per_km * km', '    return total', '', 'a = fare(4)', 'b = fare(10, per_km=12)', 'print(a, b)']

export const fareFn = (km: number, perKm = 15) => 50 + perKm * km

export function framesScene(): StageSpec {
  const a = fareFn(4)
  const b = fareFn(10, 12)
  type Rows = (string | number)[][]
  const main = (rows: Rows) => ({ id: 'main', set: { rows: rows.length ? rows : [['(nothing yet)', '']] } })
  const call = (rows: Rows | null) => ({ id: 'call', set: rows ? { rows, hidden: false } : { hidden: true } })
  const line = (k: number) => ({ id: 'code', set: { active: k } })
  const steps: StageStep[] = [
    { label: 'def', caption: 'def only stores the function under the name fare. Nothing inside it runs yet.', set: [line(0), main([['fare', 'function']]), call(null)], ms: 1400 },
    { label: 'Call fare(4)', caption: 'Calling fare(4) opens a new box for this call: km is 4, and per_km takes its default, 15.', set: [line(1), call([['km', 4], ['per_km', 15]])], ms: 1600 },
    { label: 'total', caption: `Inside the call, total = 50 + 15 × 4 = ${a}. total lives only in this box.`, set: [line(1), call([['km', 4], ['per_km', 15], ['total', a]])], ms: 1400 },
    { label: 'return', caption: `return hands ${a} back to the line that called, and the box is thrown away: km, per_km and total are gone.`, set: [line(4), call(null), main([['fare', 'function'], ['a', a]])], ms: 1600 },
    { label: 'Call fare(10, per_km=12)', caption: 'A second call gets a brand-new box. This time per_km is given by name, so the default is not used.', set: [line(1), call([['km', 10], ['per_km', 12]])], ms: 1600 },
    { label: 'total', caption: `total = 50 + 12 × 10 = ${b}, in the new box.`, set: [line(1), call([['km', 10], ['per_km', 12], ['total', b]])], ms: 1400 },
    { label: 'return', caption: `${b} goes back and becomes b. The box disappears again.`, set: [line(5), call(null), main([['fare', 'function'], ['a', a], ['b', b]])], ms: 1600 },
    { label: 'print', caption: `Only a, b and fare are left in the main program. Each call's variables lived and died inside its own box.`, set: [line(6)], pause: true, ms: 1400 },
  ]
  return {
    version: 1,
    title: 'Each call gets its own box of variables',
    description: `A program that defines fare(km, per_km=15) and calls it twice. Each call opens a new box holding km, per_km and total; when the call returns, its value (${a}, then ${b}) goes back to the main program and the box disappears. The main program ends holding only fare, a and b.`,
    dim: 2,
    camera: { position: [0.4, 7.6, 3], target: [0.4, 0, 0] },
    elements: [
      { id: 'code', type: 'code', lines: FRAMES_CODE, at: [-2.4, 0, 0], active: -1 },
      { id: 'main', type: 'table', header: ['main program', 'value'], rows: [['(nothing yet)', '']], at: [2.4, 1.1, 0] },
      { id: 'call', type: 'table', header: ['inside this call to fare', 'value'], rows: [['', '']], at: [2.4, -1.2, 0], hidden: true },
    ],
    steps,
  }
}
