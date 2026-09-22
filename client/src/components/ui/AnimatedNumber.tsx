import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

/** Counts up to `value` the first time it scrolls into view. */
export function AnimatedNumber({
  value,
  duration = 1.1,
  format = (n: number) => Math.round(n).toLocaleString(),
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const last = useRef(0)
  const fmt = useRef(format)
  useEffect(() => {
    fmt.current = format
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce || !inView) {
      if (reduce) el.textContent = fmt.current(value)
      return
    }
    const controls = animate(last.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = fmt.current(v)
      },
    })
    last.current = value
    return () => controls.stop()
  }, [value, inView, reduce, duration])

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(reduce ? value : 0)}
    </span>
  )
}
