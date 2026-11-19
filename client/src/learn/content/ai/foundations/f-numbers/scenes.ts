/*
  Scenes for "Numbers, sets and intervals". Every number is computed here:
  the fractions that close in on √2 come from the recurrence
  (p, q) → (p + 2q, p + q), the set sizes are counted, the interval ends are
  the ones the captions name.
*/
import type { StageElement, StageSpec, StageStep, V3 } from '@/ai/stage/spec'

import { numberLine, sci } from '../../sceneKit.ts'
export { sciTex } from '../../sceneKit.ts'

const r4 = (v: number) => Math.round(v * 1e4) / 1e4

/* ── 1. Kinds of numbers on one line ───────────────────────────────────── */

export function kindsScene(): StageSpec {
  const groups: { id: string; tone: 'ink' | 'info' | 'warning' | 'success'; values: [number, string][] }[] = [
    { id: 'nat', tone: 'ink', values: [[1, '1'], [2, '2'], [3, '3']] },
    { id: 'int', tone: 'info', values: [[0, '0'], [-1, '−1'], [-3, '−3']] },
    { id: 'rat', tone: 'warning', values: [[0.5, '½'], [-1.75, '−7⁄4'], [2.5, '5⁄2']] },
    { id: 'real', tone: 'success', values: [[Math.SQRT2, '√2'], [Math.PI, 'π'], [-Math.E, '−e']] },
  ]
  const els: StageElement[] = [...numberLine(-4, 4)]
  for (const g of groups) {
    els.push({ id: g.id, type: 'points', points: g.values.map(([v]) => [v, 0, 0] as V3), tones: g.values.map(() => g.tone), r: 0.11, hidden: true, tips: g.values.map(([v, s]) => `${s} ≈ ${r4(v)}`) })
    g.values.forEach(([v, s], i) => els.push({ id: `${g.id}-n${i}`, type: 'label', at: [v, 0.48, 0], text: s, hidden: true }))
  }
  const show = (id: string, n: number) => [{ id, set: { hidden: false } }, ...Array.from({ length: n }, (_, i) => ({ id: `${id}-n${i}`, set: { hidden: false } }))]
  return {
    version: 1,
    title: 'Every kind of number has a place on the line',
    description: 'A number line from −4 to 4. Counting numbers 1, 2, 3 appear first; then 0 and negative whole numbers; then fractions between them (one half, minus seven quarters, five halves); then numbers no fraction can name exactly: the square root of 2, pi and minus e.',
    dim: 2,
    camera: { position: [0, 8.5, 3.2], target: [0, 0, -0.2] },
    elements: els,
    steps: [
      { label: 'An empty line', caption: 'A straight line with whole steps marked. Right is bigger, left is smaller.', ms: 900 },
      { label: 'Counting numbers', caption: 'The [counting numbers](#nat) 1, 2, 3 …: how many goats, how many marks. They are called the natural numbers, ℕ.', set: show('nat', 3), focus: ['nat', 'nat-n0', 'nat-n1', 'nat-n2'], ms: 1400 },
      { label: 'Zero and below', caption: 'A debt, or a temperature below freezing, needs [zero and negatives](#int). With them we have the integers, ℤ.', set: show('int', 3), focus: ['int', 'int-n0', 'int-n1', 'int-n2'], ms: 1400 },
      { label: 'Between the integers', caption: 'Sharing 1 roti between 2 people gives ½. Every [fraction](#rat) of two integers sits somewhere on the line: the rational numbers, ℚ.', set: show('rat', 3), focus: ['rat', 'rat-n0', 'rat-n1', 'rat-n2'], ms: 1500 },
      { label: 'Gaps no fraction fills', caption: 'Some points are not any fraction: [√2, π and −e](#real). Adding them fills every gap. All of them together are the real numbers, ℝ.', set: show('real', 3), focus: ['real', 'real-n0', 'real-n1', 'real-n2'], pause: true, ms: 1500 },
      { label: 'One line, every number', caption: 'Every point of the line is a real number, and every real number is a point of the line.', ms: 1200 },
    ],
  }
}

