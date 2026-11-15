import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { PALETTE_BY_ID, resolveMode } from '@/theme/palettes'
import { DEFAULT_LOOK, sanitizeLook, type Look } from '@/theme/look'
import { cn } from '@/lib/utils'
import { ModeControl } from '@/components/look/controls'
import { LivePreview } from '@/components/look/LivePreview'
import { ThemesSection, type PreviewPatch } from '@/components/look/ThemesSection'
import { TypographySection } from '@/components/look/TypographySection'
import { IconsSection } from '@/components/look/IconsSection'
import { CardsSection } from '@/components/look/CardsSection'
import { StylesSection } from '@/components/look/StylesSection'
import { STYLE_BY_ID } from '@/theme/styles'
import '@/components/look/theme-centre.css'

const SECTIONS = [
  { id: 'style', label: 'Style' },
  { id: 'themes', label: 'Colour' },
  { id: 'typography', label: 'Type' },
  { id: 'cards', label: 'Surfaces' },
  { id: 'icons', label: 'Icons' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/**
 * Appearance — design styles first (a whole design language in one choice),
 * then colour, type, surfaces and icons to fine-tune, with a live miniature
 * of the app that follows every change (and every hover).
 */
export default function ThemeCentrePage() {
  const { look, setLook, preferredMode, resetLook } = useTheme()
  const [params, setParams] = useSearchParams()
  const linked = params.get('section')
  const section: SectionId = SECTIONS.some((s) => s.id === linked) ? (linked as SectionId) : 'style'
  const setSection = (id: SectionId) => setParams(id === 'style' ? {} : { section: id }, { replace: true })

  const [hover, setHover] = useState<PreviewPatch | Partial<Look> | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const previewLook: Look = useMemo(() => (hover ? sanitizeLook({ ...look, ...hover }) : look), [look, hover])
  const previewPalette = PALETTE_BY_ID.get(previewLook.theme)!
  const previewMode = resolveMode(previewPalette, preferredMode)

  const uid = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = SECTIONS.length
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault()
    setSection(SECTIONS[next].id)
    tabs.current[next]?.focus()
  }

  const reset = () => {
    const before = look
    resetLook()
    toast('Look reset to the defaults', { action: { label: 'Undo', onClick: () => setLook(before) } })
  }
  const isDefault = JSON.stringify(look) === JSON.stringify(DEFAULT_LOOK)

  return (
    <div className="tc-page pb-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="mb-0 text-[28px] leading-tight font-semibold tracking-[-0.025em] text-text-primary md:text-[34px]">Appearance</h1>
          <p className="mt-2 mb-0 max-w-xl text-[13.5px] leading-relaxed text-text-secondary">
            Pick a style, then tune it. Changes apply everywhere and follow your account.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2.5">
          <ModeControl />
          <Button variant="secondary" size="md" onClick={reset} disabled={isDefault}>
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        </div>
      </header>

      {/* Section nav */}
      <div className="sticky top-14 z-20 -mx-4 mb-7 border-b border-border bg-bg-app/90 px-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div role="tablist" aria-label="Theme Centre sections" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {SECTIONS.map((s, i) => {
              const on = s.id === section
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    tabs.current[i] = el
                  }}
                  id={`${uid}-tab-${s.id}`}
                  role="tab"
                  type="button"
                  aria-selected={on}
                  aria-controls={`${uid}-panel`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setSection(s.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={cn(
                    'tc-focus relative h-11 shrink-0 cursor-pointer px-2.5 text-[13.5px] sm:px-3.5 font-medium transition-colors hover:!scale-100',
                    on ? 'text-text-primary' : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  {s.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-brand transition-opacity duration-200',
                      on ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            aria-expanded={showPreview}
            aria-controls={`${uid}-preview`}
            aria-label={showPreview ? 'Hide live preview' : 'Show live preview'}
            className="tc-focus flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-2 text-[12.5px] font-medium text-text-secondary hover:!scale-100 hover:text-text-primary sm:px-2.5 lg:hidden"
          >
            {showPreview ? <EyeOff className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* Preview — sticky beside the content on desktop, a toggle on smaller screens */}
        <aside
          id={`${uid}-preview`}
          aria-label="Live preview"
          className={cn('lg:order-2 lg:block', showPreview ? 'block' : 'hidden')}
        >
          <div className="lg:sticky lg:top-32">
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <span className="text-[12.5px] font-medium text-text-secondary">Preview</span>
              <span className="truncate text-[12px] text-text-muted" aria-live="polite">
                {STYLE_BY_ID.get(previewLook.style)?.name ?? 'Studio'} · {previewPalette.name} · {previewMode === 'dark' ? 'Dark' : 'Light'}
                {hover ? ' · previewing' : ''}
              </span>
            </div>
            <LivePreview look={previewLook} mode={previewMode} />
            <p className="mt-3 mb-0 px-0.5 text-[11.5px] leading-relaxed text-text-muted">
              Hover or focus a choice to preview it here; click to apply.
              {previewPalette.credit && <> Palette: {previewPalette.credit}.</>}
            </p>
          </div>
        </aside>

        <div
          id={`${uid}-panel`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${section}`}
          className="tc-panel min-w-0 lg:order-1"
          key={section}
        >
          {section === 'style' && <StylesSection onPreview={setHover} />}
          {section === 'themes' && <ThemesSection onPreview={setHover} />}
          {section === 'typography' && <TypographySection />}
          {section === 'icons' && <IconsSection />}
          {section === 'cards' && <CardsSection />}
        </div>
      </div>
    </div>
  )
}
