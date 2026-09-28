import { Check, Monitor, Moon, Sun, Slash } from 'lucide-react'
import { motion } from 'motion/react'
import { useTheme, type Appearance } from '@/context/ThemeContext'
import {
  ACCENTS,
  GLASS_STYLES,
  ORIGINALS,
  PHOTOS,
  PLAIN,
  creditLinks,
  originalUrl,
  thumbUrl,
  type GlassStyle,
  type Tone,
  type Wallpaper,
} from '@/theme/catalog'
import { cn } from '@/lib/utils'

/** If a thumbnail cannot load (offline, CDN blocked), hide it and let the
 *  wallpaper's colour underneath stand in, rather than a broken-image glyph. */
function hideBroken(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = 'hidden'
}

/* ── Wallpaper tiles ─────────────────────────────────────────────────────── */

function Thumb({ w, tone }: { w: Wallpaper; tone: Tone }) {
  if (w.kind === 'none') {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#e7e8ec,#cfd1d8_50%,#232429_50%,#131418)] text-text-muted">
        <Slash className="size-5 text-white/70 mix-blend-difference" aria-hidden="true" />
      </span>
    )
  }
  if (w.kind === 'original') {
    // Dynamic wallpapers show both variants, split on the diagonal, the way
    // macOS marks a wallpaper that follows the appearance.
    const other: Tone = tone === 'dark' ? 'light' : 'dark'
    return (
      <>
        <img
          src={originalUrl(w, tone, 'thumb')}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
        <img
          src={originalUrl(w, other, 'thumb')}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover [clip-path:polygon(100%_0,100%_100%,0_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      </>
    )
  }
  return (
    <img
      src={thumbUrl(w, tone) ?? undefined}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={hideBroken}
      className="absolute inset-0 size-full object-cover"
    />
  )
}

function Tile({ w, compact }: { w: Wallpaper; compact?: boolean }) {
  const { look, resolved, setWallpaper } = useTheme()
  const on = look.wallpaper === w.id
  const bg = w.kind === 'original' ? w.color[resolved] : w.kind === 'photo' ? w.color : undefined
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={w.name}
      title={w.name}
      onClick={() => setWallpaper(w.id)}
      className="group flex min-w-0 cursor-pointer flex-col items-stretch gap-1.5 text-left hover:!scale-100"
    >
      <span
        className={cn(
          'relative block aspect-[16/10] overflow-hidden rounded-[0.7rem] shadow-[0_1px_2px_rgb(0_0_0/0.18),0_6px_16px_-8px_rgb(0_0_0/0.45)] transition-[box-shadow,transform] duration-200 ease-[var(--ease-smooth)] group-hover:-translate-y-0.5',
          on
            ? 'ring-2 ring-accent-brand ring-offset-2 ring-offset-[var(--wall-color,var(--color-bg-app))]'
            : 'ring-1 ring-hairline/[0.12]',
        )}
        style={{ backgroundColor: bg }}
      >
        <Thumb w={w} tone={resolved} />
        {on && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-accent-brand text-on-accent-brand shadow-md"
          >
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          </motion.span>
        )}
      </span>
      {!compact && (
        <span className={cn('truncate text-[12px]', on ? 'font-medium text-text-primary' : 'text-text-secondary')}>
          {w.name}
        </span>
      )}
    </button>
  )
}

