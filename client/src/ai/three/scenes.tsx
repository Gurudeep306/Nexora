/*
 * The first 3D scenes for the AI courses. Every number is computed by the
 * engine (client/src/ai/engine), never typed in. Each scene plays on its own
 * (Scene3D's clock): `t` is continuous time in steps, so things glide
 * between steps instead of jumping; `step` names where we are.
 */
import { useMemo, useState } from 'react'
import { DoubleSide, Matrix4, SphereGeometry } from 'three'
import { Line } from '@react-three/drei'
import { Scene3D, type SceneStep } from './Scene3D'
import { Arrow, Axes, CellGrid, Contours, Label, PathLine, Points3D, SurfaceMesh, GridWarp } from './prims'
import { toScene, type V3 } from './coords'
import { mix, type Palette3D } from './theme3d'
import { eigSym, lerpMat, orthonormalRows, pca, type Mat } from '../engine/linalg'
import { LR, OPTIMIZERS, run, SURFACES } from '../engine/optim'
import { XOR, lerpNet, pass, predict, train } from '../engine/mlp'
import { cell, conv2d, KERNELS, SEVEN } from '../engine/conv'
import { IRIS, IRIS_SPECIES } from '../data/iris'

const fmt = (v: number, d = 3) => (Math.abs(v) >= 1000 ? v.toExponential(2) : v.toFixed(d))
const surfaceColor = (p: Palette3D) => mix(p.surface, p.ink, p.dark ? 0.22 : 0.14)
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]

