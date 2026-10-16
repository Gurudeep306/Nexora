import { Fragment } from 'react'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Renders `text` with every case-insensitive occurrence of the query's words
 * marked: a crisp change of ink weight on a faint accent wash, no glow.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .sort((a, b) => b.length - a.length)
  if (!words.length) return <>{text}</>
  const parts = text.split(new RegExp(`(${words.map(escape).join('|')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[3px] bg-accent-brand/15 font-semibold text-text-primary [box-decoration-break:clone]">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}
