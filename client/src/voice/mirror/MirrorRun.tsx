/*
  Mirror Run (docs/voice/BLUEPRINT.md §4.3, lane D): the student says their
  approach, it becomes pseudocode written exactly as said, and it runs on the
  lesson's input beside the lesson's own run. The first step where the two
  differ lights up, and one question about that step is asked. Bugs are kept:
  seeing your own mistake run is the point.

  Saying the approach uses the free AI chain (src/voice/pseudo.js); typing the
  steps needs nothing. Running and comparing happen here, in the browser.
*/
import { useCallback, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Mic, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Frame, Inputs } from '@/learn/engine/types'
import { useVoiceAction } from '../actions/useVoiceAction'
import { getVoicePrefs } from '../prefs'
import { listenOnce, speechSupported, type ListenHandle } from '../speech'
import { speak } from '../speak'
import { activeScene, sceneById } from '../scene/active'
import { runPseudo, type Env } from './pseudo'
import { compareRuns, type Verdict } from './compare'
import './mirror.css'

const PLACEHOLDER = `lo ← 0; hi ← n − 1
while lo ≤ hi
  mid ← (lo + hi) / 2
  if a[mid] = x: return mid
  …`

const fmt = (v: unknown) => (v === null || v === undefined ? '—' : Array.isArray(v) ? `[${v.join(', ')}]` : String(v))

export function MirrorRun({ sceneId, title, inputs, frames }: { sceneId: string; title: string; inputs: Inputs | null; frames: Frame[] }) {
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState('')
  const [listening, setListening] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [ranOn, setRanOn] = useState<string>('')
  const handle = useRef<ListenHandle | null>(null)
  const boxRef = useRef<HTMLTextAreaElement | null>(null)

  const env = useMemo<Env | null>(() => (inputs ? (Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, typeof v === 'string' ? null : (v as number | number[])])) as Env) : null), [inputs])
  const inputKey = JSON.stringify(inputs)

  const run = useCallback(
    (text = src) => {
      if (!env) return
      const r = runPseudo(text, env)
      const v = compareRuns(r, frames)
      setVerdict(v)
      setRanOn(inputKey)
      const say = v.kind === 'same' || v.kind === 'nothing' ? v.say : v.question
      if (getVoicePrefs().consent && getVoicePrefs().speak) speak(say, getVoicePrefs().lang)
      if (v.kind === 'differ') sceneById(sceneId)?.go(v.lessonFrame)
    },
    [env, frames, inputKey, sceneId, src],
  )

  const listen = useCallback(async () => {
    if (handle.current) {
      handle.current.stop()
      return
    }
    const prefs = getVoicePrefs()
    if (!prefs.consent) {
      setNote('Turn on voice first: press the mic in the top bar once and allow it. Or type your steps below.')
      return
    }
    setNote('')
    setListening('')
    handle.current = await listenOnce({
      lang: prefs.lang,
      onText: (t) => setListening(t),
      onDone: async (text) => {
        handle.current = null
        setListening(null)
        if (!text) {
          setNote('I didn’t hear anything. Press “Say your approach” and speak.')
          return
        }
        setBusy(true)
        setNote(`“${text}”`)
        try {
          const r = await api.post<{ pseudo: string; say: string }>('/api/voice/pseudo', { text, inputs: Object.keys(inputs ?? {}), lessonTitle: title })
          if (r.pseudo) {
            setSrc(r.pseudo)
            setVerdict(null)
          }
          setNote(r.say)
          requestAnimationFrame(() => boxRef.current?.focus())
        } catch (e) {
          setNote(e instanceof Error && e.message ? e.message : 'Couldn’t write the steps — type them instead.')
        } finally {
          setBusy(false)
        }
      },
    })
  }, [inputs, title])

  // "Mirror run", "meri approach chalao": open the panel and listen.
  useVoiceAction({
    id: `mirror.${sceneId}`,
    title: 'Mirror Run: try your own approach',
    group: 'Animation',
    say: { en: ['mirror run', 'try my approach', 'run my approach', 'meri approach chalao', 'apna approach batata hoon', 'my approach'] },
    risk: 'safe',
    // Several animations on a page: only the one in use answers.
    when: () => (activeScene()?.id ?? sceneId) === sceneId,
    run: () => {
      setOpen(true)
      void listen()
    },
  })

  const lines = src.split('\n')
  const hot = verdict?.kind === 'differ' || verdict?.kind === 'error' ? verdict.line : 0
  const stale = verdict && ranOn !== inputKey

  if (!open) {
    return (
      <div className="mr-closed">
        <span>Have your own approach? Say it and watch it run beside this one.</span>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Mirror Run
        </Button>
      </div>
    )
  }

  return (
    <section className="mr" aria-label="Mirror Run">
      <div className="mr-head">
        <div className="min-w-0">
          <h3 className="mr-title">Mirror Run</h3>
          <p className="mr-sub">Your steps, exactly as you say them, run on this input beside the lesson. The first difference lights up.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>

      <div className="mr-row">
        {speechSupported() && (
          <Button size="sm" variant="secondary" onClick={() => void listen()} loading={busy} aria-pressed={listening !== null}>
            {listening !== null ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
            {listening !== null ? 'Stop' : 'Say your approach'}
          </Button>
        )}
        <span className="mr-note" aria-live="polite">
          {listening !== null ? (listening ? `“${listening}”` : 'Listening… say what you do first, what repeats, and when you stop.') : note || 'Or type the steps.'}
        </span>
      </div>

      <div className="mr-grid">
        <div className="mr-editor">
          <label className="mr-label" htmlFor={`mr-src-${sceneId}`}>
            Your steps
          </label>
          <div className="mr-code">
            <div className="mr-gutter" aria-hidden="true">
              {lines.map((_, i) => (
                <span key={i} className={cn(hot === i + 1 && 'is-hot')}>
                  {i + 1}
                </span>
              ))}
            </div>
            <textarea
              id={`mr-src-${sceneId}`}
              ref={boxRef}
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              rows={Math.max(6, Math.min(16, lines.length + 1))}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  run()
                }
              }}
            />
          </div>
          <div className="mr-row">
            <Button size="sm" variant="secondary" onClick={() => run()} disabled={!src.trim() || !env}>
              <Play aria-hidden="true" /> Run beside the lesson
            </Button>
            <span className="mr-hint">Ctrl+Enter · ← or = to set · if / while / for i from 0 to n − 1</span>
          </div>
        </div>

        <div className="mr-result" aria-live="polite">
          {!verdict && <p className="mr-empty">The comparison shows here after a run.</p>}
          {verdict && <VerdictView v={verdict} stale={!!stale} onShow={(f) => sceneById(sceneId)?.go(f)} />}
        </div>
      </div>
    </section>
  )
}

