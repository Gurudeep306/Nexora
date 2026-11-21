/*
  Listen: follow the voice word by word. The browser says which character of
  the spoken text it has reached; the spoken text is the paragraph's own text
  with maths turned into words, so each spoken word is found again in the
  paragraph's text, a little ahead of the last one. Words that were maths
  (said, not written) simply aren't found and the highlight waits.

  `nextWord` is pure (tests/reader-wordtrack.test.js).
*/

/** The word starting at `i` in `spoken` (letters and digits). */
export function wordAt(spoken: string, i: number): string {
  const m = spoken.slice(i).match(/^[\p{L}\p{N}]+/u)
  return m ? m[0] : ''
}

/**
 * Where `word` next appears in `text` at or after `from`, looking no further
 * than `window` characters ahead; -1 when it isn't there (a formula said aloud).
 */
export function nextWord(text: string, word: string, from: number, window = 60): number {
  if (!word) return -1
  const hay = text.slice(from, from + window + word.length).toLowerCase()
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u')
  const m = re.exec(hay)
  return m ? from + m.index : -1
}

/** The paragraph's visible text nodes, with where each starts in the joined text. */
export function textMap(el: HTMLElement, skip: string): { text: string; nodes: { node: Text; start: number }[] } {
  const nodes: { node: Text; start: number }[] = []
  let text = ''
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => ((n.parentElement?.closest(`${skip}, .katex`) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)),
  })
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push({ node: n as Text, start: text.length })
    text += (n as Text).data
  }
  return { text, nodes }
}

/** A DOM range over text[start, start + len). */
export function rangeOf(map: ReturnType<typeof textMap>, start: number, len: number): Range | null {
  const at = (pos: number) => {
    for (let k = map.nodes.length - 1; k >= 0; k--) if (map.nodes[k].start <= pos) return { node: map.nodes[k].node, off: pos - map.nodes[k].start }
    return null
  }
  const a = at(start)
  const b = at(start + len)
  if (!a || !b) return null
  const r = document.createRange()
  r.setStart(a.node, Math.min(a.off, a.node.length))
  r.setEnd(b.node, Math.min(b.off, b.node.length))
  return r
}
