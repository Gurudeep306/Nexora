import { useEffect, useState } from 'react'
import { findTopic } from '../content/dsa/syllabus'
import type { Topic } from '../types'

const cache = new Map<string, Topic>()

/** Loads a topic's content chunk (pages, questions) on demand. */
export function useTopic(id: string | undefined) {
  const entry = id ? findTopic(id) : undefined
  const [topic, setTopic] = useState<Topic | null>(() => (id ? cache.get(id) ?? null : null))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!entry?.load || cache.has(entry.id)) return
    let live = true
    entry
      .load()
      .then((t) => {
        cache.set(entry.id, t)
        if (live) setTopic(t)
      })
      .catch(() => live && setError('Could not load this topic.'))
    return () => {
      live = false
    }
  }, [entry])
  return { entry, topic: topic ?? (id ? cache.get(id) ?? null : null), error }
}
