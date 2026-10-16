/**
 * The app's single motion scale, for framer-motion. Mirrors the CSS tokens in
 * index.css (--ease-standard, --ease-emphasized, --dur-fast/base/slow).
 *
 * Everyday UI (dialogs, menus, popovers, lists) uses short tweens with no
 * overshoot; springs are kept for direct manipulation only (dragging, the
 * Dock's magnification), where they follow the pointer.
 */
export const EASE_STANDARD = [0.2, 0, 0, 1] as const
export const EASE_EMPHASIZED = [0.16, 1, 0.3, 1] as const

export const DUR = { fast: 0.12, base: 0.18, slow: 0.28 } as const

/** State changes: colour, size, a highlight moving between rows. */
export const tStandard = { duration: DUR.base, ease: EASE_STANDARD }
/** Something entering the screen: a dialog, a menu, a page. */
export const tEnter = { duration: DUR.base, ease: EASE_EMPHASIZED }
/** Leaving is quicker than arriving. */
export const tExit = { duration: DUR.fast, ease: EASE_STANDARD }

/** A floating panel (dialog, palette, dropdown) appearing in place. */
export const popIn = {
  initial: { opacity: 0, y: -4, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: tEnter },
  exit: { opacity: 0, y: -2, scale: 0.99, transition: tExit },
}

/** A dimmed backdrop. */
export const fadeInOut = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: tStandard },
  exit: { opacity: 0, transition: tExit },
}
