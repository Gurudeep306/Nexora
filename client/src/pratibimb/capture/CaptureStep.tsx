/*
  The capture studio (docs/pratibimb/SPEC.md, stage C1). The main way is one guided scan: the person
  follows the poses, every photo is picked from the camera by measurement, and the session is saved as
  the video. A phone (QR code) runs the same scan; uploads are checked and sorted into the poses they show.

  The viewfinder shows what the system sees: the person's own face mesh, a scan ring that lights up
  for every head angle captured, live readouts (distance, light, evenness, sharpness, angle) and one
  plain instruction. When everything is right it fills a ring and takes the photo by itself.

  Used on the Studio page (signed in) and on the phone page /pratibimb/capture/<token> (not signed in).
*/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, ScanFace, Smartphone, SwitchCamera, Upload, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { handQrCard, handQrPlaceholder, themeQrColors } from '@/components/hand/qrCard'
import { loadCoach, read, readImage, type Reading } from './coach'
import { photosFromVideo } from './fromVideo'
import { cssColors, drawHud, targetTick, tickFor } from './hud'
import { coverage, DEFAULT_BASE, judge, SHOTS, type Baseline, type Check as CheckT, type Shot, type ShotId } from './shots'

type Mode = 'scan' | 'phone' | 'upload'

export interface CaptureProps {
  /** photo file name → shot */
  shots: Record<string, string>
  videos: number
  upload: (kind: 'photo' | 'video', blob: Blob, shot?: string) => Promise<unknown>
  refresh: () => Promise<void>
  /** Signed-in side only: make a phone link. */
  makeLink?: () => Promise<{ path: string; expiresAt: number }>
  onDone?: () => void
  /** The phone page: no phone link. */
  onPhone?: boolean
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function CaptureStep({ shots, videos, upload, refresh, makeLink, onDone, onPhone }: CaptureProps) {
  const done = useMemo(() => new Set(Object.values(shots) as ShotId[]), [shots])
  const cov = coverage(done, videos)
  const [mode, setMode] = useState<Mode>('scan')
  // A retake of one pose (from the list), or null for the full scan.
  const [only, setOnly] = useState<ShotId | null>(null)
  const [session, setSession] = useState(0)
  const [base, setBase] = useState<Baseline>(DEFAULT_BASE)
  const [thumbs, setThumbs] = useState<Partial<Record<ShotId, string>>>({})

  const onPhoto = useCallback(
    async (s: Shot, blob: Blob) => {
      setThumbs((t) => ({ ...t, [s.id]: URL.createObjectURL(blob) }))
      await upload('photo', blob, s.id)
      await refresh()
    },
    [upload, refresh],
  )
  const onVideo = useCallback(
    async (blob: Blob) => {
      await upload('video', blob)
      await refresh()
    },
    [upload, refresh],
  )

  const modes: { id: Mode; label: string; icon: typeof Camera }[] = [
    { id: 'scan', label: 'Guided scan', icon: ScanFace },
    ...(makeLink ? [{ id: 'phone' as Mode, label: 'Phone', icon: Smartphone }] : []),
    { id: 'upload', label: 'Upload', icon: Upload },
  ]

  return (
    <div className="pbx">
      <div className="pbx-top">
        <Meter score={cov.score} word={cov.word} need={cov.need} />
        <div className="pbx-modes" role="tablist" aria-label="How to give your photos">
          {modes.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} className="pbx-mode" onClick={() => setMode(m.id)}>
              <m.icon className="size-4" aria-hidden="true" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {(mode === 'scan' || mode === 'upload') && (
        <div className="pbx-body">
          {mode === 'scan' ? (
            <ScanSession
              key={`${session}-${only ?? 'all'}`}
              done={done}
              only={only}
              base={base}
              onBase={setBase}
              onPhoto={onPhoto}
              onVideo={onVideo}
              onClose={() => {
                setOnly(null)
                setSession((n) => n + 1)
              }}
            />
          ) : (
            <Uploads done={done} base={base} upload={upload} refresh={refresh} onThumb={(id, url) => setThumbs((t) => ({ ...t, [id]: url }))} />
          )}
          <ShotRail
            current={mode === 'scan' ? only : null}
            done={done}
            thumbs={thumbs}
            onPick={(id) => {
              setOnly(id)
              setSession((n) => n + 1)
              setMode('scan')
            }}
          />
        </div>
      )}
      {mode === 'phone' && makeLink && <PhoneLink makeLink={makeLink} refresh={refresh} />}

      {onDone && (
        <div className="pbs-row">
          <Button onClick={onDone} disabled={cov.need > 0}>
            Continue
          </Button>
          {cov.need > 0 && <span className="text-sm text-text-muted">{cov.need} needed photo{cov.need > 1 ? 's' : ''} to go{onPhone ? '' : ', or pick one in the list to take just that one'}.</span>}
        </div>
      )}
    </div>
  )
}

/* ── Quality meter ─────────────────────────────────────────────────────────────────────────── */
function Meter({ score, word, need }: { score: number; word: string; need: number }) {
  const marks = [
    { at: 60, label: 'Good' },
    { at: 80, label: 'Great' },
    { at: 95, label: 'Best' },
  ]
  return (
    <div className="pbx-meter">
      <div className="pbx-meter-head">
        <span className="pbx-meter-k">Model quality</span>
        <span className="pbx-meter-word">{word}</span>
        <span className="pbx-meter-n">{score}</span>
      </div>
      <div className="pbx-meter-track" role="progressbar" aria-label="Model quality" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-valuetext={word}>
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} data-on={score >= (i + 1) * 5 || undefined} />
        ))}
      </div>
      <div className="pbx-meter-marks" aria-hidden="true">
        {marks.map((m) => (
          <span key={m.label} style={{ left: `${m.at}%` }} data-on={score >= m.at || undefined}>
            {m.label}
          </span>
        ))}
      </div>
      <p className="pbx-meter-sub">{need ? `${need} more needed to build` : 'Ready to build. More angles and a video make her even closer to you.'}</p>
    </div>
  )
}

