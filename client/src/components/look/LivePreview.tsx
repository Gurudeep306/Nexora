/*
  A miniature of the real app — sidebar, header, stat cards, a card in the
  chosen style, a code block in the chosen code font, buttons, badges and
  icons — rendered with the look scoped onto its own root, so it can show a
  theme (or a hovered one) without touching the page around it.
*/
import { Icon, IconBadge } from '@/components/icon/Icon'
import type { IconSetId } from '@/theme/iconCatalog'
import { lookAttributes, type Look } from '@/theme/look'
import type { ThemeMode } from '@/theme/palettes'
import { cn } from '@/lib/utils'

const NAV = [
  { name: 'home', label: 'Home' },
  { name: 'problems', label: 'Problems' },
  { name: 'learn', label: 'Learn' },
  { name: 'gate', label: 'GATE' },
  { name: 'analytics', label: 'Stats' },
] as const

export function LivePreview({ look, mode, className }: { look: Look; mode: ThemeMode; className?: string }) {
  const attrs = lookAttributes(look, mode)
  const set = look.iconSet as IconSetId
  const style = look.iconStyle
  return (
    <div
      {...attrs}
      className={cn(
        'tc-preview relative overflow-hidden rounded-[var(--radius-sheet)] border border-border bg-bg-app text-[13px] text-text-primary shadow-[var(--elev-2)]',
        className,
      )}
      aria-label="Live preview"
      role="img"
    >
      <div className="flex min-h-[440px]">
        {/* Sidebar */}
        <aside className="hidden w-[118px] shrink-0 flex-col gap-0.5 border-r border-border bg-bg-surface p-2.5 sm:flex">
          <div className="mb-3 flex items-center gap-1.5 px-1.5 pt-0.5">
            <span className="size-4 rounded-[5px] bg-gradient-to-br from-accent-brand to-accent-brand-hover" />
            <span className="font-display text-[13px] font-semibold tracking-tight">NexoraGuru</span>
          </div>
          {NAV.map((n, i) => (
            <span
              key={n.name}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-[12px]',
                i === 1 ? 'bg-accent-brand/12 font-medium text-accent-brand' : 'text-text-secondary',
              )}
            >
              <Icon name={n.name} set={set} style={style} className="size-3.5" />
              {n.label}
            </span>
          ))}
        </aside>

        {/* Page */}
        <div className="min-w-0 flex-1 space-y-3 p-3.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="mb-0 text-[10.5px] font-semibold tracking-[0.12em] text-accent-brand uppercase">Practice</p>
              <h3 className="mb-0 truncate text-[17px] font-semibold">Good evening, Ada</h3>
            </div>
            <span className="hidden h-7 items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-bg-field px-2 text-[11px] text-text-muted min-[420px]:flex">
              <Icon name="search" set={set} style={style} className="size-3" />
              Search
            </span>
            <span className="relative flex size-7 items-center justify-center rounded-[var(--radius-control)] text-text-secondary">
              <Icon name="bell" set={set} style={style} className="size-4" />
              <span className="absolute top-1 right-1 size-1.5 rounded-full bg-state-error" />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="card flex items-center gap-2.5 p-2.5">
              <IconBadge name="flame" set={set} style={style} boxClassName="size-8" />
              <div className="min-w-0">
                <p className="mb-0 text-[16px] leading-none font-semibold tabular-nums">14</p>
                <p className="mb-0 text-[11px] text-text-muted">day streak</p>
              </div>
            </div>
            <div className="card flex items-center gap-2.5 p-2.5">
              <IconBadge name="trophy" set={set} style={style} boxClassName="size-8" />
              <div className="min-w-0">
                <p className="mb-0 text-[16px] leading-none font-semibold tabular-nums">1,482</p>
                <p className="mb-0 text-[11px] text-text-muted">rating</p>
              </div>
            </div>
          </div>

          <div className="card space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="mb-0 text-[14px] font-semibold">Two Sum</p>
                <p className="mb-0 text-[11.5px] text-text-secondary">Arrays · Hash map</p>
              </div>
              <span className="rounded-full bg-state-success/12 px-2 py-0.5 text-[10.5px] font-semibold text-state-success">Easy</span>
            </div>
            <p className="mb-0 text-[12px] leading-relaxed text-text-secondary">
              Return the indices of the two numbers that add up to the target.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-state-warning/12 px-2 py-0.5 text-[10.5px] font-semibold text-state-warning">Medium</span>
              <span className="rounded-full bg-state-info/12 px-2 py-0.5 text-[10.5px] font-semibold text-state-info">New</span>
              <span className="rounded-full bg-state-error/12 px-2 py-0.5 text-[10.5px] font-semibold text-state-error">Hard</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] bg-accent-brand px-3 text-[12px] font-semibold text-on-accent-brand">
                <Icon name="code" set={set} style={style} className="size-3.5" />
                Solve
              </span>
              <span className="inline-flex h-7 items-center rounded-[var(--radius-control)] border border-border bg-bg-surface-2 px-3 text-[12px] font-medium">
                Hint
              </span>
              <span className="ml-auto text-[11.5px] font-medium text-accent-brand">View editorial</span>
            </div>
          </div>

          <pre className="m-0 overflow-hidden rounded-[var(--radius-control)] border border-border bg-[var(--color-code-bg)] p-2.5 text-[11.5px] leading-[1.6]">
            <code>
              <span className="text-[var(--color-syntax-comment)] italic">{'// one pass, O(n)'}</span>
              {'\n'}
              <span className="text-[var(--color-syntax-keyword)]">function</span>{' '}
              <span className="text-[var(--color-syntax-function)]">twoSum</span>(nums, target) {'{'}
              {'\n  '}
              <span className="text-[var(--color-syntax-keyword)]">const</span> seen = <span className="text-[var(--color-syntax-keyword)]">new</span>{' '}
              <span className="text-[var(--color-syntax-type)]">Map</span>()
              {'\n  '}
              <span className="text-[var(--color-syntax-keyword)]">for</span> (<span className="text-[var(--color-syntax-keyword)]">let</span> i ={' '}
              <span className="text-[var(--color-syntax-number)]">0</span>; i {'<'} nums.length; i++) {'{'}
              {'\n    '}
              <span className="text-[var(--color-syntax-keyword)]">if</span> (seen.has(target - nums[i])) <span className="text-[var(--color-syntax-keyword)]">return</span>{' '}
              <span className="text-[var(--color-syntax-string)]">{"'found'"}</span>
              {'\n  }\n}'}
            </code>
          </pre>
        </div>
      </div>
    </div>
  )
}
