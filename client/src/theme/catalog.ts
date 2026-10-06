/**
 * The look catalogue: wallpapers, accent colours, card styles, icon packs, and typography.
 *
 * Provides deep customizability across Nexora:
 *  • Curated Theme Packs (Predesigned complete environments across Anime, Gaming, Series, Cyber & Space)
 *  • Wallpapers across 7 Genres:
 *      - Anime & Studio Ghibli
 *      - Pokemon & Legendary Gaming
 *      - Sci-Fi & Pop Culture Series
 *      - Cyberpunk & High-Tech Matrix
 *      - Cosmic Deep Space & Galaxies (NASA 4K Public Domain)
 *      - Abstract 3D & Octane Luxury Art
 *      - Atmospheric 4K Landscapes
 *      - Custom User Wallpapers (Upload personal files or image URLs)
 *  • Typography & Handwriting Engine (Handwriting Script, Modern Sans, Cyber Mono, Classic Editorial, 8-Bit Retro)
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

export type FontStyle = 'modern' | 'handwriting' | 'cyber' | 'serif' | 'retro'

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

/* ── Typography & Handwriting Options ────────────────────────────────────── */
export const FONT_STYLES: { id: FontStyle; label: string; hint: string; sample: string; badge: string }[] = [
  {
    id: 'modern',
    label: 'Modern Sans',
    hint: 'Native Apple SF Pro & Inter typography for crisp UI clarity.',
    sample: 'Algorithms & Code',
    badge: 'Clean Sans',
  },
  {
    id: 'handwriting',
    label: 'Handwriting Script',
    hint: 'Organic expressive calligraphy (Caveat & Kalam) for a personalized handwritten vibe.',
    sample: 'Quick notes & ideas ✨',
    badge: 'Handwritten',
  },
  {
    id: 'cyber',
    label: 'Cyber Mono',
    hint: 'Developer monospace terminal code style (JetBrains Mono & Fira Code).',
    sample: 'const solve = () => 42;',
    badge: 'Monospace',
  },
  {
    id: 'serif',
    label: 'Classic Editorial',
    hint: 'Refined literary serif with high academic elegance (Playfair Display).',
    sample: 'Philosophy of Computing',
    badge: 'Editorial',
  },
  {
    id: 'retro',
    label: '8-Bit Arcade',
    hint: 'Nostalgic pixelated gaming font from the golden 8-bit arcade era.',
    sample: 'READY PLAYER ONE',
    badge: 'Retro 8-Bit',
  },
]

/* ── Curated Complete Theme Packs ────────────────────────────────────────── */
export interface ThemePack {
  id: string
  name: string
  genre: 'anime' | 'gaming' | 'series' | 'cyber' | 'space' | 'minimal' | 'nature'
  badge: string
  description: string
  wallpaper: string
  accent: AccentId
  cardStyle: CardStyle
  iconPack: IconPack
  iconShape: IconShape
  fontStyle: FontStyle
  glowColor: string
}

