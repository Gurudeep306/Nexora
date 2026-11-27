/*
  Pratibimb lip sync and speaking face: everything that turns a voice into face values, as pure
  functions (no three.js), so tests can check them and any player can use them.

  Two sources, best first:
  1. Curves: 52 ARKit values at 30 fps from the "lipsync" slot (wav2arkit, Apache-2.0, trained on real
     people's faces; or our own fine-tuned model). Real motion, but it never quite closes the lips.
  2. Visemes: the voice's own sound timings (HeadTTS gives them for English; an aligner for Hindi).
     Used to enforce what curves miss (lips fully closed on p/b/m, lower lip to teeth on f/v) and, with
     no curves at all, to build the mouth from a viseme table.

  On top: a 40 ms lead (the face moves before the sound), light smoothing, per-shape gains (this face
  model's teeth-baring shapes are stronger than a real face's), and prosody from the audio itself:
  brows lift a little on pitch peaks, the head nods on stressed syllables, blinks land at phrase ends,
  a breath in each pause. docs/pratibimb/SPEC.md section 5 says how this is measured.

  Dependency-free and type-strippable (tests/pratibimb-lipsync.test.js).
*/

export type Shapes = Record<string, number>

export interface Curves {
  fps: number
  frames: Shapes[]
}

export interface Timing {
  visemes: string[]
  /** ms from the start of the clip */
  vtimes: number[]
  vdurations: number[]
}

export interface Prosody {
  /** values per second */
  rate: number
  /** loudness, about 0..1 (1 = loud speech) */
  loud: number[]
  /** pitch in semitones around the speaker's median, 0 when unvoiced */
  pitch: number[]
  /** stressed-syllable times, seconds */
  stress: number[]
  /** [start, end] seconds of each pause */
  pauses: [number, number][]
}

export interface Face {
  shapes: Shapes
  /** extra head/neck/chest rotation (radians, x = nod down, y = turn, z = tilt) */
  head: [number, number, number]
  neck: [number, number, number]
  chest: number
  blink: number
}

export const LEAD_S = 0.04

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))

/** Per-shape gains for the MakeHuman ARKit set (its upper-lip and stretch shapes bare the teeth more than a real face). */
export const GAINS: Shapes = {
  mouthUpperUpLeft: 0.35, mouthUpperUpRight: 0.35, mouthLowerDownLeft: 0.6, mouthLowerDownRight: 0.6,
  mouthStretchLeft: 0.45, mouthStretchRight: 0.45, mouthSmileLeft: 0.6, mouthSmileRight: 0.6,
  mouthDimpleLeft: 0.5, mouthDimpleRight: 0.5, jawOpen: 1.15,
}

/** Shapes that open the mouth: all of them give way while the lips are closed. */
const OPENERS = ['jawOpen', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'mouthFunnel', 'mouthStretchLeft', 'mouthStretchRight']

/** Viseme (Oculus set) → ARKit mouth, for when there are no curves. Kept small: real speech is subtle. */
export const VISEME_SHAPES: Record<string, Shapes> = {
  sil: {},
  aa: { jawOpen: 0.42, mouthLowerDownLeft: 0.18, mouthLowerDownRight: 0.18 },
  E: { jawOpen: 0.24, mouthStretchLeft: 0.25, mouthStretchRight: 0.25, mouthSmileLeft: 0.08, mouthSmileRight: 0.08 },
  I: { jawOpen: 0.14, mouthStretchLeft: 0.32, mouthStretchRight: 0.32, mouthSmileLeft: 0.12, mouthSmileRight: 0.12 },
  O: { jawOpen: 0.3, mouthFunnel: 0.45, mouthPucker: 0.2 },
  U: { jawOpen: 0.12, mouthPucker: 0.55, mouthFunnel: 0.28 },
  PP: {},
  FF: {},
  TH: { jawOpen: 0.12, tongueOut: 0.22 },
  DD: { jawOpen: 0.18 },
  kk: { jawOpen: 0.2 },
  CH: { jawOpen: 0.12, mouthFunnel: 0.32, mouthPucker: 0.2 },
  SS: { jawOpen: 0.08, mouthStretchLeft: 0.18, mouthStretchRight: 0.18 },
  nn: { jawOpen: 0.1 },
  RR: { jawOpen: 0.12, mouthPucker: 0.25 },
}

