import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SearchInput, tierFor } from '@/components/ui'
import type { WebCluster, WebStream } from './types'
import { keyOf, keystone, tally, type StarKey } from './atlas-data'
import './atlas.css'

/*
 * The Atlas's companion pieces (journal style):
 *  - TonightSky: three real suggestions above the chart.
 *  - AtlasLedger: the web rank as one ruled line.
 *  - AtlasIndex: every subject drawn as its own small constellation (rings
 *    by zone, a star per skill, sized by how much builds on it), grouped by
 *    stream. Small multiples on one scale; also the list view on phones.
 */

const EASE = [0.22, 1, 0.36, 1] as const

/** One subject as a tiny star chart: you at the centre, a ring per zone, a star per skill. */
export function ConstellationGlyph({ c, deps, size = 76 }: { c: WebCluster; deps: Map<StarKey, number>; size?: number }) {
  const mid = size / 2
  const zones = [...new Set(c.nodes.map((n) => n.z))].sort((a, b) => a - b)
  const zi = new Map(zones.map((z, i) => [z, i]))
  const rOf = (z: number) => (zones.length < 2 ? 22 : 9 + ((zi.get(z) ?? 0) / (zones.length - 1)) * (mid - 7 - 9))
  const maxDep = Math.max(1, ...c.nodes.map((n) => deps.get(keyOf(c, n)) ?? 0))
  const byZone = new Map<number, typeof c.nodes>()
  for (const n of c.nodes) byZone.set(n.z, [...(byZone.get(n.z) ?? []), n])
  const stars: { x: number; y: number; r: number; cls: string; k: string }[] = []
  for (const [z, list] of byZone) {
    const r = rOf(z)
    list.forEach((n, i) => {
      const a = -Math.PI / 2 + (i / list.length) * Math.PI * 2 + z * 0.61
      const d = deps.get(keyOf(c, n)) ?? 0
      const rad = 1.05 + 1.15 * (Math.log2(1 + d) / Math.log2(1 + maxDep))
      stars.push({ x: mid + Math.cos(a) * r, y: mid + Math.sin(a) * r, r: rad, cls: n.s === 2 ? 'ax-glyph-done' : n.s === 1 ? 'ax-glyph-open' : 'ax-glyph-locked', k: n.id })
    })
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {zones.map((z) => (
        <circle key={z} cx={mid} cy={mid} r={rOf(z)} className="ax-glyph-ring" />
      ))}
      {stars.map((s) => (
        <circle key={s.k} cx={s.x.toFixed(2)} cy={s.y.toFixed(2)} r={s.r.toFixed(2)} className={s.cls} />
      ))}
      <circle cx={mid} cy={mid} r={2.4} className="ax-glyph-core" />
    </svg>
  )
}

