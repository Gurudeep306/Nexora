import { Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { Icon, IconBadge } from '@/components/icon/Icon'
import { CORE_ICON_NAMES, ICON_CONTAINERS, ICON_SETS, ICON_SHAPES, findIconSet, type IconSetId } from '@/theme/iconCatalog'
import { cn } from '@/lib/utils'
import { RadioGroup, Segmented } from './controls'
import { Section } from './Section'

const tile = (checked: boolean) =>
  cn(
    'relative flex h-full flex-col rounded-[var(--radius-card)] border bg-bg-surface p-4 transition-[border-color,box-shadow,background-color] duration-200',
    checked
      ? 'border-accent-brand shadow-[0_0_0_1px_var(--color-accent-brand),var(--elev-1)]'
      : 'border-border hover:border-border-strong hover:bg-bg-surface-2/60',
  )

function Tick() {
  return (
    <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-accent-brand text-on-accent-brand">
      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
    </span>
  )
}

export function IconsSection() {
  const { look, setLook } = useTheme()
  const current = findIconSet(look.iconSet)

  return (
    <div className="space-y-10">
      <Section title="Icon set" hint="Six hand-drawn families. Each previews its own glyphs below.">
        <RadioGroup
          label="Icon set"
          items={ICON_SETS}
          value={look.iconSet}
          onChange={(id) => setLook({ iconSet: id, iconStyle: findIconSet(id).defaultStyle })}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
          itemLabel={(s) => s.label}
          itemClassName="rounded-[var(--radius-card)]"
          renderItem={(s, checked) => {
            const style = checked ? look.iconStyle : s.defaultStyle
            return (
              <span className={tile(checked)}>
                {checked && <Tick />}
                <span className="block text-[14px] font-semibold text-text-primary">{s.label}</span>
                <span className="block text-[11.5px] text-text-muted">{s.description}</span>
                <span className="mt-3.5 grid grid-cols-8 gap-x-2 gap-y-3 text-text-secondary" aria-hidden="true">
                  {CORE_ICON_NAMES.map((n) => (
                    <Icon key={n} name={n} set={s.id as IconSetId} style={style} className="size-[18px]" />
                  ))}
                </span>
              </span>
            )
          }}
        />
        {current.styles.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[12.5px] font-medium text-text-secondary">{current.label} style</span>
            <Segmented
              label={`${current.label} style`}
              items={current.styles}
              value={look.iconStyle}
              onChange={(id) => setLook({ iconStyle: id })}
              size="sm"
            />
          </div>
        )}
      </Section>

      <Section title="Container" hint="The tile drawn behind icons in cards, the launcher and stats.">
        <RadioGroup
          label="Icon container"
          items={ICON_CONTAINERS}
          value={look.iconContainer}
          onChange={(id) => setLook({ iconContainer: id })}
          orientation="horizontal"
          className="grid grid-cols-3 gap-3 sm:grid-cols-5"
          itemLabel={(c) => c.label}
          itemClassName="rounded-[var(--radius-card)]"
          renderItem={(c, checked) => (
            <span className={cn(tile(checked), 'items-center gap-2.5 px-2 py-4')}>
              <span data-icon-container={c.id} data-icon-shape={look.iconShape} className="flex">
                <IconBadge name="sparkles" set={look.iconSet as IconSetId} style={look.iconStyle} boxClassName="size-11" />
              </span>
              <span className="text-[12.5px] font-medium text-text-primary">{c.label}</span>
            </span>
          )}
        />
      </Section>

      <Section title="Shape">
        <RadioGroup
          label="Icon shape"
          items={ICON_SHAPES}
          value={look.iconShape}
          onChange={(id) => setLook({ iconShape: id })}
          orientation="horizontal"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          itemLabel={(s) => s.label}
          itemClassName="rounded-[var(--radius-card)]"
          renderItem={(s, checked) => (
            <span className={cn(tile(checked), 'items-center gap-2.5 px-2 py-4')}>
              <span data-icon-shape={s.id} data-icon-container={look.iconContainer === 'none' ? 'soft' : look.iconContainer} className="flex">
                <IconBadge name="book" set={look.iconSet as IconSetId} style={look.iconStyle} boxClassName="size-11" />
              </span>
              <span className="text-[12.5px] font-medium text-text-primary">{s.label}</span>
            </span>
          )}
        />
      </Section>
    </div>
  )
}