/** Curves at time t (seconds), linearly interpolated and lightly smoothed over neighbouring frames. */
export function sampleCurves(c: Curves, t: number): Shapes {
  const out: Shapes = {}
  if (!c.frames.length) return out
  const fi = t * c.fps
  const base = Math.floor(fi)
  const f = fi - base
  const W = [0.25, 0.5, 0.25]
  const last = c.frames.length - 1
  for (let k = -1; k <= 1; k++) {
    const a = c.frames[clamp(base + k, 0, last)] || {}
    const b = c.frames[clamp(base + k + 1, 0, last)] || {}
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) out[key] = (out[key] || 0) + W[k + 1] * ((a[key] || 0) * (1 - f) + (b[key] || 0) * f)
  }
  return out
}

/** How strongly any of the given visemes is under way at time t (seconds): soft ramps, never shorter than 70 ms. */
export function visemeOn(timing: Timing, classes: string[], t: number, before = 55, after = 15): number {
  const ms = t * 1000
  let w = 0
  for (let i = 0; i < timing.visemes.length; i++) {
    if (!classes.includes(timing.visemes[i])) continue
    const a = timing.vtimes[i] - before
    const b = timing.vtimes[i] + Math.max(timing.vdurations[i], 70) + after
    w = Math.max(w, clamp((ms - a) / 35) * (1 - clamp((ms - (b - 35)) / 35)))
  }
  return w
}

/** A mouth built from visemes alone (no curves): overlapping shapes blended by their envelopes. */
export function mouthFromVisemes(timing: Timing, t: number): Shapes {
  const out: Shapes = {}
  const ms = t * 1000
  for (let i = 0; i < timing.visemes.length; i++) {
    const shape = VISEME_SHAPES[timing.visemes[i]]
    if (!shape) continue
    const a = timing.vtimes[i] - 60
    const b = timing.vtimes[i] + timing.vdurations[i] + 50
    const env = clamp((ms - a) / 80) * (1 - clamp((ms - (b - 80)) / 80))
    if (env <= 0) continue
    for (const [k, v] of Object.entries(shape)) out[k] = Math.max(out[k] || 0, v * env)
  }
  return out
}

/** The speaking face at time t of a clip (t in seconds from the clip's start). */
export function speakingFace(t: number, src: { curves?: Curves | null; timing?: Timing | null; prosody?: Prosody | null }, gains: Shapes = GAINS): Face {
  const s: Shapes = src.curves ? sampleCurves(src.curves, t + LEAD_S) : src.timing ? mouthFromVisemes(src.timing, t + LEAD_S) : {}
  for (const k of Object.keys(s)) s[k] *= gains[k] ?? 1
  if (src.timing) {
    const pbm = visemeOn(src.timing, ['PP'], t + 0.02)
    const fv = visemeOn(src.timing, ['FF'], t + 0.02)
    // Lips meet on p/b/m with the jaw nearly (not fully) closed: openers fade, the jaw keeps a little.
    for (const k of OPENERS) s[k] = (s[k] || 0) * (1 - pbm)
    s.jawOpen = Math.max(s.jawOpen || 0, 0.06 * pbm)
    s.mouthPressLeft = Math.max(s.mouthPressLeft || 0, 0.45 * pbm)
    s.mouthPressRight = Math.max(s.mouthPressRight || 0, 0.45 * pbm)
    // mouthClose closes the lips against the jaw opening; more than the jaw opening pushes them through each other.
    s.mouthClose = Math.min(Math.max(s.mouthClose || 0, 0.25 * pbm), s.jawOpen || 0)
    s.mouthRollUpper = Math.max(s.mouthRollUpper || 0, 0.12 * pbm)
    s.mouthRollLower = Math.max(s.mouthRollLower || 0, 0.12 * pbm, 0.55 * fv)
    s.mouthUpperUpLeft = Math.max(s.mouthUpperUpLeft || 0, 0.15 * fv)
    s.mouthUpperUpRight = Math.max(s.mouthUpperUpRight || 0, 0.15 * fv)
    s.jawOpen = (s.jawOpen || 0) * (1 - 0.5 * fv)
  }
  const head: [number, number, number] = [0, 0, 0]
  const neck: [number, number, number] = [0, 0, 0]
  let chest = 0
  let blink = 0
  const p = src.prosody
  if (p && p.loud.length) {
    const at = (arr: number[]) => arr[clamp(Math.round(t * p.rate), 0, arr.length - 1)] || 0
    const brow = clamp((at(p.pitch) - 2) / 6) * 0.35
    s.browInnerUp = Math.max(s.browInnerUp || 0, brow)
    s.browOuterUpLeft = Math.max(s.browOuterUpLeft || 0, brow * 0.6)
    s.browOuterUpRight = Math.max(s.browOuterUpRight || 0, brow * 0.6)
    let nod = 0
    for (const st of p.stress) {
      const d = t - st + 0.05
      if (d > 0 && d < 0.35) nod = Math.max(nod, Math.sin((Math.PI * d) / 0.35))
    }
    let breath = 0
    for (const [a, b] of p.pauses) if (t > a && t < b) breath = Math.max(breath, Math.sin((Math.PI * (t - a)) / (b - a)))
    head[0] = 0.035 * nod + 0.006 * at(p.loud)
    neck[0] = 0.01 * nod
    chest = 0.02 * breath
    for (const [a] of p.pauses) {
      const d = t - (a + 0.05)
      if (d >= 0 && d < 0.16) blink = Math.max(blink, Math.sin((Math.PI * d) / 0.16))
    }
  }
  for (const k of Object.keys(s)) s[k] = clamp(s[k])
  return { shapes: s, head, neck, chest, blink }
}

