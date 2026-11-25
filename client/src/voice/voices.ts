/*
  The teacher's voices: Kokoro's voices (Apache-2.0), run on the student's
  device. Kokoro's makers grade each voice on its training data
  (huggingface.co/hexgrad/Kokoro-82M, VOICES.md): the clearest are graded A
  and B; the Indian voices are graded C (less training data), so they can
  sound less clear. They are still offered, and are the only ones that speak
  Hindi. Pure and type-strippable: tests/voice-speak.test.js.
*/

export interface VoiceChoice {
  id: string
  name: string
  /** Who it sounds like, in a few words. */
  sounds: string
  gender: 'F' | 'M'
  /** Speaks Hindi (Devanagari) as well as English. */
  hindi: boolean
  /** Kokoro's own grade for the voice: A is clearest. */
  grade: 'A' | 'B' | 'C'
}

export const VOICES: readonly VoiceChoice[] = [
  { id: 'af_heart', name: 'Heart', sounds: 'Warm woman, American accent', gender: 'F', hindi: false, grade: 'A' },
  { id: 'af_bella', name: 'Bella', sounds: 'Bright woman, American accent', gender: 'F', hindi: false, grade: 'A' },
  { id: 'bf_emma', name: 'Emma', sounds: 'Calm woman, British accent', gender: 'F', hindi: false, grade: 'B' },
  { id: 'af_nicole', name: 'Nicole', sounds: 'Soft, quiet woman, American accent', gender: 'F', hindi: false, grade: 'B' },
  { id: 'hf_alpha', name: 'Alpha', sounds: 'Woman, Indian accent, speaks Hindi', gender: 'F', hindi: true, grade: 'C' },
  { id: 'hf_beta', name: 'Beta', sounds: 'Woman, Indian accent, speaks Hindi', gender: 'F', hindi: true, grade: 'C' },
  { id: 'am_michael', name: 'Michael', sounds: 'Steady man, American accent', gender: 'M', hindi: false, grade: 'C' },
  { id: 'am_fenrir', name: 'Fenrir', sounds: 'Deep man, American accent', gender: 'M', hindi: false, grade: 'C' },
  { id: 'am_puck', name: 'Puck', sounds: 'Lively man, American accent', gender: 'M', hindi: false, grade: 'C' },
  { id: 'bm_george', name: 'George', sounds: 'Older man, British accent', gender: 'M', hindi: false, grade: 'C' },
  { id: 'hm_omega', name: 'Omega', sounds: 'Man, Indian accent, speaks Hindi', gender: 'M', hindi: true, grade: 'C' },
  { id: 'hm_psi', name: 'Psi', sounds: 'Man, Indian accent, speaks Hindi', gender: 'M', hindi: true, grade: 'C' },
]

export const voiceById = (id: string) => VOICES.find((v) => v.id === id) ?? null

/**
 * The voice to speak `text` with: the student's choice, else the clearest
 * voice for the teacher's gender. Hindi (Devanagari) needs one of the Hindi
 * voices, so a chosen English-only voice hands Hindi to the Hindi voice of the
 * same gender.
 */
export function pickVoice(chosen: string, male: boolean, text: string): string {
  const hindiText = /[ऀ-ॿ]/.test(text)
  const v = voiceById(chosen)
  if (v && (!hindiText || v.hindi)) return v.id
  if (hindiText) return (v?.gender ?? (male ? 'M' : 'F')) === 'M' ? 'hm_omega' : 'hf_alpha'
  return male ? 'am_michael' : 'af_heart'
}

/**
 * Make a clip clearly audible without distortion: bring the loudness (RMS) up
 * to a speaking level, but never let the peaks clip. In place; returns the gain.
 */
export function levelUp(samples: Float32Array, targetRms = 0.1, maxPeak = 0.95, maxGain = 6): number {
  let peak = 0
  let sum = 0
  for (const s of samples) {
    const a = Math.abs(s)
    if (a > peak) peak = a
    sum += s * s
  }
  if (!samples.length || peak === 0) return 1
  const rms = Math.sqrt(sum / samples.length)
  const gain = Math.max(1, Math.min(maxGain, targetRms / rms, maxPeak / peak))
  if (gain !== 1) for (let i = 0; i < samples.length; i++) samples[i] *= gain
  return gain
}