/* ── 2. The sets nest inside each other ───────────────────────────────── */

export function nestScene(): StageSpec {
  const rings: { id: string; name: string; rx: number; ry: number; tone: 'ink' | 'info' | 'warning' | 'success'; eg: string[] }[] = [
    { id: 'N', name: 'ℕ natural', rx: 1.1, ry: 0.7, tone: 'ink', eg: ['1', '2', '7'] },
    { id: 'Z', name: 'ℤ integers', rx: 2.1, ry: 1.3, tone: 'info', eg: ['0', '−5'] },
    { id: 'Q', name: 'ℚ rational', rx: 3.1, ry: 1.9, tone: 'warning', eg: ['½', '−0.25'] },
    { id: 'R', name: 'ℝ real', rx: 4.1, ry: 2.5, tone: 'success', eg: ['√2', 'π'] },
  ]
  const els: StageElement[] = []
  const egAt: [number, number][][] = [
    [[-0.45, 0.1], [0.35, 0.25], [0.1, -0.35]],
    [[-1.55, 0.25], [1.5, -0.3]],
    [[-2.55, 0.35], [2.45, -0.5]],
    [[-3.55, 0.4], [3.45, -0.6]],
  ]
  rings.forEach((r, k) => {
    els.push({ id: r.id, type: 'shape', kind: 'ellipse', size: [r.rx, r.ry], at: [0, 0, 0], tone: r.tone, width: 2, hidden: true })
    els.push({ id: `${r.id}-name`, type: 'label', at: [0, r.ry - 0.28, 0], text: r.name, tone: 'muted', hidden: true })
    r.eg.forEach((t, i) => els.push({ id: `${r.id}-e${i}`, type: 'label', at: [egAt[k][i][0], egAt[k][i][1], 0], text: t, hidden: true }))
  })
  const show = (k: number) => [rings[k].id, `${rings[k].id}-name`, ...rings[k].eg.map((_, i) => `${rings[k].id}-e${i}`)].map((id) => ({ id, set: { hidden: false } }))
  return {
    version: 1,
    title: 'Each kind of number contains the one before',
    description: 'Four nested ovals. The innermost is the natural numbers; around it the integers, then the rational numbers, then the real numbers. Each oval holds examples that belong to it but not to the ovals inside it.',
    dim: 2,
    camera: { position: [0, 8.2, 3.4], target: [0, 0, 0] },
    elements: els,
    steps: rings.map((r, k) => ({
      label: r.name,
      caption: k === 0 ? 'Start with the [counting numbers](#N).' : `The [${r.name.split(' ')[1]}](#${r.id}) contain everything inside, and more: ${r.eg.join(' and ')}.`,
      tex: ['\\mathbb N = \\{1, 2, 3, \\dots\\}', '\\mathbb N \\subset \\mathbb Z = \\{\\dots, -2, -1, 0, 1, 2, \\dots\\}', '\\mathbb Z \\subset \\mathbb Q = \\{\\tfrac{p}{q} : p, q \\in \\mathbb Z,\\ q \\ne 0\\}', '\\mathbb N \\subset \\mathbb Z \\subset \\mathbb Q \\subset \\mathbb R'][k],
      set: show(k),
      ms: 1500,
      pause: k === rings.length - 1,
    })),
  }
}

/* ── 3. Fractions close in on √2 but never reach it ───────────────────── */

/** The fractions p/q from (1, 1) by (p, q) → (p + 2q, p + q): each is closer to √2. */
export function sqrt2Fractions(n: number): { p: number; q: number; v: number; err: number; pell: number }[] {
  const out = []
  let [p, q] = [1, 1]
  for (let i = 0; i < n; i++) {
    out.push({ p, q, v: p / q, err: Math.abs(p / q - Math.SQRT2), pell: p * p - 2 * q * q })
    ;[p, q] = [p + 2 * q, p + q]
  }
  return out
}

