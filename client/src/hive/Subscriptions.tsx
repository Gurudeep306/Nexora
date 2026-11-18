/* ────────────────────────────────────────────────────────────────────────
   Subscription agents — Claude Code, Codex and Mistral Vibe on your own plans, no API
   credits. The CLIs run on an always-on worker machine (the bridge); Hive
   drives them, shows the plan's usage windows, and hands work to another
   model when a plan limit is hit.
   ──────────────────────────────────────────────────────────────────────── */
import { SecretInput } from './kit'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Copy, Cpu, ExternalLink, Loader2, Plus, Server, X } from 'lucide-react'
import { Button, Input, Modal, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentMark } from './agents'
import { hiveApi } from './api'
import { errMsg } from './Improve'
import { useHive } from './store'
import type { CliStatus, HiveKey } from './types'
import { LimitBar, timeAgo } from './ui'

type Sub = 'claude_code' | 'codex' | 'vibe'
const INFO: Record<Sub, { name: string; plan: string; model: string; login: string; token: string; tokenHint: string }> = {
  claude_code: { name: 'Claude Code', plan: 'Claude Pro / Max', model: 'claude-opus-5-5', login: 'claude', token: 'claude setup-token', tokenHint: 'Paste the token from `claude setup-token` (optional if the machine is already logged in)' },
  codex: { name: 'Codex', plan: 'ChatGPT Plus / Pro', model: 'gpt-5-codex', login: 'codex login --device-auth', token: 'codex login --device-auth', tokenHint: 'Codex uses the machine’s own login — leave empty after `codex login --device-auth`' },
  vibe: { name: 'Mistral Vibe', plan: 'Le Chat Pro / Student', model: 'mistral-medium-3.5', login: 'vibe --setup', token: 'vibe --setup', tokenHint: 'Paste your Vibe API key (optional if `vibe --setup` was run on the machine)' },
}


