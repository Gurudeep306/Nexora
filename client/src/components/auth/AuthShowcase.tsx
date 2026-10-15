import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { AlgoTheater } from '@/components/showcase/AlgoTheater'
import { ALL_SUBJECTS, FACTS } from '@/components/showcase/curriculum'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1] as const

/** Rows of subjects drifting in opposite directions, faded at both edges. */
export function SubjectTicker({ className, rows: rowCount = 2 }: { className?: string; rows?: 1 | 2 }) {
  const per = Math.ceil(ALL_SUBJECTS.length / rowCount)
  const rows = Array.from({ length: rowCount }, (_, r) => ALL_SUBJECTS.slice(r * per, (r + 1) * per))
  return (
    <div className={cn('auth-marquee space-y-2 overflow-hidden', className)} aria-hidden="true">
      {rows.map((row, r) => (
        <div
          key={r}
          className={cn(
            // Each chip carries its own trailing gap, so -50% lands exactly on the seam.
            'auth-marquee-track flex w-max motion-safe:animate-[marquee_70s_linear_infinite]',
            r === 1 && '[animation-direction:reverse]',
          )}
        >
          {[...row, ...row].map((s, i) => (
            <span key={i} className="pr-2">
              <span className="block rounded-full border border-hairline/[0.09] bg-hairline/[0.035] px-3 py-1 text-[11.5px] whitespace-nowrap text-foreground-dim">
                {s}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

const GLYPHS = '01{}[]<>/=+*#&$'

/** Text that resolves out of code glyphs, left to right. Layout never moves. */
export function Decrypt({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState<string | null>(reduce ? null : '')
  useEffect(() => {
    if (reduce) return
    let frame = 0
    let raf = 0
    const start = performance.now() + delay
    const total = 900
    const tick = (now: number) => {
      const t = now - start
      if (t < 0) {
        raf = requestAnimationFrame(tick)
        return
      }
      const solved = Math.floor((Math.min(t, total) / total) * text.length)
      if (solved >= text.length) {
        setShown(null)
        return
      }
      if (frame++ % 2 === 0)
        setShown(
          text
            .split('')
            .map((c, i) => (i < solved || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
            .join(''),
        )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, delay, reduce])
  return (
    <span className={cn('relative inline-block', className)}>
      <span className={shown === null ? undefined : 'invisible'}>{text}</span>
      {shown !== null && (
        <span aria-hidden="true" className="absolute inset-0 whitespace-nowrap">
          {shown}
        </span>
      )}
    </span>
  )
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.8, delay, ease: EASE },
})

/** Desktop left half: brand, headline, the live lesson, and the subject ticker. */
export function AuthShowcase({ driven = false, nudge = 0 }: { driven?: boolean; nudge?: number }) {
  return (
    <div className="relative isolate flex h-full min-w-0 flex-col overflow-y-auto px-12 py-10 [scrollbar-width:none] xl:px-16 xl:py-12 2xl:px-20 [@media(max-height:820px)]:py-7">
      <div aria-hidden="true" className="aurora -z-10 opacity-25">
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>
      <div aria-hidden="true" className="auth-grain -z-10" />

      <motion.div {...rise(0)}>
        <Link to="/" className="flex w-fit items-center gap-3 rounded-lg" aria-label="NexoraGuru home">
          <LogoMark size={38} />
          <Wordmark className="text-[19px]" />
        </Link>
      </motion.div>

      <div className="mt-[clamp(2rem,7vh,4.5rem)] max-w-xl">
        <motion.h1 {...rise(0.08)} className="auth-headline text-[clamp(2.6rem,3.9vw,3.9rem)] font-semibold text-foreground">
          Computer science,
          <br />
          <Decrypt text="watched step by step." delay={350} className="auth-brand-text pb-1" />
        </motion.h1>
        <motion.p {...rise(0.18)} className="mt-5 text-[15px] text-foreground-dim">
          {FACTS.subjects} subjects, every idea animated — from your first array to distributed systems.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: EASE }}
        className="auth-theater mt-[clamp(1.75rem,5vh,3rem)] max-w-[40rem]"
        data-driven={driven}
      >
        <AlgoTheater compact driven={driven} nudge={nudge} />
      </motion.div>

      <motion.div {...rise(0.5)} className="mt-auto min-w-0 max-w-[40rem] pt-8 [@media(max-height:820px)]:hidden">
        <SubjectTicker rows={1} />
      </motion.div>
    </div>
  )
}
