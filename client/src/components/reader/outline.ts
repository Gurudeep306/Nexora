import { useEffect, useState, type RefObject } from 'react'

export interface OutlineItem {
  id: string
  text: string
  level: 2 | 3
}

/** The id of the heading the reader is in (the last one above a line 30% down the screen). */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join('|')
  useEffect(() => {
    if (!ids.length) return
    let raf = 0
    const measure = () => {
      raf = 0
      const line = window.innerHeight * 0.3
      let cur: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= line) cur = id
        else break
      }
      setActive(cur ?? ids[0])
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', on, { passive: true })
    return () => {
      window.removeEventListener('scroll', on)
      if (raf) cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return active
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'section'

/**
 * Reads the h2/h3 headings a page rendered and gives each an id, for pages
 * whose content isn't a parsed document (the DSA lessons). Re-reads when
 * `key` changes.
 */
export function useDomOutline(root: RefObject<HTMLElement | null>, key: string): OutlineItem[] {
  const [items, setItems] = useState<OutlineItem[]>([])
  useEffect(() => {
    const el = root.current
    if (!el) return
    const read = () => {
      const seen = new Map<string, number>()
      const out: OutlineItem[] = []
      el.querySelectorAll<HTMLElement>('h2, h3').forEach((h) => {
        const text = h.textContent?.trim()
        if (!text) return
        if (!h.id) {
          const base = `s-${slug(text)}`
          const n = seen.get(base) ?? 0
          seen.set(base, n + 1)
          h.id = n ? `${base}-${n}` : base
        }
        out.push({ id: h.id, text, level: h.tagName === 'H3' ? 3 : 2 })
      })
      setItems(out)
    }
    read()
    // Lessons render some blocks lazily; read again once they settle.
    const t = window.setTimeout(read, 600)
    return () => window.clearTimeout(t)
  }, [root, key])
  return items
}
