import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BrainCircuit, CheckCircle2, Code2, Globe2, Swords, Trophy, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { Avatar, RankGlyph, RIFT_TIERS } from '@/components/ui'

/* Snippets that "type themselves" in the demo editor. */
const SNIPPETS = [
  {
    file: 'two_pointers.cpp',
    problem: 'Pair Sum · 1200',
    ms: 46,
    xp: 120,
    code: `int l = 0, r = n - 1;
while (l < r) {
  int s = a[l] + a[r];
  if (s == k) return {l, r};
  s < k ? l++ : r--;
}`,
  },
  {
    file: 'dp.py',
    problem: 'Frog Jump · 1400',
    ms: 88,
    xp: 180,
    code: `dp = [0] + [inf] * (n - 1)
for i in range(1, n):
    for j in (1, 2):
        if i - j >= 0:
            dp[i] = min(dp[i],
              dp[i-j] + abs(h[i]-h[i-j]))`,
  },
  {
    file: 'Graph.java',
    problem: 'Shortest Path · 1800',
    ms: 312,
    xp: 260,
    code: `pq.add(new int[]{0, src});
while (!pq.isEmpty()) {
  int[] cur = pq.poll();
  for (int[] e : adj[cur[1]])
    if (dist[e[0]] > cur[0] + e[1])
      relax(e, cur);
}`,
  },
]