export function AtlasIndex({ clusters, streams, deps, onOpen, onShow }: { clusters: WebCluster[]; streams: WebStream[]; deps: Map<StarKey, number>; onOpen: (id: string) => void; onShow: (id: string) => void }) {
  const [q, setQ] = useState('')
  const still = useReducedMotion()
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = clusters.filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.short.toLowerCase().includes(needle))
    return [...streams]
      .sort((a, b) => a.order - b.order)
      .map((st) => ({ st, list: list.filter((c) => c.stream === st.id).sort((a, b) => a.order - b.order) }))
      .filter((g) => g.list.length)
  }, [clusters, streams, q])
  return (
    <div>
      <div className="ax-filter">
        <div className="w-full max-w-sm">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Find a constellation" aria-label="Find a subject" />
        </div>
        <p className="m-0 text-[13px] text-text-muted">Each subject is drawn as its own small sky: you at the centre, a ring per zone, bigger stars unlock more.</p>
      </div>
      <div className="ax-index">
        {groups.map(({ st, list }) => {
          const lit = list.reduce((a, c) => a + tally(c).mastered, 0)
          const all = list.reduce((a, c) => a + tally(c).total, 0)
          return (
            <section key={st.id} aria-labelledby={`ax-st-${st.id}`}>
              <header className="ax-stream-head">
                <h2 id={`ax-st-${st.id}`} className="ax-stream-title">
                  {st.name}
                </h2>
                <span className="ax-stream-count">
                  {lit} of {all} stars lit
                </span>
              </header>
              <div className="ax-grid">
                {list.map((c, i) => {
                  const t = tally(c)
                  return (
                    <motion.div key={c.id} initial={still ? false : { opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.03, 0.3) }}>
                      <button type="button" className="ax-const w-full" onClick={() => onOpen(c.id)} onContextMenu={(e) => (e.preventDefault(), onShow(c.id))}>
                        <ConstellationGlyph c={c} deps={deps} />
                        <span className="min-w-0">
                          <span className="ax-const-name block">{c.name}</span>
                          <span className="ax-const-meta block">
                            {t.mastered} of {t.total} stars · {t.pct}%
                            {t.open ? ` · ${t.open} open` : ''}
                          </span>
                          <span className="ax-bar block" aria-hidden="true">
                            <span style={{ width: `${t.pct}%` }} />
                          </span>
                        </span>
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          )
        })}
        {!groups.length && <p className="font-serif text-lg text-text-secondary italic">No constellation by that name.</p>}
      </div>
    </div>
  )
}

/** Three real suggestions: the next star, the keystone in reach, and what is due for review. */
export function TonightSky({
  clusters,
  deps,
  next,
  due,
  onOpen,
}: {
  clusters: WebCluster[]
  deps: Map<StarKey, number>
  next: string | null
  due: Set<string>
  onOpen: (key: string) => void
}) {
  const find = (k: string | null) => {
    if (!k) return null
    const [sid, ...rest] = k.split(':')
    const c = clusters.find((x) => x.id === sid)
    const n = c?.nodes.find((x) => x.id === rest.join(':'))
    return c && n ? { c, n } : null
  }
  const nx = find(next)
  const ks = keystone(clusters, deps)
  const dueFirst = [...due][0] ?? null
  const df = find(dueFirst)
  const items = [
    nx && {
      key: keyOf(nx.c, nx.n),
      kicker: 'Next star',
      title: nx.n.n,
      why: `${nx.c.name} · ring ${nx.n.z} ${tierFor(nx.n.z).name}${nx.n.p ? ` · ${nx.n.p}% there` : ''}`,
    },
    ks &&
      (!nx || keyOf(ks.cluster, ks.node) !== keyOf(nx.c, nx.n)) && {
        key: keyOf(ks.cluster, ks.node),
        kicker: 'Keystone in reach',
        title: ks.node.n,
        why: `${ks.cluster.name} · ${ks.unlocks} ${ks.unlocks === 1 ? 'skill builds' : 'skills build'} on it`,
      },
    df && {
      key: keyOf(df.c, df.n),
      kicker: 'Due for review',
      title: df.n.n,
      why: due.size > 1 ? `and ${due.size - 1} more ${due.size - 1 === 1 ? 'star' : 'stars'} to revisit` : `${df.c.name} · keep it lit`,
    },
  ].filter(Boolean) as { key: string; kicker: string; title: string; why: string }[]
  if (!items.length) return null
  return (
    <section className="ax-tonight" aria-label="Tonight's sky">
      {items.map((it) => (
        <button key={it.kicker} type="button" className="ax-tonight-item" onClick={() => onOpen(it.key)}>
          <span className="ax-tonight-kicker">{it.kicker}</span>
          <span className="ax-tonight-title">{it.title}</span>
          <span className="ax-tonight-why">{it.why}</span>
        </button>
      ))}
    </section>
  )
}

/** The web rank as one ruled line: level and progress, and three figures. */
export function AtlasLedger({
  level,
  name,
  xpInLevel,
  xpForNext,
  toNext,
  mastered,
  total,
  week,
  streak,
}: {
  level: number
  name: string
  xpInLevel: number
  xpForNext: number
  toNext: string | null
  mastered: number
  total: number
  week?: { concepts: number; xp: number } | null
  streak?: number
}) {
  const pct = xpForNext ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 100
  return (
    <section className="ax-ledger" aria-label="Your rank">
      <div>
        <p className="ax-tonight-kicker m-0">Web rank</p>
        <p className="ax-ledger-rank m-0 mt-1">
          Level {level} · {name}
        </p>
        <div className="ax-bar" role="progressbar" aria-label="Progress to the next level" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="ax-ledger-sub m-0">
          {xpInLevel} of {xpForNext} XP{toNext ? ` · ${toNext}` : ''}
        </p>
      </div>
      <dl className="ax-fig m-0">
        <dt>Stars lit</dt>
        <dd>
          {mastered}
          <span className="text-[0.55em] text-text-muted"> / {total}</span>
        </dd>
      </dl>
      <dl className="ax-fig m-0">
        <dt>This week</dt>
        <dd>{week ? week.concepts : 0}</dd>
      </dl>
      <dl className="ax-fig m-0">
        <dt>Day streak</dt>
        <dd>{streak ?? '—'}</dd>
      </dl>
    </section>
  )
}
