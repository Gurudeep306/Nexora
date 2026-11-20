/*
  /explain/pad/:token — explaining on an iPad or tablet, opened by QR from
  the computer. It is not signed in: the token stands for one member and one
  lesson, part of a lesson or question for 12 hours, and can only add videos.

  Two ways:
    Whiteboard        write with the Pencil while you talk; the mic is on and
                      your face can sit in a round corner. Recorded here.
    Screen recording  Safari cannot record the iPad's screen from a page, so
                      the iPad's own Screen Recording (with its mic) does it,
                      and the video is picked here.
  Then: watch it, give it a title, choose who can watch, upload (in pieces,
  resumable). The computer that showed the code sees it at once.
*/
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Circle, FileVideo, Mic, MicOff, Pause, PenLine, Play, Square, User, UserX } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'
import { Board, type BoardHandle } from '@/live/ui/Board'
import { explainApi, fmtTime, uploadVideo, type Source } from '@/explain/api'
import { grabPoster, MAX_MS, pickMime, Recording, startCapture, type Capture } from '@/explain/recorder'
import { readVideoFile } from '@/explain/file'
import { DeviceMessage } from '@/pages/hand/PadPage'
import '@/pages/hand/hand.css'
import '@/live/live.css'
import '@/explain/explain.css'

type Info = { about: string; name: string }
type Step = 'board' | 'count' | 'rec' | 'file' | 'review' | 'upload' | 'done'
type Result = { blob: Blob; url: string; durationMs: number; source: Source }

export default function ExplainPadPage() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    document.title = 'Explain on your iPad · NexoraGuru'
    explainApi
      .device(token)
      .then((r) => setInfo({ about: r.about, name: r.name }))
      .catch((e: Error) => setError(e.message || 'This link has expired. Make a new one on your computer.'))
  }, [token])
  if (error) return <DeviceMessage title="This link can't be used" body={error} />
  if (!info) return <DeviceMessage title="Opening…" body="" busy />
  return <Pad token={token} info={info} />
}