export const THEME_PACKS: ThemePack[] = [
  /* Anime & Studio Ghibli */
  {
    id: 'ghibli-meadow',
    name: 'Studio Ghibli Meadow',
    genre: 'anime',
    badge: 'Anime Classic',
    description: 'Tranquil countryside meadow under summer cumulus anime clouds with handwritten cursive warmth.',
    wallpaper: 'ghibli-meadow',
    accent: 'green',
    cardStyle: 'glass',
    iconPack: 'vibrant',
    iconShape: 'circle',
    fontStyle: 'handwriting',
    glowColor: '#32d74b',
  },
  {
    id: 'your-name-dusk',
    name: 'Your Name Twilight Comet',
    genre: 'anime',
    badge: 'Anime Romance',
    description: 'Makoto Shinkai style cosmic twilight dusk sky, hyper violet plasma, holographic cards and handwritten notes.',
    wallpaper: 'your-name-dusk',
    accent: 'plasma',
    cardStyle: 'holo',
    iconPack: 'duotone',
    iconShape: 'squircle',
    fontStyle: 'handwriting',
    glowColor: '#d946ef',
  },
  {
    id: 'neo-tokyo-rain',
    name: 'Neo-Tokyo Edgerunners',
    genre: 'anime',
    badge: 'Anime Cyberpunk',
    description: 'Rain-slicked Shibuya alley with vibrant lanterns, Cyber Neon cards, cyber mono font and neon laser glyphs.',
    wallpaper: 'tokyo-rain-neon',
    accent: 'purple',
    cardStyle: 'neon',
    iconPack: 'neon',
    iconShape: 'hexagon',
    fontStyle: 'cyber',
    glowColor: '#bf5af2',
  },
  {
    id: 'wisteria-moon',
    name: 'Demon Slayer Wisteria',
    genre: 'anime',
    badge: 'Anime Fantasy',
    description: 'Glowing purple wisteria blossoms under moonlight, deep violet accents, and floating glass cards.',
    wallpaper: 'wisteria-moon',
    accent: 'purple',
    cardStyle: 'glass',
    iconPack: 'vibrant',
    iconShape: 'circle',
    fontStyle: 'handwriting',
    glowColor: '#bf5af2',
  },

  /* Pokemon & Gaming Legends */
  {
    id: 'pikachu-volt',
    name: 'Pikachu Thunderbolt',
    genre: 'gaming',
    badge: 'Pokemon Electric',
    description: 'Crackling electric storm lightning, intense Cyber Gold accent, Neon glowing cards and 8-bit retro arcade vibes.',
    wallpaper: 'pikachu-volt',
    accent: 'yellow',
    cardStyle: 'neon',
    iconPack: 'vibrant',
    iconShape: 'circle',
    fontStyle: 'retro',
    glowColor: '#ffd60a',
  },
  {
    id: 'charizard-core',
    name: 'Charizard Volcanic Core',
    genre: 'gaming',
    badge: 'Pokemon Fire',
    description: 'Roaring molten magma core, solar flare amber glow, Aurora Mesh flowing cards and tactile clay pods.',
    wallpaper: 'charizard-core',
    accent: 'orange',
    cardStyle: 'gradient',
    iconPack: 'clay',
    iconShape: 'squircle',
    fontStyle: 'modern',
    glowColor: '#ff9f0a',
  },
  {
    id: 'lavender-mystic',
    name: 'Lavender Town Mystical',
    genre: 'gaming',
    badge: 'Pokemon Ghost',
    description: 'Ethereal lavender nebula fog, phantom purple lighting, holographic cards and mysterious cursive script.',
    wallpaper: 'lavender-fog',
    accent: 'purple',
    cardStyle: 'holo',
    iconPack: 'duotone',
    iconShape: 'circle',
    fontStyle: 'handwriting',
    glowColor: '#bf5af2',
  },
  {
    id: 'elden-tree',
    name: 'Elden Ring Erdtree',
    genre: 'gaming',
    badge: 'Soulslike Fantasy',
    description: 'Colossal radiant golden tree glowing in the twilight mist, golden grace accent and refined literary serif.',
    wallpaper: 'elden-tree',
    accent: 'yellow',
    cardStyle: 'glass',
    iconPack: 'clay',
    iconShape: 'circle',
    fontStyle: 'serif',
    glowColor: '#ffd60a',
  },
  {
    id: 'cyberpunk-2077',
    name: 'Cyberpunk 2077 Night City',
    genre: 'gaming',
    badge: 'Sci-Fi RPG',
    description: 'Towering megacity skyline, Quantum Cyan laser grids, cyber hexagon icons and monospace terminal font.',
    wallpaper: 'night-city-2077',
    accent: 'cyan',
    cardStyle: 'neon',
    iconPack: 'neon',
    iconShape: 'hexagon',
    fontStyle: 'cyber',
    glowColor: '#06b6d4',
  },

  /* Famous Sci-Fi & Pop Culture Series */
  {
    id: 'interstellar-void',
    name: 'Interstellar Gargantua',
    genre: 'series',
    badge: 'Sci-Fi Epic',
    description: 'Gravitational accretion disk around a supermassive black hole, Solar Flare gold rim, and 3D Hologram cards.',
    wallpaper: 'gargantua-hole',
    accent: 'orange',
    cardStyle: 'holo',
    iconPack: 'clay',
    iconShape: 'circle',
    fontStyle: 'modern',
    glowColor: '#ff9f0a',
  },
  {
    id: 'spider-glitch',
    name: 'Spider-Verse Multiverse',
    genre: 'series',
    badge: 'Marvel Multiverse',
    description: 'Chromatic glitch reality tears, Neon Cherry crimson pulses, cyber neon cards and street-art comic energy.',
    wallpaper: 'spider-portal',
    accent: 'pink',
    cardStyle: 'neon',
    iconPack: 'neon',
    iconShape: 'hexagon',
    fontStyle: 'cyber',
    glowColor: '#ff375f',
  },
  {
    id: 'matrix-terminal',
    name: 'The Matrix Terminal',
    genre: 'series',
    badge: 'Cult Sci-Fi',
    description: 'Cascading emerald green digital code on obsidian terminal, pure green neon cards and developer monospace.',
    wallpaper: 'matrix-terminal',
    accent: 'green',
    cardStyle: 'neon',
    iconPack: 'neon',
    iconShape: 'hexagon',
    fontStyle: 'cyber',
    glowColor: '#32d74b',
  },
  {
    id: 'arcane-hextech',
    name: 'Arcane Hextech Core',
    genre: 'series',
    badge: 'Piltover Tech',
    description: 'Pulsating electric cyan hextech crystal core, brass astrolabe contours, holographic cards and classic serif font.',
    wallpaper: 'arcane-hextech',
    accent: 'cyan',
    cardStyle: 'holo',
    iconPack: 'duotone',
    iconShape: 'squircle',
    fontStyle: 'serif',
    glowColor: '#06b6d4',
  },

  /* Minimal & Nature */
  {
    id: 'monolith-zen',
    name: 'Monolith Minimal Zen',
    genre: 'minimal',
    badge: 'Brutalist Focus',
    description: 'Pure graphite geometric monoliths, clean 1px hairline matte cards, zero blur and distraction-free clarity.',
    wallpaper: 'dark-geometry',
    accent: 'graphite',
    cardStyle: 'minimal',
    iconPack: 'minimal',
    iconShape: 'free',
    fontStyle: 'modern',
    glowColor: '#8e8e93',
  },
  {
    id: 'synthwave-outrun',
    name: '80s Synthwave Outrun',
    genre: 'cyber',
    badge: 'Retro Futurism',
    description: 'Neon wireframe horizon, gradient glowing sun, Hyper Plasma neon cards and 8-bit retro gaming typography.',
    wallpaper: 'synthwave-grid',
    accent: 'plasma',
    cardStyle: 'gradient',
    iconPack: 'vibrant',
    iconShape: 'squircle',
    fontStyle: 'retro',
    glowColor: '#d946ef',
  },
  {
    id: 'alpine-frost',
    name: 'Alpine Glacial Mist',
    genre: 'nature',
    badge: 'Crisp & Clean',
    description: 'Mirror-still turquoise glacial lake, Frost Ice accent, macOS crystal glass cards and handwritten script.',
    wallpaper: 'alpine-mirror',
    accent: 'ice',
    cardStyle: 'glass',
    iconPack: 'vibrant',
    iconShape: 'circle',
    fontStyle: 'handwriting',
    glowColor: '#38bdf8',
  },
]