/** A small bead travelling along a line: a signal (forward) or a gradient (backward). */
function Bead({ at, color, r = 0.09 }: { at: V3; color: string; r?: number }) {
  return (
    <mesh position={at}>
      <sphereGeometry args={[r, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.35} />
    </mesh>
  )
}

/* ── 1. Optimisers on a loss surface ───────────────────────────────────── */

export function OptimizerRace() {
  const [sid, setSid] = useState(SURFACES[0].id)
  const s = SURFACES.find((x) => x.id === sid)!
  const N = 60
  const runs = useMemo(() => OPTIMIZERS.map((o) => ({ o, path: run(s, o.id, N, LR[s.id][o.id]) })), [s])
  const [lo, hi] = s.range
  const fmax = useMemo(() => {
    let m = 0
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) m = Math.max(m, s.f(lo + ((hi - lo) * i) / 40, lo + ((hi - lo) * j) / 40))
    return m
  }, [s, lo, hi])
  const fmin = useMemo(() => Math.min(0, ...runs.flatMap((r) => r.path.map((q) => q.f))), [runs])
  const scale = 2.6 / (fmax - fmin)
  const f = useMemo(() => (x: number, y: number) => s.f(x, y) - fmin, [s, fmin])
  const levels = useMemo(() => Array.from({ length: 12 }, (_, i) => (fmax - fmin) * 0.004 * 1.8 ** i), [fmax, fmin])
  const steps: SceneStep[] = Array.from({ length: N + 1 }, (_, k) => ({
    label: `Step ${k}`,
    note: runs.map((r) => `${r.o.name}: f = ${fmt(r.path[Math.min(k, r.path.length - 1)].f)}`).join(' · '),
  }))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a surface">
        {SURFACES.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === sid} onClick={() => setSid(x.id)} className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${x.id === sid ? 'border-text-primary text-text-primary' : 'border-border text-text-secondary hover:border-border-strong'}`}>
            {x.name}
          </button>
        ))}
      </div>
      <Scene3D
        key={sid}
        title={`Three optimisers on ${s.name.toLowerCase()}`}
        description={`A 3D surface of the loss ${s.name.toLowerCase()}, with contour lines on the floor. Three balls start at the same point and walk downhill: gradient descent, momentum and Adam, ${N} steps each. Each ball carries an arrow pointing the way the gradient says to go, and its route is traced on the floor. Every point is a real step of the algorithm.`}
        steps={steps}
        stepMs={180}
        camera={[6.8, 6.4, 8.6]}
        target={[0, 0.9, 0]}
      >
        {({ t, p }) => {
          const col = [p.ink, p.info, p.accent]
          return (
            <group>
              <SurfaceMesh f={f} range={s.range} scale={scale} color={surfaceColor(p)} line={p.strong} />
              <Contours f={f} range={s.range} levels={levels} at={-0.02} color={p.muted} />
              {runs.map((r, i) => {
                const k = Math.min(t, r.path.length - 1)
                const q = r.path[Math.floor(k)]
                const here = toScene(q.x, q.y, (q.f - fmin) * scale + 0.09)
                const g = Math.hypot(q.gx, q.gy) || 1
                const ahead = toScene(q.x - (q.gx / g) * 0.55, q.y - (q.gy / g) * 0.55, (q.f - fmin) * scale + 0.09)
                return (
                  <group key={r.o.id}>
                    <PathLine color={col[i]} upTo={k} points={r.path.map((u) => toScene(u.x, u.y, (u.f - fmin) * scale + 0.09))} />
                    <PathLine color={col[i]} upTo={k} width={1} ball={0.035} points={r.path.map((u) => toScene(u.x, u.y, -0.01))} />
                    {k < r.path.length - 1 && <Arrow from={here} to={ahead} color={col[i]} radius={0.014} />}
                  </group>
                )
              })}
              <Label at={toScene(s.start[0], s.start[1], (s.f(s.start[0], s.start[1]) - fmin) * scale + 0.45)} muted>
                start
              </Label>
            </group>
          )
        }}
      </Scene3D>
      <Legend items={[['Gradient descent', 'ink'], ['Momentum', 'info'], ['Adam', 'accent']]} />
    </div>
  )
}

/* ── 2. A matrix bending space ─────────────────────────────────────────── */

const A3 = [
  [1.4, 0.5, 0],
  [0.5, 0.9, 0.3],
  [0, 0.3, 0.6],
]
// Math (x, y, z) → scene (x, z, −y): the change of coordinates, to move the sphere in scene space.
const S_TO = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1)
const S_FROM = S_TO.clone().invert()

export function LinearMap() {
  const T = 16
  const eig = useMemo(() => eigSym(A3), [])
  const steps: SceneStep[] = Array.from({ length: T + 1 }, (_, k) => ({
    label: k === 0 ? 'The identity' : k === T ? 'The map A' : `t = ${(k / T).toFixed(2)}`,
    note: k === T ? `Eigenvalues ${eig.values.map((v) => v.toFixed(3)).join(', ')}: each eigenvector is only stretched, by its eigenvalue.` : 'Every point moves from x to ((1 − t)I + tA)x. The eigenvectors (dashed) never leave their lines.',
  }))
  return (
    <Scene3D
      title="A symmetric 3 × 3 matrix acting on space"
      description={`A lattice of lines and a unit sphere are moved by a symmetric matrix A, smoothly from the identity. The sphere becomes an ellipsoid whose axes are A's eigenvectors, stretched by eigenvalues ${eig.values.map((v) => v.toFixed(2)).join(', ')}.`}
      steps={steps}
      stepMs={260}
      camera={[4.6, 3.9, 5.8]}
    >
      {({ t, p }) => {
        const M = lerpMat(A3, t / T)
        const m4 = new Matrix4().set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1)
        const geo = new SphereGeometry(1, 32, 20).applyMatrix4(S_TO.clone().multiply(m4).multiply(S_FROM))
        return (
          <group>
            <GridWarp A={[[1, 0, 0], [0, 1, 0], [0, 0, 1]]} n={2} size={1.5} color={p.hair} opacity={0.45} />
            <GridWarp A={M} n={2} size={1.5} color={p.ink2} opacity={0.55} />
            <mesh geometry={geo}>
              <meshStandardMaterial color={surfaceColor(p)} wireframe transparent opacity={0.45} side={DoubleSide} />
            </mesh>
            {eig.vectors.map((v, i) => {
              const mv = M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
              return (
                <group key={i}>
                  <Line points={[toScene(-2.6 * v[0], -2.6 * v[1], -2.6 * v[2]), toScene(2.6 * v[0], 2.6 * v[1], 2.6 * v[2])]} color={p.accent} lineWidth={0.8} dashed dashSize={0.08} gapSize={0.06} />
                  <Arrow from={[0, 0, 0]} to={toScene(mv[0], mv[1], mv[2])} color={p.accent} />
                </group>
              )
            })}
            <Axes size={2.2} color={p.muted} />
          </group>
        )
      }}
    </Scene3D>
  )
}

