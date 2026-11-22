/*
  The server ears' half in the browser (docs/voice/STEP1_EARS_DESIGN.md S1–S3):
  while the browser's own recognition shows words as you speak, this records
  the same speech cleanly and sends one clip to /api/voice/stt, which walks the
  chain of services in Admin → Voice recognition. Its text replaces the
  browser's when it comes back; if no service answers, the browser's stays.

  - Capture: one channel with the browser's echo, noise and gain control on.
  - Only speech is sent: silence at the start and end is cut, and a clip with
    no speech in it is never sent (Whisper invents words from silence).
  - 16 kHz mono 16-bit WAV: what the services expect, lossless.
  - Nothing is kept: the clip lives in memory until it is sent.
*/
import { API_BASE } from '@/lib/api'

let available: Promise<boolean> | null = null
/**
 * Is any server ear set up, and can this browser record for it? Asked once per
 * page load; a "no" (for example before signing in) is asked again after a
 * minute, so the mic appears without a reload once ears are set up.
 */
export function serverEars(): Promise<boolean> {
  if (!canRecord()) return Promise.resolve(false)
  if (!available) {
    const p = fetch(`${API_BASE}/api/voice/stt/status`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !!j?.available)
      .catch(() => false)
    available = p
    void p.then((yes) => {
      if (!yes) window.setTimeout(() => (available === p ? (available = null) : undefined), 60_000)
    })
  }
  return available
}

/** The browser can record the mic and process audio (every current browser on https). */
export function canRecord(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return !!navigator.mediaDevices?.getUserMedia && !!Ctx
}

export interface Capture {
  /** Stop and get the clip (null when there was no speech in it). */
  stop(): Promise<Blob | null>
  cancel(): void
  /** Called (once) after speech followed by a pause, for push-to-talk without a browser recogniser. */
  onPause?: () => void
}

const RATE = 16000

/** Downsample by averaging (a simple low-pass), mono Float32 → 16 kHz. */
export function downsample(input: Float32Array, from: number, to = RATE): Float32Array {
  if (from === to) return input
  const ratio = from / to
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio)
    const b = Math.min(input.length, Math.floor((i + 1) * ratio))
    let s = 0
    for (let j = a; j < b; j++) s += input[j]
    out[i] = s / Math.max(1, b - a)
  }
  return out
}

/** Loudness of each 20 ms frame. */
function frames(x: Float32Array, size = RATE / 50): number[] {
  const out: number[] = []
  for (let i = 0; i < x.length; i += size) {
    let s = 0
    const end = Math.min(x.length, i + size)
    for (let j = i; j < end; j++) s += x[j] * x[j]
    out.push(Math.sqrt(s / Math.max(1, end - i)))
  }
  return out
}

/**
 * Cut silence at both ends (keeping 300 ms around the speech) and say whether
 * there is speech at all: some frames clearly above the room's own noise.
 */
export function trimSpeech(x: Float32Array): Float32Array | null {
  const f = frames(x)
  if (!f.length) return null
  const sorted = [...f].sort((a, b) => a - b)
  const noise = sorted[Math.floor(sorted.length * 0.2)] || 0
  const threshold = Math.max(0.012, noise * 3)
  const loud = f.map((v) => v > threshold)
  const speechFrames = loud.filter(Boolean).length
  if (speechFrames < 8) return null // under ~160 ms of speech: nothing said
  const first = loud.indexOf(true)
  const last = loud.lastIndexOf(true)
  const size = RATE / 50
  const a = Math.max(0, (first - 15) * size)
  const b = Math.min(x.length, (last + 16) * size)
  return x.subarray(a, b)
}

/** 16-bit PCM WAV. */
export function wav(x: Float32Array, rate = RATE): Blob {
  const buf = new ArrayBuffer(44 + x.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + x.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, x.length * 2, true)
  for (let i = 0; i < x.length; i++) {
    const s = Math.max(-1, Math.min(1, x[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

/** Start recording the mic for the server ears. */
export async function startCapture(opts: { onPause?: () => void } = {}): Promise<Capture | null> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch {
    return null
  }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) {
    stream.getTracks().forEach((t) => t.stop())
    return null
  }
  const ctx = new Ctx()
  const src = ctx.createMediaStreamSource(stream)
  // ScriptProcessor works everywhere without loading a worklet file.
  const proc = ctx.createScriptProcessor(4096, 1, 1)
  const chunks: Float32Array[] = []
  let total = 0
  let spoke = false
  let quiet = 0
  let paused = false
  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0)
    // At most 58 s (the server takes 60).
    if (total / ctx.sampleRate < 58) {
      chunks.push(new Float32Array(d))
      total += d.length
    }
    let s = 0
    for (let i = 0; i < d.length; i++) s += d[i] * d[i]
    const rms = Math.sqrt(s / d.length)
    if (rms > 0.02) {
      spoke = true
      quiet = 0
    } else if (spoke) {
      quiet += d.length / ctx.sampleRate
      if (quiet > 1.2 && !paused) {
        paused = true
        opts.onPause?.()
      }
    }
  }
  src.connect(proc)
  proc.connect(ctx.destination)

  const close = () => {
    proc.disconnect()
    src.disconnect()
    stream.getTracks().forEach((t) => t.stop())
    void ctx.close().catch(() => {})
  }
  return {
    async stop() {
      close()
      const all = new Float32Array(total)
      let o = 0
      for (const c of chunks) {
        all.set(c, o)
        o += c.length
      }
      const speech = trimSpeech(downsample(all, ctx.sampleRate))
      return speech ? wav(speech) : null
    },
    cancel: close,
  }
}

/** What the site is listening for: plain words, a command, or code (src/voice/normalise.js). */
export type EarsMode = 'text' | 'command' | 'code'

export type ServerText =
  | {
      ok: true
      /** Cleaned, with names fixed (what to act on). */
      text: string
      /** What the service heard, before the normaliser. */
      raw: string
      /** Code pages: the speech written as code ("i++"). */
      code?: string
      /** Code pages: words that could not be placed. */
      unplaced?: string[]
      confidence: number | null
      provider: string | null
    }
  | { ok: false }

/** Send a clip to the chain. */
export async function transcribe(clip: Blob, lang: string, hints: string[] = [], mode: EarsMode = 'text'): Promise<ServerText> {
  try {
    const q = new URLSearchParams({ lang, mode })
    if (hints.length) q.set('hints', hints.slice(0, 60).join(','))
    const r = await fetch(`${API_BASE}/api/voice/stt?${q}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'audio/wav' }, body: clip })
    if (!r.ok) return { ok: false }
    const j = await r.json()
    if (!j?.ok) return { ok: false }
    return {
      ok: true,
      text: String(j.text || ''),
      raw: String(j.raw ?? j.text ?? ''),
      ...(typeof j.code === 'string' ? { code: j.code, unplaced: Array.isArray(j.unplaced) ? j.unplaced.map(String) : [] } : {}),
      confidence: typeof j.confidence === 'number' ? j.confidence : null,
      provider: j.provider ?? null,
    }
  } catch {
    return { ok: false }
  }
}
