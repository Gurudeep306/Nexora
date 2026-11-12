import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Crown, GitBranch, Layers, Plus, ScanSearch, Swords, User, Wand2 } from 'lucide-react'
import { Button, Kbd, Select, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { AgentChip, defaultSpec, usableProviders } from './AgentPicker'
import { useHive } from './store'
import type { AgentSpec, Mode } from './types'
import { MODE_INFO } from './ui'

const MODE_ICON = { solo: User, team: Layers, compare: Swords, review: ScanSearch }

const PROMPT_IDEAS = [
  'Add input validation and clear error messages to every API route',
  'Find and fix the bugs in the auth flow, then add regression tests',
  'Refactor the largest file into smaller modules without changing behaviour',
  'Write a README section explaining how to run and deploy the project',
]

export function Composer({ hero }: { hero?: boolean }) {
  const { boot, project, select, emitTyping } = useHive()
  const toast = useToast()
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<Mode>('solo')
  const [agents, setAgents] = useState<AgentSpec[]>([])
  const [lead, setLead] = useState<AgentSpec | null>(null)
  const [baseRef, setBaseRef] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)

  const providers = useMemo(() => (boot ? usableProviders(boot) : []), [boot])

  // Sensible starting agents once keys are known.
  useEffect(() => {
    if (!boot || agents.length) return
    const d = defaultSpec(boot)
    if (d) {
      setAgents([d])
      setLead(d)
    }
  }, [boot, agents.length])

  useEffect(() => {
    if (!project) return
    setBaseRef(project.default_branch)
    hiveApi
      .branches(project.id)
      .then((r) => setBranches(r.branches.map((b) => b.name)))
      .catch(() => setBranches([]))
  }, [project])

  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, hero ? 320 : 220)}px`
  }, [prompt, hero])

  if (!boot || !project) return null
  const noKeys = providers.length === 0

  const applyMode = (m: Mode) => {
    setMode(m)
    if (m === 'solo') setAgents((a) => a.slice(0, 1))
    if (m === 'compare' && agents.length < 2) {
      // One per provider makes the most interesting shootout.
      const specs = providers.map((p) => defaultSpec(boot, p)!).filter(Boolean)
      setAgents(specs.length >= 2 ? specs.slice(0, 4) : [agents[0], agents[0]].filter(Boolean) as AgentSpec[])
    }
    if (m === 'team' && agents.length < 2 && agents[0]) setAgents([{ ...agents[0], name: 'builder' }, { ...agents[0], name: 'tester' }])
  }

  const submit = async () => {
    if (!prompt.trim() || busy) return
    setBusy(true)
    try {
      const r = await hiveApi.createTask(project.id, { prompt: prompt.trim(), mode, agents, lead: mode === 'team' ? lead : null, baseRef: baseRef || undefined })
      setPrompt('')
      select(project.id, r.task.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start the task')
    } finally {
      setBusy(false)
    }
  }

  const maxAgents = mode === 'solo' ? 1 : 6
  const showLead = mode === 'team'

  return (
    <div className={cn('w-full', hero ? 'mx-auto max-w-3xl' : '')}>
      <div className="hive-glass overflow-hidden rounded-2xl border border-border shadow-[var(--elev-2)] focus-within:border-accent-brand/50">
        {/* Mode switch */}
        <div className="flex flex-wrap items-center gap-1 border-b border-border/70 px-2 py-1.5">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => {
            const Icon = MODE_ICON[m]
            return (
              <Tooltip key={m} label={MODE_INFO[m].hint} side="bottom">
                <button
                  type="button"
                  onClick={() => applyMode(m)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
                    mode === m ? 'bg-accent-brand/12 text-accent-brand' : 'text-text-muted hover:bg-text-primary/5 hover:text-text-secondary',
                  )}
                >
                  <Icon className="size-3.5" />
                  {MODE_INFO[m].label}
                </button>
              </Tooltip>
            )
          })}
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-text-muted">
            <GitBranch className="size-3.5" />
            <Select value={baseRef} onValueChange={setBaseRef} className="h-7 w-auto min-w-28 border-0 bg-transparent text-[11px]" aria-label="Base branch">
              {(branches.length ? branches : [project.default_branch]).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <textarea
          ref={ta}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            emitTyping()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
          rows={hero ? 4 : 2}
          placeholder={
            mode === 'review'
              ? 'What should the reviewers look at? e.g. “Audit the payment flow for security bugs”'
              : mode === 'team'
                ? 'Describe the feature — the lead will split it across the team…'
                : mode === 'compare'
                  ? 'Describe the task — every agent attempts it and you pick the winner…'
                  : `What should Hive build in ${project.repo_owner}/${project.repo_name}?`
          }
          className="block w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[15px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted/70"
          disabled={noKeys}
        />

        {/* Agents */}
        <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
          {showLead && lead && <AgentChip boot={boot} spec={lead} onChange={setLead} label="Lead" accent />}
          {showLead && <span className="text-[11px] text-text-muted">delegates to</span>}
          {agents.map((a, i) => (
            <AgentChip
              key={i}
              boot={boot}
              spec={a}
              onChange={(s) => setAgents((list) => list.map((x, j) => (j === i ? s : x)))}
              onRemove={agents.length > 1 ? () => setAgents((list) => list.filter((_, j) => j !== i)) : undefined}
            />
          ))}
          {agents.length < maxAgents && !noKeys && (
            <button
              type="button"
              onClick={() => {
                // Round-robin providers when adding, so mixes are one click.
                const next = providers[agents.length % providers.length]
                const d = defaultSpec(boot, next)
                if (d) setAgents((list) => [...list, d])
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-border px-3 text-xs text-text-muted hover:border-border-strong hover:text-text-primary"
            >
              <Plus className="size-3.5" /> Agent
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[11px] text-text-muted sm:inline">
              <Kbd>⌘</Kbd> <Kbd>↵</Kbd>
            </span>
            <Button size="icon" variant="accent" onClick={submit} loading={busy} disabled={!prompt.trim() || noKeys || agents.some((a) => !a.model)} aria-label="Start task" className="rounded-xl">
              {!busy && <ArrowUp />}
            </Button>
          </div>
        </div>
      </div>

      {noKeys && <p className="mt-2 text-center text-xs text-state-warning">Add an AI key in the Key vault to start a task.</p>}

      {hero && !noKeys && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROMPT_IDEAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrompt(p)}
              className="flex items-start gap-2 rounded-xl border border-border bg-bg-surface/60 px-3 py-2.5 text-left text-xs leading-snug text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
            >
              <Wand2 className="mt-px size-3.5 shrink-0 text-accent-brand" />
              {p}
            </button>
          ))}
        </div>
      )}
      {hero && mode === 'team' && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <Crown className="size-3 text-accent-brand" /> The lead splits work by file ownership so agents don&apos;t collide; everyone shares one live working copy.
        </p>
      )}
    </div>
  )
}
