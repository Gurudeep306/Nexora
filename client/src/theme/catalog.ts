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

export type IconPack =
  | 'vibrant'
  | 'neon'
  | 'anime'
  | 'glitch'
  | 'crystal'
  | 'retro'
  | 'emerald'
  | 'duotone'
  | 'clay'
  | 'minimal'

export type IconShape =
  | 'squircle'
  | 'circle'
  | 'diamond'
  | 'shield'
  | 'hexagon'
  | 'pill'
  | 'free'

export type FontStyle =
  | 'modern'
  | 'handwriting'
  | 'handwriting-caveat'
  | 'handwriting-kalam'
  | 'handwriting-architect'
  | 'handwriting-indie'
  | 'cyber'
  | 'serif'
  | 'retro'

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

export const ICON_PACKS: { id: IconPack; label: string; hint: string; previewBadge: string }[] = [
  { id: 'vibrant', label: 'Vibrant Tiles', hint: 'macOS-inspired rich saturated gradient tiles with specular top glass sheen.', previewBadge: 'macOS' },
  { id: 'neon', label: 'Cyber Neon', hint: 'Electric glowing laser strokes with dark background pods and neon aura bloom.', previewBadge: 'Cyber' },
  { id: 'anime', label: 'Anime Pastel Aura', hint: 'Pastel celestial shimmer with kawaii glowing aura and soft star highlights.', previewBadge: 'Anime' },
  { id: 'glitch', label: 'Chromatic Glitch', hint: 'Split-channel cyan and magenta RGB shift with scanline edges.', previewBadge: 'Glitch' },
  { id: 'crystal', label: 'Crystal Prism Glass', hint: 'Hyper-refractive diamond glassmorphism with iridescent chromatic borders.', previewBadge: 'Prism' },
  { id: 'retro', label: '8-Bit Arcade Box', hint: 'Chunky pixelated border with 80s arcade gaming nostalgia.', previewBadge: '8-Bit' },
  { id: 'emerald', label: 'Matrix Phosphor', hint: 'Cathode terminal CRT phosphor glow with circuit outline.', previewBadge: 'Matrix' },
  { id: 'duotone', label: 'Duotone Layered', hint: 'Two-tone depth with tinted translucent secondary fills.', previewBadge: 'Duotone' },
  { id: 'clay', label: '3D Embossed Clay', hint: 'Soft isometric tactile bevel and specular embossed lighting.', previewBadge: '3D Clay' },
  { id: 'minimal', label: 'Minimal Monochrome', hint: 'Sleek, distraction-free neutral glyphs with subtle hover lift.', previewBadge: 'Minimal' },
]

export const ICON_SHAPES: { id: IconShape; label: string; hint: string }[] = [
  { id: 'squircle', label: 'Squircle (28%)', hint: 'Apple iOS continuous curvature' },
  { id: 'circle', label: 'Circular Pod', hint: 'Floating rounded coin pod' },
  { id: 'diamond', label: 'Diamond Rhombus', hint: '45-degree angled squircle' },
  { id: 'shield', label: 'Crest Shield', hint: 'Heraldic gaming badge crest' },
  { id: 'hexagon', label: 'Cyber Hexagon', hint: 'Sci-fi six-sided polygon' },
  { id: 'pill', label: 'Capsule Pill', hint: 'Extended smooth capsule' },
  { id: 'free', label: 'Floating Glyph', hint: 'Pure borderless glyph' },
]

