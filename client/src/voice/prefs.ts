/*
  Voice preferences and consent. Kept in this browser and on the account
  (settings key 'voice_prefs'), so a student is asked only once.

  Nothing here records audio. The corpus opt-in only remembers the student's
  choice for Bharat Code Speech (docs/voice/BLUEPRINT.md §2), which collects
  recordings in a later phase and asks again before it does.
*/
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { api } from '@/lib/api'
import { voiceById } from './voices'
import { cleanName, OLD_NAMES, RENAMED, setTeacherNames, TEACHERS, type TeacherId } from './teacher/teachers'
export type { TeacherId }

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
  /** The on-device voice the student chose (ids in voices.ts; '' = the clearest for the teacher). */
  kokoroVoice: string
  /** Guru answers on this device when it can (the student agreed to the download; Settings → Voice). */
  brain: boolean
  /** The virtual teacher on screen ('' = off, the default; ids in teacher/teachers.ts). */
  teacher: TeacherId | ''
  /** How big the teacher is drawn. */
  teacherSize: TeacherSize
  /** The names the student gave each teacher (teachers have no names of their own). */
  teacherNames: Partial<Record<TeacherId, string>>
}

export type TeacherSize = 's' | 'm' | 'l'
const TEACHER_IDS: readonly string[] = TEACHERS.map((t) => t.id)

export const DEFAULT_PREFS: VoicePrefs = { v: 1, consent: false, lang: 'en-IN', corpus: false, adultOrGuardian: false, speak: true, engine: 'auto', voice: '', kokoro: false, kokoroVoice: '', brain: false, teacher: '', teacherSize: 'm', teacherNames: {} }
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
    kokoroVoice: typeof r.kokoroVoice === 'string' && voiceById(r.kokoroVoice) ? r.kokoroVoice : '',
    brain: r.brain === true,
    teacher: teacherPref(r.teacher),
    teacherSize: r.teacherSize === 's' || r.teacherSize === 'l' ? r.teacherSize : 'm',
    teacherNames: teacherNames(r),
  }
}

/** The names the student gave; someone who chose a teacher before naming existed keeps the name that teacher had. */
function teacherNames(r: Record<string, unknown>): Partial<Record<TeacherId, string>> {
  const out: Partial<Record<TeacherId, string>> = {}
  const raw = r.teacherNames && typeof r.teacherNames === 'object' ? (r.teacherNames as Record<string, unknown>) : null
  if (raw) {
    for (const id of TEACHER_IDS) {
      const n = cleanName(raw[id])
      if (n) out[id as TeacherId] = n
    }
    return out
  }
  const before = teacherPref(r.teacher)
  if (before) out[before] = OLD_NAMES[before]
  return out
}

/** A saved teacher, moved to who replaced them if they were retired. */
function teacherPref(v: unknown): TeacherId | '' {
  if (typeof v !== 'string') return ''
  if (TEACHER_IDS.includes(v)) return v as TeacherId
  return RENAMED[v] ?? ''
}

let current: VoicePrefs = (() => {
  try {
    return sanitize(JSON.parse(localStorage.getItem(LOCAL) ?? 'null'))
  } catch {
    return DEFAULT_PREFS
  }
})()
setTeacherNames(current.teacherNames)
const listeners = new Set<() => void>()

function publish(next: VoicePrefs) {
  current = next
  setTeacherNames(next.teacherNames)
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
