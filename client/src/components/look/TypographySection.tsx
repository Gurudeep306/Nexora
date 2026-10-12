import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { CODE_FONTS, TEXT_SIZES, UI_FONTS } from '@/theme/fonts'
import { CODE_FONT_LOADERS, UI_FONT_LOADERS, loadCodeFont, loadUiFont } from '@/theme/fontLoaders'
import { cn } from '@/lib/utils'
import { RadioGroup, Segmented } from './controls'
import { Section } from './Section'

const KIND: Record<string, string> = {
  grotesk: 'Grotesk',
  geometric: 'Geometric',
  humanist: 'Humanist',
  serif: 'Serif',
  rounded: 'Rounded',
}

const cardClass = (checked: boolean) =>
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

export function TypographySection() {
  const { look, setLook } = useTheme()

  // Specimens need every face; this is the one place that loads them all.
  useEffect(() => {
    Object.keys(UI_FONT_LOADERS).forEach((id) => void loadUiFont(id))
    Object.keys(CODE_FONT_LOADERS).forEach((id) => void loadCodeFont(id))
  }, [])

  return (
    <div className="space-y-10">
      <Section title="Text size" hint="Scales the whole interface — text, spacing and controls together.">
        <Segmented label="Text size" items={TEXT_SIZES} value={look.textSize} onChange={(id) => setLook({ textSize: id })} />
      </Section>

      <Section title="Interface font" hint="Every face here is chosen for clarity at small sizes, each with its own personality.">
        <RadioGroup
          label="Interface font"
          items={UI_FONTS}
          value={look.font}
          onChange={(id) => setLook({ font: id })}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
          itemLabel={(f) => f.label}
          itemClassName="rounded-[var(--radius-card)]"
          renderItem={(f, checked) => (
            <span data-font={f.id} className={cardClass(checked)}>
              {checked && <Tick />}
              <span className="flex items-end gap-3">
                <span
                  className="text-[40px] leading-none font-semibold text-text-primary"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--heading-tracking, -0.02em)' }}
                >
                  Aa
                </span>
                <span className="min-w-0 pb-0.5">
                  <span className="block truncate text-[15px] font-semibold text-text-primary">{f.label}</span>
                  <span className="block text-[11px] tracking-wide text-text-muted uppercase">{KIND[f.kind]}</span>
                </span>
              </span>
              <span className="mt-3 block text-[13.5px] leading-snug text-text-secondary">
                Quick zephyrs blow, vexing daft Jim — 0O 1lI 2048
              </span>
              <span className="mt-2 block text-[11.5px] leading-relaxed text-text-muted">{f.note}</span>
            </span>
          )}
        />
      </Section>

      <Section title="Code font" hint="Used in the editor, code blocks and anywhere code appears.">
        <RadioGroup
          label="Code font"
          items={CODE_FONTS}
          value={look.codeFont}
          onChange={(id) => setLook({ codeFont: id })}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
          itemLabel={(f) => f.label}
          itemClassName="rounded-[var(--radius-card)]"
          renderItem={(f, checked) => (
            <span data-code-font={f.id} className={cardClass(checked)}>
              {checked && <Tick />}
              <span className="block text-[14px] font-semibold text-text-primary">{f.label}</span>
              <span className="block text-[11.5px] text-text-muted">
                {f.note}
                {f.ligatures && ' Ligatures on.'}
              </span>
              <code className="mt-3 block rounded-[var(--radius-control)] bg-[var(--color-code-bg)] px-3 py-2.5 text-[12.5px] leading-relaxed whitespace-pre">
                <span className="text-[var(--color-syntax-keyword)]">if</span> (a !== b {'&&'} i {'<='} n) {'{'}
                {'\n  '}
                <span className="text-[var(--color-syntax-keyword)]">return</span>{' '}
                <span className="text-[var(--color-syntax-function)]">fn</span>(x) =&gt; x * <span className="text-[var(--color-syntax-number)]">0x1F</span>
                {'\n}'}
              </code>
            </span>
          )}
        />
      </Section>
    </div>
  )
}