export function sqrt2Scene(): StageSpec {
  const fr = sqrt2Fractions(10)
  const S = 22 // scene units per 1 on the zoomed number line
  const X = (v: number) => (v - 1.42) * S
  const els: StageElement[] = [
    { id: 'axis', type: 'line', points: [[X(0.98), 0, 0], [X(1.53), 0, 0]], tone: 'ink', width: 1.6 },
    ...[1, 1.1, 1.2, 1.3, 1.4, 1.5].map((v, i): StageElement => ({ id: `tk${i}`, type: 'label', at: [X(v), -0.45, 0], text: v.toFixed(1), tone: 'muted' })),
    ...[1, 1.1, 1.2, 1.3, 1.4, 1.5].map((v, i): StageElement => ({ id: `tl${i}`, type: 'line', points: [[X(v), -0.1, 0], [X(v), 0.1, 0]], tone: 'ink' })),
    { id: 'root', type: 'line', points: [[X(Math.SQRT2), -0.25, 0], [X(Math.SQRT2), 1.3, 0]], tone: 'success', width: 2, dashed: true },
    { id: 'rootl', type: 'label', at: [X(Math.SQRT2), 1.55, 0], text: '√2' },
    ...fr.slice(0, 4).flatMap((f, i): StageElement[] => [
      { id: `f${i}`, type: 'points', points: [[X(f.v), 0, 0]], tones: ['warning'], r: 0.14, hidden: true, tips: [`${f.p}/${f.q} = ${r4(f.v)}`] },
      { id: `fl${i}`, type: 'label', at: [X(f.v), i % 2 ? -1.05 : 0.6, 0], text: `${f.p}/${f.q}`, hidden: true },
    ]),
    { id: 'err', type: 'chart', kind: 'line', at: [-6.6, -5.4, 0], size: [5.2, 2.6], series: [fr.map((f) => f.err)], xs: fr.map((_, i) => i + 1), logY: true, names: ['distance to √2'], xLabel: 'fraction number', hidden: true },
  ]
  const steps: StageStep[] = [
    { label: 'Close up near √2', caption: 'The line between 1 and 1.5, stretched out. The dashed mark is [√2](#root), the number whose square is 2.', tex: '\\sqrt 2 \\times \\sqrt 2 = 2', ms: 1000 },
    ...fr.slice(0, 4).map((f, i): StageStep => ({
      label: `${f.p}/${f.q}`,
      caption: i === 0 ? 'Try the fraction 1/1. Its square is 1: too small.' : `Next, ${f.p}/${f.q}. It lands ${f.v > Math.SQRT2 ? 'just above' : 'just below'} √2, closer than before.`,
      tex: `\\left(\\tfrac{${f.p}}{${f.q}}\\right)^2 = \\tfrac{${f.p * f.p}}{${f.q * f.q}} = ${r4(f.v * f.v)}`,
      set: [{ id: `f${i}`, set: { hidden: false } }, { id: `fl${i}`, set: { hidden: false } }],
      focus: [`f${i}`, `fl${i}`, 'root', 'rootl'],
      ms: 1400,
    })),
    {
      label: 'Closer, never equal',
      caption: `Keep going. The [distance](#err) shrinks about 6 times with each fraction (the chart’s scale is in powers of 10), but it never reaches 0. The tenth fraction, ${fr[9].p}/${fr[9].q}, is still ${sci(fr[9].err)} away.`,
      tex: `p^2 - 2q^2 = \\pm 1 \\text{ for every fraction here, never } 0`,
      set: [{ id: 'err', set: { hidden: false } }],
      view: { camera: [-3.4, 12.5, 8.4], target: [-3.4, 0, 2.4] },
      pause: true,
      ms: 1800,
    },
  ]
  return {
    version: 1,
    title: 'Fractions close in on √2 but never land on it',
    description: `The number line between 1 and 1.5, stretched out, with √2 marked. Fractions 1/1, 3/2, 7/5 and 12/17 appear, each closer to √2. A chart then shows the distance from the first ten such fractions to √2 shrinking, on a scale of powers of ten, without ever reaching zero.`.replace('12/17', `${fr[3].p}/${fr[3].q}`),
    dim: 2,
    camera: { position: [-3.4, 10, 4.2], target: [-3.4, 0, -0.3] },
    elements: els,
    steps,
  }
}

