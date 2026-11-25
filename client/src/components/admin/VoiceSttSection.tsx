/*
  Admin → Voice recognition: the services that turn students' speech into
  text, in order, most accurate first (src/voice/stt.js). The site uses the
  first one that is on, has a key, is not resting after an error and has free
  room left; at 85% of any free limit it moves to the next one by itself, and
  when every service is full the student's own browser listens instead. So a
  limit never stops the mic and nothing is ever charged.
*/
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Play, Plus, Trash2 } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton, Toggle } from './kit'
import { startCapture, type Capture } from '@/voice/capture'

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
  stats?: { answers: number; failures: number; avgMs: number | null; confidence: number | null } | null
  score?: number
  newKey?: string
  removeKey?: boolean
  extraKeys?: ExtraKey[]
}
/** Another person's own key for the same service. */
type ExtraKey = { id: string; owner: string; hasKey?: boolean; cooling?: string | null; usage?: { day: Use; month: Use; ever: Use } | null; newKey?: string; consent?: boolean }
type Kind = { label: string; why: string; models: string[]; defaultModel: string; limits: Limits; needsRegion: boolean; needsUrl: boolean; signup: string | null }
type View = { ok: true; providers: Provider[]; autoOrder: boolean; effectiveOrder: string[]; studentDailySeconds: number; kinds: Record<string, Kind>; defaultOrder: string[] }

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
  if (!p.hasKey && !(p.extraKeys ?? []).some((k) => k.hasKey) && p.kind !== 'openai_compatible') return { tone: 'warning', text: 'No key' }
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
  return (
    <div className="space-y-5">
      <Editor key={JSON.stringify([data.providers, data.studentDailySeconds, data.autoOrder])} data={data} refetch={refetch} />
      <NaturalVoice />
      <RecordClips />
    </div>
  )
}

type TtsView = {
  enabled: boolean
  ownUrl: string
  ownKeySet: boolean
  ownKeyHint: string
  own: boolean
  azureFree: boolean
  monthlyChars: number
  studentDailyChars: number
  freeMonthlyChars: number
  stopAt: number
  usedThisMonth: number
  linked: boolean
  ownVoices: { id: string; label: string }[]
}
type TtsDraft = { enabled: boolean; daily: number; monthly: number; ownUrl: string; newKey: string; azureFree: boolean }
type TtsTest = { ok: boolean; reason?: string; ms: number; cached?: boolean; engine?: string; voice?: string; mime?: string; audio?: string; visemes?: number }

