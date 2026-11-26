/*
  Pratibimb Studio (/pratibimb, docs/pratibimb/SPEC.md §4): make your own teacher model.
  Consent first (three ticks and a short video saying a random sentence), then photos with live checks,
  body and look, an optional voice sample, the build, and a preview where she says hello.
  Staff only until the owner opens it (the server answers 403 to everyone else).
*/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, Download, FileUp, Mic, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { buildModel, createLink, createModel, deleteModel, getModel, importPack, listModels, modelUrl, packUrl, PratibimbError, removeFile, speakLine, uploadFile, type Model } from './api'
import { CaptureStep } from './capture/CaptureStep'
import { TeacherPanel } from './TeacherPanel'
import type { Player, Framing } from './engine/player'
import type { Look } from './engine/look'
import './pratibimb.css'

type Step = 'consent' | 'photos' | 'body' | 'voice' | 'build' | 'preview'
const STEPS: { id: Step; label: string }[] = [
  { id: 'consent', label: 'Consent' },
  { id: 'photos', label: 'Photos and video' },
  { id: 'body', label: 'Body and look' },
  { id: 'voice', label: 'Voice' },
  { id: 'build', label: 'Build' },
  { id: 'preview', label: 'Meet her' },
]

const SENTENCES = [
  'I agree to make my teacher model today',
  'This is my own face and my own voice',
  'I am happy to make a teacher from my photos',
  'I give my consent to build this model',
]
const VOICE_LINES = [
  'Today we will learn how binary search finds a number in a sorted list.',
  'First we look at the middle. If it is too small, we search the right half.',
  'आज हम एक नया विषय सीखेंगे, ध्यान से सुनिए।',
]
const STAGE_NAMES: Record<string, string> = {
  download: 'Receiving your photos and video',
  capture: 'Reading every photo and frame',
  pack: 'Writing your identity pack',
  model: 'Building the 3D model',
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

function stepOf(m: Model | null): Step {
  if (!m) return 'consent'
  if (m.status === 'done') return 'preview'
  if (m.status === 'queued' || m.status === 'building' || m.status === 'failed') return 'build'
  return 'photos'
}

/* ── Recording (camera video or microphone) with a live level ── */
function useRecorder() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recording, setRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const stopLevel = useRef<() => void>(() => {})

  const open = useCallback(async (video: boolean) => {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    })
    const ctx = new AudioContext()
    const an = ctx.createAnalyser()
    an.fftSize = 1024
    ctx.createMediaStreamSource(s).connect(an)
    const buf = new Float32Array(an.fftSize)
    let raf = 0
    const tick = () => {
      an.getFloatTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += v * v
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6))
      raf = requestAnimationFrame(tick)
    }
    tick()
    stopLevel.current = () => {
      cancelAnimationFrame(raf)
      if (ctx.state !== 'closed') void ctx.close().catch(() => {})
      stopLevel.current = () => {}
    }
    setStream(s)
    return s
  }, [])

  const close = useCallback(() => {
    stopLevel.current()
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop())
      return null
    })
    setLevel(0)
  }, [])

  useEffect(() => close, [close])

  const start = useCallback((s: MediaStream, video: boolean) => {
    const types = video ? ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'] : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t))
    const r = new MediaRecorder(s, mimeType ? { mimeType } : undefined)
    chunks.current = []
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
    r.start(250)
    rec.current = r
    setRecording(true)
  }, [])

  const stop = useCallback(
    () =>
      new Promise<Blob>((resolve) => {
        const r = rec.current
        if (!r) return resolve(new Blob())
        r.onstop = () => {
          setRecording(false)
          resolve(new Blob(chunks.current, { type: (r.mimeType || 'video/webm').split(';')[0] }))
        }
        r.stop()
      }),
    [],
  )

  return { stream, recording, level, open, close, start, stop }
}

function Meter({ level }: { level: number }) {
  return (
    <div className="pbs-meter" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
      <span style={{ width: `${Math.round(level * 100)}%` }} />
    </div>
  )
}

