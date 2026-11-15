import { useEffect, useRef } from 'react'

/**
 * The tagline moment (B11): large type that starts muted and lights up one
 * word at a time, in reading order, as each word crosses a line 45% up the
 * screen. One IntersectionObserver for all words; nothing runs on scroll.
 * Under reduced motion the text is simply shown at full colour.
 */
export function TaglineReveal({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const words = [...root.querySelectorAll<HTMLElement>('.lp-word')]
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') {
      words.forEach((w) => w.classList.add('is-on'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            e.target.classList.add('is-on')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -45% 0px' },
    )
    words.forEach((w) => io.observe(w))
    return () => io.disconnect()
  }, [])
  return (
    <h2 ref={ref} className="heading-4 md:heading-2 mx-auto max-w-[680px] text-center">
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(' ').map((w, wi) => (
            <span key={wi} className="lp-word">
              {w}
              {wi < line.split(' ').length - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
      ))}
    </h2>
  )
}
