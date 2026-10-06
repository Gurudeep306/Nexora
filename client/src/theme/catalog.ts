/**
 * The look catalogue: wallpapers, accent colours, card styles, and icon packs.
 *
 * Provides deep customizability across Nexora:
 *  • Wallpapers:
 *      - Originals (dynamic light/dark responsive)
 *      - Cyberpunk & High-Tech Matrix
 *      - Cosmic Deep Space & Galaxies
 *      - Abstract 3D & Digital Art
 *      - Atmospheric Nature & Landscapes
 *      - Custom User Wallpapers (Upload your own file or paste URL)
 *  • Card Styles (Glass, Cyber Neon, Minimal Matte, Hologram 3D, Aurora Mesh)
 *  • Icon Packs (Vibrant Tiles, Cyber Neon, Minimal Monochrome, Duotone, 3D Embossed)
 *  • Icon Shapes (Squircle, Circle, Hexagon, Floating)
 *  • Accent Colours (12 rich curated chromatic schemes)
 */

export type Tone = 'light' | 'dark'

export type AccentId =
  | 'multicolor'
  | 'blue'
  | 'cyan'
  | 'purple'
  | 'plasma'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'ice'
  | 'graphite'

export type GlassStyle = 'frosted' | 'clear' | 'solid'

export type CardStyle = 'glass' | 'neon' | 'minimal' | 'holo' | 'gradient'

export type IconPack = 'vibrant' | 'neon' | 'minimal' | 'duotone' | 'clay'

export type IconShape = 'squircle' | 'circle' | 'hexagon' | 'free'

export const GLASS_STYLES: { id: GlassStyle; label: string; hint: string }[] = [
  { id: 'frosted', label: 'Frosted', hint: 'Soft, diffused glass — the macOS NSVisualEffectView standard.' },
  { id: 'clear', label: 'Clear', hint: 'High-transparency pane — maximum wallpaper visibility.' },
  { id: 'solid', label: 'Solid', hint: 'Opaque solid panes with no blur — reduce transparency.' },
]

export const CARD_STYLES: { id: CardStyle; label: string; hint: string; previewClass: string }[] = [
  {
    id: 'glass',
    label: 'macOS Smoked Glass',
    hint: 'Frosted translucency, specular top highlight, and desktop color tinting.',
    previewClass: 'border-white/10 bg-white/5 backdrop-blur-md',
  },
  {
    id: 'neon',
    label: 'Cyber Neon Glow',
    hint: 'Electric accent laser border, deep obsidian core, and ambient cyber bloom.',
    previewClass: 'border-accent-brand/60 bg-black/80 shadow-[0_0_15px_var(--color-accent-brand-glow)]',
  },
  {
    id: 'minimal',
    label: 'Minimalist Matte',
    hint: 'Clean 1px crisp hairline, zero blur, maximum focus and high-contrast readability.',
    previewClass: 'border-border-strong bg-bg-surface-2',
  },
  {
    id: 'holo',
    label: 'Holographic 3D',
    hint: 'Floating dimensional cards with lifted drop shadows and specular iridescence.',
    previewClass: 'border-white/20 bg-gradient-to-b from-white/10 to-transparent shadow-2xl',
  },
  {
    id: 'gradient',
    label: 'Aurora Mesh',
    hint: 'Subtle ambient chromatic gradient wash across pane surfaces.',
    previewClass: 'border-accent-brand/20 bg-gradient-to-br from-accent-brand/10 via-bg-surface-2 to-transparent',
  },
]

export const ICON_PACKS: { id: IconPack; label: string; hint: string }[] = [
  { id: 'vibrant', label: 'Vibrant Tiles', hint: 'macOS-inspired rich saturated gradient tiles with specular top sheen.' },
  { id: 'neon', label: 'Cyber Neon', hint: 'Electric glowing laser strokes with dark background pods and neon aura.' },
  { id: 'minimal', label: 'Minimal Monochrome', hint: 'Sleek, distraction-free neutral glyphs with subtle hover lift.' },
  { id: 'duotone', label: 'Duotone Layered', hint: 'Two-tone depth with tinted translucent secondary fills.' },
  { id: 'clay', label: '3D Embossed', hint: 'Soft isometric tactile bevel and specular embossed lighting.' },
]

