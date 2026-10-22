import type { WebCluster } from './types'

/*
 * Every subject has ONE page, its course tree, linked from the Nexus, from
 * /learn and (GATE subjects) from /gate:
 *   DSA             /learn/dsa            a skill: /learn/dsa/skill/<node>
 *   every other     /learn/<id>           a lesson: /learn/<id>/<node>
 * A node's address opens straight into its bloomed lesson. The older
 * addresses (/gate/subjects/<id>, #<node>, /nexus?subject=) redirect here.
 */
export function subjectHref(subject: Pick<WebCluster, 'id' | 'engine'>, nodeId?: string | null): string {
  if (subject.engine === 'dsa') return nodeId ? `/learn/dsa/skill/${encodeURIComponent(nodeId)}` : '/learn/dsa'
  const base = `/learn/${encodeURIComponent(subject.id)}`
  return nodeId ? `${base}/${encodeURIComponent(nodeId)}` : base
}

/** Where a skill's lesson lives: its bloomed lesson on the subject page. */
export const courseHref = subjectHref

/** A GATE subject's own place for a concept, when it has one (else null). */
export function gateTarget(subject: Pick<WebCluster, 'gate'>, node?: { ls?: string[] } | null): { kind: 'notes'; href: string } | { kind: 'pyq'; subject: string } | null {
  const g = subject.gate
  if (!g) return null
  if (g.notes) return { kind: 'notes', href: node?.ls?.length ? `/gate/notes/${g.notes}/${node.ls[0]}` : `/gate/notes/${g.notes}` }
  if (g.pyq) return { kind: 'pyq', subject: g.pyq }
  return null
}
