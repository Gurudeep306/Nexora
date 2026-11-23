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
import { teacherById } from './teacher/teachers'

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
  /** Exact word times and mouth shapes, when the voice server sent them (our own voice server does). */
  timing?: VoiceTiming | null
}

export interface VoiceTiming {
  words?: string[]
  wtimes?: number[]
  wdurations?: number[]
  visemes?: string[]
  vtimes?: number[]
  vdurations?: number[]
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
 * on our own voice server each teacher has their own Indian voice; on Azure
 * the men get a male voice. '' = the default.
 */
function teacherVoice(lang: string, engine: string | null): string {
  const t = teacherById(getVoicePrefs().teacher)
  if (!t) return ''
  if (engine === 'own') return t.voice
  if (t.body !== 'M') return ''
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

export interface NaturalStatus {
  available: boolean
  /** 'own' = our voice server (Indian voices, exact lip shapes); 'azure' = Azure's free tier. */
  engine: 'own' | 'azure' | null
  voices: Record<string, { id: string; label: string }[]>
}
let natural: Promise<NaturalStatus> | null = null
/** Is the server's natural voice set up? Asked once per page load; a "no" is asked again after a minute. */
export function naturalVoices() {
  if (!natural) {
    const p = fetch(`${API_BASE}/api/voice/tts/status`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j): NaturalStatus => ({ available: !!j?.available, engine: j?.engine === 'own' || j?.engine === 'azure' ? j.engine : null, voices: (j?.voices ?? {}) as NaturalStatus['voices'] }))
      .catch((): NaturalStatus => ({ available: false, engine: null, voices: {} }))
    natural = p
    void p.then((v) => {
      if (!v.available) window.setTimeout(() => (natural === p ? (natural = null) : undefined), 60_000)
    })
  }
  return natural
}

interface Clip {
  blob: Blob
  timing?: VoiceTiming | null
}

function b64Blob(b64: string, mime: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function naturalClip(text: string, lang: string, voice: string, signal: AbortSignal): Promise<Clip | null> {
  try {
    const r = await fetch(`${API_BASE}/api/voice/tts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang, voice }),
      signal,
    })
    if (!r.ok) return null
    const j = (await r.json()) as { ok?: boolean; audio?: string; mime?: string; timing?: VoiceTiming | null }
    if (!j.ok || !j.audio) return null
    const blob = b64Blob(j.audio, j.mime === 'audio/wav' ? 'audio/wav' : 'audio/mpeg')
    return blob.size ? { blob, timing: j.timing ?? null } : null
  } catch {
    return null
  }
}

/* ── Kokoro on the device (opt-in), through HeadTTS ──
   HeadTTS (MIT; client/public/headtts, scripts/teacher/vendor-headtts.sh) runs
   the Kokoro model (Apache-2.0) in the browser, with no GPL parts, and returns
   word times and mouth shapes for the teacher. Its worker loads from our own
   address; transformers.js from jsDelivr (pinned) and the model from Hugging
   Face, once, after the student agreed. WebGPU when the device has it, else
   WebAssembly. Kokoro's Indian voices speak English and, written as sounds by
   the server (/api/voice/phonetic), Hindi. */

const HEADTTS = '/headtts/modules/headtts.mjs'
/** Kokoro's Indian voices (the same four the voice server uses). */
const OWN_VOICE_IDS = ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi']
const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0/dist/transformers.min.js'
interface HeadTtsAudio {
  audio: AudioBuffer
  words?: string[]
  wtimes?: number[]
  wdurations?: number[]
  visemes?: string[]
  vtimes?: number[]
  vdurations?: number[]
}
interface HeadTtsLike {
  connect(onprogress?: ((e: ProgressEvent) => void) | null): Promise<void>
  setup(o: Record<string, unknown>): void
  synthesize(o: { input: unknown }): Promise<{ type: string; data: HeadTtsAudio | { error?: string } }[]>
}
let kokoro: Promise<HeadTtsLike> | null = null

/** The one-time download, depending on the device: 163 MB with a GPU that can run it, else 92 MB. */
export const KOKORO_MB = '90–165'

/** Can this device's GPU run the half-precision model? (Many can't: then WebAssembly, which works everywhere.) */
async function gpuHalf(): Promise<boolean> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu
    const adapter = gpu ? await gpu.requestAdapter() : null
    return !!adapter?.features.has('shader-f16')
  } catch {
    return false
  }
}

/**
 * Download and start the voice model (only after the student agreed).
 * `onProgress` gets 0–1 while it downloads; the browser keeps it after.
 */
export function loadKokoro(onProgress?: (p: number) => void): Promise<HeadTtsLike> {
  if (!kokoro) {
    kokoro = (async () => {
      const mod = (await import(/* @vite-ignore */ HEADTTS)) as { HeadTTS: new (o: Record<string, unknown>) => HeadTtsLike }
      const tts = new mod.HeadTTS({
        endpoints: (await gpuHalf()) ? ['webgpu', 'wasm'] : ['wasm'],
        transformersModule: TRANSFORMERS,
        dtypeWebgpu: 'fp16',
        dtypeWasm: 'q8',
        languages: ['en-us'],
        defaultVoice: 'hf_alpha',
        splitSentences: false,
      })
      await tts.connect((e) => {
        if (e.lengthComputable && e.total) onProgress?.(Math.min(1, e.loaded / e.total))
      })
      return tts
    })().catch((e) => {
      kokoro = null
      throw e
    })
  }
  return kokoro
}

/** Hindi written as sounds by the server (no AI); other text as it is. */
async function phonetic(text: string): Promise<unknown> {
  if (!/[\u0900-\u097F]/.test(text)) return text
  try {
    const r = await fetch(`${API_BASE}/api/voice/phonetic`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
    const j = (await r.json()) as { input?: unknown }
    return j.input ?? text
  } catch {
    return text
  }
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

async function kokoroClip(text: string, voice: string): Promise<Clip | null> {
  try {
    const tts = await loadKokoro()
    tts.setup({ voice, language: 'en-us', speed: 1, audioEncoding: 'wav' })
    const out = await tts.synthesize({ input: await phonetic(text) })
    const parts = out.filter((m) => m.type === 'audio').map((m) => m.data as HeadTtsAudio)
    const first = parts[0]
    if (!first?.audio) return null
    const timing = { words: first.words, wtimes: first.wtimes, wdurations: first.wdurations, visemes: first.visemes, vtimes: first.vtimes, vdurations: first.vdurations }
    return { blob: wavBlob(first.audio.getChannelData(0), first.audio.sampleRate), timing }
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

function play(clip: Clip, my: number, text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (my !== session) return resolve()
    const url = URL.createObjectURL(clip.blob)
    const a = new Audio(url)
    playing = a
    a.onplaying = () => {
      a.onplaying = null
      if (my === session) announce({ text, lang, ms: Number.isFinite(a.duration) && a.duration > 0 ? Math.round(a.duration * 1000) : estimateMs(text), timing: clip.timing })
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

async function which(): Promise<{ engine: Engine; status: NaturalStatus | null }> {
  const p = getVoicePrefs()
  if (p.engine === 'device') return { engine: 'device', status: null }
  const kokoroOk = p.kokoro
  if (p.engine === 'kokoro') return { engine: kokoroOk ? 'kokoro' : 'device', status: null }
  const status = await naturalVoices()
  if (status.available) return { engine: 'natural', status }
  if (p.engine === 'natural') return { engine: 'device', status }
  return { engine: kokoroOk ? 'kokoro' : 'device', status }
}

/** What the label calls a voice: the server's label's first word ("Alpha"), or the Azure name ("Neerja"). */
function voiceName(status: NaturalStatus | null, voice: string, lang: string): string {
  const own = status?.voices[lang]?.find((v) => v.id === voice) ?? status?.voices[lang]?.[0]
  if (status?.engine === 'own' && own) return own.label.split(' ')[0]
  return voice.match(/-([A-Z][a-z]+)Neural$/)?.[1] ?? (lang === 'hi-IN' ? 'Swara' : 'Neerja')
}

/** Say `text` in `lang` ('en-IN' or 'hi-IN'), replacing anything being said. */
export function speak(text: string, lang: string) {
  stopSpeaking()
  const my = ++session
  const parts = splitSentences(text)
  if (!parts.length) return
  void (async () => {
    const { engine, status } = await which()
    if (my !== session) return
    if (engine === 'device') return deviceSay(parts, lang, my)
    const ctrl = new AbortController()
    abort = ctrl
    const picked = getVoicePrefs().voice
    const known = status?.voices[lang]?.some((v) => v.id === picked)
    const voice = (known ? picked : '') || teacherVoice(lang, status?.engine ?? null)
    const kokoroVoice = OWN_VOICE_IDS.includes(picked) ? picked : (teacherById(getVoicePrefs().teacher)?.voice ?? 'hf_alpha')
    const make = (s: string) => (engine === 'natural' ? naturalClip(s, lang, voice, ctrl.signal) : kokoroClip(s, kokoroVoice))
    const name = engine === 'kokoro' ? 'Kokoro' : voiceName(status, voice, lang)
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

/**
 * Say `text` and wait until it has been said (or was stopped). For the
 * teacher's tours: the next stop starts when this one has finished.
 * Resolves `true` if it was said to the end, `false` if stopped or replaced.
 */
export function speakAndWait(text: string, lang: string): Promise<boolean> {
  speak(text, lang)
  const my = session
  return new Promise((resolve) => {
    let started = false
    const check = () => {
      if (my !== session) return done(false)
      if (state.on) started = true
      else if (started) done(true)
    }
    const done = (ok: boolean) => {
      listeners.delete(check)
      window.clearTimeout(guard)
      resolve(ok)
    }
    listeners.add(check)
    // If no voice starts at all (sound off, no voice), move on after a reading pause.
    const guard = window.setTimeout(() => !started && done(my === session), Math.min(8000, estimateMs(text) + 1200))
  })
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
