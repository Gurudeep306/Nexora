/* The voice sample, made ready for a voice print. Pure and type-strippable: tests/voice-clone.test.js. */

/** Cut quiet parts off both ends. */
export function trimSilence(audio: Float32Array, rate: number, floor = 0.02): Float32Array {
  const win = Math.round(rate * 0.02)
  const loud = (i: number) => {
    let s = 0
    for (let k = i; k < Math.min(audio.length, i + win); k++) s += audio[k] * audio[k]
    return Math.sqrt(s / win) > floor
  }
  let a = 0
  while (a < audio.length && !loud(a)) a += win
  if (a >= audio.length) return new Float32Array(0)
  let b = audio.length
  while (b > a && !loud(Math.max(a, b - win))) b -= win
  return audio.slice(Math.max(0, a - win * 5), Math.min(audio.length, b + win * 5))
}

/** Seconds of sound in a sample, after trimming: enough for a good voice print? */
export function usableSeconds(audio: Float32Array, rate = 24000): number {
  return trimSilence(audio, rate).length / rate
}
