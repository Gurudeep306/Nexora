/* Pratibimb's server calls (src/routes/pratibimb.js). Every file stays private to its owner. */
import { apiUrl } from '@/lib/api'

export interface Model {
  id: string
  status: 'draft' | 'queued' | 'building' | 'done' | 'failed'
  stage: string | null
  note: string | null
  likeness: number | null
  options: { body?: string; heightCm?: number | null; style?: string; outfit?: string }
  /** whose model: yours, or someone you know who agreed */
  subject?: { kind: 'self' | 'other'; name: string }
  createdAt: number
  updatedAt: number
  photos: string[]
  voices: string[]
  videos: string[]
  /** photo file name → the shot it was taken for */
  shots: Record<string, string>
  consentVideo: boolean
  hasModel: boolean
  report: { stages: Record<string, { note: string | null; seconds: number | null }> } | null
}

export class PratibimbError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function call<T>(method: string, path: string, body?: unknown, type?: string): Promise<T> {
  const raw = body instanceof Blob
  const r = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'Content-Type': raw ? type || (body as Blob).type || 'application/octet-stream' : 'application/json' },
    body: body === undefined ? undefined : raw ? (body as Blob) : JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.ok === false) throw new PratibimbError(r.status, j.error || 'Something went wrong')
  return j as T
}

export const listModels = () => call<{ models: Model[] }>('GET', '/api/pratibimb/models').then((r) => r.models)
export const getModel = (id: string) => call<{ model: Model }>('GET', `/api/pratibimb/models/${id}`).then((r) => r.model)
export type Consent =
  | { subject: 'self'; adult: true; ownFace: true; understood: true; sentence: string }
  | { subject: 'other'; name: string; adult: true; permission: true; understood: true; sentence: string }
export const createModel = (consent: Consent) => call<{ model: Model }>('POST', '/api/pratibimb/models', { consent }).then((r) => r.model)
export type FileKind = 'photo' | 'voice' | 'consent' | 'video'
const q = (shot?: string) => (shot ? `?shot=${encodeURIComponent(shot)}` : '')
export const uploadFile = (id: string, kind: FileKind, blob: Blob, shot?: string) =>
  call<{ name: string }>('PUT', `/api/pratibimb/models/${id}/files/${kind}${q(shot)}`, blob, blob.type.split(';')[0]).then((r) => r.name)
/** A one-time link for a phone (2 hours, photos and video only). */
export const createLink = (id: string) => call<{ token: string; path: string; expiresAt: number }>('POST', `/api/pratibimb/models/${id}/link`)

/** The phone side of a link: not signed in, the token is the key. */
export interface DeviceModel {
  photos: number
  shots: Record<string, string>
  videos: number
  status: Model['status']
}
export const deviceModel = (token: string) => call<{ model: DeviceModel }>('GET', `/api/pratibimb/device/${token}`).then((r) => r.model)
export const deviceUpload = (token: string, kind: 'photo' | 'video', blob: Blob, shot?: string) =>
  call<{ name: string }>('PUT', `/api/pratibimb/device/${token}/files/${kind}${q(shot)}`, blob, blob.type.split(';')[0]).then((r) => r.name)
export const removeFile = (id: string, name: string) => call('DELETE', `/api/pratibimb/models/${id}/files/${name}`)
export const buildModel = (id: string, options: Model['options']) => call<{ model: Model }>('POST', `/api/pratibimb/models/${id}/build`, options).then((r) => r.model)
export const deleteModel = (id: string) => call('DELETE', `/api/pratibimb/models/${id}`)
export const modelUrl = (id: string) => apiUrl(`/api/pratibimb/models/${id}/model.vrm`)

/** A voice line from the site's voice service (src/voice/tts.js): audio plus the sound timings for the lips. */
export async function speakLine(text: string, lang: 'en-IN' | 'hi-IN' = 'en-IN') {
  const r = await fetch(apiUrl('/api/voice/tts'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.ok) throw new PratibimbError(r.status, 'The voice service is not available right now.')
  const bytes = Uint8Array.from(atob(j.audio), (c) => c.charCodeAt(0))
  const t = j.timing || {}
  return {
    audio: bytes.buffer as ArrayBuffer,
    timing: t.visemes ? { visemes: t.visemes as string[], vtimes: t.vtimes as number[], vdurations: t.vdurations as number[] } : null,
    words: t.words ? { words: t.words as string[], wtimes: (t.wtimes || []) as number[] } : null,
  }
}
