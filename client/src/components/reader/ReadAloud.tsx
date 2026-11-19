import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { symbolsToSpeech, texToSpeech } from './speech'

/*
  Listen: the lesson read aloud by the browser's own voice (Web Speech API:
  free, on the device, no server). It starts from the paragraph at the top of
  the screen, highlights the one being read and keeps it in view, says the
  maths in words, and stops when you leave the page. Figures, code, tables,
  questions and animations are skipped; their captions are read.
*/

const READABLE = 'p, li, h2, h3, h4, .nb-title, figcaption'
// Parts that are not prose: their text would be read as noise.
const SKIP = 'pre, code, table, .nb-viz, .nxv-slot, .np, .nr-check, .notes-pre, svg, canvas, button, .katex-display .katex-html, .sr-only, [aria-hidden="true"]'
const SPEEDS = [0.85, 1, 1.2, 1.4] as const
const RATE_KEY = 'nexora:listen-rate'

function blockText(el: Element): string {
  const copy = el.cloneNode(true) as HTMLElement
  // Formulas: read their TeX as words, not KaTeX's visual layout.
  copy.querySelectorAll('.katex').forEach((k) => {
    const tex = k.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? ''
    k.replaceWith(document.createTextNode(` ${texToSpeech(tex)} `))
  })
  copy.querySelectorAll(SKIP).forEach((n) => n.remove())
  return symbolsToSpeech(copy.textContent ?? '')
}

function collect(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(READABLE)].filter((el) => {
    if (el.closest(SKIP)) return false
    // Nested matches (a p inside an li) would be read twice: keep the outer one.
    const outer = el.parentElement?.closest(READABLE)
    if (outer && root.contains(outer)) return false
    return blockText(el).length > 1
  })
}

function pickVoice(): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis.getVoices()
  return all.find((v) => v.lang === 'en-IN') ?? all.find((v) => v.lang === 'en-GB') ?? all.find((v) => v.lang.startsWith('en')) ?? null
}

export function ReadAloud({ target, label = 'Listen' }: { target: RefObject<HTMLElement | null>; label?: string }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const still = useReducedMotion()
  const { pathname } = useLocation()
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [at, setAt] = useState({ i: 0, n: 0 })
  const [rate, setRate] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(RATE_KEY))
      return (SPEEDS as readonly number[]).includes(v) ? v : 1
    } catch {
      return 1
    }
  })
  const blocks = useRef<HTMLElement[]>([])
  const index = useRef(0)
  const run = useRef(0) // bumps on every stop, so late callbacks of an old run do nothing
  const rateRef = useRef(rate)
  rateRef.current = rate

  const mark = (el: HTMLElement | null) => {
    blocks.current.forEach((b) => b.classList.remove('is-reading'))
    if (!el) return
    el.classList.add('is-reading')
    el.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' })
  }

  const stop = useCallback(() => {
    run.current++
    if (supported) window.speechSynthesis.cancel()
    blocks.current.forEach((b) => b.classList.remove('is-reading'))
    setState('idle')
  }, [supported])

  const speakFrom = useCallback(
    (i: number) => {
      const id = run.current
      const list = blocks.current
      if (i >= list.length) {
        stop()
        return
      }
      index.current = i
      setAt({ i: i + 1, n: list.length })
      mark(list[i])
      const u = new SpeechSynthesisUtterance(blockText(list[i]))
      const voice = pickVoice()
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      }
      u.rate = rateRef.current
      u.onend = () => {
        if (run.current === id) speakFrom(i + 1)
      }
      u.onerror = (e) => {
        // 'interrupted'/'canceled' come from our own stop or skip.
        if (run.current === id && e.error !== 'interrupted' && e.error !== 'canceled') speakFrom(i + 1)
      }
      window.speechSynthesis.speak(u)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stop, still],
  )

  const start = () => {
    const root = target.current
    if (!root || !supported) return
    window.speechSynthesis.cancel()
    run.current++
    blocks.current = collect(root)
    if (!blocks.current.length) return
    // Begin at the first paragraph whose top is on screen (or just above it).
    const from = Math.max(0, blocks.current.findIndex((b) => b.getBoundingClientRect().bottom > 80))
    setState('playing')
    speakFrom(from)
  }

  const toggle = () => {
    if (state === 'playing') {
      window.speechSynthesis.pause()
      setState('paused')
    } else if (state === 'paused') {
      window.speechSynthesis.resume()
      setState('playing')
    }
  }

  const skip = (d: number) => {
    run.current++
    window.speechSynthesis.cancel()
    setState('playing')
    speakFrom(Math.min(Math.max(0, index.current + d), blocks.current.length - 1))
  }

  const cycleRate = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]
    setRate(next)
    try {
      localStorage.setItem(RATE_KEY, String(next))
    } catch {
      /* private mode: the speed lasts this visit */
    }
    // The new speed applies from the current paragraph.
    if (state !== 'idle') {
      rateRef.current = next
      skip(0)
    }
  }

  // Leaving the lesson (or the page) stops the voice.
  useEffect(() => stop, [pathname, stop])
  useEffect(() => {
    if (!supported) return
    const off = () => window.speechSynthesis.cancel()
    window.addEventListener('pagehide', off)
    return () => window.removeEventListener('pagehide', off)
  }, [supported])

  if (!supported) return null

  return (
    <>
      <button type="button" className={cn('nr-icon', state !== 'idle' && 'is-on')} onClick={state === 'idle' ? start : stop} aria-label={state === 'idle' ? 'Listen to this lesson' : 'Stop reading aloud'} title={state === 'idle' ? `${label}: read aloud from here` : 'Stop'}>
        <Icon name="volume" className="size-4" aria-hidden="true" />
      </button>
      {state !== 'idle' && (
        <div className="nr-listen" role="region" aria-label="Reading aloud">
          <button type="button" className="nr-icon" onClick={() => skip(-1)} aria-label="Previous paragraph" title="Previous paragraph">
            <Icon name="skip-back" className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="nr-icon nr-listen-main" onClick={toggle} aria-label={state === 'playing' ? 'Pause' : 'Resume'}>
            <Icon name={state === 'playing' ? 'pause' : 'play'} className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="nr-icon" onClick={() => skip(1)} aria-label="Next paragraph" title="Next paragraph">
            <Icon name="skip-forward" className="size-4" aria-hidden="true" />
          </button>
          <span className="nr-listen-pos" aria-live="off">
            {at.i} / {at.n}
          </span>
          <button type="button" className="nr-listen-rate" onClick={cycleRate} aria-label={`Reading speed ${rate} times. Change speed`}>
            {rate}×
          </button>
          <button type="button" className="nr-icon" onClick={stop} aria-label="Stop reading aloud" title="Stop">
            <Icon name="x" className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  )
}
