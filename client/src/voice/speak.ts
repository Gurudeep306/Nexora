/*
  Saying answers aloud (docs/voice/STEP1_EARS_DESIGN.md §S8), best voice first:

  1. Natural Indian voice from the server (Azure Speech free tier, capped;
     src/voice/tts.js) when the school has set it up.
  2. Kokoro on this device, only if the student agreed to its one-time
     download (Settings → Voice). English only. It is loaded from its public
     npm copy on jsDelivr, never bundled into the site.
  3. The device's own voice (always there).

  Sentence by sentence: the first sentence starts as soon as it's ready and
  the next is made while it plays, so a reply starts in about a second. If a
  voice fails mid-way, the device voice says the rest. Every AI voice is
  labelled while it speaks (see SpeakingChip), and the text is always on screen.
*/
import { useSyncExternalStore } from 'react'
import { API_BASE } from '@/lib/api'
import { getVoicePrefs } from './prefs'
import { splitSentences } from './sentences'

export { splitSentences }

export type Engine = 'natural' | 'kokoro' | 'device'

export interface Speaking {
  on: boolean
  engine: Engine | null
  /** What the voice is called, for the label ("Neerja", "Kokoro", "Device voice"). */
  name: string
}

/**
 * One sentence as it starts to sound: what is said and for how long (ms), so
 * the virtual teacher can move its lips with it. `null` = speaking stopped.
 */
export interface SpokenSentence {
  text: string
  lang: string
  ms: number
}
const sentenceListeners = new Set<(s: SpokenSentence | null) => void>()
/** Hear each sentence as it starts (and `null` when speech stops). Returns an unsubscribe. */
export function onSentence(fn: (s: SpokenSentence | null) => void): () => void {
  sentenceListeners.add(fn)
  return () => sentenceListeners.delete(fn)
}
function announce(s: SpokenSentence | null) {
  for (const l of sentenceListeners) l(s)
}
/** About how long a device voice takes to say `text` (it reports no length). */
export function estimateMs(text: string, rate = 1.02): number {
  return Math.max(400, Math.round((text.length * 62) / rate))
}

/**
 * The voice that suits the chosen teacher when the student picked no voice:
 * the male teachers get a male voice. '' = the language's default.
 */
function teacherVoice(lang: string): string {
  const t = getVoicePrefs().teacher
  if (t !== 'kai' && t !== 'victor') return ''
  return lang === 'hi-IN' ? 'hi-IN-MadhurNeural' : 'en-IN-PrabhatNeural'
}

const IDLE: Speaking = { on: false, engine: null, name: '' }
let state: Speaking = IDLE
const listeners = new Set<() => void>()
function set(next: Speaking) {
  state = next
  for (const l of listeners) l()
}
/** Who is speaking now (for the "AI voice" label and the teacher's lips). */
export function useSpeaking(): Speaking {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
    () => state,
  )
}

