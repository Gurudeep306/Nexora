import { useMemo, useState } from 'react'
import { ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useToast, Select } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton, Toggle } from './kit'
import { ago } from './format'

/*
  Admin → AI models. Research notes (Open WebUI, LibreChat, LiteLLM):
  providers are "connections" (base URL + key, tested on save, models listed
  from the provider); a default model and a fast/task model; optional
  per-feature overrides; a fallback; and a usage budget. Keys are write-only.
*/

type Preset = { kind: string; name: string; baseUrl: string; keyUrl: string; free: boolean }
type Provider = {
  id: string
  kind: string
  name: string
  baseUrl: string
  last4: string
  hasKey: boolean
  enabled: boolean
  models: string[]
  test: { ok: boolean; at: number; ms: number; error: string | null } | null
}
type Pick = { provider: string; model: string } | null | undefined
type AiState = {
  presets: Preset[]
  features: { id: string; name: string; hint: string }[]
  providers: Provider[]
  slots: Record<string, Pick>
  assignments: Record<string, Pick>
  budget: { dailyTokens: number | null }
  env: { configured: boolean; models: { main: string; fast: string; fallback: string } }
  active: 'admin' | 'env' | 'none'
}

const SLOTS = [
  { id: 'main', name: 'Main model', hint: 'Used everywhere unless a feature picks its own.' },
  { id: 'fast', name: 'Fast model', hint: 'Quick tasks: completions, short checks.' },
  { id: 'fallback', name: 'Fallback', hint: 'Tried once if the main model fails (same provider).' },
]

const key = (p: Pick) => (p ? `${p.provider}::${p.model}` : '')

