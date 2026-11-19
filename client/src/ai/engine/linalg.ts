/* Small, exact linear algebra for lessons: every number a scene shows is computed here. */

export type Vec = number[]
export type Mat = number[][]

export const dot = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i], 0)
export const matVec = (A: Mat, x: Vec): Vec => A.map((row) => dot(row, x))
export const transpose = (A: Mat): Mat => A[0].map((_, j) => A.map((r) => r[j]))
export const matMul = (A: Mat, B: Mat): Mat => A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)))
export const identity = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
/** (1 − t)·I + t·A: the straight path from "do nothing" to the map A. */
export const lerpMat = (A: Mat, t: number): Mat => A.map((r, i) => r.map((x, j) => (1 - t) * (i === j ? 1 : 0) + t * x))
export const norm = (v: Vec) => Math.sqrt(dot(v, v))

/**
 * Eigenvalues and eigenvectors of a symmetric matrix by the Jacobi method:
 * rotate away the largest off-diagonal entry until the matrix is diagonal.
 * Returns them sorted by eigenvalue, largest first; vectors are unit columns.
 */
export function eigSym(S: Mat, sweeps = 100): { values: number[]; vectors: Vec[] } {
  const n = S.length
  const A = S.map((r) => [...r])
  const V = identity(n)
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2
    if (off < 1e-20) break
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q])
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = A[k][p]
          const akq = A[k][q]
          A[k][p] = c * akp - s * akq
          A[k][q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k]
          const aqk = A[q][k]
          A[p][k] = c * apk - s * aqk
          A[q][k] = s * apk + c * aqk
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p]
          const vkq = V[k][q]
          V[k][p] = c * vkp - s * vkq
          V[k][q] = s * vkp + c * vkq
        }
      }
  }
  const order = A.map((r, i) => [r[i], i] as const).sort((a, b) => b[0] - a[0])
  return { values: order.map(([v]) => v), vectors: order.map(([, i]) => V.map((r) => r[i])) }
}

/** Principal component analysis: centre the data, take the covariance's eigenvectors, project. */
export function pca(X: Mat, k: number) {
  const n = X.length
  const d = X[0].length
  const mean = Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n)
  const C = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + (r[i] - mean[i]) * (r[j] - mean[j]), 0) / (n - 1)))
  const { values, vectors } = eigSym(C)
  const comps = vectors.slice(0, k)
  const total = values.reduce((s, v) => s + v, 0)
  return {
    mean,
    components: comps,
    explained: values.slice(0, k).map((v) => v / total),
    projected: X.map((r) => comps.map((c) => dot(c, r.map((x, j) => x - mean[j])))),
  }
}

/** A small seeded random generator (mulberry32), so every scene is the same on every visit. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Make the rows of M orthonormal (Gram–Schmidt), in order. */
export function orthonormalRows(M: Mat): Mat {
  const out: Mat = []
  for (const r of M) {
    let v = [...r]
    for (const u of out) {
      const d = dot(v, u)
      v = v.map((x, i) => x - d * u[i])
    }
    const n = norm(v)
    out.push(v.map((x) => x / (n || 1)))
  }
  return out
}
