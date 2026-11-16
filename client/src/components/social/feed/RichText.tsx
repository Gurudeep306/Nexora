import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CodeBlock } from './CodeBlock'
import { profilePath, tagPath } from './types'

/*
 * Markdown-lite for posts and comments, rendered straight to React nodes —
 * the text is never parsed as HTML, so there is nothing to inject.
 *   **bold**  *italic* / _italic_  `code`  ```lang fences```  > quote
 *   https://links  @mentions  #hashtags
 */

const INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|((?:^|(?<=[^\w@/]))@[A-Za-z0-9_]{2,40})|((?:^|(?<=[^\w&/#]))#[A-Za-z][A-Za-z0-9_]{1,39})/g

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(INLINE)) {
    const start = m.index ?? 0
    if (start > last) out.push(text.slice(last, start))
    const k = `${keyBase}-${i++}`
    const [tok, code, bold, italic, url, mention, tag] = m
    if (code) {
      out.push(
        <code key={k} className="rounded-md bg-bg-surface-3 px-1.5 py-0.5 font-mono text-[0.86em] text-text-primary">
          {code.slice(1, -1)}
        </code>,
      )
    } else if (bold) {
      out.push(
        <strong key={k} className="font-semibold text-text-primary">
          {inline(bold.slice(2, -2), k)}
        </strong>,
      )
    } else if (italic) {
      out.push(<em key={k}>{inline(italic.slice(1, -1), k)}</em>)
    } else if (url) {
      let label = url.replace(/^https?:\/\/(www\.)?/, '')
      if (label.length > 42) label = `${label.slice(0, 40)}…`
      out.push(
        <a
          key={k}
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="text-accent-brand underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>,
      )
    } else if (mention) {
      out.push(
        <Link key={k} to={profilePath(mention.slice(1))} className="rt-mention font-medium text-accent-brand hover:underline" onClick={(e) => e.stopPropagation()}>
          {mention}
        </Link>,
      )
    } else if (tag) {
      out.push(
        <Link key={k} to={tagPath(tag.slice(1))} className="rt-tag font-medium text-state-info hover:underline" onClick={(e) => e.stopPropagation()}>
          {tag}
        </Link>,
      )
    } else {
      out.push(tok)
    }
    last = start + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null
  // Split out ``` fences first.
  const parts = text.split(/```([a-z+#]*)\n?([\s\S]*?)```/g)
  const blocks: ReactNode[] = []
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i]
    if (prose) {
      const lines = prose.replace(/^\n+|\n+$/g, '').split('\n')
      let quote: string[] = []
      const flush = (k: string) => {
        if (!quote.length) return
        blocks.push(
          <blockquote key={k} className="my-1 border-l-2 border-accent-brand/40 pl-3 text-text-secondary">
            {quote.map((q, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(q, `${k}q${j}`)}
              </Fragment>
            ))}
          </blockquote>,
        )
        quote = []
      }
      const para: ReactNode[] = []
      lines.forEach((line, j) => {
        if (line.startsWith('> ')) {
          if (para.length) blocks.push(<p key={`p${i}-${j}`} className="whitespace-pre-wrap">{para.splice(0)}</p>)
          quote.push(line.slice(2))
          return
        }
        flush(`bq${i}-${j}`)
        if (para.length) para.push(<br key={`br${j}`} />)
        para.push(...inline(line, `l${i}-${j}`))
      })
      flush(`bq${i}-end`)
      if (para.length) blocks.push(<p key={`p${i}`} className="whitespace-pre-wrap">{para}</p>)
    }
    if (i + 2 < parts.length) {
      blocks.push(<CodeBlock key={`c${i}`} lang={parts[i + 1] || 'text'} source={parts[i + 2].replace(/\n$/, '')} />)
    }
  }
  return <div className={className ?? 'space-y-2 break-words text-[15px] leading-relaxed text-text-primary'}>{blocks}</div>
}
