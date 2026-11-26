/* Pratibimb's server calls (src/routes/pratibimb.js). Every file stays private to its owner. */
import { apiUrl } from '@/lib/api'

export interface Model {
  id: string
  status: 'draft' | 'queued' | 'building' | 'done' | 'failed'
  stage: string | null
  note: string | null
  likeness: number | null
  options: { body?: string; heightCm?: number | null; style?: string; outfit?: string }
  createdAt: number
  updatedAt: number
  photos: string[]
  voices: string[]
  consentVideo: boolean
  hasModel: boolean
  report: { stages: Record<string, string | null> } | null
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
export const createModel = (sentence: string) =>
  call<{ model: Model }>('POST', '/api/pratibimb/models', { consent: { adult: true, ownFace: true, understood: true, sentence } }).then((r) => r.model)
export const uploadFile = (id: string, kind: 'photo' | 'voice' | 'consent', blob: Blob) =>
  call<{ name: string }>('PUT', `/api/pratibimb/models/${id}/files/${kind}`, blob, blob.type.split(';')[0]).then((r) => r.name)
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