/* ── 3. A network learning XOR: its output surface ─────────────────────── */

const XOR_RUN = train(1500, 0.5, 7, 50)

export function XorSurface() {
  const H = XOR_RUN.history
  const steps: SceneStep[] = H.map((h) => ({ label: `Epoch ${h.epoch}`, note: `Average loss ${h.loss.toFixed(4)} · outputs for the four inputs: ${XOR.map((d) => predict(h.net, d.x[0], d.x[1]).toFixed(2)).join(', ')}` }))
  return (
    <Scene3D
      title="A 2–3–1 network learning XOR"
      description="The network's output over the input square is drawn as a surface. The four XOR examples sit at height 0 or 1. As training goes on, the surface folds until it is high over (0,1) and (1,0) and low over (0,0) and (1,1), which no single straight boundary can do. The line on the floor is where the output is exactly one half: the network's decision boundary."
      steps={steps}
      stepMs={420}
      camera={[3.9, 3.6, 5]}
      target={[0.5, 0.6, -0.5]}
    >
      {({ step, frac, p }) => {
        const net = step + 1 < H.length ? lerpNet(H[step].net, H[step + 1].net, frac) : H[step].net
        const f = (x: number, y: number) => predict(net, x, y)
        return (
          <group>
            <SurfaceMesh f={f} range={[-0.25, 1.25]} n={48} scale={1.6} color={surfaceColor(p)} line={p.strong} lines={6} />
            <Contours f={f} range={[-0.25, 1.25]} levels={[0.5]} at={0} color={p.accent} n={70} />
            <Points3D points={XOR.map((d) => toScene(d.x[0], d.x[1], d.y * 1.6))} colors={XOR.map((d) => (d.y ? p.accent : p.ink))} r={0.06} />
            {XOR.map((d) => (
              <group key={d.x.join()}>
                <Line points={[toScene(d.x[0], d.x[1], d.y * 1.6), toScene(d.x[0], d.x[1], f(d.x[0], d.x[1]) * 1.6)]} color={p.muted} lineWidth={1} dashed dashSize={0.04} gapSize={0.04} />
                <Label at={toScene(d.x[0], d.x[1], d.y * 1.6 + 0.22)} muted>
                  ({d.x.join(', ')}) → {d.y}
                </Label>
              </group>
            ))}
            <Axes size={1.5} color={p.muted} names={['x₁', 'x₂', 'ŷ']} />
          </group>
        )
      }}
    </Scene3D>
  )
}

/* ── 4. One training step inside the network: forward, then backward ───── */