/* ── Typography & Handwriting Options ────────────────────────────────────── */
export const FONT_STYLES: {
  id: FontStyle
  label: string
  hint: string
  sample: string
  badge: string
  category: 'handwriting' | 'standard'
}[] = [
  {
    id: 'handwriting-caveat',
    label: 'Caveat (Fluid Calligraphy)',
    hint: 'Organic flowing cursive handwriting with energetic pen strokes and natural ligature.',
    sample: 'Quick thoughts & elegant notes ✨',
    badge: 'Cursive Script',
    category: 'handwriting',
  },
  {
    id: 'handwriting-kalam',
    label: 'Kalam (Casual Brush Marker)',
    hint: 'Warm, relaxed felt-tip handwriting with friendly organic letterforms.',
    sample: 'Daily code practice & journal 📝',
    badge: 'Brush Marker',
    category: 'handwriting',
  },
  {
    id: 'handwriting-architect',
    label: 'Architects Daughter (Draftsman)',
    hint: 'Crisp architectural hand lettering inspired by blueprint drafting pencils.',
    sample: 'Algorithm design & blueprints 📐',
    badge: 'Blueprint Draft',
    category: 'handwriting',
  },
  {
    id: 'handwriting-indie',
    label: 'Indie Flower (Playful Doodler)',
    hint: 'Carefree, bubbly doodle handwriting with charming carefree personality.',
    sample: 'Creative ideas & doodles 🌸',
    badge: 'Doodle Sketch',
    category: 'handwriting',
  },
  {
    id: 'modern',
    label: 'Modern Sans',
    hint: 'Native Apple SF Pro & Inter typography for crisp UI clarity and fast scanning.',
    sample: 'Clean System UI & Code',
    badge: 'Clean Sans',
    category: 'standard',
  },
  {
    id: 'cyber',
    label: 'Cyber Monospace',
    hint: 'Developer monospace terminal code style (JetBrains Mono & Fira Code).',
    sample: 'const solve = () => 42;',
    badge: 'Terminal Mono',
    category: 'standard',
  },
  {
    id: 'serif',
    label: 'Classic Editorial',
    hint: 'Refined literary serif with high academic elegance (Playfair Display).',
    sample: 'Philosophy of Computing',
    badge: 'Editorial Serif',
    category: 'standard',
  },
  {
    id: 'retro',
    label: '8-Bit Arcade',
    hint: 'Nostalgic pixelated gaming font from the golden 8-bit arcade era.',
    sample: 'READY PLAYER ONE 👾',
    badge: '8-Bit Pixel',
    category: 'standard',
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
    name: 'Studio Ghibli Countryside',
    genre: 'anime',
    badge: 'Ghibli Masterpiece',
    description: 'Authentic hand-painted anime countryside with wildflower hills, rustic mill, and fluid Caveat cursive handwriting.',
    wallpaper: 'ghibli-meadow',
    accent: 'green',
    cardStyle: 'glass',
    iconPack: 'anime',
    iconShape: 'circle',
    fontStyle: 'handwriting-caveat',
    glowColor: '#32d74b',
  },
  {
    id: 'your-name-dusk',
    name: 'Your Name Twilight Comet',
    genre: 'anime',
    badge: 'Makoto Shinkai',
    description: 'Iconic Katawaredoki twilight scene: Taki & Mitsuha under the splitting cosmic meteor over the crater lake with Kalam handwriting.',
    wallpaper: 'your-name-dusk',
    accent: 'plasma',
    cardStyle: 'holo',
    iconPack: 'crystal',
    iconShape: 'squircle',
    fontStyle: 'handwriting-kalam',
    glowColor: '#d946ef',
  },
  {
    id: 'demon-slayer-wisteria',
    name: 'Demon Slayer: Mount Fujikasane',
    genre: 'anime',
    badge: 'Demon Slayer',
    description: 'Mount Fujikasane draped in glowing wisteria blossoms under a radiant full moon, Tanjiro & Nezuko, with anime aura icons.',
    wallpaper: 'demon-slayer-wisteria',
    accent: 'purple',
    cardStyle: 'glass',
    iconPack: 'anime',
    iconShape: 'circle',
    fontStyle: 'handwriting-caveat',
    glowColor: '#bf5af2',
  },
  {
    id: 'solo-leveling',
    name: 'Solo Leveling: Shadow Monarch',
    genre: 'anime',
    badge: 'Solo Leveling',
    description: 'Sung Jin-woo wielding glowing cyan daggers with his ethereal shadow extraction army, Cyber Neon cards, and crest shield icons.',
    wallpaper: 'solo-leveling-monarch',
    accent: 'purple',
    cardStyle: 'neon',
    iconPack: 'neon',
    iconShape: 'shield',
    fontStyle: 'cyber',
    glowColor: '#a855f7',
  },

  /* Pokemon & Gaming Legends */
  {
    id: 'pikachu-volt',
    name: 'Pikachu Thunderbolt Arena',
    genre: 'gaming',
    badge: 'Pokemon Electric',
    description: 'Dynamic Pikachu unleashing crackling high-voltage thunderbolts in the championship stadium, with diamond icons and 8-bit arcade font.',
    wallpaper: 'pikachu-volt',
    accent: 'yellow',
    cardStyle: 'neon',
    iconPack: 'vibrant',
    iconShape: 'diamond',
    fontStyle: 'retro',
    glowColor: '#ffd60a',
  },
  {
    id: 'charizard-core',
    name: 'Charizard Volcanic Vortex',
    genre: 'gaming',
    badge: 'Pokemon Fire',
    description: 'Fierce Charizard unleashing a towering dragon firestorm tornado into the volcanic sky, with tactile 3D clay pods and drafting hand.',
    wallpaper: 'charizard-core',
    accent: 'orange',
    cardStyle: 'gradient',
    iconPack: 'clay',
    iconShape: 'squircle',
    fontStyle: 'handwriting-architect',
    glowColor: '#ff9f0a',
  },
  {
    id: 'cyberpunk-edgerunners',
    name: 'Cyberpunk Edgerunners: Moon',
    genre: 'gaming',
    badge: 'Night City',
    description: 'David and Lucy on the high-rise rooftop looking up at the giant neon moon over Arasaka Night City, with chromatic glitch icons.',
    wallpaper: 'cyberpunk-edgerunners',
    accent: 'cyan',
    cardStyle: 'neon',
    iconPack: 'glitch',
    iconShape: 'hexagon',
    fontStyle: 'cyber',
    glowColor: '#06b6d4',
  },
  {
    id: 'elden-tree',
    name: 'Elden Ring Erdtree Grace',
    genre: 'gaming',
    badge: 'Soulslike Fantasy',
    description: 'Radiant Erdtree glowing through the gothic mist, golden grace accent, tactile clay pods and literary editorial serif.',
    wallpaper: 'elden-tree',
    accent: 'yellow',
    cardStyle: 'glass',
    iconPack: 'clay',
    iconShape: 'circle',
    fontStyle: 'serif',
    glowColor: '#ffd60a',
  },

  /* Famous Sci-Fi & Pop Culture Series */
  {
    id: 'spider-multiverse',
    name: 'Spider-Verse: Multiverse Rift',
    genre: 'series',
    badge: 'Marvel Multiverse',
    description: 'Halftone comic reality tear shattering across the neon Brooklyn skyline, graffiti street art energy, and playful doodler handwriting.',
    wallpaper: 'spider-verse-multiverse',
    accent: 'pink',
    cardStyle: 'neon',
    iconPack: 'glitch',
    iconShape: 'diamond',
    fontStyle: 'handwriting-indie',
    glowColor: '#ff375f',
  },
  {
    id: 'matrix-terminal',
    name: 'The Matrix: Digital Green Rain',
    genre: 'series',
    badge: 'Cult Sci-Fi',
    description: 'Cascading emerald green Katakana digital rain streaming down CRT monitors, Matrix phosphor icons, and developer monospace.',
    wallpaper: 'matrix-digital-rain',
    accent: 'green',
    cardStyle: 'neon',
    iconPack: 'emerald',
    iconShape: 'hexagon',
    fontStyle: 'cyber',
    glowColor: '#22c55e',
  },
  {
    id: 'arcane-hextech',
    name: 'Arcane: Piltover Hextech Core',
    genre: 'series',
    badge: 'Piltover Tech',
    description: 'Ornate brass steampunk astrolabe housing the glowing electric cyan Hextech gemstone crystal, crystal prism icons, and crest shield.',
    wallpaper: 'arcane-hextech',
    accent: 'cyan',
    cardStyle: 'holo',
    iconPack: 'crystal',
    iconShape: 'shield',
    fontStyle: 'serif',
    glowColor: '#06b6d4',
  },
  {
    id: 'interstellar-gargantua',
    name: 'Interstellar: Gargantua Singularity',
    genre: 'series',
    badge: 'Sci-Fi Epic',
    description: 'Scientifically accurate gravitational lensing and blinding golden accretion disk around Gargantua black hole with 3D hologram cards.',
    wallpaper: 'interstellar-gargantua',
    accent: 'orange',
    cardStyle: 'holo',
    iconPack: 'clay',
    iconShape: 'circle',
    fontStyle: 'modern',
    glowColor: '#ff9f0a',
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
    id: 'alpine-frost',
    name: 'Alpine Glacial Mist',
    genre: 'nature',
    badge: 'Crisp & Clean',
    description: 'Mirror-still turquoise glacial lake, Frost Ice accent, macOS crystal glass cards and fluid Caveat handwriting script.',
    wallpaper: 'alpine-mirror',
    accent: 'ice',
    cardStyle: 'glass',
    iconPack: 'vibrant',
    iconShape: 'circle',
    fontStyle: 'handwriting-caveat',
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
    id: 'ghibli-meadow', name: 'Studio Ghibli Countryside', kind: 'photo', category: 'anime', tone: 'light', accent: 'green',
    src: '/wallpapers/ghibli-meadow.jpg',
    color: '#1a3318', tint: '#2f5e2c',
    credit: { name: 'Studio Ghibli Aesthetic', username: 'local', photoId: 'ghibli-meadow' },
  },
  {
    id: 'your-name-dusk', name: 'Your Name Twilight Comet', kind: 'photo', category: 'anime', tone: 'dark', accent: 'plasma',
    src: '/wallpapers/your-name-dusk.jpg',
    color: '#1a102b', tint: '#3e2469',
    credit: { name: 'Makoto Shinkai (Kimi no Na wa)', username: 'local', photoId: 'your-name' },
  },
  {
    id: 'demon-slayer-wisteria', name: 'Demon Slayer: Mount Fujikasane', kind: 'photo', category: 'anime', tone: 'dark', accent: 'purple',
    src: '/wallpapers/demon-slayer-wisteria.jpg',
    color: '#24081c', tint: '#571342',
    credit: { name: 'Kimetsu no Yaiba', username: 'local', photoId: 'demon-slayer' },
  },
  {
    id: 'solo-leveling-monarch', name: 'Solo Leveling: Shadow Monarch', kind: 'photo', category: 'anime', tone: 'dark', accent: 'purple',
    src: '/wallpapers/solo-leveling-monarch.jpg',
    color: '#0e0b1f', tint: '#291e54',
    credit: { name: 'Solo Leveling (Sung Jin-woo)', username: 'local', photoId: 'solo-leveling' },
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
    id: 'pikachu-volt', name: 'Pikachu Thunderbolt Arena', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'yellow',
    src: '/wallpapers/pikachu-volt.jpg',
    color: '#1a1829', tint: '#38325e',
    credit: { name: 'Pokemon: Pikachu Championship Arena', username: 'local', photoId: 'pikachu-volt' },
  },
  {
    id: 'charizard-core', name: 'Charizard Volcanic Vortex', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'orange',
    src: '/wallpapers/charizard-core.jpg',
    color: '#2b0a04', tint: '#661a0b',
    credit: { name: 'Pokemon: Charizard Dragon Flame', username: 'local', photoId: 'charizard-fire' },
  },
  {
    id: 'cyberpunk-edgerunners', name: 'Cyberpunk Edgerunners: Moon', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'cyan',
    src: '/wallpapers/cyberpunk-edgerunners.jpg',
    color: '#071829', tint: '#0d385e',
    credit: { name: 'Cyberpunk: Edgerunners Night City', username: 'local', photoId: 'edgerunners-moon' },
  },
  {
    id: 'elden-tree', name: 'Elden Ring Stormveil Citadel', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'yellow',
    src: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    color: '#211808', tint: '#4a3612',
    credit: { name: 'Benjamin Davies', username: 'bendavisual', photoId: 'gothic-citadel-fog' },
  },
  {
    id: 'lavender-fog', name: 'Lavender Town Ethereal Mist', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'purple',
    src: 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
    color: '#150824', tint: '#37145c',
    credit: { name: 'Johannes Plenio', username: 'jplenio', photoId: 'ethereal-lake-mist' },
  },
  {
    id: 'pallet-dusk', name: 'Pallet Town Horizon', kind: 'photo', category: 'gaming', tone: 'dark', accent: 'green',
    src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
    color: '#1e240c', tint: '#46541b',
    credit: { name: 'Federico Respini', username: 'federicorespini', photoId: 'pallet-hills' },
  },

  /* ── 3. Sci-Fi & Pop Culture Series ── */
  {
    id: 'interstellar-gargantua', name: 'Interstellar: Gargantua Singularity', kind: 'photo', category: 'series', tone: 'dark', accent: 'orange',
    src: '/wallpapers/interstellar-gargantua.jpg',
    color: '#1f0d05', tint: '#4f200c',
    credit: { name: 'Interstellar Gargantua Accretion Disk', username: 'local', photoId: 'gargantua-singularity' },
  },
  {
    id: 'spider-verse-multiverse', name: 'Spider-Verse: Multiverse Rift', kind: 'photo', category: 'series', tone: 'dark', accent: 'pink',
    src: '/wallpapers/spider-verse-multiverse.jpg',
    color: '#260621', tint: '#5c104f',
    credit: { name: 'Spider-Verse Dimensional Tear', username: 'local', photoId: 'spider-multiverse' },
  },
  {
    id: 'matrix-digital-rain', name: 'The Matrix: Digital Green Rain', kind: 'photo', category: 'series', tone: 'dark', accent: 'green',
    src: '/wallpapers/matrix-digital-rain.jpg',
    color: '#031a0a', tint: '#084519',
    credit: { name: 'The Matrix Cyber Rain', username: 'local', photoId: 'matrix-rain' },
  },
  {
    id: 'arcane-hextech', name: 'Arcane: Piltover Hextech Core', kind: 'photo', category: 'series', tone: 'dark', accent: 'cyan',
    src: '/wallpapers/arcane-hextech.jpg',
    color: '#071b26', tint: '#0f445e',
    credit: { name: 'Arcane Piltover Hextech Gemstone', username: 'local', photoId: 'hextech-crystal' },
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
  if (w.src.startsWith('/wallpapers/')) {
    return w.src
  }
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
    if (w.src.startsWith('/wallpapers/')) {
      return w.src
    }
    if (w.src.startsWith('https://upload.wikimedia.org') || w.src.startsWith('https://thumb.wikimedia.org')) {
      return w.src
    }
    return `${w.src}?w=720&q=85&auto=format&fit=crop&ar=16:10`
  }
  if (w.kind === 'custom') return w.src
  return null
}

export function creditLinks(w: PhotoWallpaper) {
  if (w.credit.username === 'local' || w.src.startsWith('/wallpapers/')) {
    return {
      photographer: '#',
      photo: w.src,
      unsplash: '#',
    }
  }
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
