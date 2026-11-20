import { useState } from 'react'
import { Check, ExternalLink, Loader2, Play, RefreshCw, Trash2, X } from 'lucide-react'
import { Tabs, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { runSelfTest, type Step, type Which } from '@/live/selftest'
import { Chip, Failed, Panel, Skeleton, Toggle } from './kit'
import { ago } from './format'

/*
  Admin → Live, in five tabs:
    Overview     what rooms use now, this month against each free limit, rooms open
    Connections  Cloudflare and LiveKit keys (tested before saving, write-only)
    Rules        the order to use them in, the monthly limits, room size, switches
    Rooms        every room open now, with a button to end one
    Test         a one-click test in this browser: test picture and sound sent
                 through a service and received on a second connection
*/

type Test = { ok: boolean; at: number; ms: number; error?: string | null } | null
type Kind = 'mesh' | 'cf' | 'sfu'
type Room = { code: string; title: string; host: string; mode: string; call: boolean; transport: Kind; devices: number; people: number; startedAt: number }
type LiveState = {
  provider: 'auto' | 'direct' | 'cloudflare' | 'livekit'
  active: Kind
  overLimit: boolean
  lkOver: boolean
  cloudflare: { appId: string; last4: string; test: Test } | null
  livekit: { url: string; key: string; last4: string; test: Test; fromEnv?: boolean } | null
  maxPeople: number
  monthlyGb: number
  livekitMinutes: number
  simulcast: boolean
  recording: boolean
  calls: boolean
  tablets: boolean
  usage: { month: string; bytes: number; history: { month: string; bytes: number }[] }
  minutes: Record<Kind, number>
  minutesHistory: { month: string; kind: Kind; minutes: number }[]
  limits: {
    cloudflare: { freeGb: number; pricePerGb: number; note: string }
    livekit: { freeMinutes: number; concurrent: number; note: string }
    direct: { devices: number; note: string }
  }
  live: Room[]
}
type Res = { ok: true } & LiveState

const NAME: Record<Kind, string> = { cf: 'Cloudflare', sfu: 'LiveKit', mesh: 'Direct' }
const gb = (b: number) => (b / 1e9 < 10 ? (b / 1e9).toFixed(2) : Math.round(b / 1e9).toLocaleString())
const mins = (m: number) => Math.round(m).toLocaleString()

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="lv-admin-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <span className={cn(pct >= 90 && 'is-high')} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function LiveSection() {
  const { data, error, refetch, setData } = useApi(() => api.get<Res>('/api/admin/live'), [], { cacheKey: 'admin:live' })
  const [tab, setTab] = useState('overview')
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (id: string, fn: () => Promise<Res>, done?: string) => {
    setBusy(id)
    try {
      setData(await fn())
      if (done) toast.success(done)
      return true
    } catch (e) {
      toast.error('Not saved', e instanceof ApiError ? e.message : (e as Error).message)
      return false
    } finally {
      setBusy(null)
    }
  }
  const put = (patch: Partial<LiveState>) => run('settings', () => api.put('/api/admin/live', patch), 'Saved')

  if (error) return <Failed message={error} onRetry={refetch} />
  if (!data) return <Skeleton className="h-72" />

  return (
    <div className="space-y-5">
      <Tabs
        active={tab}
        onChange={setTab}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'connections', label: 'Connections' },
          { id: 'rules', label: 'Rules' },
          { id: 'rooms', label: 'Rooms', badge: data.live.length || undefined },
          { id: 'test', label: 'Test' },
        ]}
      />
      {tab === 'overview' && <Overview d={data} onRefresh={refetch} />}
      {tab === 'connections' && <Connections d={data} busy={busy} run={run} />}
      {tab === 'rules' && <Rules d={data} busy={busy} put={put} />}
      {tab === 'rooms' && <Rooms d={data} busy={busy} run={run} onRefresh={refetch} />}
      {tab === 'test' && <SelfTest d={data} onSimulcastOff={() => void put({ simulcast: false })} />}
    </div>
  )
}

