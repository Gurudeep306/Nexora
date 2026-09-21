import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, Crown, Flag, Play, Skull, Swords, Timer, Trophy, User } from 'lucide-react'
import { Badge, Button, Card, CardContent, EmptyState, Select, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { CodeEditor } from './CodeEditor'
import { sanitizeHtml } from './sanitize'
import type { BattleStart, RunResult } from './types'
import { cn } from '@/lib/utils'

interface BattleProblem {
  id: number
  title: string
  rating: number
  platform: string
  url: string
}

interface Statement {
  statement: string
  inputSpec?: string
  outputSpec?: string
  timeLimit?: string
  samples?: { input: string; output: string }[]
}

const BANDS = [
  { id: 'rookie', label: 'Rookie (800–1000)', min: 800, max: 1000 },
  { id: 'novice', label: 'Novice (1000–1200)', min: 1000, max: 1200 },
  { id: 'warrior', label: 'Warrior (1200–1400)', min: 1200, max: 1400 },
  { id: 'elite', label: 'Elite (1400–1600)', min: 1400, max: 1600 },
  { id: 'expert', label: 'Expert (1600–1800)', min: 1600, max: 1800 },
  { id: 'master', label: 'Master (1800+)', min: 1800, max: 2400 },
]

type Phase = 'setup' | 'racing' | 'result'

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function AiBattlePanel() {
  const toast = useToast()
  const [band, setBand] = useState(BANDS[1].id)
  const [phase, setPhase] = useState<Phase>('setup')
  const [problem, setProblem] = useState<BattleProblem | null>(null)
  const [statement, setStatement] = useState<Statement | null>(null)
  const [battle, setBattle] = useState<BattleStart | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState<boolean | null>(null)
  const [record, setRecord] = useState<{ wins: number; total: number } | null>(null)
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [starting, setStarting] = useState(false)
  const startedAt = useRef(0)
  const finished = useRef(false)

  const endRace = useCallback(
    async (victory: boolean, playerTimeMs: number) => {
      setWon(victory)
      setPhase('result')
      if (battle) {
        try {
          await api.post('/api/ai-battle/complete', { battleId: battle.battleId, playerTimeMs, won: victory })
          const hist = await api.get<{ wins: number; total: number }>(`/api/ai-battles/${problem?.id}`)
          setRecord({ wins: hist.wins, total: hist.total })
        } catch {
          /* battle log is best-effort */
        }
      }
    },
    [battle, problem],
  )

  // Race clock
  useEffect(() => {
    if (phase !== 'racing' || !battle) return
    const iv = window.setInterval(() => {
      const e = Date.now() - startedAt.current
      setElapsed(e)
      if (e >= battle.aiTimeMs && !finished.current) {
        finished.current = true
        void endRace(false, e)
      }
    }, 100)
    return () => window.clearInterval(iv)
  }, [phase, battle, endRace])

  async function findOpponent() {
    const b = BANDS.find((x) => x.id === band)!
    try {
      const res = await api.get<{ problems: BattleProblem[] }>('/api/problems', {
        query: { minRating: b.min, maxRating: b.max, limit: 20, sort: 'rating' },
      })
      if (!res.problems?.length) {
        toast.warning('No problems in this rating band', 'Try a different band or sync problems first.')
        return
      }
      const p = res.problems[Math.floor(Math.random() * res.problems.length)]
      setProblem(p)
      setStatement(null)
      setRecord(null)
      const st = await api.get<Statement>(`/api/problem-statement/${p.id}`)
      setStatement(st)
    } catch (err) {
      toast.error('Failed to find a problem', (err as Error).message)
    }
  }

  async function startBattle() {
    if (!problem) return
    setStarting(true)
    try {
      const res = await api.post<BattleStart & { ok: boolean }>('/api/ai-battle/start', { problem_id: problem.id })
      setBattle({ battleId: res.battleId, aiTimeMs: res.aiTimeMs, rating: res.rating })
      setCode('')
      setWon(null)
      setElapsed(0)
      finished.current = false
      startedAt.current = Date.now()
      setPhase('racing')
      // best-effort history load
      api
        .get<{ wins: number; total: number }>(`/api/ai-battles/${problem.id}`)
        .then((h) => setRecord({ wins: h.wins, total: h.total }))
        .catch(() => undefined)
    } catch (err) {
      toast.error('Failed to start battle', (err as Error).message)
    } finally {
      setStarting(false)
    }
  }

  async function checkSolution() {
    if (!statement?.samples?.length || !battle) return
    setChecking(true)
    try {
      for (const s of statement.samples) {
        const r = await api.post<RunResult>('/api/run', { code, input: s.input, language: 'python' })
        if (r.verdict !== 'OK' || r.output.trim() !== s.output.trim()) {
          toast.warning('Sample failed', `Verdict ${r.verdict} — keep grinding, the clock is running.`)
          return
        }
      }
      if (!finished.current) {
        finished.current = true
        toast.success('All samples passed!')
        void endRace(true, Date.now() - startedAt.current)
      }
    } catch (err) {
      const e = err as ApiError
      if (e.status === 429) toast.error('Run rate limit reached', 'Judge allows 30 runs/min — wait a few seconds and retry.')
      else toast.error('Check failed', e.message)
    } finally {
      setChecking(false)
    }
  }

  const aiProgress = battle ? Math.min(1, elapsed / battle.aiTimeMs) : 0

  return (
    <div className="space-y-4">
      {/* SETUP */}
      {phase === 'setup' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mx-auto max-w-2xl space-y-4">
          <Card glow>
            <CardContent className="space-y-4 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-accent/40 bg-surface-2 text-accent glow-box-accent">
                <Swords className="size-6" />
              </div>
              <div>
                <h2 className="font-display text-lg tracking-wider text-foreground glow-accent-text">RACE THE MACHINE</h2>
                <p className="mx-auto mt-1 max-w-md text-xs text-foreground-dim">
                  The AI opponent gets a time based on problem rating. Solve it — all samples green —
                  before its clock runs out.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row">
                <Select value={band} onChange={(e) => setBand(e.target.value)} aria-label="Difficulty band" className="flex-1">
                  {BANDS.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </Select>
                <Button variant="outline" onClick={findOpponent}>Find opponent</Button>
              </div>
            </CardContent>
          </Card>

          {problem && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}>
              <Card interactive onClick={() => void startBattle()} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') void startBattle() }}
                aria-label={`Start battle: ${problem.title}`}>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <Bot className="size-8 shrink-0 text-cyan" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm tracking-wide text-foreground">{problem.title}</p>
                    <p className="mt-0.5 text-[11px] text-foreground-faint uppercase">{problem.platform}</p>
                  </div>
                  <Badge variant="primary">Rating {problem.rating}</Badge>
                  {record && <Badge variant="cyan">{record.wins}W / {record.total - record.wins}L</Badge>}
                  <Button size="sm" loading={starting} onClick={(e) => { e.stopPropagation(); void startBattle() }}>
                    <Play /> Start battle
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {!problem && (
            <EmptyState icon={<Swords />} title="Pick a band, find your opponent" description="Battles use real platform problems from the Nexora bank." />
          )}
        </motion.div>
      )}

      {/* RACING */}
      {phase === 'racing' && battle && problem && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">
          {/* Race lanes */}
          <Card glow className="border-accent/30">
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm tracking-wider text-foreground">{problem.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="accent"><Timer /> AI finishes in {fmt(battle.aiTimeMs - elapsed)}</Badge>
                  <Badge variant="cyan">You {fmt(elapsed)}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => { finished.current = true; void endRace(false, Date.now() - startedAt.current) }}>
                    <Flag /> Forfeit
                  </Button>
                </div>
              </div>
              <RacerLane icon={<Bot className="size-4" />} name="NEXORA AI" progress={aiProgress} color="accent" time={fmt(Math.min(elapsed, battle.aiTimeMs))} />
              <RacerLane icon={<User className="size-4" />} name="YOU" progress={won ? 1 : aiProgress * 0.55} color="primary" time={fmt(elapsed)} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="min-w-0">
              <CardContent className="space-y-3">
                {statement ? (
                  <>
                    <div
                      className="max-h-72 overflow-y-auto rounded-lg border border-border bg-background p-3 text-xs leading-relaxed text-foreground-dim [&_p]:my-1.5"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(statement.statement) }}
                    />
                    {statement.samples?.map((s, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-background p-2">
                          <p className="text-[10px] tracking-wider text-primary-bright uppercase">Sample {i + 1} input</p>
                          <pre className="mt-1 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap text-foreground-dim">{s.input}</pre>
                        </div>
                        <div className="rounded-lg border border-border bg-background p-2">
                          <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Output</p>
                          <pre className="mt-1 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap text-foreground-dim">{s.output}</pre>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-foreground-dim">Loading statement…</p>
                )}
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="cyan">Python</Badge>
                  <Button size="sm" variant="accent" onClick={checkSolution} loading={checking} disabled={!statement?.samples?.length || !code.trim()}>
                    <Trophy /> Submit for the win
                  </Button>
                </div>
                <CodeEditor value={code} onChange={setCode} language="python" height="320px" ariaLabel="Battle code editor" />
                {!statement?.samples?.length && (
                  <p className="text-[11px] text-warning">This problem has no samples — forfeit or race on honor.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* RESULT */}
      <AnimatePresence>
        {phase === 'result' && problem && battle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="mx-auto max-w-lg"
          >
            <Card glow className={cn('text-center', won ? 'border-success/40' : 'border-destructive/40')}>
              <CardContent className="space-y-4 py-8">
                <div className={cn('mx-auto flex size-16 items-center justify-center rounded-2xl border', won ? 'border-success/40 bg-success/10 text-success glow-box' : 'border-destructive/40 bg-destructive/10 text-destructive')}>
                  {won ? <Crown className="size-8" /> : <Skull className="size-8" />}
                </div>
                <div>
                  <h2 className={cn('font-display text-2xl tracking-wider', won ? 'text-success glow-text' : 'text-destructive')}>
                    {won ? 'VICTORY' : 'DEFEAT'}
                  </h2>
                  <p className="mt-1 text-xs text-foreground-dim">
                    {won
                      ? `You solved ${problem.title} in ${fmt(elapsed)} — the machine needed ${fmt(battle.aiTimeMs)}.`
                      : `The machine finished ${problem.title} in ${fmt(battle.aiTimeMs)}. You took ${fmt(elapsed)}.`}
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  <Badge variant="primary">Rating {battle.rating}</Badge>
                  {record && <Badge variant="cyan">Record {record.wins}W / {record.total - record.wins}L</Badge>}
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => { setPhase('setup'); setProblem(null); setBattle(null) }}>
                    New opponent
                  </Button>
                  <Button variant="accent" onClick={() => void startBattle()}>
                    <Swords /> Rematch
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RacerLane({ icon, name, progress, color, time }: { icon: ReactNode; name: string; progress: number; color: 'accent' | 'primary'; time: string }) {
  const pct = Math.min(100, Math.max(0, progress * 100))
  return (
    <div className="flex items-center gap-3" aria-label={`${name} progress ${Math.round(pct)}%`}>
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg border', color === 'accent' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-primary/40 bg-primary/10 text-primary-bright')}>
        {icon}
      </span>
      <span className="w-20 shrink-0 font-display text-[11px] tracking-wider text-foreground-dim">{name}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted border border-border">
        <motion.div
          className={cn('h-full rounded-full', color === 'accent' ? 'bg-gradient-to-r from-accent to-rose-400' : 'bg-gradient-to-r from-primary to-primary-bright')}
          style={{ width: `${pct}%`, boxShadow: color === 'accent' ? '0 0 8px rgba(244,63,94,0.6)' : '0 0 8px rgba(124,58,237,0.6)' }}
          transition={{ duration: 0.1 }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-xs text-foreground tabular-nums">{time}</span>
    </div>
  )
}