export const ICON_SHAPES: { id: IconShape; label: string }[] = [
  { id: 'squircle', label: 'Squircle (28%)' },
  { id: 'circle', label: 'Circular Pod' },
  { id: 'hexagon', label: 'Cyber Hexagon' },
  { id: 'free', label: 'Floating Glyph' },
]

export interface ThemePreset {
  id: string
  name: string
  badge: string
  description: string
  wallpaper: string
  accent: AccentId
  cardStyle: CardStyle
  iconPack: IconPack
  iconShape: IconShape
  glowColor: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'cyber-matrix',
    name: 'Cyberpunk Matrix',
    badge: 'Futuristic',
    description: 'Neon Tokyo backdrop, Quantum Cyan glow, Cyber Neon cards and glowing laser icons.',
    wallpaper: 'cyber-tokyo',
    accent: 'cyan',
    cardStyle: 'neon',
    iconPack: 'neon',
    iconShape: 'hexagon',
    glowColor: '#06b6d4',
  },
  {
    id: 'cosmic-void',
    name: 'Cosmic Supernova',
    badge: 'Astronomy',
    description: 'Deep Orion Supernova, Deep Violet accent, Holographic 3D cards and 3D clay icons.',
    wallpaper: 'deep-space',
    accent: 'purple',
    cardStyle: 'holo',
    iconPack: 'clay',
    iconShape: 'circle',
    glowColor: '#bf5af2',
  },
  {
    id: 'liquid-obsidian',
    name: 'Liquid Obsidian',
    badge: 'Luxury 3D',
    description: 'Dark reflective liquid chrome, Hyper Plasma accent, smoked glass, and duotone icons.',
    wallpaper: 'liquid-chrome',
    accent: 'plasma',
    cardStyle: 'glass',
    iconPack: 'duotone',
    iconShape: 'squircle',
    glowColor: '#d946ef',
  },
  {
    id: 'solar-ember',
    name: 'Solar Flare',
    badge: 'High Contrast',
    description: 'Ember horizon, vibrant amber gold, Aurora Mesh cards, and saturated vibrant tiles.',
    wallpaper: 'ember',
    accent: 'orange',
    cardStyle: 'gradient',
    iconPack: 'vibrant',
    iconShape: 'squircle',
    glowColor: '#ff9f0a',
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Terminal',
    badge: 'Cyber Matrix',
    description: 'Borealis northern lights, Matrix Emerald accent, Cyber Neon cards and glowing icons.',
    wallpaper: 'borealis',
    accent: 'green',
    cardStyle: 'neon',
    iconPack: 'neon',
    iconShape: 'hexagon',
    glowColor: '#32d74b',
  },
  {
    id: 'frost-summit',
    name: 'Alpine Frost',
    badge: 'Crisp & Clean',
    description: 'Misty glacial peaks, Frost Ice accent, macOS crystal glass, and circular pods.',
    wallpaper: 'misty-peaks',
    accent: 'ice',
    cardStyle: 'glass',
    iconPack: 'vibrant',
    iconShape: 'circle',
    glowColor: '#38bdf8',
  },
  {
    id: 'monolith-dark',
    name: 'Monolith Minimal',
    badge: 'Zen Focus',
    description: 'Deep carbon angles, Pure Graphite accent, Minimalist matte cards, and clean floating glyphs.',
    wallpaper: 'dark-geometry',
    accent: 'graphite',
    cardStyle: 'minimal',
    iconPack: 'minimal',
    iconShape: 'free',
    glowColor: '#8e8e93',
  },
]

interface BaseWallpaper {
  id: string
  name: string
  accent: Exclude<AccentId, 'multicolor'>
}

export interface OriginalWallpaper extends BaseWallpaper {
  kind: 'original'
  color: Record<Tone, string>
  tint: Record<Tone, string>
}

export interface PhotoWallpaper extends BaseWallpaper {
  kind: 'photo'
  category: 'cyber' | 'space' | 'abstract' | 'nature'
  tone: Tone
  src: string
  color: string
  tint: string
  credit: { name: string; username: string; photoId: string }
}

