import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowUpRight, ChevronRight, Lock } from 'lucide-react'
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, LoadingBlock, PageHeader } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { cachedState, cachedStructure, loadWeb, mergeWeb } from '@/components/nexus/data'
import { courseHref, gateTarget } from '@/components/nexus/course'
import type { NexusPyqsResponse, NexusWebState, NexusWebStructure, WebCluster, WebNode } from '@/components/nexus/types'

/*
 * A Nexus course: /learn/<subject> and /learn/<subject>/<concept>, one for
 * every subject and concept in content/nexus.
 *   GATE subjects go straight to their own material: Digital Logic to the
 *   GATE notes lesson the concept teaches, the others to its PYQ practice.
 *   Every other subject shows its course page: the content from
 *   content/courses/<subject>/<concept>.md when it is written, else
 *   "Course coming soon" — with where the concept sits (stream, subject,
 *   zone) and what it needs and unlocks, all linked.
 */

interface CourseBody {
  ok: boolean
  body: string | null
}

/* A small, safe Markdown subset for hand-written course files. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k++} className="rounded bg-bg-surface-2 px-1 font-mono text-[0.92em]">{t.slice(1, -1)}</code>)
    else {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!
      const safe = /^(https?:\/\/|\/)/.test(href) ? href : '#'
      out.push(
        safe.startsWith('/') ? (
          <Link key={k++} to={safe} className="text-accent-brand hover:underline">{label}</Link>
        ) : (
          <a key={k++} href={safe} target="_blank" rel="noreferrer noopener" className="text-accent-brand hover:underline">{label}</a>
        ),
      )
    }
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/)
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground-dim">
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        const h = /^(#{1,3})\s+(.*)$/.exec(lines[0])
        if (h && lines.length === 1) {
          const cls = h[1].length === 1 ? 'font-display text-xl text-foreground' : h[1].length === 2 ? 'font-display text-lg text-foreground' : 'text-sm font-semibold tracking-wider text-foreground uppercase'
          return <p key={i} className={`mb-0 ${cls}`}>{inline(h[2])}</p>
        }
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={i} className="ml-5 list-disc space-y-1">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ''))}</li>)}
            </ul>
          )
        }
        return <p key={i} className="mb-0">{inline(lines.join(' '))}</p>
      })}
    </div>
  )
}

function useWeb() {
  const { user } = useAuth()
  const [structure, setStructure] = useState<NexusWebStructure | null>(() => cachedStructure())
  const [state, setState] = useState<NexusWebState | null>(() => cachedState(user?.username ?? ''))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadWeb(false)
      .then((r) => {
        setStructure(r.structure)
        setState(r.state)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load the course'))
  }, [])
  const clusters = useMemo(() => (structure ? mergeWeb(structure, state) : null), [structure, state])
  return { structure, clusters, error }
}

/** A GATE concept without notes: its PYQs in the practice view. */
function PyqRedirect({ subject, concept, pyq }: { subject: string; concept: string | undefined; pyq: string }) {
  const { data, error } = useApi<NexusPyqsResponse>(() => api.get<NexusPyqsResponse>(`/api/nexus/pyqs/${subject}/${concept}`), [subject, concept], { skip: !concept })
  if (!concept || error) return <Navigate to={`/gate/practice?subject=${encodeURIComponent(pyq)}`} replace />
  if (!data) return <LoadingBlock rows={4} />
  const ids = data.questions.map((q) => q.id).slice(0, 500)
  return <Navigate to={ids.length ? `/gate/practice?ids=${ids.join(',')}` : `/gate/practice?subject=${encodeURIComponent(pyq)}`} replace />
}

function ConceptLink({ c, n, done }: { c: WebCluster; n: WebNode; done: boolean }) {
  return (
    <Link to={courseHref(c, n.id)} className="cursor-pointer">
      <Badge variant={done ? 'success' : n.s === 1 ? 'primary' : 'default'}>
        {n.s === 0 && <Lock className="size-3" aria-hidden="true" />}
        {n.n}
        {c ? <span className="opacity-60"> · {c.short}</span> : null}
      </Badge>
    </Link>
  )
}

