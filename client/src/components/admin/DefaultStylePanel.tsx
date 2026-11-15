import { useState } from 'react'
import { Check } from 'lucide-react'
import { useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useSite } from '@/context/SiteContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { DEFAULT_STYLE, STYLES } from '@/theme/styles'
import { PALETTE_BY_ID, resolveMode } from '@/theme/palettes'
import { StyleSpecimen, styleLook } from '@/components/look/StylesSection'
import { Panel } from './kit'

/** Admin → Site: the design style visitors see until they choose their own. */
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
      toast.success('Default style saved', 'New visitors see it from their next page load.')
      void refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel title="Default style" description="What visitors see before they choose their own style. People who already picked one keep theirs." icon="palette">
      <div role="radiogroup" aria-label="Default style" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STYLES.map((s) => {
          const l = styleLook(look, s)
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
              <StyleSpecimen
                look={l}
                mode={resolveMode(PALETTE_BY_ID.get(l.theme)!, preferredMode)}
                className="aspect-[4/3] w-full rounded-[var(--radius-card)] shadow-[0_0_0_1px_var(--color-border)] [&>span]:h-[154%] [&>span]:w-[154%] [&>span]:origin-top-left [&>span]:scale-[0.65]"
              />
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
