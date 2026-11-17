/*
 * The "Life" profile cover (covers.tsx) runs Conway's Game of Life. Pure
 * functions, no React, so tests/cover-frames.test.js can check the rules.
 * Seeded by the profile's username, so a profile always opens on the same
 * board.
 */

/** Small, fast, seeded random numbers in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a: a seed number from a username. */
export function seedOf(text: string, round = 0): number {
  let h = 2166136261
  const s = `${text.toLowerCase()}#${round}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* ── Conway's Game of Life ──────────────────────────────────────────────── */

export function lifeSeed(seed: number, cols: number, rows: number, density = 0.3): Uint8Array {
  const r = rng(seed)
  const g = new Uint8Array(cols * rows)
  for (let i = 0; i < g.length; i++) g[i] = r() < density ? 1 : 0
  return g
}

/** One generation, on a board whose edges wrap round. */
export function lifeStep(g: Uint8Array, cols: number, rows: number): Uint8Array {
  const next = new Uint8Array(g.length)
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += g[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)]
      const alive = g[y * cols + x] === 1
      next[y * cols + x] = n === 3 || (alive && n === 2) ? 1 : 0
    }
  return next
}
