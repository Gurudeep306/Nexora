import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Icon } from '@/components/icon/Icon'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Sparkline } from '@/components/ui/Sparkline'
import { cn, timeAgo } from '@/lib/utils'
import type { Achievement, Showcase } from '@/components/social/feed/types'
import { lastDays } from './notebook-data'
import { achievementIcon } from './Showcase'
import './notebook.css'

/*
 * The profile as a scientist's notebook: a colophon of figures with 30-day
 * sparklines, the practice calendar in a sentence, small multiples for
 * difficulty and topics, a shelf of seals, and the Bridge (verified judge
 * accounts). Everything reads theme tokens, so it works in every style; the
 * journal style adds the paper details in notebook.css.
 */

type Stats = NonNullable<Showcase['stats']>
type Day = NonNullable<Showcase['heatmap']>[number]
const EASE = [0.22, 1, 0.36, 1] as const

/** A round ink seal with the level numeral, and "Level N · Name" beside it. */
export function RankSeal({ level, name }: { level: number; name: string }) {
  return (
    <span className="pf-seal" title={`Level ${level} · ${name}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="pf-seal-mark">
        <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1.2 2.1" />
        <text x="20" y="25.5" textAnchor="middle" className="pf-seal-num">
          {level}
        </text>
      </svg>
      <span className="pf-seal-text">
        Level {level} · {name}
      </span>
    </span>
  )
}

function Fact({ label, value, sub, spark }: { label: string; value: ReactNode; sub?: ReactNode; spark?: number[] }) {
  const flat = !spark || spark.every((v) => v === 0)
  return (
    <div className="pf-fact">
      <div className="pf-fact-label">{label}</div>
      <div className="pf-fact-value">{value}</div>
      {sub && <div className="pf-fact-sub">{sub}</div>}
      {!flat && <Sparkline values={spark!} width={96} height={22} className="pf-fact-spark" />}
    </div>
  )
}

/** One hairline-ruled row of figures; numbers count up once, with a 30-day sparkline where there is one. */
export function Colophon({ s, days, today }: { s: Stats; days?: Day[]; today: Date }) {
  const n = (v: number) => <AnimatedNumber value={v} />
  return (
    <section className="pf-colophon" aria-label="Figures">
      <Fact label="XP" value={n(s.xp)} sub={`Level ${s.level.level} · ${s.level.name}`} spark={lastDays(days, 30, (d) => d.xp, today)} />
      <Fact label="Solved" value={n(s.solved)} sub={`${s.attempted.toLocaleString()} attempted`} spark={lastDays(days, 30, (d) => d.solved, today)} />
      <Fact
        label="Streak"
        value={
          <>
            {n(s.streak.current)}
            <span className="pf-unit">d</span>
          </>
        }
        sub={`Best ${s.streak.best} ${s.streak.best === 1 ? 'day' : 'days'}`}
        spark={lastDays(days, 30, (d) => (d.count > 0 ? 1 : 0), today)}
      />
      <Fact
        label="GATE accuracy"
        value={s.gate.accuracy != null ? `${s.gate.accuracy}%` : '—'}
        sub={s.gate.attempted ? `${s.gate.correct}/${s.gate.attempted} correct` : 'No attempts yet'}
        spark={lastDays(days, 30, (d) => d.gate, today)}
      />
      <Fact label="Contest rating" value={s.contests.rating ?? '—'} sub={s.contests.joined ? `${s.contests.joined} ${s.contests.joined === 1 ? 'contest' : 'contests'}` : 'Unrated'} />
      <Fact
        label="GATE tests"
        value={n(s.gate.tests)}
        sub={s.gate.best_percentile != null ? `Best percentile ${Math.round(s.gate.best_percentile)}` : s.gate.best_score != null ? `Best ${s.gate.best_score}` : 'Take a mock'}
      />
    </section>
  )
}

/** A chapter of the notebook: a label kicker and a serif title, no card. */
export function Folio({ kicker, title, action, children, className }: { kicker: string; title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('pf-folio', className)} aria-label={title}>
      <header className="pf-folio-head">
        <div>
          <p className="ed-label ed-muted">{kicker}</p>
          <h2 className="pf-folio-title ed-serif">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

/** Easy / Medium / Hard as three small multiples on one scale; unrated in a line beneath. */
export function DifficultyMultiples({ d }: { d: Stats['difficulty'] }) {
  const still = useReducedMotion()
  const rows = [
    { k: 'Easy', v: d.easy, tone: 'easy' },
    { k: 'Medium', v: d.medium, tone: 'medium' },
    { k: 'Hard', v: d.hard, tone: 'hard' },
  ]
  const max = Math.max(1, ...rows.map((r) => r.v))
  return (
    <div>
      <ul className="pf-multiples">
        {rows.map((r) => (
          <li key={r.k} className="pf-multiple">
            <span className={cn('pf-multiple-word', `is-${r.tone}`)}>{r.k}</span>
            <span className="pf-multiple-num">{r.v.toLocaleString()}</span>
            <span className="pf-bar" aria-hidden="true">
              <motion.span
                className={cn('pf-bar-fill', `is-${r.tone}`)}
                initial={{ scaleX: still ? r.v / max : 0 }}
                whileInView={{ scaleX: r.v / max }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: EASE }}
              />
            </span>
          </li>
        ))}
      </ul>
      <p className="pf-note">{d.unrated ? `${d.unrated.toLocaleString()} more without a rating.` : 'Difficulty comes from each problem’s rating.'}</p>
    </div>
  )
}

/** Topics as hairline bars on one scale (small multiples). */
export function TopicBars({ topics }: { topics: { topic: string; solved: number }[] }) {
  const still = useReducedMotion()
  if (!topics.length) return <p className="pf-note">Solve problems to see which topics you know best.</p>
  const max = Math.max(...topics.map((t) => t.solved))
  return (
    <ul className="pf-topics">
      {topics.map((t) => (
        <li key={t.topic} className="pf-topic">
          <span className="pf-topic-name">{t.topic}</span>
          <span className="pf-topic-num">{t.solved}</span>
          <span className="pf-bar" aria-hidden="true">
            <motion.span className="pf-bar-fill" initial={{ scaleX: still ? t.solved / max : 0 }} whileInView={{ scaleX: t.solved / max }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Languages as a hairline list with mono shares and a thin bar. */
export function LanguageList({ langs }: { langs: NonNullable<Showcase['languages']> }) {
  if (!langs.length) return <p className="pf-note">No submissions yet.</p>
  const total = langs.reduce((a, l) => a + l.submissions, 0) || 1
  return (
    <ul className="pf-topics">
      {langs.map((l) => {
        const pct = Math.round((l.submissions / total) * 100)
        return (
          <li key={l.language} className="pf-topic">
            <span className="pf-topic-name">{l.language}</span>
            <span className="pf-topic-num">{pct}%</span>
            <span className="pf-bar" aria-hidden="true">
              <span className="pf-bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** One embossed paper seal. Earned: ink with a clay rim. Locked: debossed and muted. */
export function Seal({ a, size = 64 }: { a: Achievement; size?: number }) {
  const earned = !!a.unlocked_at
  return (
    <figure className={cn('pf-shelf-item', earned ? 'is-earned' : 'is-locked')} title={`${a.title} — ${a.description}`}>
      <span className="pf-seal-disc" style={{ width: size, height: size }} aria-hidden="true">
        <Icon name={achievementIcon(a)} className="size-6" />
      </span>
      <figcaption>
        <span className="pf-shelf-name">{a.title}</span>
        <span className="pf-shelf-meta">{earned ? timeAgo(a.unlocked_at!) : `${Math.min(a.progress, a.target)} / ${a.target}`}</span>
        <span className="sr-only">{earned ? 'Earned' : 'Not earned yet'}</span>
      </figcaption>
    </figure>
  )
}

/** The shelf: earned seals first (up to eight), then the nearest ones still to earn. */
export function Shelf({ achievements, onAll }: { achievements: Achievement[]; onAll?: () => void }) {
  const earned = achievements.filter((a) => a.unlocked_at)
  const next = achievements
    .filter((a) => !a.unlocked_at)
    .sort((x, y) => y.progress / Math.max(1, y.target) - x.progress / Math.max(1, x.target))
  const shown = [...earned.slice(0, 8), ...next.slice(0, Math.max(0, 4 - earned.length))]
  return (
    <Folio
      kicker="The shelf"
      title={earned.length ? `${earned.length} ${earned.length === 1 ? 'seal' : 'seals'} earned` : 'No seals yet'}
      action={
        onAll && achievements.length > 0 ? (
          <button type="button" className="ed-link pf-folio-link" onClick={onAll}>
            View all {achievements.length}
          </button>
        ) : undefined
      }
    >
      {shown.length ? (
        <div className="pf-shelf">
          {shown.map((a) => (
            <Seal key={a.id} a={a} />
          ))}
        </div>
      ) : (
        <p className="pf-note">The first accepted solution earns the first seal.</p>
      )}
    </Folio>
  )
}

const JUDGE: Record<string, { name: string; url: (h: string) => string }> = {
  codeforces: { name: 'Codeforces', url: (h) => `https://codeforces.com/profile/${encodeURIComponent(h)}` },
  atcoder: { name: 'AtCoder', url: (h) => `https://atcoder.jp/users/${encodeURIComponent(h)}` },
  leetcode: { name: 'LeetCode', url: (h) => `https://leetcode.com/u/${encodeURIComponent(h)}/` },
}

/** The Bridge: verified judge accounts as hairline rows. */
export function Bridge({ linked, isSelf }: { linked: NonNullable<Showcase['linked']>; isSelf: boolean }) {
  if (!linked.length && !isSelf) return null
  return (
    <Folio kicker="The Bridge" title="Judge accounts">
      {linked.length ? (
        <ul className="pf-bridge">
          {linked.map((l) => {
            const j = JUDGE[l.platform] ?? { name: l.platform, url: () => '#' }
            return (
              <li key={l.platform} className="pf-bridge-row">
                <span className="pf-bridge-judge">{j.name}</span>
                <a className="pf-bridge-handle" href={j.url(l.handle)} target="_blank" rel="noopener noreferrer">
                  {l.handle}
                </a>
                <span className="pf-bridge-figs">
                  {l.rating != null && <span>rating {l.rating}{l.max_rating != null && l.max_rating !== l.rating ? ` (max ${l.max_rating})` : ''}</span>}
                  {l.solved != null && <span>{l.solved.toLocaleString()} solved</span>}
                </span>
                <span className="pf-bridge-verified">
                  <Icon name="check" className="size-3.5" aria-hidden />
                  Verified{l.last_import ? ` · imported ${timeAgo(l.last_import)}` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="pf-note">
          No judge accounts linked yet.{' '}
          <Link to="/settings?tab=platform" className="ed-link">
            Link Codeforces, AtCoder or LeetCode
          </Link>{' '}
          to bring your solves across.
        </p>
      )}
    </Folio>
  )
}