/* ── Step 1: consent ── */
function ConsentStep({ onMade }: { onMade: (m: Model) => void }) {
  const [who, setWho] = useState<'self' | 'other'>('self')
  const [name, setName] = useState('')
  const [ticks, setTicks] = useState({ adult: false, agreed: false, understood: false })
  const sentence = useMemo(() => pick(SENTENCES), [])
  const r = useRecorder()
  const video = useRef<HTMLVideoElement>(null)
  const fileIn = useRef<HTMLInputElement>(null)
  const [clip, setClip] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const all = ticks.adult && ticks.agreed && ticks.understood
  const other = who === 'other'

  useEffect(() => {
    if (video.current) video.current.srcObject = r.stream
  }, [r.stream])

  async function record() {
    setError('')
    try {
      const s = r.stream ?? (await r.open(true))
      r.start(s, true)
    } catch {
      setError('The camera or microphone is blocked. Allow them in the browser’s address bar and try again.')
    }
  }
  async function stop() {
    const b = await r.stop()
    r.close()
    setClip(b.size > 0 ? b : null)
  }
  async function next() {
    if (!clip) return
    setBusy(true)
    setError('')
    try {
      const m = await createModel(
        other
          ? { subject: 'other', name: name.trim(), adult: true, permission: true, understood: true, sentence }
          : { subject: 'self', adult: true, ownFace: true, understood: true, sentence },
      )
      await uploadFile(m.id, 'consent', clip)
      onMade(await getModel(m.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }
  const clipUrl = useMemo(() => (clip ? URL.createObjectURL(clip) : ''), [clip])
  useEffect(() => () => void (clipUrl && URL.revokeObjectURL(clipUrl)), [clipUrl])

  const tick = (k: keyof typeof ticks, text: string) => (
    <label className="pbs-check">
      <input type="checkbox" checked={ticks[k]} onChange={(e) => setTicks((t) => ({ ...t, [k]: e.target.checked }))} />
      <span>{text}</span>
    </label>
  )
  return (
    <section className="pbs-card" aria-labelledby="pbs-consent">
      <StepHead n={1} id="pbs-consent" title="Consent" line="Whose model is this? The person whose face and voice it is must agree, on camera, in their own voice." />
      <div className="pbs-who" role="radiogroup" aria-label="Whose model">
        {([
          ['self', 'Me', 'My own face and voice.'],
          ['other', 'Someone I know', 'A friend, colleague or family member who has agreed.'],
        ] as const).map(([k, t, d]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={who === k}
            className="pbs-whoopt"
            onClick={() => {
              setWho(k)
              setTicks({ adult: false, agreed: false, understood: false })
              setClip(null)
            }}
          >
            <span className="pbs-whot">{t}</span>
            <span className="pbs-whod">{d}</span>
          </button>
        ))}
      </div>
      {other && (
        <label className="pbs-field">
          What should we call them? (only you see this)
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asha" />
        </label>
      )}
      <p>
        {other
          ? 'Their photos, voice and video stay private to your account, are never used for anything else, and one tap deletes them all. They can ask you to delete the model at any time.'
          : 'Your photos, voice and video stay private to you, are never used for anything else, and one tap deletes them all.'}
      </p>
      {tick('adult', other ? 'They are 18 or older.' : 'I am 18 or older.')}
      {tick('agreed', other ? 'They have agreed to a model of their face and voice being made for NexoraGuru, and the photos will be of them.' : 'These will be my own photos and my own voice.')}
      {tick('understood', other ? 'They understand it will look and sound like them, and is labelled as made by AI wherever it is shown.' : 'I understand the model will look and sound like me, and that it is labelled as made by AI wherever it is shown.')}
      <p>{other ? 'Now they read this sentence to the camera themselves: record them here, or upload a clip they recorded on their phone.' : 'Now record a short video of yourself saying this sentence:'}</p>
      <div className="pbs-sentence">“{sentence}”</div>
      <div className="pbs-row">
        {!clip && <video ref={video} className="pbs-video" autoPlay muted playsInline aria-label="Camera preview" hidden={!r.stream} />}
        {clip && <video className="pbs-video" src={clipUrl} controls playsInline aria-label="The consent video" />}
      </div>
      {r.recording && <Meter level={r.level} />}
      <input
        ref={fileIn}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setClip(f)
          e.target.value = ''
        }}
      />
      <div className="pbs-row">
        {!r.recording && (
          <Button variant="secondary" onClick={record} disabled={!all}>
            <Camera aria-hidden="true" /> {clip ? 'Record again' : 'Record the video'}
          </Button>
        )}
        {r.recording && (
          <Button variant="secondary" onClick={stop}>
            <Square aria-hidden="true" /> Stop
          </Button>
        )}
        {other && !r.recording && (
          <Button variant="ghost" onClick={() => fileIn.current?.click()} disabled={!all}>
            Upload their clip
          </Button>
        )}
        <Button onClick={next} disabled={!all || !clip || busy} loading={busy}>
          Continue
        </Button>
      </div>
      {other && <p className="pbs-note">The build checks that the face in this clip is the face in the photos. If it isn't, the model is not built.</p>}
      {error && <p className="pbs-error" role="alert">{error}</p>}
    </section>
  )
}

/* ── Step 3: body and look ── */
function BodyStep({ options, setOptions, onNext }: { options: Model['options']; setOptions: (o: Model['options']) => void; onNext: () => void }) {
  return (
    <section className="pbs-card" aria-labelledby="pbs-body">
      <StepHead n={3} id="pbs-body" title="Body and look" line="Your face comes from the photos. Tell us the rest." />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="pbs-field">
          Body
          <select value={options.body ?? 'neutral'} onChange={(e) => setOptions({ ...options, body: e.target.value })}>
            <option value="female">Woman</option>
            <option value="male">Man</option>
            <option value="neutral">Neutral</option>
          </select>
        </label>
        <label className="pbs-field">
          Height (cm)
          <input type="number" inputMode="numeric" min={130} max={210} value={options.heightCm ?? ''} placeholder="e.g. 160" onChange={(e) => setOptions({ ...options, heightCm: e.target.value ? +e.target.value : null })} />
        </label>
        <label className="pbs-field">
          Look
          <select value={options.style ?? 'painted'} onChange={(e) => setOptions({ ...options, style: e.target.value })}>
            <option value="painted">Painted (real tones, painted finish)</option>
            <option value="real">Closer to real</option>
            <option value="anime">Light anime</option>
          </select>
        </label>
        <label className="pbs-field">
          Clothes
          <select value={options.outfit ?? 'formal'} onChange={(e) => setOptions({ ...options, outfit: e.target.value })}>
            <option value="formal">Formal suit</option>
            <option value="casual">Smart casual</option>
          </select>
        </label>
      </div>
      <p className="text-sm">More clothes, including Indian wear, are being made. You can change them later without rebuilding the face.</p>
      <div className="pbs-row">
        <Button onClick={onNext}>Continue</Button>
      </div>
    </section>
  )
}

/* ── Step 4: voice (optional) ── */
function VoiceStep({ model, onNext, refresh }: { model: Model; onNext: () => void; refresh: () => Promise<void> }) {
  const r = useRecorder()
  const [at, setAt] = useState<number | null>(null)
  const [takes, setTakes] = useState<Record<number, { url: string; name: string }>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function record(i: number) {
    setError('')
    try {
      const s = r.stream ?? (await r.open(false))
      setAt(i)
      r.start(s, false)
    } catch {
      setError('The microphone is blocked. Allow it in the browser’s address bar and try again.')
    }
  }
  async function stop(i: number) {
    const b = await r.stop()
    setAt(null)
    if (b.size < 2000) return setError('That was too short. Read the whole line.')
    setBusy(true)
    try {
      const old = takes[i]
      if (old) await removeFile(model.id, old.name).catch(() => {})
      const name = await uploadFile(model.id, 'voice', b)
      setTakes((t) => ({ ...t, [i]: { url: URL.createObjectURL(b), name } }))
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }
  const done = Object.keys(takes).length
  return (
    <section className="pbs-card" aria-labelledby="pbs-voice">
      <StepHead n={4} id="pbs-voice" title="Voice" line="Optional. Read three lines; she will speak in your voice." />
      <p>Read each line aloud in a quiet room, phone or laptop about a hand’s length away. About 30 seconds in all. Until her own voice is ready, she speaks with the site’s Indian voice.</p>
      {VOICE_LINES.map((line, i) => (
        <div key={i} className="pbs-voice">
          <div className="text-base text-text-primary" lang={i === 2 ? 'hi' : 'en'}>
            {line}
          </div>
          {at === i && <Meter level={r.level} />}
          <div className="pbs-row">
            {at !== i ? (
              <Button variant="secondary" size="sm" onClick={() => void record(i)} disabled={at !== null || busy}>
                <Mic aria-hidden="true" /> {takes[i] ? 'Record again' : 'Record'}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => void stop(i)}>
                <Square aria-hidden="true" /> Stop
              </Button>
            )}
            {takes[i] && <audio src={takes[i].url} controls aria-label={`Your recording of line ${i + 1}`} />}
          </div>
        </div>
      ))}
      {error && <p className="pbs-error" role="alert">{error}</p>}
      <div className="pbs-row">
        <Button
          onClick={() => {
            r.close()
            onNext()
          }}
          disabled={at !== null || busy}
        >
          {done ? 'Continue' : 'Skip for now'}
        </Button>
      </div>
    </section>
  )
}

/* ── Step 5: build ── */
function BuildStep({ model, options, onStart, starting }: { model: Model; options: Model['options']; onStart: () => void; starting: boolean }) {
  const waiting = model.status === 'queued' || model.status === 'building'
  const stages = model.report?.stages ?? {}
  const keys = Object.keys(STAGE_NAMES)
  const at = model.stage ? keys.indexOf(model.stage) : -1
  return (
    <section className="pbs-card" aria-labelledby="pbs-build">
      <StepHead n={5} id="pbs-build" title="Build" line="The build machine turns your photos into your presenter, stage by stage." />
      {model.status === 'draft' && (
        <div className="pbs-ready">
          <dl className="pbs-stats pbs-stats-light">
            <div data-ok>
              <dt>Photos</dt>
              <dd>{model.photos.length}</dd>
            </div>
            <div data-ok={model.videos.length > 0 || undefined}>
              <dt>Video</dt>
              <dd>{model.videos.length || '—'}</dd>
            </div>
            <div data-ok={model.voices.length > 0 || undefined}>
              <dt>Voice</dt>
              <dd>{model.voices.length ? `${model.voices.length} lines` : '—'}</dd>
            </div>
            <div data-ok>
              <dt>Look</dt>
              <dd>{{ painted: 'Lightly painted', real: 'Closer to real', anime: 'Light anime' }[options.style ?? 'painted']}</dd>
            </div>
          </dl>
          <p className="pbs-note">The build runs on our machine and you can leave this page; it carries on and the result waits here.</p>
          <div className="pbs-row">
            <Button onClick={onStart} loading={starting}>
              Build my model
            </Button>
          </div>
        </div>
      )}
      {(waiting || model.status === 'done' || model.status === 'failed') && (
        <ol className="pbs-pipe" aria-live="polite">
          {keys.map((k, i) => {
            const s = stages[k]
            const state = model.status === 'done' || (at >= 0 && i < at) ? 'done' : model.stage === k ? (model.status === 'failed' ? 'fail' : 'now') : 'wait'

            return (
              <li key={k} data-state={state}>
                <span className="pbs-pipe-dot" aria-hidden="true">
                  {state === 'done' ? <Check className="size-3" /> : null}
                </span>
                <span className="pbs-pipe-name">{STAGE_NAMES[k]}</span>
                <span className="pbs-pipe-t">{s?.seconds != null ? `${s.seconds.toFixed(1)} s` : state === 'now' ? 'working…' : ''}</span>
                {s?.note && state !== 'wait' && <span className="pbs-pipe-note">{s.note}</span>}
              </li>
            )
          })}
        </ol>
      )}
      {model.status === 'queued' && <p className="pbs-note">Waiting for the build machine to pick it up.</p>}
      {model.status === 'failed' && (
        <>
          <p className="pbs-error" role="alert">
            The build stopped: {model.note || 'something went wrong.'}
          </p>
          <p className="pbs-note">Add or replace the photos it names, then build again.</p>
          <div className="pbs-row">
            <Button onClick={onStart} loading={starting}>
              Build again
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

/* ── Step 6: meet her (preview) ── */
const BOARD = [3, 8, 12, 17, 21, 26, 30, 35, 41]
function BinarySearchBoard({ target = 30 }: { target?: number }) {
  // Real binary search, one step at a time: lo, mid, hi on the sorted list.
  const steps = useMemo(() => {
    const out: { lo: number; hi: number; mid: number }[] = []
    let lo = 0
    let hi = BOARD.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      out.push({ lo, hi, mid })
      if (BOARD[mid] === target) break
      if (BOARD[mid] < target) lo = mid + 1
      else hi = mid - 1
    }
    return out
  }, [target])
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => (x + 1) % (steps.length + 1)), 1400)
    return () => window.clearInterval(id)
  }, [steps.length])
  const s = steps[Math.min(i, steps.length - 1)]
  const found = BOARD[s.mid] === target && i >= steps.length - 1
  return (
    <div className="grid gap-3">
      <div className="text-sm font-semibold text-text-primary">Find {target} in a sorted list</div>
      <div className="flex flex-wrap gap-1.5" role="list">
        {BOARD.map((v, k) => (
          <div
            role="listitem"
            key={k}
            className={`grid size-9 place-items-center rounded-md border text-sm tabular-nums transition-colors motion-reduce:transition-none ${
              k === s.mid ? (found ? 'border-state-success text-state-success' : 'border-accent-brand text-text-primary') : k < s.lo || k > s.hi ? 'border-dashed border-border text-text-muted line-through' : 'border-border text-text-primary'
            }`}
          >
            {v}
          </div>
        ))}
      </div>
      <div className="text-sm text-text-secondary" aria-live="polite">
        {found ? `Found ${target} at position ${s.mid}.` : `Middle is ${BOARD[s.mid]}: ${BOARD[s.mid] < target ? 'too small, search the right half' : 'too big, search the left half'}.`}
      </div>
    </div>
  )
}

function PreviewStep({ model }: { model: Model }) {
  const player = useRef<Player | null>(null)
  const [look, setLook] = useState<Look>((model.options.style as Look) || 'painted')
  const [framing, setFraming] = useState<Framing>('upper')
  const [board, setBoard] = useState(false)
  const [caption, setCaption] = useState<{ words: string[]; at: number } | null>(null)
  const [talking, setTalking] = useState(false)
  const [error, setError] = useState('')

  async function say(text: string) {
    const p = player.current
    if (!p) return
    setError('')
    setTalking(true)
    try {
      const line = await speakLine(text)
      const ctx = new AudioContext()
      const audio = await ctx.decodeAudioData(line.audio.slice(0))
      void ctx.close()
      const words = line.words?.words ?? text.split(/\s+/)
      const times = line.words?.wtimes ?? words.map((_, k) => (k * audio.duration * 1000) / words.length)
      const t0 = performance.now()
      let raf = 0
      const follow = () => {
        const ms = performance.now() - t0
        let at = -1
        while (at + 1 < times.length && times[at + 1] <= ms) at++
        setCaption({ words, at })
        raf = requestAnimationFrame(follow)
      }
      follow()
      await p.speak({ audio, timing: line.timing })
      cancelAnimationFrame(raf)
      setCaption({ words, at: words.length })
      window.setTimeout(() => setCaption(null), 1500)
    } catch (e) {
      setError(e instanceof PratibimbError ? e.message : 'She could not speak just now.')
    } finally {
      setTalking(false)
    }
  }

  return (
    <section className="pbs-card" aria-labelledby="pbs-meet">
      <StepHead n={6} id="pbs-meet" title="Meet her" line="Say hello, open the board, change the look." />
      {model.hasPack && (
        <p className="pbs-note">
          <a className="pbs-dl" href={packUrl(model.id)} download>
            <Download className="size-4" aria-hidden="true" /> Download the identity pack
          </a>{' '}
          Every feature measured from the photos and video, in one file. Keep it to rebuild this model later or on another account.
        </p>
      )}
      {model.likeness != null && model.likeness >= 0 && (
        <div className="pbs-like" data-ready={model.likeness >= 90 || undefined}>
          <span className="pbs-like-k">Likeness</span>
          <span className="pbs-like-v">{model.likeness}%</span>
          <span className="pbs-like-bar" role="meter" aria-label="Likeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={model.likeness}>
            <b style={{ width: `${model.likeness}%` }} />
            <i style={{ left: '90%' }} title="The 90% bar" />
          </span>
          <span className="pbs-note">{model.likeness >= 90 ? 'Ready to teach.' : 'Below the 90% bar: not ready to teach yet. Checked against photos the model was not made from.'}</span>
        </div>
      )}
      <TeacherPanel
        modelUrl={modelUrl(model.id)}
        look={look}
        framing={framing}
        board={board ? <BinarySearchBoard /> : null}
        caption={caption}
        onReady={(p) => {
          player.current = p
          p.gesture('namaste')
        }}
        onError={setError}
      />
      <div className="pbs-row">
        <Button onClick={() => void say('Namaste! I am your teacher. Shall we start with binary search?')} loading={talking}>
          Say hello
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setBoard((b) => !b)
            if (!board) void say('Look at the board. We always check the middle first.')
          }}
          disabled={talking}
        >
          {board ? 'Close the board' : 'Open the board'}
        </Button>
        <Button variant="ghost" onClick={() => player.current?.gesture('wave')}>
          Wave
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="pbs-field">
          Look
          <select value={look} onChange={(e) => setLook(e.target.value as Look)}>
            <option value="painted">Painted</option>
            <option value="real">Closer to real</option>
            <option value="anime">Light anime</option>
          </select>
        </label>
        <label className="pbs-field">
          View
          <select value={framing} onChange={(e) => setFraming(e.target.value as Framing)}>
            <option value="portrait">Face</option>
            <option value="upper">Upper body</option>
            <option value="full">Full body</option>
          </select>
        </label>
      </div>
      {error && <p className="pbs-error" role="alert">{error}</p>}
    </section>
  )
}