function VerdictView({ v, stale, onShow }: { v: Verdict; stale: boolean; onShow: (frame: number) => void }) {
  const good = v.kind === 'same'
  const icon = good ? <CheckCircle2 className="mr-icon is-good" aria-hidden="true" /> : <AlertTriangle className={cn('mr-icon', v.kind === 'error' ? 'is-bad' : 'is-warn')} aria-hidden="true" />
  return (
    <div className="mr-verdict">
      <p className="mr-verdict-head">
        {icon}
        {v.kind === 'same' && 'Same steps as the lesson'}
        {v.kind === 'differ' && `First difference: ${v.name}`}
        {v.kind === 'result' && 'Same steps, different answer'}
        {v.kind === 'error' && 'Your steps stopped'}
        {v.kind === 'nothing' && 'Nothing to compare yet'}
      </p>
      {v.kind === 'error' && <p className="mr-msg">{v.message}</p>}
      {v.kind === 'differ' && (
        <dl className="mr-pair">
          <div>
            <dt>Yours (line {v.line})</dt>
            <dd>
              {v.name} = {v.mine === 'stopped' ? 'no more changes' : fmt(v.mine)}
            </dd>
          </div>
          <div>
            <dt>The lesson</dt>
            <dd>
              {v.lessonName} = {v.lesson === 'finished' ? 'finished' : fmt(v.lesson)}
            </dd>
          </div>
        </dl>
      )}
      {v.kind === 'result' && (
        <dl className="mr-pair">
          <div>
            <dt>You return</dt>
            <dd>{fmt(v.mine)}</dd>
          </div>
          <div>
            <dt>The lesson’s answer</dt>
            <dd>{fmt(v.lesson)}</dd>
          </div>
        </dl>
      )}
      <p className="mr-question">{v.kind === 'same' || v.kind === 'nothing' ? v.say : v.question}</p>
      {v.kind === 'differ' && (
        <Button size="sm" variant="ghost" onClick={() => onShow(v.lessonFrame)}>
          Show this step in the animation
        </Button>
      )}
      {stale && <p className="mr-hint">The input changed since this run. Run again to compare on the new input.</p>}
    </div>
  )
}
