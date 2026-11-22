/*
  The mic's live sound, for the listening animation only (InkWave.tsx).
  One analyser per listening turn, opened when the pill opens and closed when
  it shuts. Nothing is recorded or sent from here.
*/
let ctx: AudioContext | null = null
let stream: MediaStream | null = null
let analyser: AnalyserNode | null = null
let users = 0

export async function openLevel(): Promise<boolean> {
  users++
  if (analyser) return true
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return false
    ctx = new Ctx()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.6
    ctx.createMediaStreamSource(stream).connect(analyser)
    return true
  } catch {
    closeLevel()
    return false
  }
}

export function closeLevel() {
  users = Math.max(0, users - 1)
  if (users > 0) return
  stream?.getTracks().forEach((t) => t.stop())
  void ctx?.close().catch(() => {})
  ctx = null
  stream = null
  analyser = null
}

const buf = new Float32Array(1024)
/** The latest waveform (−1…1) and its loudness (0…1, eased for the eye). */
export function readLevel(): { wave: Float32Array; level: number } | null {
  if (!analyser) return null
  analyser.getFloatTimeDomainData(buf)
  let s = 0
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
  const rms = Math.sqrt(s / buf.length)
  // Speech sits around 0.02–0.2 RMS; map it to 0–1 on a gentle curve.
  return { wave: buf, level: Math.min(1, Math.sqrt(rms / 0.18)) }
}
