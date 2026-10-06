import { useState, useRef } from 'react'
import {
  Check,
  Monitor,
  Moon,
  Sun,
  Slash,
  Upload,
  Trash2,
  Plus,
  Sparkles,
  Zap,
  Flame,
  Layers,
  Compass,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useTheme, type Appearance } from '@/context/ThemeContext'
import {
  ACCENTS,
  CARD_STYLES,
  GLASS_STYLES,
  ICON_PACKS,
  ICON_SHAPES,
  ORIGINALS,
  PHOTOS,
  PLAIN,
  THEME_PRESETS,
  findWallpaper,
  creditLinks,
  originalUrl,
  thumbUrl,
  type CustomWallpaper,
  type GlassStyle,
  type Tone,
  type Wallpaper,
} from '@/theme/catalog'
import { cn } from '@/lib/utils'

function hideBroken(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = 'hidden'
}

/* ── Wallpaper thumbnail renderer ────────────────────────────────────────── */
function Thumb({ w, tone }: { w: Wallpaper; tone: Tone }) {
  if (w.kind === 'none') {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#e7e8ec,#cfd1d8_50%,#232429_50%,#131418)] text-text-muted">
        <Slash className="size-5 text-white/70 mix-blend-difference" aria-hidden="true" />
      </span>
    )
  }
  if (w.kind === 'custom') {
    return (
      <img
        src={w.src}
        alt={w.name}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={hideBroken}
        className="absolute inset-0 size-full object-cover"
      />
    )
  }
  if (w.kind === 'original') {
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

function Tile({
  w,
  compact,
  onDelete,
}: {
  w: Wallpaper
  compact?: boolean
  onDelete?: (id: string) => void
}) {
  const { look, resolved, setWallpaper } = useTheme()
  const on = look.wallpaper === w.id
  const bg =
    w.kind === 'original'
      ? w.color[resolved]
      : w.kind === 'photo' || w.kind === 'custom'
        ? w.color
        : undefined

  return (
    <div className="group relative flex min-w-0 flex-col items-stretch gap-1.5 text-left">
      <button
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={w.name}
        title={w.name}
        onClick={() => setWallpaper(w.id)}
        className="relative block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-[0.7rem] shadow-[0_1px_2px_rgb(0_0_0/0.18),0_6px_16px_-8px_rgb(0_0_0/0.45)] transition-[box-shadow,transform] duration-200 ease-[var(--ease-smooth)] group-hover:-translate-y-0.5"
        style={{ backgroundColor: bg }}
      >
        <span
          className={cn(
            'absolute inset-0',
            on
              ? 'ring-2 ring-accent-brand ring-offset-2 ring-offset-[var(--wall-color,var(--color-bg-app))]'
              : 'ring-1 ring-hairline/[0.12]',
          )}
        >
          <Thumb w={w} tone={resolved} />
        </span>
        {on && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute right-1.5 bottom-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-accent-brand text-on-accent-brand shadow-md"
          >
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          </motion.span>
        )}
      </button>

      {/* Delete button for custom wallpapers */}
      {w.kind === 'custom' && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(w.id)
          }}
          title="Delete custom wallpaper"
          aria-label="Delete custom wallpaper"
          className="absolute top-1.5 right-1.5 z-20 flex size-5.5 items-center justify-center rounded-md bg-black/70 text-red-400 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white"
        >
          <Trash2 className="size-3" />
        </button>
      )}

      {!compact && (
        <span className={cn('truncate text-[12px]', on ? 'font-medium text-text-primary' : 'text-text-secondary')}>
          {w.name}
        </span>
      )}
    </div>
  )
}

