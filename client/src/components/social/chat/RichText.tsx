import { Fragment, useState, type ReactNode } from 'react'
import { Check, Copy, Loader2, Play } from 'lucide-react'
import { tokenize } from '@/learn/engine/code'
import type { Lang } from '@/learn/engine/types'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

/*
  Message text, made into React elements (never HTML): **bold**, *italic*,
  ~~struck~~, `code`, links (http/https only, open in a new tab), @mentions,
  "> quotes", and fenced code blocks coloured by language with Copy and Run.
  Run uses the site's own runners (/api/run), with no input.
*/

const RUN_LANG: Record<string, string> = {
  cpp: 'cpp', 'c++': 'cpp', cc: 'cpp', c: 'c', java: 'java', python: 'python', py: 'python', python3: 'python',
  js: 'javascript', javascript: 'javascript', node: 'javascript', ts: 'typescript', typescript: 'typescript',
  go: 'go', golang: 'go', rust: 'rust', rs: 'rust', kotlin: 'kotlin', kt: 'kotlin', cs: 'csharp', csharp: 'csharp', 'c#': 'csharp',
  ruby: 'ruby', rb: 'ruby', php: 'php', swift: 'swift', lua: 'lua',
}
const TOKEN_LANG: Record<string, Lang> = { cpp: 'cpp', c: 'c', java: 'java', python: 'python', javascript: 'js', typescript: 'js', csharp: 'java', kotlin: 'java', go: 'c', rust: 'c', swift: 'c', php: 'js' }
const LANG_NAME: Record<string, string> = { cpp: 'C++', c: 'C', java: 'Java', python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', go: 'Go', rust: 'Rust', kotlin: 'Kotlin', csharp: 'C#', ruby: 'Ruby', php: 'PHP', swift: 'Swift', lua: 'Lua' }

type RunResult = { verdict?: string; output?: string; stdout?: string; stderr?: string; error?: string; timeMs?: number; compileError?: string }

export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const runLang = RUN_LANG[lang.toLowerCase()] ?? null
  const tok = runLang ? TOKEN_LANG[runLang] : undefined
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)
  const [out, setOut] = useState<RunResult | null>(null)
  const run = async () => {
    if (!runLang) return
    setRunning(true)
    setOut(null)
    try {
      setOut(await api.post<RunResult>('/api/run', { code, language: runLang, input: '' }, { timeoutMs: 60000 }))
    } catch (e) {
      setOut({ verdict: 'ERROR', error: e instanceof ApiError ? e.message : 'Could not run it' })
    } finally {
      setRunning(false)
    }
  }
  const text = out ? (out.compileError || out.output || out.stdout || '') + (out.stderr ? `\n${out.stderr}` : '') + (out.error ? `\n${out.error}` : '') : ''
  return (
    <div className="chat-code">
      <div className="chat-code-bar">
        <span>{runLang ? LANG_NAME[runLang] : lang || 'Code'}</span>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="chat-code-btn"
            onClick={() => {
              void navigator.clipboard?.writeText(code).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            }}
          >
            {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {runLang && (
            <button type="button" className="chat-code-btn" onClick={() => void run()} disabled={running}>
              {running ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
              Run
            </button>
          )}
        </span>
      </div>
      <pre className="chat-code-body" tabIndex={0}>
        <code>
          {code.split('\n').map((line, i) => (
            <Fragment key={i}>
              {tok
                ? tokenize(line, tok).map((t, j) => (
                    <span key={j} className={t.k ? `tok-${t.k}` : undefined}>
                      {t.t}
                    </span>
                  ))
                : line}
              {'\n'}
            </Fragment>
          ))}
        </code>
      </pre>
      {out && (
        <div className="chat-code-out" role="status">
          <p className={cn('m-0 text-[11.5px] font-medium', out.verdict === 'OK' || (!out.verdict && !out.error) ? 'text-text-secondary' : 'text-state-error')}>
            {out.compileError || out.verdict === 'CE' ? 'Did not compile' : out.verdict === 'OK' || !out.verdict ? `Output${out.timeMs ? ` · ${out.timeMs} ms` : ''}` : out.verdict === 'TLE' ? 'Took too long' : out.verdict === 'RE' ? 'Crashed' : out.error ? 'Could not run' : out.verdict}
          </p>
          <pre className="m-0 mt-1 whitespace-pre-wrap break-words font-mono text-[12px] text-text-primary">{text.trim() || '(nothing printed)'}</pre>
        </div>
      )}
    </div>
  )
}

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(~~[^~\n]+~~)|(\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)|(https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?])|((?:^|(?<=[^A-Za-z0-9_]))@[A-Za-z0-9_.-]{2,40}(?<![.-]))/g

function inline(text: string, me: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const t = m[0]
    const k = `${key}-${i++}`
    if (m[1]) out.push(<code key={k} className="chat-icode">{t.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k}>{t.slice(2, -2)}</strong>)
    else if (m[3]) out.push(<s key={k}>{t.slice(2, -2)}</s>)
    else if (m[4]) out.push(<em key={k}>{t.slice(1, -1)}</em>)
    else if (m[5])
      out.push(
        <a key={k} href={t} target="_blank" rel="noopener noreferrer nofollow" className="chat-link">
          {t.replace(/^https?:\/\//, '')}
        </a>,
      )
    else if (m[6]) out.push(<span key={k} className={cn('chat-mention', t.slice(1) === me && 'is-me')}>{t}</span>)
    last = at + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** The text of one message. */
export function RichText({ text, me }: { text: string; me: string }) {
  const parts: ReactNode[] = []
  const fence = /```([A-Za-z0-9#+-]*)[^\S\n]*\n?([\s\S]*?)```/g
  let last = 0
  let n = 0
  const prose = (s: string) => {
    if (!s.trim()) return
    const lines = s.replace(/^\n+|\n+$/g, '').split('\n')
    let quote: string[] = []
    const flush = () => {
      if (quote.length) parts.push(<blockquote key={`q${n++}`} className="chat-quote">{quote.map((q, i) => <Fragment key={i}>{i > 0 && <br />}{inline(q, me, `q${n}-${i}`)}</Fragment>)}</blockquote>)
      quote = []
    }
    const para: ReactNode[] = []
    lines.forEach((line, i) => {
      if (/^>\s?/.test(line)) {
        if (para.length) parts.push(<p key={`p${n++}`} className="chat-p">{para.splice(0)}</p>)
        quote.push(line.replace(/^>\s?/, ''))
        return
      }
      flush()
      if (para.length) para.push(<br key={`b${i}`} />)
      para.push(...inline(line, me, `l${n}-${i}`))
    })
    flush()
    if (para.length) parts.push(<p key={`p${n++}`} className="chat-p">{para}</p>)
  }
  for (const m of text.matchAll(fence)) {
    prose(text.slice(last, m.index))
    parts.push(<CodeBlock key={`c${n++}`} lang={m[1] || ''} code={m[2].replace(/\n$/, '')} />)
    last = (m.index ?? 0) + m[0].length
  }
  prose(text.slice(last))
  return <div className="chat-text">{parts}</div>
}
