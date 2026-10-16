import { useMemo, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Tiny, dependency-free syntax highlighter for code snippets in posts. Not a
 * parser — a single-pass tokenizer good enough for the C-family, Python, Go,
 * Rust, SQL and shell. Colours come from the theme's syntax tokens.
 */

export const CODE_LANGS: { id: string; label: string }[] = [
  { id: 'cpp', label: 'C++' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'c', label: 'C' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'sql', label: 'SQL' },
  { id: 'bash', label: 'Bash' },
  { id: 'text', label: 'Plain text' },
]

const KEYWORDS = new Set(
  (
    'auto break case catch class const continue default delete do else enum export extends false final finally for friend function goto if implements import in instanceof interface let namespace new null nullptr operator private protected public return sizeof static struct super switch template this throw true try typedef typename union using virtual void volatile while yield async await def elif except lambda pass raise with as from is not and or None True False self fn mut impl pub match loop where trait mod crate func go defer chan map range package type var val fun when object override select insert update into values where order by group having join left right inner outer on limit create table drop alter set echo then fi done esac local unsigned long short int char bool float double string vector auto'
  ).split(' '),
)

type Tok = { t: 'kw' | 'str' | 'num' | 'com' | 'fn' | 'type' | 'plain'; v: string }

const RE =
  /(\/\/[^\n]*|#(?!include|define|pragma)[^\n]*|--[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?[a-z]*\b|\b0x[\da-f]+\b)|(#include|#define|#pragma|[A-Za-z_][\w]*)/gi

function tokenize(src: string, lang: string): Tok[] {
  if (lang === 'text') return [{ t: 'plain', v: src }]
  const out: Tok[] = []
  let last = 0
  const hashComments = lang === 'python' || lang === 'bash'
  const dashComments = lang === 'sql'
  for (const m of src.matchAll(RE)) {
    const start = m.index ?? 0
    const [tok, com, str, num, word] = m
    // Only treat "#" / "--" as comments in languages that use them.
    if (com && ((com.startsWith('#') && !hashComments) || (com.startsWith('--') && !dashComments))) {
      continue
    }
    if (start > last) out.push({ t: 'plain', v: src.slice(last, start) })
    if (com) out.push({ t: 'com', v: com })
    else if (str) out.push({ t: 'str', v: str })
    else if (num) out.push({ t: 'num', v: num })
    else if (word) {
      const lower = word.toLowerCase()
      const next = src[start + word.length]
      if (word.startsWith('#') || KEYWORDS.has(lang === 'sql' ? lower : word)) out.push({ t: 'kw', v: word })
      else if (next === '(') out.push({ t: 'fn', v: word })
      else if (/^[A-Z][a-z0-9]+[A-Za-z0-9]*$/.test(word)) out.push({ t: 'type', v: word })
      else out.push({ t: 'plain', v: word })
    }
    last = start + tok.length
  }
  if (last < src.length) out.push({ t: 'plain', v: src.slice(last) })
  return out
}

const COLOR: Record<Tok['t'], string | undefined> = {
  kw: 'text-[var(--color-syntax-keyword)]',
  str: 'text-[var(--color-syntax-string)]',
  num: 'text-[var(--color-syntax-number)]',
  com: 'text-[var(--color-syntax-comment)] italic',
  fn: 'text-[var(--color-syntax-function)]',
  type: 'text-[var(--color-syntax-type)]',
  plain: undefined,
}

export function CodeBlock({ source, lang = 'text', className, maxLines = 18 }: { source: string; lang?: string; className?: string; maxLines?: number }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const lines = source.split('\n')
  const clipped = !expanded && lines.length > maxLines
  const shown = clipped ? lines.slice(0, maxLines).join('\n') : source
  const nodes = useMemo<ReactNode[]>(
    () =>
      tokenize(shown, lang).map((t, i) =>
        COLOR[t.t] ? (
          <span key={i} className={COLOR[t.t]}>
            {t.v}
          </span>
        ) : (
          t.v
        ),
      ),
    [shown, lang],
  )
  const label = CODE_LANGS.find((l) => l.id === lang)?.label ?? lang
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(source)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className={cn('group/code overflow-hidden rounded-xl border border-border bg-[var(--color-code-bg)]', className)} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase">
          <span className="size-1.5 rounded-full bg-accent-brand/70" aria-hidden="true" />
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-text-muted transition-colors hover:bg-bg-surface-3 hover:text-text-primary"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5 text-state-success" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12.5px] leading-[1.6] text-text-primary [tab-size:4]">
        <code>{nodes}</code>
      </pre>
      {clipped && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(true)
          }}
          className="w-full cursor-pointer border-t border-border py-1.5 text-xs font-medium text-accent-brand hover:bg-bg-surface-2"
        >
          Show all {lines.length} lines
        </button>
      )}
    </div>
  )
}
