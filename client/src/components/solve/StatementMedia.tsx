import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, X } from 'lucide-react'

/**
 * Keeps the images and videos inside a scraped problem statement working.
 *
 * The server points every `<img>` / `<video>` / `<source>` straight at the
 * source CDN (fastest path, and `referrerpolicy=no-referrer` gets past most
 * hotlink checks) and attaches `data-proxy`, the URL to retry through when the
 * direct load fails.
 *
 * Three things happen here:
 *
 *  1. **A failed direct load retries through the proxy.** That covers the CDNs
 *     that block us outright.
 *  2. **Hosts that failed once are remembered** in localStorage, and media from
 *     them is rewritten to the proxy *before* it is ever requested. Without
 *     this every Codeforces statement paid for a doomed round trip per image.
 *  3. **Clicking an image opens it full size.**
 */

const BLOCKED_KEY = 'nexora:media-blocked-hosts'
const MAX_REMEMBERED = 40

function loadBlockedHosts(): Set<string> {
  try {
    const raw = localStorage.getItem(BLOCKED_KEY)
    const list: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(list) ? list.filter((h): h is string => typeof h === 'string') : [])
  } catch {
    return new Set()
  }
}

function rememberBlockedHost(host: string, blocked: Set<string>) {
  if (!host || blocked.has(host)) return
  blocked.add(host)
  try {
    localStorage.setItem(BLOCKED_KEY, JSON.stringify([...blocked].slice(-MAX_REMEMBERED)))
  } catch {
    /* private mode / storage disabled — the in-memory set still helps this session */
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url, window.location.href).hostname
  } catch {
    return ''
  }
}

type MediaEl = HTMLImageElement | HTMLVideoElement | HTMLAudioElement | HTMLSourceElement

/** Swap one element onto its proxy URL. Returns false if it has no fallback left. */
function switchToProxy(el: MediaEl): boolean {
  const proxy = el.dataset.proxy
  if (!proxy || el.dataset.viaProxy === '1') return false
  el.dataset.viaProxy = '1'
  el.removeAttribute('referrerpolicy')
  el.src = proxy
  // A <source> swap only takes effect once the parent media element reloads.
  const parent = el.parentElement
  if (el.tagName === 'SOURCE' && (parent instanceof HTMLVideoElement || parent instanceof HTMLAudioElement)) {
    parent.load()
  }
  return true
}

export function useStatementMedia() {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    const blocked = loadBlockedHosts()

    /* Pre-empt the doomed request for hosts we already know block us. */
    const applyKnownBlocks = () => {
      if (!blocked.size) return
      document
        .querySelectorAll<MediaEl>('.statement-html [data-proxy]:not([data-via-proxy])')
        .forEach((el) => {
          const src = el.getAttribute('src') || ''
          if (src && blocked.has(hostOf(src))) switchToProxy(el)
        })
    }

    const onError = (e: Event) => {
      const el = e.target as MediaEl | null
      if (!el || !('dataset' in el) || !el.closest?.('.statement-html')) return
      if (
        !(el instanceof HTMLImageElement) &&
        !(el instanceof HTMLVideoElement) &&
        !(el instanceof HTMLAudioElement) &&
        !(el instanceof HTMLSourceElement)
      ) {
        return
      }
      const src = el.getAttribute('src') || ''
      if (el.dataset.viaProxy !== '1' && src) rememberBlockedHost(hostOf(src), blocked)
      if (switchToProxy(el)) return
      // Nothing left to try.
      el.classList.add('nx-media-broken')
      if (el instanceof HTMLImageElement) el.alt = el.alt || 'Image unavailable'
    }

    const onLoad = (e: Event) => {
      const el = e.target as HTMLElement | null
      if (el instanceof HTMLImageElement && el.closest('.statement-html')) {
        el.classList.add('nx-media-ready')
      }
    }

    const onClick = (e: MouseEvent) => {
      const img = e.target as HTMLElement
      if (!(img instanceof HTMLImageElement) || !img.closest('.statement-html')) return
      if (img.closest('a')) return
      e.preventDefault()
      setZoom({ src: img.currentSrc || img.src, alt: img.alt })
    }

    // Statement HTML is injected after this hook mounts, so watch for it.
    let frame = 0
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(applyKnownBlocks)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    applyKnownBlocks()

    document.addEventListener('error', onError, true)
    document.addEventListener('load', onLoad, true)
    document.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('error', onError, true)
      document.removeEventListener('load', onLoad, true)
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
