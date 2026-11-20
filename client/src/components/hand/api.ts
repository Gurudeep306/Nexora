/*
  Handwritten solutions (server: src/routes/hand.js). A solution is one or
  more images (pages from the writing pad, or photos) attached to a question.
*/
import { api } from '@/lib/api'

export type HandKind = 'gate'
export type HandMode = 'pad' | 'photo'
export type Visibility = 'private' | 'public'

export interface HandSolution {
  id: string
  kind: HandKind
  target: string
  source: 'pad' | 'photo' | 'upload'
  images: string[]
  note: string
  visibility: Visibility
  createdAt: number
  mine: boolean
  author?: { username: string; displayName: string | null; avatar: string | null; avatarUrl: string | null }
  votes: number
  voted: boolean
  /** The question's title (only in the list of all of mine). */
  title?: string
}

export interface DeviceQuestion {
  text: string
  type: string
  marks: number
  options: { l: string; t: string }[]
  figures: { src: string; alt: string }[]
}

export interface DeviceInfo {
  mode: HandMode
  title: string
  name: string
  expiresAt: number
  question?: DeviceQuestion
}

const enc = encodeURIComponent

export const handApi = {
  list: (kind: HandKind, target: string) => api.get<{ ok: true; mine: HandSolution[]; community: HandSolution[] }>('/api/hand/solutions', { query: { kind, target } }),
  link: (kind: HandKind, target: string, mode: HandMode) => api.post<{ ok: true; token: string; path: string; expiresAt: number }>('/api/hand/links', { kind, target, mode }),
  watch: (token: string) =>
    api.get<{ ok: true; state: 'waiting' | 'opened' | 'sent' | 'expired'; solutionId: string | null; expiresAt: number; previewAt: number }>(`/api/hand/links/${enc(token)}`),
  preview: (token: string) => api.get<{ ok: true; image: string | null; at: number }>(`/api/hand/links/${enc(token)}/preview`),
  mine: () => api.get<{ ok: true; solutions: HandSolution[] }>('/api/hand/mine').then((r) => r.solutions),
  vote: (id: string, on: boolean) => (on ? api.put : api.delete)<{ ok: true; votes: number; voted: boolean }>(`/api/hand/solutions/${enc(id)}/vote`),
  upload: (kind: HandKind, target: string, images: string[]) => api.post<{ ok: true; solution: HandSolution }>('/api/hand/solutions', { kind, target, images }),
  update: (id: string, patch: { visibility?: Visibility; note?: string }) => api.patch<{ ok: true; solution: HandSolution }>(`/api/hand/solutions/${enc(id)}`, patch),
  remove: (id: string) => api.delete<{ ok: true }>(`/api/hand/solutions/${enc(id)}`),
  device: (token: string) => api.get<{ ok: true } & DeviceInfo>(`/api/hand/device/${enc(token)}`),
  send: (token: string, images: string[], note?: string) => api.post<{ ok: true; id: string }>(`/api/hand/device/${enc(token)}`, { images, note }),
  sendPreview: (token: string, image: string) => api.put<{ ok: true }>(`/api/hand/device/${enc(token)}/preview`, { image }),
}

/**
 * A photo, shrunk on the device before it is sent: at most `max` pixels on the
 * long side, JPEG. A phone photo of 4–12 MB becomes a few hundred KB, which
 * uploads fast on mobile data and stays sharp enough to read handwriting.
 */
export async function shrinkPhoto(file: Blob, { max = 2200, quality = 0.86, turns = 0 }: { max?: number; quality?: number; turns?: number } = {}): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions).catch(() => null)
  const src: CanvasImageSource & { width: number; height: number } = bitmap ?? (await loadImage(file))
  const scale = Math.min(1, max / Math.max(src.width, src.height))
  const w = Math.round(src.width * scale)
  const h = Math.round(src.height * scale)
  const quarter = ((turns % 4) + 4) % 4
  const canvas = document.createElement('canvas')
  canvas.width = quarter % 2 ? h : w
  canvas.height = quarter % 2 ? w : h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((quarter * Math.PI) / 2)
  ctx.drawImage(src, -w / 2, -h / 2, w, h)
  bitmap?.close()
  return canvas.toDataURL('image/jpeg', quality)
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file is not an image we can read.'))
    }
    img.src = url
  })
}
