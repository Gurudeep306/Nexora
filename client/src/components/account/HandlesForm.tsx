import { useState, type FormEvent } from 'react'
import { Link2, Save } from 'lucide-react'
import { Button, Card, CardContent, Field, Input, Select, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { SettingsSection } from './SettingsPrimitives'
import { PLATFORM_HANDLE_KEYS, type LanguageOption } from './types'

export function HandlesForm({
  settings,
  languages,
  onSaved,
}: {
  settings: Record<string, string>
  languages: LanguageOption[]
  onSaved: () => void
}) {
  const toast = useToast()
  const [handles, setHandles] = useState<Record<string, string>>(() =>
    Object.fromEntries(PLATFORM_HANDLE_KEYS.map((h) => [h.key, settings[h.key] ?? ''])),
  )
  const [defaultLang, setDefaultLang] = useState(settings.default_lang ?? 'cpp')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post<{ ok: boolean; error?: string }>('/api/settings', {
        ...handles,
        default_lang: defaultLang,
      })
      if (!res?.ok) throw new Error(res?.error ?? 'Could not save handles')
      toast.success('Platform links saved')
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
        <form onSubmit={onSubmit} className="space-y-5">
          <SettingsSection
            title="Platform handles"
            description="Used by solved-import sync and profile links. Note: preferences are stored server-side per instance."
            icon={<Link2 />}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {PLATFORM_HANDLE_KEYS.map((h) => (
                <Field key={h.key} label={`${h.label} handle`}>
                  <Input
                    value={handles[h.key] ?? ''}
                    onChange={(e) => setHandles((prev) => ({ ...prev, [h.key]: e.target.value.trim() }))}
                    placeholder="e.g. tourist"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
              ))}
            </div>
            <Field label="Default language" hint="Preselected in the solve editor.">
              <Select
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value)}
                className="sm:max-w-64"
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                    {l.compiled ? '' : ' (interpreted)'}
                  </option>
                ))}
                {languages.length > 0 && !languages.some((l) => l.id === defaultLang) && (
                  <option value={defaultLang}>{defaultLang}</option>
                )}
              </Select>
            </Field>
          </SettingsSection>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {!saving && <Save aria-hidden="true" />} Save handles
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
