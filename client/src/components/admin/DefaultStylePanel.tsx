import { useState } from 'react'
import { Check } from 'lucide-react'
import { useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useSite } from '@/context/SiteContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { DEFAULT_STYLE, THEMES } from '@/theme/styles'
import { ThemeSpecimen } from '@/components/look/ThemeCard'
import { themeMode } from '@/components/look/themeLook'
import { Panel } from './kit'

/** Admin → Site: the theme visitors see until they choose their own. */
export function DefaultStylePanel() {
  const toast = useToast()
  const { status, refresh } = useSite()
  const { look, preferredMode } = useTheme()
  const [busy, setBusy] = useState<string | null>(null)
  // No setting means the house style (Field Journal).
  const current = status?.defaultStyle ?? DEFAULT_STYLE

  const save = async (id: string) => {
    setBusy(id)
    try {
      await api.put('/api/admin/site/default-style', { style: id === DEFAULT_STYLE ? null : id })
      toast.success('Default theme saved', 'New visitors see it from their next page load.')
      void refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel title="Default theme" description="What visitors see before they choose their own theme. People who already picked one keep theirs." icon="palette">
      <div role="radiogroup" aria-label="Default theme" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {THEMES.map((s) => {
          const on = current === s.id
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy !== null}
              onClick={() => void save(s.id)}
              className={cn('flex flex-col gap-2 rounded-[calc(var(--radius-card)+2px)] p-1.5 text-left transition-colors', on ? 'shadow-[inset_0_0_0_1.5px_var(--color-text-primary)]' : 'hover:bg-bg-surface-2')}
            >
              <ThemeSpecimen theme={s} look={look} mode={themeMode(s, preferredMode)} compact className="w-full rounded-[calc(var(--radius-card)-4px)] shadow-[0_0_0_1px_var(--color-border)]" />
              <span className="flex items-center justify-between px-1 text-[12.5px] font-medium text-text-primary">
                {s.name}
                {on && <Check className="size-3.5" aria-hidden="true" />}
              </span>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
