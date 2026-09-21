import { useState, type FormEvent } from 'react'
import { Code2, Save, SlidersHorizontal, Volume2 } from 'lucide-react'
import { Button, Card, CardContent, Field, Select, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { SettingsSection, ToggleRow } from './SettingsPrimitives'

interface Prefs {
  font_size: string
  tab_size: string
  word_wrap: boolean
  minimap: boolean
  bracket_color: boolean
  time_limit: string
  auto_submit: boolean
  compact_sidebar: boolean
  show_xp: boolean
  sound: boolean
  ai_difficulty: string
  ai_hints: boolean
}

/* Legacy defaults (public/js/app.js openSettings): everything default-off except
 * bracket_color, show_xp and ai_hints which default ON. */
function fromSettings(s: Record<string, string>): Prefs {
  return {
    font_size: s.font_size || '14',
    tab_size: s.tab_size || '4',
    word_wrap: s.word_wrap === 'true',
    minimap: s.minimap === 'true',
    bracket_color: s.bracket_color !== 'false',
    time_limit: s.time_limit || '5000',
    auto_submit: s.auto_submit === 'true',
    compact_sidebar: s.compact_sidebar === 'true',
    show_xp: s.show_xp !== 'false',
    sound: s.sound === 'true',
    ai_difficulty: s.ai_difficulty || 'medium',
    ai_hints: s.ai_hints !== 'false',
  }
}

export function PreferencesForm({
  settings,
  onSaved,
}: {
  settings: Record<string, string>
  onSaved: () => void
}) {
  const toast = useToast()
  const [prefs, setPrefs] = useState<Prefs>(() => fromSettings(settings))
  const [saving, setSaving] = useState(false)

  const patch = (p: Partial<Prefs>) => setPrefs((prev) => ({ ...prev, ...p }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post<{ ok: boolean; error?: string }>('/api/settings', {
        font_size: prefs.font_size,
        tab_size: prefs.tab_size,
        word_wrap: String(prefs.word_wrap),
        minimap: String(prefs.minimap),
        bracket_color: String(prefs.bracket_color),
        time_limit: prefs.time_limit,
        auto_submit: String(prefs.auto_submit),
        compact_sidebar: String(prefs.compact_sidebar),
        show_xp: String(prefs.show_xp),
        sound: String(prefs.sound),
        ai_difficulty: prefs.ai_difficulty,
        ai_hints: String(prefs.ai_hints),
      })
      if (!res?.ok) throw new Error(res?.error ?? 'Could not save preferences')
      localStorage.setItem('nexora.sidebar', prefs.compact_sidebar ? '1' : '0')
      window.dispatchEvent(new Event('nexora:preferences'))
      toast.success('Preferences saved')
      onSaved()
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form onSubmit={onSubmit} className="space-y-6">
          <SettingsSection title="Editor" icon={<Code2 />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Font size">
                <Select
                  value={prefs.font_size}
                  onChange={(e) => patch({ font_size: e.target.value })}
                >
                  {['12', '13', '14', '15', '16', '18', '20'].map((v) => (
                    <option key={v} value={v}>
                      {v}px
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tab size">
                <Select value={prefs.tab_size} onChange={(e) => patch({ tab_size: e.target.value })}>
                  {['2', '4', '8'].map((v) => (
                    <option key={v} value={v}>
                      {v} spaces
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Time limit (judge)">
                <Select
                  value={prefs.time_limit}
                  onChange={(e) => patch({ time_limit: e.target.value })}
                >
                  <option value="2000">2 seconds</option>
                  <option value="3000">3 seconds</option>
                  <option value="5000">5 seconds</option>
                  <option value="10000">10 seconds</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <ToggleRow
                label="Word wrap"
                checked={prefs.word_wrap}
                onChange={(v) => patch({ word_wrap: v })}
              />
              <ToggleRow
                label="Minimap"
                checked={prefs.minimap}
                onChange={(v) => patch({ minimap: v })}
              />
              <ToggleRow
                label="Bracket colors"
                checked={prefs.bracket_color}
                onChange={(v) => patch({ bracket_color: v })}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="App" icon={<SlidersHorizontal />}>
            <div className="grid gap-2 sm:grid-cols-3">
              <ToggleRow
                label="Compact sidebar"
                checked={prefs.compact_sidebar}
                onChange={(v) => patch({ compact_sidebar: v })}
              />
              <ToggleRow
                label="Show XP popups"
                checked={prefs.show_xp}
                onChange={(v) => patch({ show_xp: v })}
              />
              <ToggleRow
                label="Auto-submit on AC"
                hint="Skip manual submit after all tests pass"
                checked={prefs.auto_submit}
                onChange={(v) => patch({ auto_submit: v })}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="Sound & AI" icon={<Volume2 />}>
            <div className="grid gap-2 sm:grid-cols-3">
              <ToggleRow
                label="Sound effects"
                checked={prefs.sound}
                onChange={(v) => patch({ sound: v })}
              />
              <ToggleRow
                label="AI hints"
                hint="Inline completions in the editor"
                checked={prefs.ai_hints}
                onChange={(v) => patch({ ai_hints: v })}
              />
              <Field label="AI battle difficulty">
                <Select
                  value={prefs.ai_difficulty}
                  onChange={(e) => patch({ ai_difficulty: e.target.value })}
                >
                  <option value="easy">Easy (2x solve time)</option>
                  <option value="medium">Medium (1.5x solve time)</option>
                  <option value="hard">Hard (1x solve time)</option>
                  <option value="impossible">Impossible (0.7x solve time)</option>
                </Select>
              </Field>
            </div>
          </SettingsSection>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {!saving && <Save aria-hidden="true" />} Save preferences
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
