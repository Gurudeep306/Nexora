/*
  Which of the device's own voices to use. Browsers list dozens, from
  natural ones (Edge's "Online (Natural)" voices, macOS "Premium" and
  "Enhanced" voices, Google's) to robotic novelty ones (macOS "Zarvox",
  "Bells"). Taking the first one for the language, as before, often picked a
  robotic voice. This scores them: the right language, natural quality, the
  teacher's gender. Pure and type-strippable: tests/voice-speak.test.js.
*/

export interface VoiceLike {
  name: string
  lang: string
  localService?: boolean
}

const NATURAL = /\b(natural|neural)\b/i
const ENHANCED = /\b(premium|enhanced)\b/i
const ROBOTIC = /\b(espeak|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|rishi)\b/i
const FEMALE = /\b(neerja|swara|veena|isha|kalpana|heera|lekha|aditi|raveena|kajal|ananya|samantha|karen|moira|tessa|serena|female|zira|aria|jenny|sonia|libby)\b/i
const MALE = /\b(prabhat|madhur|hemant|ravi|kabir|aarav|daniel|alex|tom|oliver|male|david|mark|guy|ryan|thomas)\b/i

/** Higher is better; below zero means "only if nothing else". */
export function voiceScore(v: VoiceLike, lang: string, male = false): number {
  let s = 0
  if (v.lang.replace('_', '-') === lang) s += 100
  else if (v.lang.slice(0, 2) === lang.slice(0, 2)) s += 50
  else return -1000
  if (NATURAL.test(v.name)) s += 40
  if (ENHANCED.test(v.name)) s += 35
  if (/google/i.test(v.name)) s += 25
  if (ROBOTIC.test(v.name)) s -= 60
  if (male ? MALE.test(v.name) : FEMALE.test(v.name)) s += 15
  if (male ? FEMALE.test(v.name) : MALE.test(v.name)) s -= 15
  return s
}

/** The best voice for `lang`, or null when the device has none for it. */
export function bestVoice<T extends VoiceLike>(voices: T[], lang: string, male = false): T | null {
  let best: T | null = null
  let top = -999
  for (const v of voices) {
    const s = voiceScore(v, lang, male)
    if (s > top) {
      top = s
      best = v
    }
  }
  return best
}
