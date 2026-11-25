/*
  Explain-back (docs/voice/BLUEPRINT.md §2 row 3): after Accepted, explain the
  solution in your own words — by voice or typing — and trace one random small
  input by hand. The server grades it (src/voice/explain.js): the trace
  exactly, the five-part rubric by a free model whose every point must quote
  your words. An unaided pass counts towards Nexus mastery.
*/
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Mic, Square } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { getVoicePrefs } from '../prefs'
import { listenOnce, useVoiceSupport, type ListenHandle } from '../speech'
import { InkWave } from '../listen/InkWave'
import './explain.css'

interface Started {
  ok: boolean
  token?: string
  minutes?: number
  title?: string
  rubric?: { id: string; label: string }[]
  trace?: { input: string } | null
  say?: string
  locked?: boolean
}

interface Graded {
  ok: boolean
  say?: string
  total?: number
  max?: number
  criteria?: { id: string; label: string; score: number; quote: string }[]
  feedback?: string
  trace?: { ok: boolean; expected: string } | null
  passed?: boolean
  counted?: boolean
  why?: string
}

type Stage = { kind: 'starting' } | { kind: 'error'; say: string } | { kind: 'open'; s: Started } | { kind: 'grading'; s: Started } | { kind: 'done'; s: Started; g: Graded }

