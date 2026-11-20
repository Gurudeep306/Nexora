import { useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton, Toggle } from './kit'
import { ago } from './format'

/*
  Admin → Live. How study rooms and calls connect:
    Direct      browsers connect to each other (5 devices, nothing to set up)
    Cloudflare  Cloudflare Realtime: 1,000 GB a month free (recommended)
    LiveKit     LiveKit Cloud, or your own LiveKit server
  Keys are tested before they are saved and are write-only, like AI keys.
  This month's traffic through the video server is estimated from what
  devices report; over the limit, new rooms connect directly instead.
*/

type Test = { ok: boolean; at: number; ms: number; error?: string | null } | null
type LiveState = {
  provider: 'auto' | 'direct' | 'cloudflare' | 'livekit'
  active: 'mesh' | 'cf' | 'sfu'
  overLimit: boolean
  cloudflare: { appId: string; last4: string; test: Test } | null
  livekit: { url: string; key: string; last4: string; test: Test; fromEnv?: boolean } | null
  maxPeople: number
  monthlyGb: number
  recording: boolean
  calls: boolean
  tablets: boolean
  usage: { month: string; bytes: number; history: { month: string; bytes: number }[] }
  live: { transport: string; devices: number }[]
}

const ACTIVE: Record<LiveState['active'], string> = { cf: 'Cloudflare', sfu: 'LiveKit', mesh: 'Direct (5 devices)' }
const gb = (b: number) => (b / 1e9 < 10 ? (b / 1e9).toFixed(2) : Math.round(b / 1e9).toString())