export function ForwardBackward() {
  const net = XOR_RUN.history[6].net // part-trained, so the gradients are not tiny
  const ex = XOR[1]
  const P = useMemo(() => pass(net, ex.x, ex.y), [net, ex])
  const pos: V3[][] = useMemo(
    () => [
      [toScene(-3, -0.8, 0.6), toScene(-3, 0.8, 0.6)],
      [toScene(0, -1.5, 0.6), toScene(0, 0, 0.6), toScene(0, 1.5, 0.6)],
      [toScene(3, 0, 0.6)],
    ],
    [],
  )
  const lossAt: V3 = toScene(4.6, 0, 0.6)
  const steps: SceneStep[] = [
    { label: 'The input', note: `x = (${ex.x.join(', ')}); the right answer is y = ${ex.y}.` },
    { label: 'Forward: hidden layer', note: `z₁ = W₁x + b₁ = (${P.z1.map((v) => fmt(v)).join(', ')}); a₁ = tanh(z₁) = (${P.a1.map((v) => fmt(v)).join(', ')}).` },
    { label: 'Forward: output', note: `z₂ = W₂a₁ + b₂ = ${fmt(P.z2)}; ŷ = σ(z₂) = ${fmt(P.yhat)}.` },
    { label: 'The loss', note: `Cross-entropy L = −[y log ŷ + (1 − y) log(1 − ŷ)] = ${fmt(P.loss)}.` },
    { label: 'Backward: output', note: `∂L/∂z₂ = ŷ − y = ${fmt(P.dz2)}; ∂L/∂W₂ = (∂L/∂z₂)·a₁ = (${P.dW2.map((v) => fmt(v)).join(', ')}).` },
    { label: 'Backward: hidden', note: `∂L/∂a₁ = W₂ᵀ(∂L/∂z₂); ∂L/∂z₁ = ∂L/∂a₁ ⊙ (1 − a₁²) = (${P.dz1.map((v) => fmt(v)).join(', ')}).` },
    { label: 'Backward: first weights', note: `∂L/∂W₁ = (∂L/∂z₁)xᵀ, row by row: ${P.dW1.map((r) => `(${r.map((v) => fmt(v)).join(', ')})`).join(' ')}.` },
  ]
  return (
    <Scene3D
      title="One example through the network, forward then backward"
      description={`A 2–3–1 network with its real weights. Forward: signals travel from the input (${ex.x.join(', ')}) along every connection to the hidden layer, then to the output ${fmt(P.yhat, 2)}, then the loss ${fmt(P.loss, 2)}. Backward: gradients travel back the same way to every weight. Line thickness shows each weight's size.`}
      steps={steps}
      stepMs={1800}
      camera={[0.6, 7.2, 8.2]}
    >
      {({ t, step, frac, p }) => {
        const edges: { a: V3; b: V3; w: number; layer: 1 | 2 }[] = []
        net.W1.forEach((row, i) => row.forEach((w, j) => edges.push({ a: pos[0][j], b: pos[1][i], w, layer: 1 })))
        net.W2.forEach((w, i) => edges.push({ a: pos[1][i], b: pos[2][0], w, layer: 2 }))
        // Forward values appear when their signal arrives; gradients when theirs does.
        const seenLayer = t >= 2 ? 2 : t >= 1 ? 1 : 0
        const gradOut = t >= 4
        const gradHidden = t >= 5
        const moving = frac > 0 && frac < 1
        const vals: number[][] = [ex.x, P.a1, [P.yhat]]
        return (
          <group>
            {edges.map((e, k) => {
              const fwdLit = seenLayer >= e.layer
              const backLit = (e.layer === 2 && gradOut) || (e.layer === 1 && t >= 6)
              return <Line key={k} points={[e.a, e.b]} color={backLit ? p.info : fwdLit ? p.ink : p.hair} lineWidth={0.6 + Math.min(4, Math.abs(e.w) * 1.2)} transparent opacity={fwdLit || backLit ? 0.9 : 0.5} />
            })}
            {/* The step in progress: signals moving forward, gradients moving back. */}
            {moving && step === 0 && edges.filter((e) => e.layer === 1).map((e, k) => <Bead key={k} at={lerp3(e.a, e.b, frac)} color={p.ink} />)}
            {moving && step === 1 && edges.filter((e) => e.layer === 2).map((e, k) => <Bead key={k} at={lerp3(e.a, e.b, frac)} color={p.ink} />)}
            {moving && step === 2 && <Bead at={lerp3(pos[2][0], lossAt, frac)} color={p.error} />}
            {moving && step === 3 && <Bead at={lerp3(lossAt, pos[2][0], frac)} color={p.info} />}
            {moving && step === 4 && edges.filter((e) => e.layer === 2).map((e, k) => <Bead key={k} at={lerp3(e.b, e.a, frac)} color={p.info} />)}
            {moving && step === 5 && edges.filter((e) => e.layer === 1).map((e, k) => <Bead key={k} at={lerp3(e.b, e.a, frac)} color={p.info} />)}
            {pos.map((layer, li) =>
              layer.map((at, ni) => {
                const visible = li <= seenLayer
                const g = li === 2 && gradOut ? P.dz2 : li === 1 && gradHidden ? P.dz1[ni] : null
                return (
                  <group key={`${li}-${ni}`}>
                    <mesh position={at}>
                      <sphereGeometry args={[0.2 + (visible ? Math.abs(vals[li][ni]) * 0.12 : 0), 28, 28]} />
                      <meshStandardMaterial color={g != null ? p.info : visible ? p.ink : p.strong} roughness={0.5} />
                    </mesh>
                    <Label at={[at[0], at[1] + 0.58, at[2]]} muted={!visible}>
                      {li === 0 ? `x${ni + 1} = ${vals[0][ni]}` : visible ? `${li === 1 ? 'a' : 'ŷ'} = ${fmt(vals[li][ni], 2)}` : '·'}
                      {g != null ? ` · ∂L/∂z = ${fmt(g, 3)}` : ''}
                    </Label>
                  </group>
                )
              }),
            )}
            <mesh position={lossAt}>
              <boxGeometry args={[0.34, 0.34, 0.34]} />
              <meshStandardMaterial color={t >= 3 ? p.error : p.strong} roughness={0.6} />
            </mesh>
            <Label at={[lossAt[0], lossAt[1] + 0.55, lossAt[2]]} muted={t < 3}>
              {t >= 3 ? `L = ${fmt(P.loss, 3)}` : 'loss'}
            </Label>
          </group>
        )
      }}
    </Scene3D>
  )
}

