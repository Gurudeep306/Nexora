import { useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { CATEGORIES, PALETTES, resolveMode, type Palette, type ThemeCategory } from '@/theme/palettes'
import { cn } from '@/lib/utils'
import { AccentRow, RadioGroup } from './controls'
import { ModeMarks, ThemeSwatch } from './ThemeTile'
import { Section } from './Section'

type Filter = 'all' | 'light' | 'dark' | ThemeCategory

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  ...CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
]

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<ThemeCategory, string>

export interface PreviewPatch {
  theme?: string
  accent?: string
}

export function ThemesSection({ onPreview }: { onPreview: (p: PreviewPatch | null) => void }) {
  const { look, setLook, preferredMode } = useTheme()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PALETTES.filter((p) => {
      if (filter === 'light' && !p.light) return false
      if (filter === 'dark' && !p.dark) return false
      if (filter !== 'all' && filter !== 'light' && filter !== 'dark' && p.category !== filter) return false
      if (!q) return true
      return `${p.name} ${p.blurb} ${CATEGORY_LABEL[p.category]} ${p.credit ?? ''}`.toLowerCase().includes(q)
    })
  }, [query, filter])

  const tileMode = (p: Palette) => resolveMode(p, filter === 'light' || filter === 'dark' ? filter : preferredMode)
  const grouped = filter === 'all' && !query.trim()

  const grid = (items: Palette[], label: string) => (
    <RadioGroup
      label={label}
      items={items}
      value={look.theme}
      onChange={(id) => setLook({ theme: id })}
      onPreview={(id) => onPreview(id ? { theme: id } : null)}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
      itemLabel={(p) => `${p.name} — ${CATEGORY_LABEL[p.category]}${p.dark && p.light ? '' : p.dark ? ', dark only' : ', light only'}`}
      itemClassName={(_, checked) =>
        cn(
          'group flex flex-col gap-2 rounded-[calc(var(--radius-card)+2px)] p-1.5 transition-[background-color,box-shadow] duration-200',
          checked
            ? 'bg-accent-brand/8 shadow-[inset_0_0_0_2px_var(--color-accent-brand)]'
            : 'hover:bg-bg-surface-2 hover:shadow-[inset_0_0_0_1px_var(--color-border)]',
        )
      }
      renderItem={(p, checked) => (
        <>
          <span className="relative block">
            <ThemeSwatch
              palette={p}
              mode={tileMode(p)}
              className="aspect-[16/10] w-full rounded-[var(--radius-card)] shadow-[0_0_0_1px_var(--color-border)] transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            {checked && (
              <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent-brand text-on-accent-brand shadow-md">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="flex items-start justify-between gap-2 px-1 pb-0.5">
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-text-primary">{p.name}</span>
              <span className="block truncate text-[11px] text-text-muted">{CATEGORY_LABEL[p.category]}</span>
            </span>
            <ModeMarks palette={p} className="mt-0.5 shrink-0" />
          </span>
        </>
      )}
    />
  )

  return (
    <div className="space-y-8">
      <Section title="Accent" hint="Use the theme’s own accent, or pick one that follows you across every theme.">
        <AccentRow onPreview={(id) => onPreview(id ? { accent: id } : null)} />
      </Section>

      <Section
        title="Themes"
        hint={`${PALETTES.length} themes, all checked against WCAG contrast in every mode.`}
        aside={
          <label className="relative flex w-full items-center sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 size-4 text-text-muted" aria-hidden="true" />
            <span className="sr-only">Search themes</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search themes"
              className="h-9 w-full rounded-[var(--radius-control)] border border-border-input bg-bg-field pr-8 pl-8 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent-brand focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="tc-focus absolute right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-md text-text-muted hover:text-text-primary"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </label>
        }
      >
        <RadioGroup
          label="Filter themes"
          items={FILTERS}
          value={filter}
          onChange={(id) => setFilter(id as Filter)}
          orientation="horizontal"
          className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
          itemClassName={(_, checked) =>
            cn(
              'h-8 shrink-0 rounded-full border px-3.5 text-[12.5px] font-medium transition-colors duration-200',
              checked
                ? 'border-transparent bg-text-primary text-bg-app'
                : 'border-border text-text-secondary hover:border-border-strong hover:text-text-primary',
            )
          }
          renderItem={(f) => f.label}
        />

        {list.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-border py-10 text-center text-sm text-text-muted">
            No theme matches “{query}”.
          </p>
        ) : grouped ? (
          <div className="space-y-8">
            {CATEGORIES.map((c) => {
              const items = list.filter((p) => p.category === c.id)
              return (
                <div key={c.id}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <h3 className="mb-0 text-[13px] font-semibold text-text-primary">{c.label}</h3>
                    <span className="text-[12px] text-text-muted">{c.hint}</span>
                  </div>
                  {grid(items, `${c.label} themes`)}
                </div>
              )
            })}
          </div>
        ) : (
          grid(list, 'Themes')
        )}
      </Section>
    </div>
  )
}
