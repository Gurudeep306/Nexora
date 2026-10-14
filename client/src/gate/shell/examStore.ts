/*
  The exam the student is preparing for (CSE or DA), remembered per user in
  this browser. Every GATE page reads it through useGateExam(); changing it in
  the shell's switcher re-renders every subscriber (and other tabs).
*/
import { useCallback, useSyncExternalStore } from 'react'
import { useAuth } from '@/context/AuthContext'

export type GateExam = 'CSE' | 'DA'
export const GATE_EXAMS: { id: GateExam; label: string; long: string }[] = [
  { id: 'CSE', label: 'CSE', long: 'Computer Science & IT' },
  { id: 'DA', label: 'DA', long: 'Data Science & AI' },
]

const PREFIX = 'nexora:gate-exam:'
const listeners = new Set<() => void>()
const memory = new Map<string, GateExam>()

function keyFor(user: string) {
  return `${PREFIX}${user || 'guest'}`
}

function read(user: string): GateExam {
  const key = keyFor(user)
  const mem = memory.get(key)
  if (mem) return mem
  try {
    const v = localStorage.getItem(key)
    if (v === 'CSE' || v === 'DA') return v
  } catch {
    /* blocked storage: fall back to the default */
  }
  return 'CSE'
}

function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) {
      memory.delete(e.key)
      l()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

/** [exam, setExam] for the signed-in user. */
export function useGateExam(): [GateExam, (e: GateExam) => void] {
  const { user } = useAuth()
  const name = user?.username ?? ''
  const exam = useSyncExternalStore(subscribe, () => read(name), () => 'CSE' as GateExam)
  const set = useCallback(
    (e: GateExam) => {
      const key = keyFor(name)
      memory.set(key, e)
      try {
        localStorage.setItem(key, e)
      } catch {
        /* keep the in-memory value */
      }
      listeners.forEach((l) => l())
    },
    [name],
  )
  return [exam, set]
}

/** Exam codes of the bank questions that belong to an exam (IT papers count as CSE). */
export function bankExams(exam: GateExam): string[] {
  return exam === 'DA' ? ['DA'] : ['CSE', 'IT']
}