/* ── 5. Convolution, cell by cell ──────────────────────────────────────── */

export function ConvSlide() {
  const outs = useMemo(() => KERNELS.map((k) => conv2d(SEVEN, k.k)), [])
  const H = outs[0].length
  const W = outs[0][0].length
  const total = H * W
  const C = 0.3
  const inAt: V3 = [-3.3, 0, 0]
  const outAt = (k: number): V3 => [0.9 + k * 3.4, 0, 0]
  const steps: SceneStep[] = Array.from({ length: total }, (_, s) => {
    const i = Math.floor(s / W)
    const j = s % W
    return { label: `Position (${i}, ${j})`, note: KERNELS.map((k) => `${k.name}: ${cell(SEVEN, k.k, i, j)}`).join(' · ') }
  })
  // Scene position of the centre of input cell (i, j), and of output cell (i, j) of map k.
  const inCell = (i: number, j: number, y = 0): V3 => [inAt[0] + (j - 5.5) * C, y, inAt[2] + (i - 5.5) * C]
  const outCell = (k: number, i: number, j: number, y = 0): V3 => [outAt(k)[0] + (j - 4.5) * C, y, outAt(k)[2] + (i - 4.5) * C]
  return (
    <Scene3D
      title="Two 3 × 3 filters sliding over a drawn 7"
      description="On the left, a 12 × 12 image of a hand-drawn 7 as raised tiles. A 3 × 3 window glides over it; at each position two filters (vertical edges and horizontal edges) multiply the window cell by cell and add it up, and a line carries that one number to its cell in each feature map on the right. Tall tiles are strong edges."
      steps={steps}
      stepMs={140}
      camera={[0.6, 8.6, 8.4]}
      target={[0.6, 0, 0]}
    >
      {({ t, step, p }) => {
        const i = Math.floor(step / W)
        const j = step % W
        // The window glides from this position to the next along the row.
        const jj = j + (j + 1 < W ? t - step : 0)
        const win = inCell(i + 1, jj + 1, 0.5)
        const done = (a: number, b: number) => a * W + b <= step
        const frame: V3[] = [
          [win[0] - 1.5 * C, 0.42, win[2] - 1.5 * C],
          [win[0] + 1.5 * C, 0.42, win[2] - 1.5 * C],
          [win[0] + 1.5 * C, 0.42, win[2] + 1.5 * C],
          [win[0] - 1.5 * C, 0.42, win[2] + 1.5 * C],
          [win[0] - 1.5 * C, 0.42, win[2] - 1.5 * C],
        ]
        return (
          <group>
            <CellGrid grid={SEVEN} at={inAt} cell={C} height={0.3} low={mix(p.surface, p.ink, 0.08)} high={p.ink} highlight={(a, b) => a >= i && a < i + 3 && b >= j && b < j + 3} hiColor={p.accent} />
            <Line points={frame} color={p.accent} lineWidth={2.2} />
            <Label at={[inAt[0], 0.2, 2.2]} muted>
              input 12 × 12
            </Label>
            {outs.map((o, k) => (
              <group key={k}>
                <CellGrid grid={o.map((r, a) => r.map((v, b) => (done(a, b) ? v : 0)))} at={outAt(k)} cell={C} height={0.6} low={mix(p.surface, p.ink, 0.06)} high={k ? p.info : p.ink2} highlight={(a, b) => a === i && b === j} hiColor={p.accent} />
                <Line points={[win, outCell(k, i, j, 0.7)]} color={p.accent} lineWidth={1} transparent opacity={0.6} dashed dashSize={0.06} gapSize={0.05} />
                <Label at={[outAt(k)[0], 0.2, 2]} muted>
                  {KERNELS[k].name.toLowerCase()}
                </Label>
              </group>
            ))}
          </group>
        )
      }}
    </Scene3D>
  )
}

