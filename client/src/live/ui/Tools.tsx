/*
  Study tools in a room:
    PollCard     a quick poll on the stage (A/B/C/D or your own options),
                 live bars as people answer; the host closes or clears it
    TimerPill    the shared timer in the top bar, counting down for everyone
    ToolsPanel   where the host starts polls and timers, and anyone opens the
                 code pad, the whiteboard or the tablet QR
    QuestionPanel  the GATE question a room is about, right in the room
*/
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BarChart3, Code2, PenLine, Tablet, Timer, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LiveSession, LiveState } from '../session'

/* ── poll ── */
export function PollCard({ session, s }: { session: LiveSession; s: LiveState }) {
  const p = s.poll
  const [hidden, setHidden] = useState<string | null>(null)
  if (!p || hidden === p.id) return null
  const total = Math.max(1, p.counts.reduce((a, b) => a + b, 0))
  const host = session.isHost()
  const letter = (i: number) => String.fromCharCode(65 + i)
  return (
    <section className="lv-poll" aria-label="Poll">
      <div className="lv-poll-head">
        <p className="ed-label m-0">{p.open ? 'Poll' : 'Poll closed'} · {p.voters} answered</p>
        <button type="button" className="lv-mini-x" aria-label="Hide the poll" onClick={() => setHidden(p.id)}>
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <p className="lv-poll-q">{p.question}</p>
      <ul className="lv-poll-options">
        {p.options.map((o, i) => {
          const pct = Math.round((p.counts[i] / total) * 100)
          const mine = s.myVote === i
          // Results show once you answer (or when the poll closes), so they don't sway you.
          const show = s.myVote !== null || !p.open || host
          return (
            <li key={i}>
              <button type="button" className={cn('lv-poll-opt', mine && 'is-mine')} disabled={!p.open} aria-pressed={mine} onClick={() => session.pollVote(i)}>
                {show && <span className="lv-poll-bar" style={{ width: `${pct}%` }} aria-hidden="true" />}
                <span className="lv-poll-letter">{letter(i)}</span>
                <span className="lv-poll-text">{o}</span>
                {show && <span className="lv-poll-pct">{pct}%</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {host && (
        <div className="lv-poll-host">
          {p.open ? (
            <button type="button" className="lv-chip-btn" onClick={() => session.pollClose()}>
              Close and show results
            </button>
          ) : (
            <button type="button" className="lv-chip-btn" onClick={() => session.pollClose(true)}>
              Clear the poll
            </button>
          )}
        </div>
      )}
    </section>
  )
}

/* ── timer ── */
function chime() {
  try {
    const ac = new AudioContext()
    ;[523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.frequency.value = f
      const t = ac.currentTime + i * 0.18
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.06, t + 0.02)
      g.gain.linearRampToValueAtTime(0, t + 0.5)
      o.connect(g).connect(ac.destination)
      o.start(t)
      o.stop(t + 0.55)
    })
    setTimeout(() => void ac.close(), 1500)
  } catch {
    /* no sound */
  }
}

export function TimerPill({ session, s }: { session: LiveSession; s: LiveState }) {
  const [now, setNow] = useState(() => Date.now())
  const rang = useRef<number | null>(null)
  useEffect(() => {
    if (!s.timer) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [s.timer])
  const t = s.timer
  const left = t ? Math.max(0, t.endsAt - now) : 0
  useEffect(() => {
    if (t && left === 0 && rang.current !== t.endsAt) {
      rang.current = t.endsAt
      chime()
      session.notice(`Time's up: ${t.label}`)
    }
  }, [t, left, session])
  if (!t) return null
  const m = Math.floor(left / 60000)
  const sec = String(Math.floor((left % 60000) / 1000)).padStart(2, '0')
  return (
    <span className={cn('lv-timer', left === 0 && 'is-done', left > 0 && left < 60_000 && 'is-low')} role="timer" aria-label={`${t.label}: ${m} minutes ${sec} seconds left`}>
      <Timer className="size-3.5" aria-hidden="true" />
      <span className="lv-timer-label">{t.label}</span>
      <span className="lv-timer-left">{left === 0 ? "Time's up" : `${m}:${sec}`}</span>
    </span>
  )
}

/* ── tools panel ── */
export function ToolsPanel({ session, s, onCode, onBoard, onTablet }: { session: LiveSession; s: LiveState; onCode: () => void; onBoard: () => void; onTablet: () => void }) {
  const host = session.isHost()
  const [q, setQ] = useState('Which option is right?')
  const [opts, setOpts] = useState('A\nB\nC\nD')
  const [mins, setMins] = useState(25)
  const [label, setLabel] = useState('Solve on your own')
  const options = opts
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
  return (
    <div className="lv-panel-body lv-tools">
      <section className="lv-section">
        <p className="ed-label m-0 mb-2">Work together</p>
        <div className="lv-tool-grid">
          <button type="button" className="lv-tool-card" onClick={onCode}>
            <Code2 className="size-5" aria-hidden="true" />
            <strong>Code pad</strong>
            <span>Everyone types in one editor.</span>
            {s.codeNew && <span className="lv-tab-n">new</span>}
          </button>
          <button type="button" className="lv-tool-card" onClick={onBoard}>
            <PenLine className="size-5" aria-hidden="true" />
            <strong>Whiteboard</strong>
            <span>Draw it out for everyone.</span>
          </button>
          <button type="button" className="lv-tool-card" onClick={onTablet}>
            <Tablet className="size-5" aria-hidden="true" />
            <strong>Tablet</strong>
            <span>Teach from a tablet by QR.</span>
          </button>
        </div>
      </section>

      <section className="lv-section">
        <p className="ed-label m-0 mb-2">
          <BarChart3 className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
          Quick poll
        </p>
        {host ? (
          <div className="grid gap-2">
            <input className="lv-input" value={q} maxLength={200} onChange={(e) => setQ(e.target.value)} aria-label="Question" />
            <textarea className="lv-input" rows={4} value={opts} onChange={(e) => setOpts(e.target.value)} aria-label="Options, one per line" />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="lv-chip-btn" onClick={() => setOpts('A\nB\nC\nD')}>
                A–D
              </button>
              <button type="button" className="lv-chip-btn" onClick={() => setOpts('True\nFalse')}>
                True / False
              </button>
              <button type="button" className="lv-chip-btn" onClick={() => setOpts('Got it\nNot yet')}>
                Got it?
              </button>
              <button type="button" className="lv-chip-btn is-on ml-auto" disabled={options.length < 2} onClick={() => session.pollStart(q, options)}>
                {s.poll?.open ? 'Start a new poll' : 'Start the poll'}
              </button>
            </div>
          </div>
        ) : (
          <p className="lv-hint m-0">{s.poll ? 'Answer the poll on the stage.' : 'The host can ask the room a quick question here.'}</p>
        )}
      </section>

      <section className="lv-section">
        <p className="ed-label m-0 mb-2">
          <Timer className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
          Timer for everyone
        </p>
        {host ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              {[5, 10, 25, 45].map((m) => (
                <button key={m} type="button" className={cn('lv-chip-btn', mins === m && 'is-on')} onClick={() => setMins(m)}>
                  {m} min
                </button>
              ))}
              <input className="lv-input w-20" type="number" min={1} max={180} value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="Minutes" />
            </div>
            <input className="lv-input" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} aria-label="What the time is for" />
            <div className="flex gap-2">
              <button type="button" className="lv-chip-btn is-on" onClick={() => session.timerStart(mins, label)}>
                Start
              </button>
              {s.timer && (
                <button type="button" className="lv-chip-btn" onClick={() => session.timerStop()}>
                  Stop
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="lv-hint m-0">{s.timer ? `Running: ${s.timer.label}.` : 'The host can start a timer for everyone, shown at the top.'}</p>
        )}
      </section>
    </div>
  )
}

/* ── the question the room is about ── */
const QuestionInner = lazy(() => import('./QuestionInRoom'))
export function QuestionPanel({ id }: { id: string }) {
  return (
    <div className="lv-panel-body lv-question">
      <Suspense fallback={<p className="lv-hint">Loading the question…</p>}>
        <QuestionInner id={id} />
      </Suspense>
    </div>
  )
}
