/*
  Admin → Voice recognition: the services that turn students' speech into
  text, in order, most accurate first (src/voice/stt.js). The site uses the
  first one that is on, has a key, is not resting after an error and has free
  room left; at 85% of any free limit it moves to the next one by itself, and
  when every service is full the student's own browser listens instead. So a
  limit never stops the mic and nothing is ever charged.
*/
import { useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Play, Plus, Trash2 } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton, Toggle } from './kit'

type Limits = Partial<Record<'perMinute' | 'perDay' | 'perHourSeconds' | 'perDaySeconds' | 'perMonthSeconds' | 'creditSeconds', number>>
type Use = { requests: number; seconds: number }
type Provider = {
  id: string
  kind: string
  label: string
  enabled: boolean
  model: string
  region: string
  url: string
  limits: Limits
  hasKey: boolean
  keyFromAi?: boolean
  cooling: string | null
  usage: { minute: Use; hour: Use; day: Use; month: Use; ever: Use } | null
  newKey?: string
  removeKey?: boolean
}
type Kind = { label: string; why: string; models: string[]; defaultModel: string; limits: Limits; needsRegion: boolean; needsUrl: boolean; signup: string | null }
type View = { ok: true; providers: Provider[]; studentDailySeconds: number; kinds: Record<string, Kind>; defaultOrder: string[] }

const LIMIT_FIELDS: { k: keyof Limits; label: string; unit: string; minutes?: boolean }[] = [
  { k: 'perMinute', label: 'Requests a minute', unit: 'requests' },
  { k: 'perDay', label: 'Requests a day', unit: 'requests' },
  { k: 'perHourSeconds', label: 'Audio an hour', unit: 'minutes', minutes: true },
  { k: 'perDaySeconds', label: 'Audio a day', unit: 'minutes', minutes: true },
  { k: 'perMonthSeconds', label: 'Audio a month', unit: 'minutes', minutes: true },
  { k: 'creditSeconds', label: 'One-time free credit', unit: 'minutes', minutes: true },
]

const mins = (s: number) => (s / 60 < 10 ? (s / 60).toFixed(1) : Math.round(s / 60).toLocaleString())

/** The tightest free allowance and how much of it is used, for the meter. */
function tightest(p: Provider): { used: number; max: number; what: string } | null {
  const u = p.usage
  if (!u) return null
  const opts: { used: number; max: number; what: string }[] = []
  if (p.limits.perDaySeconds) opts.push({ used: u.day.seconds, max: p.limits.perDaySeconds, what: 'today' })
  if (p.limits.perMonthSeconds) opts.push({ used: u.month.seconds, max: p.limits.perMonthSeconds, what: 'this month' })
  if (p.limits.creditSeconds) opts.push({ used: u.ever.seconds, max: p.limits.creditSeconds, what: 'of the free credit' })
  return opts.sort((a, b) => b.used / b.max - a.used / a.max)[0] ?? null
}

function state(p: Provider): { tone: string; text: string } {
  if (!p.enabled) return { tone: '', text: 'Off' }
  if (!p.hasKey && p.kind !== 'openai_compatible') return { tone: 'warning', text: 'No key' }
  if (p.cooling) return { tone: 'warning', text: `Resting: ${p.cooling}` }
  const t = tightest(p)
  if (t && t.used >= t.max * 0.85) return { tone: 'warning', text: `Free limit reached ${t.what}` }
  return { tone: 'success', text: 'Ready' }
}

export function VoiceSttSection() {
  const { data, error, loading, refetch } = useApi(() => api.get<View>('/api/admin/voice-stt'), [], { cacheKey: 'admin:voice-stt' })
  if (error) return <Failed message={error} onRetry={refetch} />
  if (loading || !data) return <Skeleton className="h-64" />
  // A fresh editor for each saved version, started from it.
  return <Editor key={JSON.stringify([data.providers, data.studentDailySeconds])} data={data} refetch={refetch} />
}

