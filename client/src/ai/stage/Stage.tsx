import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Scene3D, type SceneStep } from '../three/Scene3D'
import { StageEl } from './elements'
import { buildFrames, frameAt, validateStage, type StageSpec } from './spec'

/**
 * Nexora Stage: plays a scene written as data (spec.ts) in 2D and 3D.
 *
 * Everything in Scene3D (timeline, reading breaks, guided camera, focus,
 * hover values, live formulas, keys, full screen, reduced motion), plus:
 *   - every number in the scene glides from one step to the next;
 *   - the scene rises from a flat 2D diagram into 3D and back, on a step's
 *     cue (`dim`) or with the 2D / 3D switch;
 *   - words in a caption linked to an element (`[text](#id)`) light it up
 *     when you point at them, like Bycroft's LLM walkthrough.
 */
export function Stage({ spec, className, before }: { spec: StageSpec; className?: string; before?: ReactNode }) {
  const errors = useMemo(() => validateStage(spec), [spec])
  const frames = useMemo(() => (errors.length ? [] : buildFrames(spec)), [spec, errors])
  const [pinned, setPinned] = useState<string | null>(null)

  const steps: SceneStep[] = useMemo(
    () =>
      spec.steps.map((s) => ({
        label: s.label,
        note: s.caption ? <Caption text={s.caption} onPoint={setPinned} /> : undefined,
        tex: s.tex,
        view: s.view,
        focus: s.focus,
        pause: s.pause,
        ms: s.ms,
      })),
    [spec],
  )

  if (errors.length) {
    return (
      <div role="alert" className="rounded-lg border border-state-error p-3 text-sm text-text-primary">
        <p className="m-0 font-semibold">This scene can’t be shown: {spec?.title ?? 'untitled'}</p>
        <ul className="m-0 mt-1 list-disc pl-5 text-text-secondary">
          {errors.slice(0, 8).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {before}
      <StagePlayer spec={spec} frames={frames} steps={steps} pinned={pinned} className={className} />
    </div>
  )
}

/** A caption whose `[words](#id)` point at elements of the scene. */
function Caption({ text, onPoint }: { text: string; onPoint: (id: string | null) => void }) {
  const parts: ReactNode[] = []
  const re = /\[([^\]]+)\]\(#([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const id = m[2]
    parts.push(
      <button key={k++} type="button" className="stage-ref" onMouseEnter={() => onPoint(id)} onMouseLeave={() => onPoint(null)} onFocus={() => onPoint(id)} onBlur={() => onPoint(null)}>
        {m[1]}
      </button>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

/** Animate a number from → to over about a second (instant with reduced motion), calling `set` each frame. */
function glide(from: number, to: number, set: (v: number) => void, anim: { current: number }) {
  cancelAnimationFrame(anim.current)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(to - from) < 0.001) {
    set(to)
    return
  }
  let t0 = -1
  const tick = (now: number) => {
    if (t0 < 0) t0 = now
    const u = Math.min(1, (now - t0) / 1100)
    set(from + (to - from) * (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2))
    if (u < 1) anim.current = requestAnimationFrame(tick)
  }
  anim.current = requestAnimationFrame(tick)
}

function StagePlayer({
  spec,
  frames,
  steps,
  pinned,
  className,
}: {
  spec: StageSpec
  frames: ReturnType<typeof buildFrames>
  steps: SceneStep[]
  pinned: string | null
  className?: string
}) {
  // Normally the timeline decides 2D or 3D. Once the student uses the switch, their choice wins
  // (animated over about a second, instant with reduced motion).
  const [user, setUser] = useState<number | null>(null)
  const anim = useRef(0)
  useEffect(() => () => cancelAnimationFrame(anim.current), [])
  const timeline = useCallback((t: number) => frameAt(frames, t).lift, [frames])
  const switchTo = (from: number, to: number) => glide(from, to, setUser, anim)

  const cam = spec.camera ?? { position: [6, 5.5, 7] as [number, number, number], target: [0, 0, 0] as [number, number, number] }
  return (
    <Scene3D
      title={spec.title}
      description={spec.description}
      steps={steps}
      camera={cam.position}
      target={cam.target}
      lift={user ?? timeline}
      className={className}
      tools={(lift) => (
        <span className="ai3d-speed" role="group" aria-label="View">
          <button type="button" aria-pressed={lift < 0.5} onClick={() => switchTo(lift, 0)}>
            2D
          </button>
          <button type="button" aria-pressed={lift >= 0.5} onClick={() => switchTo(lift, 1)}>
            3D
          </button>
        </span>
      )}
    >
      {(ctx) => {
        const fr = frameAt(frames, ctx.t)
        const dim = (id: string) => (pinned ? (id === pinned ? 1 : 0.18) : ctx.dim(id))
        const c = { p: ctx.p, lift: user ?? fr.lift, params: fr.params, dim, tip: ctx.tip }
        return (
          <group>
            {[...fr.elements.values()].map((el) => (
              <StageEl key={el.id} el={el} c={c} />
            ))}
          </group>
        )
      }}
    </Scene3D>
  )
}

export default Stage
