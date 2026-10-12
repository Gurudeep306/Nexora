/*
  A theme's thumbnail: a tiny, real rendering of the app in that palette
  (scoped with data-palette/data-mode), not an image.
*/
import { Moon, Sun } from 'lucide-react'
import type { Palette, ThemeMode } from '@/theme/palettes'
import { cn } from '@/lib/utils'

export function ThemeSwatch({ palette, mode, className }: { palette: Palette; mode: ThemeMode; className?: string }) {
  return (
    <div
      data-palette={palette.id}
      data-mode={mode}
      aria-hidden="true"
      className={cn('relative overflow-hidden bg-bg-app', className)}
    >
      {/* sidebar */}
      <div className="absolute inset-y-0 left-0 flex w-[24%] flex-col gap-[7%] border-r border-border bg-bg-surface px-[5%] pt-[9%]">
        <span className="h-[5%] min-h-1 w-3/4 rounded-full bg-gradient-to-r from-accent-brand to-accent-brand-hover" />
        <span className="h-[4%] min-h-[3px] w-full rounded-full bg-accent-brand/25" />
        <span className="h-[4%] min-h-[3px] w-4/5 rounded-full bg-text-muted/40" />
        <span className="h-[4%] min-h-[3px] w-3/5 rounded-full bg-text-muted/40" />
      </div>
      {/* page */}
      <div className="absolute top-[11%] right-[6%] left-[31%] flex flex-col gap-[6px]">
        <span className="h-[7px] w-1/2 rounded-full bg-text-primary/90" />
        <span className="h-[5px] w-3/4 rounded-full bg-text-muted/60" />
        <div className="mt-[3px] flex flex-col gap-[5px] rounded-[7px] border border-border bg-bg-surface p-[7px] shadow-[var(--elev-1)]">
          <div className="flex items-center gap-[5px]">
            <span className="h-[5px] w-2/5 rounded-full bg-text-secondary/80" />
            <span className="ml-auto h-[6px] w-[18%] rounded-full bg-state-success/30" />
          </div>
          <div className="flex gap-[3px]">
            <span className="h-[4px] w-[22%] rounded-full bg-[var(--color-syntax-keyword)]" />
            <span className="h-[4px] w-[30%] rounded-full bg-[var(--color-syntax-function)]" />
            <span className="h-[4px] w-[20%] rounded-full bg-[var(--color-syntax-string)]" />
          </div>
          <div className="flex items-center gap-[4px] pt-[2px]">
            <span className="h-[9px] w-[30%] rounded-[3px] bg-accent-brand" />
            <span className="h-[9px] w-[22%] rounded-[3px] border border-border bg-bg-surface-2" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** A tiny badge of a theme: its page colour with an accent dot. */
export function ThemeDot({ palette, mode, className }: { palette: Palette; mode: ThemeMode; className?: string }) {
  return (
    <span
      data-palette={palette.id}
      data-mode={mode}
      aria-hidden="true"
      className={cn('relative block overflow-hidden bg-bg-app shadow-[inset_0_0_0_1px_var(--color-border)]', className)}
    >
      <span className="absolute inset-y-0 right-0 w-1/2 bg-bg-surface-3" />
      <span className="absolute inset-[28%] rounded-full bg-accent-brand shadow-[0_0_0_1.5px_var(--color-bg-app)]" />
    </span>
  )
}

/** Small sun / moon marks showing which modes a theme offers. */
export function ModeMarks({ palette, className }: { palette: Palette; className?: string }) {
  const label = palette.dark && palette.light ? 'Light and dark' : palette.dark ? 'Dark only' : 'Light only'
  return (
    <span className={cn('flex items-center gap-0.5 text-text-muted', className)} title={label}>
      <span className="sr-only">{label}</span>
      <Sun aria-hidden="true" className={cn('size-3', !palette.light && 'opacity-25')} />
      <Moon aria-hidden="true" className={cn('size-3', !palette.dark && 'opacity-25')} />
    </span>
  )
}
