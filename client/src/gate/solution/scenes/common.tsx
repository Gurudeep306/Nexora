import { type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { show } from './geometry'

/** Text that pops when its value changes. */
export function Pop({ value, className }: { value: unknown; className?: string }) {
  const s = show(value)
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={s}
        className={className}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.28 }}
      >
        {s}
      </motion.span>
    </AnimatePresence>
  )
}

/** SVG `<text>` whose content cross-fades on change. */
export function SvgPop({ value, ...rest }: { value: unknown } & React.SVGProps<SVGTextElement>) {
  const s = show(value)
  return (
    <AnimatePresence initial={false}>
      <motion.text
        key={s}
        {...(rest as object)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {s}
      </motion.text>
    </AnimatePresence>
  )
}

/**
 * A responsive SVG: scales down to the container, but never below `minScale`
 * of its natural width — narrower screens scroll the canvas sideways instead
 * of shrinking labels into illegibility.
 */
export function Svg({
  width,
  height,
  minScale = 0.62,
  children,
  label,
  pad = 0,
}: {
  width: number
  height: number
  minScale?: number
  children: ReactNode
  label?: string
  pad?: number
}) {
  const w = width + pad * 2
  const h = height + pad * 2
  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <svg
        viewBox={`${-pad} ${-pad} ${w} ${h}`}
        role="img"
        aria-label={label}
        className="mx-auto block"
        style={{ width: '100%', maxWidth: w * 1.15, minWidth: w * minScale, height: 'auto' }}
      >
        {children}
      </svg>
    </div>
  )
}

/** Wrap HTML content that may overflow horizontally on phones. */
export function Scroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <div className={`mx-auto w-max ${className ?? ''}`}>{children}</div>
    </div>
  )
}
