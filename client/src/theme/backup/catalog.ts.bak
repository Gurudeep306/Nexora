/**
 * The look catalogue: wallpapers and accent colours.
 *
 * Two kinds of wallpaper:
 *
 *  • Originals — rendered for Nexora (scripts/wallpapers), shipped in
 *    /public/wallpapers, and drawn in a light *and* a dark variant, so they
 *    follow the appearance the way a macOS dynamic wallpaper does.
 *  • Photography — free-licensed photos from Unsplash (Unsplash License: free
 *    to use, no permission needed). They are hot-linked from Unsplash's own
 *    CDN, which is how Unsplash asks for its images to be served, and each one
 *    credits its photographer in the picker. A photo has one fixed tone, so
 *    it declares whether it is light or dark; glass over a mismatched photo is
 *    made more opaque so text keeps its contrast (see index.css).
 */

export type Tone = 'light' | 'dark'

export type AccentId =
  | 'multicolor'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'graphite'

export type GlassStyle = 'frosted' | 'clear' | 'solid'

export const GLASS_STYLES: { id: GlassStyle; label: string; hint: string }[] = [
  { id: 'frosted', label: 'Frosted', hint: 'Soft, diffused glass — the default.' },
  { id: 'clear', label: 'Clear', hint: 'More wallpaper shows through every pane.' },
  { id: 'solid', label: 'Solid', hint: 'Opaque panes, no blur — like Reduce transparency.' },
]

interface BaseWallpaper {
  id: string
  name: string
  /** The accent "Multicolor" resolves to while this wallpaper is showing. */
  accent: Exclude<AccentId, 'multicolor'>
}

export interface OriginalWallpaper extends BaseWallpaper {
  kind: 'original'
  /** Colour painted before the image arrives, per appearance. */
  color: Record<Tone, string>
  /** Desktop tint mixed into glass, per appearance. */
  tint: Record<Tone, string>
}

export interface PhotoWallpaper extends BaseWallpaper {
  kind: 'photo'
  tone: Tone
  /** images.unsplash.com base URL (no query string). */
  src: string
  color: string
  tint: string
  credit: { name: string; username: string; photoId: string }
}

export interface PlainWallpaper extends BaseWallpaper {
  kind: 'none'
}

export type Wallpaper = OriginalWallpaper | PhotoWallpaper | PlainWallpaper

export const ORIGINALS: OriginalWallpaper[] = [
  {
    id: 'aurora', name: 'Aurora', kind: 'original', accent: 'blue',
    color: { dark: '#10124a', light: '#dcd7f7' },
    tint: { dark: '#2a2f9e', light: '#c9d6ff' },
  },
  {
    id: 'lagoon', name: 'Lagoon', kind: 'original', accent: 'green',
    color: { dark: '#073a44', light: '#cdeeee' },
    tint: { dark: '#0b5d6b', light: '#9fe0dc' },
  },
  {
    id: 'blossom', name: 'Blossom', kind: 'original', accent: 'pink',
    color: { dark: '#3a0c33', light: '#fbe0ec' },
    tint: { dark: '#6e1150', light: '#ffc0d8' },
  },
  {
    id: 'ember', name: 'Ember', kind: 'original', accent: 'orange',
    color: { dark: '#3a0f08', light: '#f8e1cf' },
    tint: { dark: '#8f1d10', light: '#ffd6c2' },
  },
  {
    id: 'dunes', name: 'Dunes', kind: 'original', accent: 'orange',
    color: { dark: '#2a1735', light: '#e9d6b8' },
    tint: { dark: '#5a2a4f', light: '#f2c48f' },
  },
  {
    id: 'nebula', name: 'Nebula', kind: 'original', accent: 'purple',
    color: { dark: '#07081a', light: '#ebe9fb' },
    tint: { dark: '#3b2cc4', light: '#b3a8ff' },
  },
  {
    id: 'graphite', name: 'Graphite', kind: 'original', accent: 'graphite',
    color: { dark: '#141519', light: '#e2e3e8' },
    tint: { dark: '#2c2e36', light: '#dcdee4' },
  },
]

