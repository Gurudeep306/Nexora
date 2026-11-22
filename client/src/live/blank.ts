/*
  Is a shared screen actually showing anything? A share can be "on" and still
  send a black picture: macOS without the Screen Recording permission, or a
  mirrored iPad, which recent macOS blacks out while anything records the
  screen. We look at a tiny copy of the picture now and then, locally (no
  frame leaves the device), and say so when it stays black.
*/

/** Mean brightness and spread of a frame, from a 32×18 copy. */
export function frameStats(data: Uint8ClampedArray) {
  let sum = 0
  let sq = 0
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    sum += y
    sq += y * y
  }
  const mean = sum / n
  return { mean, spread: Math.sqrt(Math.max(0, sq / n - mean * mean)) }
}

/** Black, or one flat colour with nothing on it. */
export const looksBlank = ({ mean, spread }: { mean: number; spread: number }) => (mean < 14 && spread < 6) || spread < 1.2

/**
 * Watch a local video track; call onBlank once when it has looked blank for
 * `needed` checks in a row, and onOk when it recovers. Returns a stop function.
 */
export function watchBlank(track: MediaStreamTrack, onBlank: () => void, onOk: () => void, { every = 1500, needed = 3 } = {}) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = new MediaStream([track])
  void video.play().catch(() => {})
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 18
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let run = 0
  let flagged = false
  const id = window.setInterval(() => {
    if (!ctx || track.readyState !== 'live' || !video.videoWidth) return
    ctx.drawImage(video, 0, 0, 32, 18)
    const blank = looksBlank(frameStats(ctx.getImageData(0, 0, 32, 18).data))
    run = blank ? run + 1 : 0
    if (run >= needed && !flagged) {
      flagged = true
      onBlank()
    } else if (!blank && flagged) {
      flagged = false
      onOk()
    }
  }, every)
  return () => {
    window.clearInterval(id)
    video.srcObject = null
  }
}