/* ── Overview ── */
function Overview({ d, onRefresh }: { d: LiveState; onRefresh: () => void }) {
  const devices = d.live.reduce((n, r) => n + r.devices, 0)
  const order = d.provider === 'auto' ? 'Cloudflare → LiveKit → Direct' : `${d.provider === 'cloudflare' ? 'Cloudflare' : d.provider === 'livekit' ? 'LiveKit' : 'Direct'} only`
  return (
    <div className="space-y-5">
      <Panel
        title={`New rooms now use ${NAME[d.active]}`}
        icon="live"
        description={`Order: ${order}.${d.overLimit ? " Cloudflare's monthly limit is reached." : ''}${d.lkOver ? " LiveKit's monthly limit is reached." : ''}`}
        actions={
          <button type="button" className="ai-btn" onClick={onRefresh}>
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        }
      >
        <div className="lv-admin-kpis">
          <div>
            <p className="lv-admin-kpi">{d.live.length}</p>
            <p className="lv-admin-kpi-label">rooms open</p>
          </div>
          <div>
            <p className="lv-admin-kpi">{devices}</p>
            <p className="lv-admin-kpi-label">devices in them</p>
          </div>
          <div>
            <p className="lv-admin-kpi">{d.active === 'mesh' ? d.limits.direct.devices : d.maxPeople}</p>
            <p className="lv-admin-kpi-label">devices a room can hold</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Cloudflare" icon="globe" description={d.limits.cloudflare.note} actions={<Status ok={d.cloudflare?.test?.ok} set={!!d.cloudflare} />}>
          <p className="lv-admin-big">
            {gb(d.usage.bytes)} <span>GB this month</span>
          </p>
          <Meter value={d.usage.bytes} max={d.limits.cloudflare.freeGb * 1e9} label="Cloudflare free traffic used" />
          <dl className="lv-admin-dl">
            <dt>Free</dt>
            <dd>{d.limits.cloudflare.freeGb.toLocaleString()} GB a month</dd>
            <dt>Your limit</dt>
            <dd>{d.monthlyGb ? `${d.monthlyGb.toLocaleString()} GB, then the next service` : 'None (pays beyond the free amount)'}</dd>
            <dt>Beyond free</dt>
            <dd>${d.limits.cloudflare.pricePerGb} per GB</dd>
            <dt>Time used</dt>
            <dd>{mins(d.minutes.cf)} device-minutes</dd>
          </dl>
        </Panel>
        <Panel title="LiveKit" icon="server" description={d.limits.livekit.note} actions={<Status ok={d.livekit?.fromEnv ? true : d.livekit?.test?.ok} set={!!d.livekit} />}>
          <p className="lv-admin-big">
            {mins(d.minutes.sfu)} <span>minutes this month</span>
          </p>
          <Meter value={d.minutes.sfu} max={d.limits.livekit.freeMinutes} label="LiveKit free minutes used" />
          <dl className="lv-admin-dl">
            <dt>Free</dt>
            <dd>about {d.limits.livekit.freeMinutes.toLocaleString()} minutes a month</dd>
            <dt>At once</dt>
            <dd>{d.limits.livekit.concurrent} people</dd>
            <dt>Your limit</dt>
            <dd>{d.livekitMinutes ? `${d.livekitMinutes.toLocaleString()} minutes, then direct` : 'None'}</dd>
          </dl>
        </Panel>
        <Panel title="Direct" icon="users" description={d.limits.direct.note} actions={<Chip tone="success">Always on</Chip>}>
          <p className="lv-admin-big">
            {mins(d.minutes.mesh)} <span>minutes this month</span>
          </p>
          <dl className="lv-admin-dl">
            <dt>Room size</dt>
            <dd>{d.limits.direct.devices} devices</dd>
            <dt>Cost</dt>
            <dd>Free</dd>
          </dl>
        </Panel>
      </div>
      <p className="m-0 text-[12.5px] text-text-secondary">
        Our numbers are estimates from what devices report; each service's own dashboard and bill are the final word. Plans change: check{' '}
        <a className="ed-link" href="https://developers.cloudflare.com/realtime/sfu/pricing/" target="_blank" rel="noreferrer">
          Cloudflare's pricing <ExternalLink className="inline size-3" />
        </a>{' '}
        and{' '}
        <a className="ed-link" href="https://livekit.com/pricing" target="_blank" rel="noreferrer">
          LiveKit's pricing <ExternalLink className="inline size-3" />
        </a>
        .
      </p>
      {(d.usage.history.length > 1 || d.minutesHistory.length > 0) && <History d={d} />}
    </div>
  )
}

