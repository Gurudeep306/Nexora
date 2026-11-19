/*
 * The first 3D scenes for the AI courses. Every number is computed by the
 * engine (client/src/ai/engine), never typed in. Each scene plays on its own
 * (Scene3D's clock): `t` is continuous time in steps, so things glide
 * between steps; `step` names where we are. Steps carry their formula with
 * the real numbers filled in, a camera view, what to focus on, and reading
 * breaks, the way the best explorable explanations do it.
 */
import { useMemo, useState } from 'react'
import { DoubleSide, Matrix4, SphereGeometry } from 'three'
import { Line } from '@react-three/drei'
import { Scene3D, type SceneStep } from './Scene3D'
import { Arrow, Axes, CellGrid, Contours, Label, PathLine, Points3D, SurfaceMesh, GridWarp } from './prims'
import { toScene, type V3 } from './coords'
import { mix, type Palette3D } from './theme3d'
import { eigSym, lerpMat, orthonormalRows, pca, type Mat as Matrix } from '../engine/linalg'
import { LR, OPTIMIZERS, run, SURFACES } from '../engine/optim'
import { XOR, lerpNet, pass, predict, train } from '../engine/mlp'
import { cell, conv2d, KERNELS, SEVEN } from '../engine/conv'
import { IRIS, IRIS_SPECIES } from '../data/iris'
import { Mat } from './studio'

/** A number for display; rounds a tiny negative to 0 instead of showing "−0.000". */
const fmt = (v: number, d = 3) => (Math.abs(v) >= 1000 ? v.toExponential(2) : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d))
const surfaceColor = (p: Palette3D) => mix(p.surface, p.ink, p.dark ? 0.22 : 0.14)
/** Height colour for surfaces: paper at the bottom, ochre at the top (one hue, so it reads as "how high"). */
const heightRamp = (p: Palette3D): [string, string] => [mix(p.surface, p.ink, p.dark ? 0.16 : 0.07), mix(p.surface, p.warning, p.dark ? 0.6 : 0.62)]
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const tv = (v: number[], d = 3) => `\\begin{pmatrix}${v.map((x) => fmt(x, d)).join('\\\\')}\\end{pmatrix}`
const tm = (m: number[][], d = 2) => `\\begin{pmatrix}${m.map((r) => r.map((x) => fmt(x, d)).join('&')).join('\\\\')}\\end{pmatrix}`

/** A small bead travelling along a line: a signal (forward) or a gradient (backward). */
function Bead({ at, color, r = 0.09 }: { at: V3; color: string; r?: number }) {
  return (
    <mesh position={at}>
      <sphereGeometry args={[r, 16, 16]} />
      <Mat color={color} roughness={0.35} />
    </mesh>
  )
}