export interface CustomWallpaper extends BaseWallpaper {
  kind: 'custom'
  tone: Tone
  src: string
  color: string
  tint: string
}

export interface PlainWallpaper extends BaseWallpaper {
  kind: 'none'
}

export type Wallpaper = OriginalWallpaper | PhotoWallpaper | CustomWallpaper | PlainWallpaper

/* ── Originals (Dynamic light/dark responsive) ────────────────────────── */
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

/* ── Photography / High-res Artwork ────────────────────────────────────── */
export const PHOTOS: PhotoWallpaper[] = [
  /* Cyberpunk & Future Matrix */
  {
    id: 'cyber-tokyo', name: 'Tokyo Neon Night', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5',
    color: '#160824', tint: '#3c1860',
    credit: { name: 'Aleksandar Pasaric', username: 'apasaric', photoId: 'tokyo-neon' },
  },
  {
    id: 'cyber-grid', name: 'Matrix Grid', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
    color: '#04181f', tint: '#064357',
    credit: { name: 'Markus Spiske', username: 'markusspiske', photoId: 'matrix-code' },
  },
  {
    id: 'synthwave', name: 'Synthwave Highway', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'pink',
    src: 'https://images.unsplash.com/photo-1514565131-fce0801e5785',
    color: '#21062e', tint: '#571378',
    credit: { name: 'Sasha Freemind', username: 'sashafreemind', photoId: 'synth-glow' },
  },
  {
    id: 'cyber-city', name: 'Hologram Metropolis', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    color: '#09152b', tint: '#123166',
    credit: { name: 'Benjamin Davies', username: 'bendavisual', photoId: 'cyber-city' },
  },
  {
    id: 'retro-grid', name: 'Neon Arcade', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'orange',
    src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
    color: '#1a0d24', tint: '#421d5c',
    credit: { name: 'Lorenzo Herrera', username: 'lorenzoherrera', photoId: 'arcade-glow' },
  },
  {
    id: 'cyber-circuit', name: 'Quantum Circuit', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    color: '#081729', tint: '#0d325e',
    credit: { name: 'Alexandre Debiève', username: 'alexandre_debieve', photoId: 'quantum-chip' },
  },

  /* Cosmic Deep Space & Astronomy */
  {
    id: 'carina-nebula', name: 'Cosmic Web', kind: 'photo', category: 'space', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
    color: '#030c1e', tint: '#092557',
    credit: { name: 'NASA', username: 'nasa', photoId: 'deep-space-earth' },
  },
  {
    id: 'deep-space', name: 'Orion Supernova', kind: 'photo', category: 'space', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564',
    color: '#120421', tint: '#300a57',
    credit: { name: 'NASA', username: 'nasa', photoId: 'supernova-orion' },
  },
  {
    id: 'starlight', name: 'Galactic Core', kind: 'photo', category: 'space', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86',
    color: '#080d21', tint: '#162252',
    credit: { name: 'Guillermo Ferla', username: 'gferla', photoId: 'starlight-core' },
  },
  {
    id: 'lunar-orbit', name: 'Earth from Orbit', kind: 'photo', category: 'space', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa',
    color: '#051124', tint: '#0d2854',
    credit: { name: 'NASA', username: 'nasa', photoId: 'earth-orbit' },
  },
  {
    id: 'milky-way', name: 'Milky Way Apex', kind: 'photo', category: 'space', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47',
    color: '#0f0c24', tint: '#292161',
    credit: { name: 'Denis Degioanni', username: 'denisdegioanni', photoId: 'milkyway-apex' },
  },

  /* Abstract 3D & Digital Art */
  {
    id: 'liquid-chrome', name: 'Liquid Obsidian', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
    color: '#0e0b17', tint: '#291e45',
    credit: { name: 'Milad Fakurian', username: 'fakurian', photoId: 'liquid-obsidian' },
  },
  {
    id: 'prism-flow', name: 'Prismatic Glass', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'pink',
    src: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4',
    color: '#1a0a24', tint: '#42165c',
    credit: { name: 'Shubham Dhage', username: 'theshubhamdhage', photoId: 'prismatic-flow' },
  },
  {
    id: 'quantum-mesh', name: 'Quantum Manifold', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead',
    color: '#091326', tint: '#193263',
    credit: { name: 'Milad Fakurian', username: 'fakurian', photoId: 'quantum-manifold' },
  },
  {
    id: 'neon-waves', name: 'Cybernetic Gradient', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'orange',
    src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
    color: '#240a18', tint: '#5c193c',
    credit: { name: 'Pawel Czerwinski', username: 'pawel_czerwinski', photoId: 'gradient-abstract' },
  },
  {
    id: 'dark-geometry', name: 'Monolith Angles', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'graphite',
    src: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071',
    color: '#121317', tint: '#2a2b33',
    credit: { name: 'Scott Webb', username: 'scottwebb', photoId: 'monolith-angles' },
  },
  {
    id: 'laser-lines', name: 'Prism Geometry', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1563089145-599997674d42',
    color: '#071821', tint: '#124157',
    credit: { name: 'Steve Johnson', username: 'steve_j', photoId: 'prism-geometry' },
  },

  /* Atmospheric Nature & Landscapes */
  {
    id: 'alpine', name: 'Alpine Lake', kind: 'photo', category: 'nature', tone: 'light', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1603979649806-5299879db16b',
    color: '#3a3a1c', tint: '#4a4a2a',
    credit: { name: 'Ansgar Scheffold', username: 'ansgarscheffold', photoId: 'z_f2JrBRbOg' },
  },
  {
    id: 'shoreline', name: 'Shoreline', kind: 'photo', category: 'nature', tone: 'light', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1501696461415-6bd6660c6742',
    color: '#9fd3d8', tint: '#bfe6ea',
    credit: { name: 'Nattu Adnan', username: 'reallynattu', photoId: 'Ai2TRdvI6gM' },
  },
  {
    id: 'surf', name: 'Deep Surf', kind: 'photo', category: 'nature', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1510279770292-4b34de9f5c23',
    color: '#0c2640', tint: '#123a5c',
    credit: { name: 'Iswanto Arif', username: 'iswanto', photoId: 'OJ74pFtrYi0' },
  },
  {
    id: 'fogwood', name: 'Fogwood', kind: 'photo', category: 'nature', tone: 'dark', accent: 'graphite',
    src: 'https://images.unsplash.com/photo-1487621167305-5d248087c724',
    color: '#3a3d45', tint: '#40444e',
    credit: { name: 'Paul Pastourmatzis', username: 'paulpastourmatzis', photoId: 'KT3WlrL_bsg' },
  },
  {
    id: 'glow', name: 'Desert Glow', kind: 'photo', category: 'nature', tone: 'dark', accent: 'orange',
    src: 'https://images.unsplash.com/photo-1548272475-4a32d90e4f91',
    color: '#5a2616', tint: '#7a3a22',
    credit: { name: 'Mikk Tõnissoo', username: 'themikk', photoId: 'PWf-Dr2qpOo' },
  },
  {
    id: 'stillnight', name: 'Still Night', kind: 'photo', category: 'nature', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1509773896068-7fd415d91e2e',
    color: '#101a33', tint: '#1e2c52',
    credit: { name: 'Jackson Hendry', username: 'actionjackson801', photoId: 'eodA_8CTOFo' },
  },
  {
    id: 'borealis', name: 'Borealis', kind: 'photo', category: 'nature', tone: 'dark', accent: 'green',
    src: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73',
    color: '#1a0d26', tint: '#2a1a3a',
    credit: { name: 'Vincent Guth', username: 'vingtcent', photoId: '62V7ntlKgL8' },
  },
  {
    id: 'metropolis', name: 'Metropolis', kind: 'photo', category: 'nature', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1599578705716-8d3d9246f53b',
    color: '#0c1a2c', tint: '#15304d',
    credit: { name: 'Ethan Lin', username: 'ethan90212', photoId: 'AEKdzZn_bBI' },
  },
  {
    id: 'summit', name: 'Summit', kind: 'photo', category: 'nature', tone: 'light', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1596716005561-2f9e129bf613',
    color: '#8fb7e0', tint: '#bcd6f0',
    credit: { name: 'Brigitta Schneiter', username: 'brisch27', photoId: 'ipBuOAhWVec' },
  },
  {
    id: 'fuji-dusk', name: 'Fuji Dusk', kind: 'photo', category: 'nature', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e',
    color: '#1f132e', tint: '#422863',
    credit: { name: 'Kalina Mumford', username: 'kalinamumford', photoId: 'fuji-dusk' },
  },
  {
    id: 'misty-peaks', name: 'Misty Peaks', kind: 'photo', category: 'nature', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
    color: '#0a1d2e', tint: '#164369',
    credit: { name: 'Kalon Cochrane', username: 'kaloncochrane', photoId: 'misty-peaks' },
  },
]

