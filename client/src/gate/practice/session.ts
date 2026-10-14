import { useCallback, useEffect, useState } from 'react'
import type { AttemptEvent } from '../QuestionView'

/* This sitting's practice events (kept for the tab's lifetime). */

const KEY = 'nexora:gate-session:v1'
export type SessionEvent = AttemptEvent & { at: number; label?: string }

function read(): SessionEvent[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function usePracticeSession() {
  const [events, setEvents] = useState<SessionEvent[]>(read)
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(events.slice(-300)))
    } catch {
      /* ignore */
    }
  }, [events])
  const add = useCallback((e: AttemptEvent, label?: string) => setEvents((prev) => [...prev, { ...e, at: Date.now(), label }]), [])
  const reset = useCallback(() => setEvents([]), [])
  return { events, add, reset }
}

export function sessionStats(events: SessionEvent[]) {
  // The latest event per question counts.
  const last = new Map<string, SessionEvent>()
  for (const e of events) last.set(e.questionId, e)
  const list = [...last.values()]
  const graded = list.filter((e) => e.outcome === 'correct' || e.outcome === 'wrong')
  const correct = graded.filter((e) => e.outcome === 'correct').length
  const time = list.reduce((a, b) => a + b.timeMs, 0)
  return {
    list,
    answered: graded.length,
    correct,
    accuracy: graded.length ? correct / graded.length : null,
    timeMs: time,
    avgMs: list.length ? time / list.length : null,
    wrongIds: list.filter((e) => e.outcome !== 'correct').map((e) => e.questionId),
  }
}

