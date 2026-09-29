import { useEffect, useSyncExternalStore } from 'react'
import { api } from '@/lib/api'

/**
 * Learn progress, shared by every component on the page: one fetch, then
 * optimistic updates. Items are namespaced: `q:<question>`, `code:<slug>`,
 * `page:<topic>/<page>`.
 */
export type ItemStatus = 'correct' | 'wrong' | 'solved' | 'attempted' | 'read'
export interface ItemState {
  status: ItemStatus
  attempts: number
}

let items: Record<string, ItemState> = {}
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function load() {
  if (loading) return loading
  loading = api
    .get<{ items: Record<string, ItemState> }>('/api/learn/progress')
    .then((r) => {
      items = { ...r.items, ...items }
      loaded = true
      emit()
    })
    .catch(() => {
      loaded = true
      emit()
    })
  return loading
}

const DONE: ItemStatus[] = ['correct', 'solved', 'read']
export const isDone = (s?: ItemState) => !!s && DONE.includes(s.status)

export function mark(item: string, status: ItemStatus) {
  const prev = items[item]
  const keep = prev && isDone(prev)
  items = { ...items, [item]: { status: keep ? prev.status : status, attempts: (prev?.attempts ?? 0) + (status === 'read' ? 0 : 1) } }
  emit()
  void api.post('/api/learn/progress', { item, status }).catch(() => {})
}

export function useProgress() {
  useEffect(() => {
    void load()
  }, [])
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => items,
  )
  return { items: snap, loaded }
}

export const qKey = (id: string) => `q:${id}`
export const codeKey = (slug: string) => `code:${slug}`
export const pageKey = (topic: string, page: string) => `page:${topic}/${page}`