/* ── Shot rail ─────────────────────────────────────────────────────────────────────────────── */
function Pictogram({ shot }: { shot: Shot }) {
  // A head seen from the front; the nose and eyes shift with the turn, the mouth shows the expression.
  const dx = shot.id === 'left' ? -5 : shot.id === 'right' ? 5 : shot.id === 'far-left' ? -9 : shot.id === 'far-right' ? 9 : 0
  const dy = shot.id === 'up' ? -4 : shot.id === 'down' ? 4 : 0
  if (shot.frame === 'waist')
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="11" r="6" />
        <path d="M8 38c0-10 5-17 12-17s12 7 12 17" />
      </svg>
    )
  const mouth = shot.id === 'smile' ? `M${15 + dx} ${26 + dy}q5 4 10 0` : shot.id === 'open' ? '' : `M${16 + dx} ${27 + dy}h8`
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="20" rx="12" ry="15" />
      <circle cx={15 + dx} cy={17 + dy} r="1.3" />
      <circle cx={25 + dx} cy={17 + dy} r="1.3" />
      {shot.id === 'brows' && <path d={`M${12 + dx} ${12 + dy}q3 -2 6 0M${22 + dx} ${12 + dy}q3 -2 6 0`} />}
      <path d={`M${20 + dx * 1.3} ${18 + dy}l-1.5 4h3`} />
      {mouth ? <path d={mouth} /> : <ellipse cx={20 + dx} cy={27 + dy} rx="2.5" ry="2" />}
    </svg>
  )
}

