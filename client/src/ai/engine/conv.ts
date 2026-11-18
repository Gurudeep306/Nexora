/* Convolution, computed cell by cell, exactly as a lesson shows it. */

export type Grid = number[][]

/** A 12 × 12 hand-drawn "7" (our own drawing, 0 = paper, 1 = ink). */
export const SEVEN: Grid = [
  '............',
  '..########..',
  '..########..',
  '........##..',
  '.......##...',
  '......##....',
  '.....##.....',
  '....##......',
  '....##......',
  '...##.......',
  '...##.......',
  '............',
].map((r) => [...r].map((c) => (c === '#' ? 1 : 0)))

export const KERNELS: { id: string; name: string; k: Grid }[] = [
  { id: 'vertical', name: 'Vertical edges', k: [[1, 0, -1], [1, 0, -1], [1, 0, -1]] },
  { id: 'horizontal', name: 'Horizontal edges', k: [[1, 1, 1], [0, 0, 0], [-1, -1, -1]] },
]

/** "Valid" convolution (as deep-learning libraries compute it: cross-correlation, no flip). */
export function conv2d(img: Grid, k: Grid): Grid {
  const h = img.length - k.length + 1
  const w = img[0].length - k[0].length + 1
  return Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => cell(img, k, i, j)))
}

/** One output cell: the sum of the kernel times the patch under it. */
export function cell(img: Grid, k: Grid, i: number, j: number) {
  let s = 0
  for (let a = 0; a < k.length; a++) for (let b = 0; b < k[0].length; b++) s += img[i + a][j + b] * k[a][b]
  return s
}

export const relu = (g: Grid): Grid => g.map((r) => r.map((v) => Math.max(0, v)))
