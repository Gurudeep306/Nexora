/*
  Scenes for "Text: strings". A string is a row of characters, each with two
  addresses: its position from the left (0, 1, 2 …) and from the right
  (−1, −2 …). The slices shown are the ones the captions name.
*/
import type { StageElement, StageSpec, StageStep } from '@/ai/stage/spec'

const WORD = 'NEXORA'
const W = 0.9
const GAP = 0.08

/** The x of chip i in a tokens row of n chips (matches the tokens kit's layout). */
const chipX = (i: number, n: number) => i * (W + GAP) - (n * W + (n - 1) * GAP) / 2 + W / 2

export function indexScene(): StageSpec {
  const n = WORD.length
  const chars = WORD.split('')
  const els: StageElement[] = [{ id: 's', type: 'tokens', tokens: chars, cell: W, at: [0, 0, 0] }]
  chars.forEach((_, i) => {
    els.push({ id: `p${i}`, type: 'label', at: [chipX(i, n), 0.55, 0], text: String(i), tone: 'muted' })
    els.push({ id: `m${i}`, type: 'label', at: [chipX(i, n), -0.55, 0], text: `−${n - i}`, tone: 'muted', hidden: true })
  })
  const slice = (a: number, b: number, step = 1) => {
    const out: number[] = []
    if (step > 0) for (let i = a; i < b; i += step) out.push(i)
    else for (let i = a; i > b; i += step) out.push(i)
    return out
  }
  const show = (lab: string, code: string, idx: number[], say: string, extra: StageStep['set'] = []): StageStep => ({
    label: lab,
    caption: say,
    tex: `\\texttt{${code}} \\;\\to\\; \\texttt{"${idx.map((i) => chars[i]).join('')}"}`,
    set: [{ id: 's', set: { highlight: idx } }, ...extra],
    ms: 1500,
  })
  return {
    version: 1,
    title: 'A string is a row of characters with numbered places',
    description: `The string "${WORD}" as six boxes, one character each. Above each box is its index from the left, 0 to 5; below, its index from the right, −6 to −1. Single characters and slices light up as each expression picks them out.`,
    dim: 2,
    camera: { position: [0, 7, 2.6], target: [0, 0, 0] },
    elements: els,
    steps: [
      { label: 'Six characters', caption: `The string "${WORD}" is six characters in a row. Counting starts at 0, so the places are 0 to 5.`, ms: 1300 },
      show('s[0]', 's[0]', [0], 'Square brackets with one number pick one character: s[0] is the first.'),
      show('s[3]', 's[3]', [3], 's[3] is the fourth character: counting from 0 means the index is one less than its place.'),
      show('s[-1]', 's[-1]', [n - 1], 'Negative numbers count from the right: s[-1] is always the last character.', chars.map((_, i) => ({ id: `m${i}`, set: { hidden: false } }))),
      show('s[1:4]', 's[1:4]', slice(1, 4), 'A slice s[a:b] takes from index a up to, but not including, b: 1, 2 and 3.'),
      show('s[:3]', 's[:3]', slice(0, 3), 'Leave out the start and it begins at 0.'),
      show('s[3:]', 's[3:]', slice(3, n), 'Leave out the end and it runs to the end.'),
      show('s[::2]', 's[::2]', slice(0, n, 2), 'A third number is the step: every second character.'),
      { ...show('s[::-1]', 's[::-1]', slice(n - 1, -1, -1), 'A step of −1 walks backwards: the whole string reversed.'), pause: true },
    ],
  }
}