/**
 * Prosody from the audio itself (when the server sends none): loudness, pitch by autocorrelation,
 * stressed syllables (loudness peaks ≥ 180 ms apart) and pauses (≥ 180 ms of quiet). 100 values a second.
 */
export function analyseVoice(samples: Float32Array, rate: number): Prosody {
  const hop = Math.round(rate / 100)
  const win = Math.round(rate * 0.04)
  const n = Math.max(0, Math.floor((samples.length - win) / hop))
  const loud: number[] = []
  const f0: number[] = []
  for (let i = 0; i < n; i++) {
    const o = i * hop
    let e = 0
    for (let j = 0; j < win; j++) e += samples[o + j] * samples[o + j]
    loud.push(Math.sqrt(e / win))
    // Pitch: the strongest autocorrelation lag between 70 and 450 Hz, kept only when clearly periodic.
    let best = 0
    let bestLag = 0
    const minLag = Math.floor(rate / 450)
    const maxLag = Math.min(win - 1, Math.floor(rate / 70))
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let c = 0
      for (let j = 0; j + lag < win; j += 2) c += samples[o + j] * samples[o + j + lag]
      if (c > best) {
        best = c
        bestLag = lag
      }
    }
    f0.push(best > e * 0.3 && bestLag ? rate / bestLag : 0)
  }
  const sorted = [...loud].sort((a, b) => a - b)
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1
  const L = loud.map((v) => v / ref)
  const voiced = f0.filter((v) => v > 0).sort((a, b) => a - b)
  const med = voiced[Math.floor(voiced.length / 2)] || 200
  const pitch = f0.map((v) => (v > 0 ? 12 * Math.log2(v / med) : 0))
  const sm = L.map((_, i) => {
    let s = 0
    let c = 0
    for (let k = -2; k <= 2; k++) {
      if (L[i + k] === undefined) continue
      s += L[i + k]
      c++
    }
    return s / c
  })
  const stress: number[] = []
  for (let i = 2; i < sm.length - 2; i++) {
    let isMax = true
    for (let k = Math.max(0, i - 9); k < Math.min(sm.length, i + 10); k++) if (sm[k] > sm[i]) isMax = false
    if (isMax && sm[i] > 0.55 && (!stress.length || i - stress[stress.length - 1] * 100 >= 18)) stress.push(i / 100)
  }
  const pauses: [number, number][] = []
  for (let i = 0; i < sm.length; ) {
    if (sm[i] < 0.08) {
      let j = i
      while (j < sm.length && sm[j] < 0.08) j++
      if (j - i >= 18) pauses.push([i / 100, j / 100])
      i = j
    } else i++
  }
  return { rate: 100, loud: L, pitch, stress, pauses }
}
