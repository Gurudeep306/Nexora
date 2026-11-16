import { useEffect, type KeyboardEvent } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { DEFAULT_LOOK } from '@/theme/look'
import { THEMES } from '@/theme/styles'
import { loadUiFont } from '@/theme/fontLoaders'
import { ModeControl } from '@/components/look/controls'
import { ThemeCard } from '@/components/look/ThemeCard'
import { FineTuneSection } from '@/components/look/FineTuneSection'
import '@/components/look/theme-centre.css'

/**
 * Appearance: ten themes, each a whole design (paper, ink, type, drawings,
 * icons and shapes), then three personal settings that sit on top of any
 * theme. Each card is a real specimen of its theme, so what you see is what
 * every page will look like.
 */
export default function ThemeCentrePage() {
  const { look, setLook, preferredMode, resetLook } = useTheme()

  // The cards are specimens: they need every theme's faces.
  useEffect(() => {
    for (const t of THEMES) for (const f of [t.bundle.font, t.displayFont, t.readFont]) if (f) void loadUiFont(f)
  }, [])

  const choose = (i: number) => {
    const t = THEMES[i]
    if (!t || t.id === look.style) return
    const before = look
    // A new theme brings new type, so everything above the card can change
    // height. Keep the card you clicked exactly where it was on screen.
    const card = document.querySelectorAll<HTMLElement>('.tc-grid [role="radio"]')[i]
    const top = card?.getBoundingClientRect().top
    setLook({ style: t.id })
    if (card && top != null) {
      const settle = () => window.scrollBy(0, card.getBoundingClientRect().top - top)
      requestAnimationFrame(() => requestAnimationFrame(settle))
      void document.fonts?.ready.then(() => requestAnimationFrame(settle))
    }
    toast(`${t.name} is on`, { description: t.tagline, action: { label: 'Undo', onClick: () => setLook(before) } })
  }
  // A radio group: arrows move between themes.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cards = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
    const i = cards.findIndex((c) => c === document.activeElement)
    if (i < 0) return
    const n = THEMES.length
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault()
    cards[next]?.focus()
  }

  const reset = () => {
    const before = look
    resetLook()
    toast('Back to Field Journal with the default settings', { action: { label: 'Undo', onClick: () => setLook(before) } })
  }
  const isDefault = JSON.stringify(look) === JSON.stringify(DEFAULT_LOOK)
  const current = THEMES.find((t) => t.id === look.style) ?? THEMES[0]

  return (
    <div className="tc-page pb-10">
      <header data-ui="page-header" className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p data-ui="eyebrow" className="ed-label">
            Appearance
          </p>
          <h1 data-ui="page-title" className="ed-title mt-2">
            Choose your theme
          </h1>
          <p className="ed-lead mt-2 max-w-2xl">
            Ten themes, each with its own paper, ink, type, drawings and icons. Every page works in all of them, in light and dark. You&rsquo;re using {current.name}.
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

      <section aria-labelledby="tc-themes">
        <h2 id="tc-themes" className="sr-only">
          Themes
        </h2>
        <div role="radiogroup" aria-label="Theme" className="tc-grid" onKeyDown={onKey}>
          {THEMES.map((t, i) => (
            <ThemeCard key={t.id} theme={t} look={look} preferred={preferredMode} checked={t.id === look.style} tabIndex={t.id === current.id ? 0 : -1} onChoose={() => choose(i)} />
          ))}
        </div>
      </section>

      <section aria-labelledby="tc-tune" className="mt-16">
        <p className="ed-label">On top of any theme</p>
        <h2 id="tc-tune" className="ed-h2 mt-2">
          Fine-tune
        </h2>
        <p className="ed-body-sm mt-1 mb-6 max-w-2xl text-text-secondary">These three follow you from theme to theme.</p>
        <FineTuneSection />
      </section>
    </div>
  )
}
