/*
  The recording studio, full screen:
    1. Choose: camera, screen, screen with your face, or a whiteboard; mic on/off.
    2. Record: a 3-2-1 count, then pause/resume, "Mark a chapter" (K), stop.
       Up to 20 minutes.
    3. Review: watch it, trim the start and end, name the chapters, give it a
       title, pick the cover frame, choose who can see it, and upload (in
       pieces, so a weak connection can carry on).
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bookmark, Camera, Circle, Monitor, MonitorPlay, Pause, PenLine, Play, Square, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Board, type BoardHandle } from '@/live/ui/Board'
import '@/live/live.css'
import { fmtTime, uploadVideo, type Chapter, type ExplainKind, type ExplainVideo, type Source } from './api'
import { canRecordScreen, grabPoster, MAX_MS, pickMime, Recording, startCapture, type Capture } from './recorder'

type Step = 'choose' | 'count' | 'rec' | 'review' | 'upload'

const SOURCES: { id: Source; title: string; text: string; icon: typeof Camera; screen?: boolean }[] = [
  { id: 'screen+camera', title: 'Screen and you', text: 'Your screen, with your face in a corner. Best for walking through a solution.', icon: MonitorPlay, screen: true },
  { id: 'screen', title: 'Screen only', text: 'A screen, a window or a tab, with your voice.', icon: Monitor, screen: true },
  { id: 'board', title: 'Whiteboard', text: 'Write it out with a stylus or the mouse while you talk.', icon: PenLine },
  { id: 'camera', title: 'Camera', text: 'Just you, or point it at your notebook.', icon: Camera },
]

export function Studio({ kind, target, about, onClose, onDone }: { kind: ExplainKind; target: string; about: string; onClose: () => void; onDone: (v: ExplainVideo) => void }) {
  const [step, setStep] = useState<Step>('choose')
  const [source, setSource] = useState<Source>(() => (canRecordScreen() ? 'screen+camera' : 'board'))
  const [mic, setMic] = useState(true)
  const [count, setCount] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string; durationMs: number } | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [trim, setTrim] = useState<[number, number]>([0, 0])
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [poster, setPoster] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const capture = useRef<Capture | null>(null)
  const rec = useRef<Recording | null>(null)
  const preview = useRef<HTMLVideoElement>(null)
  const review = useRef<HTMLVideoElement>(null)
  const board = useRef<BoardHandle>(null)
  const abort = useRef<AbortController | null>(null)
  const supported = typeof MediaRecorder !== 'undefined' && !!pickMime()

  // Stop everything if the studio closes mid-way.
  useEffect(
    () => () => {
      capture.current?.stop()
      abort.current?.abort()
    },
    [],
  )
  useEffect(() => () => (result ? URL.revokeObjectURL(result.url) : undefined), [result])

  useEffect(() => {
    if (preview.current && capture.current && (step === 'count' || step === 'rec')) preview.current.srcObject = capture.current.preview
  }, [step])

  const mark = () => {
    const at = Math.round(rec.current?.elapsed() ?? 0)
    setChapters((c) => [...c, { at, title: `Part ${c.length + 1}` }])
  }

  const stop = async () => {
    if (!rec.current || rec.current.state === 'inactive') return
    const r = await rec.current.stop()
    capture.current?.stop()
    capture.current = null
    if (r.durationMs < 3000) {
      setError('That was very short. Record at least a few seconds.')
      setStep('choose')
      return
    }
    setResult({ blob: r.blob, url: URL.createObjectURL(r.blob), durationMs: r.durationMs })
    setTrim([0, r.durationMs])
    setStep('review')
  }

  // The clock, and the 20-minute limit.
  useEffect(() => {
    if (step !== 'rec') return
    const id = window.setInterval(() => {
      const ms = rec.current?.elapsed() ?? 0
      setElapsed(ms)
      if (ms >= MAX_MS) void stop()
    }, 250)
    return () => window.clearInterval(id)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 'rec') return
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        mark()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const begin = async () => {
    setError(null)
    try {
      const boardTrack = source === 'board' ? board.current?.track() ?? null : null
      capture.current = await startCapture(source, { mic, board: boardTrack })
    } catch (e) {
      const msg = (e as Error).message
      if (msg) setError(msg)
      return
    }
    // If the person stops sharing from the browser's own bar, finish.
    capture.current.stream.getVideoTracks()[0]?.addEventListener('ended', () => void stop())
    setStep('count')
    for (const n of [3, 2, 1]) {
      setCount(n)
      await new Promise((r) => setTimeout(r, 800))
    }
    rec.current = new Recording(capture.current.stream, source)
    rec.current.start()
    setChapters([])
    setStep('rec')
  }

  const discard = () => {
    setResult(null)
    setPoster(null)
    setStep('choose')
  }

  const upload = async () => {
    if (!result) return
    if (!title.trim()) {
      setError('Give the video a title.')
      return
    }
    setError(null)
    setStep('upload')
    abort.current = new AbortController()
    try {
      const cover = poster ?? (review.current ? grabPoster(review.current) : null)
      const v = await uploadVideo(
        result.blob,
        {
          kind,
          target,
          title,
          note,
          source,
          durationMs: result.durationMs,
          trimStartMs: trim[0],
          trimEndMs: trim[1] >= result.durationMs - 200 ? null : trim[1],
          chapters: chapters.filter((c) => c.title.trim()),
          visibility,
        },
        cover,
        setProgress,
        abort.current.signal,
      )
      onDone(v)
    } catch (e) {
      setError((e as Error).message || 'Upload failed. Try again.')
      setStep('review')
    }
  }

  const sizeMb = result ? result.blob.size / 1024 / 1024 : 0
  const kept = trim[1] - trim[0]

  return createPortal(
    <div className="ex-studio" role="dialog" aria-modal="true" aria-label="Record an explanation">
      <div className="ex-studio-head">
        <div className="min-w-0">
          <p className="ed-label m-0">Record an explanation</p>
          <p className="ex-studio-about">{about}</p>
        </div>
        {step === 'rec' ? (
          <span className={cn('ex-rec-pill', paused && 'is-paused')} role="status">
            <Circle className="size-2.5 fill-current" aria-hidden="true" /> {paused ? 'Paused' : 'Recording'} · {fmtTime(elapsed)} / {fmtTime(MAX_MS)}
          </span>
        ) : (
          <button type="button" className="lv-round" onClick={onClose} aria-label="Close the studio">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="ex-studio-body">
        {!supported ? (
          <p className="lv-status is-bad">This browser cannot record video. Use Chrome, Edge, Firefox or Safari 14.1 or newer.</p>
        ) : step === 'choose' ? (
          <div className="ex-choose">
            <h2 className="ex-h">How do you want to explain it?</h2>
            <div className="ex-sources" role="radiogroup" aria-label="What to record">
              {SOURCES.map((s) => {
                const off = s.screen && !canRecordScreen()
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={source === s.id}
                    disabled={off}
                    className={cn('ex-source', source === s.id && 'is-on')}
                    onClick={() => setSource(s.id)}
                  >
                    <s.icon className="size-6" aria-hidden="true" />
                    <strong>{s.title}</strong>
                    <span>{off ? 'Phones and iPads cannot record their screen in a browser.' : s.text}</span>
                  </button>
                )
              })}
            </div>
            {source === 'board' && <Board ref={board} className="ex-board" />}
            <div className="ex-choose-foot">
              <label className="lv-check">
                <input type="checkbox" checked={mic} onChange={(e) => setMic(e.target.checked)} />
                <span>
                  <strong>Record my voice</strong>
                  <span className="lv-hint">Talk through your thinking; it is what makes an explanation.</span>
                </span>
              </label>
              {error && (
                <p className="lv-status is-bad" role="alert">
                  {error}
                </p>
              )}
              <button type="button" className="lv-join is-inline" onClick={() => void begin()}>
                Start recording
              </button>
            </div>
            <ul className="ex-tips" aria-label="Tips">
              <li>Say the question in one line first, then the idea, then the steps.</li>
              <li>Press K while recording to start a new chapter.</li>
              <li>You can trim the start and end before you upload.</li>
            </ul>
          </div>
        ) : step === 'count' || step === 'rec' ? (
          <div className="ex-recording">
            {source === 'board' ? (
              <Board ref={board} className="ex-board is-live" />
            ) : (
              <video ref={preview} className={cn('ex-preview', source === 'camera' && 'is-mirror')} autoPlay muted playsInline />
            )}
            {step === 'count' && (
              <div className="ex-count" aria-live="assertive">
                <span key={count}>{count}</span>
              </div>
            )}
            {step === 'rec' && (
              <div className="ex-rec-bar">
                <button
                  type="button"
                  className="ex-rec-btn"
                  onClick={() => {
                    if (paused) rec.current?.resume()
                    else rec.current?.pause()
                    setPaused(!paused)
                  }}
                >
                  {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />} {paused ? 'Resume' : 'Pause'}
                </button>
                <button type="button" className="ex-rec-btn" onClick={mark} title="K">
                  <Bookmark className="size-4" aria-hidden="true" /> Mark a chapter
                </button>
                <button type="button" className="ex-rec-btn is-stop" onClick={() => void stop()}>
                  <Square className="size-4 fill-current" aria-hidden="true" /> Stop
                </button>
                {chapters.length > 0 && <span className="ex-rec-n">{chapters.length} chapters</span>}
              </div>
            )}
          </div>
        ) : result ? (
          <div className="ex-review">
            <div className="ex-review-main">
              <video ref={review} className="ex-review-video" src={result.url} controls playsInline preload="auto" />
              <TrimBar duration={result.durationMs} value={trim} onChange={setTrim} chapters={chapters} onSeek={(ms) => review.current && (review.current.currentTime = ms / 1000)} />
              <p className="lv-hint">
                Keeps {fmtTime(kept)} of {fmtTime(result.durationMs)} · {sizeMb.toFixed(1)} MB
              </p>
            </div>
            <div className="ex-review-side">
              <label className="lv-field">
                <span className="ed-label">Title</span>
                <input className="lv-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="The trick: why the greedy choice is safe" />
              </label>
              <label className="lv-field">
                <span className="ed-label">A line about it (optional)</span>
                <textarea className="lv-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
              </label>
              <div className="lv-field">
                <span className="ed-label">Chapters</span>
                {chapters.length === 0 && <p className="lv-hint m-0">Play to a moment and add a chapter there.</p>}
                <ul className="ex-ch-edit">
                  {chapters.map((c, i) => (
                    <li key={i}>
                      <span className="ex-chapter-at">{fmtTime(c.at)}</span>
                      <input className="lv-input" value={c.title} maxLength={80} aria-label={`Chapter at ${fmtTime(c.at)}`} onChange={(e) => setChapters((l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                      <button type="button" className="lv-round" aria-label="Remove chapter" onClick={() => setChapters((l) => l.filter((_, j) => j !== i))}>
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="lv-chip-btn self-start"
                  onClick={() => {
                    const at = Math.round((review.current?.currentTime ?? 0) * 1000)
                    setChapters((l) => [...l, { at, title: `Part ${l.length + 1}` }].sort((a, b) => a.at - b.at))
                  }}
                >
                  <Bookmark className="size-3.5" aria-hidden="true" /> Add a chapter here
                </button>
              </div>
              <div className="lv-field">
                <span className="ed-label">Cover</span>
                <div className="ex-cover-row">
                  {poster ? <img src={poster} alt="Chosen cover" className="ex-cover" /> : <span className="lv-hint">The first frame, unless you pick one.</span>}
                  <button type="button" className="lv-chip-btn" onClick={() => review.current && setPoster(grabPoster(review.current))}>
                    Use this frame
                  </button>
                </div>
              </div>
              <fieldset className="lv-field">
                <legend className="ed-label">Who can watch</legend>
                <div className="lv-choice-row">
                  {(
                    [
                      ['public', 'Everyone'],
                      ['private', 'Only me'],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className={cn('lv-choice', visibility === id && 'is-on')}>
                      <input type="radio" name="ex-vis" className="sr-only" checked={visibility === id} onChange={() => setVisibility(id)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && (
                <p className="lv-status is-bad" role="alert">
                  {error}
                </p>
              )}
              <div className="ex-review-actions">
                <button type="button" className="lv-chip-btn" onClick={discard}>
                  Record again
                </button>
                <button type="button" className="lv-join is-inline" onClick={() => void upload()} disabled={!title.trim()}>
                  Upload
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {step === 'upload' && (
          <div className="ex-uploading" role="status" aria-live="polite">
            <p className="ex-h">Uploading…</p>
            <div className="ex-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <span style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="lv-hint">
              {Math.round(progress * 100)}% of {sizeMb.toFixed(1)} MB. If the connection drops, it carries on where it stopped.
            </p>
            <button type="button" className="lv-chip-btn" onClick={() => abort.current?.abort()}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Two handles over a timeline: what is kept. Chapter marks sit on it. */
