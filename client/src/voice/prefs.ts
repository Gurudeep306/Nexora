/*
  Voice preferences and consent. Kept in this browser and on the account
  (settings key 'voice_prefs'), so a student is asked only once.

  Nothing here records audio. The corpus opt-in only remembers the student's
  choice for Bharat Code Speech (docs/voice/BLUEPRINT.md §2), which collects
  recordings in a later phase and asks again before it does.
*/
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { api } from '@/lib/api'

export type VoiceLang = 'en-IN' | 'hi-IN'
/** Which voice reads answers: the best available, a natural Indian voice (server), Kokoro on this device, or the device's own. */
export type VoiceEngine = 'auto' | 'natural' | 'kokoro' | 'device'

export interface VoicePrefs {
  v: 1
  /** The student read the explanation and turned voice on. */
  consent: boolean
  consentAt?: string
  /** Recognition language: Indian English (and Hinglish in Roman) or Hindi. */
  lang: VoiceLang
  /** Opted in to help build Bharat Code Speech (no recordings are kept yet). */
  corpus: boolean
  /** Confirmed 18+ or a parent's/guardian's permission (needed for the corpus). */
  adultOrGuardian: boolean
  /** Read answers aloud. */
  speak: boolean
  /** Which voice reads answers (S8). */
  engine: VoiceEngine
  /** The natural voice's name, e.g. en-IN-NeerjaNeural ('' = the default for the language). */
  voice: string
  /** Agreed to download Kokoro (a large one-time download) on this device. */
  kokoro: boolean
  /** The virtual teacher on screen ('' = off, the default; ids in teacher/teachers.ts). */
  teacher: TeacherId | ''
  /** How big the teacher is drawn. */
  teacherSize: TeacherSize
}

export type TeacherId = 'maya' | 'elena' | 'kai' | 'victor'
export type TeacherSize = 's' | 'm' | 'l'
const TEACHER_IDS: readonly string[] = ['maya', 'elena', 'kai', 'victor']

export const DEFAULT_PREFS: VoicePrefs = { v: 1, consent: false, lang: 'en-IN', corpus: false, adultOrGuardian: false, speak: true, engine: 'auto', voice: '', kokoro: false, teacher: '', teacherSize: 'm' }
const LOCAL = 'nexora:voice'
const KEY = 'voice_prefs'

function sanitize(raw: unknown): VoicePrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const adultOrGuardian = r.adultOrGuardian === true
  return {
    v: 1,
    consent: r.consent === true,
    consentAt: typeof r.consentAt === 'string' ? r.consentAt.slice(0, 40) : undefined,
    lang: r.lang === 'hi-IN' ? 'hi-IN' : 'en-IN',
    // The corpus opt-in never stands without the age/guardian confirmation.
    corpus: r.corpus === true && adultOrGuardian,
    adultOrGuardian,
    speak: r.speak !== false,
    engine: r.engine === 'natural' || r.engine === 'kokoro' || r.engine === 'device' ? r.engine : 'auto',
    voice: typeof r.voice === 'string' && /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/.test(r.voice) ? r.voice : '',
    kokoro: r.kokoro === true,
    teacher: typeof r.teacher === 'string' && TEACHER_IDS.includes(r.teacher) ? (r.teacher as TeacherId) : '',
    teacherSize: r.teacherSize === 's' || r.teacherSize === 'l' ? r.teacherSize : 'm',
  }
}

let current: VoicePrefs = (() => {
  try {
    return sanitize(JSON.parse(localStorage.getItem(LOCAL) ?? 'null'))
  } catch {
    return DEFAULT_PREFS
  }
})()
const listeners = new Set<() => void>()

function publish(next: VoicePrefs) {
  current = next
  try {
    localStorage.setItem(LOCAL, JSON.stringify(next))
  } catch {
    /* private mode: the in-memory copy still applies */
  }
  for (const l of listeners) l()
}

export function getVoicePrefs(): VoicePrefs {
  return current
}

export function setVoicePrefs(patch: Partial<VoicePrefs>, sync = true) {
  const next = sanitize({ ...current, ...patch })
  publish(next)
  if (sync) api.post('/api/settings', { [KEY]: JSON.stringify(next) }).catch(() => {})
}

/** The prefs, kept in step with the account once per signed-in user. */
export function useVoicePrefs(username: string | null | undefined) {
  const prefs = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => current,
    () => current,
  )
  useEffect(() => {
    if (!username) return
    let cancelled = false
    api
      .get<{ settings?: Record<string, string> }>('/api/settings')
      .then((r) => {
        if (cancelled) return
        const raw = r.settings?.[KEY]
        if (raw) {
          try {
            publish(sanitize(JSON.parse(raw)))
          } catch {
            /* unreadable: keep the local copy */
          }
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [username])
  const update = useCallback((patch: Partial<VoicePrefs>) => setVoicePrefs(patch), [])
  return [prefs, update] as const
}
