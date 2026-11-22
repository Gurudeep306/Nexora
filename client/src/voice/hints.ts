/*
  The page's own words, sent with each clip so the server ears hear them
  better and the normaliser can fix near-misses to them
  (docs/voice/STEP1_EARS_DESIGN.md §S3, §S5): the names in the code editor in
  use and the titles of the actions on this page. At most 60.
*/
import type { CodeHandle } from './code/active'
import type { VoiceAction } from './actions/types'

const KEYWORDS = new Set(
  'if else for while do return int long float double char bool void auto const let var function def class struct new delete true false null nullptr none and or not in is import include using namespace std public private static main print printf cout cin endl println console log len range self this vector string map set list dict'.split(' '),
)

/** Identifiers in source code, most used first. */
export function codeNames(source: string, max = 40): string[] {
  const count = new Map<string, number>()
  for (const m of source.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
    const w = m[0]
    if (w.length < 2 && !/^[a-z]$/.test(w)) continue
    if (KEYWORDS.has(w)) continue
    count.set(w, (count.get(w) ?? 0) + 1)
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([w]) => w)
}

/** Hints for one clip: code names first (they are the hardest to hear), then action titles. */
export function pageHints(code: CodeHandle | null, actions: readonly VoiceAction[]): string[] {
  const out: string[] = []
  const src = code?.editor()?.getValue() ?? ''
  if (src) out.push(...codeNames(src))
  for (const a of actions) {
    const t = a.title.replace(/[^\p{L}\p{N} ]/gu, ' ').trim()
    if (t && t.length <= 40) out.push(t)
  }
  return [...new Set(out)].slice(0, 60)
}
