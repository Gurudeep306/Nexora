/*
  The editor's desk: small helpers that turn the admin panel's real numbers
  into words. Nothing here invents a figure — a missing number is left out.
*/
import type { Overview } from './types'

const ROMAN: [number, string][] = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
  [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
]

/** 1 → "I", 4 → "IV" (upper case, for contents and section kickers). */
export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n < 1) return ''
  let out = ''
  let left = Math.floor(n)
  for (const [v, s] of ROMAN) {
    while (left >= v) {
      out += s
      left -= v
    }
  }
  return out.toUpperCase()
}

const count = (n: number, one: string, many: string, none: string) => (n === 0 ? none : `${n.toLocaleString()} ${n === 1 ? one : many}`)

/** "Lists" in prose: a, b and c. */
export function listWords(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * One line for the masthead from live data: who is online, open reports and
 * server errors in the last day. Returns null when there is nothing to say.
 */
export function deskSentence({ overview, openReports }: { overview: Overview | null; openReports: number | null }): string | null {
  const parts: string[] = []
  const t = overview?.totals
  if (t && t.online != null) parts.push(t.online === 0 ? 'nobody online right now' : `${t.online.toLocaleString()} ${t.online === 1 ? 'person' : 'people'} online now`)
  const reports = openReports ?? t?.open_reports ?? null
  if (reports != null) parts.push(count(reports, 'open report', 'open reports', 'no open reports'))
  if (t) parts.push(t.errors24h === 0 ? 'no server errors in the last day' : `${count(t.errors24h, 'server error', 'server errors', '')} in the last day`)
  if (!parts.length) return null
  const line = listWords(parts)
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}.`
}

/** The site's weather from its health numbers: one word and one sentence. */
export function siteWeather(t: Overview['totals']): { word: 'Clear' | 'Cloudy' | 'Stormy'; line: string } {
  if (t.errors24h >= 25) return { word: 'Stormy', line: `${t.errors24h.toLocaleString()} server errors in the last day. Check the logs.` }
  if (t.errors24h > 0 || t.open_reports > 0) {
    const bits: string[] = []
    if (t.errors24h) bits.push(count(t.errors24h, 'server error', 'server errors', ''))
    if (t.open_reports) bits.push(count(t.open_reports, 'report waiting', 'reports waiting', ''))
    return { word: 'Cloudy', line: `${listWords(bits)}.`.replace(/^./, (c) => c.toUpperCase()) }
  }
  return { word: 'Clear', line: 'No server errors in the last day and nothing waiting in moderation.' }
}