/* ── 4. Intervals: stretches of the line, with or without their ends ─── */

export function intervalsScene(): StageSpec {
  const rows: { lo: number; hi: number; loIn: boolean; hiIn: boolean; name: string; say: string }[] = [
    { lo: 1, hi: 4, loIn: true, hiIn: true, name: '[1, 4]', say: 'Closed: both ends belong. Square brackets, filled dots.' },
    { lo: 1, hi: 4, loIn: false, hiIn: false, name: '(1, 4)', say: 'Open: neither end belongs. Round brackets, hollow dots. 1.0001 is in it; 1 is not.' },
    { lo: 1, hi: 4, loIn: true, hiIn: false, name: '[1, 4)', say: 'Half-open: 1 belongs, 4 does not.' },
    { lo: 2, hi: Infinity, loIn: true, hiIn: false, name: '[2, ∞)', say: 'From 2 forever to the right. ∞ is not a number, so its side is always round.' },
  ]
  const els: StageElement[] = [...numberLine(-1, 6, 0, 1)]
  rows.forEach((r, k) => {
    const y = 1.0 + (rows.length - 1 - k) * 0.9
    const end = Number.isFinite(r.hi) ? r.hi : 6.4
    els.push({ id: `seg${k}`, type: 'line', points: [[r.lo, y, 0], [end, y, 0]], tone: 'info', width: 5, hidden: true })
    if (!Number.isFinite(r.hi)) els.push({ id: `inf${k}`, type: 'arrow', from: [5.6, y, 0], to: [6.6, y, 0], tone: 'info', r: 0.03, hidden: true })
    els.push({ id: `lo${k}`, type: 'shape', kind: 'circle', at: [r.lo, y, 0], size: [0.13], fill: r.loIn, tone: 'info', width: 2.4, hidden: true })
    if (Number.isFinite(r.hi)) els.push({ id: `hi${k}`, type: 'shape', kind: 'circle', at: [r.hi, y, 0], size: [0.13], fill: r.hiIn, tone: 'info', width: 2.4, hidden: true })
    els.push({ id: `nm${k}`, type: 'label', at: [-1.9, y, 0], text: r.name, hidden: true })
  })
  return {
    version: 1,
    title: 'Intervals: a stretch of the number line',
    description: 'A number line from −1 to 6 with four intervals drawn above it: [1, 4] with both ends filled, (1, 4) with both ends hollow, [1, 4) with the left end filled and the right hollow, and [2, ∞) starting filled at 2 and running off to the right.',
    dim: 2,
    camera: { position: [2.2, 9.5, 2.4], target: [2.2, 0, -2.2] },
    elements: els,
    steps: rows.map((r, k) => ({
      label: r.name,
      caption: r.say,
      tex: [
        '[1, 4] = \\{x \\in \\mathbb R : 1 \\le x \\le 4\\}',
        '(1, 4) = \\{x \\in \\mathbb R : 1 < x < 4\\}',
        '[1, 4) = \\{x \\in \\mathbb R : 1 \\le x < 4\\}',
        '[2, \\infty) = \\{x \\in \\mathbb R : x \\ge 2\\}',
      ][k],
      set: [`seg${k}`, `lo${k}`, `hi${k}`, `nm${k}`, `inf${k}`].filter((id) => els.some((e) => e.id === id)).map((id) => ({ id, set: { hidden: false } })),
      focus: [`seg${k}`, `lo${k}`, `hi${k}`, `nm${k}`, `inf${k}`].filter((id) => els.some((e) => e.id === id)),
      ms: 1500,
      pause: k === rows.length - 1,
    })),
  }
}

/* ── 5. Sets of students: union, intersection, difference ─────────────── */

