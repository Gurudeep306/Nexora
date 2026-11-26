/*
  Pratibimb Studio (/pratibimb, docs/pratibimb/SPEC.md §4): make your own teacher model.
  Consent first (three ticks and a short video saying a random sentence), then photos with live checks,
  body and look, an optional voice sample, the build, and a preview where she says hello.
  Staff only until the owner opens it (the server answers 403 to everyone else).
*/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, Mic, Square, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { buildModel, createModel, deleteModel, getModel, listModels, modelUrl, PratibimbError, removeFile, speakLine, uploadFile, type Model } from './api'
import { checkPhoto, type PhotoCheck } from './checks'
import { TeacherPanel } from './TeacherPanel'
import type { Player, Framing } from './engine/player'
import type { Look } from './engine/look'
import './pratibimb.css'

type Step = 'consent' | 'photos' | 'body' | 'voice' | 'build' | 'preview'
const STEPS: { id: Step; label: string }[] = [
  { id: 'consent', label: 'Consent' },
  { id: 'photos', label: 'Photos' },
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
const PHOTO_GUIDE = ['Face, straight on', 'Face turned a little left', 'Face turned a little right', 'A natural smile', 'Head and shoulders', 'Full body, standing']
const STAGE_NAMES: Record<string, string> = {
  analyse: 'Reading the photos',
  body: 'Body',
  reference: 'Base face',
  shape: 'Face shape',
  face: 'Face controls',
  skin: 'Skin',
  features: 'Brows, eyes and lips',
  look: 'Finish',
  build: 'Model',
  check: 'Likeness check',
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
  const [ticks, setTicks] = useState({ adult: false, ownFace: false, understood: false })
  const sentence = useMemo(() => pick(SENTENCES), [])
  const r = useRecorder()
  const video = useRef<HTMLVideoElement>(null)
  const [clip, setClip] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const all = ticks.adult && ticks.ownFace && ticks.understood

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
      const m = await createModel(sentence)
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
      <h2 id="pbs-consent">First, your consent</h2>
      <p>A teacher model is made only from your own face and voice. Your photos, voice and video stay private to you, are never used to train anything, and one tap deletes them all.</p>
      {tick('adult', 'I am 18 or older.')}
      {tick('ownFace', 'These will be my own photos and my own voice.')}
      {tick('understood', 'I understand the model will look and sound like me, and that it is labelled as made by AI wherever it is shown.')}
      <p>Now record a short video of yourself saying this sentence:</p>
      <div className="pbs-sentence">“{sentence}”</div>
      <div className="pbs-row">
        {!clip && <video ref={video} className="pbs-video" autoPlay muted playsInline aria-label="Camera preview" hidden={!r.stream} />}
        {clip && <video className="pbs-video" src={clipUrl} controls playsInline aria-label="Your consent video" />}
      </div>
      {r.recording && <Meter level={r.level} />}
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
        <Button onClick={next} disabled={!all || !clip || busy} loading={busy}>
          Continue
        </Button>
      </div>
      {error && <p className="pbs-error" role="alert">{error}</p>}
    </section>
  )
}