export function WallpaperGrid({ compact = false, className }: { compact?: boolean; className?: string }) {
  const groups: { label: string; hint?: string; items: Wallpaper[] }[] = [
    { label: 'Nexora Originals', hint: 'Dynamic — follow Light and Dark', items: ORIGINALS },
    { label: 'Photography', hint: 'From Unsplash', items: PHOTOS },
    { label: 'Plain', items: [PLAIN] },
  ]
  return (
    <div className={cn('space-y-4', className)}>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-text-secondary uppercase">{g.label}</h3>
            {g.hint && !compact && <span className="text-[11px] text-text-muted">{g.hint}</span>}
          </div>
          <div
            role="radiogroup"
            aria-label={g.label}
            className={cn(
              'grid gap-3',
              compact ? 'grid-cols-4 gap-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
            )}
          >
            {g.items.map((w) => (
              <Tile key={w.id} w={w} compact={compact} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Photo credit (Unsplash attribution guideline) ───────────────────────── */

export function PhotoCredit({ className }: { className?: string }) {
  const { wallpaper } = useTheme()
  if (wallpaper.kind !== 'photo') return null
  const links = creditLinks(wallpaper)
  return (
    <p className={cn('text-[11.5px] text-text-muted', className)}>
      “{wallpaper.name}” — photo by{' '}
      <a href={links.photographer} target="_blank" rel="noreferrer" className="text-text-secondary underline-offset-2 hover:underline">
        {wallpaper.credit.name}
      </a>{' '}
      on{' '}
      <a href={links.photo} target="_blank" rel="noreferrer" className="text-text-secondary underline-offset-2 hover:underline">
        Unsplash
      </a>
    </p>
  )
}

/* ── Accent colour ───────────────────────────────────────────────────────── */

export function AccentPicker({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { look, setAccent, wallpaper } = useTheme()
  const dim = size === 'sm' ? 'size-5' : 'size-6'
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap items-center gap-2.5">
      {ACCENTS.map((a) => {
        const on = look.accent === a.id
        const label = a.id === 'multicolor' ? `Multicolour — follows ${wallpaper.name}` : a.label
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => setAccent(a.id)}
            className={cn(
              'relative flex cursor-pointer items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.25)] transition-transform duration-150',
              dim,
              on && 'ring-2 ring-hairline/[0.35] ring-offset-2 ring-offset-transparent',
            )}
            style={{ background: a.swatch }}
          >
            {on && <span className="size-2 rounded-full bg-white shadow-[0_0_2px_rgb(0_0_0/0.4)]" />}
          </button>
        )
      })}
    </div>
  )
}

/* ── Segmented controls ──────────────────────────────────────────────────── */

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  layoutId,
  className,
}: {
  value: T
  options: { id: T; label: string; icon?: React.ReactNode }[]
  onChange: (v: T) => void
  label: string
  layoutId: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-[0.7rem] bg-bg-surface-2 p-0.5 ring-1 ring-border', className)}
    >
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={cn(
              'relative flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[0.55rem] px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-150 hover:!scale-100',
              on ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {on && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-[0.55rem] bg-[var(--seg-thumb)] shadow-[0_1px_2px_rgb(0_0_0/0.18),0_2px_8px_-2px_rgb(0_0_0/0.2)] [--seg-thumb:oklch(1_0_0/0.16)] [:root:not(.dark)_&]:[--seg-thumb:oklch(1_0_0)]"
              />
            )}
            <span className="relative flex items-center gap-1.5 [&_svg]:size-3.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const APPEARANCES: { id: Appearance; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <Moon aria-hidden="true" /> },
  { id: 'system', label: 'Auto', icon: <Monitor aria-hidden="true" /> },
]

export function AppearanceSegmented({ className, layoutId = 'look-appearance' }: { className?: string; layoutId?: string }) {
  const { appearance, setAppearance } = useTheme()
  return (
    <Segmented
      value={appearance}
      options={APPEARANCES}
      onChange={setAppearance}
      label="Appearance"
      layoutId={layoutId}
      className={className}
    />
  )
}

export function GlassSegmented({ className, layoutId = 'look-glass' }: { className?: string; layoutId?: string }) {
  const { look, setGlass } = useTheme()
  return (
    <Segmented<GlassStyle> value={look.glass} options={GLASS_STYLES} onChange={setGlass} label="Glass" layoutId={layoutId} className={className} />
  )
}

/* ── Appearance cards (System Settings style) ────────────────────────────── */

function MiniWindow({ tone }: { tone: Tone }) {
  const dark = tone === 'dark'
  return (
    <span
      className={cn(
        'absolute top-[22%] left-[14%] h-[62%] w-[72%] overflow-hidden rounded-[5px] shadow-[0_4px_14px_-4px_rgb(0_0_0/0.5)] ring-1',
        dark ? 'bg-[#26272c]/80 ring-white/10' : 'bg-white/80 ring-black/5',
      )}
    >
      <span className={cn('flex h-[18%] items-center gap-[3px] px-[6%]', dark ? 'bg-white/5' : 'bg-black/[0.03]')}>
        <span className="size-[5px] rounded-full bg-[#ff5f57]" />
        <span className="size-[5px] rounded-full bg-[#febc2e]" />
        <span className="size-[5px] rounded-full bg-[#28c840]" />
      </span>
      <span className="mt-[8%] ml-[8%] block h-[8%] w-[46%] rounded-full bg-accent-brand" />
      <span className={cn('mt-[6%] ml-[8%] block h-[6%] w-[64%] rounded-full', dark ? 'bg-white/20' : 'bg-black/12')} />
      <span className={cn('mt-[5%] ml-[8%] block h-[6%] w-[52%] rounded-full', dark ? 'bg-white/15' : 'bg-black/8')} />
    </span>
  )
}

function Backdrop({ tone }: { tone: Tone }) {
  const { wallpaper } = useTheme()
  if (wallpaper.kind === 'original') {
    return <img src={originalUrl(wallpaper, tone, 'thumb')} alt="" className="absolute inset-0 size-full object-cover" />
  }
  if (wallpaper.kind === 'photo') {
    return (
      <span className="absolute inset-0" style={{ backgroundColor: wallpaper.color }}>
        <img
          src={thumbUrl(wallpaper, tone) ?? undefined}
          alt=""
          onError={hideBroken}
          className="absolute inset-0 size-full object-cover"
        />
      </span>
    )
  }
  return <span className={cn('absolute inset-0', tone === 'dark' ? 'bg-[#131418]' : 'bg-[#e7e8ec]')} />
}

export function AppearanceCards() {
  const { appearance, setAppearance } = useTheme()
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-3 sm:max-w-md">
      {APPEARANCES.map((a) => {
        const on = appearance === a.id
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setAppearance(a.id)}
            className="group flex cursor-pointer flex-col items-center gap-2 hover:!scale-100"
          >
            <span
              className={cn(
                'relative block aspect-[16/11] w-full overflow-hidden rounded-[0.7rem] shadow-[0_1px_2px_rgb(0_0_0/0.18),0_6px_16px_-8px_rgb(0_0_0/0.45)] transition-transform duration-200 group-hover:-translate-y-0.5',
                on ? 'ring-2 ring-accent-brand ring-offset-2 ring-offset-[var(--wall-color,var(--color-bg-app))]' : 'ring-1 ring-hairline/[0.12]',
              )}
            >
              {a.id === 'system' ? (
                <>
                  <Backdrop tone="light" />
                  <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                    <Backdrop tone="dark" />
                  </span>
                  <span className="absolute inset-0">
                    <MiniWindow tone="light" />
                  </span>
                  <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                    <MiniWindow tone="dark" />
                  </span>
                </>
              ) : (
                <>
                  <Backdrop tone={a.id} />
                  <MiniWindow tone={a.id} />
                </>
              )}
            </span>
            <span className={cn('text-[12.5px]', on ? 'font-medium text-text-primary' : 'text-text-secondary')}>
              {a.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
