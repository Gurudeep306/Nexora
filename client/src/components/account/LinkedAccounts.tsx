import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, Check, Copy, Download, ExternalLink, Link2, RefreshCw, Unlink } from 'lucide-react'
import { Button, Card, CardContent, Input, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { SettingsSection } from './SettingsPrimitives'

/**
 * Linked accounts: link a Codeforces / AtCoder / LeetCode / DMOJ / CodeChef
 * handle and prove it's yours with a one-time code, then import what you
 * solved there (problems get marked solved here and count toward badges).
 * GitHub connects through GitHub's own sign-in (OAuth). Only verified
 * accounts can import.
 */

interface Account {
  platform: string
  name: string
  handle: string
  profileUrl: string
  verified: boolean
  rating: number | null
  maxRating: number | null
  rank: string | null
  solved: number | null
  imported: number | null
  lastImport: number | null
  lastError: string | null
  stats: { complete?: boolean; byDifficulty?: Record<string, number> | null; repos?: number; followers?: number; contributions?: number | null; contributionsAt?: number | null }
  pending: { token: string; expiresAt: number; howTo: string } | null
}
type Judge = { id: string; name: string; oauth?: boolean; configured?: boolean }

const PLACEHOLDER: Record<string, string> = { codeforces: 'e.g. tourist', atcoder: 'e.g. chokudai', leetcode: 'e.g. neal_wu', dmoj: 'e.g. Xyene', codechef: 'e.g. gennady.korotkevich' }
const NOTE: Record<string, string> = {
  codeforces: 'Imports every problem you solved.',
  atcoder: 'Imports every problem you solved.',
  leetcode: 'LeetCode shares your solved counts and your last 20 solves, so counts are exact and the list fills in over time.',
  dmoj: 'Imports every problem you solved.',
  codechef: 'CodeChef shows only how many problems you solved and your rating, so those come across, not the list.',
  github: 'Your public repositories, followers and contributions in the last year. Nothing is posted, and no access is kept.',
}
const LINK_ERROR: Record<string, string> = {
  github_not_configured: 'GitHub sign-in is not set up on this site yet.',
  denied: 'GitHub was not connected: the request was cancelled.',
  expired: 'That took too long or came from another tab. Try Connect again.',
}

function ago(ms: number | null) {
  if (!ms) return 'never'
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

export function LinkedAccounts() {
  const toast = useToast()
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [judges, setJudges] = useState<Judge[]>([])
  const load = () =>
    api
      .get<{ ok: boolean; accounts: Account[]; judges: Judge[] }>('/api/accounts')
      .then((r) => {
        setAccounts(r.accounts)
        setJudges(r.judges)
      })
      .catch((e) => toast.error('Could not load linked accounts', e instanceof Error ? e.message : undefined))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Back from GitHub: say how it went once, then tidy the address.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    const ok = params.get('linked')
    const bad = params.get('link_error')
    if (!ok && !bad) return
    if (ok === 'github') toast.success('GitHub connected')
    else if (bad) toast.error('GitHub not connected', LINK_ERROR[bad] ?? bad)
    const next = new URLSearchParams(params)
    next.delete('linked')
    next.delete('link_error')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card>
      <CardContent className="py-5">
        <SettingsSection
          title="Linked accounts"
          description="Prove an account is yours once, then import what you solved there. Your code stays on the judge: only which problems you solved, your counts and your rating come across."
          icon={<Link2 />}
        >
          <div className="divide-y divide-border rounded-lg border border-border">
            {!accounts &&
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton ml-auto h-8 w-40 rounded" />
                </div>
              ))}
            {accounts &&
              judges.map((j) =>
                j.oauth ? (
                  <OAuthRow key={j.id} judge={j} account={accounts.find((a) => a.platform === j.id) ?? null} onChange={load} />
                ) : (
                  <JudgeRow key={j.id} judge={j} account={accounts.find((a) => a.platform === j.id) ?? null} onChange={load} />
                ),
              )}
          </div>
        </SettingsSection>
      </CardContent>
    </Card>
  )
}

