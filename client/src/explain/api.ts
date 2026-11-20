/*
  Video explanations (server: src/routes/explain.js). A member records a video
  on a GATE question, a notes lesson, a DSA lesson or one part (subtopic) of
  a lesson ("<lesson>#<heading id>"); others watch it, mark it helpful and
  learn from it. Trimming and chapters are stored as numbers and the player
  honours them, so a video is never re-encoded.
*/
import { api, API_BASE } from '@/lib/api'

export type ExplainKind = 'gate' | 'lesson' | 'learn'
export type Source = 'camera' | 'screen' | 'screen+camera' | 'board' | 'upload'
export type Chapter = { at: number; title: string }

export interface ExplainVideo {
  id: string
  kind: ExplainKind
  target: string
  title: string
  note: string
  source: Source
  durationMs: number
  trimStartMs: number
  trimEndMs: number | null
  chapters: Chapter[]
  src: string
  poster: string | null
  visibility: 'public' | 'private'
  status: 'ready' | 'hidden' | 'uploading'
  views: number
  createdAt: number
  mine: boolean
  votes: number
  voted: boolean
  author: { username: string; displayName: string | null; avatar: string | null; avatarUrl: string | null }
  about?: { title: string; link: string } | null
}

const enc = encodeURIComponent
export const mediaUrl = (path: string) => `${API_BASE || ''}${path}`

export const explainApi = {
  list: (kind: ExplainKind, target: string) => api.get<{ ok: true; videos: ExplainVideo[] }>('/api/explain/videos', { query: { kind, target } }).then((r) => r.videos),
  one: (id: string) => api.get<{ ok: true; video: ExplainVideo }>(`/api/explain/videos/${enc(id)}`).then((r) => r.video),
  mine: () => api.get<{ ok: true; used: number; limit: number; videos: ExplainVideo[] }>('/api/explain/mine'),
  update: (id: string, patch: Partial<Pick<ExplainVideo, 'title' | 'note' | 'visibility' | 'chapters' | 'trimStartMs' | 'trimEndMs'>>) =>
    api.patch<{ ok: true; video: ExplainVideo }>(`/api/explain/videos/${enc(id)}`, patch).then((r) => r.video),
  remove: (id: string) => api.delete<{ ok: true }>(`/api/explain/videos/${enc(id)}`),
  vote: (id: string, on: boolean) => (on ? api.put : api.delete)<{ ok: true; votes: number; voted: boolean }>(`/api/explain/videos/${enc(id)}/vote`),
  view: (id: string) => api.post<{ ok: true }>(`/api/explain/videos/${enc(id)}/view`).catch(() => null),
  report: (id: string, reason: string) => api.post<{ ok: true }>(`/api/explain/videos/${enc(id)}/report`, { reason }),
  /** Videos per part of a lesson: { '': whole lesson, '<heading id>': n }. */
  counts: (kind: ExplainKind, target: string) => api.get<{ ok: true; counts: Record<string, number> }>('/api/explain/counts', { query: { kind, target } }).then((r) => r.counts),
  /** A one-time link (QR) for recording on a tablet. */
  link: (kind: ExplainKind, target: string, about: string) => api.post<{ ok: true; token: string; path: string; expiresAt: number }>('/api/explain/links', { kind, target, about }),
  linkStatus: (token: string) => api.get<{ ok: true; opened: boolean; uploading: boolean; expiresAt: number; video: ExplainVideo | null }>(`/api/explain/links/${enc(token)}`),
  /** On the tablet (not signed in). */
  device: (token: string) => api.get<{ ok: true; about: string; name: string; maxMs: number; maxBytes: number; expiresAt: number }>(`/api/explain/device/${enc(token)}`),
}

export interface UploadMeta {
  kind: ExplainKind
  target: string
  title: string
  note: string
  source: Source
  durationMs: number
  trimStartMs: number
  trimEndMs: number | null
  chapters: Chapter[]
  visibility: 'public' | 'private'
  /** The lesson's name (kept for DSA lessons, whose content lives here). */
  about?: string
}

/**
 * Uploads a recording in pieces. A piece that fails is retried (with a pause
 * that grows); if the server says it already has more, the upload continues
 * from there. `onProgress` gets 0…1. Returns the published video.
 */
export async function uploadVideo(
  blob: Blob,
  meta: UploadMeta,
  poster: string | null,
  onProgress: (p: number) => void,
  signal?: AbortSignal,
  /** Where uploads go: signed in, or a tablet's link (`/api/explain/device/<token>/videos`). */
  base = '/api/explain/videos',
): Promise<ExplainVideo> {
  const start = await api.post<{ ok: true; id: string; piece: number }>(base, { ...meta, mime: blob.type || 'video/webm', size: blob.size })
  const piece = Math.min(start.piece, 4 * 1024 * 1024)
  let at = 0
  let tries = 0
  while (at < blob.size) {
    if (signal?.aborted) throw new Error('Upload cancelled.')
    const chunk = blob.slice(at, Math.min(blob.size, at + piece))
    try {
      const r = await fetch(mediaUrl(`${base}/${enc(start.id)}/data?at=${at}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: chunk,
        signal,
      })
      const j = (await r.json().catch(() => ({}))) as { have?: number; error?: string }
      if (r.status === 409 && typeof j.have === 'number') {
        at = j.have
      } else if (!r.ok) {
        throw new Error(j.error || `Upload failed (${r.status}).`)
      } else {
        at = j.have ?? at + chunk.size
        tries = 0
      }
      onProgress(at / blob.size)
    } catch (e) {
      if (signal?.aborted) throw new Error('Upload cancelled.')
      if (++tries > 6) throw e instanceof Error ? e : new Error('Upload failed.')
      await new Promise((res) => setTimeout(res, Math.min(15_000, 800 * 2 ** tries)))
    }
  }
  const done = await api.post<{ ok: true; video: ExplainVideo }>(`${base}/${enc(start.id)}/finish`, { poster })
  return done.video
}

export const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