/* ── Custom Wallpaper Uploader Modal / Section ────────────────────────────── */
export function CustomWallpaperUploader({ onAdded }: { onAdded?: () => void }) {
  const { addCustomWallpaper } = useTheme()
  const [urlInput, setUrlInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [tone, setTone] = useState<Tone>('dark')
  const [isUrlMode, setIsUrlMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      if (!src) return
      const id = `custom_${Date.now()}`
      const newWp: CustomWallpaper = {
        id,
        name: nameInput.trim() || file.name.replace(/\.[^/.]+$/, '') || 'Custom Wallpaper',
        kind: 'custom',
        tone,
        src,
        color: tone === 'dark' ? '#0f172a' : '#f8fafc',
        tint: tone === 'dark' ? '#1e293b' : '#e2e8f0',
        accent: 'blue',
      }
      addCustomWallpaper(newWp)
      setNameInput('')
      onAdded?.()
    }
    reader.readAsDataURL(file)
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    const id = `custom_${Date.now()}`
    const newWp: CustomWallpaper = {
      id,
      name: nameInput.trim() || 'Web Wallpaper',
      kind: 'custom',
      tone,
      src: urlInput.trim(),
      color: tone === 'dark' ? '#0f172a' : '#f8fafc',
      tint: tone === 'dark' ? '#1e293b' : '#e2e8f0',
      accent: 'blue',
    }
    addCustomWallpaper(newWp)
    setUrlInput('')
    setNameInput('')
    setIsUrlMode(false)
    onAdded?.()
  }

  return (
    <div className="rounded-xl border border-border-strong bg-bg-surface-2 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Upload className="size-4 text-accent-brand" />
          <span className="text-xs font-semibold text-text-primary">Add Your Own Wallpaper</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setIsUrlMode(false)}
            className={cn(
              'rounded-md px-2 py-1 transition-colors',
              !isUrlMode ? 'bg-accent-brand text-on-accent-brand font-medium' : 'text-text-muted hover:text-text-primary',
            )}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setIsUrlMode(true)}
            className={cn(
              'rounded-md px-2 py-1 transition-colors',
              isUrlMode ? 'bg-accent-brand text-on-accent-brand font-medium' : 'text-text-muted hover:text-text-primary',
            )}
          >
            Paste URL
          </button>
          <div className="ml-1 h-3.5 w-px bg-border" />
          <button
            type="button"
            onClick={() => setTone((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="flex items-center gap-1 rounded-md bg-bg-surface-3 px-2 py-1 text-text-muted transition-colors hover:text-text-primary"
            title="Declare image background tone (affects glass contrast)"
          >
            {tone === 'dark' ? <Moon className="size-3 text-cyan-400" /> : <Sun className="size-3 text-amber-400" />}
            <span className="capitalize">{tone} Tone</span>
          </button>
        </div>
      </div>

      <div className="mt-3">
        {!isUrlMode ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileUpload(f)
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-hairline/[0.25] bg-bg-surface-3/50 py-4 transition-colors hover:border-accent-brand hover:bg-bg-surface-3"
            >
              <Plus className="size-5 text-accent-brand" />
              <span className="mt-1 text-xs font-medium text-text-primary">Click to upload image file</span>
              <span className="text-[11px] text-text-muted">PNG, JPG, WebP supported</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleUrlSubmit} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                required
                placeholder="https://example.com/wallpaper.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg-surface-3 px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-brand focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-accent-brand px-3 py-1.5 text-xs font-medium text-on-accent-brand transition-opacity hover:opacity-90"
              >
                Add
              </button>
            </div>
          </form>
        )}

        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}

