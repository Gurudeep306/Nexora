/**
 * Finding a highlight again. A highlight is saved as its quote plus a little
 * text on each side (prefix, suffix), not as a position, so it survives small
 * edits to the lesson. These helpers work on the lesson's plain text.
 */

/** How many characters of context are kept on each side. */
export const CONTEXT = 32

/** Characters equal from the end of `a` and the end of `b`. */
function tailMatch(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++
  return n
}

/** Characters equal from the start of `a` and the start of `b`. */
function headMatch(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  return n
}

/**
 * Where `quote` starts in `text`, choosing among repeats by how much of the
 * saved context matches around each one. -1 when the quote is gone.
 */
export function locate(text: string, quote: string, prefix = '', suffix = ''): number {
  if (!quote) return -1
  let best = -1
  let bestScore = -1
  for (let at = text.indexOf(quote); at !== -1; at = text.indexOf(quote, at + 1)) {
    const before = text.slice(Math.max(0, at - prefix.length), at)
    const after = text.slice(at + quote.length, at + quote.length + suffix.length)
    const score = tailMatch(before, prefix) + headMatch(after, suffix)
    if (score > bestScore) {
      best = at
      bestScore = score
    }
  }
  return best
}

/** The quote and its context for a span [start, end) of `text`. */
export function describe(text: string, start: number, end: number): { quote: string; prefix: string; suffix: string } {
  return {
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
  }
}
