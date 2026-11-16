import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { Tabs } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { ACCENTS, INKS } from '@/theme/palettes'
import { HEADING_FACES, READ_FACES, UI_FONTS, UI_FONT_PICKS, faceStack, uiFontStacks } from '@/theme/fonts'
import { loadUiFont } from '@/theme/fontLoaders'
import { STYLE_BY_ID } from '@/theme/styles'
import { cn } from '@/lib/utils'
import { tStandard } from '@/lib/motion'
import { DockEditor } from '@/components/layout/DockEditor'
import { DOCK_POSITIONS, DOCK_SIZES, DOCK_SURFACES, setDock, useDock } from '@/components/layout/dockStore'
import { RadioGroup, Segmented } from './controls'
import { Section } from './Section'
import { FineTuneSection } from './FineTuneSection'
import './make-it-yours.css'

type Tab = 'colour' | 'type' | 'shape' | 'dock'
const TABS: { id: Tab; label: string }[] = [
  { id: 'colour', label: 'Colour' },
  { id: 'type', label: 'Type' },
  { id: 'shape', label: 'Shape' },
  { id: 'dock', label: 'Dock' },
]

/** A tick in the corner of the chosen card. */
function Tick({ low = false }: { low?: boolean }) {
  return (
    <span className={cn('miy-tick', low && 'is-low')} aria-hidden="true">
      <Check className="size-3" strokeWidth={3} />
    </span>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn('miy-switch', on && 'is-on')}>
      <motion.span layout transition={tStandard} className="miy-switch-knob" />
    </button>
  )
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="miy-row">
      <div className="min-w-0">
        <p className="miy-row-title m-0">{title}</p>
        {hint && <p className="miy-row-hint m-0">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * Make it yours: the personal layer on top of any theme — accent and text
 * colour, the interface, heading and reading faces, corners and drawings,
 * and the Dock. A live specimen beside it shows the result as you choose.
 */
export function MakeItYours() {
  const { look, setLook, mode } = useTheme()
  const [tab, setTab] = useState<Tab>('colour')
  const theme = STYLE_BY_ID.get(look.style)
  const themeName = theme?.name ?? 'the theme'

  // The type cards are specimens: load their faces once the tab opens.
  useEffect(() => {
    if (tab !== 'type') return
    for (const id of new Set([...UI_FONT_PICKS, ...HEADING_FACES.map((f) => f.id), ...READ_FACES.map((f) => f.id)])) void loadUiFont(id)
  }, [tab])

  return (
    <div className="miy">
      <div className="miy-controls min-w-0">
        <Tabs items={TABS} active={tab} onChange={(id) => setTab(id as Tab)} />
        <div className="mt-8 space-y-10">
          {tab === 'colour' && (
            <>
              <Section title="Accent" hint="Buttons, links and the current page. Every colour is checked for contrast on every theme.">
                <RadioGroup
                  label="Accent colour"
                  items={[{ id: 'theme', label: `${themeName}'s own` }, ...ACCENTS]}
                  value={look.accent}
                  onChange={(id) => setLook({ accent: id })}
                  className="miy-accents"
                  itemLabel={(a) => a.label}
                  itemClassName={(_, checked) => cn('miy-accent', checked && 'is-on')}
                  renderItem={(a, checked) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={cn('miy-accent-dot', a.id === 'theme' && 'is-own')}
                        data-palette={a.id === 'theme' ? look.theme : undefined}
                        data-accent={a.id === 'theme' ? undefined : a.id}
                        data-mode={mode}
                      >
                        {checked && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="miy-accent-name">{a.id === 'theme' ? 'Theme' : a.label}</span>
                    </>
                  )}
                />
              </Section>

              <Section title="Text colour" hint="The ink the words are written in. Every option stays easy to read, muted text included.">
                <RadioGroup
                  label="Text colour"
                  items={[{ id: 'theme', label: `${themeName}'s own`, note: 'The ink the theme was drawn with' }, ...INKS]}
                  value={look.ink}
                  onChange={(id) => setLook({ ink: id })}
                  className="miy-grid-3"
                  itemLabel={(i) => i.label}
                  itemClassName="rounded-[var(--radius-card)]"
                  renderItem={(i, checked) => (
                    <span
                      className={cn('miy-card miy-ink', checked && 'is-on')}
                      data-palette={i.id === 'theme' ? look.theme : undefined}
                      data-ink={i.id === 'theme' ? undefined : i.id}
                      data-mode={mode}
                    >
                      {checked && <Tick />}
                      <span className="miy-ink-head">{i.label}</span>
                      <span className="miy-ink-body">Relax the nearest vertex first.</span>
                      <span className="miy-ink-muted">{i.note}</span>
                    </span>
                  )}
                />
              </Section>
            </>
          )}

          {tab === 'type' && (
            <>
              <Section title="Interface" hint="Menus, buttons, labels and everything that isn't a heading or long reading.">
                <RadioGroup
                  label="Interface font"
                  items={[{ id: 'theme', label: `${themeName}'s own` }, ...UI_FONTS.filter((f) => UI_FONT_PICKS.includes(f.id))]}
                  value={look.uiFont}
                  onChange={(id) => setLook({ uiFont: id })}
                  className="miy-grid-4"
                  itemLabel={(f) => f.label}
                  itemClassName="rounded-[var(--radius-card)]"
                  renderItem={(f, checked) => (
                    <span className={cn('miy-card miy-face', checked && 'is-on')}>
                      {checked && <Tick />}
                      <span className="miy-face-aa" style={{ fontFamily: uiFontStacks(UI_FONTS.find((u) => u.id === (f.id === 'theme' ? (theme?.bundle.font ?? 'geist') : f.id)) ?? UI_FONTS[0]).body }}>
                        Aa
                      </span>
                      <span className="miy-face-name">{f.id === 'theme' ? 'Theme' : f.label}</span>
                    </span>
                  )}
                />
              </Section>

              <Section title="Headings" hint="Page titles and section headings.">
                <RadioGroup
                  label="Heading font"
                  items={[{ id: 'theme', label: `${themeName}'s own`, note: 'As the theme sets them' }, ...HEADING_FACES]}
                  value={look.headingFont}
                  onChange={(id) => setLook({ headingFont: id })}
                  className="miy-grid-3"
                  itemLabel={(f) => f.label}
                  itemClassName="rounded-[var(--radius-card)]"
                  renderItem={(f, checked) => (
                    <span className={cn('miy-card', checked && 'is-on')}>
                      {checked && <Tick />}
                      <span className="miy-head-sample" style={{ fontFamily: f.id === 'theme' ? 'var(--kit-display, var(--font-display))' : faceStack(f.id) }}>
                        Shortest paths
                      </span>
                      <span className="miy-face-name">{f.id === 'theme' ? 'Theme' : f.label}</span>
                      <span className="miy-note">{f.note}</span>
                    </span>
                  )}
                />
              </Section>

              <Section title="Reading" hint="Lessons, notes and worked solutions — the long text.">
                <RadioGroup
                  label="Reading font"
                  items={[{ id: 'theme', label: `${themeName}'s own`, note: 'As the theme sets it' }, ...READ_FACES]}
                  value={look.readFont}
                  onChange={(id) => setLook({ readFont: id })}
                  className="miy-grid-3"
                  itemLabel={(f) => f.label}
                  itemClassName="rounded-[var(--radius-card)]"
                  renderItem={(f, checked) => (
                    <span className={cn('miy-card', checked && 'is-on')}>
                      {checked && <Tick />}
                      <span className="miy-read-sample" style={{ fontFamily: f.id === 'theme' ? 'var(--kit-read, var(--font-body))' : faceStack(f.id) }}>
                        A graph is a set of points joined by lines. Breadth-first search visits them ring by ring.
                      </span>
                      <span className="miy-face-name">{f.id === 'theme' ? 'Theme' : f.label}</span>
                      <span className="miy-note">{f.note}</span>
                    </span>
                  )}
                />
              </Section>

              <FineTuneSection />
            </>
          )}

          {tab === 'shape' && (
            <>
              <Section title="Corners" hint="How round cards, buttons and fields are.">
                <RadioGroup
                  label="Corners"
                  items={[
                    { id: 'theme', label: `${themeName}'s own` },
                    { id: 'sharp', label: 'Sharp' },
                    { id: 'soft', label: 'Soft' },
                    { id: 'round', label: 'Round' },
                  ]}
                  value={look.corners}
                  onChange={(id) => setLook({ corners: id })}
                  className="miy-grid-4"
                  itemLabel={(c) => c.label}
                  itemClassName="rounded-[var(--radius-card)]"
                  renderItem={(c, checked) => (
                    <span className={cn('miy-card miy-corner', checked && 'is-on')} data-corners={c.id === 'theme' ? undefined : c.id} data-mode={c.id === 'theme' ? undefined : mode}>
                      {checked && <Tick low />}
                      <span className="miy-corner-card">
                        <span className="miy-corner-line" />
                        <span className="miy-corner-line is-short" />
                        <span className="miy-corner-btn" />
                      </span>
                      <span className="miy-face-name">{c.id === 'theme' ? 'Theme' : c.label}</span>
                    </span>
                  )}
                />
              </Section>
              <Section title="Drawings" hint={`${themeName}'s drawings in the margins behind the page.`}>
                <Segmented
                  label="Drawings"
                  items={[
                    { id: 'theme', label: 'Show' },
                    { id: 'off', label: 'Hide' },
                  ]}
                  value={look.drawings}
                  onChange={(id) => setLook({ drawings: id })}
                />
              </Section>
            </>
          )}

          {tab === 'dock' && <DockSettings />}
        </div>
      </div>

      <Preview />
    </div>
  )
}

/** The Dock: where it sits, how big, how it shows names, and its bar. */
function DockSettings() {
  const dock = useDock()
  const [editing, setEditing] = useState(false)
  return (
    <>
      <p className="miy-row-hint -mt-2 mb-0">On a computer or tablet. Phones keep the tab bar along the bottom.</p>
      <Section title="Position" hint="Which edge of the screen it sits on.">
        <RadioGroup
          label="Dock position"
          items={DOCK_POSITIONS}
          value={dock.position}
          onChange={(id) => setDock({ position: id as typeof dock.position })}
          className="miy-grid-3"
          itemLabel={(p) => p.label}
          itemClassName="rounded-[var(--radius-card)]"
          renderItem={(p, checked) => (
            <span className={cn('miy-card miy-screen-card', checked && 'is-on')}>
              {checked && <Tick low />}
              <span className="miy-screen" data-pos={p.id}>
                <span className="miy-screen-bar" />
              </span>
              <span className="miy-face-name">{p.label}</span>
            </span>
          )}
        />
      </Section>

      <Section title="Bar" hint="The bar behind the icons.">
        <RadioGroup
          label="Dock bar"
          items={DOCK_SURFACES}
          value={dock.surface}
          onChange={(id) => setDock({ surface: id as typeof dock.surface })}
          className="miy-grid-3"
          itemLabel={(s) => s.label}
          itemClassName="rounded-[var(--radius-card)]"
          renderItem={(s, checked) => (
            <span className={cn('miy-card', checked && 'is-on')}>
              {checked && <Tick low />}
              <span className="miy-bar" data-surface={s.id}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn('miy-bar-icon', i === 0 && 'is-on')} />
                ))}
              </span>
              <span className="miy-face-name">{s.label}</span>
            </span>
          )}
        />
      </Section>

      <div className="miy-rows">
        <Row title="Size" hint="How big the icons rest.">
          <Segmented label="Dock size" items={DOCK_SIZES} value={dock.size} onChange={(id) => setDock({ size: id as typeof dock.size })} size="sm" />
        </Row>
        <Row title="Names" hint="Show each place's name under its icon, or only on hover.">
          <Segmented
            label="Dock names"
            items={[
              { id: 'hover', label: 'On hover' },
              { id: 'always', label: 'Always' },
            ]}
            value={dock.labels}
            onChange={(id) => setDock({ labels: id as typeof dock.labels })}
            size="sm"
          />
        </Row>
        <Row title="Magnify" hint="Icons swell under the pointer.">
          <Switch on={dock.magnify} onChange={(magnify) => setDock({ magnify })} label="Magnify" />
        </Row>
        <Row title="Colour icons" hint="A coloured tile for each place, instead of plain ink.">
          <Switch on={dock.iconStyle === 'colour'} onChange={(c) => setDock({ iconStyle: c ? 'colour' : 'mono' })} label="Colour icons" />
        </Row>
        <Row title="Hide until needed" hint="The Dock slides away and comes back when the pointer nears its edge.">
          <Switch on={dock.autoHide} onChange={(autoHide) => setDock({ autoHide })} label="Hide until needed" />
        </Row>
        <Row title="Icons" hint="Choose which places are in the Dock, and their order.">
          <button type="button" className="ed-btn ed-btn-sm miy-choose" onClick={() => setEditing(true)}>
            Choose icons…
          </button>
        </Row>
      </div>
      <DockEditor open={editing} onClose={() => setEditing(false)} />
    </>
  )
}

/** A live specimen of the look: what every page will now use. */
function Preview() {
  return (
    <div className="miy-preview" role="group" aria-label="Preview">
      <p className="ed-label ed-muted m-0">Preview</p>
      <div className="miy-specimen">
        <p className="miy-spec-kicker m-0">Chapter VII · Graphs</p>
        <h3 className="miy-spec-title">Shortest paths</h3>
        <p className="miy-spec-read">Dijkstra’s algorithm settles the nearest vertex first, then never looks back. Each step relaxes the edges leaving it.</p>
        <p className="miy-spec-muted m-0">12 min read · 4 practice questions</p>
        <div className="miy-spec-actions">
          <span className="miy-spec-btn">Start lesson</span>
          <span className="miy-spec-link">Notes</span>
        </div>
        <code className="miy-spec-code">dist[v] = min(dist[v], dist[u] + w)</code>
      </div>
    </div>
  )
}