export function ExplainBack({ open, problem, code, language, onClose }: { open: boolean; problem: { kind: string; id: string } | null; code: string; language: string; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>({ kind: 'starting' })
  const canListen = useVoiceSupport()
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState('')
  const [live, setLive] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const handle = useRef<ListenHandle | null>(null)
  const before = useRef('')

  const start = useCallback(async () => {
    setStage({ kind: 'starting' })
    setNote('')
    setAnswer('')
    try {
      const s = await api.post<Started>('/api/voice/explain/start', { problem, code, language })
      setStage(s.ok ? { kind: 'open', s } : { kind: 'error', say: s.say ?? 'Explain-back couldn’t start.' })
    } catch (e) {
      setStage({ kind: 'error', say: e instanceof Error && e.message ? e.message : 'Explain-back couldn’t start.' })
    }
  }, [problem, code, language])

  useEffect(() => {
    if (!open) return
    setText('')
    void start()
    // Opening starts a fresh explain-back; the code typed meanwhile doesn't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const stopListening = () => {
    handle.current?.stop()
  }
  const close = () => {
    handle.current?.cancel()
    handle.current = null
    setLive(null)
    if (stage.kind === 'open') void api.post('/api/voice/explain/cancel', {}).catch(() => {})
    onClose()
  }

  const listen = async () => {
    if (handle.current) return stopListening()
    const prefs = getVoicePrefs()
    if (!prefs.consent) {
      setNote('Turn on voice first: press the mic in the top bar once and allow it. Or type your explanation.')
      return
    }
    setNote('')
    before.current = text.trim()
    setLive('')
    handle.current = await listenOnce({
      lang: prefs.lang,
      mode: 'text',
      continuous: true,
      onText: (t) => {
        setLive(t)
        setText([before.current, t].filter(Boolean).join(' '))
      },
      onDone: (t) => {
        handle.current = null
        setLive(null)
        setText([before.current, t].filter(Boolean).join(' '))
        if (!t && !before.current) setNote('I didn’t hear anything. Press “Speak” and explain, or type.')
      },
    })
  }

  const grade = async () => {
    if (stage.kind !== 'open') return
    handle.current?.stop()
    const s = stage.s
    setStage({ kind: 'grading', s })
    try {
      const g = await api.post<Graded>('/api/voice/explain/grade', { token: s.token, transcript: text, answer }, { timeoutMs: 90000 })
      if (!g.ok) {
        setNote(g.say ?? 'Couldn’t grade it — try again.')
        setStage({ kind: 'open', s })
        return
      }
      setStage({ kind: 'done', s, g })
    } catch (e) {
      setNote(e instanceof Error && e.message ? e.message : 'Couldn’t grade it — try again.')
      setStage({ kind: 'open', s })
    }
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const s = stage.kind === 'open' || stage.kind === 'grading' || stage.kind === 'done' ? stage.s : null

  return (
    <Modal open={open} onClose={close} title="Explain it back" description={s?.title ? `“${s.title}” — in your own words, without running anything.` : 'In your own words, without running anything.'} size="lg">
      <div className="xb">
        {stage.kind === 'starting' && <p className="xb-quiet">Getting it ready…</p>}
        {stage.kind === 'error' && (
          <div className="xb-msg">
            <AlertTriangle className="xb-icon is-warn" aria-hidden="true" />
            <p>{stage.say}</p>
          </div>
        )}

        {(stage.kind === 'open' || stage.kind === 'grading') && s && (
          <>
            <ol className="xb-rubric" aria-label="What to cover">
              {s.rubric?.map((r) => <li key={r.id}>{r.label}</li>)}
            </ol>
            <p className="xb-quiet">Guru stays quiet until you finish. A minute or two is enough.</p>

            <div className="xb-row">
              {canListen && (
                <Button variant="secondary" onClick={() => void listen()} aria-pressed={live !== null} disabled={stage.kind === 'grading'}>
                  {live !== null ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
                  {live !== null ? 'Stop' : text ? 'Speak more' : 'Speak'}
                </Button>
              )}
              <span className="xb-quiet" aria-live="polite">
                {live !== null ? 'Listening… pauses are fine. Press Stop when you’re done.' : note || `${words} word${words === 1 ? '' : 's'}`}
              </span>
            </div>
            {live !== null && <InkWave active />}
            <label className="xb-label" htmlFor="xb-text">
              Your explanation
            </label>
            <textarea id="xb-text" className="xb-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="The idea is… First I… This works because… It takes O(…) time and O(…) space… Edge cases…" disabled={stage.kind === 'grading'} />

            {s.trace && (
              <div className="xb-trace">
                <p className="xb-label">Trace it by hand: what does your code print for this input?</p>
                <pre className="xb-input" aria-label="The input">{s.trace.input}</pre>
                <label className="xb-label" htmlFor="xb-answer">
                  Your code prints
                </label>
                <input id="xb-answer" className="xb-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" spellCheck={false} disabled={stage.kind === 'grading'} />
              </div>
            )}

            <div className="xb-foot">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button onClick={() => void grade()} loading={stage.kind === 'grading'} disabled={words < 25 || (!!s.trace && !answer.trim())}>
                {stage.kind === 'grading' ? 'Grading…' : 'Grade my explanation'}
              </Button>
            </div>
            {words < 25 && <p className="xb-quiet xb-right">At least 25 words{s.trace ? ' and the trace answer' : ''}.</p>}
          </>
        )}

        {stage.kind === 'done' && <Result g={stage.g} onAgain={() => { setText(''); void start() }} onClose={close} />}
      </div>
    </Modal>
  )
}

function Result({ g, onAgain, onClose }: { g: Graded; onAgain: () => void; onClose: () => void }) {
  return (
    <div className="xb-result" aria-live="polite">
      <p className="xb-head">
        {g.passed ? <CheckCircle2 className="xb-icon is-good" aria-hidden="true" /> : <AlertTriangle className="xb-icon is-warn" aria-hidden="true" />}
        <span className="xb-score">
          {g.total} / {g.max}
        </span>
        <span>{g.counted ? 'Passed — counts towards your Nexus mastery' : g.passed ? 'Passed — practice' : 'Not yet'}</span>
      </p>
      {g.why && <p className="xb-quiet">{g.why}</p>}
      <ul className="xb-criteria">
        {g.criteria?.map((c) => (
          <li key={c.id}>
            <span className="xb-dots" role="img" aria-label={`${c.score} of 2`}>
              {[0, 1].map((i) => (
                <span key={i} className={cn('xb-dot', i < c.score && 'is-on')} aria-hidden="true" />
              ))}
            </span>
            <span className="xb-crit">{c.label}</span>
            {c.quote ? <q className="xb-quote">{c.quote}</q> : <span className="xb-quiet">Not in what you said</span>}
          </li>
        ))}
      </ul>
      {g.trace && (
        <p className="xb-trace-res">
          {g.trace.ok ? <CheckCircle2 className="xb-icon is-good" aria-hidden="true" /> : <AlertTriangle className="xb-icon is-warn" aria-hidden="true" />}
          {g.trace.ok ? 'Your trace is right.' : (
            <>
              The trace should print <code>{g.trace.expected}</code>.
            </>
          )}
        </p>
      )}
      {g.feedback && <p className="xb-feedback">{g.feedback}</p>}
      <div className="xb-foot">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" onClick={onAgain}>
          Try again
        </Button>
      </div>
    </div>
  )
}
