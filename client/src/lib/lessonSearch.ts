import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { cachedStructure, fetchStructure, rememberStructure } from '@/components/nexus/data'
import { subjectHref } from '@/components/nexus/course'
import type { NexusWebStructure } from '@/components/nexus/types'
import { DSA_TOPICS } from '@/learn/content/dsa/syllabus'
import { AI_COURSES, AI_TOPIC_INFO } from '@/learn/content/ai/web.gen'
import { AI_SEARCH } from '@/learn/content/ai/search.gen'
import { aiTopicHref, topicBase } from '@/learn/content/courses'
import type { SearchResult } from '@/gate/notes/types'
import type { IconName } from '@/components/icon/names'

/*
 * One "find a lesson" index for the whole site: every written lesson (GATE
 * notes, searched on the server in full text, DSA chapters, and AI course
 * topics with their pages and sections), every
 * subject and every skill in the Nexus. The top bar, the command palette,
 * Learn and Nexus all search through it, so a lesson is found the same way
 * from anywhere.
 */

export type LessonHitKind = 'lesson' | 'subject' | 'skill'
export interface LessonHit {
  id: string
  kind: LessonHitKind
  label: string
  /** Where it lives: "Digital Logic · Chapter 2". */
  hint: string
  to: string
  /** A line of the lesson text around the match (notes only). */
  snippet?: string
}

type Cluster = NexusWebStructure['clusters'][number]

let structureLoad: Promise<NexusWebStructure | null> | null = null
/** The Nexus map: this browser's copy, else fetched once. */
export function useNexusStructure(enabled = true) {
  const [s, setS] = useState<NexusWebStructure | null>(() => cachedStructure())
  useEffect(() => {
    if (!enabled || s) return
    structureLoad ??= fetchStructure()
      .then((x) => {
        rememberStructure(x)
        return x
      })
      .catch(() => null)
    let live = true
    void structureLoad.then((x) => live && x && setS(x))
    return () => {
      live = false
    }
  }, [enabled, s])
  return s
}

/** Rank a label against the query: 0 exact, 1 prefix, 2 word start, 3 inside, -1 none. */
export function matchRank(label: string, q: string): number {
  const l = label.toLowerCase()
  if (l === q) return 0
  if (l.startsWith(q)) return 1
  if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(l)) return 2
  if (l.includes(q)) return 3
  // Every word of the query somewhere in the label ("graph short" → shortest paths).
  const words = q.split(/\s+/).filter(Boolean)
  return words.length > 1 && words.every((w) => l.includes(w)) ? 4 : -1
}

const nameOf = (c: Pick<Cluster, 'engine' | 'name'>) => (c.engine === 'dsa' ? 'Data Structures & Algorithms' : c.name)