export default function CoursePage() {
  const { subject = '', concept } = useParams()
  const { structure, clusters, error } = useWeb()
  const cluster = clusters?.find((c) => c.id === subject) ?? null
  const node = concept ? (cluster?.nodes.find((n) => n.id === concept) ?? null) : null
  const content = useApi<CourseBody>(() => api.get<CourseBody>(`/api/courses/${subject}${concept ? `/${concept}` : ''}`), [subject, concept], {
    skip: !cluster || !!cluster.gate,
  })

  if (!clusters) return error ? <ErrorState message={error} /> : <LoadingBlock rows={8} />
  if (!cluster) return <Navigate to="/learn" replace />
  if (cluster.engine === 'dsa') return <Navigate to="/learn" replace />
  if (concept && !node) return <Navigate to={courseHref(cluster)} replace />
  const gate = gateTarget(cluster, node)
  if (gate?.kind === 'notes') return <Navigate to={gate.href} replace />
  if (gate?.kind === 'pyq') return <PyqRedirect subject={subject} concept={concept} pyq={gate.subject} />

  const stream = structure?.streams?.find((s) => s.id === cluster.stream)
  const zone = node ? cluster.zones.find((z) => z.level === node.z) : null
  const byKey = new Map<string, { c: WebCluster; n: WebNode }>()
  for (const c of clusters) for (const n of c.nodes) byKey.set(`${c.id}:${n.id}`, { c, n })
  const needs = node ? [...node.req.map((r) => `${cluster.id}:${r}`), ...(node.cx ?? [])].map((k) => byKey.get(k)).filter((x): x is { c: WebCluster; n: WebNode } => !!x) : []
  const unlocks = node
    ? [...byKey.values()].filter(({ c, n }) => (c.id === cluster.id && n.req.includes(node.id)) || (n.cx ?? []).includes(`${cluster.id}:${node.id}`))
    : []
  const body = content.data?.body ?? null
  const nexusHref = `/nexus?subject=${encodeURIComponent(cluster.id)}${node ? `&node=${encodeURIComponent(node.id)}` : ''}`

  return (
    <div>
      {/* Stream › Subject › Zone */}
      <nav aria-label="Course" className="mb-3 flex flex-wrap items-center gap-1 text-[12px] text-text-muted">
        <Link to="/nexus" className="hover:text-text-primary" style={stream ? { color: stream.hue } : undefined}>
          {stream?.name ?? 'Nexus'}
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <Link to={courseHref(cluster)} className="hover:text-text-primary">
          {cluster.name}
        </Link>
        {zone && (
          <>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span>{zone.name}</span>
          </>
        )}
      </nav>
      <PageHeader
        icon="learn"
        title={node ? node.n : cluster.name}
        subtitle={node ? `${cluster.name}${zone ? ` · ${zone.name}` : ''}` : cluster.description || `Every concept of ${cluster.name}, in order.`}
        actions={
          <Link to={nexusHref}>
            <Button variant="outline" size="sm">
              See it in the Nexus <ArrowUpRight className="size-3.5" />
            </Button>
          </Link>
        }
      />

      {node ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardContent>
              {content.loading && !content.data ? (
                <LoadingBlock rows={4} />
              ) : body ? (
                <Markdown text={body} />
              ) : (
                <EmptyState
                  icon="learn"
                  title="Course coming soon"
                  description={`The ${node.n} course is being written. Until then, this is where it sits in ${cluster.name} — and what to study first.`}
                  className="py-10"
                />
              )}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Your mastery</p>
                <p className="mb-0 font-mono text-sm text-foreground tabular-nums">
                  {node.s === 2 ? 'mastered' : `${node.p}%`} <span className="text-foreground-faint">· {node.xp} XP</span>
                  {node.o ? <span className="text-foreground-faint"> · optional</span> : null}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Needs</p>
                {needs.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {needs.map(({ c, n }) => <ConceptLink key={`${c.id}:${n.id}`} c={c} n={n} done={n.s === 2} />)}
                  </div>
                ) : (
                  <p className="mb-0 text-xs text-foreground-dim">Nothing — a good place to start.</p>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Unlocks</p>
                {unlocks.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {unlocks.map(({ c, n }) => <ConceptLink key={`${c.id}:${n.id}`} c={c} n={n} done={n.s === 2} />)}
                  </div>
                ) : (
                  <p className="mb-0 text-xs text-foreground-dim">The end of this branch.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {body && (
            <Card>
              <CardContent>
                <Markdown text={body} />
              </CardContent>
            </Card>
          )}
          {cluster.zones.map((z) => {
            const list = cluster.nodes.filter((n) => n.z === z.level)
            return (
              <Card key={z.level}>
                <CardContent className="space-y-2">
                  <p className="mb-0 text-[10px] font-semibold tracking-[0.12em] text-text-muted uppercase">Zone {z.level}</p>
                  <p className="mb-1 font-display text-[15px] font-semibold text-text-primary">{z.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((n) => (
                      <Link key={n.id} to={courseHref(cluster, n.id)}>
                        <Badge variant={n.s === 2 ? 'success' : n.s === 1 ? 'primary' : 'default'}>
                          {n.s === 0 && <Lock className="size-3" aria-hidden="true" />}
                          {n.n}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
