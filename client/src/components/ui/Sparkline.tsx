import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * A word-sized line of recent values (oldest first), with the latest value
 * marked by a dot. It draws itself left to right the first time it scrolls
 * into view. Decorative: the figure beside it carries the number, so it is
 * hidden from screen readers.
 */
export function Sparkline({ values, className, width = 120, height = 28 }: { values: number[]; className?: string; width?: number; height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const still = useReducedMotion()
  if (values.length < 2) return null
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  const show = still || seen
  return (
    <svg ref={ref} className={cn('ed-spark', className)} viewBox={`0 0 ${width} ${height}`} style={{ width }} aria-hidden="true">
      <motion.path
        d={d}
        initial={{ pathLength: still ? 1 : 0 }}
        animate={{ pathLength: show ? 1 : 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx={lx}
        cy={ly}
        r="2.25"
        initial={{ opacity: still ? 1 : 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: 0.3, delay: still ? 0 : 0.8 }}
      />
    </svg>
  )
}
