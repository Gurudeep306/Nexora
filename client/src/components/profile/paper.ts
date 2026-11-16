/* Paper colours for the journal share card (components/profile/ShareCard.tsx). */

export interface Paper {
  canvas: string
  card: string
  ink: string
  ink2: string
  muted: string
  line: string
  oat: string
  clay: string
}

const v = (cs: CSSStyleDeclaration, name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback

/** Read the current theme's paper colours (light or dark) from the page. */
export function paperColours(): Paper {
  const cs = getComputedStyle(document.documentElement)
  return {
    canvas: v(cs, '--color-bg-app', '#f0eee6'),
    card: v(cs, '--color-bg-surface', '#faf9f5'),
    ink: v(cs, '--color-text-primary', '#141413'),
    ink2: v(cs, '--color-text-secondary', '#3d3d3a'),
    muted: v(cs, '--color-text-muted', '#6b6a64'),
    line: v(cs, '--color-border', '#cccbc8'),
    oat: v(cs, '--color-bg-surface-3', '#e3dacc'),
    clay: v(cs, '--color-accent-brand', '#d97757'),
  }
}