/*
  Natural voice for spoken answers (src/voice/tts.js): our own voice server
  first (deploy/voice-server: Kokoro's Indian voices, free, exact mouth
  shapes for the teacher), Azure Speech's free tier only for non-commercial
  sites.
*/
function NaturalVoice() {
  const { data, error, loading, refetch } = useApi(() => api.get<TtsView>('/api/admin/voice-tts'), [], { cacheKey: 'admin:voice-tts' })
  const toast = useToast()
  const [draft, setDraft] = useState<TtsDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [test, setTest] = useState<{ busy: boolean; result: TtsTest | null }>({ busy: false, result: null })
  if (error) return <Failed message={error} onRetry={refetch} />
  if (loading || !data) return <Skeleton className="h-40" />
  const d: TtsDraft = draft ?? { enabled: data.enabled, daily: data.studentDailyChars, monthly: data.monthlyChars, ownUrl: data.ownUrl, newKey: '', azureFree: data.azureFree }
  const changed =
    draft !== null &&
    (d.enabled !== data.enabled || d.daily !== data.studentDailyChars || d.monthly !== data.monthlyChars || d.ownUrl !== data.ownUrl || d.newKey !== '' || d.azureFree !== data.azureFree)
  const save = async () => {
    setSaving(true)
    try {
      await api.put('/api/admin/voice-tts', { enabled: d.enabled, studentDailyChars: d.daily, monthlyChars: d.monthly, ownUrl: d.ownUrl.trim(), newOwnKey: d.newKey.trim(), azureFree: d.azureFree })
      setDraft(null)
      refetch()
      toast.success('Saved')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Couldn’t save.')
    } finally {
      setSaving(false)
    }
  }
  const runTest = async (lang: 'en-IN' | 'hi-IN') => {
    setTest({ busy: true, result: null })
    try {
      const r = await api.post<TtsTest>('/api/admin/voice-tts/test', {
        lang,
        text: lang === 'hi-IN' ? 'नमस्ते! मैं आपकी NexoraGuru टीचर हूँ। चलिए, साथ में सीखते हैं।' : 'Namaste! I am your NexoraGuru teacher. Let us learn binary search together.',
      })
      setTest({ busy: false, result: r })
      if (r.ok && r.audio && r.mime) void new Audio(`data:${r.mime};base64,${r.audio}`).play().catch(() => {})
    } catch (e) {
      setTest({ busy: false, result: { ok: false, ms: 0, reason: e instanceof ApiError ? e.message : 'The test didn’t run.' } })
    }
  }
  const pct = data.stopAt ? Math.min(100, Math.round((data.usedThisMonth / data.stopAt) * 100)) : 0
  const state = !data.enabled ? 'Off' : data.own ? 'Your voice server' : data.azureFree && data.linked ? 'Azure free tier' : 'Not set up'
  const t = test.result
  return (
    <Panel
      title="Natural voice"
      icon="volume"
      description="Spoken answers in natural Indian voices that also move the virtual teacher’s lips exactly. They come from your own free voice server (Kokoro’s Indian voices, open licence, commercial use allowed): set it up once on the free Oracle server with deploy/voice-server/README.md, then paste its address and password here. Without it, students hear their own device’s voice."
    >
      <div className="vstt-auto">
        <Toggle checked={d.enabled} onChange={(v) => setDraft({ ...d, enabled: v })} label="Use the natural voice" />
        <div>
          <p className="vstt-auto-title">
            Use the natural voice <Chip tone={state === 'Off' || state === 'Not set up' ? 'warning' : 'success'}>{state}</Chip>
          </p>
          <p className="vstt-auto-line">Voices: {data.ownVoices.map((v) => v.label).join(', ')}. Each speaks English and Hindi.</p>
        </div>
      </div>
      <div className="vstt-fields">
        <label className="ai-field">
          <span>Voice server address</span>
          <input className="ai-input" type="url" inputMode="url" placeholder="https://1-2-3-4.sslip.io" value={d.ownUrl} onChange={(e) => setDraft({ ...d, ownUrl: e.target.value })} />
        </label>
        <label className="ai-field">
          <span>Password{data.ownKeySet ? ` (saved, ends ${data.ownKeyHint})` : ''}</span>
          <input
            className="ai-input"
            type="password"
            autoComplete="off"
            placeholder={data.ownKeySet ? 'Leave empty to keep it' : 'From the setup script'}
            value={d.newKey}
            onChange={(e) => setDraft({ ...d, newKey: e.target.value })}
          />
        </label>
        <label className="ai-field">
          <span>Each student, characters a day</span>
          <input className="ai-input" type="number" min={200} max={50000} step={100} value={d.daily} onChange={(e) => setDraft({ ...d, daily: Number(e.target.value) || 0 })} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => void runTest('en-IN')} loading={test.busy} disabled={changed}>
          Test in English
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void runTest('hi-IN')} disabled={changed || test.busy}>
          Test in Hindi
        </Button>
        <span className="vstt-auto-line" aria-live="polite">
          {changed
            ? 'Save first, then test.'
            : t
              ? t.ok
                ? `${t.cached ? 'Spoke from memory (said before)' : `Spoke in ${(t.ms / 1000).toFixed(1)} s`} with ${t.engine === 'own' ? 'your voice server' : 'Azure'}${t.visemes ? `, ${t.visemes} mouth shapes for the teacher` : ''}.`
                : `Didn’t speak: ${t.reason ?? 'unknown'}.`
              : ''}
        </span>
      </div>
      <div className="vstt-auto">
        <Toggle checked={d.azureFree} onChange={(v) => setDraft({ ...d, azureFree: v })} label="Use Azure Speech’s free tier" />
        <div>
          <p className="vstt-auto-title">Azure Speech’s free tier (non-commercial sites only)</p>
          <p className="vstt-auto-line">
            Microsoft’s terms allow commercial use of its voices only on the paid tier, so leave this off for NexoraGuru. When on, it uses the Azure Speech entry above and
            stops at 85% of the free 500,000 characters a month ({data.usedThisMonth.toLocaleString('en-IN')} used, {pct}%).
          </p>
        </div>
      </div>
      {d.azureFree && (
        <div className="vstt-fields">
          <label className="ai-field">
            <span>Azure monthly cap (at most {data.freeMonthlyChars.toLocaleString('en-IN')})</span>
            <input className="ai-input" type="number" min={1000} max={data.freeMonthlyChars} step={1000} value={d.monthly} onChange={(e) => setDraft({ ...d, monthly: Math.min(data.freeMonthlyChars, Number(e.target.value) || 0) })} />
          </label>
        </div>
      )}
      {changed && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void save()} loading={saving}>
            Save
          </Button>
        </div>
      )}
    </Panel>
  )
}

