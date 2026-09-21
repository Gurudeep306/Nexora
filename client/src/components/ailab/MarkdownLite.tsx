import { Fragment, type ReactNode } from 'react'

/**
 * Minimal markdown-ish renderer for AI tutor replies:
 * fenced code blocks (```lang), inline code, **bold**, *italic*, headings and lists.
 * No dangerouslySetInnerHTML — everything is built from text nodes.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // split on `code`, **bold**, *italic*
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyPrefix}-i${i++}`
    if (tok.startsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-background px-1.5 py-0.5 font-mono text-[0.85em] text-cyan">
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (tok.startsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      )
    } else {
      nodes.push(
        <em key={key} className="italic">
          {tok.slice(1, -1)}
        </em>,
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function MarkdownLite({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const parts = text.split(/```/)
  let key = 0

  parts.forEach((part, idx) => {
    if (idx % 2 === 1) {
      // inside a code fence — first line may be the language tag
      const nl = part.indexOf('\n')
      const body = nl >= 0 && nl < 20 ? part.slice(nl + 1) : part
      blocks.push(
        <pre
          key={`c${key++}`}
          className="my-2 overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground"
        >
          <code>{body.replace(/\n$/, '')}</code>
        </pre>,
      )
      return
    }

    const lines = part.split('\n')
    let listBuffer: string[] = []
    const flushList = () => {
      if (!listBuffer.length) return
      const items = listBuffer
      listBuffer = []
      blocks.push(
        <ul key={`l${key++}`} className="my-1.5 list-disc space-y-1 pl-5 marker:text-primary-bright">
          {items.map((li, j) => (
            <li key={j}>{renderInline(li, `l${key}-${j}`)}</li>
          ))}
        </ul>,
      )
    }

    for (const rawLine of lines) {
      const line = rawLine.trimEnd()
      const bullet = /^\s*[-*•]\s+(.*)$/.exec(line)
      const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
      if (bullet || numbered) {
        listBuffer.push((bullet ?? numbered)![1])
        continue
      }
      flushList()
      if (!line.trim()) continue
      const heading = /^(#{1,4})\s+(.*)$/.exec(line)
      if (heading) {
        blocks.push(
          <p key={`h${key++}`} className="mt-2 mb-1 font-display text-[13px] tracking-wider text-foreground uppercase">
            {renderInline(heading[2], `h${key}`)}
          </p>,
        )
        continue
      }
      blocks.push(
        <p key={`p${key++}`} className="my-1">
          {renderInline(line, `p${key}`)}
        </p>,
      )
    }
    flushList()
  })

  return <Fragment>{blocks}</Fragment>
}