/* ── 6. PCA of the Iris flowers: turning the data to its best view ────── */

const IRIS_X = IRIS.map((d) => [d[0], d[1], d[2], d[3]])
const IRIS_PCA = pca(IRIS_X, 3)
const RAW_AXES: Mat = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
]
const RAW_NAMES: [string, string, string] = ['sepal length', 'sepal width', 'petal length']

export function IrisPca() {
  const T = 24
  const r = IRIS_PCA
  const kept = (r.explained.reduce((a, b) => a + b, 0) * 100).toFixed(1)
  const pcNames: [string, string, string] = [`PC1 (${(r.explained[0] * 100).toFixed(1)}%)`, `PC2 (${(r.explained[1] * 100).toFixed(1)}%)`, `PC3 (${(r.explained[2] * 100).toFixed(1)}%)`]
  const steps: SceneStep[] = Array.from({ length: T + 1 }, (_, k) => ({
    label: k === 0 ? 'Three of the raw measurements' : k === T ? 'The first three principal components' : `Turning: ${Math.round((k / T) * 100)}%`,
    note: k === 0 ? 'Each flower at its sepal length, sepal width and petal length (centred, in cm).' : k === T ? `The same flowers along the directions of greatest spread: ${kept}% of the variance in three numbers.` : 'At every moment this is a true projection: three orthonormal directions in 4D, turning from the raw axes to the principal axes.',
  }))
  return (
    <Scene3D
      title="150 Iris flowers, turned from raw measurements to principal components"
      description={`Each dot is one real flower. It starts at three of its raw measurements, then the view turns smoothly (a true projection at every moment) until the axes are the first three principal components, which keep ${kept}% of the variance. Setosa separates cleanly; versicolor and virginica overlap a little.`}
      steps={steps}
      stepMs={220}
      camera={[5.2, 4.2, 6.4]}
    >
      {({ t, p }) => {
        const u = t / T
        const P = orthonormalRows(RAW_AXES.map((row, i) => row.map((v, j) => (1 - u) * v + u * r.components[i][j])))
        const pts = IRIS_X.map((x) => {
          const c = x.map((v, j) => v - r.mean[j])
          const q = P.map((row) => row.reduce((s, v, j) => s + v * c[j], 0))
          return toScene(q[0], q[1], q[2])
        })
        const col = [p.ink, p.info, p.accent]
        return (
          <group>
            <Points3D points={pts} colors={IRIS.map((d) => col[d[4]])} r={0.06} />
            {IRIS_SPECIES.map((name, k) => {
              const own = pts.filter((_, i) => IRIS[i][4] === k)
              const c = [0, 1, 2].map((d) => own.reduce((s, q) => s + q[d], 0) / own.length) as V3
              return (
                <Label key={name} at={[c[0], c[1] + 0.8, c[2]]}>
                  {name}
                </Label>
              )
            })}
            <Axes size={3.4} color={p.muted} names={u < 0.5 ? RAW_NAMES : pcNames} />
          </group>
        )
      }}
    </Scene3D>
  )
}

