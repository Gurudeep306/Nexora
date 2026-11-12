import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FolderGit2, Loader2, MoreHorizontal, Pause, Play, Plus, RefreshCw, Settings2, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Button, ConfirmDialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AddGithubDialog, AddKeyDialog, EditKeyDialog } from '../dialogs'
import { useHive } from '../store'
import type { HiveKey } from '../types'
import { Meter, PageTitle, ProviderGlyph, fmtCost, fmtTokens, keyShare, shareTone, timeAgo, vendorName, vendorStyle } from '../ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export default function KeysPage() {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [addingGh, setAddingGh] = useState(false)
  const [confirmGh, setConfirmGh] = useState<string | null>(null)
  const grouped = useMemo(() => {
    const m = new Map<string, HiveKey[]>()
    for (const k of boot?.keys ?? []) (m.get(k.provider) ?? m.set(k.provider, []).get(k.provider)!).push(k)
    return [...m.entries()]
  }, [boot?.keys])
  if (!boot) return null
  const total = boot.keys.reduce((a, k) => ({ used: a.used + k.used, active: a.active + k.active }), { used: 0, active: 0 })

  return (
    <div className="mx-auto w-full max-w-[920px] px-8 pb-20 pt-10">
      <PageTitle title="Keys" sub={`${boot.keys.length} keys across ${grouped.length} providers · ${fmtTokens(total.used)} tokens used this period · ${total.active} live calls`}>
        <Button onClick={() => setAdding(true)}>
          <Plus /> Add key
        </Button>
      </PageTitle>

      {grouped.length === 0 && (
        <button type="button" onClick={() => setAdding(true)} className="hive-card hive-card-hover mb-10 flex w-full flex-col items-center gap-3 p-10 text-center">
          <div className="flex -space-x-1.5">
            {['anthropic', 'openai', 'gemini', 'deepseek', 'xai', 'mistral'].map((v) => (
              <ProviderGlyph key={v} provider={v} size="md" className="rounded-full ring-2 ring-bg-app" />
            ))}
          </div>
          <span className="text-[15px] font-medium">Add your first AI key</span>
          <span className="max-w-md text-[13px] text-text-muted">16 providers supported. Add several accounts of the same provider — Hive spreads work across them and moves on when one runs out.</span>
        </button>
      )}

      {grouped.map(([vendor, keys]) => (
        <section key={vendor} className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <ProviderGlyph provider={vendor} size="sm" />
            <h2 className="text-[13px] font-medium text-text-secondary">{vendorName(vendor)}</h2>
            <span className="text-[12px] text-text-muted">· {keys.length} account{keys.length === 1 ? '' : 's'}</span>
          </div>
          <div className="hive-card divide-y divide-[var(--hive-line)] p-0">
            {keys.map((k) => (
              <KeyRow key={k.id} k={k} />
            ))}
          </div>
        </section>
      ))}

      <section className="mb-8 mt-12">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[13px] font-medium text-text-secondary">
            <FolderGit2 className="size-4" /> GitHub
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setAddingGh(true)}>
            <Plus /> Connect
          </Button>
        </div>
        <div className="hive-card divide-y divide-[var(--hive-line)] p-0">
          {boot.github.length === 0 && <p className="px-5 py-4 text-[13px] text-text-muted">Connect a token so agents can work on your repositories.</p>}
          {boot.github.map((g) => (
            <div key={g.id} className="flex items-center gap-4 px-5 py-3.5">
              <FolderGit2 className="size-4 text-text-muted" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] text-text-primary">{g.label}</div>
                <div className="text-[12.5px] text-text-muted">
                  @{g.login} · ····{g.last4} · {boot.projects.filter((p) => p.github_id === g.id).length} projects · added by @{g.createdBy}
                </div>
              </div>
              {(boot.me.admin || boot.me.username === g.createdBy) && (
                <Button size="icon-sm" variant="ghost" onClick={() => setConfirmGh(g.id)} aria-label="Remove">
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-state-success" />
        Keys and tokens are encrypted at rest and never sent to a browser — only their last four characters. Only staff can open Hive.
      </p>

      <AddKeyDialog open={adding} onClose={() => setAdding(false)} />
      <AddGithubDialog open={addingGh} onClose={() => setAddingGh(false)} />
      <ConfirmDialog
        open={!!confirmGh}
        onClose={() => setConfirmGh(null)}
        title="Remove GitHub connection?"
        message="Projects that use it must be removed first."
        confirmLabel="Remove"
        danger
        onConfirm={async () => {
          try {
            if (confirmGh) await hiveApi.deleteGithub(confirmGh)
            await refresh()
          } catch (e) {
            toast.error(errMsg(e))
          }
          setConfirmGh(null)
        }}
      />
    </div>
  )
}

function KeyRow({ k }: { k: HiveKey }) {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [usage, setUsage] = useState<{ day: string; tokens: number }[]>([])
  const canManage = !!boot && (boot.me.admin || boot.me.username === k.owner)
  const share = keyShare(k)
  const rl = k.rateLimit
  const color = vendorStyle(k.provider).color

  useEffect(() => {
    let live = true
    hiveApi
      .keyUsage(k.id)
      .then((r) => live && setUsage(r.days.map((d) => ({ day: d.day, tokens: d.input + d.output }))))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [k.id, k.used])

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast.success(ok)
      await refresh()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_80px_auto]', k.disabled && 'opacity-55')}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] text-text-primary">{k.label}</span>
          {k.status === 'ok' && <CheckCircle2 className="size-3.5 shrink-0 text-state-success" aria-label="Verified" />}
          {(k.status === 'invalid' || k.status === 'error') && (
            <Tooltip label={k.statusDetail || 'Check failed'}>
              <TriangleAlert className="size-3.5 shrink-0 text-state-error" />
            </Tooltip>
          )}
          {k.disabled && <span className="text-[12px] text-text-muted">· paused</span>}
          {k.active > 0 && <span className="hive-dot-run ml-1 size-1.5 rounded-full bg-accent-brand" title={`${k.active} live`} />}
        </div>
        <div className="truncate text-[12.5px] text-text-muted">
          ····{k.last4} · @{k.owner} · {k.models.length} models{k.defaultModel ? ` · ${k.defaultModel}` : ''}
          {(k.priority ?? 0) !== 0 ? ` · priority ${k.priority! > 0 ? '+' : ''}${k.priority}` : ''}
        </div>
      </div>
      <div className="order-3 col-span-2 min-w-0 sm:order-none sm:col-span-1">
        <Meter value={share ?? 1} color={share == null ? 'color-mix(in oklab, var(--color-text-muted) 35%, transparent)' : shareTone(share)} />
        <div className="mt-1.5 flex justify-between gap-2 text-[12px] tabular-nums text-text-muted">
          <span>
            {fmtTokens(k.used)}
            {k.tokenLimit != null ? ` / ${fmtTokens(k.tokenLimit)}` : ''}
            {fmtCost(k.periodCostMicros) ? ` · ${fmtCost(k.periodCostMicros)}` : ''}
          </span>
          <span>{k.tokenLimit == null ? 'no limit' : k.limitPeriod === 'total' ? 'total' : `per ${k.limitPeriod}`}</span>
        </div>
        {rl?.tokensLimit != null && (
          <div className="mt-1 text-[11.5px] tabular-nums text-text-muted" title={`Provider rate limit, reported ${timeAgo(k.rateLimitAt)} ago`}>
            Rate limit {fmtTokens(rl.tokensRemaining)} / {fmtTokens(rl.tokensLimit)} per min
          </div>
        )}
      </div>
      <div className="hidden h-9 sm:block" aria-hidden>
        {usage.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usage} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <Area type="monotone" dataKey="tokens" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.12} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <Menu>
        <MenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Key actions" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => act(() => hiveApi.checkKey(k.id), 'Key checked')}>
            <RefreshCw className="size-3.5" /> Re-check & refresh models
          </MenuItem>
          {canManage && (
            <>
              <MenuItem onSelect={() => setEditing(true)}>
                <Settings2 className="size-3.5" /> Budget & settings
              </MenuItem>
              <MenuItem onSelect={() => act(() => hiveApi.updateKey(k.id, { disabled: !k.disabled }), k.disabled ? 'Resumed' : 'Paused')}>
                {k.disabled ? <Play className="size-3.5" /> : <Pause className="size-3.5" />} {k.disabled ? 'Resume' : 'Pause'}
              </MenuItem>
              <MenuSeparator />
              <MenuItem className="text-state-error" onSelect={() => setConfirm(true)}>
                <Trash2 className="size-3.5" /> Delete
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>
      <EditKeyDialog k={k} open={editing} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => act(() => hiveApi.deleteKey(k.id), 'Key deleted').then(() => setConfirm(false))}
        title="Delete this key?"
        message={`“${k.label}” leaves the shared pool. Agents using it move to another key.`}
        confirmLabel="Delete key"
        danger
        loading={busy}
      />
    </div>
  )
}