function Pad({ token, info }: { token: string; info: Info }) {
  const [step, setStep] = useState<Step>('board')
  const [mic, setMic] = useState(true)
  const [face, setFace] = useState(false)
  const [count, setCount] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [progress, setProgress] = useState(0)
  const board = useRef<BoardHandle>(null)
  const capture = useRef<Capture | null>(null)
  const rec = useRef<Recording | null>(null)
  const review = useRef<HTMLVideoElement>(null)
  const abort = useRef<AbortController | null>(null)
  const canRecord = typeof MediaRecorder !== 'undefined' && !!pickMime()

  useEffect(
    () => () => {
      capture.current?.stop()
      abort.current?.abort()
    },
    [],
  )
  useEffect(() => () => (result ? URL.revokeObjectURL(result.url) : undefined), [result])

  // Keep the screen awake while recording or uploading.
  useEffect(() => {
    if (step !== 'rec' && step !== 'upload') return
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [step])

  const stop = async () => {
    if (!rec.current || rec.current.state === 'inactive') return
    const r = await rec.current.stop()
    capture.current?.stop()
    capture.current = null
    setPaused(false)
    if (r.durationMs < 3000) {
      setError('That was very short. Record at least a few seconds.')
      setStep('board')
      return
    }
    setResult({ blob: r.blob, url: URL.createObjectURL(r.blob), durationMs: r.durationMs, source: 'board' })
    setStep('review')
  }

  useEffect(() => {
    if (step !== 'rec') return
    const id = window.setInterval(() => {
      const ms = rec.current?.elapsed() ?? 0
      setElapsed(ms)
      if (ms >= MAX_MS) void stop()
    }, 250)
    return () => window.clearInterval(id)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const begin = async () => {
    setError(null)
    try {
      capture.current = await startCapture('board', { mic, board: board.current?.track() ?? null, face })
    } catch (e) {
      setError((e as Error).message || 'Could not start recording.')
      return
    }
    setStep('count')
    for (const n of [3, 2, 1]) {
      setCount(n)
      await new Promise((r) => setTimeout(r, 700))
    }
    rec.current = new Recording(capture.current.stream, 'board')
    rec.current.start()
    setElapsed(0)
    setStep('rec')
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const r = await readVideoFile(file)
      setResult({ ...r, source: 'upload' })
      setStep('review')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const upload = async () => {
    if (!result || !title.trim()) return
    setError(null)
    setProgress(0)
    setStep('upload')
    abort.current = new AbortController()
    try {
      await uploadVideo(
        result.blob,
        { kind: 'lesson', target: '', title, note: '', source: result.source, durationMs: result.durationMs, trimStartMs: 0, trimEndMs: null, chapters: [], visibility },
        review.current ? grabPoster(review.current) : null,
        setProgress,
        abort.current.signal,
        `/api/explain/device/${encodeURIComponent(token)}/videos`,
      )
      setStep('done')
    } catch (e) {
      setError((e as Error).message || 'Upload failed. Try again.')
      setStep('review')
    }
  }

  const again = () => {
    setResult(null)
    setTitle('')
    setError(null)
    setStep('board')
  }

  if (step === 'done')
    return (
      <DeviceMessage
        title="Posted"
        body={`Your explanation is on ${info.about}. Your computer shows it now. You can close this tab, or record another.`}
        done
        action={
          <button type="button" className="hw-btn hw-btn-main" onClick={again}>
            Record another
          </button>
        }
      />
    )

  const recording = step === 'count' || step === 'rec'
  return (
    <main className="xp">
      <header className="xp-head">
        <LogoMark size={26} intro={false} />
        <div className="min-w-0">
          <p className="xp-kicker">Explain on your iPad · {info.name}</p>
          <h1 className="xp-about" style={{ textWrap: 'nowrap' }}>{info.about}</h1>
        </div>
        {step === 'rec' && (
          <span className={cn('ex-rec-pill', paused && 'is-paused')} role="status">
            <Circle className="size-2.5 fill-current" aria-hidden="true" /> {paused ? 'Paused' : 'Recording'} · {fmtTime(elapsed)}
          </span>
        )}
      </header>

      {(step === 'board' || step === 'file') && (
        <div className="xp-modes lv-seg" role="tablist" aria-label="How to explain">
          <button type="button" role="tab" aria-selected={step === 'board'} className={cn('xp-mode', step === 'board' && 'is-on')} onClick={() => (setError(null), setStep('board'))}>
            <PenLine className="size-4" aria-hidden="true" /> Whiteboard
          </button>
          <button type="button" role="tab" aria-selected={step === 'file'} className={cn('xp-mode', step === 'file' && 'is-on')} onClick={() => (setError(null), setStep('file'))}>
            <FileVideo className="size-4" aria-hidden="true" /> Whole screen
          </button>
        </div>
      )}

      {/* The board stays mounted from choosing to recording, so nothing written is lost. */}
      {(step === 'board' || recording) && (
        <div className="xp-stage">
          <Board ref={board} className="xp-board" />
          {step === 'board' && <p className="xp-turn">Turn your device sideways for a bigger board.</p>}
          {step === 'count' && (
            <div className="ex-count" aria-live="assertive">
              <span key={count}>{count}</span>
            </div>
          )}
        </div>
      )}

      {step === 'file' && (
        <section className="xp-file" aria-labelledby="xp-file-h">
          <h2 id="xp-file-h" className="ex-h">
            Record the whole iPad screen, with your voice
          </h2>
          <p className="lv-hint">A web page cannot record the iPad's screen, so the iPad's own Screen Recording does it. Then pick the video here.</p>
          <ol className="lv-steps">
            <li>Swipe down from the top-right corner to open Control Centre.</li>
            <li>
              Touch and hold the Screen Recording button <Circle className="inline size-3.5 align-[-2px]" aria-label="(a circle in a ring)" />. If it is not there: Settings → Control Centre → add Screen Recording.
            </li>
            <li>Turn Microphone on, then tap Start Recording.</li>
            <li>Explain in any app: this lesson, Notes, GoodNotes, a PDF.</li>
            <li>To stop, tap the red time at the top. The video goes to Photos.</li>
          </ol>
          <label className="ex-file">
            <input type="file" accept="video/*" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
            <FileVideo className="size-5" aria-hidden="true" />
            <span>
              <strong>Choose the video</strong>
              <span className="lv-hint">Up to 20 minutes and 300 MB.</span>
            </span>
          </label>
        </section>
      )}

      {step === 'review' && result && (
        <section className="xp-review" aria-label="Check and upload">
          <video ref={review} className="ex-review-video" src={result.url} controls playsInline preload="auto" />
          <div className="xp-review-side">
            <label className="lv-field">
              <span className="ed-label">Title</span>
              <input className="lv-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="The idea in one line" />
            </label>
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
                    <input type="radio" name="xp-vis" className="sr-only" checked={visibility === id} onChange={() => setVisibility(id)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="lv-hint m-0">
              {fmtTime(result.durationMs)} · {(result.blob.size / 1024 / 1024).toFixed(1)} MB. Trim it and add chapters later from your computer.
            </p>
            {error && (
              <p className="lv-status is-bad" role="alert">
                {error}
              </p>
            )}
            <div className="ex-review-actions">
              <button type="button" className="lv-chip-btn" onClick={again}>
                Start over
              </button>
              <button type="button" className="lv-join is-inline" onClick={() => void upload()} disabled={!title.trim()}>
                Upload
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'upload' && (
        <div className="ex-uploading" role="status" aria-live="polite">
          <p className="ex-h">Uploading…</p>
          <div className="ex-progress" role="progressbar" aria-label="Upload" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="lv-hint">{Math.round(progress * 100)}%. Keep this tab open; if the connection drops, it carries on.</p>
          <button type="button" className="lv-chip-btn" onClick={() => abort.current?.abort()}>
            Cancel
          </button>
        </div>
      )}

      {(step === 'board' || recording) && (
        <footer className="xp-bar">
          {step === 'board' ? (
            <>
              <button type="button" className={cn('xp-toggle', mic && 'is-on')} aria-pressed={mic} onClick={() => setMic(!mic)}>
                {mic ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />} {mic ? 'Mic on' : 'Mic off'}
              </button>
              <button type="button" className={cn('xp-toggle', face && 'is-on')} aria-pressed={face} onClick={() => setFace(!face)}>
                {face ? <User className="size-4" aria-hidden="true" /> : <UserX className="size-4" aria-hidden="true" />} {face ? 'Face in corner' : 'No face'}
              </button>
              {error && (
                <p className="lv-status is-bad xp-err" role="alert">
                  {error}
                </p>
              )}
              <button type="button" className="lv-join is-inline xp-go" onClick={() => void begin()} disabled={!canRecord}>
                <Circle className="size-3 fill-current" aria-hidden="true" /> {canRecord ? 'Start recording' : 'This browser cannot record'}
              </button>
            </>
          ) : step === 'rec' ? (
            <>
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
              <span className="xp-time">
                {fmtTime(elapsed)} / {fmtTime(MAX_MS)}
              </span>
              <button type="button" className="ex-rec-btn is-stop" onClick={() => void stop()}>
                <Square className="size-4 fill-current" aria-hidden="true" /> Stop
              </button>
            </>
          ) : (
            <span className="xp-time">Starting…</span>
          )}
        </footer>
      )}
    </main>
  )
}
