import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useSurfaceLight } from './useSurfaceLight'
import { originalUrl, photoUrl, type Tone, type Wallpaper as WallpaperT } from '@/theme/catalog'

interface Layer {
  key: string
  src: string
  srcSet: string
  ready: boolean
}

function sourceFor(w: WallpaperT, tone: Tone): Omit<Layer, 'ready'> | null {
  if (w.kind === 'original') {
    return {
      key: `${w.id}-${tone}`,
      src: originalUrl(w, tone, 'full'),
      srcSet: `${originalUrl(w, tone, 'small')} 1280w, ${originalUrl(w, tone, 'full')} 2560w`,
    }
  }
  if (w.kind === 'photo') {
    return {
      key: w.id,
      src: photoUrl(w, 1920),
      srcSet: [1280, 1920, 2560, 3200].map((px) => `${photoUrl(w, px)} ${px}w`).join(', '),
    }
  }
  return null
}

/** How long a replaced layer stays underneath while the new one fades in
 *  (matches the .wallpaper-layer opacity transition). */
const FADE_MS = 760

/**
 * The desktop. A fixed layer behind the whole app that paints the chosen
 * wallpaper the way macOS does:
 *
 *  • the wallpaper's own colour is painted immediately (it is also on
 *    <body>, set before first paint), so there is never a white or black
 *    flash while the image loads;
 *  • the image fades in once decoded, and a change of wallpaper — or of
 *    appearance, for the originals, which have a light and a dark variant —
 *    cross-fades instead of cutting;
 *  • a scrim (see .wallpaper-scrim in index.css) keeps text that sits
 *    straight on the desktop readable.
 *
 * Old layers are dropped once they are fully covered, so at most two images
 * are ever in the DOM.
 */
export function Wallpaper() {
  const { wallpaper, resolved } = useTheme()
  useSurfaceLight()
  const next = useMemo(() => sourceFor(wallpaper, resolved), [wallpaper, resolved])
  const [layers, setLayers] = useState<Layer[]>(() => (next ? [{ ...next, ready: false }] : []))
  const [shown, setShown] = useState(next?.key ?? null)
  const timers = useRef<number[]>([])

  // A new wallpaper (or the other variant of an original): stack the incoming
  // layer over the one currently on screen. Adjusting state during render is
  // React's pattern for state derived from props — no extra effect pass.
  const nextKey = next?.key ?? null
  if (nextKey !== shown) {
    setShown(nextKey)
    setLayers((prev) => {
      if (!next) return []
      const visible = prev.filter((l) => l.ready).slice(-1)
      return [...visible, { ...next, ready: false }]
    })
  }

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const markReady = (key: string) => {
    setLayers((prev) => prev.map((l) => (l.key === key ? { ...l, ready: true } : l)))
    const t = window.setTimeout(() => {
      setLayers((prev) => {
        const i = prev.findIndex((l) => l.key === key)
        return i > 0 ? prev.slice(i) : prev
      })
    }, FADE_MS)
    timers.current.push(t)
  }

  if (wallpaper.kind === 'none') return null

  return (
    <div className="wallpaper" aria-hidden="true">
      {layers.map((l) => (
        <img
          key={l.key}
          className="wallpaper-layer"
          src={l.src}
          srcSet={l.srcSet}
          sizes="100vw"
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable={false}
          data-ready={l.ready}
          ref={(el) => {
            // A cached image can finish before React attaches onLoad.
            if (el && el.complete && el.naturalWidth > 0 && !l.ready) markReady(l.key)
          }}
          onLoad={() => !l.ready && markReady(l.key)}
          onError={(e) => {
            // Leave the wallpaper colour showing rather than a broken image.
            e.currentTarget.style.visibility = 'hidden'
            if (!l.ready) markReady(l.key)
          }}
        />
      ))}
      <div className="wallpaper-scrim" />
    </div>
  )
}
