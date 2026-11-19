import { useMemo } from 'react'
import { snippet } from '@/gate/answers'
import { Link } from 'react-router-dom'
import { Shuffle } from 'lucide-react'
import { DSA_TOPICS } from '@/learn/content/dsa/syllabus'
import { isDone, type ItemState } from '@/learn/progress'
import type { WebCluster } from '@/components/nexus/types'
import { subjectHref } from '@/components/nexus/course'
import { progressOf as notesProgressOf, type useNotesProgress } from '@/gate/notes/progress'
import { prefetchHandlers } from '@/routes'
import { humanize, lastStudied, nextNode } from './today-data'
import { Reveal } from './Today'

/** What /api/today/picks returns: real items, today's order. */
export interface TodayPicks {
  day: string
  problem: { id: number; title: string; platform: string; rating: number; tags: string[]; retry: boolean; target: number } | null
  gate: { id: string; year: number; subject: string; subjectName?: string; topic: string | null; topicName?: string | null; marks: number; type: string; preview: string; weak: boolean } | null
  notes: { subject: string; subjectTitle: string; id: string; title: string; minutes: number; chapter: string }[]
}

interface Pick {
  key: string
  kicker: string
  title: string
  line: string
  meta?: string
  to: string
}

const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five']

const PLATFORM: Record<string, string> = {
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  atcoder: 'AtCoder',
  leetcode: 'LeetCode',
  spoj: 'SPOJ',
  projecteuler: 'Project Euler',
  cses: 'CSES',
  kattis: 'Kattis',
  timus: 'Timus',
  uva: 'UVa',
  dmoj: 'DMOJ',
}

/** A small string hash, so the client's own picks follow the same day + shuffle. */
function seedOf(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * "For you today": a problem at your level, a GATE question from your weakest
 * subject, a notes lesson and a DSA chapter you have not finished, and the next
 * skill open to you. Every pick is real content; the set changes every day and
 * on Shuffle.
 */
export function ForYou({
  picks,
  items,
  clusters,
  notesProgress,
  shuffle,
  onShuffle,
  loading,
}: {
  picks: TodayPicks | null
  items: Record<string, ItemState>
  clusters: WebCluster[] | null
  notesProgress: ReturnType<typeof useNotesProgress>
  shuffle: number
  onShuffle: () => void
  loading: boolean
}) {
  const list = useMemo<Pick[]>(() => {
    if (!picks) return []
    const seed = seedOf(`${picks.day}|${shuffle}`)
    const out: Pick[] = []
    const p = picks.problem
    if (p) {
      out.push({
        key: 'problem',
        kicker: p.retry ? 'One to finish' : 'A problem at your level',
        title: p.title,
        line: p.retry ? 'You tried this one before. Have another go.' : p.tags.length ? `Practise ${p.tags.slice(0, 2).join(' and ')}.` : 'Let the judge check your answer.',
        meta: [PLATFORM[p.platform] ?? humanize(p.platform), p.rating ? `rating ${p.rating}` : null].filter(Boolean).join(' · '),
        to: `/solve/${p.id}`,
      })
    }
    const g = picks.gate
    if (g) {
      out.push({
        key: 'gate',
        kicker: g.weak ? 'Your weakest GATE subject' : 'A GATE past question',
        title: `GATE ${g.year} · ${g.subjectName ?? humanize(g.subject)}`,
        line: (g.preview && snippet(g.preview).length >= 30 ? snippet(g.preview) : '') || g.topicName || (g.topic ? humanize(g.topic) : 'A past question with a verified answer.'),
        meta: [`${g.marks} ${g.marks === 1 ? 'mark' : 'marks'}`, g.type].filter(Boolean).join(' · '),
        to: `/gate/practice?ids=${encodeURIComponent(g.id)}`,
      })
    }
    const n = picks.notes.find((l) => !notesProgressOf(notesProgress, l.subject, l.id).completed)
    if (n) {
      out.push({
        key: 'notes',
        kicker: `Notes · ${n.subjectTitle}`,
        title: n.title,
        line: `From ${n.chapter}.`,
        meta: n.minutes ? `${n.minutes} min read` : undefined,
        to: `/gate/notes/${n.subject}/${n.id}`,
      })
    }
    // A DSA chapter not finished yet, in today's order.
    const open = DSA_TOPICS.filter((t) => t.load && t.pages).filter((t) => {
      const read = Object.keys(items).filter((k) => k.startsWith(`page:${t.id}/`) && isDone(items[k])).length
      return read < (t.pages ?? 0)
    })
    const t = open.length ? open[seed % open.length] : null
    if (t) {
      const read = Object.keys(items).filter((k) => k.startsWith(`page:${t.id}/`) && isDone(items[k])).length
      out.push({
        key: 'dsa',
        kicker: 'DSA course',
        title: t.title,
        line: t.blurb ?? 'Every idea animated, step by step.',
        meta: read ? `${read} of ${t.pages} pages read` : `${t.pages} pages`,
        to: `/learn/dsa/${t.id}`,
      })
    }
    // The next open skill in a subject you have not touched lately.
    const skills = (clusters ?? [])
      .filter((c) => c.engine !== 'dsa')
      .map((c) => ({ c, nx: nextNode(c), days: lastStudied(c) }))
      .filter((x) => x.nx)
      .sort((a, b) => b.days - a.days)
      .slice(0, 12)
    const s = skills.length ? skills[(seed >>> 3) % skills.length] : null
    const skillTo = s?.nx ? (s.c.gate?.notes && s.nx.ls?.length ? `/gate/notes/${s.c.gate.notes}/${s.nx.ls[0]}` : subjectHref(s.c, s.nx.id)) : null
    if (s?.nx && skillTo && !out.some((x) => x.to === skillTo)) {
      out.push({
        key: 'skill',
        kicker: `Skill · ${s.c.name}`,
        title: s.nx.n,
        line: 'The next skill open to you here.',
        to: skillTo,
      })
    }
    return out
  }, [picks, items, clusters, notesProgress, shuffle])

  if (!picks && !loading) return null
  return (
    <Reveal aria-labelledby="today-foryou">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ed-label ed-muted m-0">For you today</p>
          <h2 id="today-foryou" className="ed-h2 mt-3 mb-0">
            {list.length === 1 ? 'One thing worth your time' : `${WORDS[list.length] ?? list.length} things worth your time`}
          </h2>
        </div>
        <button type="button" className="ed-link today-shuffle" onClick={onShuffle} disabled={loading}>
          <Shuffle className="size-3.5" aria-hidden="true" /> Shuffle
        </button>
      </div>
      <ul className="today-foryou mt-8 mb-0 list-none p-0" aria-busy={loading || undefined}>
        {list.map((x) => (
          <li key={x.key} className="today-pick">
            <Link to={x.to} {...prefetchHandlers(x.to)} className="today-pick-link">
              <span className="ed-label ed-muted">{x.kicker}</span>
              <span className="today-pick-title ed-serif">{x.title}</span>
              <span className="today-pick-line ed-body-sm ed-ink-2">{x.line}</span>
              {x.meta && <span className="today-pick-meta">{x.meta}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}