export function SubscriptionsPanel({ onConnect }: { onConnect: (s: Sub) => void }) {
  const { boot, machines } = useHive()
  const toast = useToast()
  // The parent Claude account leads (the Copilot's brain); the others are workers.
  const [parent, setParent] = useState<string | null>(null)
  useEffect(() => {
    hiveApi
      .copilot()
      .then((r) => setParent(r.settings.brainKey ?? null))
      .catch(() => {})
  }, [])
  const makeParent = async (id: string) => {
    try {
      const r = await hiveApi.copilotSettings({ brainKey: id })
      setParent(r.settings.brainKey ?? id)
      toast.success('That account now leads — the others do the work')
    } catch (e) {
      toast.error(errMsg(e))
    }
  }
  const keys = boot?.keys ?? []
  const anyMachine = machines.length > 0
  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">Your subscriptions — no API credits</h2>
          <p className="text-[13px] text-text-muted">Claude Code, Codex and Mistral Vibe run on an always-on machine with your plan. Every staff member can use them, from anywhere.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(INFO) as Sub[]).map((s, i) => {
          const list = keys.filter((k) => k.provider === s)
          return (
            <motion.div key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} className="hive-card relative overflow-hidden p-4">
              <div className="relative flex items-center gap-3">
                <AgentMark provider={s} model={INFO[s].model} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{INFO[s].name}</div>
                  <div className="text-[12px] text-text-muted">{INFO[s].plan} · runs on a machine</div>
                </div>
                <Button size="sm" variant={list.length ? 'ghost' : 'secondary'} onClick={() => onConnect(s)}>
                  <Plus /> {list.length ? 'Another' : 'Connect'}
                </Button>
              </div>
              <div className="relative mt-3 space-y-2">
                {list.map((k, idx) => (
                  <SubKey
                    key={k.id}
                    k={k}
                    machineName={machines.find((m) => m.id === k.machineId)?.name}
                    online={machines.find((m) => m.id === k.machineId)?.online ?? false}
                    role={s !== 'claude_code' || list.length < 2 ? null : (parent ? parent === k.id : idx === 0) ? 'parent' : 'worker'}
                    onMakeParent={s === 'claude_code' && list.length > 1 ? () => makeParent(k.id) : undefined}
                  />
                ))}
                {s === 'claude_code' && list.length > 1 && <p className="px-1 text-[11.5px] text-text-muted">The parent account leads (plans and checks); workers do the tasks. If the parent hits its limit, a worker takes over leading.</p>}
                {!list.length && (
                  <p className="rounded-xl bg-text-primary/[0.035] p-3 text-[12.5px] text-text-muted">
                    {anyMachine ? `Connect it to a machine where ${INFO[s].name} is installed and logged in.` : 'First connect an always-on machine (a home PC, a mini PC or a small VPS) in Machines — then connect it here.'}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

function SubKey({ k, machineName, online, role, onMakeParent }: { k: HiveKey; machineName?: string; online: boolean; role?: 'parent' | 'worker' | null; onMakeParent?: () => void }) {
  const toast = useToast()
  const { refresh } = useHive()
  const [busy, setBusy] = useState(false)
  const refreshUsage = async () => {
    setBusy(true)
    try {
      const r = await hiveApi.refreshPlanUsage(k.id)
      const e = r.results[0]?.error
      if (e) toast.error(e)
      await refresh()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="rounded-xl bg-text-primary/[0.035] p-3">
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className={cn('size-2 rounded-full', online ? 'bg-state-success' : 'bg-text-muted/50')} />
        <span className="truncate font-medium">{k.label}</span>
        {role === 'parent' && <span className="shrink-0 rounded-full bg-accent-brand/15 px-1.5 text-[10.5px] font-semibold text-accent-brand">Parent · leads</span>}
        {role === 'worker' && (
          <>
            <span className="shrink-0 rounded-full bg-text-primary/[0.07] px-1.5 text-[10.5px] font-medium text-text-muted">Worker</span>
            {onMakeParent && (
              <button type="button" onClick={onMakeParent} className="shrink-0 rounded-md px-1.5 text-[10.5px] text-accent-brand hover:bg-accent-brand/10">
                Make parent
              </button>
            )}
          </>
        )}
        <span className="ml-auto truncate text-text-muted">
          <Server className="mr-1 inline size-3" />
          {machineName ?? 'machine'} · {online ? 'online' : 'offline'}
        </span>
      </div>
      <div className="mt-2">
        <LimitBar k={k} compact />
      </div>
      {k.provider === 'claude_code' && (
        <button type="button" onClick={refreshUsage} disabled={busy} className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-accent-brand hover:underline disabled:opacity-50">
          {busy ? <Loader2 className="size-3 animate-spin" /> : null} Refresh usage
        </button>
      )}
    </div>
  )
}

export function SubscriptionDialog({ sub, onClose }: { sub: Sub | null; onClose: () => void }) {
  const toast = useToast()
  const { machines } = useHive()
  const [machineId, setMachineId] = useState('')
  // True once the person clicks a machine; until then Hive keeps an online one picked.
  const [picked, setPicked] = useState(false)
  const [token, setToken] = useState('')
  const [label, setLabel] = useState('')
  const [detect, setDetect] = useState<{ loading: boolean; status?: CliStatus; online?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const info = sub ? INFO[sub] : null
  const sorted = useMemo(() => [...machines].sort((a, b) => Number(b.online) - Number(a.online)), [machines])
  // Reset only when the window opens — machines report in every few seconds,
  // and resetting on each report wiped a token mid-paste.
  const sortedRef = useRef(sorted)
  sortedRef.current = sorted
  useEffect(() => {
    if (!sub) return
    setToken('')
    setLabel('')
    setPicked(false)
    const list = sortedRef.current
    setMachineId(list.find((m) => m.online)?.id ?? list[0]?.id ?? '')
  }, [sub])
  // A machine that connects while the window is open gets picked if none was.
  // and an offline pick moves to an online machine (unless the person chose it).
  useEffect(() => {
    if (!sub || !sorted.length) return
    const current = sorted.find((m) => m.id === machineId)
    const online = sorted.find((m) => m.online)
    if (!current) setMachineId(online?.id ?? sorted[0].id)
    else if (!current.online && online && !picked) setMachineId(online.id)
  }, [sub, machineId, sorted, picked])
  useEffect(() => {
    if (!sub || !machineId) return setDetect(null)
    let live = true
    setDetect({ loading: true })
    hiveApi
      .machineAgents(machineId)
      .then((r) => live && setDetect({ loading: false, online: r.online, status: r.agents[sub] }))
      .catch(() => live && setDetect({ loading: false }))
    return () => {
      live = false
    }
  }, [sub, machineId])
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nexoraguru.in'
  const oneLiner = `curl -fsSL ${origin}/api/hive-bridge/setup.sh | bash -s -- --server ${origin} --token <machine token>`
  const submit = async () => {
    if (!sub || !machineId) return
    setBusy(true)
    try {
      const r = await hiveApi.addSubscription({ provider: sub, machineId, token: token.trim() || undefined, label: label.trim() || undefined })
      if (r.check?.ok === false) toast.error(`Saved, but the check failed: ${r.check.error ?? 'unknown error'}`)
      else toast.success(`${info?.name} is connected — choose it in any agent picker, or let Auto use it`)
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={!!sub} onClose={onClose} size="lg" title={info ? `Connect ${info.name}` : ''} description={info ? `Uses your ${info.plan} plan through the CLI on a machine — no API credits.` : undefined}>
      {info && (
        <div className="space-y-4">
          {!machines.length ? (
            <div className="rounded-2xl bg-text-primary/[0.04] p-4 text-[13px]">
              <div className="mb-1 font-semibold">1 · Connect an always-on machine</div>
              <p className="text-text-muted">Any computer that stays on (a mini PC, a home server or a $5 VPS). In Machines, add one to get its token, then run on that machine:</p>
              <CopyLine text={oneLiner} />
              <p className="mt-2 text-text-muted">It installs Node, git, Claude Code and Codex, and keeps the bridge running as a service.</p>
              <Link to="/hive/machines" className="mt-3 inline-flex items-center gap-1 text-accent-brand">
                Open Machines <ExternalLink className="size-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <div>
                <div className="mb-1.5 text-[12px] font-medium text-text-secondary">Machine</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sorted.map((m) => (
                    <button key={m.id} type="button" onClick={() => (setMachineId(m.id), setPicked(true))} className={cn('flex items-center gap-2.5 rounded-xl border p-3 text-left', machineId === m.id ? 'border-accent-brand/50 bg-accent-brand/[0.06]' : 'hive-line hover:bg-text-primary/[0.03]')}>
                      <Cpu className="size-4 text-text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{m.name}</span>
                        <span className="block text-[11.5px] text-text-muted">{m.online ? 'online' : `offline · seen ${timeAgo(m.lastSeen)}`}</span>
                      </span>
                      {machineId === m.id && <Check className="size-4 text-accent-brand" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-text-primary/[0.035] p-3 text-[12.5px]">
                {!detect || detect.loading ? (
                  <span className="inline-flex items-center gap-2 text-text-muted">
                    <Loader2 className="size-3.5 animate-spin" /> Checking {info.name} on this machine…
                  </span>
                ) : detect.online === false ? (
                  <span className="text-state-warning">This machine is offline — start the bridge on it, then try again.</span>
                ) : detect.status?.installed ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1 text-state-success">
                      <Check className="size-3.5" /> Installed {detect.status.version ? `(${detect.status.version})` : ''}
                    </span>
                    {detect.status.loggedIn ? (
                      <span className="inline-flex items-center gap-1 text-state-success">
                        <Check className="size-3.5" /> Logged in
                      </span>
                    ) : (
                      <span className="text-state-warning">
                        Not logged in — run <code className="hive-kbd">{info.login}</code> on the machine{sub === 'claude_code' ? ', or paste a setup token below' : sub === 'vibe' ? ', or paste your Vibe API key below' : ''}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-state-warning">
                    <X className="size-3.5" /> {info.name} isn’t installed there — run the setup line from Machines, or <code className="hive-kbd">{sub === 'vibe' ? 'uv tool install mistral-vibe' : `npm i -g ${sub === 'codex' ? '@openai/codex' : '@anthropic-ai/claude-code'}`}</code>
                  </span>
                )}
              </div>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-text-secondary">Account name (optional)</span>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={sub === 'claude_code' ? 'e.g. Main, Worker 1, Riya’s Pro' : 'e.g. Main'} maxLength={60} />
                <span className="mt-1 block text-[11.5px] text-text-muted">Helps tell several accounts apart. Add as many accounts as you have — each needs its own setup token, made while logged in to <b>that</b> account.</span>
              </label>
              {(sub === 'claude_code' || sub === 'vibe') && (
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-text-secondary">{sub === 'vibe' ? 'Vibe API key (optional)' : 'Setup token (optional)'}</span>
                  <SecretInput value={token} onChange={(e) => setToken(e.target.value)} placeholder={sub === 'vibe' ? 'Your Vibe key' : 'sk-ant-oat01-…'} />
                  <span className="mt-1 block text-[11.5px] text-text-muted">{info.tokenHint}. Stored encrypted; sent only to that machine.</span>
                </label>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={submit} loading={busy} disabled={!machineId}>
                  Connect {info.name}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-bg-surface p-2 ring-1 ring-[var(--hive-line)]">
      <code className="hive-scroll min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11.5px]">{text}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
          })
        }}
        className="grid size-7 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary"
        aria-label="Copy"
      >
        {copied ? <Check className="size-3.5 text-state-success" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}