export function useLessonSearch(query: string, { enabled = true, limit = 6 }: { enabled?: boolean; limit?: number } = {}) {
  const q = query.trim().toLowerCase()
  const structure = useNexusStructure(enabled)

  // Full-text notes search on the server, a beat after typing stops.
  const [notes, setNotes] = useState<{ q: string; results: SearchResult[] }>({ q: '', results: [] })
  useEffect(() => {
    if (!enabled || q.length < 2) return
    let live = true
    const t = window.setTimeout(() => {
      api
        .get<{ ok: true; results: SearchResult[] }>('/api/gate/notes/search', { query: { q } })
        .then((r) => live && setNotes({ q, results: r.results ?? [] }))
        .catch(() => live && setNotes({ q, results: [] }))
    }, 180)
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [q, enabled])
  // Still waiting for the server's answer to this exact query.
  const loading = enabled && q.length >= 2 && notes.q !== q

  const hits = useMemo<LessonHit[]>(() => {
    if (!enabled || !q) return []
    const clusters = structure?.clusters ?? []
    // The Learn home of a notes subject, by its notes id.
    const homeOfNotes = new Map(clusters.filter((c) => c.gate?.notes).map((c) => [c.gate!.notes!, c]))

    const lessons: { h: LessonHit; r: number }[] = []
    for (const t of DSA_TOPICS) {
      if (!t.load) continue
      const r = matchRank(t.title, q)
      if (r >= 0) lessons.push({ r, h: { id: `dsa:${t.id}`, kind: 'lesson', label: t.title, hint: 'DSA course', to: `/learn/dsa/${t.id}` } })
    }
    // AI courses: every topic by name (written or not), and every page and section of the written ones.
    for (const [id, t] of Object.entries(AI_TOPIC_INFO)) {
      const course = AI_COURSES.find((c) => c.id === t.course)?.title ?? 'AI'
      const r = matchRank(t.title, q)
      if (r >= 0) lessons.push({ r, h: { id: `ai:${id}`, kind: 'lesson', label: t.title, hint: `${course} · ${t.chapter}`, to: aiTopicHref(id) } })
      for (const p of AI_SEARCH[id] ?? []) {
        const pr = matchRank(p.title, q)
        if (pr >= 0) lessons.push({ r: pr + 0.5, h: { id: `ai:${id}/${p.page}`, kind: 'lesson', label: p.title, hint: `${course} · ${t.title}`, to: `${topicBase(id)}/${p.page}` } })
        for (const sec of p.sections) {
          const sr = matchRank(sec, q)
          if (sr >= 0) lessons.push({ r: sr + 1, h: { id: `ai:${id}/${p.page}#${sec}`, kind: 'lesson', label: sec, hint: `${t.title} · ${p.title}`, to: `${topicBase(id)}/${p.page}` } })
        }
      }
    }
    if (notes.q === q) {
      for (const n of notes.results) {
        const home = homeOfNotes.get(n.subject)
        const r = matchRank(n.title, q)
        lessons.push({
          r: r >= 0 ? r : 5,
          h: {
            id: `notes:${n.subject}/${n.lesson}`,
            kind: 'lesson',
            label: n.title,
            hint: `${home ? nameOf(home) : n.subjectTitle} · ${n.chapter}`,
            to: `/gate/notes/${n.subject}/${n.lesson}`,
            snippet: r >= 0 ? undefined : n.snippet,
          },
        })
      }
    }

    const subjects: { h: LessonHit; r: number }[] = []
    const skills: { h: LessonHit; r: number }[] = []
    for (const c of clusters) {
      const r = Math.min(...[matchRank(nameOf(c), q), matchRank(c.short, q)].map((x) => (x < 0 ? 99 : x)))
      if (r < 99) subjects.push({ r, h: { id: `subject:${c.id}`, kind: 'subject', label: nameOf(c), hint: c.short, to: subjectHref(c) } })
      for (const n of c.nodes) {
        const nr = matchRank(n.n, q)
        if (nr >= 0) skills.push({ r: nr, h: { id: `skill:${c.id}/${n.id}`, kind: 'skill', label: n.n, hint: nameOf(c), to: subjectHref(c, n.id) } })
      }
    }
    const top = (xs: { h: LessonHit; r: number }[], n: number) => {
      const seen = new Set<string>()
      return xs
        .sort((a, b) => a.r - b.r || a.h.label.length - b.h.label.length)
        .filter((x) => (seen.has(x.h.id) ? false : (seen.add(x.h.id), true)))
        .slice(0, n)
        .map((x) => x.h)
    }
    return [...top(lessons, limit), ...top(subjects, Math.ceil(limit / 2)), ...top(skills, limit)]
  }, [q, enabled, structure, notes, limit])

  return { hits, loading, ready: !!structure }
}

export const LESSON_GROUP: Record<LessonHitKind, string> = { lesson: 'Lessons', subject: 'Subjects', skill: 'Skills' }
export const LESSON_ICON: Record<LessonHitKind, IconName> = { lesson: 'book', subject: 'learn', skill: 'nexus' }
