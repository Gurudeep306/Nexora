/*
  Photos from an uploaded video, by the same rules as the live guided scan: the video is stepped
  through on this device, every sampled frame is read (face points, angle, expression, light,
  sharpness), and for each pose the sharpest frame that passes all of that pose's checks is kept.
  Nothing is generated or changed; the photos are frames of the video itself.
*/
import { readImage } from './coach'
import { judge, SHOTS, type Baseline, type Shot, type ShotId } from './shots'

export interface Found {
  shot: Shot
  blob: Blob
  at: number
}

const seek = (v: HTMLVideoElement, t: number) =>
  new Promise<void>((res, rej) => {
    const ok = () => {
      v.removeEventListener('seeked', ok)
      res()
    }
    v.addEventListener('seeked', ok)
    v.addEventListener('error', () => rej(new Error('This video cannot be read here')), { once: true })
    v.currentTime = t
  })

async function toBlob(b: ImageBitmap) {
  const c = document.createElement('canvas')
  c.width = b.width
  c.height = b.height
  c.getContext('2d')!.drawImage(b, 0, 0)
  return new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('frame failed'))), 'image/jpeg', 0.93))
}

/** Picks the best frame for each pose. `onProgress` gets 0..1. Throws if the browser cannot decode the file. */
export async function photosFromVideo(file: Blob, base: Baseline, onProgress: (p: number) => void, signal?: AbortSignal): Promise<Found[]> {
  const url = URL.createObjectURL(file)
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.src = url
  try {
    await new Promise<void>((res, rej) => {
      v.onloadeddata = () => res()
      v.onerror = () => rej(new Error('This video format cannot be read in this browser. It is still saved and read on the build machine.'))
    })
    const dur = Number.isFinite(v.duration) ? v.duration : 0
    if (!dur) throw new Error('This video has no length')
    // About 4 frames a second, at most 600 frames (a long video is sampled more thinly).
    const n = Math.min(600, Math.max(8, Math.round(dur * 4)))
    const best = new Map<ShotId, { bmp: ImageBitmap; sharp: number; at: number }>()
    let tilt = base.tilt
    for (let i = 0; i < n; i++) {
      if (signal?.aborted) break
      const t = (dur * (i + 0.5)) / n
      await seek(v, t)
      const bmp = await createImageBitmap(v)
      const r = await readImage(bmp)
      let kept = false
      if (r && r.faces === 1) {
        const rr = { ...r, motion: 0 }
        for (const s of SHOTS) {
          const ok = judge(s, rr, { tilt }).every((c) => c.ok || c.label === 'Centred')
          const cur = best.get(s.id)
          if (ok && (!cur || r.sharp > cur.sharp)) {
            if (cur && ![...best.values()].some((x) => x !== cur && x.bmp === cur.bmp)) cur.bmp.close()
            best.set(s.id, { bmp, sharp: r.sharp, at: t })
            kept = true
            if (s.id === 'front') tilt = r.tilt
          }
        }
      }
      if (!kept) bmp.close()
      onProgress((i + 1) / n)
    }
    const out: Found[] = []
    const seen = new Set<ImageBitmap>()
    for (const s of SHOTS) {
      const b = best.get(s.id)
      if (!b) continue
      out.push({ shot: s, blob: await toBlob(b.bmp), at: b.at })
      seen.add(b.bmp)
    }
    seen.forEach((b) => b.close())
    return out
  } finally {
    URL.revokeObjectURL(url)
    v.removeAttribute('src')
    v.load()
  }
}