/* ── The journey: what is really done, from the model's own files ── */
const NEEDED: string[] = ['front', 'left', 'right', 'smile', 'waist']
function journeyFacts(m: Model, options: Model['options']) {
  const shots = new Set(Object.values(m.shots ?? {}))
  const needed = NEEDED.filter((x) => shots.has(x)).length
  const extra = Math.max(0, (m.photos?.length ?? 0) - needed)
  const videos = m.videos?.length ?? 0
  const voices = m.voices?.length ?? 0
  const style = { painted: 'Lightly painted', real: 'Closer to real', anime: 'Light anime' }[options.style as string] ?? 'Lightly painted'
  const building = m.status === 'queued' || m.status === 'building'
  const done: Record<Step, boolean> = {
    consent: m.consentVideo,
    photos: needed === NEEDED.length,
    body: !!m.options?.body,
    voice: voices > 0,
    build: m.status === 'done',
    preview: m.status === 'done',
  }
  const sub: Record<Step, string> = {
    consent: m.consentVideo ? 'Recorded' : 'Needed',
    photos: `${needed} of 5 needed${extra ? ` · ${extra} more` : ''}`,
    body: style,
    voice: voices ? `${voices} line${voices > 1 ? 's' : ''}` : 'Optional',
    build: m.status === 'done' ? 'Built' : m.status === 'failed' ? 'Stopped' : building ? STAGE_NAMES[m.stage ?? ''] ?? 'Waiting' : 'Not started',
    preview: m.status === 'done' ? 'Ready' : 'After the build',
  }
  const stats = [
    { k: 'Photos', v: `${needed}/5${extra ? ` +${extra}` : ''}`, ok: needed === 5 },
    { k: 'Video', v: videos ? String(videos) : '—', ok: videos > 0 },
    { k: 'Voice', v: voices ? `${voices} lines` : '—', ok: voices > 0 },
    { k: 'Model', v: m.status === 'done' ? (m.likeness != null ? `${m.likeness}% alike` : 'Ready') : building ? 'Building' : m.status === 'failed' ? 'Stopped' : 'Not built', ok: m.status === 'done' },
  ]
  return { done, sub, stats }
}

