/*
  Highlights and margin notes in the notes reader (server: the highlights
  routes in src/routes/gate-notes.js). Signed-in members only; they live on
  the account so they follow you to every device.
*/
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink'
export const HIGHLIGHT_COLORS: { id: HighlightColor; label: string }[] = [
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'pink', label: 'Pink' },
]

export interface Highlight {
  id: string
  subject: string
  lesson: string
  block: string
  quote: string
  prefix: string
  suffix: string
  color: HighlightColor
  note: string
  createdAt: number
  updatedAt: number
  subjectTitle?: string
  lessonTitle?: string
}

const EMPTY: Highlight[] = []
const enc = encodeURIComponent
const BASE = '/api/gate/me/highlights'

export const highlightsApi = {
  list: (subject?: string, lesson?: string) =>
    api.get<{ ok: true; highlights: Highlight[] }>(BASE, { query: { subject, lesson } }).then((r) => r.highlights),
  create: (subject: string, lesson: string, h: Pick<Highlight, 'quote' | 'prefix' | 'suffix' | 'block' | 'color'> & { note?: string }) =>
    api.post<{ ok: true; highlight: Highlight }>(`${BASE}/${enc(subject)}/${enc(lesson)}`, h).then((r) => r.highlight),
  update: (id: string, patch: Partial<Pick<Highlight, 'color' | 'note'>>) =>
    api.patch<{ ok: true; highlight: Highlight }>(`${BASE}/${enc(id)}`, patch).then((r) => r.highlight),
  remove: (id: string) => api.delete<{ ok: true }>(`${BASE}/${enc(id)}`),
}

/** One lesson's highlights, with create / update / remove that update the list at once. */
export function useLessonHighlights(subject: string, lesson: string, enabled: boolean) {
  const key = `${subject}/${lesson}`
  // The list belongs to one lesson; a list kept for another lesson reads as empty.
  const [state, setState] = useState<{ key: string; list: Highlight[] }>({ key: '', list: [] })
  const [error, setError] = useState<string | null>(null)
  const list = state.key === key ? state.list : EMPTY
  const setList = useCallback((fn: (cur: Highlight[]) => Highlight[]) => setState((s) => ({ key, list: fn(s.key === key ? s.list : []) })), [key])

  useEffect(() => {
    if (!enabled) return
    let live = true
    highlightsApi
      .list(subject, lesson)
      .then((h) => live && setState({ key: `${subject}/${lesson}`, list: h }))
      .catch(() => live && setError('Your highlights could not be loaded.'))
    return () => {
      live = false
    }
  }, [subject, lesson, enabled])

  const create = useCallback(
    async (h: Parameters<typeof highlightsApi.create>[2]) => {
      const made = await highlightsApi.create(subject, lesson, h)
      setList((cur) => [made, ...cur])
      return made
    },
    [subject, lesson, setList],
  )
  const update = useCallback(
    async (id: string, patch: Parameters<typeof highlightsApi.update>[1]) => {
      const next = await highlightsApi.update(id, patch)
      setList((cur) => cur.map((x) => (x.id === id ? { ...x, ...next } : x)))
    },
    [setList],
  )
  const remove = useCallback(
    async (id: string) => {
      await highlightsApi.remove(id)
      setList((cur) => cur.filter((x) => x.id !== id))
    },
    [setList],
  )

  return { list, error, create, update, remove }
}
