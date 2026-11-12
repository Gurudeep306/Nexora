import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Check, ChevronDown, FileText, GitBranch, Layers, Loader2, Paperclip, Plus, ScanSearch, Swords, User, X } from 'lucide-react'
import { Button, Popover, PopoverContent, PopoverTrigger, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { AgentChip, defaultSpec, usableProviders } from './AgentPicker'
import { useHive } from './store'
import type { AgentSpec, HiveFile, Mode } from './types'
import { MODE_INFO } from './ui'

const MODE_ICON = { solo: User, team: Layers, compare: Swords, review: ScanSearch }

/** Upload files picked or dropped into a composer. */
export function useUploads() {
  const toast = useToast()
  const [files, setFiles] = useState<(HiveFile & { uploading?: boolean })[]>([])
  const add = async (list: FileList | File[]) => {
    for (const f of Array.from(list).slice(0, 12)) {
      const temp = { id: `tmp-${f.name}-${Date.now()}`, name: f.name, mime: f.type, size: f.size, uploading: true }
      setFiles((x) => [...x, temp])
      try {
        const r = await hiveApi.upload(f)
        setFiles((x) => x.map((y) => (y.id === temp.id ? r.file : y)))
      } catch (e) {
        setFiles((x) => x.filter((y) => y.id !== temp.id))
        toast.error(e instanceof Error ? e.message : 'Upload failed')
      }
    }
  }
  return { files, setFiles, add, remove: (id: string) => setFiles((x) => x.filter((y) => y.id !== id)), busy: files.some((f) => f.uploading) }
}

export function FileChips({ files, onRemove }: { files: (HiveFile & { uploading?: boolean })[]; onRemove?: (id: string) => void }) {
  if (!files.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((f) => (
        <span key={f.id} className="inline-flex max-w-56 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] py-1 pl-2 pr-1 text-[12px] text-text-secondary">
          {f.uploading ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5 text-text-muted" />}
          <span className="truncate">{f.name}</span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(f.id)} className="grid size-4 place-items-center rounded text-text-muted hover:text-text-primary" aria-label={`Remove ${f.name}`}>
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

export function Composer({ projectId: forcedProject, autoFocus, placeholder }: { projectId?: string | null; autoFocus?: boolean; placeholder?: string }) {
  const { boot, project: current, select, emitTyping } = useHive()
  const toast = useToast()
  const [projectId, setProjectId] = useState<string | null>(forcedProject ?? current?.id ?? null)
  const project = boot?.projects.find((p) => p.id === projectId) ?? null
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<Mode>('solo')
  const [agents, setAgents] = useState<AgentSpec[]>([])
  const [lead, setLead] = useState<AgentSpec | null>(null)
  const [baseRef, setBaseRef] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [budget, setBudget] = useState('')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const up = useUploads()
  const ta = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const providers = useMemo(() => (boot ? usableProviders(boot, 'tools') : []), [boot])

  useEffect(() => {
    if (forcedProject !== undefined) setProjectId(forcedProject)
    else if (!projectId && boot?.projects[0]) setProjectId(boot.projects[0].id)
  }, [forcedProject, boot, projectId])

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
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 76), 300)}px`
  }, [prompt])

  if (!boot) return null
  const noKeys = providers.length === 0

  const applyMode = (m: Mode) => {
    setMode(m)
    if (m === 'compare' && agents.length < 2) {
      const specs = providers.slice(0, 3).map((p) => defaultSpec(boot, p)!).filter(Boolean)
      setAgents(specs.length >= 2 ? specs : ([agents[0], agents[0]].filter(Boolean) as AgentSpec[]))
    }
    if (m === 'team' && agents.length < 2 && agents[0]) setAgents([{ ...agents[0], name: 'builder' }, { ...agents[0], name: 'tester' }])
  }

  const submit = async () => {
    if (!prompt.trim() || busy || !project || up.busy) return
    setBusy(true)
    try {
      const r = await hiveApi.createTask(project.id, {
        prompt: prompt.trim(),
        mode,
        agents,
        lead: mode === 'team' ? lead : null,
        baseRef: baseRef || undefined,
        attachments: up.files.map((f) => f.id),
        budgetTokens: budget ? Number(budget.replace(/[^\d.]/g, '')) * (/m/i.test(budget) ? 1e6 : /k/i.test(budget) ? 1e3 : 1) : null,
      })
      setPrompt('')
      up.setFiles([])
      select(project.id, r.task.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start the task')
    } finally {
      setBusy(false)
    }
  }

  const ModeIcon = MODE_ICON[mode]

  return (
    <div
      className={cn('hive-composer rounded-[22px] transition-shadow', drag && 'ring-2 ring-accent-brand/50')}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        if (e.dataTransfer.files.length) up.add(e.dataTransfer.files)
      }}
    >
      {up.files.length > 0 && (
        <div className="px-4 pt-3">
          <FileChips files={up.files} onRemove={up.remove} />
        </div>
      )}
      <textarea
        ref={ta}
        value={prompt}
        autoFocus={autoFocus}
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
        onPaste={(e) => {
          if (e.clipboardData.files.length) up.add(e.clipboardData.files)
        }}
        placeholder={placeholder ?? (noKeys ? 'Add an AI key to start…' : mode === 'review' ? 'What should the reviewers check?' : 'Describe what you want built…')}
        className="block w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15.5px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted/70"
        disabled={noKeys}
      />
      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => e.target.files && up.add(e.target.files)} />
        <button type="button" onClick={() => fileInput.current?.click()} className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Attach files" title="Attach files (images, PDFs, docs, code)">
          <Paperclip className="size-4" />
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium text-text-secondary hover:bg-text-primary/[0.06]">
              <ModeIcon className="size-3.5" /> {MODE_INFO[mode].label} <ChevronDown className="size-3 text-text-muted" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-1.5">
            {(Object.keys(MODE_INFO) as Mode[]).map((m) => {
              const Icon = MODE_ICON[m]
              return (
                <button key={m} type="button" onClick={() => applyMode(m)} className={cn('flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left', mode === m ? 'bg-accent-brand/10' : 'hover:bg-text-primary/5')}>
                  <Icon className="mt-0.5 size-4 shrink-0 text-text-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-text-primary">{MODE_INFO[m].label}</span>
                    <span className="block text-[12px] leading-snug text-text-muted">{MODE_INFO[m].hint}</span>
                  </span>
                  {mode === m && <Check className="mt-0.5 size-4 text-accent-brand" />}
                </button>
              )
            })}
          </PopoverContent>
        </Popover>

        <span className="mx-0.5 h-5 w-px bg-text-primary/10" />

        {mode === 'team' && lead && <AgentChip boot={boot} spec={lead} onChange={setLead} label="Lead" compact />}
        {agents.map((a, i) => (
          <AgentChip key={i} boot={boot} spec={a} compact onChange={(s) => setAgents((l) => l.map((x, j) => (j === i ? s : x)))} onRemove={agents.length > 1 ? () => setAgents((l) => l.filter((_, j) => j !== i)) : undefined} />
        ))}
        {agents.length < 8 && !noKeys && (
          <button
            type="button"
            onClick={() => {
              const d = defaultSpec(boot, providers[agents.length % providers.length])
              if (d) setAgents((l) => [...l, d])
            }}
            className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary"
            aria-label="Add another agent"
            title={mode === 'solo' ? 'Add an agent — they share the work on one copy' : 'Add an agent'}
          >
            <Plus className="size-4" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          {forcedProject === undefined && boot.projects.length > 1 && (
            <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value)} className="h-8 max-w-36 truncate rounded-full bg-transparent px-2 text-[12px] text-text-muted outline-none hover:bg-text-primary/[0.06]" aria-label="Project">
              {boot.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {project && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] text-text-muted hover:bg-text-primary/[0.06]" title="Base branch and budget">
                  <GitBranch className="size-3.5" /> {baseRef || project.default_branch}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <div className="mb-1.5 text-[11px] font-medium text-text-muted">Start from branch</div>
                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                  {(branches.length ? branches : [project.default_branch]).map((b) => (
                    <button key={b} type="button" onClick={() => setBaseRef(b)} className={cn('flex w-full items-center rounded-md px-2 py-1.5 font-mono text-[12px]', baseRef === b ? 'bg-accent-brand/10 text-text-primary' : 'text-text-secondary hover:bg-text-primary/5')}>
                      {b}
                    </button>
                  ))}
                </div>
                <div className="mb-1.5 mt-3 text-[11px] font-medium text-text-muted">Token budget for this task</div>
                <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="No cap — e.g. 500k or 2M" className="h-8 w-full rounded-md bg-text-primary/5 px-2 text-[12px] outline-none" />
              </PopoverContent>
            </Popover>
          )}
          <Button size="icon" variant="accent" onClick={submit} loading={busy} disabled={!prompt.trim() || noKeys || !project || up.busy || agents.some((a) => !a.model)} aria-label="Start (⌘↵)" className="ml-1 size-9 rounded-full">
            {!busy && <ArrowUp className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