export const PHOTOS: PhotoWallpaper[] = [
  {
    id: 'alpine', name: 'Alpine Lake', kind: 'photo', tone: 'light', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1603979649806-5299879db16b',
    color: '#3a3a1c', tint: '#4a4a2a',
    credit: { name: 'Ansgar Scheffold', username: 'ansgarscheffold', photoId: 'z_f2JrBRbOg' },
  },
  {
    id: 'shoreline', name: 'Shoreline', kind: 'photo', tone: 'light', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1501696461415-6bd6660c6742',
    color: '#9fd3d8', tint: '#bfe6ea',
    credit: { name: 'Nattu Adnan', username: 'reallynattu', photoId: 'Ai2TRdvI6gM' },
  },
  {
    id: 'surf', name: 'Deep Surf', kind: 'photo', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1510279770292-4b34de9f5c23',
    color: '#0c2640', tint: '#123a5c',
    credit: { name: 'Iswanto Arif', username: 'iswanto', photoId: 'OJ74pFtrYi0' },
  },
  {
    id: 'fogwood', name: 'Fogwood', kind: 'photo', tone: 'dark', accent: 'graphite',
    src: 'https://images.unsplash.com/photo-1487621167305-5d248087c724',
    color: '#3a3d45', tint: '#40444e',
    credit: { name: 'Paul Pastourmatzis', username: 'paulpastourmatzis', photoId: 'KT3WlrL_bsg' },
  },
  {
    id: 'glow', name: 'Desert Glow', kind: 'photo', tone: 'dark', accent: 'orange',
    src: 'https://images.unsplash.com/photo-1548272475-4a32d90e4f91',
    color: '#5a2616', tint: '#7a3a22',
    credit: { name: 'Mikk Tõnissoo', username: 'themikk', photoId: 'PWf-Dr2qpOo' },
  },
  {
    id: 'stillnight', name: 'Still Night', kind: 'photo', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1509773896068-7fd415d91e2e',
    color: '#101a33', tint: '#1e2c52',
    credit: { name: 'Jackson Hendry', username: 'actionjackson801', photoId: 'eodA_8CTOFo' },
  },
  {
    id: 'borealis', name: 'Borealis', kind: 'photo', tone: 'dark', accent: 'green',
    src: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73',
    color: '#1a0d26', tint: '#2a1a3a',
    credit: { name: 'Vincent Guth', username: 'vingtcent', photoId: '62V7ntlKgL8' },
  },
  {
    id: 'metropolis', name: 'Metropolis', kind: 'photo', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1599578705716-8d3d9246f53b',
    color: '#0c1a2c', tint: '#15304d',
    credit: { name: 'Ethan Lin', username: 'ethan90212', photoId: 'AEKdzZn_bBI' },
  },
  {
    id: 'summit', name: 'Summit', kind: 'photo', tone: 'light', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1596716005561-2f9e129bf613',
    color: '#8fb7e0', tint: '#bcd6f0',
    credit: { name: 'Brigitta Schneiter', username: 'brisch27', photoId: 'ipBuOAhWVec' },
  },
]

export const PLAIN: PlainWallpaper = { id: 'none', name: 'No wallpaper', kind: 'none', accent: 'blue' }

export const WALLPAPERS: Wallpaper[] = [...ORIGINALS, ...PHOTOS, PLAIN]

export const DEFAULT_WALLPAPER = 'aurora'

export function findWallpaper(id: string | null | undefined): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS.find((w) => w.id === DEFAULT_WALLPAPER)!
}

/** The tone of whatever is actually on screen behind the glass. */
export function wallpaperTone(w: Wallpaper, appearance: Tone): Tone {
  return w.kind === 'photo' ? w.tone : appearance
}

/** Unsplash's imgix CDN resizes on the fly; `auto=format` serves AVIF/WebP to
 *  browsers that accept them. Width is rounded to a few buckets so the CDN
 *  cache stays warm across visitors. */
export function photoUrl(w: PhotoWallpaper, width: number): string {
  const buckets = [640, 1280, 1920, 2560, 3200]
  const wpx = buckets.find((b) => b >= width) ?? 3200
  return `${w.src}?w=${wpx}&q=78&auto=format&fit=crop&crop=entropy`
}

export function originalUrl(w: OriginalWallpaper, tone: Tone, size: 'full' | 'small' | 'thumb'): string {
  const suffix = size === 'full' ? '' : size === 'small' ? '-1280' : '-thumb'
  return `/wallpapers/${w.id}-${tone}${suffix}.webp`
}

export function thumbUrl(w: Wallpaper, tone: Tone): string | null {
  if (w.kind === 'original') return originalUrl(w, tone, 'thumb')
  if (w.kind === 'photo') return `${w.src}?w=360&q=60&auto=format&fit=crop&ar=16:10`
  return null
}

/** Unsplash's attribution guideline: link the photographer and Unsplash,
 *  with a referral tag identifying the app. */
export function creditLinks(w: PhotoWallpaper) {
  const ref = 'utm_source=nexora&utm_medium=referral'
  return {
    photographer: `https://unsplash.com/@${w.credit.username}?${ref}`,
    photo: `https://unsplash.com/photos/${w.credit.photoId}?${ref}`,
    unsplash: `https://unsplash.com/?${ref}`,
  }
}

export const ACCENTS: { id: AccentId; label: string; swatch: string }[] = [
  { id: 'multicolor', label: 'Multicolour', swatch: 'conic-gradient(#ff453a, #ff9f0a, #ffd60a, #32d74b, #0a84ff, #bf5af2, #ff375f, #ff453a)' },
  { id: 'blue', label: 'Blue', swatch: '#0a84ff' },
  { id: 'purple', label: 'Purple', swatch: '#bf5af2' },
  { id: 'pink', label: 'Pink', swatch: '#ff375f' },
  { id: 'red', label: 'Red', swatch: '#ff453a' },
  { id: 'orange', label: 'Orange', swatch: '#ff9f0a' },
  { id: 'yellow', label: 'Yellow', swatch: '#ffd60a' },
  { id: 'green', label: 'Green', swatch: '#32d74b' },
  { id: 'graphite', label: 'Graphite', swatch: '#8e8e93' },
]

export function resolveAccent(accent: AccentId, w: Wallpaper): Exclude<AccentId, 'multicolor'> {
  return accent === 'multicolor' ? w.accent : accent
}
