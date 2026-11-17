import { useEffect, useRef } from 'react'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'

/*
  "How levels are earned", from the server's own rules (GET /api/levels/rules),
  so this page can never disagree with how XP is really counted:
  - the problem level: XP for each first Accepted, by rating, plus a number of
    solved problems for each level;
  - the Nexus web rank, which also counts a share of the problem XP.
  Opens by itself when the page is reached at #levels ("+XP" links here).
*/

type Rules = {
  xpByRating: { below: number | null; xp: number }[]
  problemLevels: { level: number; name: string; badge: string; xp: number; minProblems: number }[]
  web: { dsaShare: number; lessonXp: number; pyqXp: number }
}

function ratingText(rows: Rules['xpByRating'], i: number) {
  const r = rows[i]
  const from = i === 0 ? null : rows[i - 1].below
  if (from === null) return `below ${r.below}`
  if (r.below === null) return `${from} and up`
  return `${from}–${r.below - 1}`
}

export function LevelRules({ currentLevel }: { currentLevel?: number }) {
  const { data } = useApi(() => api.get<Rules & { ok: boolean }>('/api/levels/rules'), [], { cacheKey: 'level-rules' })
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (data && window.location.hash === '#levels' && ref.current) {
      ref.current.open = true
      ref.current.scrollIntoView({ block: 'start' })
    }
  }, [data])
  if (!data) return null
  const share = Math.round(data.web.dsaShare * 100)
  return (
    <details id="levels" ref={ref} className="mt-3 text-[13px] text-text-secondary">
      <summary className="cursor-pointer text-text-primary">How levels are earned</summary>
      <div className="mt-2 space-y-3">
        <p className="m-0">
          Your first Accepted on a problem earns XP by its rating. Solving it again earns nothing more. A level needs both its XP and its number of
          solved problems.
        </p>
        <table className="w-full max-w-sm text-left text-[12.5px]">
          <caption className="sr-only">XP for a first Accepted, by problem rating</caption>
          <thead>
            <tr className="text-text-muted">
              <th scope="col" className="py-1 font-medium">Rating</th>
              <th scope="col" className="py-1 text-right font-medium">XP</th>
            </tr>
          </thead>
          <tbody>
            {data.xpByRating.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1">{ratingText(data.xpByRating, i)}</td>
                <td className="py-1 text-right font-mono tabular-nums">{r.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] text-left text-[12.5px]">
            <caption className="sr-only">What each level needs</caption>
            <thead>
              <tr className="text-text-muted">
                <th scope="col" className="py-1 font-medium">Level</th>
                <th scope="col" className="py-1 text-right font-medium">XP</th>
                <th scope="col" className="py-1 text-right font-medium">Problems solved</th>
              </tr>
            </thead>
            <tbody>
              {data.problemLevels.map((l) => (
                <tr key={l.level} className="border-t border-border" aria-current={l.level === currentLevel ? 'true' : undefined}>
                  <td className={l.level === currentLevel ? 'py-1 font-semibold text-text-primary' : 'py-1'}>
                    {l.level}. {l.name}
                    {l.level === currentLevel && <span className="text-text-muted"> (you)</span>}
                  </td>
                  <td className="py-1 text-right font-mono tabular-nums">{l.xp.toLocaleString()}</td>
                  <td className="py-1 text-right font-mono tabular-nums">{l.minProblems.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="m-0">
          Your Nexus rank is counted separately: the concepts you master, {data.web.lessonXp} XP for each GATE lesson you finish, {data.web.pyqXp} XP for
          each GATE past-paper question you get right, and {share}% of your problem XP.
        </p>
      </div>
    </details>
  )
}
