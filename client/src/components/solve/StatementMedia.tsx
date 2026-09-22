import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, X } from 'lucide-react'

/**
 * Makes statement images robust and zoomable:
 *  - if a CDN image fails (hotlink block, network), retry once through our
 *    /api/imgproxy (URL stored in data-proxy by the server);
 *  - click any statement image to open it full-size.
 */
export function useStatementMedia() {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    const onError = (e: Event) => {
      const img = e.target as HTMLImageElement
      if (!(img instanceof HTMLImageElement) || !img.closest('.statement-html')) return
      const proxy = img.dataset.proxy
      if (proxy && img.dataset.fallback !== '1') {
        img.dataset.fallback = '1'
        img.removeAttribute('referrerpolicy')
        img.src = proxy
      } else {
        img.classList.add('nx-img-broken')
        img.alt = img.alt || 'Image unavailable'
      }
    }
    const onClick = (e: MouseEvent) => {
      const img = e.target as HTMLElement
      if (!(img instanceof HTMLImageElement) || !img.closest('.statement-html')) return
      if (img.closest('a')) return
      e.preventDefault()
      setZoom({ src: img.currentSrc || img.src, alt: img.alt })
    }
    document.addEventListener('error', onError, true)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('error', onError, true)
      document.removeEventListener('click', onClick)
    }
  }, [])

  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  const lightbox = createPortal(
    <AnimatePresence>
      {zoom && (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setZoom(null)}
          role="dialog"
          aria-label="Image preview"
        >
          <motion.img
            src={zoom.src}
            alt={zoom.alt}
            referrerPolicy="no-referrer"
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            className="max-h-[88vh] max-w-[92vw] rounded-lg bg-white object-contain p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <a
              href={zoom.src}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="glass flex size-9 items-center justify-center rounded-full text-foreground hover:bg-white/10"
              aria-label="Open image in new tab"
            >
              <ExternalLink className="size-4" />
            </a>
            <button
              onClick={() => setZoom(null)}
              className="glass flex size-9 cursor-pointer items-center justify-center rounded-full text-foreground hover:bg-white/10"
              aria-label="Close preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
  return lightbox
}