export const PASSED_MATHS = [1, 2, 3, 5, 8]
export const PASSED_PHYSICS = [2, 3, 4, 8, 9]
export const CLASS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function setOpsScene(): StageSpec {
  const A = new Set(PASSED_MATHS)
  const B = new Set(PASSED_PHYSICS)
  const inter = CLASS.filter((x) => A.has(x) && B.has(x))
  const uni = CLASS.filter((x) => A.has(x) || B.has(x))
  const diff = CLASS.filter((x) => A.has(x) && !B.has(x))
  // Where each roll number sits: A only, both, B only, neither.
  const slots: Record<string, [number, number][]> = {
    a: [[-1.75, 0.45], [-1.6, -0.5], [-1.95, 0]],
    ab: [[0, 0.65], [0, 0], [0, -0.65]],
    b: [[1.75, 0.45], [1.6, -0.5], [1.95, 0]],
    none: [[-3.2, 1.75], [3.2, 1.75], [0, -2.2]],
  }
  const used: Record<string, number> = { a: 0, ab: 0, b: 0, none: 0 }
  const els: StageElement[] = [
    { id: 'reg', type: 'region', f: '(1 + sign(1.55 - hypot(x + 0.9, y))) / 2 + (1 + sign(1.55 - hypot(x - 0.9, y)))', range: [-4, 4], classes: 4, tones: ['hair', 'hair', 'hair', 'hair'], boundary: false },
    { id: 'A', type: 'shape', kind: 'circle', at: [-0.9, 0, 0], size: [1.55], tone: 'info', width: 2 },
    { id: 'B', type: 'shape', kind: 'circle', at: [0.9, 0, 0], size: [1.55], tone: 'warning', width: 2 },
    { id: 'Al', type: 'label', at: [-2.1, 1.65, 0], text: 'A: passed maths' },
    { id: 'Bl', type: 'label', at: [2.1, 1.65, 0], text: 'B: passed physics' },
    { id: 'box', type: 'shape', kind: 'rect', at: [0, 0, 0], size: [7.8, 5.2], tone: 'muted', width: 1.2 },
    { id: 'Ul', type: 'label', at: [-3.3, -2.3, 0], text: 'the class', tone: 'muted' },
  ]
  for (const x of CLASS) {
    const k = A.has(x) && B.has(x) ? 'ab' : A.has(x) ? 'a' : B.has(x) ? 'b' : 'none'
    const [px, py] = slots[k][used[k]++]
    els.push({ id: `s${x}`, type: 'label', at: [px, py, 0], text: String(x) })
  }
  const shade = (t: ('hair' | 'info' | 'warning' | 'accent' | 'success')[]) => [{ id: 'reg', set: { tones: t } }]
  return {
    version: 1,
    title: 'Two sets of students',
    description: `A class of ten students, roll numbers 1 to 10. Set A holds those who passed maths (${PASSED_MATHS.join(', ')}); set B those who passed physics (${PASSED_PHYSICS.join(', ')}). The overlap (${inter.join(', ')}) passed both; together (${uni.length} students) is the union; ${diff.join(' and ')} passed only maths.`,
    dim: 2,
    camera: { position: [0, 8.6, 3.2], target: [0, 0, 0] },
    elements: els,
    steps: [
      { label: 'Two groups', caption: 'Ten students. Circle [A](#A) holds those who passed maths, circle [B](#B) those who passed physics.', tex: `A = \\{${PASSED_MATHS.join(', ')}\\},\\quad B = \\{${PASSED_PHYSICS.join(', ')}\\}`, ms: 1200 },
      { label: 'Both: A ∩ B', caption: 'Who passed both? The students inside both circles: the intersection.', tex: `A \\cap B = \\{${inter.join(', ')}\\},\\quad |A \\cap B| = ${inter.length}`, set: shade(['hair', 'hair', 'hair', 'accent']), ms: 1400 },
      { label: 'Either: A ∪ B', caption: 'Who passed at least one? Everyone inside either circle: the union.', tex: `A \\cup B = \\{${uni.join(', ')}\\},\\quad |A \\cup B| = ${uni.length}`, set: shade(['hair', 'success', 'success', 'success']), ms: 1400 },
      { label: 'Only maths: A \\ B', caption: 'In A but not in B: the difference.', tex: `A \\setminus B = \\{${diff.join(', ')}\\}`, set: shade(['hair', 'info', 'hair', 'hair']), ms: 1400 },
      { label: 'Count without double-counting', caption: `Adding |A| + |B| counts the overlap twice, so take it away once: ${A.size} + ${B.size} − ${inter.length} = ${uni.length}.`, tex: `|A \\cup B| = |A| + |B| - |A \\cap B| = ${A.size} + ${B.size} - ${inter.length} = ${uni.length}`, set: shade(['hair', 'success', 'success', 'accent']), pause: true, ms: 1500 },
    ],
  }
}