function Chips<T extends string | number>({ label, items, value, onChange }: { label: string; items: { id: T; name: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <span className="mr-1 text-[12.5px] text-text-muted">{label}</span>
      {items.map((x) => (
        <button key={String(x.id)} type="button" aria-pressed={x.id === value} onClick={() => onChange(x.id)} className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${x.id === value ? 'border-text-primary text-text-primary' : 'border-border text-text-secondary hover:border-border-strong'}`}>
          {x.name}
        </button>
      ))}
    </div>
  )
}

/* ── 1. Optimisers on a loss surface ───────────────────────────────────── */

export function OptimizerRace() {
  const [sid, setSid] = useState(SURFACES[0].id)
  const [start, setStart] = useState<[number, number] | null>(null)
  const [lrMul, setLrMul] = useState(1)
  const s = SURFACES.find((x) => x.id === sid)!
  const from = start ?? s.start
  const N = 60
  const runs = useMemo(() => OPTIMIZERS.map((o) => ({ o, lr: LR[s.id][o.id] * lrMul, path: run(s, o.id, N, LR[s.id][o.id] * lrMul, from) })), [s, lrMul, from])
  const [lo, hi] = s.range
  // The surface's lowest and highest values over the square shown (the saddle goes below zero).
  const [fmin, fmax] = useMemo(() => {
    let mn = Infinity
    let mx = -Infinity
    for (let i = 0; i <= 60; i++)
      for (let j = 0; j <= 60; j++) {
        const v = s.f(lo + ((hi - lo) * i) / 60, lo + ((hi - lo) * j) / 60)
        mn = Math.min(mn, v)
        mx = Math.max(mx, v)
      }
    return [mn, mx]
  }, [s, lo, hi])
  const scale = 2.6 / (fmax - fmin)
  const f = useMemo(() => (x: number, y: number) => s.f(x, y) - fmin, [s, fmin])
  const levels = useMemo(() => Array.from({ length: 12 }, (_, i) => (fmax - fmin) * 0.004 * 1.8 ** i), [fmax, fmin])
  const gd = runs[0]
  const steps: SceneStep[] = Array.from({ length: N + 1 }, (_, k) => {
    const q = gd.path[Math.min(k, gd.path.length - 1)]
    const q2 = gd.path[Math.min(k + 1, gd.path.length - 1)]
    return {
      label: `Step ${k}`,
      note: runs.map((r) => `${r.o.name}: f = ${fmt(r.path[Math.min(k, r.path.length - 1)].f)}`).join(' · '),
      tex: `\\text{Gradient descent: }\\boldsymbol\\theta_{${k + 1}} = \\boldsymbol\\theta_{${k}} - \\eta\\,\\nabla f = \\begin{pmatrix}${fmt(q.x)}\\\\${fmt(q.y)}\\end{pmatrix} - ${fmt(gd.lr, 3)}\\begin{pmatrix}${fmt(q.gx)}\\\\${fmt(q.gy)}\\end{pmatrix} = \\begin{pmatrix}${fmt(q2.x)}\\\\${fmt(q2.y)}\\end{pmatrix}`,
    }
  })
  const lim = s.range[1] * 0.98
  return (
    <div className="space-y-2">
      <Chips
        label="Surface"
        items={SURFACES.map((x) => ({ id: x.id, name: x.name }))}
        value={sid}
        onChange={(v) => {
          setSid(v)
          setStart(null)
        }}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-secondary">
        <label className="inline-flex items-center gap-2">
          Learning rate × {lrMul.toFixed(2)}
          <input type="range" min={0.25} max={2} step={0.25} value={lrMul} onChange={(e) => setLrMul(Number(e.target.value))} className="ai3d-scrub" />
        </label>
        <span>Click anywhere on the surface to start the three balls there.</span>
        {start && (
          <button type="button" className="underline underline-offset-[3px] hover:text-text-primary" onClick={() => setStart(null)}>
            Back to the first start
          </button>
        )}
      </div>
      <Scene3D
        key={sid}
        resetKey={`${from.join()}:${lrMul}`}
        title={`Three optimisers on ${s.name.toLowerCase()}`}
        description={`A 3D surface of the loss ${s.name.toLowerCase()}, coloured by height, with contour lines on the floor. Three balls start at the same point and walk downhill: gradient descent, momentum and Adam, ${N} steps each. Each ball carries an arrow pointing the way the gradient says to go, and its route is traced on the floor. Every point is a real step of the algorithm. Click the surface to start somewhere else.`}
        steps={steps}
        stepMs={200}
        camera={[6.8, 6.4, 8.6]}
        target={[0, 0.9, 0]}
      >
        {({ t, p, tip }) => {
          const col = [p.ink, p.info, p.accent]
          return (
            <group>
              <SurfaceMesh
                f={f}
                range={s.range}
                scale={scale}
                color={surfaceColor(p)}
                ramp={heightRamp(p)}
                line={p.strong}
                onPick={(x, y) => setStart([Math.max(-lim, Math.min(lim, x)), Math.max(-lim, Math.min(lim, y))])}
                onTip={(e, x, y) => tip(e, e ? `x = ${fmt(x, 2)}, y = ${fmt(y, 2)}\nf = ${fmt(s.f(x, y))}` : undefined)}
              />
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
              <Label at={toScene(from[0], from[1], (s.f(from[0], from[1]) - fmin) * scale + 0.45)} muted>
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
    tex: `(1-t)\\,I + t\\,A = ${tm(lerpMat(A3, k / T))}`,
    pause: k === T,
  }))
  return (
    <Scene3D
      title="A symmetric 3 × 3 matrix acting on space"
      description={`A lattice of lines and a unit sphere are moved by a symmetric matrix A, smoothly from the identity. The sphere becomes an ellipsoid whose axes are A's eigenvectors, stretched by eigenvalues ${eig.values.map((v) => v.toFixed(2)).join(', ')}.`}
      steps={steps}
      stepMs={300}
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
              <Mat color={surfaceColor(p)} wireframe transparent opacity={0.45} side={DoubleSide} />
            </mesh>
            {eig.vectors.map((v, i) => {
              const mv = M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
              return (
                <group key={i}>
                  <Line points={[toScene(-2.6 * v[0], -2.6 * v[1], -2.6 * v[2]), toScene(2.6 * v[0], 2.6 * v[1], 2.6 * v[2])]} color={p.accent} lineWidth={0.8} dashed dashSize={0.08} gapSize={0.06} />
                  <Arrow from={[0, 0, 0]} to={toScene(mv[0], mv[1], mv[2])} color={p.accent} />
                  <Label at={toScene(mv[0] * 1.15, mv[1] * 1.15, mv[2] * 1.15)} muted>
                    λ{i + 1} = {fmt(eig.values[i], 2)}
                  </Label>
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
  const steps: SceneStep[] = H.map((h) => ({
    label: `Epoch ${h.epoch}`,
    note: `Outputs for the four inputs: ${XOR.map((d) => predict(h.net, d.x[0], d.x[1]).toFixed(2)).join(', ')}`,
    tex: `\\bar L = \\tfrac14 \\sum_{i=1}^{4} \\ell\\big(\\hat y^{(i)}, y^{(i)}\\big) = ${fmt(h.loss, 4)}`,
  }))
  return (
    <Scene3D
      title="A 2–3–1 network learning XOR"
      description="The network's output over the input square is drawn as a surface. The four XOR examples sit at height 0 or 1. As training goes on, the surface folds until it is high over (0,1) and (1,0) and low over (0,0) and (1,1), which no single straight boundary can do. The line on the floor is where the output is exactly one half: the network's decision boundary."
      steps={steps}
      stepMs={420}
      camera={[3.9, 3.6, 5]}
      target={[0.5, 0.6, -0.5]}
    >
      {({ step, frac, p, tip }) => {
        const net = step + 1 < H.length ? lerpNet(H[step].net, H[step + 1].net, frac) : H[step].net
        const f = (x: number, y: number) => predict(net, x, y)
        return (
          <group>
            <SurfaceMesh f={f} range={[-0.25, 1.25]} n={48} scale={1.6} color={surfaceColor(p)} ramp={heightRamp(p)} line={p.strong} lines={6} onTip={(e, x, y) => tip(e, e ? `x₁ = ${fmt(x, 2)}, x₂ = ${fmt(y, 2)}\nŷ = ${fmt(f(x, y))}` : undefined)} />
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

const NET_POS: V3[][] = [
  [toScene(-3, -0.8, 0.6), toScene(-3, 0.8, 0.6)],
  [toScene(0, -1.5, 0.6), toScene(0, 0, 0.6), toScene(0, 1.5, 0.6)],
  [toScene(3, 0, 0.6)],
]
const LOSS_AT: V3 = toScene(4.6, 0, 0.6)
/** What each phase is about (phase = the step being reached). */
const NET_FOCUS: string[][] = [['in'], ['in', 'e1', 'hid'], ['hid', 'e2', 'out'], ['out', 'loss'], ['loss', 'out'], ['out', 'e2', 'hid'], ['hid', 'e1', 'in']]

export function ForwardBackward() {
  const net = XOR_RUN.history[6].net // part-trained, so the gradients are not tiny
  const [ei, setEi] = useState(1)
  const ex = XOR[ei]
  const P = useMemo(() => pass(net, ex.x, ex.y), [net, ex])
  const overview = { camera: [0.6, 7.2, 8.2] as V3, target: [0.6, 0.6, 0] as V3 }
  const steps: SceneStep[] = [
    { label: 'The input', note: `x = (${ex.x.join(', ')}); the right answer is y = ${ex.y}.`, tex: `\\mathbf x = ${tv(ex.x, 0)},\\quad y = ${ex.y}`, view: { camera: [-3.4, 3.4, 5.2], target: [-2.2, 0.6, 0] }, ms: 1700 },
    { label: 'Forward: hidden layer', note: 'Each hidden neuron adds up its weighted inputs and its bias, then squashes the sum with tanh.', tex: `\\mathbf z_1 = W_1\\mathbf x + \\mathbf b_1 = ${tv(P.z1)},\\qquad \\mathbf a_1 = \\tanh(\\mathbf z_1) = ${tv(P.a1)}`, view: { camera: [-0.9, 3.8, 5.8], target: [-1, 0.6, 0] }, ms: 1700 },
    { label: 'Forward: output', note: 'The output neuron does the same with the hidden values, then the sigmoid turns it into a probability.', tex: `z_2 = \\mathbf w_2^{\\top}\\mathbf a_1 + b_2 = ${fmt(P.z2)},\\qquad \\hat y = \\sigma(z_2) = ${fmt(P.yhat)}`, view: { camera: [2.3, 3.6, 5.6], target: [2.2, 0.6, 0] }, ms: 1500 },
    { label: 'The loss', note: `How wrong was it? The cross-entropy for the right answer y = ${ex.y}.`, tex: `L = -\\big[y\\log\\hat y + (1-y)\\log(1-\\hat y)\\big] = -\\log ${fmt(ex.y ? P.yhat : 1 - P.yhat)} = ${fmt(P.loss)}`, view: { camera: [4.2, 3.2, 4.8], target: [3.9, 0.6, 0] }, pause: true, ms: 1500 },
    { label: 'Backward: output', note: 'Now blame flows back. For a sigmoid with cross-entropy, the output’s gradient is simply ŷ − y.', tex: `\\frac{\\partial L}{\\partial z_2} = \\hat y - y = ${fmt(P.dz2)},\\qquad \\frac{\\partial L}{\\partial \\mathbf w_2} = \\frac{\\partial L}{\\partial z_2}\\,\\mathbf a_1 = ${tv(P.dW2)}`, view: { camera: [2.3, 3.6, 5.6], target: [2.2, 0.6, 0] }, ms: 1700 },
    { label: 'Backward: hidden', note: 'Each hidden neuron gets its share of the blame through its weight, times the slope of tanh at its value.', tex: `\\frac{\\partial L}{\\partial \\mathbf z_1} = \\Big(\\mathbf w_2\\,\\frac{\\partial L}{\\partial z_2}\\Big) \\odot \\big(1-\\mathbf a_1^{2}\\big) = ${tv(P.dz1)}`, view: { camera: [-0.9, 3.8, 5.8], target: [-1, 0.6, 0] }, ms: 1700 },
    { label: 'Backward: first weights', note: 'Every weight now knows which way to move to make the loss smaller. That is one step of training.', tex: `\\frac{\\partial L}{\\partial W_1} = \\frac{\\partial L}{\\partial \\mathbf z_1}\\,\\mathbf x^{\\top} = ${tm(P.dW1, 3)}`, view: overview, pause: true },
  ]
  return (
    <div className="space-y-2">
      <Chips label="Example" items={XOR.map((d, i) => ({ id: i, name: `(${d.x.join(', ')}) → ${d.y}` }))} value={ei} onChange={setEi} />
      <Scene3D
        resetKey={ei}
        title="One example through the network, forward then backward"
        description={`A 2–3–1 network with its real weights. Forward: signals travel from the input (${ex.x.join(', ')}) along every connection to the hidden layer, then to the output ${fmt(P.yhat, 2)}, then the loss ${fmt(P.loss, 2)}. Backward: gradients travel back the same way to every weight. The camera follows each step; line thickness shows each weight's size.`}
        steps={steps}
        stepMs={1600}
        camera={overview.camera}
        target={overview.target}
      >
        {({ t, step, frac, p, tip }) => {
          const edges: { a: V3; b: V3; w: number; layer: 1 | 2 }[] = []
          net.W1.forEach((row, i) => row.forEach((w, j) => edges.push({ a: NET_POS[0][j], b: NET_POS[1][i], w, layer: 1 })))
          net.W2.forEach((w, i) => edges.push({ a: NET_POS[1][i], b: NET_POS[2][0], w, layer: 2 }))
          // Forward values appear when their signal arrives; gradients when theirs does.
          const seenLayer = t >= 2 ? 2 : t >= 1 ? 1 : 0
          const gradOut = t >= 4
          const gradHidden = t >= 5
          const moving = frac > 0 && frac < 1
          const phase = Math.min(6, moving ? step + 1 : step)
          const focus = t >= 6 ? null : NET_FOCUS[phase]
          const op = (id: string) => (!focus || focus.includes(id) ? 1 : 0.25)
          const vals: number[][] = [ex.x, P.a1, [P.yhat]]
          const layerId = ['in', 'hid', 'out']
          return (
            <group>
              {edges.map((e, k) => {
                const fwdLit = seenLayer >= e.layer
                const backLit = (e.layer === 2 && gradOut) || (e.layer === 1 && t >= 6)
                const o = op(e.layer === 1 ? 'e1' : 'e2')
                return <Line key={k} points={[e.a, e.b]} color={backLit ? p.info : fwdLit ? p.ink : p.hair} lineWidth={0.6 + Math.min(4, Math.abs(e.w) * 1.2)} transparent opacity={(fwdLit || backLit ? 0.9 : 0.5) * o} />
              })}
              {/* The step in progress: signals moving forward, gradients moving back. */}
              {moving && step === 0 && edges.filter((e) => e.layer === 1).map((e, k) => <Bead key={k} at={lerp3(e.a, e.b, frac)} color={p.ink} />)}
              {moving && step === 1 && edges.filter((e) => e.layer === 2).map((e, k) => <Bead key={k} at={lerp3(e.a, e.b, frac)} color={p.ink} />)}
              {moving && step === 2 && <Bead at={lerp3(NET_POS[2][0], LOSS_AT, frac)} color={p.error} />}
              {moving && step === 3 && <Bead at={lerp3(LOSS_AT, NET_POS[2][0], frac)} color={p.info} />}
              {moving && step === 4 && edges.filter((e) => e.layer === 2).map((e, k) => <Bead key={k} at={lerp3(e.b, e.a, frac)} color={p.info} />)}
              {moving && step === 5 && edges.filter((e) => e.layer === 1).map((e, k) => <Bead key={k} at={lerp3(e.b, e.a, frac)} color={p.info} />)}
              {NET_POS.map((layer, li) =>
                layer.map((at, ni) => {
                  const visible = li <= seenLayer
                  const g = li === 2 && gradOut ? P.dz2 : li === 1 && gradHidden ? P.dz1[ni] : null
                  const o = op(layerId[li])
                  const hoverText = li === 0 ? `input x${ni + 1} = ${vals[0][ni]}` : li === 1 ? `hidden ${ni + 1}: z = ${fmt(P.z1[ni])}, a = tanh(z) = ${fmt(P.a1[ni])}\n∂L/∂z = ${fmt(P.dz1[ni])}` : `output: z = ${fmt(P.z2)}, ŷ = σ(z) = ${fmt(P.yhat)}\n∂L/∂z = ${fmt(P.dz2)}`
                  return (
                    <group key={`${li}-${ni}`}>
                      <mesh position={at} onPointerMove={(e) => tip(e, hoverText)} onPointerOut={() => tip(null)}>
                        <sphereGeometry args={[0.2 + (visible ? Math.abs(vals[li][ni]) * 0.12 : 0), 28, 28]} />
                        <Mat color={g != null ? p.info : visible ? p.ink : p.strong} roughness={0.5} transparent={o < 1} opacity={o} />
                      </mesh>
                      <Label at={[at[0], at[1] + 0.58, at[2]]} muted={!visible} opacity={Math.max(0.35, o)}>
                        {li === 0 ? `x${ni + 1} = ${vals[0][ni]}` : visible ? `${li === 1 ? 'a' : 'ŷ'} = ${fmt(vals[li][ni], 2)}` : '·'}
                        {g != null ? ` · ∂L/∂z = ${fmt(g, 3)}` : ''}
                      </Label>
                    </group>
                  )
                }),
              )}
              <mesh position={LOSS_AT} onPointerMove={(e) => tip(e, `loss L = ${fmt(P.loss)}`)} onPointerOut={() => tip(null)}>
                <boxGeometry args={[0.34, 0.34, 0.34]} />
                <Mat color={t >= 3 ? p.error : p.strong} roughness={0.6} transparent={op('loss') < 1} opacity={op('loss')} />
              </mesh>
              <Label at={[LOSS_AT[0], LOSS_AT[1] + 0.55, LOSS_AT[2]]} muted={t < 3} opacity={Math.max(0.35, op('loss'))}>
                {t >= 3 ? `L = ${fmt(P.loss, 3)}` : 'loss'}
              </Label>
            </group>
          )
        }}
      </Scene3D>
    </div>
  )
}

/* ── 5. Convolution: the dot product, cell by cell ─────────────────────── */

export function ConvSlide() {
  const outs = useMemo(() => KERNELS.map((k) => conv2d(SEVEN, k.k)), [])
  const H = outs[0].length
  const W = outs[0][0].length
  const total = H * W
  const C = 0.3
  const inAt: V3 = [-3.3, 0, 0]
  const outAt = (k: number): V3 => [0.9 + k * 3.4, 0, 0]
  const K0 = KERNELS[0].k
  const steps: SceneStep[] = Array.from({ length: total }, (_, s) => {
    const i = Math.floor(s / W)
    const j = s % W
    const terms = [0, 1, 2].flatMap((a) => [0, 1, 2].map((b) => `${K0[a][b] < 0 ? `(${K0[a][b]})` : K0[a][b]}\\cdot ${SEVEN[i + a][j + b]}`))
    return {
      label: `Position (${i}, ${j})`,
      note: s < W ? `${KERNELS[0].name}: multiply the window by the filter, cell by cell, and add the nine products.` : KERNELS.map((k) => `${k.name}: ${cell(SEVEN, k.k, i, j)}`).join(' · '),
      tex: `(I * K_{\\text{vertical}})_{${i},${j}} = ${terms.join(' + ')} = ${cell(SEVEN, K0, i, j)}`,
      // The first row slowly (watch the dot product), then the rest quickly.
      ms: s < W ? 1500 : 110,
      pause: s === W,
    }
  })
  steps[W] = { ...steps[W], note: `That is one row. Every other position works the same way, so the rest fills in quickly. ${steps[W].note}` }
  const inCell = (i: number, j: number, y = 0): V3 => [inAt[0] + (j - 5.5) * C, y, inAt[2] + (i - 5.5) * C]
  const outCell = (k: number, i: number, j: number, y = 0): V3 => [outAt(k)[0] + (j - 4.5) * C, y, outAt(k)[2] + (i - 4.5) * C]
  const pos = (s: number) => [Math.floor(s / W), s % W] as const
  return (
    <Scene3D
      title="Two 3 × 3 filters sliding over a drawn 7"
      description="On the left, a 12 × 12 image of a hand-drawn 7 as raised tiles. A 3 × 3 window moves over it. At each position the filter multiplies the nine pixels under the window by its nine weights; the nine products fly into one cell of the feature map and add up to its value. The first row goes slowly; then the rest fills in. Tall tiles are strong edges."
      steps={steps}
      stepMs={300}
      camera={[0.6, 8.6, 8.4]}
      target={[0.6, 0, 0]}
    >
      {({ t, step, p, tip }) => {
        const u = t - step // 0 … 1 into the move to the next position
        const nextS = Math.min(total - 1, step + 1)
        const [i0, j0] = pos(step)
        const [i1, j1] = pos(nextS)
        const g = u > 0 ? clamp01(u / 0.3) : 0 // the window glides first …
        const fly = u > 0 ? clamp01((u - 0.3) / 0.7) : 0 // … then the products fly
        const wi = i0 + (i1 - i0) * g
        const wj = j0 + (j1 - j0) * g
        const win = inCell(wi + 1, wj + 1, 0.5)
        const doneTo = step
        const frame: V3[] = [
          [win[0] - 1.5 * C, 0.42, win[2] - 1.5 * C],
          [win[0] + 1.5 * C, 0.42, win[2] - 1.5 * C],
          [win[0] + 1.5 * C, 0.42, win[2] + 1.5 * C],
          [win[0] - 1.5 * C, 0.42, win[2] + 1.5 * C],
          [win[0] - 1.5 * C, 0.42, win[2] - 1.5 * C],
        ]
        const [ci, cj] = u > 0 ? [i1, j1] : [i0, j0]
        return (
          <group>
            <CellGrid grid={SEVEN} at={inAt} cell={C} height={0.3} low={mix(p.surface, p.ink, 0.08)} high={p.ink} highlight={(a, b) => a >= ci && a < ci + 3 && b >= cj && b < cj + 3} hiColor={p.accent} onTip={(e, a, b) => tip(e, e ? `pixel (${a}, ${b}) = ${SEVEN[a][b]}` : undefined)} />
            <Line points={frame} color={p.accent} lineWidth={2.2} />
            <Label at={[inAt[0], 0.2, 2.2]} muted>
              input 12 × 12
            </Label>
            {/* The nine products of the vertical-edge filter flying into their output cell. */}
            {fly > 0 &&
              [0, 1, 2].flatMap((a) =>
                [0, 1, 2].map((b) => {
                  const prod = K0[a][b] * SEVEN[i1 + a][j1 + b]
                  const from = inCell(i1 + a, j1 + b, 0.45)
                  const to = outCell(0, i1, j1, 0.75)
                  const at = lerp3(from, to, fly)
                  at[1] += Math.sin(Math.PI * fly) * 1.1
                  const r = (prod === 0 ? 0.045 : 0.12) * (1 - 0.45 * fly)
                  return <Bead key={`${a}${b}`} at={at} r={r} color={prod > 0 ? p.ink2 : prod < 0 ? p.info : p.muted} />
                }),
              )}
            {outs.map((o, k) => (
              <group key={k}>
                <CellGrid
                  grid={o.map((r, a) => r.map((v, b) => (a * W + b <= doneTo ? v : 0)))}
                  at={outAt(k)}
                  cell={C}
                  height={0.6}
                  low={mix(p.surface, p.ink, 0.06)}
                  high={k ? p.info : p.ink2}
                  highlight={(a, b) => a === ci && b === cj}
                  hiColor={p.accent}
                  onTip={(e, a, b) => tip(e, e ? `${KERNELS[k].name.toLowerCase()} (${a}, ${b}) = ${a * W + b <= doneTo ? o[a][b] : 'not computed yet'}` : undefined)}
                />
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
const RAW_AXES: Matrix = [
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
  const projAt = (u: number) => orthonormalRows(RAW_AXES.map((row, i) => row.map((v, j) => (1 - u) * v + u * r.components[i][j])))
  const steps: SceneStep[] = Array.from({ length: T + 1 }, (_, k) => ({
    label: k === 0 ? 'Three of the raw measurements' : k === T ? 'The first three principal components' : `Turning: ${Math.round((k / T) * 100)}%`,
    note: k === 0 ? 'Each flower at its sepal length, sepal width and petal length (centred, in cm). Hover a flower to read it.' : k === T ? `The same flowers along the directions of greatest spread: ${kept}% of the variance in three numbers.` : 'At every moment this is a true projection: three orthonormal directions in 4D, turning from the raw axes to the principal axes.',
    tex: `\\mathbf z = P(t)\\,(\\mathbf x - \\boldsymbol\\mu),\\quad P(${(k / T).toFixed(2)}) = ${tm(projAt(k / T), 2)}`,
    ms: k === 0 ? 1200 : undefined,
  }))
  return (
    <Scene3D
      title="150 Iris flowers, turned from raw measurements to principal components"
      description={`Each dot is one real flower. It starts at three of its raw measurements, then the view turns smoothly (a true projection at every moment) until the axes are the first three principal components, which keep ${kept}% of the variance. Setosa separates cleanly; versicolor and virginica overlap a little.`}
      steps={steps}
      stepMs={240}
      camera={[5.2, 4.2, 6.4]}
    >
      {({ t, p, tip }) => {
        const u = t / T
        const P = projAt(u)
        const pts = IRIS_X.map((x) => {
          const c = x.map((v, j) => v - r.mean[j])
          const q = P.map((row) => row.reduce((s, v, j) => s + v * c[j], 0))
          return toScene(q[0], q[1], q[2])
        })
        const col = [p.ink, p.info, p.accent]
        return (
          <group>
            <Points3D
              points={pts}
              colors={IRIS.map((d) => col[d[4]])}
              r={0.065}
              onTip={(e, i) => tip(e, e && i >= 0 ? `${IRIS_SPECIES[IRIS[i][4]]} (flower ${i + 1})\nsepal ${IRIS[i][0]} × ${IRIS[i][1]} cm, petal ${IRIS[i][2]} × ${IRIS[i][3]} cm` : undefined)}
            />
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
  const sigmaAt = (rho: number) => {
    const c = rho * Math.sqrt(SX * SY)
    return [
      [SX, c],
      [c, SY],
    ]
  }
  const steps: SceneStep[] = Array.from({ length: T + 1 }, (_, k) => {
    const rho = (RHO * k) / T
    const S = sigmaAt(rho)
    const e = eigSym(S)
    return {
      label: `Correlation ρ = ${rho.toFixed(2)}`,
      note: k === 0 ? 'No correlation: the ellipses line up with the axes.' : 'As the correlation grows, the bell narrows and tilts, and its axes turn with it.',
      tex: `\\Sigma = ${tm(S, 2)},\\qquad \\lambda_1 = ${fmt(e.values[0])},\\; \\lambda_2 = ${fmt(e.values[1])}`,
    }
  })
  return (
    <Scene3D
      title="A two-dimensional Gaussian as its correlation grows"
      description={`The density of a Gaussian with variances ${SX} and ${SY} as a surface coloured by height, with contour ellipses on the floor. The correlation grows from 0 to ${RHO}: the bell narrows and tilts, and the arrows (the covariance's eigenvectors, scaled by the square roots of the eigenvalues) turn to follow the ellipse's axes.`}
      steps={steps}
      stepMs={280}
      camera={[6.2, 5.6, 7.4]}
      target={[0, 0.7, 0]}
    >
      {({ t, p, tip }) => {
        const rho = (RHO * t) / T
        const S = sigmaAt(rho)
        const det = S[0][0] * S[1][1] - S[0][1] ** 2
        const inv = [
          [S[1][1] / det, -S[0][1] / det],
          [-S[1][0] / det, S[0][0] / det],
        ]
        const pdf = (x: number, y: number) => Math.exp(-0.5 * (x * (inv[0][0] * x + inv[0][1] * y) + y * (inv[1][0] * x + inv[1][1] * y))) / (2 * Math.PI * Math.sqrt(det))
        const peak = pdf(0, 0)
        const e = eigSym(S)
        // Height scale fixed at the start's peak, so the bell visibly rises as it narrows.
        const p0 = 1 / (2 * Math.PI * Math.sqrt(SX * SY))
        return (
          <group>
            <SurfaceMesh f={pdf} range={[-3, 3]} n={56} scale={2.2 / p0} color={surfaceColor(p)} ramp={heightRamp(p)} line={p.strong} opacity={0.6} onTip={(ev, x, y) => tip(ev, ev ? `x₁ = ${fmt(x, 2)}, x₂ = ${fmt(y, 2)}\np(x) = ${fmt(pdf(x, y), 4)}` : undefined)} />
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