/* ── 7. A 2D Gaussian: how the covariance shapes the bell ─────────────── */

const SX = 1.2
const SY = 0.8

export function Gaussian2D() {
  const T = 20
  const RHO = 0.85
  const steps: SceneStep[] = Array.from({ length: T + 1 }, (_, k) => {
    const rho = (RHO * k) / T
    const c = rho * Math.sqrt(SX * SY)
    const e = eigSym([
      [SX, c],
      [c, SY],
    ])
    return { label: `Correlation ρ = ${rho.toFixed(2)}`, note: `Σ = [[${SX}, ${c.toFixed(2)}], [${c.toFixed(2)}, ${SY}]]; eigenvalues ${e.values.map((v) => v.toFixed(3)).join(' and ')}.` }
  })
  return (
    <Scene3D
      title="A two-dimensional Gaussian as its correlation grows"
      description={`The density of a Gaussian with variances ${SX} and ${SY} as a surface, with contour ellipses on the floor. The correlation grows from 0 to ${RHO}: the bell narrows and tilts, and the arrows (the covariance's eigenvectors, scaled by the square roots of the eigenvalues) turn to follow the ellipse's axes.`}
      steps={steps}
      stepMs={260}
      camera={[6.2, 5.6, 7.4]}
      target={[0, 0.7, 0]}
    >
      {({ t, p }) => {
        const rho = (RHO * t) / T
        const c = rho * Math.sqrt(SX * SY)
        const det = SX * SY - c * c
        const inv = [
          [SY / det, -c / det],
          [-c / det, SX / det],
        ]
        const pdf = (x: number, y: number) => Math.exp(-0.5 * (x * (inv[0][0] * x + inv[0][1] * y) + y * (inv[1][0] * x + inv[1][1] * y))) / (2 * Math.PI * Math.sqrt(det))
        const peak = pdf(0, 0)
        const e = eigSym([
          [SX, c],
          [c, SY],
        ])
        // Height scale fixed at the start's peak, so the bell visibly rises as it narrows.
        const p0 = 1 / (2 * Math.PI * Math.sqrt(SX * SY))
        return (
          <group>
            <SurfaceMesh f={pdf} range={[-3, 3]} n={56} scale={2.2 / p0} color={surfaceColor(p)} line={p.strong} opacity={0.55} />
            <Contours f={pdf} range={[-3, 3]} levels={[0.1, 0.3, 0.5, 0.7, 0.9].map((k) => k * peak)} at={0} color={p.muted} n={70} />
            {e.vectors.map((v, i) => (
              <Arrow key={i} from={toScene(0, 0, 0.01)} to={toScene(v[0] * Math.sqrt(e.values[i]) * 2, v[1] * Math.sqrt(e.values[i]) * 2, 0.01)} color={p.accent} />
            ))}
            <Axes size={3.2} color={p.muted} names={['x₁', 'x₂', 'p(x)']} />
          </group>
        )
      }}
    </Scene3D>
  )
}

/* ── shared ── */

export function Legend({ items }: { items: [string, 'ink' | 'info' | 'accent'][] }) {
  const cls = { ink: 'bg-text-primary', info: 'bg-state-info', accent: 'bg-accent-brand' }
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px] text-text-secondary">
      {items.map(([name, c]) => (
        <li key={name} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-block size-2.5 rounded-full ${cls[c]}`} />
          {name}
        </li>
      ))}
    </ul>
  )
}