/** The audio element playing a natural or Kokoro voice, for lip sync (null for the device voice). */
let playing: HTMLAudioElement | null = null
export function playingAudio(): HTMLAudioElement | null {
  return playing
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/* ── the natural voice (server) ── */

let natural: Promise<{ available: boolean; voices: Record<string, { id: string; label: string }[]> }> | null = null
/** Is the server's natural voice set up? Asked once per page load; a "no" is asked again after a minute. */
export function naturalVoices() {
  if (!natural) {
    const p = fetch(`${API_BASE}/api/voice/tts/status`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => ({ available: !!j?.available, voices: (j?.voices ?? {}) as Record<string, { id: string; label: string }[]> }))
      .catch(() => ({ available: false, voices: {} }))
    natural = p
    void p.then((v) => {
      if (!v.available) window.setTimeout(() => (natural === p ? (natural = null) : undefined), 60_000)
    })
  }
  return natural
}

async function naturalClip(text: string, lang: string, voice: string, signal: AbortSignal): Promise<Blob | null> {
  try {
    const r = await fetch(`${API_BASE}/api/voice/tts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang, voice }),
      signal,
    })
    if (!r.ok) return null
    const b = await r.blob()
    return b.size ? b : null
  } catch {
    return null
  }
}

/* ── Kokoro on the device (opt-in) ── */

const KOKORO_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm'
const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'
interface RawAudioLike {
  toBlob?: () => Blob
  data?: Float32Array
  sampling_rate?: number
}
interface KokoroLike {
  generate(text: string, o: { voice: string }): Promise<RawAudioLike>
}
let kokoro: Promise<KokoroLike> | null = null

/**
 * Download and start Kokoro (only after the student agreed). `onProgress`
 * gets 0–1 while the model downloads; it is cached by the browser after.
 */
export function loadKokoro(onProgress?: (p: number) => void): Promise<KokoroLike> {
  if (!kokoro) {
    kokoro = (async () => {
      const mod = (await import(/* @vite-ignore */ KOKORO_URL)) as { KokoroTTS: { from_pretrained(id: string, o: Record<string, unknown>): Promise<KokoroLike> } }
      const files = new Map<string, { loaded: number; total: number }>()
      return mod.KokoroTTS.from_pretrained(KOKORO_MODEL, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (e: { status?: string; file?: string; loaded?: number; total?: number }) => {
          if (e.status !== 'progress' || !e.file) return
          files.set(e.file, { loaded: e.loaded ?? 0, total: e.total ?? 0 })
          let l = 0
          let t = 0
          for (const f of files.values()) {
            l += f.loaded
            t += f.total
          }
          if (t) onProgress?.(Math.min(1, l / t))
        },
      })
    })().catch((e) => {
      kokoro = null
      throw e
    })
  }
  return kokoro
}

function wavBlob(data: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + data.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + data.length * 2, true)
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
  v.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

async function kokoroClip(text: string): Promise<Blob | null> {
  try {
    const tts = await loadKokoro()
    const t = getVoicePrefs().teacher
    const a = await tts.generate(text, { voice: t === 'kai' || t === 'victor' ? 'am_michael' : 'af_heart' })
    if (a.toBlob) return a.toBlob()
    if (a.data && a.sampling_rate) return wavBlob(a.data, a.sampling_rate)
    return null
  } catch {
    return null
  }
}

/* ── speaking ── */

let session = 0
let abort: AbortController | null = null

function deviceSay(parts: string[], lang: string, my: number) {
  if (!canSpeak() || !parts.length) {
    if (my === session) set(IDLE)
    return
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const voices = synth.getVoices()
  const voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2))) ?? null
  set({ on: true, engine: 'device', name: 'Device voice' })
  // One utterance per sentence: each start is announced for the teacher's lips,
  // and long answers aren't cut off (some browsers stop one long utterance).
  parts.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.voice = voice
    u.rate = 1.02
    u.onstart = () => {
      if (my === session) announce({ text, lang, ms: estimateMs(text, u.rate) })
    }
    u.onerror = () => {
      if (my === session) {
        set(IDLE)
        announce(null)
      }
    }
    if (i === parts.length - 1) {
      u.onend = () => {
        if (my === session) {
          set(IDLE)
          announce(null)
        }
      }
    }
    synth.speak(u)
  })
}

function play(blob: Blob, my: number, text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (my !== session) return resolve()
    const url = URL.createObjectURL(blob)
    const a = new Audio(url)
    playing = a
    a.onplaying = () => {
      a.onplaying = null
      if (my === session) announce({ text, lang, ms: Number.isFinite(a.duration) && a.duration > 0 ? Math.round(a.duration * 1000) : estimateMs(text) })
    }
    const done = () => {
      URL.revokeObjectURL(url)
      if (playing === a) playing = null
      resolve()
    }
    a.onended = done
    a.onerror = done
    a.play().catch(done)
  })
}

async function which(lang: string): Promise<Engine> {
  const p = getVoicePrefs()
  if (p.engine === 'device') return 'device'
  const kokoroOk = p.kokoro && lang.startsWith('en')
  if (p.engine === 'kokoro') return kokoroOk ? 'kokoro' : 'device'
  if ((await naturalVoices()).available) return 'natural'
  if (p.engine === 'natural') return 'device'
  return kokoroOk ? 'kokoro' : 'device'
}

/** Say `text` in `lang` ('en-IN' or 'hi-IN'), replacing anything being said. */
export function speak(text: string, lang: string) {
  stopSpeaking()
  const my = ++session
  const parts = splitSentences(text)
  if (!parts.length) return
  void (async () => {
    const engine = await which(lang)
    if (my !== session) return
    if (engine === 'device') return deviceSay(parts, lang, my)
    const ctrl = new AbortController()
    abort = ctrl
    const voice = getVoicePrefs().voice || teacherVoice(lang)
    const make = (s: string) => (engine === 'natural' ? naturalClip(s, lang, voice, ctrl.signal) : kokoroClip(s))
    const name = engine === 'kokoro' ? 'Kokoro' : (voice.match(/-([A-Z][a-z]+)Neural$/)?.[1] ?? (lang === 'hi-IN' ? 'Swara' : 'Neerja'))
    let next = make(parts[0])
    for (let i = 0; i < parts.length; i++) {
      const clip = await next
      if (my !== session) return
      if (!clip) {
        // This voice stopped working: the device voice says the rest.
        return deviceSay(parts.slice(i), lang, my)
      }
      // Make the next sentence while this one plays.
      if (i + 1 < parts.length) next = make(parts[i + 1])
      set({ on: true, engine, name })
      await play(clip, my, parts[i], lang)
    }
    if (my === session) {
      set(IDLE)
      announce(null)
    }
  })()
}

export function stopSpeaking() {
  session++
  abort?.abort()
  abort = null
  if (playing) {
    playing.pause()
    playing = null
  }
  if (canSpeak()) window.speechSynthesis.cancel()
  if (state.on) {
    set(IDLE)
    announce(null)
  }
}
