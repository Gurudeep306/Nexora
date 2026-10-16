/*
  GATE Notes client API (server: src/routes/gate-notes.js) and routes.
  Reading is public to signed-in members; the demo subject is staff-only.
*/
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import type { LessonPayload, LessonProgress, NotesColor, NotesSubject, SearchResult, SubjectTree } from './types'

export const NOTES_ROUTES = {
  all: '/gate/notes',
  fonts: '/gate/notes/_fonts',
  subject: (s: string) => `/gate/notes/${encodeURIComponent(s)}`,
  lesson: (s: string, l: string) => `/gate/notes/${encodeURIComponent(s)}/${encodeURIComponent(l)}`,
} as const

const enc = encodeURIComponent

export const notesApi = {
  subjects: () => api.get<{ ok: true; subjects: NotesSubject[] }>('/api/gate/notes').then((r) => r.subjects),
  tree: (subject: string) => api.get<{ ok: true } & SubjectTree>(`/api/gate/notes/${enc(subject)}`),
  lesson: (subject: string, lesson: string) => api.get<{ ok: true } & LessonPayload>(`/api/gate/notes/${enc(subject)}/${enc(lesson)}`),
  search: (q: string) => api.get<{ ok: true; results: SearchResult[] }>('/api/gate/notes/search', { query: { q } }).then((r) => r.results),
  progress: (subject?: string) =>
    api.get<{ ok: true; progress: Record<string, LessonProgress> }>('/api/gate/me/notes-progress', { query: { subject } }).then((r) => r.progress),
  saveProgress: (subject: string, lesson: string, patch: Partial<Pick<LessonProgress, 'completed' | 'scrollPct' | 'bookmarked'>>, keepalive = false) =>
    api.put<{ ok: true }>(`/api/gate/me/notes-progress/${enc(subject)}/${enc(lesson)}`, patch, keepalive ? { keepalive: true } : undefined),
}

export const useNotesSubjects = () => useApi(notesApi.subjects, [], { cacheKey: 'gate:notes:subjects' })
export const useSubjectTree = (subject: string) => useApi(() => notesApi.tree(subject), [subject], { cacheKey: `gate:notes:tree:${subject}` })
export const useLesson = (subject: string, lesson: string) =>
  useApi(() => notesApi.lesson(subject, lesson), [subject, lesson], { cacheKey: `gate:notes:lesson:${subject}/${lesson}` })

/** A subject's accent, as a theme colour role (AA on the page in every palette: see notes.css). */
export const SUBJECT_COLOR_VAR: Record<NotesColor, string> = {
  accent: 'var(--color-accent-brand)',
  info: 'var(--color-state-info)',
  success: 'var(--color-state-success)',
  warning: 'var(--color-state-warning)',
  danger: 'var(--color-state-error)',
  'syntax-keyword': 'var(--color-syntax-keyword)',
  'syntax-function': 'var(--color-syntax-function)',
  'syntax-type': 'var(--color-syntax-type)',
  'syntax-string': 'var(--color-syntax-string)',
  'syntax-number': 'var(--color-syntax-number)',
}

/** Style that sets --notes-subject for a subtree. */
export const subjectStyle = (color: NotesColor | undefined) =>
  ({ '--notes-subject': SUBJECT_COLOR_VAR[color ?? 'accent'] ?? SUBJECT_COLOR_VAR.accent }) as React.CSSProperties

export const DIFFICULTY_LABEL = { basic: 'Basic', core: 'Core', advanced: 'Advanced' } as const

/** The practice bank filtered to a lesson's PYQ topics ("subject/topic" keys). */
export function lessonPracticeLink(topics: string[]) {
  if (!topics.length) return '/gate/practice'
  const subjects = [...new Set(topics.map((t) => t.split('/')[0]))]
  const p = new URLSearchParams()
  if (subjects.length === 1) p.set('subject', subjects[0]!)
  p.set('topic', topics.join(','))
  return `/gate/practice?${p.toString()}`
}

export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`)
