/*
  Recording in the browser. Four sources:
    camera         the camera and mic, recorded as they are;
    screen         a screen, window or tab, with the mic (and tab sound);
    screen+camera  the screen with your face in a round bubble, drawn on a
                   canvas (a worker keeps the frames coming when you switch
                   to another app, where page timers would slow down);
    board          the whiteboard canvas, with the mic.
  MediaRecorder writes WebM (Chrome, Edge, Firefox) or MP4 (Safari). WebM
  from MediaRecorder has no length in its header, so it is added at the end
  (fix-webm-duration), or seeking would not work.
*/
import fixWebmDuration from 'fix-webm-duration'
import type { Source } from './api'

export const MAX_MS = 20 * 60 * 1000

export function pickMime(): string {
  const list = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a', 'video/mp4']
  return list.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? ''
}

export const canRecordScreen = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices

/** A timer that keeps ticking in a background tab (workers are not slowed like page timers). */
function workerTicker(ms: number, fn: () => void): () => void {
  try {
    const src = `let id=null;onmessage=(e)=>{if(e.data==='stop'){clearInterval(id);close();}else{id=setInterval(()=>postMessage(0),${ms})}}`
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
    const w = new Worker(url)
    w.onmessage = fn
    w.postMessage('go')
    return () => {
      w.postMessage('stop')
      URL.revokeObjectURL(url)
    }
  } catch {
    const id = window.setInterval(fn, ms)
    return () => window.clearInterval(id)
  }
}

export interface Capture {
  /** What to show while recording (may be the composed canvas). */
  preview: MediaStream
  /** What is recorded. */
  stream: MediaStream
  stop: () => void
}

const video = (s: MediaStream) => {
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.srcObject = s
  void v.play().catch(() => {})
  return v
}

/** Mix several sound tracks into one (mic + the shared tab's sound). */
function mix(tracks: MediaStreamTrack[]): { track: MediaStreamTrack | null; close: () => void } {
  const live = tracks.filter((t) => t.readyState === 'live')
  if (live.length <= 1) return { track: live[0] ?? null, close: () => {} }
  const ac = new AudioContext()
  const dest = ac.createMediaStreamDestination()
  for (const t of live) ac.createMediaStreamSource(new MediaStream([t])).connect(dest)
  return { track: dest.stream.getAudioTracks()[0], close: () => void ac.close() }
}

