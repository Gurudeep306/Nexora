import { useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Language } from './types'

const POPULAR = ['cpp', 'python', 'java', 'c', 'javascript', 'kotlin', 'go', 'rust', 'typescript', 'csharp']

/* Two-letter badge per language — quick visual anchor in the list. */
const BADGE: Record<string, { t: string; c: string }> = {
  cpp: { t: 'C++', c: '#659ad2' }, c: { t: 'C', c: '#a8b9cc' }, python: { t: 'Py', c: '#ffd43b' },
  java: { t: 'Jv', c: '#f89820' }, javascript: { t: 'JS', c: '#f7df1e' }, typescript: { t: 'TS', c: '#3178c6' },
  csharp: { t: 'C#', c: '#9b4f96' }, go: { t: 'Go', c: '#00add8' }, rust: { t: 'Rs', c: '#dea584' },
  kotlin: { t: 'Kt', c: '#a97bff' }, ruby: { t: 'Rb', c: '#e0115f' }, php: { t: 'Ph', c: '#8892bf' },
  perl: { t: 'Pl', c: '#39457e' }, lua: { t: 'Lu', c: '#6c7fe0' }, shell: { t: 'Sh', c: '#89e051' },
  r: { t: 'R', c: '#276dc3' }, scala: { t: 'Sc', c: '#dc322f' }, swift: { t: 'Sw', c: '#f05138' },
  dart: { t: 'Dt', c: '#00b4ab' }, julia: { t: 'Jl', c: '#9558b2' }, fsharp: { t: 'F#', c: '#378bba' },
  objectivec: { t: 'OC', c: '#438eff' }, pascal: { t: 'Pa', c: '#e3f171' }, haskell: { t: 'Hs', c: '#8f7cc4' },
  ocaml: { t: 'ML', c: '#ef7a08' }, d: { t: 'D', c: '#ba595e' }, nim: { t: 'Nm', c: '#ffc200' },
  zig: { t: 'Zg', c: '#f7a41d' }, crystal: { t: 'Cr', c: '#c8c8c8' }, groovy: { t: 'Gv', c: '#4298b8' },
  commonlisp: { t: 'λ', c: '#3fb68b' },
}

export function LangBadge({ id, className }: { id: string; className?: string }) {
  const b = BADGE[id] ?? { t: id.slice(0, 2), c: '#a3a3b3' }
  return (
    <span
      className={cn('inline-flex h-5 min-w-6 items-center justify-center rounded px-1 font-mono text-[10px] font-bold', className)}
      style={{ color: b.c, background: `${b.c}1f`, boxShadow: `inset 0 0 0 1px ${b.c}33` }}
    >
      {b.t}
    </span>
  )
}

/** Searchable language switcher (type to filter, ↑↓ + Enter to pick). */
export function LanguagePicker({
  languages,
  value,
  onChange,
}: {
  languages: Language[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const current = languages.find((l) => l.id === value)

  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    const match = (l: Language) => !query || l.label.toLowerCase().includes(query) || l.id.includes(query)
    const popular = POPULAR.map((id) => languages.find((l) => l.id === id)).filter((l): l is Language => !!l && match(l))
    const rest = languages.filter((l) => !POPULAR.includes(l.id) && match(l)).sort((a, b) => a.label.localeCompare(b.label))
    return { popular, rest, flat: [...popular, ...rest] }
  }, [languages, q])

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    setQ('')
  }

  const row = (l: Language, i: number) => (
    <button
      key={l.id}
      data-i={i}
      role="option"
      aria-selected={l.id === value}
      onMouseMove={() => setActive(i)}
      onClick={() => pick(l.id)}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px]',
        i === active ? 'bg-white/[0.06] text-foreground' : 'text-foreground-dim',
      )}
    >
      <LangBadge id={l.id} />
      <span className="flex-1 truncate">{l.label}</span>
      <span className="text-[10px] text-foreground-faint">{l.compiled ? 'compiled' : 'script'}</span>
      {l.id === value && <Check className="size-3.5 text-primary-bright" />}
    </button>
  )

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setActive(Math.max(0, items.flat.findIndex((l) => l.id === value)))
      }}
    >
      <PopoverTrigger asChild>
        <button
          aria-label={`Language: ${current?.label ?? value}`}
          className="flex h-8 min-w-36 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 pr-2 pl-1.5 text-xs text-foreground transition-colors hover:border-border-strong data-[state=open]:border-primary/60"
        >
          <LangBadge id={value} />
          <span className="flex-1 truncate text-left font-medium">{current?.label ?? value}</span>
          <ChevronsUpDown className="size-3.5 text-foreground-faint" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3">
          <Search className="size-3.5 text-foreground-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, items.flat.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' && items.flat[active]) {
                e.preventDefault()
                pick(items.flat[active].id)
              }
              requestAnimationFrame(() => listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }))
            }}
            placeholder={`Search ${languages.length} languages…`}
            aria-label="Search languages"
            className="h-10 w-full bg-transparent text-[13px] text-foreground placeholder:text-foreground-faint focus:outline-none"
          />
        </div>
        <div ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {items.popular.length > 0 && (
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold tracking-[0.12em] text-foreground-faint uppercase">Popular</p>
          )}
          {items.popular.map((l, i) => row(l, i))}
          {items.rest.length > 0 && (
            <p className="px-2 pt-2.5 pb-1 text-[10px] font-semibold tracking-[0.12em] text-foreground-faint uppercase">More languages</p>
          )}
          {items.rest.map((l, i) => row(l, i + items.popular.length))}
          {items.flat.length === 0 && <p className="px-3 py-6 text-center text-xs text-foreground-faint">No language matches “{q}”.</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}