/* ── Wallpaper Grid with Category Navigation ────────────────────────────── */
export function WallpaperGrid({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { customWallpapers, deleteCustomWallpaper } = useTheme()
  const [selectedCat, setSelectedCat] = useState<'all' | 'originals' | 'cyber' | 'space' | 'abstract' | 'nature' | 'custom'>('all')

  const cyberPhotos = PHOTOS.filter((p) => p.category === 'cyber')
  const spacePhotos = PHOTOS.filter((p) => p.category === 'space')
  const abstractPhotos = PHOTOS.filter((p) => p.category === 'abstract')
  const naturePhotos = PHOTOS.filter((p) => p.category === 'nature')

  const groups: { id: string; label: string; hint?: string; items: Wallpaper[] }[] = [
    { id: 'originals', label: 'Nexora Originals', hint: 'Dynamic — follow Light & Dark', items: ORIGINALS },
    { id: 'cyber', label: 'Cyberpunk & Matrix', hint: 'High-tech neon cities & circuitry', items: cyberPhotos },
    { id: 'space', label: 'Cosmic Deep Space', hint: 'Nebulas, galaxies & orbital horizons', items: spacePhotos },
    { id: 'abstract', label: 'Abstract & 3D Art', hint: 'Liquid obsidian & raytraced geometry', items: abstractPhotos },
    { id: 'nature', label: 'Atmospheric Landscapes', hint: 'Moody peaks, ocean swells & twilight', items: naturePhotos },
    { id: 'custom', label: 'Your Custom Wallpapers', hint: 'Locally uploaded & personal images', items: customWallpapers },
    { id: 'plain', label: 'Minimal Plain', hint: 'Distraction-free solid background', items: [PLAIN] },
  ]

  const activeGroups =
    selectedCat === 'all'
      ? groups.filter((g) => g.items.length > 0)
      : groups.filter((g) => g.id === selectedCat)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Category Pills */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
          {[
            { id: 'all', label: 'All Collections' },
            { id: 'originals', label: 'Originals' },
            { id: 'cyber', label: 'Cyber & Matrix' },
            { id: 'space', label: 'Deep Space' },
            { id: 'abstract', label: 'Abstract 3D' },
            { id: 'nature', label: 'Nature' },
            { id: 'custom', label: `Custom (${customWallpapers.length})` },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCat(cat.id as typeof selectedCat)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                selectedCat === cat.id
                  ? 'bg-accent-brand text-on-accent-brand'
                  : 'bg-bg-surface-2 text-text-muted hover:text-text-primary',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom Uploader Trigger */}
      {!compact && (selectedCat === 'all' || selectedCat === 'custom') && (
        <CustomWallpaperUploader />
      )}

      {/* Grid Display */}
      {activeGroups.map((g) => (
        <div key={g.label} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
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
              <Tile
                key={w.id}
                w={w}
                compact={compact}
                onDelete={w.kind === 'custom' ? deleteCustomWallpaper : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Curated Theme Presets Gallery ────────────────────────────────────────── */
export function ThemePresetsPicker({ className }: { className?: string }) {
  const { look, applyLook } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Curated Theme Presets"
      className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}
    >
      {THEME_PRESETS.map((p) => {
        const active =
          look.wallpaper === p.wallpaper &&
          look.accent === p.accent &&
          look.cardStyle === p.cardStyle &&
          look.iconPack === p.iconPack
        const wp = findWallpaper(p.wallpaper)
        const bgThumb = thumbUrl(wp, 'dark')

        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() =>
              applyLook({
                wallpaper: p.wallpaper,
                accent: p.accent,
                cardStyle: p.cardStyle,
                iconPack: p.iconPack,
                iconShape: p.iconShape,
              })
            }
            className={cn(
              'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300',
              active
                ? 'border-accent-brand ring-2 ring-accent-brand/40 shadow-xl scale-[1.01]'
                : 'border-border bg-bg-surface-2 hover:border-border-strong hover:bg-bg-surface-3 hover:-translate-y-0.5',
            )}
          >
            {/* Visual banner thumbnail */}
            <div className="relative h-24 w-full overflow-hidden bg-bg-surface-3">
              {bgThumb ? (
                <img
                  src={bgThumb}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  onError={hideBroken}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className="size-full"
                  style={{
                    background: `linear-gradient(135deg, ${p.glowColor}33, #0b0c10)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-surface to-transparent opacity-90" />

              {/* Category tag */}
              <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-white backdrop-blur-md">
                {p.badge}
              </span>

              {/* Active check pill */}
              {active && (
                <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-accent-brand px-2 py-0.5 text-[11px] font-semibold text-white shadow-md">
                  <Check className="size-3 stroke-[2.5]" />
                  Active
                </span>
              )}
            </div>

            {/* Content & attributes */}
            <div className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-text-primary group-hover:text-accent-brand transition-colors">
                  {p.name}
                </span>
                <span
                  className="size-3.5 shrink-0 rounded-full border border-white/20 shadow-sm"
                  style={{ background: p.glowColor }}
                  title={`Accent: ${p.accent}`}
                />
              </div>
              <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-text-muted">
                {p.description}
              </p>

              {/* Tag pills for attributes */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-medium text-text-secondary">
                <span className="rounded bg-bg-surface-3 border border-border px-1.5 py-0.5 capitalize">
                  {p.cardStyle} Card
                </span>
                <span className="rounded bg-bg-surface-3 border border-border px-1.5 py-0.5 capitalize">
                  {p.iconPack} Icons
                </span>
                <span className="rounded bg-bg-surface-3 border border-border px-1.5 py-0.5 capitalize">
                  {p.iconShape}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ── Card Style Customizer ────────────────────────────────────────────────── */
export function CardStylePicker({ className }: { className?: string }) {
  const { look, setCardStyle } = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label="Card Style"
      className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5', className)}
    >
      {CARD_STYLES.map((c) => {
        const on = look.cardStyle === c.id
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setCardStyle(c.id)}
            className={cn(
              'group relative flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-all duration-200',
              on
                ? 'border-accent-brand bg-bg-surface-3 ring-2 ring-accent-brand/40 shadow-lg'
                : 'border-border bg-bg-surface-2 hover:border-border-strong hover:bg-bg-surface-3',
            )}
          >
            {/* Visual preview representation */}
            <div className="mb-2.5 flex h-14 w-full items-center justify-center rounded-lg p-2 overflow-hidden transition-transform group-hover:scale-[1.02]">
              {c.id === 'glass' && (
                <div className="size-full rounded-md border border-white/25 bg-white/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center">
                  <span className="text-[10px] font-medium text-white/80">Frosted Glass</span>
                </div>
              )}
              {c.id === 'neon' && (
                <div className="size-full rounded-md border border-cyan-400 bg-cyan-950/40 shadow-[0_0_14px_rgba(6,182,212,0.45),inset_0_0_8px_rgba(6,182,212,0.25)] flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-cyan-300 drop-shadow-[0_0_4px_currentColor]">Cyber Neon</span>
                </div>
              )}
              {c.id === 'holo' && (
                <div className="size-full rounded-md border border-purple-400/50 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-cyan-500/20 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),0_4px_16px_rgba(192,132,252,0.3)] flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-purple-200">3D Hologram</span>
                </div>
              )}
              {c.id === 'gradient' && (
                <div className="size-full rounded-md border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 shadow-[0_4px_14px_rgba(251,146,60,0.3)] flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-amber-300">Color Flow</span>
                </div>
              )}
              {c.id === 'minimal' && (
                <div className="size-full rounded-md border border-white/15 bg-neutral-900 shadow-sm flex items-center justify-center">
                  <span className="text-[10px] font-medium text-neutral-300">Clean Matte</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-semibold', on ? 'text-accent-brand' : 'text-text-primary')}>
                {c.label}
              </span>
              {on && <Check className="size-3.5 text-accent-brand" />}
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-text-muted">{c.hint}</p>
          </button>
        )
      })}
    </div>
  )
}

/* ── Icon Pack & Shape Customizers ────────────────────────────────────────── */
export function IconPackPicker({ className }: { className?: string }) {
  const { look, setIconPack } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Icon Pack"
      className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5', className)}
    >
      {ICON_PACKS.map((p) => {
        const on = look.iconPack === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setIconPack(p.id)}
            className={cn(
              'group flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-all duration-200',
              on
                ? 'border-accent-brand bg-bg-surface-3 ring-2 ring-accent-brand/40 shadow-md'
                : 'border-border bg-bg-surface-2 hover:border-border-strong hover:bg-bg-surface-3',
            )}
          >
            {/* Live sample icon pod */}
            <div className="mb-2 flex h-11 w-full items-center justify-center">
              {p.id === 'vibrant' && (
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-accent-brand to-rose-400 text-white shadow-md">
                  <Sparkles className="size-4.5" />
                </span>
              )}
              {p.id === 'neon' && (
                <span className="flex size-9 items-center justify-center rounded-xl border border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                  <Zap className="size-4.5 drop-shadow-[0_0_6px_currentColor]" />
                </span>
              )}
              {p.id === 'clay' && (
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-b from-purple-500 to-indigo-700 text-white shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),0_6px_12px_rgba(0,0,0,0.4)]">
                  <Flame className="size-4.5" />
                </span>
              )}
              {p.id === 'duotone' && (
                <span className="flex size-9 items-center justify-center rounded-xl border border-accent-brand/40 bg-accent-brand/20 text-accent-brand">
                  <Layers className="size-4.5" />
                </span>
              )}
              {p.id === 'minimal' && (
                <span className="flex size-9 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-text-primary">
                  <Compass className="size-4.5" />
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-semibold', on ? 'text-accent-brand' : 'text-text-primary')}>
                {p.label}
              </span>
              {on && <Check className="size-3.5 text-accent-brand" />}
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-text-muted">{p.hint}</p>
          </button>
        )
      })}
    </div>
  )
}

export function IconShapePicker({ className }: { className?: string }) {
  const { look, setIconShape } = useTheme()

  return (
    <div role="radiogroup" aria-label="Icon Shape" className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {ICON_SHAPES.map((s) => {
        const on = look.iconShape === s.id
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setIconShape(s.id)}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium transition-all',
              on
                ? 'border-accent-brand bg-accent-brand/15 text-accent-brand ring-1 ring-accent-brand'
                : 'border-border bg-bg-surface-2 text-text-muted hover:text-text-primary hover:border-border-strong',
            )}
          >
            {/* Visual shape geometry pod */}
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center bg-accent-brand/20 text-accent-brand border border-accent-brand/40',
                s.id === 'circle' && 'rounded-full',
                s.id === 'squircle' && 'rounded-[28%]',
                s.id === 'hexagon' && 'rounded-none [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]',
                s.id === 'free' && 'rounded-none bg-transparent border-transparent shadow-none',
              )}
            >
              <Sparkles className="size-3.5" />
            </span>
            <span className="flex-1 text-left">{s.label}</span>
            {on && <Check className="size-3.5 shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}

/* ── Photo credit ────────────────────────────────────────────────────────── */
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

/* ── Accent colour picker (12 Chromatic Schemes) ─────────────────────────── */
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
              on && 'ring-2 ring-hairline/[0.35] ring-offset-2 ring-offset-transparent scale-110',
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

/* ── Segmented Controls ───────────────────────────────────────────────────── */
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
  if (wallpaper.kind === 'photo' || wallpaper.kind === 'custom') {
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
