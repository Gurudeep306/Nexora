/*
  The teacher's whiteboard (docs/voice/VIRTUAL_TEACHER.md §3, T3): a sheet
  beside the teacher where a lesson is drawn step by step, stroke by stroke,
  while the teacher explains each step aloud and points at what was just
  drawn. Loaded only when it opens.

  - Lessons come from POST /api/voice/board (src/voice/board.js), already
    checked: known shapes only, short text, kept on the board.
  - Ink is the text colour; the accent marks what to look at (never as text).
  - Pause, step back and forward, repeat and close, by button or by voice.
  - Reduced motion: shapes appear without the drawing animation.
  - The page stays usable underneath; the board is not a modal.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useVoiceActions } from '../actions/useVoiceAction'
import { BOARD_SPECS } from '../actions/teacherSpecs'
import type { VoiceAction } from '../actions/types'
import { getVoicePrefs } from '../prefs'
import { speakAndWait, stopSpeaking, useSpeaking } from '../speak'
import { closeBoard, shapesUpTo, useBoard, type Shape } from './boardStore'
import { setTeacher, teacherPoint } from './store'
import { teacherById } from './teachers'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

type Drawn = Exclude<Shape, { t: 'clear' }>

function Label({ x, y, text, size = 2.6, anchor = 'middle' }: { x: number; y: number; text: string; size?: number; anchor?: 'start' | 'middle' }) {
  if (!text) return null
  return (
    <text className="wb-text" x={x} y={y} fontSize={size} textAnchor={anchor} dominantBaseline="middle">
      {text}
    </text>
  )
}

function ShapeView({ s }: { s: Drawn }) {
  const ink = 'color' in s ? s.color : 'ink'
  switch (s.t) {
    case 'text':
      return (
        <g>
          <text className="wb-text" x={s.x} y={s.y} fontSize={s.size} dominantBaseline="middle">
            {s.text}
          </text>
          {ink !== 'ink' && ink !== 'muted' && <line className={`wb-stroke wb-${ink}`} pathLength={1} x1={s.x} y1={s.y + s.size * 0.75} x2={s.x + Math.min(60, s.text.length * s.size * 0.5)} y2={s.y + s.size * 0.75} />}
        </g>
      )
    case 'box':
      return (
        <g>
          <rect className={`wb-stroke wb-${ink}`} pathLength={1} x={s.x} y={s.y} width={s.w} height={s.h} rx={1} />
          <Label x={s.x + s.w / 2} y={s.y + s.h / 2} text={s.label} />
        </g>
      )
    case 'circle':
      return (
        <g>
          <circle className={`wb-stroke wb-${ink}`} pathLength={1} cx={s.x} cy={s.y} r={s.r} />
          <Label x={s.x} y={s.y} text={s.label} />
        </g>
      )
    case 'arrow':
    case 'line': {
      const [x1, y1] = s.from
      const [x2, y2] = s.to
      return (
        <g>
          <line className={`wb-stroke wb-${ink}`} pathLength={1} x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={s.t === 'arrow' ? `url(#wb-head-${ink})` : undefined} />
          <Label x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 2.2} text={s.label} size={2.3} />
        </g>
      )
    }
    case 'array':
      return (
        <g>
          <Label x={s.x} y={s.y - 3} text={s.label} size={2.3} anchor="start" />
          {s.values.map((v, i) => (
            <g key={i}>
              <rect className={`wb-stroke wb-ink${s.highlight.includes(i) ? ' wb-hl' : ''}`} pathLength={1} x={s.x + i * s.cell} y={s.y} width={s.cell} height={s.cell} />
              <Label x={s.x + i * s.cell + s.cell / 2} y={s.y + s.cell / 2} text={v} size={Math.min(3, s.cell * 0.42)} />
              <text className="wb-index" x={s.x + i * s.cell + s.cell / 2} y={s.y - 0.9} fontSize={1.6} textAnchor="middle">
                {i}
              </text>
            </g>
          ))}
          {s.pointers.map((p, k) => {
            const cx = s.x + p.i * s.cell + s.cell / 2
            const top = s.y + s.cell + 1
            return (
              <g key={`p${k}`}>
                <line className="wb-stroke wb-accent" pathLength={1} x1={cx} y1={top + 4 + k * 0.01} x2={cx} y2={top} markerEnd="url(#wb-head-accent)" />
                <Label x={cx} y={top + 6} text={p.label} size={2.3} />
              </g>
            )
          })}
        </g>
      )
  }
}

export default function Board() {
  const b = useBoard()
  const speaking = useSpeaking()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const panel = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const lesson = b.lesson
  const total = lesson?.steps.length ?? 0
  const teacher = teacherById(getVoicePrefs().teacher)
  const lang = getVoicePrefs().lang === 'hi-IN' ? 'hi-IN' : 'en-IN'

  // A new lesson starts at the beginning, playing.
  useEffect(() => {
    setStep(0)
    setPlaying(true)
  }, [lesson])

  // The teacher stands beside the board (on wide screens).
  useEffect(() => {
    const r = panel.current?.getBoundingClientRect()
    if (!r || !b.open) return
    if (r.right + 140 < window.innerWidth) setTeacher({ atX: r.right + 110, hidden: false })
  }, [b.open, lesson])

  // Play a step: draw it, point at what was drawn, say it, then the next.
  useEffect(() => {
    if (!lesson || !playing) return
    let alive = true
    void (async () => {
      const s = lesson.steps[step]
      await wait(reduced() ? 60 : 450)
      if (!alive) return
      const fresh = svg.current?.querySelectorAll<SVGGElement>(`[data-step="${step}"]`)
      const last = fresh?.[fresh.length - 1]?.getBoundingClientRect()
      if (last && last.width + last.height > 0) teacherPoint({ x: last.left + last.width / 2, y: last.top + last.height / 2 })
      const done = s.say ? await speakAndWait(s.say, lang) : (await wait(1400), true)
      if (!alive || !done) return
      await wait(500)
      if (!alive) return
      if (step < lesson.steps.length - 1) setStep(step + 1)
      else setPlaying(false)
    })()
    return () => {
      alive = false
    }
  }, [lesson, step, playing, lang])

  const go = (n: number) => {
    stopSpeaking()
    setStep(Math.max(0, Math.min(total - 1, n)))
  }
  const toggle = () => {
    if (playing) stopSpeaking()
    else if (step >= total - 1 && !playing) setStep(total - 1)
    setPlaying(!playing)
  }
  const close = () => {
    stopSpeaking()
    closeBoard()
    setTeacher({ atX: null })
  }

  // Voice while the board is open: "next", "ruko", "phir se bolo", "board band karo".
  const voice = useMemo<VoiceAction[]>(() => {
    const spec = (id: string) => BOARD_SPECS.find((s) => s.id === id)!
    return [
      { ...spec('board.next'), title: 'Whiteboard: next step', group: 'Teacher', palette: false, run: () => go(step + 1) },
      { ...spec('board.prev'), title: 'Whiteboard: previous step', group: 'Teacher', palette: false, run: () => go(step - 1) },
      { ...spec('board.pause'), title: 'Whiteboard: pause', group: 'Teacher', palette: false, run: () => { stopSpeaking(); setPlaying(false) } },
      { ...spec('board.play'), title: 'Whiteboard: carry on', group: 'Teacher', palette: false, run: () => setPlaying(true) },
      { ...spec('board.repeat'), title: 'Whiteboard: say it again', group: 'Teacher', palette: false, run: () => { go(step); setPlaying(true) } },
      { ...spec('board.close'), title: 'Close the whiteboard', group: 'Teacher', run: close },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, total])
  useVoiceActions(b.open ? voice : [])

  if (!b.open) return null
  const shapes = lesson ? shapesUpTo(lesson, step) : []
  const who = teacher?.name ?? 'Your teacher'
  return (
    <div ref={panel} className="wb" role="region" aria-label={`Whiteboard${lesson ? `: ${lesson.title}` : ''}`}>
      <div className="wb-head">
        <p className="wb-title">{lesson?.title ?? b.topic}</p>
        {lesson && (
          <span className="wb-count">
            {step + 1} / {total}
          </span>
        )}
        <button type="button" className="wb-btn" onClick={close} aria-label="Close the whiteboard">
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="wb-sheet">
        {b.loading && (
          <p className="wb-wait" role="status">
            {who} is getting the board ready<span className="tch-dots">…</span>
          </p>
        )}
        {b.error && (
          <div className="wb-wait" role="alert">
            <p>{b.error}</p>
          </div>
        )}
        {lesson && (
          <svg ref={svg} viewBox="0 0 100 60" className="wb-svg" role="img" aria-label={`${lesson.title}, step ${step + 1} of ${total}`}>
            <defs>
              {(['ink', 'accent', 'muted', 'good', 'bad'] as const).map((c) => (
                <marker key={c} id={`wb-head-${c}`} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0,0 L6,3 L0,6 z" className={`wb-fill-${c}`} />
                </marker>
              ))}
            </defs>
            {shapes.map(({ shape, step: at, key }) => (
              <g key={key} data-step={at} className={at === step ? 'wb-new' : undefined}>
                <ShapeView s={shape} />
              </g>
            ))}
          </svg>
        )}
      </div>
      {lesson && (
        <>
          <p className="wb-say" aria-live="polite" lang={lang === 'hi-IN' ? 'hi' : 'en'}>
            {lesson.steps[step]?.say}
          </p>
          {speaking.on && (
            <p className="wb-voice" role="status">
              {speaking.engine === 'natural' || speaking.engine === 'kokoro' ? (
                <>
                  <strong>AI voice</strong> · {speaking.name}
                </>
              ) : (
                speaking.name
              )}
            </p>
          )}
          <div className="wb-controls">
            <button type="button" className="wb-btn" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous step">
              <ChevronLeft aria-hidden="true" />
            </button>
            <button type="button" className="wb-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Carry on'}>
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
            <button type="button" className="wb-btn" onClick={() => go(step + 1)} disabled={step >= total - 1} aria-label="Next step">
              <ChevronRight aria-hidden="true" />
            </button>
            <button
              type="button"
              className="wb-btn"
              onClick={() => {
                go(0)
                setPlaying(true)
              }}
              aria-label="Start again"
            >
              <RotateCcw aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
