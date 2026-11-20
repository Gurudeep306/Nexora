/* A video file someone picked (an iPad screen recording, a phone video…): its length, checked before upload. */
import { MAX_MS } from './recorder'

const MAX_MB = 300
const TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export function readVideoFile(file: File): Promise<{ blob: Blob; url: string; durationMs: number }> {
  const type = file.type || (/\.mov$/i.test(file.name) ? 'video/quicktime' : /\.webm$/i.test(file.name) ? 'video/webm' : 'video/mp4')
  if (!TYPES.includes(type)) return Promise.reject(new Error('Pick an MP4, MOV or WebM video.'))
  if (file.size > MAX_MB * 1024 * 1024) return Promise.reject(new Error(`That video is ${Math.round(file.size / 1024 / 1024)} MB. Videos can be up to ${MAX_MB} MB.`))
  const blob = file.type === type ? file : new Blob([file], { type })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    const fail = (msg: string) => {
      URL.revokeObjectURL(url)
      reject(new Error(msg))
    }
    const t = window.setTimeout(() => fail('Could not read that video. Try another file.'), 15000)
    v.onloadedmetadata = () => {
      window.clearTimeout(t)
      const ms = Math.round(v.duration * 1000)
      if (!Number.isFinite(ms) || ms < 3000) return fail('That video is too short. Use one of at least a few seconds.')
      if (ms > MAX_MS + 30_000) return fail('Videos can be up to 20 minutes. Trim it on your device first.')
      resolve({ blob, url, durationMs: ms })
    }
    v.onerror = () => {
      window.clearTimeout(t)
      fail('This browser cannot play that video. MP4 (H.264) works everywhere.')
    }
    v.src = url
  })
}