export async function startCapture(source: Source, { mic, board }: { mic: boolean; board?: MediaStreamTrack | null }): Promise<Capture> {
  const stops: (() => void)[] = []
  const micStream = mic
    ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).catch(() => {
        throw new Error('The microphone is blocked. Allow it from the icon in the address bar, or record without it.')
      })
    : null
  if (micStream) stops.push(() => micStream.getTracks().forEach((t) => t.stop()))
  const micTracks = micStream?.getAudioTracks() ?? []

  const fail = (e: unknown, what: string): never => {
    stops.forEach((f) => f())
    const name = (e as DOMException)?.name
    if (name === 'NotAllowedError') throw new Error(what === 'screen' ? '' : `The ${what} is blocked. Allow it from the icon in the address bar.`)
    throw new Error(`Could not start the ${what}.`)
  }

  if (source === 'camera') {
    const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } }).catch((e) => fail(e, 'camera'))
    stops.push(() => cam.getTracks().forEach((t) => t.stop()))
    const stream = new MediaStream([...cam.getVideoTracks(), ...micTracks])
    return { preview: cam, stream, stop: () => stops.forEach((f) => f()) }
  }

  if (source === 'board') {
    if (!board) throw new Error('The whiteboard is not ready.')
    const stream = new MediaStream([board, ...micTracks])
    return { preview: new MediaStream([board]), stream, stop: () => stops.forEach((f) => f()) }
  }

  const screen = await navigator.mediaDevices
    .getDisplayMedia({ video: { frameRate: { ideal: 30 }, width: { max: 1920 }, height: { max: 1080 } }, audio: true, ...({ selfBrowserSurface: 'exclude', systemAudio: 'include' } as object) } as DisplayMediaStreamOptions)
    .catch((e) => fail(e, 'screen'))
  stops.push(() => screen.getTracks().forEach((t) => t.stop()))
  const sound = mix([...micTracks, ...screen.getAudioTracks()])
  stops.push(sound.close)
  const audio = sound.track ? [sound.track] : []

  if (source === 'screen') {
    const stream = new MediaStream([...screen.getVideoTracks(), ...audio])
    return { preview: new MediaStream(screen.getVideoTracks()), stream, stop: () => stops.forEach((f) => f()) }
  }

  // Screen with a camera bubble, drawn together.
  const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 640 }, frameRate: { ideal: 30 } } }).catch((e) => fail(e, 'camera'))
  stops.push(() => cam.getTracks().forEach((t) => t.stop()))
  const sv = video(screen)
  const cv = video(cam)
  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080
  const ctx = canvas.getContext('2d')!
  const draw = () => {
    ctx.fillStyle = '#151513'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (sv.videoWidth) {
      const k = Math.min(canvas.width / sv.videoWidth, canvas.height / sv.videoHeight)
      const w = sv.videoWidth * k
      const h = sv.videoHeight * k
      ctx.drawImage(sv, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
    }
    if (cv.videoWidth) {
      const d = 300
      const x = canvas.width - d - 48
      const y = canvas.height - d - 48
      const s = Math.min(cv.videoWidth, cv.videoHeight)
      ctx.save()
      ctx.beginPath()
      ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      // Mirrored, as people expect to see themselves.
      ctx.translate(x + d, y)
      ctx.scale(-1, 1)
      ctx.drawImage(cv, (cv.videoWidth - s) / 2, (cv.videoHeight - s) / 2, s, s, 0, 0, d, d)
      ctx.restore()
      ctx.lineWidth = 6
      ctx.strokeStyle = '#faf9f5'
      ctx.beginPath()
      ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  stops.push(workerTicker(33, draw))
  const out = canvas.captureStream(30)
  const stream = new MediaStream([...out.getVideoTracks(), ...audio])
  screen.getVideoTracks()[0]?.addEventListener('ended', () => out.getVideoTracks()[0]?.stop())
  return { preview: out, stream, stop: () => (stops.forEach((f) => f()), out.getTracks().forEach((t) => t.stop())) }
}

export class Recording {
  private mr: MediaRecorder
  private parts: Blob[] = []
  private startedAt = 0
  private pausedAt = 0
  private pausedMs = 0
  readonly mime: string

  constructor(stream: MediaStream, source: Source) {
    this.mime = pickMime()
    const bits = source === 'camera' ? 1_200_000 : source === 'board' ? 900_000 : 1_800_000
    this.mr = new MediaRecorder(stream, this.mime ? { mimeType: this.mime, videoBitsPerSecond: bits, audioBitsPerSecond: 64_000 } : undefined)
    this.mr.ondataavailable = (e) => e.data.size && this.parts.push(e.data)
  }

  start() {
    this.startedAt = performance.now()
    this.mr.start(1000)
  }
  pause() {
    if (this.mr.state !== 'recording') return
    this.mr.pause()
    this.pausedAt = performance.now()
  }
  resume() {
    if (this.mr.state !== 'paused') return
    this.pausedMs += performance.now() - this.pausedAt
    this.mr.resume()
  }
  get state() {
    return this.mr.state
  }
  /** Time recorded so far (pauses left out). */
  elapsed() {
    if (!this.startedAt) return 0
    const now = this.mr.state === 'paused' ? this.pausedAt : performance.now()
    return now - this.startedAt - this.pausedMs
  }

  stop(): Promise<{ blob: Blob; durationMs: number }> {
    const durationMs = Math.round(this.elapsed())
    return new Promise((resolve) => {
      this.mr.onstop = async () => {
        const type = (this.mr.mimeType || this.mime || 'video/webm').split(';')[0]
        let blob = new Blob(this.parts, { type })
        if (type === 'video/webm') blob = await fixWebmDuration(blob, durationMs, { logger: false })
        resolve({ blob: new Blob([blob], { type }), durationMs })
      }
      if (this.mr.state !== 'inactive') this.mr.stop()
    })
  }
}

/** A still from the video for its poster (JPEG data URL, at most 960 wide). */
export function grabPoster(v: HTMLVideoElement): string | null {
  if (!v.videoWidth) return null
  const k = Math.min(1, 960 / v.videoWidth)
  const c = document.createElement('canvas')
  c.width = Math.round(v.videoWidth * k)
  c.height = Math.round(v.videoHeight * k)
  c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
  try {
    return c.toDataURL('image/jpeg', 0.8)
  } catch {
    return null
  }
}
