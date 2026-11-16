import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useToast, Select } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton, Toggle } from './kit'
import { ago } from './format'

/*
  Admin → Code runners. Our own Piston servers: each one is tried first, in
  this order, and each backs up the others; the free public sandboxes stay
  behind them all. Passwords are write-only, like AI keys.
*/

type Host = { id: string; name: string }
type Runner = {
  id: string
  name: string
  host: string
  url: string
  last4: string
  hasToken: boolean
  enabled: boolean
  resting: boolean
  restingFor: number
  test: { ok: boolean; at: number; ms: number; error: string | null; languages: string[]; runtimes?: number } | null
}
type RunnersState = { hosts: Host[]; max: number; envRunners: number; runners: Runner[] }

const SETUP = [
  'curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/runner/setup.sh -o setup.sh',
  'sudo bash setup.sh',
]

function CopyLine({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-bg-app px-2.5 py-1.5">
      <code className="min-w-0 flex-1 font-mono text-[12px] break-all whitespace-pre-wrap text-text-primary">{text}</code>
      <button
        type="button"
        className="ai-icon shrink-0"
        aria-label="Copy command"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setDone(true)
            setTimeout(() => setDone(false), 1200)
          })
        }}
      >
        {done ? <Check className="size-3.5 text-state-success" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

function status(r: Runner): { tone: string; text: string } {
  if (!r.enabled) return { tone: '', text: 'Off' }
  if (!r.test) return { tone: 'warning', text: 'Not tested' }
  if (!r.test.ok) return { tone: 'danger', text: r.test.error ?? 'Not working' }
  if (r.resting) return { tone: 'warning', text: `Resting ${Math.ceil(r.restingFor / 1000)} s after failures` }
  const n = r.test.runtimes ?? 0
  return { tone: 'success', text: n ? `Working · ${n} language${n === 1 ? '' : 's'}` : 'Working' }
}

export function RunnersSection() {
  const toast = useToast()
  const { data, loading, error, refetch, setData } = useApi(() => api.get<RunnersState>('/api/admin/runners'), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ host: 'oracle', name: '', url: '', token: '' })

  if (loading && !data) return <Skeleton className="h-96" />
  if (error || !data) return <Failed message={error ?? 'Could not load code runners'} onRetry={refetch} />

  const run = async <T extends RunnersState>(id: string, fn: () => Promise<T>, done?: string) => {
    setBusy(id)
    try {
      const r = await fn()
      setData(r)
      if (done) toast.success(done)
      return r
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  const add = async () => {
    const r = await run('add', () => api.post<RunnersState & { runner: Runner }>('/api/admin/runners', form))
    if (!r) return
    const added = r.runner
    if (added?.test?.ok) toast.success(`${added.name} is working`, 'Code now runs there first.')
    else toast.error(`${added?.name ?? 'Runner'} saved, but the test failed`, added?.test?.error ?? undefined)
    setAdding(false)
    setForm({ host: 'oracle', name: '', url: '', token: '' })
  }

  const working = data.runners.filter((r) => r.enabled && r.test?.ok).length + data.envRunners

  return (
    <div className="space-y-6">
      <Panel
        title="Where code runs"
        description={
          working
            ? `${working === 1 ? 'One runner of our own runs' : `${working} runners of our own run`} code first${working === 1 ? '' : ', each backing up the others'}. If ${working === 1 ? 'it is' : 'all of them are'} busy or down, the free public runners take over.`
            : 'Code runs on free public runners only (Wandbox, Compiler Explorer, Paiza.io, the Kotlin Playground). Add a runner of our own for speed and for Clojure, PowerShell, Groovy and Nim.'
        }
        icon="server"
        actions={<Chip tone={working ? 'success' : 'warning'}>{working ? `${working} own` : 'Public only'}</Chip>}
      />

      <Panel
        title="Our runners"
        description="Tried from the top. Passwords are encrypted on the server and never shown again — only their last four characters."
        icon="terminal"
        actions={
          !adding && (
            <button type="button" className="ai-btn ai-btn--main" onClick={() => setAdding(true)}>
              <Plus className="size-3.5" /> Add runner
            </button>
          )
        }
      >
        {adding && (
          <div className="ai-form">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ai-field">
                <span>Where it runs</span>
                <Select className="ai-select" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })}>
                  {data.hosts.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="ai-field">
                <span>Name (optional)</span>
                <input className="ai-input" value={form.name} placeholder="e.g. Oracle Mumbai" onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="ai-field sm:col-span-2">
                <span>Address (PISTON_URL from the setup script)</span>
                <input className="ai-input font-mono" value={form.url} placeholder="https://1-2-3-4.sslip.io" onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </label>
              <label className="ai-field sm:col-span-2">
                <span>Password (PISTON_TOKEN from the setup script)</span>
                <input className="ai-input font-mono" type="password" autoComplete="off" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" className="ai-btn ai-btn--main" disabled={busy === 'add' || !form.url.trim() || !form.token.trim()} onClick={() => void add()}>
                {busy === 'add' && <Loader2 className="size-3.5 animate-spin" />} Connect and test
              </button>
              <button type="button" className="ai-btn" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {data.envRunners > 0 && (
          <p className="m-0 mb-3 text-[13px] text-text-secondary">
            Plus {data.envRunners} set on the server (PISTON_URL), tried before these.
          </p>
        )}

        {data.runners.length === 0 && !adding ? (
          <p className="m-0 text-[13.5px] text-text-secondary">No runners yet. Set one up with the steps below, then add it here.</p>
        ) : (
          <ol className="ai-list">
            {data.runners.map((r, i) => {
              const s = status(r)
              return (
                <li key={r.id} className="ai-row">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex flex-wrap items-center gap-2 text-[14px] font-semibold text-text-primary">
                      <span className="font-mono text-[12px] text-text-muted tabular-nums">{i + 1}.</span>
                      {r.name}
                      <Chip tone={s.tone}>{s.text}</Chip>
                    </p>
                    <p className="m-0 mt-0.5 truncate font-mono text-[12px] text-text-muted">
                      {r.url} · password ····{r.last4}
                      {r.test && ` · tested ${ago(r.test.at)}`}
                      {r.test?.ok && ` · ${(r.test.ms / 1000).toFixed(1)} s`}
                    </p>
                  </div>
                  <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
                    <span className="flex items-center">
                      <button type="button" className="ai-icon" aria-label={`Move ${r.name} up`} disabled={i === 0 || !!busy} onClick={() => void run(`mv:${r.id}`, () => api.post<RunnersState>(`/api/admin/runners/${r.id}/move`, { direction: 'up' }))}>
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" className="ai-icon" aria-label={`Move ${r.name} down`} disabled={i === data.runners.length - 1 || !!busy} onClick={() => void run(`mv:${r.id}`, () => api.post<RunnersState>(`/api/admin/runners/${r.id}/move`, { direction: 'down' }))}>
                        <ArrowDown className="size-4" />
                      </button>
                    </span>
                    <button type="button" className="ai-btn" disabled={busy === `test:${r.id}`} onClick={() => void run(`test:${r.id}`, () => api.post<RunnersState>(`/api/admin/runners/${r.id}/test`), 'Tested')}>
                      {busy === `test:${r.id}` ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Test
                    </button>
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={() => {
                        const k = window.prompt(`New password for ${r.name}`)
                        if (k?.trim()) void run(`key:${r.id}`, () => api.put<RunnersState>(`/api/admin/runners/${r.id}`, { token: k.trim() }), 'Password replaced — test it again')
                      }}
                    >
                      Replace password
                    </button>
                    <Toggle checked={r.enabled} label={`Use ${r.name}`} onChange={(v) => void run(`en:${r.id}`, () => api.put<RunnersState>(`/api/admin/runners/${r.id}`, { enabled: v }), v ? 'Turned on' : 'Turned off')} />
                    <button
                      type="button"
                      className="ai-icon"
                      aria-label={`Remove ${r.name}`}
                      onClick={() => {
                        if (window.confirm(`Remove ${r.name}? Code will run on the other runners.`)) void run(`del:${r.id}`, () => api.delete<RunnersState>(`/api/admin/runners/${r.id}`), 'Removed')
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Panel>

      <Panel title="Set up a runner" description="Any Ubuntu 24.04 machine with ports 80 and 443 open. Takes 10–30 minutes." icon="code">
        <ol className={cn('m-0 list-decimal space-y-3 pl-5 text-[13.5px] text-text-secondary')}>
          <li>
            Make the machine. Oracle Cloud Always Free (Ampere, 2 OCPU / 12 GB) costs nothing; Hetzner CX22 is about €4–5 a month; AWS t3.small about $15 a
            month. Use a new machine, never the Hive worker.
          </li>
          <li className="space-y-2">
            <span>Open its terminal and run these two lines:</span>
            {SETUP.map((c) => (
              <CopyLine key={c} text={c} />
            ))}
          </li>
          <li>It prints PISTON_URL and PISTON_TOKEN at the end. Press Add runner above and paste them.</li>
        </ol>
        <p className="m-0 mt-4 text-[12.5px] text-text-muted">
          Oracle allows one free account per person; several free accounts for one person break its terms and can get all of them closed. For more capacity,
          add paid machines, or a teammate&rsquo;s own account. Full guide: docs/ops/fast-judge.md.
        </p>
      </Panel>
    </div>
  )
}
