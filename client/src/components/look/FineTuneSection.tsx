import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { CODE_FONTS, SOLUTION_FONTS, TEXT_SIZES } from '@/theme/fonts'
import { CODE_FONT_LOADERS, SOLUTION_FONT_LOADERS, loadCodeFont, loadSolutionFont } from '@/theme/fontLoaders'
import { cn } from '@/lib/utils'
import { RadioGroup, Segmented } from './controls'
import { Section } from './Section'


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

/** The settings that sit on top of any theme: text size, code font, solution handwriting. */
export function FineTuneSection() {
  const { look, setLook } = useTheme()

  // Specimens need every face; this is the one place that loads them all.
  useEffect(() => {
    Object.keys(CODE_FONT_LOADERS).forEach((id) => void loadCodeFont(id))
    Object.keys(SOLUTION_FONT_LOADERS).forEach((id) => void loadSolutionFont(id))
  }, [])

  return (
    <div className="space-y-10">
      <Section title="Text size" hint="Scales the whole interface — text, spacing and controls together.">
        <Segmented label="Text size" items={TEXT_SIZES} value={look.textSize} onChange={(id) => setLook({ textSize: id })} />
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

      <Section title="Solution handwriting" hint="GATE worked solutions read like notes from a tutor. Maths, code and the animations keep their usual fonts.">
        <RadioGroup
          label="Solution handwriting"
          items={SOLUTION_FONTS}
          value={look.solutionFont}
          onChange={(id) => setLook({ solutionFont: id })}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
          itemLabel={(f) => (f.id === 'off' ? 'Off — use the interface font' : f.label)}
          itemClassName="rounded-[var(--radius-card)]"
          renderItem={(f, checked) => (
            <span data-solution-font={f.id} className={cardClass(checked)}>
              {checked && <Tick />}
              <span className="block pr-7 text-[14px] font-semibold text-text-primary">{f.id === 'off' ? 'Off' : f.label}</span>
              <span className="block text-[11.5px] leading-snug text-text-muted">{f.note}</span>
              <span
                className="mt-3 block rounded-[var(--radius-control)] border border-border/70 bg-bg-surface-2/60 px-3 py-2.5 text-text-primary"
                style={{
                  fontFamily: 'var(--font-solution)',
                  fontSize: 'calc(14px * var(--solution-scale, 1))',
                  lineHeight: 'var(--solution-leading)',
                  letterSpacing: 'var(--solution-tracking)',
                  fontWeight: 'var(--solution-weight)',
                  fontVariationSettings: 'var(--solution-variation)',
                }}
              >
                <span style={{ fontWeight: 'calc(var(--solution-weight) + 180)' }}>Step 2 — relax the edges out of S:</span>{' '}
                d(A) = 0 + 4 = 4, so A is now final.
              </span>
            </span>
          )}
        />
      </Section>
    </div>
  )
}
