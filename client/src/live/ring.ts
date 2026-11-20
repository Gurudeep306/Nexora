/*
  Call sounds, made in the browser (no audio files to download):
    ringtone()  for the person being called — two soft notes, repeating;
    ringback()  for the caller — a quiet "it's ringing" tone.
  Each returns a function that stops it. Browsers only play sound after the
  page has had a click; if they refuse, the call card still shows.
*/
function tones(pattern: { f: number[]; on: number; off: number; gain: number }) {
  let ac: AudioContext | null = null
  try {
    ac = new AudioContext()
  } catch {
    return () => {}
  }
  const ctx = ac
  let stopped = false
  const play = () => {
    if (stopped) return
    const t0 = ctx.currentTime + 0.02
    pattern.f.forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      const start = t0 + i * (pattern.on / pattern.f.length)
      const end = start + pattern.on / pattern.f.length
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(pattern.gain, start + 0.02)
      g.gain.setValueAtTime(pattern.gain, end - 0.05)
      g.gain.linearRampToValueAtTime(0, end)
      o.connect(g).connect(ctx.destination)
      o.start(start)
      o.stop(end + 0.02)
    })
  }
  play()
  const id = window.setInterval(play, (pattern.on + pattern.off) * 1000)
  return () => {
    stopped = true
    window.clearInterval(id)
    void ctx.close().catch(() => {})
  }
}

export const ringtone = () => tones({ f: [659.25, 880], on: 0.7, off: 1.6, gain: 0.08 })
export const ringback = () => tones({ f: [440, 480], on: 1.2, off: 2.8, gain: 0.03 })