function JudgeRow({ judge, account, onChange }: { judge: Judge; account: Account | null; onChange: () => void }) {
  const toast = useToast()
  const [handle, setHandle] = useState(account?.handle ?? '')
  const [busy, setBusy] = useState<'' | 'start' | 'check' | 'import' | 'unlink'>('')
  const [, tick] = useState(0)
  useEffect(() => {
    if (!account?.pending) return
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [account?.pending])

  const act = async (kind: typeof busy, fn: () => Promise<void>) => {
    setBusy(kind)
    try {
      await fn()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy('')
    }
  }
  const start = () =>
    act('start', async () => {
      await api.post(`/api/accounts/${judge.id}/start`, { handle })
      onChange()
    })
  const check = () =>
    act('check', async () => {
      const r = await api.post<{ verified: boolean }>(`/api/accounts/${judge.id}/check`, {})
      if (r.verified) toast.success(`${judge.name} account verified`, 'Now import your solves.')
      else toast.error('Not found yet', judge.id === 'codeforces' ? 'Codeforces can take a few seconds to show the submission — try again.' : 'Save the code on your profile, then check again.')
      onChange()
    })
  const doImport = () =>
    act('import', async () => {
      const r = await api.post<{ added: number; matched: number; total: number }>(`/api/accounts/${judge.id}/import`, {}, { timeoutMs: 180000 })
      toast.success(`Imported from ${judge.name}`, `${r.total} solved there · ${r.matched} are in Nexora · ${r.added} newly marked solved here.`)
      onChange()
    })
  const unlink = () =>
    act('unlink', async () => {
      await api.delete(`/api/accounts/${judge.id}`)
      setHandle('')
      onChange()
    })

  const left = account?.pending ? Math.max(0, Math.round((account.pending.expiresAt - Date.now()) / 1000)) : 0

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-[7rem]">
          <p className="mb-0 text-sm font-semibold text-text-primary">{judge.name}</p>
          <p className="mb-0 text-[12px] text-text-muted">{NOTE[judge.id]}</p>
        </div>
        {account?.verified ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a href={account.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary hover:underline">
              <BadgeCheck className="size-4 text-state-success" aria-label="Verified" />
              {account.handle}
              <ExternalLink className="size-3 text-text-muted" aria-hidden="true" />
            </a>
            <Button size="sm" variant="secondary" onClick={doImport} loading={busy === 'import'} disabled={!!busy}>
              {busy !== 'import' && <Download aria-hidden="true" />} {account.lastImport ? 'Import again' : 'Import solves'}
            </Button>
            <Button size="sm" variant="ghost" onClick={unlink} loading={busy === 'unlink'} disabled={!!busy} aria-label={`Unlink ${judge.name}`}>
              {busy !== 'unlink' && <Unlink aria-hidden="true" />}
            </Button>
          </div>
        ) : (
          <form
            className="ml-auto flex w-full items-center gap-2 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault()
              if (handle.trim()) start()
            }}
          >
            <Input value={handle} onChange={(e) => setHandle(e.target.value.trim())} placeholder={PLACEHOLDER[judge.id]} aria-label={`${judge.name} handle`} autoComplete="off" spellCheck={false} className="sm:w-48" />
            <Button size="sm" type="submit" variant={account?.pending ? 'secondary' : 'primary'} loading={busy === 'start'} disabled={!!busy || !handle.trim()}>
              {account?.pending ? 'New code' : 'Link'}
            </Button>
          </form>
        )}
      </div>

      {account?.verified && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-4">
          <Stat label="Solved there" value={account.solved != null ? String(account.solved) : '—'} />
          <Stat label="In Nexora" value={account.imported != null ? String(account.imported) : '—'} />
          <Stat label="Rating" value={account.rating != null ? `${account.rating}${account.maxRating ? ` (max ${account.maxRating})` : ''}` : '—'} />
          <Stat label="Last import" value={ago(account.lastImport)} />
          {account.lastError && <p className="col-span-full mb-0 text-state-error">Last import failed: {account.lastError}</p>}
        </dl>
      )}

      {account?.pending && !account.verified && (
        <div className="space-y-3 rounded-lg border border-border bg-bg-surface-2/50 p-3.5">
          <p className="mb-0 text-[13px] text-text-secondary">
            Prove <span className="font-medium text-text-primary">{account.handle}</span> is yours: {account.pending.howTo}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {judge.id !== 'codeforces' && <CopyCode code={account.pending.token} />}
            <Button size="sm" variant="primary" onClick={check} loading={busy === 'check'} disabled={!!busy || left === 0}>
              {busy !== 'check' && <RefreshCw aria-hidden="true" />} Check
            </Button>
            <span className={cn('text-[12px] tabular-nums', left < 60 ? 'text-state-warning' : 'text-text-muted')}>
              {left > 0 ? `Code expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Expired — press New code'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/** GitHub: connect through GitHub itself (OAuth), refresh, disconnect. */
function OAuthRow({ judge, account, onChange }: { judge: Judge; account: Account | null; onChange: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState<'' | 'refresh' | 'unlink'>('')
  const act = async (kind: typeof busy, fn: () => Promise<void>) => {
    setBusy(kind)
    try {
      await fn()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy('')
    }
  }
  const linked = !!account?.verified
  const st = account?.stats ?? {}
  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-[7rem] flex-1">
          <p className="mb-0 text-sm font-semibold text-text-primary">{judge.name}</p>
          <p className="mb-0 text-[12px] text-text-muted">{NOTE[judge.id]}</p>
        </div>
        {linked && account ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a href={account.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary hover:underline">
              <BadgeCheck className="size-4 text-state-success" aria-label="Verified" />
              {account.handle}
              <ExternalLink className="size-3 text-text-muted" aria-hidden="true" />
            </a>
            <Button size="sm" variant="secondary" loading={busy === 'refresh'} disabled={!!busy} onClick={() => act('refresh', async () => {
              await api.post(`/api/accounts/${judge.id}/import`, {}, { timeoutMs: 60000 })
              toast.success('GitHub numbers updated')
              onChange()
            })}>
              {busy !== 'refresh' && <RefreshCw aria-hidden="true" />} Refresh
            </Button>
            <Button size="sm" variant="ghost" loading={busy === 'unlink'} disabled={!!busy} aria-label={`Disconnect ${judge.name}`} onClick={() => act('unlink', async () => {
              await api.delete(`/api/accounts/${judge.id}`)
              onChange()
            })}>
              {busy !== 'unlink' && <Unlink aria-hidden="true" />}
            </Button>
          </div>
        ) : judge.configured ? (
          <a href="/auth/github/link" className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[var(--kit-btn-radius,8px)] bg-accent-brand px-3 text-sm font-medium text-on-accent-brand hover:bg-accent-brand-hover">
            <Link2 className="size-3.5" aria-hidden="true" /> Connect with GitHub
          </a>
        ) : (
          <p className="mb-0 ml-auto text-[12.5px] text-text-secondary">Not set up on this site yet: the owner adds a GitHub OAuth app first.</p>
        )}
      </div>
      {linked && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-4">
          <Stat label="Public repos" value={st.repos != null ? String(st.repos) : '—'} />
          <Stat label="Followers" value={st.followers != null ? String(st.followers) : '—'} />
          <Stat label="Contributions, last year" value={st.contributions != null ? String(st.contributions) : '—'} />
          <Stat label="Updated" value={ago(account?.lastImport ?? null)} />
          {st.contributionsAt ? <p className="col-span-full mb-0 text-text-muted">Contributions are read when you connect; connect again to update them.</p> : null}
        </dl>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="mb-0 font-medium text-text-primary tabular-nums">{value}</dd>
    </div>
  )
}

function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        })
      }}
      className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-bg-surface px-2.5 font-mono text-[12.5px] text-text-primary hover:bg-bg-surface-2"
      aria-label={`Copy ${code}`}
    >
      {code}
      {done ? <Check className="size-3.5 text-state-success" aria-hidden="true" /> : <Copy className="size-3.5 text-text-muted" aria-hidden="true" />}
    </button>
  )
}
