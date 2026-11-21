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
}

export const DEFAULT_PREFS: VoicePrefs = { v: 1, consent: false, lang: 'en-IN', corpus: false, adultOrGuardian: false }
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