function ModelSelect({ value, providers, onChange, allowNone, noneLabel, label }: { value: Pick; providers: Provider[]; onChange: (p: Pick) => void; allowNone?: boolean; noneLabel?: string; label: string }) {
  const usable = providers.filter((p) => p.enabled && p.models.length)
  return (
    <Select
      className="ai-select"
      aria-label={label}
      value={key(value)}
      onChange={(e) => {
        const v = e.target.value
        if (!v) return onChange(null)
        const [provider, ...rest] = v.split('::')
        onChange({ provider, model: rest.join('::') })
      }}
    >
      {allowNone && <option value="">{noneLabel ?? 'Not set'}</option>}
      {!allowNone && !value && <option value="">Choose a model…</option>}
      {usable.map((p) => (
        <optgroup key={p.id} label={p.name}>
          {p.models.map((m) => (
            <option key={m} value={`${p.id}::${m}`}>
              {m}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  )
}

export function AiSection() {
  const toast = useToast()
  const { data, loading, error, refetch, setData } = useApi(() => api.get<AiState>('/api/admin/ai'), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ kind: 'groq', name: '', baseUrl: '', apiKey: '' })
  const [tries, setTries] = useState<Record<string, { ok: boolean; ms: number; reply?: string; error?: string | null }>>({})
  const [budget, setBudget] = useState<string | null>(null)

  const preset = useMemo(() => data?.presets.find((p) => p.kind === form.kind), [data, form.kind])

  if (loading && !data) return <Skeleton className="h-96" />
  if (error || !data) return <Failed message={error ?? 'Could not load AI settings'} onRetry={refetch} />

  const run = async (id: string, fn: () => Promise<AiState & { test?: Provider['test'] }>, done?: string) => {
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

  const addProvider = async () => {
    const r = await run('add', () => api.post<AiState & { provider: Provider }>('/api/admin/ai/providers', form))
    if (!r) return
    const p = (r as AiState & { provider: Provider }).provider
    if (p?.test?.ok) toast.success(`${p.name} connected`, `${p.models.length} models found`)
    else toast.error(`${p?.name ?? 'Provider'} saved, but the test failed`, p?.test?.error ?? undefined)
    setAdding(false)
    setForm({ kind: 'groq', name: '', baseUrl: '', apiKey: '' })
  }

  const assign = (body: Record<string, unknown>, done = 'Saved') => run('assign', () => api.put<AiState>('/api/admin/ai/assignments', body), done)

  const tryModel = async (p: Pick) => {
    if (!p) return
    setBusy(`try:${key(p)}`)
    try {
      const r = await api.post<{ result: { ok: boolean; ms: number; reply?: string; error?: string | null } }>(`/api/admin/ai/providers/${p.provider}/try`, { model: p.model })
      setTries((t) => ({ ...t, [key(p)]: r.result }))
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Test failed')
    } finally {
      setBusy(null)
    }
  }

  const TryButton = ({ p }: { p: Pick }) => {
    if (!p) return null
    const t = tries[key(p)]
    return (
      <span className="flex items-center gap-2">
        <button type="button" className="ai-btn" disabled={busy === `try:${key(p)}`} onClick={() => void tryModel(p)}>
          {busy === `try:${key(p)}` ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Test
        </button>
        {t && (
          <span className={cn('text-[12px]', t.ok ? 'text-state-success' : 'text-state-error')}>
            {t.ok ? `Answered in ${(t.ms / 1000).toFixed(1)} s` : t.error}
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <Panel
        title="Which AI the site uses"
        description={
          data.active === 'admin'
            ? 'Using the providers and models chosen below.'
            : data.active === 'env'
              ? `Using the server's GROQ_API_KEY (${data.env.models.main}). Add a provider below to choose models here instead.`
              : 'AI is off: no provider is set. Add one below.'
        }
        icon="sparkles"
        actions={<Chip tone={data.active === 'none' ? 'warning' : 'success'}>{data.active === 'admin' ? 'Admin choice' : data.active === 'env' ? 'Environment' : 'Off'}</Chip>}
      />

      {/* Providers */}
      <Panel
        title="Providers"
        description="Any OpenAI-compatible service. Keys are encrypted on the server and never shown again — only their last four characters."
        icon="key"
        actions={
          !adding && (
            <button type="button" className="ai-btn ai-btn--main" onClick={() => setAdding(true)}>
              <Plus className="size-3.5" /> Add provider
            </button>
          )
        }
      >
        {adding && (
          <div className="ai-form">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ai-field">
                <span>Provider</span>
                <Select className="ai-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, baseUrl: '' })}>
                  {data.presets.map((p) => (
                    <option key={p.kind} value={p.kind}>
                      {p.name}
                      {p.free ? ' — free tier' : ''}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="ai-field">
                <span>Name (optional)</span>
                <input className="ai-input" value={form.name} placeholder={preset?.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="ai-field sm:col-span-2">
                <span>Base URL</span>
                <input className="ai-input font-mono" value={form.baseUrl} placeholder={preset?.baseUrl || 'https://…/v1'} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
              </label>
              <label className="ai-field sm:col-span-2">
                <span className="flex items-center justify-between">
                  API key
                  {preset?.keyUrl && (
                    <a href={preset.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-accent-brand">
                      Get a key <ExternalLink className="size-3" />
                    </a>
                  )}
                </span>
                <input className="ai-input font-mono" type="password" autoComplete="off" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" className="ai-btn ai-btn--main" disabled={busy === 'add' || !form.apiKey.trim()} onClick={() => void addProvider()}>
                {busy === 'add' && <Loader2 className="size-3.5 animate-spin" />} Connect and test
              </button>
              <button type="button" className="ai-btn" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {data.providers.length === 0 && !adding ? (
          <p className="m-0 text-[13.5px] text-text-secondary">No providers yet. Groq, Gemini, OpenRouter, Cerebras and Mistral all have free tiers.</p>
        ) : (
          <ul className="ai-list">
            {data.providers.map((p) => (
              <li key={p.id} className="ai-row">
                <div className="min-w-0 flex-1">
                  <p className="m-0 flex flex-wrap items-center gap-2 text-[14px] font-semibold text-text-primary">
                    {p.name}
                    {p.test ? (
                      <Chip tone={p.test.ok ? 'success' : 'danger'}>{p.test.ok ? `${p.models.length} models` : p.test.error ?? 'Failed'}</Chip>
                    ) : (
                      <Chip>Not tested</Chip>
                    )}
                  </p>
                  <p className="m-0 mt-0.5 truncate font-mono text-[12px] text-text-muted">
                    {p.baseUrl} · key ····{p.last4}
                    {p.test && ` · tested ${ago(p.test.at)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" className="ai-btn" disabled={busy === `test:${p.id}`} onClick={() => void run(`test:${p.id}`, () => api.post(`/api/admin/ai/providers/${p.id}/test`), 'Tested')}>
                    {busy === `test:${p.id}` ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Test
                  </button>
                  <button
                    type="button"
                    className="ai-btn"
                    onClick={() => {
                      const k = window.prompt(`New API key for ${p.name}`)
                      if (k?.trim()) void run(`key:${p.id}`, () => api.put(`/api/admin/ai/providers/${p.id}`, { apiKey: k.trim() }), 'Key replaced — test it again')
                    }}
                  >
                    Replace key
                  </button>
                  <Toggle checked={p.enabled} label={`Use ${p.name}`} onChange={(v) => void run(`en:${p.id}`, () => api.put(`/api/admin/ai/providers/${p.id}`, { enabled: v }), v ? 'Enabled' : 'Disabled')} />
                  <button
                    type="button"
                    className="ai-icon"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => {
                      if (window.confirm(`Remove ${p.name}? Anything using its models falls back to the main model.`)) void run(`del:${p.id}`, () => api.delete(`/api/admin/ai/providers/${p.id}`), 'Removed')
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Models */}
      <Panel title="Models" description="Pick the model for each job. Test sends one tiny request so you know it answers." icon="cpu">
        <ul className="ai-list">
          {SLOTS.map((s) => (
            <li key={s.id} className="ai-row">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-semibold text-text-primary">{s.name}</p>
                <p className="m-0 text-[12.5px] text-text-muted">{s.hint}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ModelSelect label={`Model for ${s.name}`} value={data.slots[s.id]} providers={data.providers} allowNone noneLabel={data.env.configured ? `Environment: ${data.env.models[s.id as 'main']}` : 'Not set'} onChange={(p) => void assign({ slots: { [s.id]: p } })} />
                <TryButton p={data.slots[s.id]} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Per feature" description="Optional. A feature without its own choice uses the main (or fast) model." icon="sliders">
        <ul className="ai-list">
          {data.features.map((f) => (
            <li key={f.id} className="ai-row">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-semibold text-text-primary">{f.name}</p>
                <p className="m-0 text-[12.5px] text-text-muted">{f.hint}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ModelSelect label={`Model for ${f.name}`} value={data.assignments[f.id]} providers={data.providers} allowNone noneLabel="Same as main" onChange={(p) => void assign({ features: { [f.id]: p } })} />
                <TryButton p={data.assignments[f.id]} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Budget" description="AI tokens each person may use per day. Empty uses the server default (200,000)." icon="coins">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="ai-input w-48"
            inputMode="numeric"
            value={budget ?? (data.budget.dailyTokens != null ? String(data.budget.dailyTokens) : '')}
            placeholder="200000"
            onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
          />
          <button type="button" className="ai-btn ai-btn--main" disabled={budget === null || busy === 'assign'} onClick={() => void assign({ budget: { dailyTokens: budget ? Number(budget) : null } }, 'Budget saved').then(() => setBudget(null))}>
            Save
          </button>
        </div>
      </Panel>
    </div>
  )
}