function ShotRail({ current, done, thumbs, onPick }: { current: ShotId | null; done: Set<ShotId>; thumbs: Partial<Record<ShotId, string>>; onPick: (id: ShotId) => void }) {
  return (
    <ol className="pbx-rail" aria-label="Photos">
      {SHOTS.map((s) => (
        <li key={s.id}>
          <button type="button" className="pbx-railitem" aria-current={current === s.id ? 'step' : undefined} data-done={done.has(s.id) || undefined} onClick={() => onPick(s.id)}>
            <span className="pbx-thumb">
              {thumbs[s.id] ? <img src={thumbs[s.id]} alt="" /> : <Pictogram shot={s} />}
              {done.has(s.id) && (
                <span className="pbx-tick">
                  <Check className="size-3" aria-hidden="true" />
                </span>
              )}
            </span>
            <span className="pbx-railtext">
              <span>{s.title}</span>
              <span className="pbx-railsub">{done.has(s.id) ? 'Taken · retake' : s.need ? 'Needed' : 'Makes it better'}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

/* ── The camera ────────────────────────────────────────────────────────────────────────────── */
function useCamera(facing: 'user' | 'environment', audio = false) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  useEffect(() => {
    let s: MediaStream | null = null
    let alive = true
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio })
      .then((m) => {
        if (!alive) return m.getTracks().forEach((t) => t.stop())
        s = m
        setStream(m)
        if (video.current) {
          video.current.srcObject = m
          void video.current.play().catch(() => {})
        }
      })
      .catch(() => alive && setError('The camera is blocked or missing. Allow it in the address bar, or use Upload or your phone instead.'))
    return () => {
      alive = false
      s?.getTracks().forEach((t) => t.stop())
    }
  }, [facing, audio])
  return { video, error, stream }
}


/** The five live readouts under the viewfinder, from the same checks that gate the shutter. */
function readouts(r: Reading | null, checks: CheckT[], shot: Shot) {
  const ok = (label: string) => checks.find((c) => c.label === label)?.ok ?? false
  const [lo, hi] = shot.frame === 'face' ? [0.22, 0.62] : [0.07, 0.2]
  return [
    { label: 'Distance', ok: ok('Distance'), fill: r ? Math.min(1, Math.max(0.05, (r.size - lo * 0.5) / (hi - lo * 0.5))) : 0 },
    { label: 'Light', ok: ok('Light'), fill: r ? Math.min(1, r.light / 200) : 0 },
    { label: 'Even', ok: ok('Even light'), fill: r ? Math.max(0.05, 1 - r.sideLight / 0.6) : 0 },
    { label: 'Sharp', ok: ok('Still and sharp'), fill: r ? Math.min(1, r.sharp / 200) * (r.motion > 0.02 ? 0.4 : 1) : 0 },
    { label: 'Angle', ok: ok(shot.title) && ok('Head level'), fill: ok(shot.title) ? 1 : 0.35 },
  ]
}

/* ── The guided scan: one recording, every photo picked from it ─────────────────────────────── */
/*
  One continuous session. The coach shows (and can say) one pose at a time. While that pose's checks
  are all green, every measured frame is compared and the sharpest is kept; after a short hold it is
  saved as that photo and the next pose begins. Nothing is generated or changed: the photos are frames
  of the person's own camera, picked by measurements (angle, expression, light, sharpness).
  The whole session is recorded and saved as the video, so one scan gives the photos and the video.
*/
type Pose = { kind: 'shot'; shot: Shot } | { kind: 'speak'; say: string; seconds: number }
const SPEAK_LINE = 'Today we will learn binary search, one step at a time.'
const ORDER: ShotId[] = ['front', 'smile', 'open', 'brows', 'left', 'far-left', 'right', 'far-right', 'up', 'down', 'waist']
const OPTIONAL_WAIT_MS = 12000
const HOLD_MS = 700

function sequence(only: ShotId | null, done: Set<ShotId>): Pose[] {
  if (only) return [{ kind: 'shot', shot: SHOTS.find((s) => s.id === only)! }]
  const shots = ORDER.map((id) => SHOTS.find((s) => s.id === id)!).filter((s) => !done.has(s.id))
  const before = shots.filter((s) => s.id !== 'waist')
  const waist = shots.filter((s) => s.id === 'waist')
  return [...before.map((shot) => ({ kind: 'shot' as const, shot })), { kind: 'speak', say: SPEAK_LINE, seconds: 6 }, ...waist.map((shot) => ({ kind: 'shot' as const, shot }))]
}

async function bitmapBlob(b: ImageBitmap): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = b.width
  c.height = b.height
  c.getContext('2d')!.drawImage(b, 0, 0)
  return new Promise((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('capture failed'))), 'image/jpeg', 0.93))
}