/* Backwards compatibility alias */
export const THEME_PRESETS = THEME_PACKS
export type ThemePreset = ThemePack

/* ── Wallpaper Models ────────────────────────────────────────────────────── */
export type WallpaperCategory = 'anime' | 'gaming' | 'series' | 'cyber' | 'space' | 'abstract' | 'nature'

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
  category: WallpaperCategory
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

/* ── 4K Royalty-Free & Public Domain Curated Photography ─────────────────── */
export const PHOTOS: PhotoWallpaper[] = [
  /* ── 1. Anime & Studio Ghibli ── */
  {
    id: 'ghibli-meadow', name: 'Ghibli Summer Meadow', kind: 'photo', category: 'anime', tone: 'light', accent: 'green',
    src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
    color: '#1a3318', tint: '#2f5e2c',
    credit: { name: 'Bailey Zindel', username: 'baileyzindel', photoId: 'meadow-valley' },
  },
  {
    id: 'your-name-dusk', name: 'Your Name Twilight Comet', kind: 'photo', category: 'anime', tone: 'dark', accent: 'plasma',
    src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba',
    color: '#1a102b', tint: '#3e2469',
    credit: { name: 'Benjamin Davies', username: 'bendavisual', photoId: 'milky-way-shooting-star' },
  },
  {
    id: 'tokyo-rain-neon', name: 'Neo-Tokyo Neon Rain', kind: 'photo', category: 'anime', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26',
    color: '#0d1326', tint: '#1f2e5c',
    credit: { name: 'Aleksandar Pasaric', username: 'apasaric', photoId: 'tokyo-shinjuku-neon' },
  },
  {
    id: 'wisteria-moon', name: 'Demon Slayer Sakura Moonlight', kind: 'photo', category: 'anime', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1522383225653-ed111181a951',
    color: '#24081c', tint: '#571342',
    credit: { name: 'AJ', username: 'aj_blossoms', photoId: 'sakura-night' },
  },
  {
    id: 'anime-shrine', name: 'Fushimi Inari Torii Shrine', kind: 'photo', category: 'anime', tone: 'dark', accent: 'orange',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/1920px-Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg',
    color: '#260f08', tint: '#542012',
    credit: { name: 'Basile Morin', username: 'wikimedia', photoId: 'fushimi-inari' },
  },
  {
    id: 'cherry-blossom-night', name: 'Kyoto Yasaka Lanterns', kind: 'photo', category: 'anime', tone: 'dark', accent: 'orange',
    src: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
    color: '#24081c', tint: '#571342',
    credit: { name: 'Soragrit Wongsa', username: 'soragrit', photoId: 'kyoto-yasaka' },
  },

  /* ── 2. Pokemon & Legendary Gaming ── */
  {
    id: 'pikachu-volt', name: 'Pikachu Thunderbolt Storm', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'yellow',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Port_and_lighthouse_overnight_storm_with_lightning_in_Port-la-Nouvelle.jpg/1920px-Port_and_lighthouse_overnight_storm_with_lightning_in_Port-la-Nouvelle.jpg',
    color: '#1a1829', tint: '#38325e',
    credit: { name: 'Christian Ferrer', username: 'wikimedia', photoId: 'lightning-storm' },
  },
  {
    id: 'charizard-core', name: 'Charizard Volcanic Magma', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'orange',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/001_Volcano_eruption_of_Litli-Hr%C3%BAtur_in_Iceland_in_2023_Photo_by_Giles_Laurent.jpg/1920px-001_Volcano_eruption_of_Litli-Hr%C3%BAtur_in_Iceland_in_2023_Photo_by_Giles_Laurent.jpg',
    color: '#2b0a04', tint: '#661a0b',
    credit: { name: 'Giles Laurent', username: 'wikimedia', photoId: 'volcano-eruption' },
  },
  {
    id: 'lavender-fog', name: 'Lavender Town Ethereal Mist', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
    color: '#150824', tint: '#37145c',
    credit: { name: 'Johannes Plenio', username: 'jplenio', photoId: 'ethereal-lake-mist' },
  },
  {
    id: 'elden-tree', name: 'Elden Ring Stormveil Citadel', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'yellow',
    src: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    color: '#211808', tint: '#4a3612',
    credit: { name: 'Benjamin Davies', username: 'bendavisual', photoId: 'gothic-citadel-fog' },
  },
  {
    id: 'night-city-2077', name: 'Cyberpunk 2077 Night City', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1514565131-fce0801e5785',
    color: '#071829', tint: '#0d385e',
    credit: { name: 'Sasha Freemind', username: 'sashafreemind', photoId: 'night-city-skyline' },
  },
  {
    id: 'pallet-dusk', name: 'Pallet Town Horizon', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'green',
    src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
    color: '#1e240c', tint: '#46541b',
    credit: { name: 'Federico Respini', username: 'federicorespini', photoId: 'pallet-hills' },
  },

  /* ── 3. Sci-Fi & Pop Culture Series ── */
  {
    id: 'gargantua-hole', name: 'Interstellar Cosmic Bubble', kind: 'photo', category: 'series', tone: 'dark', accent: 'orange',
    src: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564',
    color: '#1f0d05', tint: '#4f200c',
    credit: { name: 'NASA / JPL', username: 'nasa', photoId: 'supermassive-accretion' },
  },
  {
    id: 'spider-portal', name: 'Spider-Verse Neon Crossing', kind: 'photo', category: 'series', tone: 'dark', accent: 'pink',
    src: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989',
    color: '#260621', tint: '#5c104f',
    credit: { name: 'Jezael Melgoza', username: 'jezael', photoId: 'shibuya-neon-crossing' },
  },
  {
    id: 'matrix-terminal', name: 'Matrix Digital Rain', kind: 'photo', category: 'series', tone: 'dark', accent: 'green',
    src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
    color: '#031a0a', tint: '#084519',
    credit: { name: 'Markus Spiske', username: 'markusspiske', photoId: 'matrix-code-stream' },
  },
  {
    id: 'arcane-hextech', name: 'Arcane Hextech Core', kind: 'photo', category: 'series', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1563089145-599997674d42',
    color: '#071b26', tint: '#0f445e',
    credit: { name: 'Steve Johnson', username: 'steve_j', photoId: 'hextech-prism' },
  },
  {
    id: 'hyperspace-jump', name: 'Star Wars Hyperspace', kind: 'photo', category: 'series', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    color: '#061329', tint: '#0e2d5c',
    credit: { name: 'Alexandre Debiève', username: 'alexandre_debieve', photoId: 'hyperspace-speed' },
  },

  /* ── 4. Cosmic Deep Space (NASA 4K Public Domain) ── */
  {
    id: 'carina-cliffs', name: 'Earth Atmosphere Orbital Curve', kind: 'photo', category: 'space', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
    color: '#07152b', tint: '#103263',
    credit: { name: 'NASA', username: 'nasa', photoId: 'earth-orbital-atmosphere' },
  },
  {
    id: 'pillars-creation', name: 'Hubble Pillars of Creation 4K', kind: 'photo', category: 'space', tone: 'dark', accent: 'orange',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Eagle_nebula_pillars.jpg/1920px-Eagle_nebula_pillars.jpg',
    color: '#1a0e06', tint: '#472611',
    credit: { name: 'NASA / ESA / STScI', username: 'nasa', photoId: 'pillars-of-creation' },
  },
  {
    id: 'deep-space', name: 'Orion Supernova Remnant', kind: 'photo', category: 'space', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1447433589675-4aaa569f3e05',
    color: '#120421', tint: '#300a57',
    credit: { name: 'NASA', username: 'nasa', photoId: 'orion-supernova' },
  },
  {
    id: 'lunar-orbit', name: 'ISS Cupola Orbital Window', kind: 'photo', category: 'space', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa',
    color: '#051124', tint: '#0d2854',
    credit: { name: 'NASA', username: 'nasa', photoId: 'earth-orbital' },
  },
  {
    id: 'milky-way', name: 'Milky Way Apex', kind: 'photo', category: 'space', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47',
    color: '#0f0c24', tint: '#292161',
    credit: { name: 'Denis Degioanni', username: 'denisdegioanni', photoId: 'milkyway-apex' },
  },

  /* ── 5. Cyberpunk & High-Tech Matrix ── */
  {
    id: 'cyber-tokyo', name: 'Tokyo Cyber Metropolis', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989',
    color: '#0b1624', tint: '#183354',
    credit: { name: 'Alex Knight', username: 'agk42', photoId: 'shinjuku-cyber' },
  },
  {
    id: 'cyber-grid', name: 'Quantum Core Grid', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'cyan',
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    color: '#051624', tint: '#0d3654',
    credit: { name: 'Alexandre Debiève', username: 'alexandre_debieve', photoId: 'quantum-chip' },
  },
  {
    id: 'synthwave-grid', name: 'Outrun 80s Sunset Grid', kind: 'photo', category: 'cyber', tone: 'dark', accent: 'plasma',
    src: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071',
    color: '#260a2b', tint: '#5c1766',
    credit: { name: 'Scott Webb', username: 'scottwebb', photoId: 'synthwave-outrun' },
  },

  /* ── 6. Abstract 3D & Octane Luxury Art ── */
  {
    id: 'liquid-chrome', name: 'Liquid Obsidian Mercury', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'plasma',
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
    color: '#0e0b17', tint: '#291e45',
    credit: { name: 'Milad Fakurian', username: 'fakurian', photoId: 'liquid-obsidian-chrome' },
  },
  {
    id: 'prism-flow', name: 'Prismatic Glass Caustics', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'pink',
    src: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4',
    color: '#1a0a24', tint: '#42165c',
    credit: { name: 'Shubham Dhage', username: 'theshubhamdhage', photoId: 'prismatic-glass' },
  },
  {
    id: 'quantum-mesh', name: 'Quantum Manifold', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead',
    color: '#091326', tint: '#193263',
    credit: { name: 'Milad Fakurian', username: 'fakurian', photoId: 'quantum-manifold' },
  },
  {
    id: 'dark-geometry', name: 'Monolith Angles', kind: 'photo', category: 'abstract', tone: 'dark', accent: 'graphite',
    src: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071',
    color: '#121317', tint: '#2a2b33',
    credit: { name: 'Scott Webb', username: 'scottwebb', photoId: 'monolith-angles' },
  },

  /* ── 7. Atmospheric 4K Landscapes ── */
  {
    id: 'alpine-mirror', name: 'Glacial Alpine Mirror', kind: 'photo', category: 'nature', tone: 'dark', accent: 'ice',
    src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
    color: '#0a1d2e', tint: '#164369',
    credit: { name: 'Kalon Cochrane', username: 'kaloncochrane', photoId: 'glacial-mirror' },
  },
  {
    id: 'borealis-fjord', name: 'Lofoten Aurora Borealis', kind: 'photo', category: 'nature', tone: 'dark', accent: 'green',
    src: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7',
    color: '#0a1e17', tint: '#144534',
    credit: { name: 'Jonatan Pie', username: 'jonatanpie', photoId: 'lofoten-aurora' },
  },
  {
    id: 'fuji-sakura', name: 'Mount Fuji Twilight', kind: 'photo', category: 'nature', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e',
    color: '#1f132e', tint: '#422863',
    credit: { name: 'Kalina Mumford', username: 'kalinamumford', photoId: 'fuji-twilight' },
  },
  {
    id: 'deep-surf', name: 'Bioluminescent Ocean Surf', kind: 'photo', category: 'nature', tone: 'dark', accent: 'blue',
    src: 'https://images.unsplash.com/photo-1510279770292-4b34de9f5c23',
    color: '#0c2640', tint: '#123a5c',
    credit: { name: 'Iswanto Arif', username: 'iswanto', photoId: 'bioluminescent-surf' },
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

/** Delivers ultra-high resolution images up to 3840px 4K with premium compression (q=88). */
export function photoUrl(w: PhotoWallpaper, width: number): string {
  if (w.src.startsWith('https://upload.wikimedia.org') || w.src.startsWith('https://thumb.wikimedia.org')) {
    return w.src
  }
  const buckets = [640, 1280, 1920, 2560, 3840]
  const wpx = buckets.find((b) => b >= width) ?? 3840
  return `${w.src}?w=${wpx}&q=88&auto=format&fit=crop&crop=entropy`
}

export function originalUrl(w: OriginalWallpaper, tone: Tone, size: 'full' | 'small' | 'thumb'): string {
  const suffix = size === 'full' ? '' : size === 'small' ? '-1280' : '-thumb'
  return `/wallpapers/${w.id}-${tone}${suffix}.webp`
}

/** Delivers crisp, high-DPI thumbnail previews (w=720, q=85) to avoid blurry displays. */
export function thumbUrl(w: Wallpaper, tone: Tone): string | null {
  if (w.kind === 'original') return originalUrl(w, tone, 'thumb')
  if (w.kind === 'photo') {
    if (w.src.startsWith('https://upload.wikimedia.org') || w.src.startsWith('https://thumb.wikimedia.org')) {
      return w.src
    }
    return `${w.src}?w=720&q=85&auto=format&fit=crop&ar=16:10`
  }
  if (w.kind === 'custom') return w.src
  return null
}

export function creditLinks(w: PhotoWallpaper) {
  if (w.credit.username === 'wikimedia' || w.credit.username === 'nasa') {
    return {
      photographer: `https://commons.wikimedia.org/`,
      photo: w.src,
      unsplash: `https://commons.wikimedia.org/wiki/Main_Page`,
    }
  }
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