/** Which steps can be opened: in order, and the build and preview only when they make sense. */
function canReach(step: Step, m: Model | null) {
  if (!m) return step === 'consent'
  const needed = NEEDED.filter((x) => Object.values(m.shots ?? {}).includes(x)).length === NEEDED.length
  if (step === 'consent') return false
  if (step === 'photos') return m.status === 'draft' || m.status === 'failed'
  if (step === 'body' || step === 'voice') return needed && (m.status === 'draft' || m.status === 'failed')
  if (step === 'build') return needed || m.status !== 'draft'
  return m.status === 'done'
}

function StepHead({ n, id, title, line }: { n: number; id: string; title: string; line: string }) {
  return (
    <div className="pbs-stephead">
      <span className="pbs-stepn">{String(n).padStart(2, '0')}</span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{line}</p>
      </div>
    </div>
  )
}

/* ── A pack made earlier (here or on another account) ── */
function ImportPack({ disabled, onDone }: { disabled: boolean; onDone: (m: Model) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function go() {
    if (!file) return
    setBusy(true)
    setMsg('')
    try {
      const r = await importPack(file)
      setMsg(r.signed ? 'Imported. The pack is genuine and unchanged.' : 'Imported. This pack was not signed by NexoraGuru, so it is marked as unverified.')
      setFile(null)
      setAgree(false)
      onDone(r.model)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'This pack cannot be used')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="pbs-import">
      <span className="pbs-new-plus pbs-import-icon" aria-hidden="true">
        <FileUp className="size-4" />
      </span>
      <span className="pbs-new-t">Import a pack</span>
      <span className="pbs-new-s">A .pbpack file downloaded from a model, on this account or another. No new photos needed.</span>
      <input ref={input} type="file" accept=".pbpack,application/zip" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="pbs-row">
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
          {file ? 'Change file' : 'Choose pack'}
        </Button>
        {file && <span className="pbs-note">{file.name}</span>}
      </div>
      {file && (
        <>
          <label className="pbs-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I have this person's permission to make their model here.</span>
          </label>
          <Button size="sm" onClick={() => void go()} disabled={!agree || busy} loading={busy}>
            Import
          </Button>
        </>
      )}
      {msg && <p className="pbs-note" role="status">{msg}</p>}
    </div>
  )
}

/* ── The page ── */
export default function StudioPage() {
  const [models, setModels] = useState<Model[] | null>(null)
  const [model, setModel] = useState<Model | null>(null)
  const [step, setStep] = useState<Step>('consent')
  const [making, setMaking] = useState(false)
  const [options, setOptions] = useState<Model['options']>({ body: 'female', heightCm: null, style: 'painted', outfit: 'formal' })
  const [blocked, setBlocked] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listModels()
      .then(setModels)
      .catch((e) => setBlocked(e instanceof PratibimbError && e.status === 403 ? 'Pratibimb is being tested by the team and opens to everyone soon.' : 'Could not load your models. Try again in a moment.'))
  }, [])

  const modelId = model?.id
  const refresh = useCallback(async () => {
    if (!modelId) return
    setModel(await getModel(modelId))
  }, [modelId])
  const makeLink = useCallback(() => createLink(modelId!), [modelId])

  // While a build runs, check on it.
  useEffect(() => {
    if (!model || (model.status !== 'queued' && model.status !== 'building')) return
    const id = window.setInterval(() => {
      getModel(model.id)
        .then((m) => {
          setModel(m)
          if (m.status === 'done') setStep('preview')
        })
        .catch(() => {})
    }, 5000)
    return () => window.clearInterval(id)
  }, [model])

  function open(m: Model) {
    setModel(m)
    setOptions({ body: 'female', style: 'painted', outfit: 'formal', heightCm: null, ...m.options })
    setStep(stepOf(m))
    setMaking(true)
  }
  async function start() {
    if (!model) return
    setStarting(true)
    setError('')
    try {
      setModel(await buildModel(model.id, options))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the build')
    } finally {
      setStarting(false)
    }
  }
  async function remove(m: Model) {
    if (!window.confirm('Delete this model with all its photos, voice and video? This cannot be undone.')) return
    await deleteModel(m.id).catch(() => {})
    setModels((xs) => (xs ?? []).filter((x) => x.id !== m.id))
    if (model?.id === m.id) {
      setModel(null)
      setMaking(false)
    }
  }

  const at = STEPS.findIndex((s) => s.id === step)
  const facts = model ? journeyFacts(model, options) : null
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 sm:px-6">
      <div className="pbs">
        <header className="pbs-hero">
          <div className="pbs-hero-main">
            <div className="flex items-center gap-3">
              <BackButton className="pbs-hero-back" />
              <span className="pbs-eyebrow">Pratibimb studio · प्रतिबिम्ब</span>
            </div>
            <h1 className="pbs-title">A teacher made from you</h1>
            <p className="pbs-line">Your face from your photos, your voice from your recording: a waist-up presenter who teaches on NexoraGuru. Private to you until you choose to use it.</p>
          </div>
          {making && facts ? (
            <dl className="pbs-stats" aria-label="This model">
              {facts.stats.map((f) => (
                <div key={f.k} data-ok={f.ok || undefined}>
                  <dt>{f.k}</dt>
                  <dd>{f.v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <ol className="pbs-flow" aria-label="How it works">
              {STEPS.map((s, i) => (
                <li key={s.id}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {s.label}
                </li>
              ))}
            </ol>
          )}
        </header>

        {blocked && (
          <section className="pbs-card">
            <p>{blocked}</p>
          </section>
        )}

        {!blocked && !making && models && (
          <section aria-labelledby="pbs-yours" className="grid gap-4">
            <div className="pbs-sechead">
              <h2 id="pbs-yours" className="pbs-h2">Your models</h2>
              <span className="pbs-count">{models.length} of 3</span>
            </div>
            <ul className="pbs-models">
              {models.map((m) => {
                const f = journeyFacts(m, m.options)
                return (
                  <li key={m.id} className="pbs-model" data-status={m.status}>
                    <div className="pbs-model-top">
                      <span className="pbs-pill" data-status={m.status}>
                        {m.status === 'done' ? 'Ready' : m.status === 'failed' ? 'Build stopped' : m.status === 'draft' ? 'In progress' : m.status === 'queued' ? 'Waiting to build' : 'Building'}
                      </span>
                      <span className="pbs-date">{new Date(m.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <dl className="pbs-model-stats">
                      {f.stats.slice(0, 3).map((x) => (
                        <div key={x.k}>
                          <dt>{x.k}</dt>
                          <dd>{x.v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="pbs-row">
                      <Button size="sm" onClick={() => open(m)}>
                        {m.status === 'done' ? 'Open' : 'Continue'}
                      </Button>
                      {m.hasPack && (
                        <a className="pbs-dl" href={packUrl(m.id)} download aria-label="Download the identity pack">
                          <Download className="size-4" aria-hidden="true" /> Pack
                        </a>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => void remove(m)} aria-label="Delete this model">
                        <Trash2 aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  </li>
                )
              })}
              <li>
                <button
                  type="button"
                  className="pbs-new"
                  disabled={models.length >= 3}
                  onClick={() => {
                    setModel(null)
                    setStep('consent')
                    setMaking(true)
                  }}
                >
                  <span className="pbs-new-plus" aria-hidden="true">+</span>
                  <span className="pbs-new-t">Make a new model</span>
                  <span className="pbs-new-s">{models.length >= 3 ? 'You can keep 3. Delete one first.' : 'About 5 minutes: consent, photos, an optional video and voice.'}</span>
                </button>
              </li>
              <li>
                <ImportPack disabled={models.length >= 3} onDone={(m) => setModels((xs) => [m, ...(xs ?? [])])} />
              </li>
            </ul>
          </section>
        )}

        {making && (
          <>
            <nav className="pbs-journey" aria-label="Steps">
              <ol>
                {STEPS.map((s, i) => {
                  const reach = canReach(s.id, model)
                  const state = i < at ? 'done' : i === at ? 'current' : 'next'
                  return (
                    <li key={s.id} data-state={state} data-ok={facts?.done[s.id] || undefined}>
                      <button type="button" disabled={!reach || i === at} aria-current={i === at ? 'step' : undefined} onClick={() => setStep(s.id)}>
                        <span className="pbs-node" aria-hidden="true">
                          {facts?.done[s.id] ? <Check className="size-3.5" /> : String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="pbs-jlabel">{s.label}</span>
                        <span className="pbs-jsub">{facts ? facts.sub[s.id] : s.id === 'consent' ? 'Now' : ''}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
              <div className="pbs-track" aria-hidden="true">
                <span style={{ width: `${(at / (STEPS.length - 1)) * 100}%` }} />
              </div>
            </nav>
            {step === 'consent' && (
              <ConsentStep
                onMade={(m) => {
                  setModel(m)
                  setModels((xs) => [m, ...(xs ?? [])])
                  setStep('photos')
                }}
              />
            )}
            {step === 'photos' && model && (
              <section className="pbs-card" aria-labelledby="pbs-photos">
                <StepHead n={2} id="pbs-photos" title="Photos and video" line="The camera reads your face as you take each photo and tells you exactly what to change. Five photos are needed; more angles and a short video bring her closer to you." />
                <CaptureStep
                  shots={model.shots ?? {}}
                  videos={model.videos?.length ?? 0}
                  upload={(kind, blob, shot) => uploadFile(model.id, kind, blob, shot)}
                  refresh={refresh}
                  makeLink={makeLink}
                  onDone={() => setStep('body')}
                />
              </section>
            )}
            {step === 'body' && <BodyStep options={options} setOptions={setOptions} onNext={() => setStep('voice')} />}
            {step === 'voice' && model && <VoiceStep model={model} refresh={refresh} onNext={() => setStep('build')} />}
            {step === 'build' && model && <BuildStep model={model} options={options} onStart={() => void start()} starting={starting} />}
            {step === 'preview' && model && <PreviewStep model={model} />}
            {error && <p className="pbs-error" role="alert">{error}</p>}
            <div className="pbs-row">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMaking(false)
                  void listModels().then(setModels).catch(() => {})
                }}
              >
                All my models
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