export function LiveSection() {
  const { data, error, refetch, setData } = useApi(() => api.get<{ ok: true } & LiveState>('/api/admin/live'), [], { cacheKey: 'admin:live' })
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [cf, setCf] = useState({ appId: '', secret: '' })
  const [lk, setLk] = useState({ url: '', key: '', secret: '' })
  const [editing, setEditing] = useState<'cloudflare' | 'livekit' | null>(null)

  const run = async (id: string, fn: () => Promise<{ ok: true } & LiveState>, done?: string) => {
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

  const used = data.usage.bytes
  const pct = data.monthlyGb ? Math.min(100, (used / (data.monthlyGb * 1e9)) * 100) : 0
  const devicesNow = data.live.reduce((n, r) => n + r.devices, 0)

  return (
    <div className="space-y-6">
      <Panel
        title="How rooms connect"
        icon="live"
        description="New rooms use this. Rooms already open keep the way they started."
        actions={
          <Chip tone={data.active === 'mesh' ? 'warning' : 'success'}>
            Now: {ACTIVE[data.active]}
            {data.overLimit ? ' · Cloudflare limit reached' : ''}
          </Chip>
        }
      >
        <div className="lv-admin-choices" role="radiogroup" aria-label="How rooms connect">
          {(
            [
              ['auto', 'Automatic (both)', 'Cloudflare first. When its monthly limit is reached, LiveKit. Then direct.'],
              ['cloudflare', 'Cloudflare', '1,000 GB a month free. Rooms of many people.'],
              ['livekit', 'LiveKit', 'LiveKit Cloud or your own LiveKit server.'],
              ['direct', 'Direct', 'Browsers connect to each other. 5 devices, nothing to set up.'],
            ] as const
          ).map(([id, title, text]) => (
            <button key={id} type="button" role="radio" aria-checked={data.provider === id} className={cn('lv-admin-choice', data.provider === id && 'is-on')} disabled={busy === 'settings'} onClick={() => void put({ provider: id })}>
              <strong>{title}</strong>
              <span>{text}</span>
            </button>
          ))}
        </div>
        <p className="m-0 mt-3 text-[12.5px] text-text-secondary">
          {data.live.length ? `${data.live.length} room${data.live.length === 1 ? '' : 's'} open now, ${devicesNow} device${devicesNow === 1 ? '' : 's'}.` : 'No rooms open right now.'}
        </p>
      </Panel>

      {/* ── Cloudflare ── */}
      <Panel
        title="Cloudflare Realtime"
        icon="globe"
        description="Video goes through Cloudflare's servers (Mumbai, Chennai and more). The first 1,000 GB each month are free; after that $0.05 per GB."
        actions={data.cloudflare ? <Chip tone={data.cloudflare.test?.ok ? 'success' : 'danger'}>{data.cloudflare.test?.ok ? 'Working' : 'Not working'}</Chip> : <Chip tone="warning">Not set up</Chip>}
      >
        {data.cloudflare && editing !== 'cloudflare' ? (
          <div className="ai-row">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[14px] font-semibold text-text-primary">App {data.cloudflare.appId.slice(0, 8)}…</p>
              <p className="m-0 mt-0.5 font-mono text-[12px] text-text-muted">
                token ····{data.cloudflare.last4}
                {data.cloudflare.test && ` · tested ${ago(data.cloudflare.test.at)}`}
                {data.cloudflare.test?.ok && ` · ${(data.cloudflare.test.ms / 1000).toFixed(1)} s`}
                {data.cloudflare.test?.error && ` · ${data.cloudflare.test.error}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ai-btn" disabled={busy === 'test:cf'} onClick={() => void run('test:cf', () => api.post('/api/admin/live/test', { which: 'cloudflare' }), 'Tested')}>
                {busy === 'test:cf' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Test
              </button>
              <button type="button" className="ai-btn" onClick={() => (setCf({ appId: data.cloudflare!.appId, secret: '' }), setEditing('cloudflare'))}>
                Change
              </button>
              <button type="button" className="ai-icon" aria-label="Remove Cloudflare" onClick={() => void run('rm:cf', () => api.delete('/api/admin/live/cloudflare'), 'Removed')}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <ol className="lv-admin-steps">
              <li>
                Open the{' '}
                <a className="ed-link" href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">
                  Cloudflare dashboard <ExternalLink className="inline size-3" />
                </a>{' '}
                and find <b>Realtime</b> in the menu, then its <b>SFU</b> page.
              </li>
              <li>
                Choose <b>Create</b>, name it <code>nexoraguru</code>, and create it.
              </li>
              <li>Copy the <b>App ID</b> and the <b>App Token</b> it shows, and paste them here. The token is shown once.</li>
            </ol>
            <div className="ai-form mt-4 grid gap-3 sm:grid-cols-2">
              <label className="ai-field">
                <span>App ID</span>
                <input className="ai-input font-mono" value={cf.appId} autoComplete="off" spellCheck={false} onChange={(e) => setCf({ ...cf, appId: e.target.value })} />
              </label>
              <label className="ai-field">
                <span>App Token{data.cloudflare ? ' (empty keeps the saved one)' : ''}</span>
                <input className="ai-input font-mono" type="password" autoComplete="off" value={cf.secret} onChange={(e) => setCf({ ...cf, secret: e.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="ai-btn ai-btn--main"
                disabled={busy === 'cf' || !cf.appId.trim() || (!cf.secret.trim() && !data.cloudflare)}
                onClick={() =>
                  void run('cf', () => api.put('/api/admin/live/cloudflare', cf), 'Cloudflare connected').then((ok) => {
                    if (ok) {
                      setCf({ appId: '', secret: '' })
                      setEditing(null)
                    }
                  })
                }
              >
                {busy === 'cf' && <Loader2 className="size-3.5 animate-spin" />} Connect and test
              </button>
              {editing === 'cloudflare' && (
                <button type="button" className="ai-btn" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* ── usage and limits ── */}
      <Panel title="This month" icon="chart" description="Traffic through Cloudflare, as devices report it. An estimate: Cloudflare's own bill is the final word.">
        <div className="lv-admin-usage">
          <p className="m-0 text-[22px] font-semibold tabular-nums text-text-primary">
            {gb(used)} GB <span className="text-[14px] font-normal text-text-secondary">of {data.monthlyGb ? `${data.monthlyGb} GB limit` : 'no limit'}</span>
          </p>
          {data.monthlyGb > 0 && (
            <div className="lv-admin-meter" role="meter" aria-label="Used this month" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
              <span className={cn(pct >= 90 && 'is-high')} style={{ width: `${pct}%` }} />
            </div>
          )}
          {data.usage.history.length > 1 && (
            <p className="m-0 text-[12.5px] text-text-secondary">
              Earlier:{' '}
              {data.usage.history
                .slice(1, 6)
                .map((h) => `${h.month} ${gb(h.bytes)} GB`)
                .join(' · ')}
            </p>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="ai-field">
            <span>Cloudflare monthly limit, GB (0 = no limit). Over it, new rooms use LiveKit if set up, else connect directly, instead of costing money.</span>
            <input className="ai-input" type="number" min={0} max={100000} defaultValue={data.monthlyGb} key={`gb${data.monthlyGb}`} onBlur={(e) => Number(e.target.value) !== data.monthlyGb && void put({ monthlyGb: Number(e.target.value) })} />
          </label>
          <label className="ai-field">
            <span>Devices per room through the video server (2–200)</span>
            <input className="ai-input" type="number" min={2} max={200} defaultValue={data.maxPeople} key={`mp${data.maxPeople}`} onBlur={(e) => Number(e.target.value) !== data.maxPeople && void put({ maxPeople: Number(e.target.value) })} />
          </label>
        </div>
      </Panel>

      {/* ── switches ── */}
      <Panel title="Parts of Live" icon="sliders" description="Turn parts of Live on or off for everyone.">
        <ul className="ai-list">
          {(
            [
              ['calls', 'Calls from Messages', 'Voice and video calls that ring friends.'],
              ['tablets', 'Tablets by QR', 'A tablet joins a room without signing in, to share a whiteboard or camera.'],
              ['recording', 'Recording to the device', 'People can save a room to their own device; everyone is told.'],
            ] as const
          ).map(([id, title, text]) => (
            <li key={id} className="ai-row">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-semibold text-text-primary">{title}</p>
                <p className="m-0 mt-0.5 text-[12.5px] text-text-secondary">{text}</p>
              </div>
              <Toggle checked={data[id]} label={title} disabled={busy === 'settings'} onChange={(on) => void put({ [id]: on })} />
            </li>
          ))}
        </ul>
      </Panel>

      {/* ── LiveKit ── */}
      <Panel
        title="LiveKit (optional)"
        icon="server"
        description="LiveKit Cloud or your own LiveKit server, if you prefer it to Cloudflare."
        actions={data.livekit ? <Chip tone={data.livekit.fromEnv ? undefined : data.livekit.test?.ok ? 'success' : 'danger'}>{data.livekit.fromEnv ? 'Set on the server' : data.livekit.test?.ok ? 'Working' : 'Not working'}</Chip> : <Chip>Not set up</Chip>}
      >
        {data.livekit && !data.livekit.fromEnv && editing !== 'livekit' ? (
          <div className="ai-row">
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate font-mono text-[13px] text-text-primary">{data.livekit.url}</p>
              <p className="m-0 mt-0.5 font-mono text-[12px] text-text-muted">
                {data.livekit.key} · secret ····{data.livekit.last4}
                {data.livekit.test && ` · tested ${ago(data.livekit.test.at)}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ai-btn" disabled={busy === 'test:lk'} onClick={() => void run('test:lk', () => api.post('/api/admin/live/test', { which: 'livekit' }), 'Tested')}>
                {busy === 'test:lk' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Test
              </button>
              <button type="button" className="ai-btn" onClick={() => (setLk({ url: data.livekit!.url, key: data.livekit!.key, secret: '' }), setEditing('livekit'))}>
                Change
              </button>
              <button type="button" className="ai-icon" aria-label="Remove LiveKit" onClick={() => void run('rm:lk', () => api.delete('/api/admin/live/livekit'), 'Removed')}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="ai-form grid gap-3 sm:grid-cols-3">
              <label className="ai-field">
                <span>URL</span>
                <input className="ai-input font-mono" placeholder="wss://….livekit.cloud" value={lk.url} onChange={(e) => setLk({ ...lk, url: e.target.value })} />
              </label>
              <label className="ai-field">
                <span>API key</span>
                <input className="ai-input font-mono" value={lk.key} autoComplete="off" onChange={(e) => setLk({ ...lk, key: e.target.value })} />
              </label>
              <label className="ai-field">
                <span>API secret</span>
                <input className="ai-input font-mono" type="password" autoComplete="off" value={lk.secret} onChange={(e) => setLk({ ...lk, secret: e.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="ai-btn ai-btn--main"
                disabled={busy === 'lk' || !lk.url.trim() || !lk.key.trim()}
                onClick={() =>
                  void run('lk', () => api.put('/api/admin/live/livekit', lk), 'LiveKit connected').then((ok) => {
                    if (ok) {
                      setLk({ url: '', key: '', secret: '' })
                      setEditing(null)
                    }
                  })
                }
              >
                {busy === 'lk' && <Loader2 className="size-3.5 animate-spin" />} Connect and test
              </button>
              {editing === 'livekit' && (
                <button type="button" className="ai-btn" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
