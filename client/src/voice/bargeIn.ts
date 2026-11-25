/*
  Interrupting the teacher, as in a real conversation: while she speaks in
  conversation mode, the microphone listens for the student's voice; when the
  student starts talking, she stops and listens.

  - The browser's echo cancellation removes her own voice from the mic.
  - The level must rise well above what the mic hears while she talks (measured
    in the first moments) and stay up for about a third of a second, so a cough
    or a click doesn't stop her.
  - If it fires twice and the student then says nothing, it was her own voice
    or the room: it turns itself off for the rest of the session.
  Nothing is recorded or sent anywhere: only the loudness is read.
*/

const FRAME_MS = 50
const CALIBRATE_MS = 500
const SUSTAIN_FRAMES = 7 // 350 ms of voice
const MIN_LEVEL = 0.03

let falseAlarms = 0
let disabled = false

/** The student answered after an interruption (or didn't): teaches it whether to keep listening. */
export function bargeInResult(heardSomething: boolean) {
  if (heardSomething) falseAlarms = 0
  else if (++falseAlarms >= 2) disabled = true
}
export const bargeInOn = () => !disabled

/** The decision, pure: is this frame part of the student speaking? (tests/voice-teacher.test.js) */
export function isVoice(level: number, floor: number): boolean {
  return level > Math.max(MIN_LEVEL, floor * 3.5)
}

/**
 * Listen for the student's voice; call `onVoice` once when they start talking.
 * Returns a stop function. Does nothing (and returns a no-op) where the mic
 * can't be opened or interruption has turned itself off.
 */
export function listenForInterruption(onVoice: () => void): () => void {
  if (disabled || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return () => {}
  let stopped = false
  let stream: MediaStream | null = null
  let ctx: AudioContext | null = null
  let timer = 0
  const stop = () => {
    stopped = true
    window.clearInterval(timer)
    stream?.getTracks().forEach((t) => t.stop())
    void ctx?.close().catch(() => {})
  }
  void navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
    .then((s) => {
      if (stopped) return s.getTracks().forEach((t) => t.stop())
      stream = s
      ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(s)
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      src.connect(an)
      const buf = new Float32Array(an.fftSize)
      const started = Date.now()
      let floor = 0
      let samples = 0
      let run = 0
      timer = window.setInterval(() => {
        an.getFloatTimeDomainData(buf)
        let sum = 0
        for (const v of buf) sum += v * v
        const level = Math.sqrt(sum / buf.length)
        if (Date.now() - started < CALIBRATE_MS) {
          floor = (floor * samples + level) / ++samples
          return
        }
        run = isVoice(level, floor) ? run + 1 : 0
        if (run >= SUSTAIN_FRAMES) {
          stop()
          onVoice()
        }
      }, FRAME_MS)
    })
    .catch(() => {})
  return stop
}