function Editor({ data, refetch }: { data: View; refetch: () => void }) {
  const toast = useToast()
  const [list, setList] = useState<Provider[]>(() => data.providers.map((p) => ({ ...p })))
  const [daily, setDaily] = useState(() => Math.round(data.studentDailySeconds / 60))
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState('')

  const kinds = data.kinds
  const dirty = JSON.stringify(list.map(strip)) !== JSON.stringify(data.providers.map(strip)) || daily * 60 !== data.studentDailySeconds
  const set = (i: number, patch: Partial<Provider>) => setList(list.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setList(next)
  }
  const add = (kind: string) => {
    if (!kind) return
    const k = kinds[kind]
    let id = kind
    for (let n = 2; list.some((p) => p.id === id); n++) id = `${kind}-${n}`
    setList([...list, { id, kind, label: k.label, enabled: true, model: k.defaultModel, region: k.needsRegion ? 'centralindia' : '', url: '', limits: { ...k.limits }, hasKey: false, cooling: null, usage: null }])
    setAdding('')
  }
  const recommended = () => {
    const have = new Set(list.map((p) => p.kind))
    const next = [...data.defaultOrder.map((k) => list.find((p) => p.kind === k)).filter(Boolean), ...list.filter((p) => !data.defaultOrder.includes(p.kind))] as Provider[]
    for (const k of data.defaultOrder) if (!have.has(k)) next.splice(data.defaultOrder.indexOf(k), 0, { id: k, kind: k, label: kinds[k].label, enabled: false, model: kinds[k].defaultModel, region: kinds[k].needsRegion ? 'centralindia' : '', url: '', limits: { ...kinds[k].limits }, hasKey: false, cooling: null, usage: null })
    setList(next)
  }
  const save = async () => {
    setBusy('save')
    try {
      await api.put('/api/admin/voice-stt', { providers: list, studentDailySeconds: daily * 60 })
      toast.success('Saved', 'The new order is used from the next spoken sentence.')
      refetch()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Couldn’t save')
    } finally {
      setBusy(null)
    }
  }
  const test = async (id: string) => {
    setBusy(`test:${id}`)
    try {
      const r = await api.post<{ ok: boolean; ms?: number; error?: string }>('/api/admin/voice-stt/test', { id })
      if (r.ok) toast.success('It works', `Answered in ${((r.ms ?? 0) / 1000).toFixed(1)} s.`)
      else toast.error('It didn’t work', r.error)
      refetch()
    } finally {
      setBusy(null)
    }
  }

  const unsaved = list.some((p) => !data.providers.find((x) => x.id === p.id))
  return (
    <div className="space-y-5">
      <Panel
        title="The order"
        icon="list"
        description="The site uses the first service that is on, has a key and has free room left. Near 85% of any free limit, or after an error, it moves to the next one by itself. When every one is full, the student’s own browser listens, so the mic never stops and nothing is charged."
        actions={
          <button type="button" className="ai-btn" onClick={recommended}>
            Use the recommended order
          </button>
        }
      >
        {list.length === 0 && <p className="m-0 text-[13.5px] text-text-secondary">No services yet. Press “Use the recommended order” to list the best ones for Indian speech, then add a key to each.</p>}
        <ol className="vstt-list">
          {list.map((p, i) => {
            const k = kinds[p.kind]
            const st = state(p)
            const t = tightest(p)
            const isNew = !data.providers.find((x) => x.id === p.id)
            return (
              <li key={p.id} className={cn('vstt-item', !p.enabled && 'is-off')}>
                <div className="vstt-head">
                  <span className="vstt-rank" aria-label={`Number ${i + 1}`}>
                    {i + 1}
                  </span>
                  <div className="vstt-title">
                    <p className="vstt-name">{p.label}</p>
                    <p className="vstt-why">{k?.why}</p>
                  </div>
                  <Chip tone={st.tone || undefined}>{st.text}</Chip>
                  <Toggle checked={p.enabled} onChange={(v) => set(i, { enabled: v })} label={`Use ${p.label}`} size="sm" />
                </div>

                <div className="vstt-fields">
                  {k && k.models.length > 0 ? (
                    <label className="ai-field">
                      <span>Model</span>
                      <select className="ai-input" value={p.model} onChange={(e) => set(i, { model: e.target.value })}>
                        {k.models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="ai-field">
                      <span>Model</span>
                      <input className="ai-input" value={p.model} onChange={(e) => set(i, { model: e.target.value })} />
                    </label>
                  )}
                  {k?.needsRegion && (
                    <label className="ai-field">
                      <span>Region</span>
                      <input className="ai-input" value={p.region} onChange={(e) => set(i, { region: e.target.value })} placeholder="centralindia" />
                    </label>
                  )}
                  {k?.needsUrl && (
                    <label className="ai-field">
                      <span>Server address</span>
                      <input className="ai-input" value={p.url} onChange={(e) => set(i, { url: e.target.value })} placeholder="https://…/v1" />
                    </label>
                  )}
                  <label className="ai-field">
                    <span>{p.hasKey ? (p.keyFromAi ? 'Key (uses the Groq key from AI models)' : 'Key (saved; type to replace)') : 'Key'}</span>
                    <input className="ai-input" type="password" autoComplete="off" value={p.newKey ?? ''} onChange={(e) => set(i, { newKey: e.target.value, removeKey: false })} placeholder={p.hasKey ? '••••••••' : 'Paste the key'} />
                  </label>
                </div>

                {t && (
                  <div className="vstt-use">
                    <div className="lv-admin-meter" role="meter" aria-label={`${p.label} free audio used ${t.what}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, (t.used / t.max) * 100))}>
                      <span className={cn(t.used / t.max >= 0.85 && 'is-high')} style={{ width: `${Math.min(100, (t.used / t.max) * 100)}%` }} />
                    </div>
                    <span className="vstt-use-text">
                      {mins(t.used)} of {mins(t.max)} free minutes {t.what} · {p.usage?.day.requests ?? 0} clips today
                    </span>
                  </div>
                )}

                <details className="vstt-limits">
                  <summary>Free limits (check the provider’s console; plans change)</summary>
                  <div className="vstt-limit-grid">
                    {LIMIT_FIELDS.map((f) => (
                      <label key={f.k} className="ai-field">
                        <span>
                          {f.label} ({f.unit})
                        </span>
                        <input
                          className="ai-input"
                          inputMode="numeric"
                          value={p.limits[f.k] === undefined ? '' : f.minutes ? Math.round((p.limits[f.k] as number) / 60) : p.limits[f.k]}
                          placeholder="No limit"
                          onChange={(e) => {
                            const v = e.target.value.trim()
                            const n = Number(v)
                            const limits = { ...p.limits }
                            if (!v || !Number.isFinite(n) || n < 0) delete limits[f.k]
                            else limits[f.k] = f.minutes ? n * 60 : n
                            set(i, { limits })
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </details>

                <div className="vstt-actions">
                  <button type="button" className="ai-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${p.label} up`}>
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" className="ai-btn" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Move ${p.label} down`}>
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" className="ai-btn" onClick={() => void test(p.id)} disabled={isNew || dirty || busy !== null} title={isNew || dirty ? 'Save first' : undefined}>
                    {busy === `test:${p.id}` ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />} Test
                  </button>
                  {k?.signup && (
                    <a className="ai-btn" href={k.signup} target="_blank" rel="noreferrer">
                      Get a key <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  )}
                  <button type="button" className="ai-btn" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label={`Remove ${p.label}`}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="vstt-add">
          <label className="ai-field">
            <span>Add a service</span>
            <select className="ai-input" value={adding} onChange={(e) => add(e.target.value)}>
              <option value="">Choose…</option>
              {Object.entries(kinds).map(([id, k]) => (
                <option key={id} value={id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <Plus className="size-4 text-text-muted" aria-hidden="true" />
        </div>
      </Panel>

      <Panel title="Fair share" icon="users" description="Each student’s server listening a day. Beyond it their own browser listens, so a few heavy users can’t use up the free limits for everyone.">
        <label className="ai-field vstt-daily">
          <span>Minutes a student a day</span>
          <input className="ai-input" inputMode="numeric" value={daily} onChange={(e) => setDaily(Math.max(1, Math.min(1440, Number(e.target.value) || 1)))} />
        </label>
      </Panel>

      <div className="vstt-save">
        {(dirty || unsaved) && <span className="text-[13px] text-text-secondary">Unsaved changes</span>}
        <Button onClick={() => void save()} disabled={!dirty} loading={busy === 'save'}>
          Save
        </Button>
      </div>
    </div>
  )
}

/** The parts the server saves (to tell whether anything changed). */
function strip(p: Provider) {
  return { id: p.id, kind: p.kind, enabled: p.enabled, model: p.model, region: p.region, url: p.url, limits: p.limits, newKey: p.newKey || '', removeKey: !!p.removeKey }
}
