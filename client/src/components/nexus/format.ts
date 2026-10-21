import type { NexusNode } from './types'

/** The short count under a skill: solves for DSA, PYQs / lessons for subjects. */
export function nodeCountLabel(node: NexusNode): string {
  const m = node.metric
  if (!m) return `${node.solved}/${node.target}`
  if (m.pyq) return `${m.pyq.correct > m.pyq.target ? m.pyq.target : m.pyq.correct}/${m.pyq.target} PYQs`
  if (m.lessons) return `${m.lessons.done}/${m.lessons.total} lesson${m.lessons.total === 1 ? '' : 's'}`
  return node.kind === 'project' ? 'project' : `${node.progress}%`
}

/** The brand ramp at u (0..1), as a CSS colour that follows the theme. */
export function rampColor(u: number): string {
  const t = Math.max(0, Math.min(1, u))
  if (t < 0.55) return `color-mix(in oklab, var(--nx-b2) ${Math.round((t / 0.55) * 100)}%, var(--nx-b1))`
  return `color-mix(in oklab, var(--nx-b3) ${Math.round(((t - 0.55) / 0.45) * 100)}%, var(--nx-b2))`
}
