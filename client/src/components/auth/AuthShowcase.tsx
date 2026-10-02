import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { AlgoTheater } from '@/components/showcase/AlgoTheater'
import { ALL_SUBJECTS, FACTS } from '@/components/showcase/curriculum'
import { cn } from '@/lib/utils'

/** Two rows of subjects drifting in opposite directions. */
export function SubjectTicker({ className }: { className?: string }) {
  const half = Math.ceil(ALL_SUBJECTS.length / 2)
  const rows = [ALL_SUBJECTS.slice(0, half), ALL_SUBJECTS.slice(half)]
  return (
    <div
      className={cn('space-y-2 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]', className)}
      aria-hidden="true"
    >
      {rows.map((row, r) => (
        <div
          key={r}
          className={cn(
            'flex w-max gap-2 motion-safe:animate-[marquee_60s_linear_infinite]',
            r === 1 && '[animation-direction:reverse]',
          )}
        >
          {[...row, ...row].map((s, i) => (
            <span
              key={i}
              className="rounded-full border border-hairline/[0.08] bg-hairline/[0.03] px-3 py-1 text-[11.5px] whitespace-nowrap text-foreground-dim"
            >
              {s}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}


export function AuthShowcase() {
  return (
    <div className="relative isolate flex h-full min-w-0 flex-col gap-6 overflow-y-auto px-10 py-8 [scrollbar-width:none] xl:px-12 [@media(max-height:800px)]:gap-4 [@media(max-height:800px)]:py-6">
      <div aria-hidden="true" className="aurora -z-10 opacity-30">
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>

      <div className="relative">
        <Link to="/" className="flex w-fit items-center gap-3">
          <LogoMark size={36} className="drop-shadow-[0_6px_18px_rgb(139_92_246/0.6)]" />
          <Wordmark className="text-xl" />
        </Link>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-heading-fade mt-7 max-w-lg font-display text-3xl leading-[1.1] font-semibold tracking-tight xl:text-[40px]"
        >
          Computer science,
          <br />
          <span className="bg-gradient-to-r from-primary-bright via-accent to-cyan bg-clip-text text-transparent">watched step by step.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3 max-w-md text-[15px] leading-relaxed text-foreground-dim"
        >
          Courses that animate every idea, practice on a real judge and an AI tutor that teaches instead of telling. From
          your first array to distributed systems.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-2xl"
      >
        <AlgoTheater compact />
      </motion.div>

      <div className="relative mt-auto min-w-0 [@media(max-height:860px)]:hidden">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-foreground-faint uppercase">
          {FACTS.subjects} subjects · {FACTS.lessons} lessons · {FACTS.paths} career paths
        </p>
        <SubjectTicker />
      </div>
    </div>
  )
}
