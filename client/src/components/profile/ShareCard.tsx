import { forwardRef } from 'react'
import type { PublicProfile, Showcase } from '@/components/social/feed/types'
import type { Paper } from './paper'

/*
 * The profile share card in the journal style, drawn as one SVG so the same
 * drawing is the preview and the downloadable image: paper, the name in
 * serif, four figures on a ruled line and the last 20 weeks of practice.
 * Colours are passed in already resolved (see paperColours), so the saved
 * file looks the same outside the app.
 */

const W = 600
const H = 315
const WEEKS = 20

export const ShareCard = forwardRef<SVGSVGElement, { profile: PublicProfile; stats?: Showcase['stats']; days?: Showcase['heatmap']; paper: Paper; today: Date }>(function ShareCard(
  { profile, stats, days, paper, today },
  ref,
) {
  const name = profile.display_name || profile.username
  const by = new Map((days ?? []).map((d) => [d.date, d.count]))
  const max = Math.max(1, ...(days ?? []).map((d) => d.count))
  const cells: { x: number; y: number; c: number }[] = []
  const end = new Date(today)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (WEEKS * 7 - 1) - end.getUTCDay())
  for (let w = 0; w < WEEKS + 1; w++) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setUTCDate(start.getUTCDate() + w * 7 + d)
      if (day > end) continue
      cells.push({ x: w, y: d, c: by.get(day.toISOString().slice(0, 10)) ?? 0 })
    }
  }
  const figs: [string, string][] = stats
    ? [
        ['Level', `${stats.level.level} · ${stats.level.name}`],
        ['Solved', stats.solved.toLocaleString()],
        ['Streak', `${stats.streak.current} d`],
        ['Followers', profile.counts.followers.toLocaleString()],
      ]
    : [['Followers', profile.counts.followers.toLocaleString()]]
  const serif = "'Newsreader Variable', Newsreader, Georgia, 'Times New Roman', serif"
  const sans = "'Geist Variable', Geist, system-ui, sans-serif"
  const mono = "'JetBrains Mono Variable', ui-monospace, Menlo, monospace"
  const mix = (c: number) => (c === 0 ? paper.oat : `color-mix(in oklab, ${paper.clay} ${Math.round(30 + (c / max) * 70)}%, ${paper.oat})`)
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Share card: ${name}, ${figs.map(([k, val]) => `${k} ${val}`).join(', ')}`} className="block h-auto w-full">
      <rect width={W} height={H} fill={paper.canvas} />
      <rect x="16" y="16" width={W - 32} height={H - 32} rx="20" fill={paper.card} stroke={paper.line} />
      <text x="40" y="56" fill={paper.muted} fontFamily={sans} fontSize="11" fontWeight="600" letterSpacing="1.4">
        NEXORAGURU · FIELD NOTES
      </text>
      <text x="40" y="104" fill={paper.ink} fontFamily={serif} fontSize="40">
        {name.length > 22 ? `${name.slice(0, 21)}…` : name}
      </text>
      <text x="40" y="130" fill={paper.ink2} fontFamily={mono} fontSize="13">
        @{profile.username}
      </text>
      <line x1="40" x2={W - 40} y1="156" y2="156" stroke={paper.ink} />
      {figs.map(([k, val], i) => {
        const x = 40 + i * ((W - 80) / figs.length)
        return (
          <g key={k}>
            <text x={x} y="178" fill={paper.muted} fontFamily={sans} fontSize="10" fontWeight="600" letterSpacing="1.2">
              {k.toUpperCase()}
            </text>
            <text x={x} y="206" fill={paper.ink} fontFamily={serif} fontSize="22">
              {val}
            </text>
          </g>
        )
      })}
      <g transform="translate(40 230)">
        {cells.map((cell) => (
          <rect key={`${cell.x}-${cell.y}`} x={cell.x * 9} y={cell.y * 7} width="7" height="5" rx="1" fill={mix(cell.c)} />
        ))}
      </g>
      <text x={W - 40} y="270" textAnchor="end" fill={paper.muted} fontFamily={mono} fontSize="11">
        nexoraguru.in/u/{profile.username}
      </text>
    </svg>
  )
})
