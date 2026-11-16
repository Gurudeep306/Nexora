import { useEffect, useMemo } from 'react'
import type { PublicProfile, Showcase } from '@/components/social/feed/types'

/* Data helpers for the profile notebook (components/profile/Notebook.tsx). */

type Day = NonNullable<Showcase['heatmap']>[number]
const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

/** The last `n` days (oldest first) of one field from the heatmap, with gaps filled by 0. */
export function lastDays(days: Day[] | undefined, n: number, pick: (d: Day) => number, today: Date): number[] {
  const by = new Map((days ?? []).map((d) => [d.date, d]))
  const out: number[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const hit = by.get(d.toISOString().slice(0, 10))
    out.push(hit ? pick(hit) : 0)
  }
  return out
}

/** "Most active on Sundays. Longest run 21 days." from the year of activity, or null with no activity. */
export function calendarSentence(days: Day[] | undefined, best: number): string | null {
  const active = (days ?? []).filter((d) => d.count > 0)
  if (!active.length) return null
  const perDay = [0, 0, 0, 0, 0, 0, 0]
  for (const d of active) perDay[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count
  const top = perDay.indexOf(Math.max(...perDay))
  // Longest run of consecutive active days inside the window.
  const dates = active.map((d) => Date.parse(`${d.date}T00:00:00Z`)).sort((a, b) => a - b)
  let run = 1
  let longest = 1
  for (let i = 1; i < dates.length; i++) {
    run = dates[i] - dates[i - 1] === 86400000 ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  const streak = Math.max(longest, best)
  return `Most active on ${WEEKDAYS[top]}. Longest streak ${streak} ${streak === 1 ? 'day' : 'days'}.`
}

/** schema.org Person / ProfilePage data for a public profile (removed when the page closes). */
export function usePersonJsonLd(profile: PublicProfile | undefined, enabled: boolean) {
  const json = useMemo(() => {
    if (!profile || !enabled) return null
    const url = `${window.location.origin}/u/${encodeURIComponent(profile.username)}`
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url,
      mainEntity: {
        '@type': 'Person',
        name: profile.display_name || profile.username,
        alternateName: `@${profile.username}`,
        url,
        ...(profile.bio ? { description: profile.bio.slice(0, 300) } : {}),
        ...(profile.website ? { sameAs: [profile.website] } : {}),
      },
    })
  }, [profile, enabled])
  useEffect(() => {
    if (!json) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.dataset.profile = 'person'
    el.textContent = json
    document.head.appendChild(el)
    return () => el.remove()
  }, [json])
}