/* ── Step 2: photos ── */
interface Shot {
  name: string
  url: string
  check: PhotoCheck | null
}
function PhotosStep({ model, onNext, refresh }: { model: Model; onNext: () => void; refresh: () => Promise<void> }) {
  const [shots, setShots] = useState<Shot[]>([])
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const count = model.photos.length

  async function add(files: FileList | null) {
    if (!files) return
    setError('')
    for (const f of Array.from(files)) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        setError('Use JPG, PNG or WebP photos.')
        continue
      }
      setBusy((b) => b + 1)
      try {
        const [check, name] = await Promise.all([checkPhoto(f).catch(() => null), uploadFile(model.id, 'photo', f)])
        setShots((s) => [...s, { name, url: URL.createObjectURL(f), check }])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setBusy((b) => b - 1)
      }
    }
    await refresh()
  }
  async function remove(name: string) {
    await removeFile(model.id, name).catch(() => {})
    setShots((s) => s.filter((x) => x.name !== name))
    await refresh()
  }
  useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const earlier = model.photos.filter((n) => !shots.some((s) => s.name === n)).length
  return (
    <section className="pbs-card" aria-labelledby="pbs-photos">
      <h2 id="pbs-photos">Your photos</h2>
      <p>Add 3 to 12 photos taken today, in soft daylight, with no glasses, mask or filter. Hair away from the eyes. These help most:</p>
      <ul className="pbs-guide">
        {PHOTO_GUIDE.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void add(e.target.files).then(() => (e.target.value = ''))} />
      <div className="pbs-row">
        <Button variant="secondary" onClick={() => input.current?.click()} loading={busy > 0}>
          <Upload aria-hidden="true" /> Add photos
        </Button>
        <span className="text-sm text-text-secondary">
          {count} added{earlier > 0 ? ` (${earlier} from before)` : ''}
        </span>
      </div>
      {shots.length > 0 && (
        <ul className="pbs-photos">
          {shots.map((s) => (
            <li key={s.name} className="pbs-photo">
              <img src={s.url} alt="" />
              <button type="button" className="pbs-remove" onClick={() => void remove(s.name)} aria-label="Remove this photo">
                <X className="size-4" aria-hidden="true" />
              </button>
              {s.check?.ok && (
                <span className="pbs-ok">
                  <Check className="inline size-3.5" aria-hidden="true" /> Looks good
                </span>
              )}
              {s.check?.notes.map((n) => (
                <span key={n} className="pbs-warn">
                  {n}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="pbs-error" role="alert">{error}</p>}
      <div className="pbs-row">
        <Button onClick={onNext} disabled={count < 3 || busy > 0}>
          Continue
        </Button>
        {count < 3 && <span className="text-sm text-text-muted">At least 3 photos.</span>}
      </div>
    </section>
  )
}

/* ── Step 3: body and look ── */
function BodyStep({ options, setOptions, onNext }: { options: Model['options']; setOptions: (o: Model['options']) => void; onNext: () => void }) {
  return (
    <section className="pbs-card" aria-labelledby="pbs-body">
      <h2 id="pbs-body">Body and look</h2>
      <p>Her face comes from the photos. Tell us the rest.</p>
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
      <h2 id="pbs-voice">Your voice (optional)</h2>
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
  return (
    <section className="pbs-card" aria-labelledby="pbs-build">
      <h2 id="pbs-build">Build your model</h2>
      {model.status === 'draft' && (
        <>
          <p>
            {model.photos.length} photos, {model.voices.length ? `${model.voices.length} voice lines` : 'no voice yet'}, {options.style ?? 'painted'} look. The build runs on our machine and usually takes 10 to 20 minutes. You can leave this page.
          </p>
          <div className="pbs-row">
            <Button onClick={onStart} loading={starting}>
              Build my model
            </Button>
          </div>
        </>
      )}
      {waiting && (
        <>
          <p aria-live="polite">{model.status === 'queued' ? 'Waiting for the build machine…' : `Working: ${STAGE_NAMES[model.stage ?? ''] ?? model.stage ?? '…'}`}</p>
          <ol className="pbs-stages">
            {Object.entries(STAGE_NAMES).map(([k, label]) => (
              <li key={k} className={k in stages ? 'pbs-ok' : model.stage === k ? 'text-text-primary' : 'text-text-muted'}>
                {k in stages ? <Check className="inline size-3.5" aria-hidden="true" /> : '·'} {label}
              </li>
            ))}
          </ol>
        </>
      )}
      {model.status === 'failed' && (
        <>
          <p className="pbs-error" role="alert">
            The build stopped: {model.note || 'something went wrong.'}
          </p>
          <p>Add or replace the photos it names, then build again.</p>
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
      <h2 id="pbs-meet">Meet your teacher</h2>
      {model.likeness != null && <p>Likeness to your photos (checked on photos the model was not made from): {model.likeness}%.</p>}
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

  const refresh = useCallback(async () => {
    if (!model) return
    const m = await getModel(model.id)
    setModel(m)
  }, [model])

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
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-32 sm:px-6">
      <div className="pbs">
        <header className="pbs-head">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="pbs-title">Pratibimb</h1>
          </div>
          <p className="pbs-line">Make a teacher who looks and sounds like you, from a few photos and your voice.</p>
        </header>

        {blocked && (
          <section className="pbs-card">
            <p>{blocked}</p>
          </section>
        )}

        {!blocked && !making && models && (
          <section className="pbs-card" aria-labelledby="pbs-yours">
            <h2 id="pbs-yours">Your models</h2>
            {models.length === 0 ? (
              <p>You have no models yet. It takes about 5 minutes of your time: consent, photos, and an optional voice sample.</p>
            ) : (
              <ul className="pbs-models">
                {models.map((m) => (
                  <li key={m.id} className="pbs-model">
                    <span className="text-sm">
                      <span className="font-semibold text-text-primary">{m.status === 'done' ? 'Ready' : m.status === 'failed' ? 'Build stopped' : m.status === 'draft' ? 'Not built yet' : 'Building'}</span>
                      <span className="text-text-muted"> · {new Date(m.createdAt).toLocaleDateString()}</span>
                    </span>
                    <span className="pbs-row">
                      <Button variant="secondary" size="sm" onClick={() => open(m)}>
                        {m.status === 'done' ? 'Open' : 'Continue'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void remove(m)} aria-label="Delete this model">
                        <Trash2 aria-hidden="true" /> Delete
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="pbs-row">
              <Button
                onClick={() => {
                  setModel(null)
                  setStep('consent')
                  setMaking(true)
                }}
                disabled={models.length >= 3}
              >
                Make a new model
              </Button>
              {models.length >= 3 && <span className="text-sm text-text-muted">You can keep up to 3. Delete one first.</span>}
            </div>
          </section>
        )}

        {making && (
          <>
            <ol className="pbs-steps" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li key={s.id} className={`pbs-step${i < at ? ' pbs-done' : ''}`} aria-current={i === at ? 'step' : undefined}>
                  {s.label}
                </li>
              ))}
            </ol>
            {step === 'consent' && (
              <ConsentStep
                onMade={(m) => {
                  setModel(m)
                  setModels((xs) => [m, ...(xs ?? [])])
                  setStep('photos')
                }}
              />
            )}
            {step === 'photos' && model && <PhotosStep model={model} refresh={refresh} onNext={() => setStep('body')} />}
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
