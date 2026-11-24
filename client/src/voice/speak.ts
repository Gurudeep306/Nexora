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
import { speechChunks, splitSentences } from './sentences'
import { bestVoice } from './deviceVoice'
import { levelUp, pickVoice } from './voices'
import { checkSavedOnce, cloneSay, getClone, loadClone } from './clone/clone'
import { teacherById } from './teacher/teachers'
import { energyEnvelope } from './teacher/lipsync'

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
  /** Loudness every 20 ms (0–1), when there are no word times: the lips rest in the pauses. */
  energy?: number[]
  /** The device voice: word starts follow as `onWord` events where the voice reports them. */
  live?: boolean
}

export interface VoiceTiming {
  words?: string[]
  wtimes?: number[]
  wdurations?: number[]
  visemes?: string[]
  vtimes?: number[]
  vdurations?: number[]
}
/** One word as the device voice starts it (only voices that report word boundaries). */
export interface SpokenWord {
  word: string
  ms: number
}
const wordListeners = new Set<(w: SpokenWord) => void>()
/** Hear each word the device voice starts. Returns an unsubscribe. */
export function onWord(fn: (w: SpokenWord) => void): () => void {
  wordListeners.add(fn)
  return () => wordListeners.delete(fn)
}
function announceWord(w: SpokenWord) {
  for (const l of wordListeners) l(w)
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
  return Math.max(text.length < 15 ? 140 : 400, Math.round((text.length * 62) / rate))
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
/** The speak() call still preparing its first sound (0 = none), and since when. */
let waitingFor = 0
let waitingSince = 0
function set(next: Speaking) {
  state = next
  // Sound started, or speech ended: nothing is waiting any more.
  waitingFor = 0
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
    const p = fetch(`${API_BASE}/api/voice/tts/status`, { credentials: 'include', signal: AbortSignal.timeout(4000) })
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
  /** Loudness every 20 ms, when the voice gives no word times: the teacher's lips follow the sound (lipsync.ts). */
  energy?: number[]
}

/** Add the loudness of a clip that has no word times of its own (Azure's voices): decoded once, off the main sound. */
async function withEnergy(clip: Clip | null): Promise<Clip | null> {
  if (!clip || clip.energy || clip.timing?.words?.length || typeof OfflineAudioContext === 'undefined') return clip
  try {
    const buf = await new OfflineAudioContext(1, 1, 16000).decodeAudioData(await clip.blob.arrayBuffer())
    return { ...clip, energy: energyEnvelope(buf.getChannelData(0), buf.sampleRate) }
  } catch {
    return clip
  }
}

function b64Blob(b64: string, mime: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** A voice clip that doesn't arrive in time counts as failed: the next voice (finally the device's own) says it instead of silence. */
const CLIP_LIMIT_MS = 15_000
function inTime<T>(p: Promise<T | null>, ms = CLIP_LIMIT_MS): Promise<T | null> {
  return Promise.race([p, new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms))])
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

/** The one-time download, depending on the device: 163 MB (GPU with half precision), 326 MB (other GPUs: full precision, the clearest), 92 MB (no GPU). */
export const KOKORO_MB = '90–330'

/**
 * What this device's GPU can run: 'half' (half precision), 'full' (a GPU
 * without half precision: the full model, the clearest), or null (no WebGPU).
 * Before, a GPU without half precision fell back to the small compressed
 * model on the processor, which sounds muffled.
 */
async function gpuKind(): Promise<'half' | 'full' | null> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu
    const adapter = gpu ? await gpu.requestAdapter() : null
    if (!adapter) return null
    return adapter.features.has('shader-f16') ? 'half' : 'full'
  } catch {
    return null
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
      const gpu = await gpuKind()
      const tts = new mod.HeadTTS({
        endpoints: gpu ? ['webgpu', 'wasm'] : ['wasm'],
        transformersModule: TRANSFORMERS,
        dtypeWebgpu: gpu === 'half' ? 'fp16' : 'fp32',
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
    const r = await fetch(`${API_BASE}/api/voice/phonetic`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(5000) })
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
    // Clearly audible: the voice comes out quiet; bring it to speaking level without clipping.
    const samples = Float32Array.from(first.audio.getChannelData(0))
    levelUp(samples)
    return { blob: wavBlob(samples, first.audio.sampleRate), timing }
  } catch {
    return null
  }
}

