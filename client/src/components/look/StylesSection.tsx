import { useEffect, useMemo } from 'react'
import { Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { lookAttributes, sanitizeLook, type Look } from '@/theme/look'
import { PALETTE_BY_ID, resolveMode, type ThemeMode } from '@/theme/palettes'
import { STYLES, type DesignStyle } from '@/theme/styles'
import { loadCodeFont, loadUiFont } from '@/theme/fontLoaders'
import { cn } from '@/lib/utils'
import { RadioGroup } from './controls'
import { Section } from './Section'

/** The look a style produces on top of the current one (icons and text size are kept). */
export function styleLook(look: Look, s: DesignStyle): Look {
  return sanitizeLook({ ...look, style: s.id, accent: 'theme', ...s.bundle })
}

/** True when the look still matches its style's bundle exactly. */
export function isPureStyle(look: Look): boolean {
  const s = STYLES.find((x) => x.id === look.style)
  if (!s) return false
  const b = s.bundle
  return (
    look.theme === b.theme &&
    look.font === b.font &&
    look.codeFont === b.codeFont &&
    look.radius === b.radius &&
    look.cardStyle === b.cardStyle &&
    look.pattern === b.pattern &&
    look.accent === 'theme'
  )
}

/**
 * A real miniature page in the style — its palette, faces, corners, cards and
 * pattern scoped onto its own root — so each tile shows the design language,
 * not a colour chip.
 */
export function StyleSpecimen({ look, mode, className }: { look: Look; mode: ThemeMode; className?: string }) {
  const attrs = lookAttributes(look, mode)
  return (
    <span
      {...attrs}
      aria-hidden="true"
      className={cn('pattern-surface relative block overflow-hidden bg-bg-app text-left text-text-primary', className)}
    >
      <span className="flex h-full flex-col gap-2 p-3.5 sm:p-4">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-text-primary" />
            <span className="text-[10.5px] font-semibold tracking-tight">NexoraGuru</span>
          </span>
          <span className="flex items-center gap-2 text-[9px] text-text-muted">
            <span>Learn</span>
            <span className="text-text-primary">Graphs</span>
            <span>GATE</span>
          </span>
        </span>
        <span className="block pt-1.5">
          <span className="block text-[8.5px] font-semibold tracking-[0.14em] text-accent-brand uppercase">Chapter 7</span>
          <span className="sx-h mt-0.5 block font-display text-[21px] leading-[1.08] font-semibold text-text-primary sm:text-[23px]" style={{ letterSpacing: 'var(--heading-tracking, -0.02em)' }}>
            Shortest paths
          </span>
          <span className="mt-1 block text-[10px] leading-snug text-text-secondary">Relax the nearest vertex first, then never look back.</span>
        </span>
        <span className="card mt-auto block p-2.5">
          <span className="flex items-center gap-2.5">
            <svg viewBox="0 0 60 30" className="h-7 w-14 shrink-0" aria-hidden="true">
              <path d="M6 22 L24 7 L42 20 L56 8" fill="none" stroke="var(--color-border-strong)" strokeWidth="1.2" />
              <path d="M6 22 L24 7 L42 20" fill="none" stroke="var(--color-accent-brand)" strokeWidth="2" />
              {[[6, 22], [24, 7], [42, 20], [56, 8]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3.2" fill={i < 3 ? 'var(--color-accent-brand)' : 'var(--color-bg-surface)'} stroke="var(--color-accent-brand)" strokeWidth="1.2" />
              ))}
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[9px] text-text-secondary">dist[v] = d + w</span>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-text-muted/20">
                <span className="block h-full w-2/3 rounded-full bg-accent-brand" />
              </span>
            </span>
          </span>
          <span className="mt-2.5 flex gap-1.5">
            <span data-ui="button" data-variant="primary" className="sx-btn inline-flex h-5 items-center rounded-[var(--radius-control)] bg-accent-brand px-2 text-[9px] font-semibold text-on-accent-brand">
              Start
            </span>
            <span data-ui="button" data-variant="secondary" className="sx-btn inline-flex h-5 items-center rounded-[var(--radius-control)] border border-border bg-bg-surface-2 px-2 text-[9px] font-medium text-text-primary">
              Notes
            </span>
          </span>
        </span>
      </span>
    </span>
  )
}

export function StylesSection({ onPreview }: { onPreview: (l: Look | null) => void }) {
  const { look, setLook, preferredMode } = useTheme()

  // Every specimen sets its own faces: fetch them once this section shows.
  useEffect(() => {
    for (const s of STYLES) {
      void loadUiFont(s.bundle.font)
      void loadCodeFont(s.bundle.codeFont)
      if (s.displayFont) void loadUiFont(s.displayFont)
    }
  }, [])

  const looks = useMemo(() => new Map(STYLES.map((s) => [s.id, styleLook(look, s)])), [look])
  const pure = isPureStyle(look)

  return (
    <Section
      title="Style"
      hint="A complete design language: colour, type, corners, surfaces and page pattern, made to work together."
      aside={
        !pure ? (
          <span className="text-[12px] text-text-muted" role="status">
            {STYLES.find((s) => s.id === look.style)?.name ?? 'Studio'}, customised
          </span>
        ) : undefined
      }
    >
      <RadioGroup
        label="Design style"
        items={STYLES}
        value={look.style}
        onChange={(id) => {
          const s = STYLES.find((x) => x.id === id)
          if (s) setLook(styleLook(look, s))
        }}
        onPreview={(id) => onPreview(id ? (looks.get(id) ?? null) : null)}
        className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3"
        itemLabel={(s) => `${s.name}: ${s.tagline}`}
        itemClassName={(_, checked) =>
          cn(
            'group flex flex-col gap-3 rounded-[calc(var(--radius-card)+4px)] p-1.5 transition-[background-color,box-shadow] duration-200',
            checked ? 'shadow-[inset_0_0_0_1.5px_var(--color-text-primary)]' : 'hover:bg-bg-surface-2/70',
          )
        }
        renderItem={(s, checked) => {
          const l = looks.get(s.id)!
          const p = PALETTE_BY_ID.get(l.theme)!
          return (
            <>
              <StyleSpecimen
                look={l}
                mode={resolveMode(p, preferredMode)}
                className="aspect-[5/4] w-full rounded-[var(--radius-card)] shadow-[0_0_0_1px_var(--color-border)] transition-transform duration-300 ease-[var(--ease-smooth)] group-hover:-translate-y-0.5"
              />
              <span className="flex items-start justify-between gap-3 px-1.5 pb-1">
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-text-primary">{s.name}</span>
                  <span className="block text-[12px] leading-snug text-text-muted">{s.about}</span>
                </span>
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full transition-opacity',
                    checked ? 'bg-text-primary text-bg-app opacity-100' : 'opacity-0',
                  )}
                >
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
              </span>
            </>
          )
        }}
      />
    </Section>
  )
}
