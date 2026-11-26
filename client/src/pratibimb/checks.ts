/*
  Quick photo checks in the browser, so a person hears at once what to fix (the build machine runs the
  full checks: face points, head turn, covers, light evenness). Nothing here leaves the device.
*/
export interface PhotoCheck {
  ok: boolean
  /** plain reasons, empty when fine */
  notes: string[]
  width: number
  height: number
}

export async function checkPhoto(file: Blob): Promise<PhotoCheck> {
  const bmp = await createImageBitmap(file)
  const notes: string[] = []
  const { width, height } = bmp
  if (Math.min(width, height) < 600) notes.push('Low resolution — use the phone camera at full size.')
  // Downscale for the light and sharpness measurements.
  const s = 256 / Math.max(width, height)
  const w = Math.max(16, Math.round(width * s))
  const h = Math.max(16, Math.round(height * s))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const d = g.getImageData(0, 0, w, h).data
  const lum = new Float32Array(w * h)
  let sum = 0
  for (let i = 0; i < w * h; i++) {
    lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
    sum += lum[i]
  }
  const mean = sum / (w * h)
  if (mean < 55) notes.push('Too dark — face a window or a light.')
  if (mean > 225) notes.push('Too bright — move out of direct sun.')
  // Sharpness: variance of a simple Laplacian.
  let lap = 0
  let lap2 = 0
  let n = 0
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const v = 4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w]
      lap += v
      lap2 += v * v
      n++
    }
  const variance = lap2 / n - (lap / n) ** 2
  if (variance < 60) notes.push('Looks blurry — hold the phone still, tap to focus.')
  return { ok: notes.length === 0, notes, width, height }
}