/* ── 6. One number, two numbers, three numbers: a point on a line, in a plane, in space ── */

export function spacesScene(): StageSpec {
  const marks: [number, number, number] = [72, 85, 64]
  const s = 1 / 25 // marks → scene units
  const [m, p, c] = marks.map((v) => v * s)
  return {
    version: 1,
    title: 'One, two, three numbers: a line, a plane, space',
    description: `One student's marks: ${marks[0]} in maths, ${marks[1]} in physics, ${marks[2]} in chemistry. One mark is a point on a line; two marks are a point in the plane; three marks are a point in space.`,
    dim: 2,
    camera: { position: [5.5, 6.5, 6.5], target: [1.6, 0.8, -1.4] },
    elements: [
      { id: 'ax', type: 'axes', size: 4.2, names: ['maths', 'physics', 'chemistry'] },
      { id: 'pt1', type: 'points', points: [[m, 0, 0]], tones: ['accent'], r: 0.12, tips: [`maths ${marks[0]}`] },
      { id: 'pt2', type: 'points', points: [[m, p, 0]], tones: ['accent'], r: 0.12, hidden: true, tips: [`(${marks[0]}, ${marks[1]})`] },
      { id: 'g1', type: 'line', points: [[m, 0, 0], [m, p, 0]], dashed: true, hidden: true },
      { id: 'g2', type: 'line', points: [[0, p, 0], [m, p, 0]], dashed: true, hidden: true },
      { id: 'pt3', type: 'points', points: [[m, p, c]], tones: ['accent'], r: 0.13, hidden: true, tips: [`(${marks.join(', ')})`] },
      { id: 'g3', type: 'line', points: [[m, p, 0], [m, p, c]], dashed: true, hidden: true },
      { id: 'lab', type: 'label', at: [m + 0.2, 0.2, 0], text: `${marks[0]}` },
    ],
    steps: [
      { label: 'One number', caption: 'One mark, 72 in maths, is a point on a line: a member of ℝ.', tex: `${marks[0]} \\in \\mathbb R`, ms: 1200 },
      { label: 'Two numbers', caption: 'Add physics. The pair is a point in the plane: a member of ℝ², the set of all pairs of real numbers.', tex: `(${marks[0]}, ${marks[1]}) \\in \\mathbb R^2`, set: [{ id: 'pt1', set: { hidden: true } }, { id: 'pt2', set: { hidden: false } }, { id: 'g1', set: { hidden: false } }, { id: 'g2', set: { hidden: false } }, { id: 'lab', set: { hidden: true } }], ms: 1500 },
      { label: 'Three numbers', caption: 'Add chemistry. Three numbers need a third direction: up. The triple is a point in space, a member of ℝ³.', tex: `(${marks.join(', ')}) \\in \\mathbb R^3`, set: [{ id: 'pt2', set: { hidden: true } }, { id: 'pt3', set: { hidden: false } }, { id: 'g3', set: { hidden: false } }], dim: 3, ms: 2200 },
      { label: 'Any number of numbers', caption: 'An AI model often reads hundreds of numbers at once. We can’t draw ℝ⁷⁸⁴, but it works the same way: one direction per number.', tex: '(x_1, x_2, \\dots, x_n) \\in \\mathbb R^n', pause: true, ms: 1400 },
    ],
  }
}