/** A sentence in the voice the student gave, levelled like the others. */
async function ownClip(text: string): Promise<Clip | null> {
  const audio = await cloneSay(text)
  if (!audio?.length) return null
  levelUp(audio)
  return { blob: wavBlob(audio, 24000), timing: null, energy: energyEnvelope(audio, 24000) }
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
  // The most natural voice the device has for this language, matching the teacher (deviceVoice.ts).
  const voice = bestVoice(synth.getVoices(), lang, teacherById(getVoicePrefs().teacher)?.body === 'M')
  set({ on: true, engine: 'device', name: 'Device voice' })
  // One utterance per sentence: each start is announced for the teacher's lips,
  // and long answers aren't cut off (some browsers stop one long utterance).
  parts.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.voice = voice
    u.rate = 1.02
    u.onstart = () => {
      if (my === session) announce({ text, lang, ms: estimateMs(text, u.rate), live: true })
    }
    // Most device voices say where each word starts: the teacher's lips follow those, not a guess.
    u.onboundary = (e) => {
      if (my !== session || (e.name && e.name !== 'word')) return
      const word = (e.charLength ? text.slice(e.charIndex, e.charIndex + e.charLength) : (text.slice(e.charIndex).match(/^\S+/)?.[0] ?? '')).replace(/[^\p{L}\p{N}']/gu, '')
      if (word) announceWord({ word, ms: estimateMs(word, u.rate) })
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
      if (my === session) announce({ text, lang, ms: Number.isFinite(a.duration) && a.duration > 0 ? Math.round(a.duration * 1000) : estimateMs(text), timing: clip.timing, energy: clip.energy })
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
/**
 * Is a voice still being prepared (a natural voice or the student's own voice
 * can take seconds before the first sound)? The conversation waits for it
 * instead of opening the mic over her first words. Never longer than 20 s.
 */
export function aboutToSpeak(): boolean {
  return waitingFor !== 0 && waitingFor === session && !state.on && Date.now() - waitingSince < 20_000
}

export function speak(text: string, lang: string) {
  stopSpeaking()
  const my = ++session
  // Pieces of a sentence or two: the voice keeps its own rhythm inside each, with few seams.
  const parts = speechChunks(text)
  if (!parts.length) return
  waitingFor = my
  waitingSince = Date.now()
  void (async () => {
    const { engine, status } = await which()
    if (my !== session) return
    if (engine === 'device') return deviceSay(parts, lang, my)
    const ctrl = new AbortController()
    abort = ctrl
    const picked = getVoicePrefs().voice
    const known = status?.voices[lang]?.some((v) => v.id === picked)
    const voice = (known ? picked : '') || teacherVoice(lang, status?.engine ?? null)
    // On the device: the voice the student chose (voices.ts), else the clearest one for the teacher; Hindi in a Hindi voice.
    const male = teacherById(getVoicePrefs().teacher)?.body === 'M'
    const usual = (s: string) => inTime(engine === 'natural' ? naturalClip(s, lang, voice, ctrl.signal).then(withEnergy) : kokoroClip(s, pickVoice(getVoicePrefs().kokoroVoice, male, s)))
    // The voice the student gave (clone/clone.ts), when it is on and ready; Hindi and anything it can't say use the usual voice.
    // The saved voice is looked up once per page (it lives in this browser), not only when Settings is opened.
    if (getVoicePrefs().ownVoice) await checkSavedOnce()
    const own = getVoicePrefs().ownVoice && getClone().hasVoice
    if (own && getClone().status === 'off') void loadClone().catch(() => {})
    const make = async (s: string): Promise<Clip | null> => (own ? ((await inTime(ownClip(s))) ?? usual(s)) : usual(s))
    const name = own && getClone().status === 'ready' ? 'Your voice' : engine === 'kokoro' ? 'Kokoro' : voiceName(status, voice, lang)
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

/** Say a sample in one on-device voice (the voice picker's play button). Needs the voices downloaded (prefs.kokoro). */
export async function previewVoice(voiceId: string, text: string, lang: string): Promise<boolean> {
  stopSpeaking()
  const my = ++session
  const clip = await kokoroClip(text, voiceId)
  if (!clip || my !== session) return false
  set({ on: true, engine: 'kokoro', name: 'Kokoro' })
  await play(clip, my, text, lang)
  if (my === session) {
    set(IDLE)
    announce(null)
  }
  return true
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
