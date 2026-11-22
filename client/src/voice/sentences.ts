/* Answers split into sentences for speaking one by one (speak.ts). Pure and type-strippable: tests/voice-speak.test.js. */

/**
 * Split an answer into sentences to speak one by one. Keeps "e.g.", "i.e.",
 * decimals (3.14) and "O(n log n)" whole; very long sentences are cut at a
 * comma so the first piece starts quickly.
 */
export function splitSentences(text: string, max = 220): string[] {
  const clean = String(text || '').replace(/[`*_#>]/g, '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const parts: string[] = []
  let cur = ''
  const words = clean.split(' ')
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    cur = cur ? `${cur} ${w}` : w
    const ends = /[.!?।]["')\]]*$/.test(w) && !/^(e\.g|i\.e|etc|vs|mr|mrs|dr|no|fig)\.$/i.test(w) && !/^\d+\.$/.test(w)
    if (ends || i === words.length - 1) {
      parts.push(cur)
      cur = ''
    }
  }
  // Cut very long sentences at a comma or semicolon near the middle.
  const out: string[] = []
  for (const p of parts) {
    if (p.length <= max) {
      out.push(p)
      continue
    }
    let rest = p
    while (rest.length > max) {
      const window = rest.slice(0, max)
      const at = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '))
      const cut = at > max * 0.4 ? at + 1 : window.lastIndexOf(' ') > 0 ? window.lastIndexOf(' ') : max
      out.push(rest.slice(0, cut).trim())
      rest = rest.slice(cut).trim()
    }
    if (rest) out.push(rest)
  }
  return out
}