export const PLAIN: PlainWallpaper = { id: 'none', name: 'No wallpaper', kind: 'none', accent: 'blue' }

export const WALLPAPERS: Wallpaper[] = [...ORIGINALS, ...PHOTOS, PLAIN]

export const DEFAULT_WALLPAPER = 'aurora'

/* ── Custom User Wallpapers Storage ────────────────────────────────────── */
const CUSTOM_WALLPAPERS_KEY = 'nexora:custom_wallpapers'

export function getCustomWallpapers(): CustomWallpaper[] {
  try {
    const raw = localStorage.getItem(CUSTOM_WALLPAPERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CustomWallpaper[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomWallpaper(wp: CustomWallpaper): void {
  try {
    const existing = getCustomWallpapers().filter((w) => w.id !== wp.id)
    localStorage.setItem(CUSTOM_WALLPAPERS_KEY, JSON.stringify([wp, ...existing]))
  } catch {
    /* storage full or unavailable */
  }
}

export function removeCustomWallpaper(id: string): void {
  try {
    const existing = getCustomWallpapers().filter((w) => w.id !== id)
    localStorage.setItem(CUSTOM_WALLPAPERS_KEY, JSON.stringify(existing))
  } catch {
    /* ignore */
  }
}

export function findWallpaper(id: string | null | undefined): Wallpaper {
  if (id && id.startsWith('custom_')) {
    const custom = getCustomWallpapers().find((w) => w.id === id)
    if (custom) return custom
  }
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS.find((w) => w.id === DEFAULT_WALLPAPER)!
}

export function wallpaperTone(w: Wallpaper, appearance: Tone): Tone {
  return w.kind === 'photo' || w.kind === 'custom' ? w.tone : appearance
}

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
  if (w.kind === 'custom') return w.src
  return null
}

export function creditLinks(w: PhotoWallpaper) {
  const ref = 'utm_source=nexora&utm_medium=referral'
  return {
    photographer: `https://unsplash.com/@${w.credit.username}?${ref}`,
    photo: `https://unsplash.com/photos/${w.credit.photoId}?${ref}`,
    unsplash: `https://unsplash.com/?${ref}`,
  }
}

/* ── 12 Curated Chromatic Accent Schemes ────────────────────────────────── */
export const ACCENTS: { id: AccentId; label: string; swatch: string }[] = [
  { id: 'multicolor', label: 'Multicolour', swatch: 'conic-gradient(#ff453a, #ff9f0a, #ffd60a, #32d74b, #0a84ff, #bf5af2, #ff375f, #ff453a)' },
  { id: 'blue', label: 'Electric Blue', swatch: '#0a84ff' },
  { id: 'cyan', label: 'Quantum Cyan', swatch: '#06b6d4' },
  { id: 'ice', label: 'Frost Ice', swatch: '#38bdf8' },
  { id: 'purple', label: 'Deep Violet', swatch: '#bf5af2' },
  { id: 'plasma', label: 'Hyper Plasma', swatch: '#d946ef' },
  { id: 'pink', label: 'Neon Cherry', swatch: '#ff375f' },
  { id: 'red', label: 'Crimson Pulse', swatch: '#ff453a' },
  { id: 'orange', label: 'Solar Flare', swatch: '#ff9f0a' },
  { id: 'yellow', label: 'Cyber Gold', swatch: '#ffd60a' },
  { id: 'green', label: 'Matrix Emerald', swatch: '#32d74b' },
  { id: 'graphite', label: 'Pure Graphite', swatch: '#8e8e93' },
]

export function resolveAccent(accent: AccentId, w: Wallpaper): Exclude<AccentId, 'multicolor'> {
  return accent === 'multicolor' ? w.accent : accent
}
