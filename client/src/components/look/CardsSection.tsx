import { Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { CARD_STYLES, RADII } from '@/theme/cards'
import { PATTERNS } from '@/theme/styles'
import { cn } from '@/lib/utils'
import { RadioGroup, Segmented } from './controls'
import { Section } from './Section'

export function CardsSection() {
  const { look, setLook } = useTheme()
  return (
    <div className="space-y-10">
      <Section title="Page pattern" hint="Drawn faintly behind every page, in the theme’s own ink.">
        <RadioGroup
          label="Page pattern"
          items={PATTERNS}
          value={look.pattern}
          onChange={(id) => setLook({ pattern: id })}
          className="grid grid-cols-2 gap-3 min-[560px]:grid-cols-4 xl:grid-cols-7"
          itemLabel={(p) => `${p.label}: ${p.hint}`}
          itemClassName={(_, checked) =>
            cn(
              'group flex flex-col gap-2 rounded-[calc(var(--radius-card)+4px)] p-1.5 transition-[background-color,box-shadow] duration-200',
              checked ? 'shadow-[inset_0_0_0_1.5px_var(--color-text-primary)]' : 'hover:bg-bg-surface-2/70',
            )
          }
          renderItem={(p) => (
            <>
              <span
                data-pattern={p.id}
                className="pattern-surface block aspect-square w-full rounded-[var(--radius-card)] bg-bg-app shadow-[0_0_0_1px_var(--color-border)]"
              />
              <span className="block px-1 text-[12.5px] font-medium text-text-primary">{p.label}</span>
            </>
          )}
        />
      </Section>

      <Section title="Corners" hint="Sharp, rounded or round — applies to cards, controls and sheets.">
        <Segmented label="Corner radius" items={RADII} value={look.radius} onChange={(id) => setLook({ radius: id })} />
      </Section>

      <Section title="Card style" hint="Every panel in the app follows this. Each style is built from the theme’s own colours.">
        <RadioGroup
          label="Card style"
          items={CARD_STYLES}
          value={look.cardStyle}
          onChange={(id) => setLook({ cardStyle: id })}
          className="grid grid-cols-1 gap-x-4 gap-y-5 min-[440px]:grid-cols-2 xl:grid-cols-4"
          itemLabel={(c) => c.label}
          itemClassName={(_, checked) =>
            cn(
              'group flex flex-col gap-2.5 rounded-[calc(var(--radius-card)+6px)] p-2 transition-[background-color,box-shadow] duration-200',
              checked ? 'bg-accent-brand/8 shadow-[inset_0_0_0_2px_var(--color-accent-brand)]' : 'hover:bg-bg-surface-2/70',
            )
          }
          renderItem={(c, checked) => (
            <>
              {/* A real .card, scoped to this style. */}
              <span data-card-style={c.id} className="block rounded-[var(--radius-card)] bg-bg-app p-3">
                <span className="card block space-y-2 p-3">
                  <span className="flex items-center justify-between">
                    <span className="h-2 w-16 rounded-full bg-text-primary/85" />
                    <span className="h-3.5 w-9 rounded-full bg-accent-brand/20" />
                  </span>
                  <span className="block h-1.5 w-full rounded-full bg-text-muted/35" />
                  <span className="block h-1.5 w-3/4 rounded-full bg-text-muted/35" />
                  <span className="flex gap-1.5 pt-1">
                    <span className="h-5 w-12 rounded-[var(--radius-control)] bg-accent-brand" />
                    <span className="h-5 w-10 rounded-[var(--radius-control)] border border-border bg-bg-surface-2" />
                  </span>
                </span>
              </span>
              <span className="flex items-start justify-between gap-2 px-1">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-text-primary">{c.label}</span>
                  <span className="block text-[11.5px] leading-snug text-text-muted">{c.hint}</span>
                </span>
                {checked && (
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-brand text-on-accent-brand">
                    <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </span>
            </>
          )}
        />
      </Section>
    </div>
  )
}
