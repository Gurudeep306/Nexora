/** Small helpers shared by the algorithm definitions. */
export const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
export const rarr = (n: number, lo = 1, hi = 20) => Array.from({ length: n }, () => rint(lo, hi))
export const sorted = (a: number[]) => [...a].sort((x, y) => x - y)
export const list = (a: number[]) => a.join(' ')
