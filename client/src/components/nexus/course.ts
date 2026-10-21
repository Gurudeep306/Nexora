import type { WebCluster } from './types'

/*
 * Where a Nexus skill's course lives.
 *   DSA                 the DSA learning hub (/learn)
 *   any other subject   /learn/<subject>/<concept> — the course page, which
 *                       sends GATE subjects on to their notes lesson (Digital
 *                       Logic) or to their PYQ practice, and shows the course
 *                       (or "coming soon") for everything else.
 */
export function courseHref(subject: Pick<WebCluster, 'id' | 'engine'>, conceptId?: string | null): string {
  if (subject.engine === 'dsa') return '/learn'
  return conceptId ? `/learn/${encodeURIComponent(subject.id)}/${encodeURIComponent(conceptId)}` : `/learn/${encodeURIComponent(subject.id)}`
}

/** A GATE subject's own place for a concept, when it has one (else null). */
export function gateTarget(subject: Pick<WebCluster, 'gate'>, node?: { ls?: string[] } | null): { kind: 'notes'; href: string } | { kind: 'pyq'; subject: string } | null {
  const g = subject.gate
  if (!g) return null
  if (g.notes) return { kind: 'notes', href: node?.ls?.length ? `/gate/notes/${g.notes}/${node.ls[0]}` : `/gate/notes/${g.notes}` }
  if (g.pyq) return { kind: 'pyq', subject: g.pyq }
  return null
}
