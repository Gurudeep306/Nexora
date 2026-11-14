import { useState, type ReactNode } from 'react'
import { useTheme, type Appearance } from '@/context/ThemeContext'
import { Button } from '@/components/ui'
import { SegmentedControl, useDensity, writeDensity, type Density } from '../kit'
import { singleKeysOn } from '../Shortcuts'

export default function SettingsPage() {
  const { appearance, setAppearance, modeLocked } = useTheme()
  const density = useDensity()
  const [keys, setKeys] = useState(singleKeysOn)
  const toggleKeys = () => {
    const v = !keys
    setKeys(v)
    try {
      localStorage.setItem('hive:singleKeys', v ? '1' : '0')
    } catch {
      /* private mode */
    }
  }
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-6 sm:px-6">
      <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[var(--hv-text-1)]">Settings</h1>
      <p className="mt-1 text-[13px] text-[var(--hv-text-3)]">How Hive looks and behaves for you, in this browser.</p>

      <Section title="Appearance">
        <Setting label="Theme" hint={modeLocked ? 'Your site theme has a single mode, so this follows it.' : 'System follows your device.'}>
          <SegmentedControl
            size="sm"
            label="Theme"
            value={appearance}
            onChange={(v) => setAppearance(v as Appearance)}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
        </Setting>
        <Setting label="Density" hint="Compact fits more rows on screen.">
          <SegmentedControl
            size="sm"
            label="Density"
            value={density}
            onChange={(v) => writeDensity(v as Density)}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </Setting>
        <Setting label="Motion" hint="Hive follows your device's “reduce motion” setting: animations are switched off when it is on.">
          <span className="text-[12.5px] text-[var(--hv-text-3)]">Follows your device</span>
        </Setting>
      </Section>

      <Section title="Keyboard">
        <Setting label="Single-key shortcuts" hint="C for a new task, G then a letter to go somewhere, / to search, [ to fold the sidebar, ? for the list.">
          <label className="inline-flex items-center gap-2 text-[13px] text-[var(--hv-text-1)]">
            <input type="checkbox" checked={keys} onChange={toggleKeys} className="size-4 accent-[var(--hv-accent)]" />
            {keys ? 'On' : 'Off'}
          </label>
        </Setting>
        <Setting label="All shortcuts" hint="⌘K search · ⌘I Copilot · ⌘J new chat · ⌘B sidebar">
          <Button size="sm" variant="secondary" onClick={() => window.dispatchEvent(new Event('hive:shortcuts'))}>
            Show the list
          </Button>
        </Setting>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="mb-2 px-1 text-[13px] font-semibold text-[var(--hv-text-1)]">{title}</h2>
      <div className="divide-y divide-[var(--hv-border-subtle)] rounded-[var(--hv-r-card)] border border-[var(--hv-border)] bg-[var(--hv-surface-1)]">{children}</div>
    </section>
  )
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-[var(--hv-text-1)]">{label}</div>
        {hint && <div className="text-[12px] text-[var(--hv-text-3)]">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
