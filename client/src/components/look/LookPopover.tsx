import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { originalUrl, thumbUrl } from '@/theme/catalog'
import { cn } from '@/lib/utils'
import { AccentPicker, AppearanceSegmented, GlassSegmented, PhotoCredit, WallpaperGrid } from './LookControls'

/** The current wallpaper as a tiny rounded swatch — the trigger's icon. */
function CurrentSwatch() {
  const { wallpaper, resolved } = useTheme()
  const src =
    wallpaper.kind === 'original'
      ? originalUrl(wallpaper, resolved, 'thumb')
      : wallpaper.kind === 'photo' || wallpaper.kind === 'custom'
        ? thumbUrl(wallpaper, resolved)
        : null
  const bg =
    wallpaper.kind === 'original'
      ? wallpaper.color[resolved]
      : wallpaper.kind === 'photo' || wallpaper.kind === 'custom'
        ? wallpaper.color
        : undefined
  return (
    <span
      className="relative block size-[18px] overflow-hidden rounded-[5px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2),0_1px_2px_rgb(0_0_0/0.3)]"
      style={{ backgroundColor: bg ?? 'var(--color-bg-surface-3)' }}
    >
      {src && (
        <img
          src={src}
          alt=""
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          className="size-full object-cover"
        />
      )}
    </span>
  )
}

/**
 * Top-bar "Look" control — the Control Centre of the app: appearance,
 * wallpaper, accent and glass in one popover, with the full pane one click
 * away in Settings.
 */
export function LookPopover({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Appearance and wallpaper"
          title="Appearance and wallpaper"
          className={cn(
            'flex size-8 cursor-pointer items-center justify-center rounded-[0.7rem] border border-border bg-bg-surface-2 transition-colors hover:border-border-strong',
            className,
          )}
        >
          <CurrentSwatch />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] max-w-[calc(100vw-16px)] p-0">
        <div className="max-h-[min(78vh,640px)] space-y-4 overflow-y-auto p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-text-primary">Appearance</span>
            <AppearanceSegmented layoutId="pop-appearance" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-text-primary">Glass</span>
            <GlassSegmented layoutId="pop-glass" />
          </div>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-text-primary">Accent</span>
            <AccentPicker size="sm" />
          </div>
          <div className="h-px bg-border" />
          <WallpaperGrid compact />
          <PhotoCredit />
        </div>
        <PopoverClose asChild>
          <Link
            to="/settings?tab=look"
            className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
          >
            Wallpaper & Appearance settings
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  )
}