function Status({ ok, set }: { ok: boolean | undefined; set: boolean }) {
  if (!set) return <Chip>Not set up</Chip>
  return <Chip tone={ok ? 'success' : 'danger'}>{ok ? 'Working' : 'Not working'}</Chip>
}

function History({ d }: { d: LiveState }) {
  const months = [...new Set([...d.usage.history.map((h) => h.month), ...d.minutesHistory.map((h) => h.month)])].sort().reverse().slice(0, 12)
  const min = (m: string, k: Kind) => d.minutesHistory.find((h) => h.month === m && h.kind === k)?.minutes ?? 0
  return (
    <Panel title="Month by month" icon="chart">
      <div className="overflow-x-auto">
        <table className="lv-admin-table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Cloudflare GB</th>
              <th scope="col">Cloudflare minutes</th>
              <th scope="col">LiveKit minutes</th>
              <th scope="col">Direct minutes</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m}>
                <td>{m}</td>
                <td>{gb(d.usage.history.find((h) => h.month === m)?.bytes ?? 0)}</td>
                <td>{mins(min(m, 'cf'))}</td>
                <td>{mins(min(m, 'sfu'))}</td>
                <td>{mins(min(m, 'mesh'))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/* ── Connections ── */
type Run = (id: string, fn: () => Promise<Res>, done?: string) => Promise<boolean>

function Connections({ d, busy, run }: { d: LiveState; busy: string | null; run: Run }) {
  const [cf, setCf] = useState({ appId: '', secret: '' })
  const [lk, setLk] = useState({ url: '', key: '', secret: '' })
  const [editing, setEditing] = useState<'cloudflare' | 'livekit' | null>(null)
  return (
    <div className="space-y-5">
      <Panel title="Cloudflare Realtime" icon="globe" description="Video through Cloudflare's servers, including in India. 1,000 GB a month free." actions={<Status ok={d.cloudflare?.test?.ok} set={!!d.cloudflare} />}>
        {d.cloudflare && editing !== 'cloudflare' ? (
          <KeyRow
            title={`App ${d.cloudflare.appId.slice(0, 8)}…`}
            line={`token ····${d.cloudflare.last4}${d.cloudflare.test ? ` · tested ${ago(d.cloudflare.test.at)}` : ''}${d.cloudflare.test?.ok ? ` · ${(d.cloudflare.test.ms / 1000).toFixed(1)} s` : ''}${d.cloudflare.test?.error ? ` · ${d.cloudflare.test.error}` : ''}`}
            testing={busy === 'test:cf'}
            onTest={() => void run('test:cf', () => api.post('/api/admin/live/test', { which: 'cloudflare' }), 'Tested')}
            onChange={() => (setCf({ appId: d.cloudflare!.appId, secret: '' }), setEditing('cloudflare'))}
            onRemove={() => void run('rm:cf', () => api.delete('/api/admin/live/cloudflare'), 'Removed')}
            name="Cloudflare"
          />
        ) : (
          <div>
            <ol className="lv-admin-steps">
              <li>
                In the{' '}
                <a className="ed-link" href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">
                  Cloudflare dashboard <ExternalLink className="inline size-3" />
                </a>
                , open <b>Realtime</b>, then <b>Serverless SFU</b>, and <b>Create</b> an app.
              </li>
              <li>
                Copy its <b>App ID</b> and <b>App Token</b> (the token is shown once) and paste them here.
              </li>
            </ol>
            <div className="ai-form mt-4 grid gap-3 sm:grid-cols-2">
              <label className="ai-field">
                <span>App ID</span>
                <input className="ai-input font-mono" value={cf.appId} autoComplete="off" spellCheck={false} onChange={(e) => setCf({ ...cf, appId: e.target.value })} />
              </label>
              <label className="ai-field">
                <span>App Token{d.cloudflare ? ' (empty keeps the saved one)' : ''}</span>
                <input className="ai-input font-mono" type="password" autoComplete="off" value={cf.secret} onChange={(e) => setCf({ ...cf, secret: e.target.value })} />
              </label>
            </div>
            <FormButtons
              busy={busy === 'cf'}
              disabled={!cf.appId.trim() || (!cf.secret.trim() && !d.cloudflare)}
              onSave={() => void run('cf', () => api.put('/api/admin/live/cloudflare', cf), 'Cloudflare connected').then((ok) => ok && (setCf({ appId: '', secret: '' }), setEditing(null)))}
              onCancel={editing === 'cloudflare' ? () => setEditing(null) : undefined}
            />
          </div>
        )}
      </Panel>

      <Panel title="LiveKit" icon="server" description="LiveKit Cloud, or your own LiveKit server." actions={d.livekit?.fromEnv ? <Chip>Set on the server</Chip> : <Status ok={d.livekit?.test?.ok} set={!!d.livekit} />}>
        {d.livekit && !d.livekit.fromEnv && editing !== 'livekit' ? (
          <KeyRow
            title={d.livekit.url}
            line={`${d.livekit.key} · secret ····${d.livekit.last4}${d.livekit.test ? ` · tested ${ago(d.livekit.test.at)}` : ''}${d.livekit.test?.error ? ` · ${d.livekit.test.error}` : ''}`}
            testing={busy === 'test:lk'}
            onTest={() => void run('test:lk', () => api.post('/api/admin/live/test', { which: 'livekit' }), 'Tested')}
            onChange={() => (setLk({ url: d.livekit!.url, key: d.livekit!.key, secret: '' }), setEditing('livekit'))}
            onRemove={() => void run('rm:lk', () => api.delete('/api/admin/live/livekit'), 'Removed')}
            name="LiveKit"
          />
        ) : (
          <div>
            <ol className="lv-admin-steps">
              <li>
                In{' '}
                <a className="ed-link" href="https://cloud.livekit.io" target="_blank" rel="noreferrer">
                  LiveKit Cloud <ExternalLink className="inline size-3" />
                </a>
                , open your project's <b>Settings</b>, then <b>API Keys</b>, and create a key. (You don't need an agent.)
              </li>
              <li>Paste the URL, the API key and the API secret here.</li>
            </ol>
            <div className="ai-form mt-4 grid gap-3 sm:grid-cols-3">
              <label className="ai-field">
                <span>URL</span>
                <input className="ai-input font-mono" placeholder="wss://….livekit.cloud" value={lk.url} onChange={(e) => setLk({ ...lk, url: e.target.value })} />
              </label>
              <label className="ai-field">
                <span>API key</span>
                <input className="ai-input font-mono" value={lk.key} autoComplete="off" onChange={(e) => setLk({ ...lk, key: e.target.value })} />
              </label>
              <label className="ai-field">
                <span>API secret{d.livekit && !d.livekit.fromEnv ? ' (empty keeps the saved one)' : ''}</span>
                <input className="ai-input font-mono" type="password" autoComplete="off" value={lk.secret} onChange={(e) => setLk({ ...lk, secret: e.target.value })} />
              </label>
            </div>
            <FormButtons
              busy={busy === 'lk'}
              disabled={!lk.url.trim() || !lk.key.trim()}
              onSave={() => void run('lk', () => api.put('/api/admin/live/livekit', lk), 'LiveKit connected').then((ok) => ok && (setLk({ url: '', key: '', secret: '' }), setEditing(null)))}
              onCancel={editing === 'livekit' ? () => setEditing(null) : undefined}
            />
          </div>
        )}
      </Panel>
    </div>
  )
}

function KeyRow({ title, line, testing, onTest, onChange, onRemove, name }: { title: string; line: string; testing: boolean; onTest: () => void; onChange: () => void; onRemove: () => void; name: string }) {
  return (
    <div className="ai-row">
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[14px] font-semibold text-text-primary">{title}</p>
        <p className="m-0 mt-0.5 font-mono text-[12px] break-words text-text-muted">{line}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="ai-btn" disabled={testing} onClick={onTest}>
          {testing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Check keys
        </button>
        <button type="button" className="ai-btn" onClick={onChange}>
          Change
        </button>
        <button type="button" className="ai-icon" aria-label={`Remove ${name}`} onClick={onRemove}>
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

function FormButtons({ busy, disabled, onSave, onCancel }: { busy: boolean; disabled: boolean; onSave: () => void; onCancel?: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className="ai-btn ai-btn--main" disabled={busy || disabled} onClick={onSave}>
        {busy && <Loader2 className="size-3.5 animate-spin" />} Connect and check
      </button>
      {onCancel && (
        <button type="button" className="ai-btn" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  )
}

/* ── Rules ── */
function Rules({ d, busy, put }: { d: LiveState; busy: string | null; put: (p: Partial<LiveState>) => Promise<boolean> }) {
  return (
    <div className="space-y-5">
      <Panel title="Which to use" icon="route" description="New rooms follow this. Rooms already open keep the way they started.">
        <div className="lv-admin-choices" role="radiogroup" aria-label="Which to use">
          {(
            [
              ['auto', 'Automatic (both)', 'Cloudflare first. When its limit is reached or it fails, LiveKit. Then direct.'],
              ['cloudflare', 'Cloudflare only', 'Then direct when its limit is reached.'],
              ['livekit', 'LiveKit only', 'Then direct when its limit is reached.'],
              ['direct', 'Direct only', 'Browsers connect to each other. 5 devices.'],
            ] as const
          ).map(([id, title, text]) => (
            <button key={id} type="button" role="radio" aria-checked={d.provider === id} className={cn('lv-admin-choice', d.provider === id && 'is-on')} disabled={busy === 'settings'} onClick={() => void put({ provider: id })}>
              <strong>{title}</strong>
              <span>{text}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Limits" icon="shield" description="Stay inside the free amounts: past a limit, new rooms move to the next service instead of costing money.">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Cloudflare, GB a month (free: 1,000; 0 = no limit)" value={d.monthlyGb} min={0} max={100000} onSave={(v) => void put({ monthlyGb: v })} />
          <NumberField label="LiveKit, minutes a month (free: about 5,000; 0 = no limit)" value={d.livekitMinutes} min={0} max={10000000} onSave={(v) => void put({ livekitMinutes: v })} />
          <NumberField label="Devices per room on a video server (2–200)" value={d.maxPeople} min={2} max={200} onSave={(v) => void put({ maxPeople: v })} />
        </div>
      </Panel>

      <Panel title="Parts of Live" icon="sliders" description="Turn parts of Live on or off for everyone.">
        <ul className="ai-list">
          {(
            [
              ['calls', 'Calls from Messages', 'Voice and video calls that ring friends.'],
              ['tablets', 'Tablets by QR', 'A tablet joins a room without signing in, to share a whiteboard or camera.'],
              ['recording', 'Recording to the device', 'People can save a room to their own device; everyone is told.'],
              ['simulcast', 'Two sizes of each camera (Cloudflare)', 'Small tiles get a small copy, which saves data. Turn off if the Test says one size works better.'],
            ] as const
          ).map(([id, title, text]) => (
            <li key={id} className="ai-row">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-semibold text-text-primary">{title}</p>
                <p className="m-0 mt-0.5 text-[12.5px] text-text-secondary">{text}</p>
              </div>
              <Toggle checked={d[id]} label={title} disabled={busy === 'settings'} onChange={(on) => void put({ [id]: on })} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function NumberField({ label, value, min, max, onSave }: { label: string; value: number; min: number; max: number; onSave: (v: number) => void }) {
  return (
    <label className="ai-field">
      <span>{label}</span>
      <input className="ai-input" type="number" min={min} max={max} defaultValue={value} key={value} onBlur={(e) => Number(e.target.value) !== value && onSave(Number(e.target.value))} />
    </label>
  )
}

/* ── Rooms ── */
function Rooms({ d, busy, run, onRefresh }: { d: LiveState; busy: string | null; run: Run; onRefresh: () => void }) {
  return (
    <Panel
      title="Open now"
      icon="live"
      description="Every room with someone in it."
      actions={
        <button type="button" className="ai-btn" onClick={onRefresh}>
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      }
    >
      {d.live.length === 0 ? (
        <p className="m-0 text-[13.5px] text-text-secondary">No rooms are open right now.</p>
      ) : (
        <ul className="ai-list">
          {d.live.map((r) => (
            <li key={r.code} className="ai-row">
              <div className="min-w-0 flex-1">
                <p className="m-0 flex flex-wrap items-center gap-2 text-[14px] font-semibold text-text-primary">
                  {r.title}
                  <Chip>{NAME[r.transport]}</Chip>
                  {r.call && <Chip>Call</Chip>}
                </p>
                <p className="m-0 mt-0.5 text-[12.5px] text-text-secondary">
                  {r.people} {r.people === 1 ? 'person' : 'people'} on {r.devices} {r.devices === 1 ? 'device' : 'devices'} · host @{r.host} · open {ago(r.startedAt)}
                </p>
              </div>
              <button
                type="button"
                className="ai-btn"
                disabled={busy === `end:${r.code}`}
                onClick={() => window.confirm(`End "${r.title}" for everyone in it?`) && void run(`end:${r.code}`, () => api.post(`/api/admin/live/rooms/${r.code}/end`), 'Room ended')}
              >
                End for everyone
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ── Test ── */
function SelfTest({ d, onSimulcastOff }: { d: LiveState; onSimulcastOff: () => void }) {
  const [which, setWhich] = useState<Which | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [result, setResult] = useState<boolean | null>(null)
  const [single, setSingle] = useState(false)
  const start = async (w: Which) => {
    setWhich(w)
    setResult(null)
    setSingle(false)
    setSteps([])
    let ok = await runSelfTest(w, setSteps)
    // Cloudflare with two camera sizes failed: try one size, to tell which part is at fault.
    if (!ok && w === 'cloudflare' && d.simulcast) {
      const again = await runSelfTest(w, () => {}, { simulcast: false })
      if (again) {
        setSingle(true)
        ok = false
      }
    }
    setResult(ok)
  }
  const running = which !== null && result === null
  const options: { id: Which; label: string; ready: boolean }[] = [
    { id: 'cloudflare', label: 'Cloudflare', ready: !!d.cloudflare },
    { id: 'livekit', label: 'LiveKit', ready: !!d.livekit },
    { id: 'direct', label: 'Direct', ready: true },
  ]
  return (
    <Panel title="Test a connection" icon="play" description="Runs in this browser: a test picture and a tone go through the service and come back on a second connection. No camera or microphone is used.">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} type="button" className={cn('ai-btn', which === o.id && 'ai-btn--main')} disabled={running || !o.ready} onClick={() => void start(o.id)} title={o.ready ? undefined : 'Set it up in Connections first'}>
            {running && which === o.id ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Test {o.label}
          </button>
        ))}
      </div>
      {steps.length > 0 && (
        <ol className="lv-admin-test" aria-live="polite">
          {steps.map((s) => (
            <li key={s.id} className={`is-${s.state}`}>
              <span className="lv-admin-test-icon" aria-hidden="true">
                {s.state === 'ok' ? <Check className="size-3.5" /> : s.state === 'bad' ? <X className="size-3.5" /> : s.state === 'run' ? <Loader2 className="size-3.5 animate-spin" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                {s.label}
                {s.detail && <span className="lv-admin-test-detail">{s.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {single && (
        <div className="mt-3 flex flex-wrap items-center gap-3" role="status">
          <p className="m-0 text-[14px] text-text-primary">With one camera size, Cloudflare works. Turn off "Two sizes of each camera" to use it.</p>
          <button type="button" className="ai-btn ai-btn--main" onClick={() => (onSimulcastOff(), setSingle(false), setResult(true))}>
            Turn it off
          </button>
        </div>
      )}
      {result !== null && !single && (
        <p className={cn('m-0 mt-3 text-[14px] font-semibold', result ? 'text-state-success' : 'text-state-error')} role="status">
          {result ? `${which === 'cloudflare' ? 'Cloudflare' : which === 'livekit' ? 'LiveKit' : 'Direct'} works from this network.` : 'This test did not pass. The step marked ✗ says why. Send a screenshot to fix it.'}
        </p>
      )}
    </Panel>
  )
}