function TypingEditor() {
  const reduce = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const [chars, setChars] = useState(0)
  const snip = SNIPPETS[idx]
  const done = chars >= snip.code.length

  useEffect(() => {
    if (reduce) {
      setChars(snip.code.length)
      const t = setTimeout(() => {
        setIdx((i) => (i + 1) % SNIPPETS.length)
      }, 4000)
      return () => clearTimeout(t)
    }
    if (!done) {
      const t = setTimeout(() => setChars((c) => c + 1 + Math.floor(Math.random() * 2)), 28 + Math.random() * 40)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setIdx((i) => (i + 1) % SNIPPETS.length)
      setChars(0)
    }, 2600)
    return () => clearTimeout(t)
  }, [chars, done, reduce, snip.code.length])

  return (
    <div className="card-neon overflow-hidden border-border-glow/70 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.45)]">
      <div className="flex items-center gap-2 border-b border-border bg-surface-2/70 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-accent/80" />
        <span className="size-2.5 rounded-full bg-warning/80" />
        <span className="size-2.5 rounded-full bg-success/80" />
        <span className="ml-2 font-mono text-[11px] text-foreground-faint">{snip.file}</span>
        <span className="ml-auto text-[10px] tracking-wider text-foreground-faint uppercase">{snip.problem}</span>
      </div>
      <pre className="min-h-[9.5rem] px-4 py-3 font-mono text-[12.5px] leading-relaxed text-foreground-dim">
        <code>
          {snip.code.slice(0, chars)}
          {!done && <span className="ml-px inline-block h-4 w-1.5 animate-pulse bg-primary-bright align-middle" />}
        </code>
      </pre>
      <div className="h-11 border-t border-border bg-surface/80 px-4">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key={`ok-${idx}`}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex h-full items-center gap-2 text-xs"
            >
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
              <span className="font-display tracking-wider text-success">ACCEPTED</span>
              <span className="font-mono text-foreground-faint">{snip.ms} ms</span>
              <span className="ml-auto rounded-md border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-gold">
                +{snip.xp} XP
              </span>
            </motion.div>
          ) : (
            <motion.div
              key={`run-${idx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center gap-2 text-xs text-foreground-faint"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-primary-bright" /> compiling in the rift…
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function RankLadder() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setActive((a) => (a + 1) % RIFT_TIERS.length), 1100)
    return () => clearInterval(t)
  }, [reduce])
  const tier = RIFT_TIERS[active]
  return (
    <div>
      <div className="flex items-end justify-between gap-1">
        {RIFT_TIERS.map((t, i) => (
          <motion.div
            key={t.level}
            animate={{ y: i === active ? -6 : 0, scale: i === active ? 1.18 : 1, opacity: i <= active ? 1 : 0.45 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <RankGlyph level={t.level} size={30} animated={false} title={t.name} />
          </motion.div>
        ))}
      </div>
      <p className="mt-2 text-xs text-foreground-faint">
        <span className="font-display tracking-wider" style={{ color: tier.color }}>
          {tier.name}
        </span>{' '}
        — rank {tier.level} of 11. Climb from Bit to ∞ Overflow.
      </p>
    </div>
  )
}

interface LeaderRow {
  username: string
  display_name?: string
  avatar?: string | null
  avatar_url?: string | null
  total_xp: number
}

export function AuthShowcase() {
  const [leaders, setLeaders] = useState<LeaderRow[]>([])
  const [problemCount, setProblemCount] = useState<number | null>(null)

  useEffect(() => {
    api
      .get<{ leaderboard: LeaderRow[] }>('/api/leaderboard', { query: { limit: 3 } })
      .then((r) => setLeaders((r.leaderboard ?? []).slice(0, 3)))
      .catch(() => {})
    api
      .get<{ total: number }>('/api/problems', { query: { limit: 1 } })
      .then((r) => setProblemCount(r.total))
      .catch(() => {})
  }, [])

  const stats = useMemo(
    () => [
      { icon: Swords, value: problemCount ? problemCount.toLocaleString() : '27K+', label: 'problems' },
      { icon: Globe2, value: '6', label: 'judges' },
      { icon: Code2, value: '20+', label: 'languages' },
      { icon: BrainCircuit, value: 'AI', label: 'tutor' },
    ],
    [problemCount],
  )

  return (
    <div className="relative flex h-full flex-col justify-between gap-8 overflow-hidden p-10 xl:p-14">
      {/* ambient layers */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary/25 blur-[110px]" />
        <div className="absolute -right-20 -bottom-24 size-96 rounded-full bg-accent/20 blur-[110px]" />
        <div className="absolute top-1/2 left-1/3 size-72 rounded-full bg-cyan/10 blur-[100px]" />
      </div>

      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent glow-box">
            <Zap className="size-6 text-white" aria-hidden="true" />
          </div>
          <span className="font-display text-2xl tracking-widest text-foreground glow-text">NEXORA</span>
        </div>
        <h1 className="mt-8 max-w-lg font-display text-3xl leading-tight text-foreground xl:text-4xl">
          Master the <span className="text-gradient">Rift</span>.
          <br />
          Conquer the leaderboard.
        </h1>
        <p className="mt-4 max-w-md text-foreground-dim">
          Solve problems from Codeforces, CodeChef, AtCoder and more — earn XP, climb 11 rift ranks, battle an AI, and
          code live with friends.
        </p>
      </div>

      <div className="relative grid max-w-xl gap-6">
        <TypingEditor />
        <RankLadder />
      </div>

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="grid grid-cols-4 gap-5">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label}>
              <Icon className="mb-1.5 size-4 text-primary-bright" aria-hidden="true" />
              <p className="font-display text-lg text-foreground tabular-nums">{value}</p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">{label}</p>
            </div>
          ))}
        </div>
        {leaders.length > 0 && (
          <div className="min-w-52">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-foreground-faint uppercase">
              <Trophy className="size-3 text-gold" aria-hidden="true" /> Top of the rift
            </p>
            <ul className="space-y-1.5">
              {leaders.map((l, i) => (
                <li key={l.username} className="flex items-center gap-2 text-sm">
                  <span className="w-4 font-mono text-xs text-foreground-faint">{i + 1}</span>
                  <Avatar seed={l.username} avatar={l.avatar} src={l.avatar_url} name={l.display_name || l.username} size="xs" ring={false} />
                  <span className="min-w-0 flex-1 truncate text-foreground-dim">{l.display_name || l.username}</span>
                  <span className="font-mono text-xs text-primary-bright tabular-nums">{Math.round(l.total_xp).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
