import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeBlock } from '../md'
import { LANGS, type Lang } from '../engine/types'

const LANG_KEY = 'nexora:learn-lang'
const read = (): Lang => {
  try {
    return (localStorage.getItem(LANG_KEY) as Lang) || 'cpp'
  } catch {
    return 'cpp'
  }
}

/** The same code in several languages, one tab each; remembers the choice. */
export function CodeTabs({ code, title, note }: { code: Partial<Record<Lang, string>>; title?: string; note?: string }) {
  const langs = LANGS.filter((l) => code[l.id])
  const pref = read()
  const [lang, setLang] = useState<Lang>(code[pref] ? pref : langs[0].id)
  const [copied, setCopied] = useState(false)
  const src = (code[lang] ?? '').replace(/^\n+|\s+$/g, '')

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        {title && <p className="mr-auto mb-0 pl-1 text-[13px] font-semibold text-text-primary">{title}</p>}
        <div className="flex gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {langs.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLang(l.id)
                try {
                  localStorage.setItem(LANG_KEY, l.id)
                } catch {
                  /* ignore */
                }
              }}
              className={cn(
                'shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors hover:!scale-100',
                lang === l.id ? 'bg-accent-brand/15 text-accent-brand' : 'text-text-muted hover:bg-bg-surface-3 hover:text-text-primary',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(src)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1400)
          }}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-text-muted hover:!scale-100 hover:bg-bg-surface-3 hover:text-text-primary"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5 text-state-success" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="[&_.md-pre]:rounded-none [&_.md-pre]:border-0">
        <CodeBlock code={src} lang={lang} />
      </div>
      {note && <p className="mb-0 border-t border-border px-4 py-2 text-[12.5px] text-text-muted">{note}</p>}
    </div>
  )
}
