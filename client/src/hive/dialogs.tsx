import { useEffect, useMemo, useState } from 'react'
import { Check, FolderGit2, Lock, Search, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { PROJECT_COLORS } from './projectColor'
import { useHive } from './store'
import type { HiveKey, Project } from './types'
import { ProviderGlyph, timeAgo } from './ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

const Field = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-text-secondary">
    {label}
    {children}
    {hint && <span className="text-[11.5px] font-normal text-text-muted">{hint}</span>}
  </label>
)

export function parseLimit(s: string): number | null {
  const t = s.trim().replace(/[,_\s]/g, '')
  if (!t) return null
  const m = /^([\d.]+)([kKmMbB]?)$/.exec(t)
  if (!m) return Number.NaN
  return Math.round(Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase() as 'k' | 'm' | 'b'] ?? 1))
}

const PERIODS = [
  { id: 'day', label: 'per day' },
  { id: 'month', label: 'per month' },
  { id: 'total', label: 'in total' },
]

export function AddKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [provider, setProvider] = useState('anthropic')
  const [q, setQ] = useState('')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [limit, setLimit] = useState('')
  const [period, setPeriod] = useState('month')
  const [conc, setConc] = useState('4')
  const [busy, setBusy] = useState(false)
  const vendors = boot?.catalogue.providers ?? []
  const info = vendors.find((v) => v.id === provider)
  const shown = vendors.filter((v) => `${v.label} ${v.vendor}`.toLowerCase().includes(q.toLowerCase()))
  const parsed = parseLimit(limit)

  useEffect(() => {
    if (open) {
      setLabel('')
      setApiKey('')
      setBaseUrl('')
      setLimit('')
      setQ('')
    }
  }, [open])

  const submit = async () => {
    setBusy(true)
    try {
      const r = await hiveApi.addKey({ provider, label: label || `${info?.label} · ${boot?.me.username}`, apiKey, baseUrl: baseUrl || undefined, tokenLimit: parsed, limitPeriod: period, maxConcurrency: Number(conc) || 4 })
      if (r.check.ok) toast.success(`${info?.label} key added`)
      else toast.warning('Key saved, but the check failed', r.check.error)
      await refresh()
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add an AI key" description="Add as many accounts per provider as you like. Everyone on staff shares them; set a budget so no one burns through one." size="lg">
      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-2 flex h-9 items-center gap-2 rounded-lg bg-text-primary/5 px-3">
            <Search className="size-3.5 text-text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-muted" />
          </label>
          <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
            {shown.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setProvider(v.id)
                  setBaseUrl(v.baseUrlRequired ? '' : '')
                }}
                className={cn('flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors', provider === v.id ? 'bg-accent-brand/10 ring-1 ring-accent-brand/40' : 'hover:bg-text-primary/5')}
              >
                <ProviderGlyph provider={v.id} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium text-text-primary">{v.label}</span>
                  <span className="block truncate text-[10.5px] text-text-muted">{[v.caps.tools ? 'agents' : 'chat', v.caps.vision && 'vision', v.caps.images && 'images'].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`${info?.label ?? ''} · team`} maxLength={60} />
          </Field>
          <Field
            label="API key"
            hint={
              info?.docs ? (
                <a href={info.docs} target="_blank" rel="noreferrer" className="text-accent-brand hover:underline">
                  Get a {info.vendor} key ↗
                </a>
              ) : undefined
            }
          >
            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={info?.keyHint} type="password" autoComplete="off" spellCheck={false} className="font-mono" />
          </Field>
        </div>
        {(info?.baseUrlRequired || baseUrl) && (
          <Field label="Base URL" hint="Any OpenAI-compatible endpoint, e.g. a self-hosted model.">
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" className="font-mono" />
          </Field>
        )}
        {!info?.baseUrlRequired && !baseUrl && (
          <button type="button" onClick={() => setBaseUrl(info?.baseUrl ?? 'https://')} className="-mt-2 self-start text-[12px] text-text-muted hover:text-text-primary">
            Use a different endpoint (proxy, region)…
          </button>
        )}
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Token budget" hint={Number.isNaN(parsed) ? <span className="text-state-error">Use a number like 2500000 or 2.5M</span> : 'Leave empty for no limit'}>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="e.g. 5M" />
          </Field>
          <Field label="Period">
            <Select value={period} onValueChange={setPeriod} className="w-32">
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Agents at once">
            <Select value={conc} onValueChange={setConc} className="w-28">
              {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={apiKey.trim().length < 8 || (info?.baseUrlRequired && !baseUrl) || Number.isNaN(parsed)}>
            Add & verify
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function EditKeyDialog({ k, open, onClose }: { k: HiveKey; open: boolean; onClose: () => void }) {
  const { refresh } = useHive()
  const toast = useToast()
  const [label, setLabel] = useState(k.label)
  const [limit, setLimit] = useState(k.tokenLimit == null ? '' : String(k.tokenLimit))
  const [period, setPeriod] = useState<string>(k.limitPeriod)
  const [conc, setConc] = useState(String(k.maxConcurrency))
  const [model, setModel] = useState(k.defaultModel ?? '')
  const [priority, setPriority] = useState(String(k.priority ?? 0))
  const [rotate, setRotate] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setLabel(k.label)
    setLimit(k.tokenLimit == null ? '' : String(k.tokenLimit))
    setPeriod(k.limitPeriod)
    setConc(String(k.maxConcurrency))
    setModel(k.defaultModel ?? '')
    setPriority(String(k.priority ?? 0))
    setRotate('')
  }, [open, k])
  const parsed = parseLimit(limit)
  const save = async () => {
    setBusy(true)
    try {
      await hiveApi.updateKey(k.id, { label, tokenLimit: parsed, limitPeriod: period, maxConcurrency: Number(conc), defaultModel: model || null, priority: Number(priority), ...(rotate ? { apiKey: rotate } : {}) })
      toast.success('Key updated')
      await refresh()
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={k.label} description="Budget, default model and how this key is chosen." size="md">
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
        </Field>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Token budget" hint={Number.isNaN(parsed) ? <span className="text-state-error">Use a number like 2.5M</span> : undefined}>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="No limit" />
          </Field>
          <Field label="Period">
            <Select value={period} onValueChange={setPeriod} className="w-32">
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Default model">
            <Select value={model} onValueChange={setModel} placeholder="Choose">
              {k.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Agents at once">
            <Select value={conc} onValueChange={setConc}>
              {[1, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" hint="Higher is used first">
            <Select value={priority} onValueChange={setPriority}>
              {['-10', '-5', '0', '5', '10'].map((n) => (
                <option key={n} value={n}>
                  {n === '0' ? 'Normal' : Number(n) > 0 ? `+${n}` : n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Rotate key (optional)">
          <Input value={rotate} onChange={(e) => setRotate(e.target.value)} type="password" placeholder="Paste a new key to replace this one" autoComplete="off" className="font-mono" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={Number.isNaN(parsed) || !label.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function AddGithubDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refresh } = useHive()
  const toast = useToast()
  const [token, setToken] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Connect GitHub" description="One token and every repository you can reach is available in Hive (Your GitHub). The quickest: a classic token, pre-filled — pick an expiry and press Generate." size="md">
      <div className="flex flex-col gap-4">
        <Field
          label="Token"
          hint={
            <span className="flex flex-wrap gap-x-3">
              <a href="https://github.com/settings/tokens/new?scopes=repo,workflow,read:org&description=Nexora%20Hive" target="_blank" rel="noreferrer" className="text-accent-brand hover:underline">
                Create a token, pre-filled (all repos) ↗
              </a>
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer" className="text-text-muted hover:underline">
                or a fine-grained one (chosen repos) ↗
              </a>
            </span>
          }
        >
          <Input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="ghp_… or github_pat_…" autoComplete="off" className="font-mono" />
        </Field>
        <Field label="Name (optional)">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Org bot" maxLength={60} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={token.trim().length < 10}
            onClick={async () => {
              setBusy(true)
              try {
                const r = await hiveApi.addGithub({ token: token.trim(), label: label || undefined })
                toast.success(`Connected as @${r.login}`)
                setToken('')
                await refresh()
                onClose()
              } catch (e) {
                toast.error(errMsg(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Connect
          </Button>
        </div>
      </div>
    </Modal>
  )
}

type Repo = { owner: string; name: string; fullName: string; private: boolean; defaultBranch: string; description: string | null; pushedAt: string }

export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot, select, refresh } = useHive()
  const toast = useToast()
  const [githubId, setGithubId] = useState('')
  const [repos, setRepos] = useState<Repo[] | null>(null)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [instructions, setInstructions] = useState('')
  const [color, setColor] = useState('violet')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open && boot?.github[0] && !githubId) setGithubId(boot.github[0].id)
  }, [open, boot, githubId])
  useEffect(() => {
    if (!open || !githubId) return
    setRepos(null)
    hiveApi
      .repos(githubId)
      .then((r) => setRepos(r.repos))
      .catch((e) => {
        setRepos([])
        toast.error(errMsg(e))
      })
  }, [open, githubId, toast])

  const list = useMemo(() => (repos ?? []).filter((r) => r.fullName.toLowerCase().includes(q.toLowerCase())).slice(0, 60), [repos, q])
  const target = picked ?? (manual.includes('/') ? manual.trim() : null)

  const create = async () => {
    if (!target) return
    const [owner, repo] = target.split('/')
    setBusy(true)
    try {
      const r = await hiveApi.createProject({ githubId, owner, repo, instructions, color })
      await refresh()
      select(r.project.id)
      toast.success(`${r.project.name} is ready`)
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New project" description="Point Hive at a GitHub repository. Every staff member and agent shares it." size="lg">
      {!boot?.github.length ? (
        <p className="py-6 text-center text-[13px] text-text-muted">Connect GitHub first (Keys → GitHub).</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {boot.github.length > 1 && (
              <Select value={githubId} onValueChange={setGithubId} className="w-56">
                {boot.github.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </Select>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {Object.keys(PROJECT_COLORS).map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={cn('hive-hex size-5 transition-transform', color === c && 'scale-125')} style={{ background: PROJECT_COLORS[c] }} />
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl bg-text-primary/[0.03]">
            <label className="flex h-10 items-center gap-2 px-3">
              <Search className="size-4 text-text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your repositories" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-text-muted" autoFocus />
            </label>
            <div className="hive-scroll max-h-64 overflow-y-auto p-1">
              {repos === null
                ? Array.from({ length: 4 }, (_, i) => <div key={i} className="hive-shimmer m-1 h-10 rounded-lg" />)
                : list.map((r) => (
                    <button key={r.fullName} type="button" onClick={() => setPicked(r.fullName === picked ? null : r.fullName)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', picked === r.fullName ? 'bg-accent-brand/10' : 'hover:bg-text-primary/5')}>
                      <FolderGit2 className="size-4 shrink-0 text-text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[13.5px] text-text-primary">
                          {r.fullName} {r.private && <Lock className="size-3 text-text-muted" />}
                        </span>
                        {r.description && <span className="block truncate text-[12px] text-text-muted">{r.description}</span>}
                      </span>
                      <span className="text-[11px] text-text-muted">{timeAgo(Date.parse(r.pushedAt))}</span>
                      {picked === r.fullName && <Check className="size-4 text-accent-brand" />}
                    </button>
                  ))}
            </div>
          </div>
          {!picked && (
            <Field label="…or type owner/repo">
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="acme/web-app" className="font-mono" />
            </Field>
          )}
          <Field label="Instructions for every agent (optional)" hint="Conventions, architecture notes, things never to touch — like a CLAUDE.md.">
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={create} loading={busy} disabled={!target}>
              Create project
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function ProjectSettingsDialog({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const { boot, refresh, select } = useHive()
  const toast = useToast()
  const [name, setName] = useState(project.name)
  const [instructions, setInstructions] = useState(project.instructions)
  const [branch, setBranch] = useState(project.default_branch)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (open) {
      setName(project.name)
      setInstructions(project.instructions)
      setBranch(project.default_branch)
    }
  }, [open, project])
  const canDelete = boot?.me.admin || boot?.me.username === project.created_by
  return (
    <Modal open={open} onClose={onClose} title="Project settings" description={`${project.repo_owner}/${project.repo_name}`} size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Default base branch">
            <Input value={branch} onChange={(e) => setBranch(e.target.value)} className="font-mono" />
          </Field>
        </div>
        <Field label="Instructions for every agent">
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={8} className="font-mono text-xs" />
        </Field>
        <div className="flex items-center gap-2">
          {canDelete && (
            <Button variant="ghost" className="text-state-error" onClick={() => setConfirm(true)}>
              <Trash2 /> Delete project
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await hiveApi.updateProject(project.id, { name, instructions, branch })
                await refresh()
                onClose()
              } catch (e) {
                toast.error(errMsg(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete project?"
        message="Its tasks, transcripts and uncommitted changes are deleted for everyone. Commits and PRs on GitHub are not touched."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          try {
            await hiveApi.deleteProject(project.id)
            await refresh()
            select(null)
            onClose()
          } catch (e) {
            toast.error(errMsg(e))
          }
        }}
      />
    </Modal>
  )
}