function TrimBar({ duration, value, onChange, chapters, onSeek }: { duration: number; value: [number, number]; onChange: (v: [number, number]) => void; chapters: Chapter[]; onSeek: (ms: number) => void }) {
  const [a, b] = value
  const pct = (ms: number) => `${(ms / duration) * 100}%`
  const step = Math.max(100, Math.round(duration / 1000) * 10)
  const marks = useMemo(() => chapters.map((c) => c.at), [chapters])
  return (
    <div className="ex-trim">
      <div className="ex-trim-track">
        <span className="ex-trim-kept" style={{ left: pct(a), width: pct(b - a) }} />
        {marks.map((m) => (
          <span key={m} className="ex-bar-tick" style={{ left: pct(m) }} />
        ))}
      </div>
      <input
        type="range"
        className="ex-trim-handle"
        min={0}
        max={duration}
        step={step}
        value={a}
        aria-label={`Start: ${fmtTime(a)}`}
        onChange={(e) => {
          const v = Math.min(Number(e.target.value), b - 1000)
          onChange([v, b])
          onSeek(v)
        }}
      />
      <input
        type="range"
        className="ex-trim-handle"
        min={0}
        max={duration}
        step={step}
        value={b}
        aria-label={`End: ${fmtTime(b)}`}
        onChange={(e) => {
          const v = Math.max(Number(e.target.value), a + 1000)
          onChange([a, v])
          onSeek(v)
        }}
      />
      <div className="ex-trim-labels">
        <span>Start {fmtTime(a)}</span>
        <span>End {fmtTime(b)}</span>
      </div>
    </div>
  )
}
