/*
  Card styles and corner radii. The visual definition of each lives in
  index.css under [data-card-style] / [data-radius]; this is the catalogue
  the Theme Centre and the look model read.
*/

export const CARD_STYLES = [
  { id: 'soft', label: 'Soft', hint: 'A quiet surface, hairline edge and a gentle shadow.' },
  { id: 'elevated', label: 'Elevated', hint: 'Lifted off the page with a deeper, layered shadow.' },
  { id: 'outline', label: 'Outline', hint: 'No fill — a crisp border only.' },
  { id: 'flat', label: 'Flat', hint: 'A solid tint with no border or shadow.' },
  { id: 'accent', label: 'Accent edge', hint: 'A bar of your accent colour along the leading edge.' },
  { id: 'gradient', label: 'Gradient border', hint: 'A thin accent-to-secondary gradient rim.' },
  { id: 'inset', label: 'Inset', hint: 'Pressed into the page, like a well.' },
  { id: 'glow', label: 'Glow', hint: 'An accent halo that softly lights the card.' },
  { id: 'ruled', label: 'Ruled', hint: 'No box at all — a thin rule above, like a column in print.' },
  { id: 'ink', label: 'Ink', hint: 'A heavy ink outline with a hard offset shadow.' },
  { id: 'glass', label: 'Glass', hint: 'Frosted and translucent — the page shows softly through.' },
] as const

export type CardStyleId = (typeof CARD_STYLES)[number]['id']
export const DEFAULT_CARD_STYLE: CardStyleId = 'flat'

export const RADII = [
  { id: 'sharp', label: 'Sharp' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'round', label: 'Round' },
] as const

export type RadiusId = (typeof RADII)[number]['id']
export const DEFAULT_RADIUS: RadiusId = 'rounded'
