/*
  Phosphor, one weight at a time. Each weight module (thin.ts … duotone.ts,
  generated from @phosphor-icons/core) is its own lazy chunk holding only
  inner SVG markup; this turns it into an IconPack with one style.
*/
import type { IconName } from '../../names'
import { named, type Glyph, type IconPack, type IconStyleMap } from '../types'

export function phosphorPack(weight: string, glyphs: Record<IconName, string>): IconPack {
  const style = {} as IconStyleMap
  for (const name of Object.keys(glyphs) as IconName[]) {
    // Trusted static markup from @phosphor-icons/core (paths only, currentColor).
    const html = { __html: glyphs[name] }
    const g: Glyph = named(
      ({ size = 24, ...p }) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          fill="currentColor"
          width={size}
          height={size}
          {...p}
          dangerouslySetInnerHTML={html}
        />
      ),
      `Phosphor(${name}:${weight})`,
    )
    style[name] = g
  }
  return { id: 'phosphor', styles: { [weight]: style } }
}
