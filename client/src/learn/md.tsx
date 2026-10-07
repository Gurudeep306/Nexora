import { Fragment, useMemo, type ReactNode } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils'
import { tokenize } from './engine/code'
import type { Lang } from './engine/types'

/**
 * A small Markdown renderer for lesson text: headings, paragraphs, lists,
 * tables, block quotes, fenced code, **bold**, *italic*, `code`, links and
 * $inline$ / $$display$$ maths (KaTeX). No HTML is ever injected except
 * KaTeX's own output.
 */

function math(src: string, display: boolean) {
  try {
    return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false })
  } catch {
    return src
  }
}

export function Inline({ text }: { text: string }) {
  const nodes: ReactNode[] = []
  const re = /(\$[^$\n]+\$)|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const tok = m[0]
    if (m[1]) nodes.push(<span key={k++} className="md-math" dangerouslySetInnerHTML={{ __html: math(tok.slice(1, -1), false) }} />)
    else if (m[2]) nodes.push(<code key={k++}>{tok.slice(1, -1)}</code>)
    else if (m[3]) nodes.push(<strong key={k++}><Inline text={tok.slice(2, -2)} /></strong>)
    else if (m[4]) nodes.push(<em key={k++}><Inline text={tok.slice(1, -1)} /></em>)
    else if (m[5]) {
      const [, alt, src] = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(tok)!
      nodes.push(
        <img
          key={k++}
          src={src}
          alt={alt || 'Figure'}
          loading="lazy"
          className="inline-block max-h-56 max-w-full rounded-xl border border-white/20 bg-[#0b1329] p-2 shadow-sm my-1.5 align-middle object-contain"
        />,
      )
    } else if (m[6]) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!
      const external = /^https?:/.test(href)
      nodes.push(
        <a key={k++} href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {label}
        </a>,
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return <>{nodes.map((n, i) => (typeof n === 'string' ? <Fragment key={`t${i}`}>{n}</Fragment> : n))}</>
}

export function CodeBlock({ code, lang }: { code: string; lang: Lang }) {
  return (
    <pre className="md-pre">
      {code.split('\n').map((line, i) => (
        <div key={i}>
          {tokenize(line, lang).map((t, k) => (
            <span key={k} className={t.k ? `tok-${t.k}` : undefined}>
              {t.t}
            </span>
          ))}
          {line === '' ? ' ' : null}
        </div>
      ))}
    </pre>
  )
}

type MdNode =
  | { k: 'h'; level: number; text: string }
  | { k: 'p'; text: string }
  | { k: 'ul' | 'ol'; items: string[] }
  | { k: 'quote'; text: string }
  | { k: 'code'; lang: string; code: string }
  | { k: 'math'; tex: string }
  | { k: 'table'; head: string[]; rows: string[][] }
  | { k: 'hr' }

function parse(src: string): MdNode[] {
  const lines = src.replace(/^\n+|\s+$/g, '').split('\n').map((l) => l.replace(/^ {0,6}/, (m) => m))
  // strip common indentation (content is authored inside template literals)
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length))
  const L = lines.map((l) => l.slice(indent))
  const out: MdNode[] = []
  let i = 0
  const isBlank = (s: string) => !s.trim()
  while (i < L.length) {
    const line = L[i]
    if (isBlank(line)) {
      i++
      continue
    }
    const fence = /^```(\w*)/.exec(line)
    if (fence) {
      const body: string[] = []
      i++
      while (i < L.length && !/^```/.test(L[i])) body.push(L[i++])
      i++
      out.push({ k: 'code', lang: fence[1] || 'pseudo', code: body.join('\n') })
      continue
    }
    if (/^\$\$/.test(line)) {
      const body: string[] = [line.replace(/^\$\$/, '')]
      if (!/\$\$\s*$/.test(line.slice(2))) {
        i++
        while (i < L.length && !/\$\$\s*$/.test(L[i])) body.push(L[i++])
        body.push(L[i] ?? '')
      }
      i++
      out.push({ k: 'math', tex: body.join('\n').replace(/\$\$\s*$/, '') })
      continue
    }
    const h = /^(#{2,4})\s+(.*)/.exec(line)
    if (h) {
      out.push({ k: 'h', level: h[1].length, text: h[2] })
      i++
      continue
    }
    if (/^---+\s*$/.test(line)) {
      out.push({ k: 'hr' })
      i++
      continue
    }
    if (/^\|/.test(line)) {
      const rows: string[][] = []
      while (i < L.length && /^\|/.test(L[i])) {
        rows.push(L[i].replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim()))
        i++
      }
      const [head, , ...rest] = rows
      out.push({ k: 'table', head, rows: rest })
      continue
    }
    if (/^>\s?/.test(line)) {
      const body: string[] = []
      while (i < L.length && /^>\s?/.test(L[i])) body.push(L[i++].replace(/^>\s?/, ''))
      out.push({ k: 'quote', text: body.join(' ') })
      continue
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\./.test(line)
      const items: string[] = []
      while (i < L.length && (/^[-*]\s+/.test(L[i]) || /^\d+\.\s+/.test(L[i]) || (/^\s{2,}\S/.test(L[i]) && items.length))) {
        if (/^\s{2,}\S/.test(L[i])) items[items.length - 1] += ' ' + L[i].trim()
        else items.push(L[i].replace(/^([-*]|\d+\.)\s+/, ''))
        i++
      }
      out.push({ k: ordered ? 'ol' : 'ul', items })
      continue
    }
    const para: string[] = []
    while (i < L.length && !isBlank(L[i]) && !/^(#{2,4}\s|```|\||>|[-*]\s|\d+\.\s|\$\$|---)/.test(L[i])) para.push(L[i++].trim())
    if (para.length) out.push({ k: 'p', text: para.join(' ') })
    else i++
  }
  return out
}

export function Markdown({ md, className }: { md: string; className?: string }) {
  const nodes = useMemo(() => parse(md), [md])
  return (
    <div className={cn('md', className)}>
      {nodes.map((n, i) => {
        switch (n.k) {
          case 'h': {
            const Tag = (`h${n.level}` as 'h2' | 'h3' | 'h4')
            return (
              <Tag key={i}>
                <Inline text={n.text} />
              </Tag>
            )
          }
          case 'p':
            return (
              <p key={i}>
                <Inline text={n.text} />
              </p>
            )
          case 'ul':
          case 'ol': {
            const Tag = n.k
            return (
              <Tag key={i}>
                {n.items.map((it, j) => (
                  <li key={j}>
                    <Inline text={it} />
                  </li>
                ))}
              </Tag>
            )
          }
          case 'quote':
            return (
              <blockquote key={i}>
                <Inline text={n.text} />
              </blockquote>
            )
          case 'code':
            return <CodeBlock key={i} code={n.code} lang={(['cpp', 'java', 'python', 'js', 'c'].includes(n.lang) ? n.lang : 'pseudo') as Lang} />
          case 'math':
            return <div key={i} className="md-display" dangerouslySetInnerHTML={{ __html: math(n.tex, true) }} />
          case 'table':
            return (
              <div key={i} className="md-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {n.head.map((c, j) => (
                        <th key={j}>
                          <Inline text={c} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {n.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k}>
                            <Inline text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'hr':
            return <hr key={i} />
        }
      })}
    </div>
  )
}
