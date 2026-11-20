/*
  Sound levels from audio tracks: the mic meter before joining, "who is
  speaking" in direct rooms, and the "You're muted" hint when you talk with
  your mic off. One shared AudioContext; each meter reads a clone of the track,
  so muting the sent track does not silence the meter.
*/
let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

export class Meter {
  private an: AnalyserNode | null = null
  private src: MediaStreamAudioSourceNode | null = null
  private clone: MediaStreamTrack | null = null
  private buf: Float32Array<ArrayBuffer> | null = null

  constructor(track: MediaStreamTrack) {
    const ac = audio()
    if (!ac) return
    try {
      this.clone = track.clone()
      this.clone.enabled = true
      this.src = ac.createMediaStreamSource(new MediaStream([this.clone]))
      this.an = ac.createAnalyser()
      this.an.fftSize = 512
      this.an.smoothingTimeConstant = 0.6
      this.src.connect(this.an)
      this.buf = new Float32Array(new ArrayBuffer(this.an.fftSize * 4))
    } catch {
      this.an = null
    }
  }

  /** 0…1, roughly loudness. */
  level(): number {
    if (!this.an || !this.buf) return 0
    this.an.getFloatTimeDomainData(this.buf)
    let sum = 0
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i]
    const rms = Math.sqrt(sum / this.buf.length)
    return Math.min(1, rms * 6)
  }

  stop() {
    try {
      this.src?.disconnect()
    } catch {
      /* gone */
    }
    this.clone?.stop()
    this.an = null
  }
}