function say(text: string, on: boolean) {
  if (!on || typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-IN'
  u.rate = 1.02
  speechSynthesis.speak(u)
}

const LIT_KEY = 'pratibimb.lit'

interface ScanProps {
  done: Set<ShotId>
  only: ShotId | null
  base: Baseline
  onBase: (b: Baseline) => void
  onPhoto: (s: Shot, b: Blob) => Promise<void>
  onVideo: (b: Blob) => Promise<void>
  onClose: () => void
}

function ScanSession({ done, only, base, onBase, onPhoto, onVideo, onClose }: ScanProps) {
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const { video, error, stream } = useCamera(facing, !only)
  const canvas = useRef<HTMLCanvasElement>(null)
  const poses = useMemo(() => sequence(only, done), [only]) // eslint-disable-line react-hooks/exhaustive-deps
  const [running, setRunning] = useState(false)
  const [at, setAt] = useState(0)
  const [checks, setChecks] = useState<CheckT[]>([])
  const [reading, setReading] = useState<Reading | null>(null)
  const [ready, setReady] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [picked, setPicked] = useState<{ shot: Shot; url: string }[]>([])
  const [skipped, setSkipped] = useState<Shot[]>([])
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(0)
  const [err, setErr] = useState('')
  const [speakLeft, setSpeakLeft] = useState(0)
  const [recording, setRecording] = useState(false)
  const last = useRef<Reading | null>(null)
  const sweepAt = useRef(-1)
  const lit = useRef<Set<number>>(new Set())
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const s = useRef({ at: 0, greenSince: 0, best: null as ImageBitmap | null, bestSharp: -1, poseStart: 0, base, running: false, grabbing: false })

  useEffect(() => {
    try {
      lit.current = new Set(JSON.parse(sessionStorage.getItem(LIT_KEY) || '[]') as number[])
    } catch {
      /* fresh ring */
    }
  }, [])

  const pose = poses[at] ?? null
  const shot = pose?.kind === 'shot' ? pose.shot : null

  const finish = useCallback(async () => {
    s.current.running = false
    setRunning(false)
    setRecording(false)
    setFinished(true)
    say('All done. Thank you.', voiceOn)
    const r = rec.current
    if (r && r.state !== 'inactive') {
      const stopped = new Promise<void>((res) => (r.onstop = () => res()))
      r.stop()
      await stopped
      const blob = new Blob(chunks.current, { type: (r.mimeType || 'video/webm').split(';')[0] })
      if (blob.size > 200_000) {
        setSaving((n) => n + 1)
        await onVideo(blob)
          .catch((e) => setErr(e instanceof Error ? e.message : 'The video could not be saved'))
          .finally(() => setSaving((n) => n - 1))
      }
    }
  }, [onVideo, voiceOn])

  const advance = useCallback(() => {
    const next = s.current.at + 1
    s.current.at = next
    s.current.greenSince = 0
    s.current.bestSharp = -1
    s.current.best?.close()
    s.current.best = null
    s.current.poseStart = performance.now()
    setAt(next)
    if (next >= poses.length) void finish()
    else {
      const p = poses[next]
      say(p.kind === 'shot' ? p.shot.say : `Now read aloud: ${p.say}`, voiceOn)
    }
  }, [poses, finish, voiceOn])

  function start() {
    if (!stream) return
    setErr('')
    setPicked([])
    setSkipped([])
    setFinished(false)
    if (!only) {
      const types = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
      const mimeType = types.find((x) => MediaRecorder.isTypeSupported(x))
      try {
        const r = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined)
        chunks.current = []
        r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
        r.start(1000)
        rec.current = r
        setRecording(true)
      } catch {
        rec.current = null // photos still work without the recording
      }
    }
    s.current = { ...s.current, at: 0, greenSince: 0, best: null, bestSharp: -1, poseStart: performance.now(), running: true }
    setAt(0)
    setRunning(true)
    const p = poses[0]
    say(p.kind === 'shot' ? p.shot.say : `Read aloud: ${p.say}`, voiceOn)
  }

  // Keep the latest values for the frame loop.
  const live = useRef({ advance, poses, onPhoto, onBase })
  useEffect(() => {
    live.current = { advance, poses, onPhoto, onBase }
    s.current.base = base
  })

  useEffect(() => {
    let raf = 0
    let alive = true
    let lastT = 0
    const colors = cssColors()
    const reduced = reducedMotion()
    const mirror = facing === 'user'
    loadCoach()
      .then(({ video: lm }) => {
        if (!alive) return
        setReady(true)
        const loop = (t: number) => {
          raf = requestAnimationFrame(loop)
          const v = video.current
          const c = canvas.current
          if (!v || !c || v.readyState < 2) return
          const st = s.current
          const p = live.current.poses[st.at]
          const sh = p?.kind === 'shot' ? p.shot : null
          if (t - lastT >= 90) {
            lastT = t
            const r = read(lm.detectForVideo(v, t), v, v.videoWidth, v.videoHeight)
            last.current = r
            const cs = judge(sh ?? SHOTS[0], r, st.base)
            setChecks(sh ? cs : cs.filter((x) => ['Only you', 'Distance', 'Light'].includes(x.label)))
            setReading(r)
            if (r && r.faces === 1) {
              const k = tickFor(r, st.base.tilt, mirror)
              if (k !== null) {
                for (let d = -1; d <= 1; d++) lit.current.add((k + d + 48) % 48)
                try {
                  sessionStorage.setItem(LIT_KEY, JSON.stringify([...lit.current]))
                } catch {
                  /* not kept */
                }
              }
            }
            if (st.running && p && !st.grabbing) {
              if (p.kind === 'speak') {
                const left = p.seconds - (t - st.poseStart) / 1000
                setSpeakLeft(Math.max(0, Math.ceil(left)))
                if (left <= 0) live.current.advance()
              } else if (sh) {
                const green = cs.every((x) => x.ok)
                if (green && r) {
                  st.greenSince ||= t
                  // Keep the sharpest frame seen while the pose is held.
                  if (r.sharp > st.bestSharp) {
                    st.bestSharp = r.sharp
                    st.grabbing = true
                    const tilt = r.tilt
                    createImageBitmap(v)
                      .then((bmp) => {
                        st.best?.close()
                        st.best = bmp
                        if (sh.id === 'front') live.current.onBase({ tilt })
                      })
                      .catch(() => {})
                      .finally(() => (st.grabbing = false))
                  }
                  if (t - st.greenSince >= HOLD_MS && st.best) {
                    const bmp = st.best
                    st.best = null
                    sweepAt.current = t
                    setSaving((n) => n + 1)
                    void bitmapBlob(bmp)
                      .then(async (blob) => {
                        bmp.close()
                        setPicked((xs) => [...xs, { shot: sh, url: URL.createObjectURL(blob) }])
                        await live.current.onPhoto(sh, blob)
                      })
                      .catch((e) => setErr(e instanceof Error ? e.message : 'A photo could not be saved'))
                      .finally(() => setSaving((n) => n - 1))
                    live.current.advance()
                  }
                } else {
                  st.greenSince = 0
                  if (!sh.need && t - st.poseStart > OPTIONAL_WAIT_MS) {
                    setSkipped((xs) => [...xs, sh])
                    live.current.advance()
                  }
                }
              }
            }
          }
          const rect = c.getBoundingClientRect()
          const dpr = Math.min(2, window.devicePixelRatio || 1)
          if (c.width !== Math.round(rect.width * dpr)) {
            c.width = Math.round(rect.width * dpr)
            c.height = Math.round(rect.height * dpr)
          }
          const g = c.getContext('2d')!
          g.setTransform(dpr, 0, 0, dpr, 0, 0)
          const sweep = sweepAt.current < 0 ? -1 : Math.min(1, (t - sweepAt.current) / 420)
          if (sweep >= 1) sweepAt.current = -1
          const hold = st.running && st.greenSince ? Math.min(1, (t - st.greenSince) / HOLD_MS) : 0
          drawHud(
            g,
            rect.width,
            rect.height,
            v.videoWidth,
            v.videoHeight,
            { reading: last.current, mirror, green: hold > 0, hold, lit: lit.current, target: targetTick(sh?.arrow, mirror), sweep: reduced ? -1 : sweep, colors, reduced },
            t,
          )
        }
        raf = requestAnimationFrame(loop)
      })
      .catch(() => alive && setErr('The face reader could not start on this browser. Use Upload or your phone instead.'))
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [video, facing])

  useEffect(
    () => () => {
      s.current.running = false
      if (rec.current && rec.current.state !== 'inactive') rec.current.stop()
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    },
    [],
  )

  const first = checks.find((c) => !c.ok)
  const shotsTotal = poses.filter((p) => p.kind === 'shot').length
  const shotIndex = poses.slice(0, at + 1).filter((p) => p.kind === 'shot').length
  const meters = shot ? readouts(reading, checks, shot) : []

  if (finished)
    return (
      <section className="pbx-summary" aria-labelledby="pbx-sum">
        <div className="pbx-sumhead">
          <h3 id="pbx-sum" className="pbx-h">
            {picked.length} photo{picked.length === 1 ? '' : 's'} picked from your scan
          </h3>
          <span className="pbx-note">{saving > 0 ? 'Saving…' : only ? 'Saved.' : 'Saved, with the recording as your video.'}</span>
        </div>
        <ul className="pbx-picked">
          {picked.map((p) => (
            <li key={p.shot.id}>
              <img src={p.url} alt="" />
              <span>
                <Check className="inline size-3.5" aria-hidden="true" /> {p.shot.title}
              </span>
            </li>
          ))}
          {skipped.map((sh) => (
            <li key={sh.id} data-skipped>
              <span className="pbx-thumb">
                <Pictogram shot={sh} />
              </span>
              <span>{sh.title}: skipped</span>
            </li>
          ))}
        </ul>
        {err && (
          <p className="pbs-error" role="alert">
            {err}
          </p>
        )}
        <div className="pbs-row">
          <Button onClick={onClose}>Done</Button>
        </div>
      </section>
    )

  return (
    <section className="pbx-view" data-green={(running && !first && !!reading) || undefined} aria-label="Guided scan">
      <video ref={video} className="pbx-video" data-mirror={facing === 'user' || undefined} playsInline muted aria-label="Camera" />
      <canvas ref={canvas} className="pbx-hud" aria-hidden="true" />
      <span className="pbx-corner" data-c="tl" aria-hidden="true" />
      <span className="pbx-corner" data-c="tr" aria-hidden="true" />
      <span className="pbx-corner" data-c="bl" aria-hidden="true" />
      <span className="pbx-corner" data-c="br" aria-hidden="true" />
      {running && recording && (
        <span className="pbx-rec" aria-label="Recording">
          <i aria-hidden="true" /> REC
        </span>
      )}

      <div className="pbx-cue">
        <span className="pbx-step">
          {!running
            ? only
              ? `Retake · ${shot?.title}`
              : `Guided scan · ${shotsTotal} poses · about a minute`
            : pose?.kind === 'speak'
              ? `Speak · ${speakLeft} s`
              : `${String(shotIndex).padStart(2, '0')} / ${String(shotsTotal).padStart(2, '0')} · ${shot?.title}${shot && !shot.need ? ' · optional' : ''}`}
        </span>
        <p className="pbx-say" aria-live="polite">
          {!ready
            ? 'Starting the face reader…'
            : !running
              ? only
                ? shot?.say
                : 'Press Start. Then follow each step; the photos are taken for you.'
              : pose?.kind === 'speak'
                ? `Read aloud: “${pose.say}”`
                : !reading
                  ? 'Look at the camera'
                  : first
                    ? first.fix
                    : 'Perfect. Hold still…'}
        </p>
        {running && pose?.kind === 'shot' && reading && first && <p className="pbx-hint">{shot?.say}</p>}
      </div>

      <div className="pbx-tools">
        <button type="button" className="pbx-tool" aria-pressed={voiceOn} onClick={() => setVoiceOn((x) => !x)} title="Read the steps aloud">
          {voiceOn ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          <span>Voice</span>
        </button>
        {!running && (
          <button type="button" className="pbx-tool" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Switch camera">
            <SwitchCamera className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {running && (
        <ol className="pbx-progress-steps" aria-hidden="true">
          {poses.map((_, i) => (
            <li key={i} data-state={i < at ? 'done' : i === at ? 'now' : 'next'} />
          ))}
        </ol>
      )}

      <div className="pbx-bottom">
        {shot ? (
          <ul className="pbx-readouts" aria-label="Live checks">
            {meters.map((m) => (
              <li key={m.label} data-ok={m.ok || undefined}>
                <span>{m.label}</span>
                <i>
                  <b style={{ width: `${Math.round(m.fill * 100)}%` }} />
                </i>
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        {!running ? (
          <Button onClick={start} disabled={!ready || !stream || !!error}>
            {only ? 'Start retake' : 'Start the scan'}
          </Button>
        ) : (
          <div className="pbs-row">
            {shot && !shot.need && (
              <Button variant="secondary" size="sm" onClick={() => { setSkipped((xs) => [...xs, shot]); advance() }}>
                Skip
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => void finish()}>
              Stop
            </Button>
          </div>
        )}
      </div>
      {(error || err) && (
        <div className="pbx-error" role="alert">
          {error || err}
        </div>
      )}
    </section>
  )
}

/* ── A phone by QR ─────────────────────────────────────────────────────────────────────────── */
function PhoneLink({ makeLink, refresh }: { makeLink: () => Promise<{ path: string; expiresAt: number }>; refresh: () => Promise<void> }) {
  const [link, setLink] = useState<{ url: string; until: string } | null>(null)
  const [err, setErr] = useState('')
  const colors = useMemo(() => themeQrColors(), [])
  useEffect(() => {
    makeLink()
      .then((l) => setLink({ url: new URL(l.path, window.location.origin).toString(), until: new Date(l.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Could not make a link'))
  }, [makeLink])
  // Photos taken on the phone appear here as they arrive.
  useEffect(() => {
    const id = window.setInterval(() => void refresh().catch(() => {}), 3000)
    return () => window.clearInterval(id)
  }, [refresh])
  return (
    <section className="pbx-phone">
      <div className="pbx-qr" dangerouslySetInnerHTML={{ __html: link ? handQrCard(link.url, { title: 'Scan with your phone', sub: `Works until ${link.until}`, colors }) : handQrPlaceholder(colors) }} />
      <div className="pbx-phonetext">
        <h3 className="pbx-h">Use your phone's camera</h3>
        <ol className="pbx-steps">
          <li>
            <b>Scan the code</b> with the phone's camera.
          </li>
          <li>
            <b>Tap the link.</b> No sign-in; it only adds photos to this model, for 2 hours.
          </li>
          <li>
            <b>Follow the coach.</b> Each photo appears here the moment it is taken.
          </li>
        </ol>
        <p className="pbx-note">Best of all: ask someone to hold the phone and use the back camera. It is sharper than the selfie camera.</p>
        {link && <p className="pbx-url">{link.url}</p>}
        {err && (
          <p className="pbs-error" role="alert">
            {err}
          </p>
        )}
      </div>
    </section>
  )
}

/* ── Uploads, checked and sorted ───────────────────────────────────────────────────────────── */
interface Checked {
  key: string
  url: string
  shot: Shot | null
  fixes: string[]
  state: 'checking' | 'saved' | 'rejected'
  video?: boolean
  progress?: number
  /** for a video: the photos picked from it */
  found?: { shot: Shot; url: string }[]
}

function Uploads({ done, base, upload, refresh, onThumb }: { done: Set<ShotId>; base: Baseline; upload: CaptureProps['upload']; refresh: () => Promise<void>; onThumb: (id: ShotId, url: string) => void }) {
  const [items, setItems] = useState<Checked[]>([])
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const taken = useRef(new Set(done))
  useEffect(() => {
    taken.current = new Set(done)
  }, [done])

  /** A video: saved as the video, and its best frame for each pose saved as that photo. */
  async function addVideo(f: File, patch: (p: Partial<Checked>) => void) {
    try {
      const uploading = upload('video', f).catch((e) => {
        throw e instanceof Error ? e : new Error('The video could not be saved')
      })
      let found: Awaited<ReturnType<typeof photosFromVideo>> = []
      let readErr = ''
      try {
        found = await photosFromVideo(f, base, (p) => patch({ progress: p }))
      } catch (e) {
        readErr = e instanceof Error ? e.message : 'This video cannot be read here'
      }
      const pics: { shot: Shot; url: string }[] = []
      for (const x of found) {
        if (taken.current.has(x.shot.id)) continue // already have this pose
        await upload('photo', x.blob, x.shot.id)
        taken.current.add(x.shot.id)
        const u = URL.createObjectURL(x.blob)
        onThumb(x.shot.id, u)
        pics.push({ shot: x.shot, url: u })
      }
      await uploading
      patch({ state: 'saved', found: pics, fixes: readErr ? [readErr] : pics.length ? [] : ['No pose could be picked from this video (face too small, dark or turned away). It is still saved as the video.'] })
      await refresh()
    } catch (e) {
      patch({ state: 'rejected', fixes: [e instanceof Error ? e.message : 'Could not use this video'] })
    }
  }

  async function add(files: FileList | File[] | null) {
    if (!files) return
    for (const f of Array.from(files)) {
      const isVideo = f.type.startsWith('video/')
      const url = isVideo ? '' : URL.createObjectURL(f)
      const key = `${f.name}-${f.size}-${Math.random()}`
      setItems((xs) => [{ key, url, shot: null, fixes: [], state: 'checking', video: isVideo, progress: 0 }, ...xs])
      const patch = (p: Partial<Checked>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)))
      if (f.type.startsWith('video/')) {
        await addVideo(f, patch)
        continue
      }
      try {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error('Use JPG, PNG or WebP photos, or a video.')
        const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' })
        const r = await readImage(bmp)
        bmp.close()
        // The first wanted shot this photo passes; if none, the nearest one's fixes.
        const order = [...SHOTS.filter((s) => !taken.current.has(s.id)), ...SHOTS.filter((s) => taken.current.has(s.id))]
        let pick: Shot | null = null
        let nearest: { fixes: string[] } | null = null
        for (const s of order) {
          const c = judge(s, r ? { ...r, motion: 0 } : null, base).filter((x) => x.label !== 'Centred')
          const bad = c.filter((x) => !x.ok).map((x) => x.fix ?? x.label)
          if (!bad.length) {
            pick = s
            break
          }
          if (!nearest || bad.length < nearest.fixes.length) nearest = { fixes: bad }
        }
        if (!pick) {
          patch({ state: 'rejected', fixes: nearest ? nearest.fixes.slice(0, 2) : ['No face found'] })
          continue
        }
        await upload('photo', f, pick.id)
        taken.current.add(pick.id)
        onThumb(pick.id, url)
        patch({ state: 'saved', shot: pick })
        await refresh()
      } catch (e) {
        patch({ state: 'rejected', fixes: [e instanceof Error ? e.message : 'Could not use this photo'] })
      }
    }
  }

  return (
    <section className="pbx-upload">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => void add(e.target.files).then(() => (e.target.value = ''))} />
      <button
        type="button"
        className="pbx-drop"
        data-over={over || undefined}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void add(e.dataTransfer.files)
        }}
      >
        <Upload className="size-6" aria-hidden="true" />
        <span className="pbx-h">Drop photos or videos here, or choose them</span>
        <span className="pbx-note">Read on this device. Each photo is filed under the pose it shows; from a video, the sharpest frame for every pose is picked, and the video is kept too. If something can't be used, you'll see why.</span>
      </button>
      {items.length > 0 && (
        <ul className="pbx-results">
          {items.map((it) =>
            it.video ? (
              <li key={it.key} data-state={it.state} className="pbx-vidres">
                <span className="pbx-vidhead">
                  <span className="pbx-h">Video</span>
                  <span className="pbx-note">
                    {it.state === 'checking' ? `Reading every frame… ${Math.round((it.progress ?? 0) * 100)}%` : it.state === 'saved' ? `Saved · ${it.found?.length ?? 0} pose${it.found?.length === 1 ? '' : 's'} picked` : it.fixes.join(' · ')}
                  </span>
                </span>
                {it.state === 'checking' && (
                  <span className="pbx-vidbar">
                    <b style={{ width: `${Math.round((it.progress ?? 0) * 100)}%` }} />
                  </span>
                )}
                {it.state === 'saved' && it.fixes.length > 0 && <span className="pbx-note">{it.fixes.join(' · ')}</span>}
                {it.found && it.found.length > 0 && (
                  <span className="pbx-vidpics">
                    {it.found.map((x) => (
                      <span key={x.shot.id}>
                        <img src={x.url} alt="" />
                        {x.shot.title}
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ) : (
            <li key={it.key} data-state={it.state}>
              <span className="pbx-resimg">
                <img src={it.url} alt="" />
                {it.state === 'checking' && <span className="pbx-scan" aria-hidden="true" />}
              </span>
              <span className="pbx-restext">
                {it.state === 'checking' && 'Reading…'}
                {it.state === 'saved' && (
                  <>
                    <Check className="inline size-3.5" aria-hidden="true" /> {it.shot?.title}
                  </>
                )}
                {it.state === 'rejected' && it.fixes.join(' · ')}
              </span>
            </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}