function Editor({ data, refetch }: { data: View; refetch: () => void }) {
  const toast = useToast()
  const [list, setList] = useState<Provider[]>(() => data.providers.map((p) => ({ ...p })))
  const [daily, setDaily] = useState(() => Math.round(data.studentDailySeconds / 60))
  const [auto, setAuto] = useState(data.autoOrder)
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState('')

  const kinds = data.kinds
  const dirty = JSON.stringify(list.map(strip)) !== JSON.stringify(data.providers.map(strip)) || daily * 60 !== data.studentDailySeconds || auto !== data.autoOrder
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
  const unsaved = list.some((p) => !data.providers.find((x) => x.id === p.id))
  const save = async () => {
    setBusy('save')
    try {
      await api.put('/api/admin/voice-stt', { providers: list, studentDailySeconds: daily * 60, autoOrder: auto })
      toast.success('Saved', 'The new order is used from the next spoken sentence.')
      refetch()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Couldn’t save')
    } finally {
      setBusy(null)
    }
  }
  /**
   * Save first when anything changed (a new key, a switch), then test one
   * service. A pasted key also switches its service on: one tap does all.
   */
  const test = async (id: string, keyId?: string) => {
    setBusy(`test:${id}${keyId ? `~${keyId}` : ''}`)
    try {
      if (dirty || unsaved) {
        const next = list.map((p) => (p.id === id && p.newKey?.trim() ? { ...p, enabled: true } : p))
        setList(next)
        await api.put('/api/admin/voice-stt', { providers: next, studentDailySeconds: daily * 60, autoOrder: auto })
      }
      const r = await api.post<{ ok: boolean; ms?: number; error?: string }>('/api/admin/voice-stt/test', { id, keyId })
      if (r.ok) toast.success('It works', `Answered in ${((r.ms ?? 0) / 1000).toFixed(1)} s.`)
      else toast.error('It didn’t work', r.error)
      refetch()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Couldn’t save')
    } finally {
      setBusy(null)
    }
  }

  // In auto mode the list is shown in the order the site will really use.
  const rankOf = (p: Provider) => {
    const r = data.effectiveOrder.indexOf(p.id)
    return r < 0 ? 999 + list.indexOf(p) : r
  }
  return (
    <div className="space-y-5">
      <Panel
        title="The order"
        icon="list"
        description="The site uses the first service that is on, has a key and has free room left. Near 85% of any free limit, or after an error, it moves to the next one by itself. When every one is full, the student’s own browser listens, so the mic never stops and nothing is charged."
        actions={
          <button type="button" className="ai-btn" onClick={recommended}>
            Add the recommended services
          </button>
        }
      >
        <div className="vstt-auto">
          <Toggle checked={auto} onChange={setAuto} label="Arrange the order automatically" />
          <div>
            <p className="vstt-auto-title">Arrange the order automatically</p>
            <p className="vstt-auto-line">
              {auto
                ? 'Starts from the most accurate for Indian speech, then moves services up or down by how they really do here: answers without errors, the confidence they report, and speed. A service needs about 20 answers before its own results count fully.'
                : 'Off: the site follows your order exactly. Use the arrows to change it.'}
            </p>
          </div>
        </div>
        {list.length === 0 && <p className="m-0 text-[13.5px] text-text-secondary">No services yet. Press “Use the recommended order” to list the best ones for Indian speech, then add a key to each.</p>}
        <ol className="vstt-list">
          {(auto ? [...list].sort((a, b) => rankOf(a) - rankOf(b)) : list).map((p) => {
            const i = list.indexOf(p)
            const k = kinds[p.kind]
            const st = state(p)
            const t = tightest(p)
            const isNew = !data.providers.find((x) => x.id === p.id)
            return (
              <li key={p.id} className={cn('vstt-item', !p.enabled && 'is-off')}>
                <div className="vstt-head">
                  <span className="vstt-rank" aria-label={`Number ${auto && data.effectiveOrder.includes(p.id) ? data.effectiveOrder.indexOf(p.id) + 1 : i + 1}`}>
                    {auto && data.effectiveOrder.includes(p.id) ? data.effectiveOrder.indexOf(p.id) + 1 : i + 1}
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
                    <span className="vstt-key">
                      <input className="ai-input" type="password" autoComplete="off" value={p.newKey ?? ''} onChange={(e) => set(i, { newKey: e.target.value, removeKey: false })} onKeyDown={(e) => e.key === 'Enter' && p.newKey?.trim() && void test(p.id)} placeholder={p.hasKey ? '••••••••' : 'Paste the key'} />
                      {p.newKey?.trim() && (
                        <Button size="sm" onClick={() => void test(p.id)} loading={busy === `test:${p.id}`} disabled={busy !== null && busy !== `test:${p.id}`}>
                          Save and test
                        </Button>
                      )}
                    </span>
                  </label>
                  {k && !k.needsUrl && <ExtraKeys p={p} busy={busy} onChange={(extraKeys) => set(i, { extraKeys })} onTest={(keyId) => void test(p.id, keyId)} />}
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

                {p.stats && (p.stats.answers > 0 || p.stats.failures > 0) && (
                  <p className="vstt-stats">
                    Last 14 days: {p.stats.answers} answers, {p.stats.failures} failures
                    {p.stats.avgMs !== null && ` · ${(p.stats.avgMs / 1000).toFixed(2)} s on average`}
                    {p.stats.confidence !== null && ` · confidence ${Math.round(p.stats.confidence * 100)}%`}
                    {auto && p.score !== undefined && ` · score ${p.score}`}
                  </p>
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
                  {!auto && (
                  <>
                  <button type="button" className="ai-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${p.label} up`}>
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" className="ai-btn" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Move ${p.label} down`}>
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                  </>
                  )}
                  <button type="button" className="ai-btn" onClick={() => void test(p.id)} disabled={busy !== null} title={dirty || isNew ? 'Saves your changes, then tests' : undefined}>
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
              {Object.entries(kinds)
                .filter(([id]) => id === 'openai_compatible' || !list.some((p) => p.kind === id))
                .map(([id, k]) => (
                <option key={id} value={id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <Plus className="size-4 text-text-muted" aria-hidden="true" />
        </div>
        <p className="vstt-note">
          Each service is listed once. To give it more free minutes, add teammates’ keys inside it (“Add another person’s key”): each must be from that person’s own account, with their agreement. Several accounts of the same person break the provider’s terms and can get every one of them blocked.
        </p>
      </Panel>

      <Panel title="Fair share" icon="users" description="Each student’s server listening a day. Beyond it their own browser listens, so a few heavy users can’t use up the free limits for everyone.">
        <label className="ai-field vstt-daily">
          <span>Minutes a student a day</span>
          <input className="ai-input" inputMode="numeric" value={daily} onChange={(e) => setDaily(Math.max(1, Math.min(1440, Number(e.target.value) || 1)))} />
        </label>
      </Panel>

      <div className={cn('vstt-save', (dirty || unsaved) && 'is-dirty')}>
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
  return { id: p.id, kind: p.kind, enabled: p.enabled, model: p.model, region: p.region, url: p.url, limits: p.limits, newKey: p.newKey || '', removeKey: !!p.removeKey, extraKeys: (p.extraKeys ?? []).map((k) => ({ id: k.id, owner: k.owner, newKey: k.newKey || '' })) }
}

/**
 * More keys for one service, each from a different person's own account (a
 * teammate who agreed). One person's several free accounts break the
 * provider's terms, so each key names its owner and needs their agreement;
 * the server refuses two keys under one name.
 */
function ExtraKeys({ p, busy, onChange, onTest }: { p: Provider; busy: string | null; onChange: (k: ExtraKey[]) => void; onTest: (keyId: string) => void }) {
  const keys = p.extraKeys ?? []
  const [adding, setAdding] = useState(false)
  const [owner, setOwner] = useState('')
  const [key, setKey] = useState('')
  const [consent, setConsent] = useState(false)
  const taken = owner.trim() && keys.some((k) => k.owner.trim().toLowerCase() === owner.trim().toLowerCase())
  const add = () => {
    onChange([...keys, { id: Math.random().toString(36).slice(2, 10), owner: owner.trim(), newKey: key.trim(), consent: true }])
    setAdding(false)
    setOwner('')
    setKey('')
    setConsent(false)
  }
  return (
    <div className="vstt-extra">
      {keys.length > 0 && (
        <ul className="vstt-extra-list" aria-label={`More keys for ${p.label}`}>
          {keys.map((k) => (
            <li key={k.id}>
              <span className="vstt-extra-owner">{k.owner}’s key</span>
              <span className="vstt-extra-state">{k.newKey ? 'New: save to use' : k.cooling ? `Resting: ${k.cooling}` : k.hasKey ? 'Saved' : 'No key'}</span>
              {k.hasKey && !k.newKey && (
                <button type="button" className="ai-btn" onClick={() => onTest(k.id)} disabled={busy !== null}>
                  {busy === `test:${p.id}~${k.id}` ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />} Test
                </button>
              )}
              <button type="button" className="ai-btn" onClick={() => onChange(keys.filter((x) => x.id !== k.id))} aria-label={`Remove ${k.owner}’s key`}>
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="vstt-extra-form">
          <label className="ai-field">
            <span>Whose account is it?</span>
            <input className="ai-input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Their name" maxLength={40} />
          </label>
          <label className="ai-field">
            <span>Their key</span>
            <input className="ai-input" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste the key" />
          </label>
          <label className="vstt-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>This key is from {owner.trim() || 'this person'}’s own account, and they agreed to share it. (Not a second account of someone already listed.)</span>
          </label>
          {taken && <p className="vstt-warn">{owner.trim()} already has a key here. Each key must be from a different person.</p>}
          <div className="vstt-actions">
            <button type="button" className="ai-btn" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <Button size="sm" onClick={add} disabled={!owner.trim() || !key.trim() || !consent || !!taken}>
              Add the key
            </Button>
          </div>
        </div>
      ) : (
        keys.length < 10 && (
          <button type="button" className="vstt-extra-add" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" aria-hidden="true" /> Add another person’s key
          </button>
        )
      )}
    </div>
  )
}

type Clip = { id: string; lang: 'en' | 'hinglish' | 'hi'; kind: string; text: string }
const LANG_NAME: Record<Clip['lang'], string> = { en: 'English', hinglish: 'Hinglish', hi: 'Hindi' }

/*
  S9: record the test clips for scripts/voice/asr-eval.js on any device. Each
  clip is saved to your own device as <id>.wav (16 kHz mono, the same clean
  capture the mic uses); nothing is uploaded or stored here. Put the files in
  <folder>/<lang>/ and run the script with ASR_CLIPS_DIR=<folder>.
*/
function RecordClips() {
  const [open, setOpen] = useState(false)
  const [clips, setClips] = useState<Clip[] | null>(null)
  const [lang, setLang] = useState<Clip['lang']>('hinglish')
  const [at, setAt] = useState(0)
  const [rec, setRec] = useState<'idle' | 'recording' | 'done' | 'empty' | 'blocked'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const cap = useRef<Capture | null>(null)
  useEffect(() => {
    if (!open || clips) return
    api.get<{ clips: Clip[] }>('/api/admin/voice-stt/clips').then((r) => setClips(r.clips)).catch(() => setClips([]))
  }, [open, clips])
  useEffect(() => () => {
    cap.current?.cancel()
    if (url) URL.revokeObjectURL(url)
  }, [url])
  const list = (clips ?? []).filter((c) => c.lang === lang)
  const clip = list[Math.min(at, Math.max(0, list.length - 1))]
  const reset = () => {
    cap.current?.cancel()
    cap.current = null
    if (url) URL.revokeObjectURL(url)
    setUrl(null)
    setRec('idle')
  }
  const start = async () => {
    reset()
    const c = await startCapture()
    if (!c) return setRec('blocked')
    cap.current = c
    setRec('recording')
  }
  const stop = async () => {
    const c = cap.current
    cap.current = null
    const blob = c ? await c.stop() : null
    if (!blob) return setRec('empty')
    setUrl(URL.createObjectURL(blob))
    setRec('done')
  }
  const go = (d: number) => {
    reset()
    setAt((i) => Math.max(0, Math.min(list.length - 1, i + d)))
  }
  return (
    <Panel
      title="Record test clips"
      icon="volume"
      description="Before turning on a service or a language, measure it on real voices (scripts/voice/asr-eval.js). Read each sentence as you normally speak. Each recording is saved to your own device only; nothing is uploaded. Keep the files out of the public repository."
      actions={
        <button type="button" className="ai-btn" onClick={() => (open ? (reset(), setOpen(false)) : setOpen(true))} aria-expanded={open}>
          {open ? 'Close' : 'Start recording'}
        </button>
      }
    >
      {open && !clips && <Skeleton className="h-24" />}
      {open && clips && clip && (
        <div className="vstt-rec">
          <div className="vstt-rec-langs" role="group" aria-label="Language">
            {(['en', 'hinglish', 'hi'] as const).map((l) => (
              <button key={l} type="button" className={cn('ai-btn', l === lang && 'is-on')} aria-pressed={l === lang} onClick={() => (reset(), setLang(l), setAt(0))}>
                {LANG_NAME[l]} · {(clips ?? []).filter((c) => c.lang === l && done.has(c.id)).length}/{(clips ?? []).filter((c) => c.lang === l).length}
              </button>
            ))}
          </div>
          <p className="vstt-rec-count">
            {at + 1} of {list.length} · <span className="font-mono">{clip.id}</span> · {clip.kind}
          </p>
          <p className="vstt-rec-text" lang={clip.lang === 'hi' ? 'hi' : 'en'}>
            {clip.text}
          </p>
          <div className="vstt-rec-row">
            {rec !== 'recording' ? (
              <Button size="sm" onClick={() => void start()}>
                {rec === 'done' ? 'Record again' : 'Record'}
              </Button>
            ) : (
              <Button size="sm" onClick={() => void stop()}>
                Stop
              </Button>
            )}
            {url && (
              <>
                <audio controls src={url} aria-label={`Your recording of ${clip.id}`} />
                <a className="ai-btn" href={url} download={`${clip.id}.wav`} onClick={() => setDone((d) => new Set(d).add(clip.id))}>
                  Save {clip.id}.wav
                </a>
              </>
            )}
          </div>
          <p className="vstt-rec-note" aria-live="polite">
            {rec === 'recording' && 'Recording… press Stop when you have finished the sentence.'}
            {rec === 'empty' && 'No speech was heard. Move closer to the mic and try again.'}
            {rec === 'blocked' && 'The microphone is blocked. Allow it in the browser’s address bar, then try again.'}
            {rec === 'done' && `Save it into the “${clip.lang}” folder, then go to the next one.`}
          </p>
          <div className="vstt-rec-row">
            <Button size="sm" variant="ghost" onClick={() => go(-1)} disabled={at === 0}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" onClick={() => go(1)} disabled={at >= list.length - 1}>
              Next sentence
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
