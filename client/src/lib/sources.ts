import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { PLATFORM_OPTIONS } from '@/components/problems/types'

export type SiteSource = { id: string; label: string; kind: 'stdin' | 'function' | 'answer'; problems: number }

const FALLBACK_LABELS: Record<string, string> = {
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  atcoder: 'AtCoder',
  leetcode: 'LeetCode',
  spoj: 'SPOJ',
  euler: 'Project Euler',
  cses: 'CSES',
  dmoj: 'DMOJ',
  timus: 'Timus',
  kattis: 'Kattis',
  uva: 'UVa',
  nexora: 'NexoraGuru',
}
const FALLBACK: SiteSource[] = PLATFORM_OPTIONS.map((id) => ({ id, label: FALLBACK_LABELS[id] ?? id, kind: id === 'leetcode' ? 'function' : id === 'euler' ? 'answer' : 'stdin', problems: 0 }))

let cache: SiteSource[] | null = null
let inflight: Promise<SiteSource[]> | null = null

function load(): Promise<SiteSource[]> {
  if (cache) return Promise.resolve(cache)
  inflight ??= api
    .get<{ sources: SiteSource[] }>('/api/sources')
    .then((r) => (cache = r.sources.length ? r.sources : FALLBACK))
    .catch(() => FALLBACK)
    .finally(() => (inflight = null))
  return inflight
}

/** The problem sources an admin has switched on, with the names they gave them. */
export function useSources(): SiteSource[] {
  const [list, setList] = useState<SiteSource[]>(cache ?? FALLBACK)
  useEffect(() => {
    let alive = true
    void load().then((l) => alive && setList(l))
    return () => {
      alive = false
    }
  }, [])
  return list
}

/** "Codeforces' tests", "AtCoder's tests": the possessive of a judge's name. */
export const judgeOf = (id: string) => {
  const n = sourceLabel(id)
  return /s$/i.test(n) ? `${n}'` : `${n}'s`
}
export const sourceLabel = (id: string) => cache?.find((s) => s.id === id)?.label ?? FALLBACK_LABELS[id] ?? id
