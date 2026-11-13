/* ────────────────────────────────────────────────────────────────────────
   Subscription agents — Claude Code and Codex on your own plans, no API
   credits. The CLIs run on an always-on worker machine (the bridge); Hive
   drives them, shows the plan's usage windows, and hands work to another
   model when a plan limit is hit.
   ──────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Copy, Cpu, ExternalLink, Loader2, Plus, Server, X } from 'lucide-react'
import { Button, Input, Modal, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentMark } from './agents'
import { hiveApi } from './api'
import { errMsg } from './Improve'
import { useHive } from './store'
import type { CliStatus, HiveKey, PlanUsage } from './types'
import { PlanWindows, timeAgo } from './ui'

type Sub = 'claude_code' | 'codex'
const INFO: Record<Sub, { name: string; plan: string; model: string; login: string; token: string; tokenHint: string }> = {
  claude_code: { name: 'Claude Code', plan: 'Claude Pro / Max', model: 'claude-opus-5-5', login: 'claude', token: 'claude setup-token', tokenHint: 'Paste the token from `claude setup-token` (optional if the machine is already logged in)' },
  codex: { name: 'Codex', plan: 'ChatGPT Plus / Pro', model: 'gpt-5-codex', login: 'codex login --device-auth', token: 'codex login --device-auth', tokenHint: 'Codex uses the machine’s own login — leave empty after `codex login --device-auth`' },
}

const planOf = (k: HiveKey) => {
  const r = k.rateLimit as unknown as PlanUsage | null
  return r && (r as PlanUsage).plan ? r : null
}

export function SubscriptionsPanel({ onConnect }: { onConnect: (s: Sub) => void }) {
  const { boot, machines } = useHive()
  const keys = boot?.keys ?? []
  const anyMachine = machines.length > 0
  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">Your subscriptions — no API credits</h2>
          <p className="text-[13px] text-text-muted">Claude Code and Codex run on an always-on machine with your plan. Every staff member can use them, from anywhere.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(Object.keys(INFO) as Sub[]).map((s, i) => {
          const list = keys.filter((k) => k.provider === s)
          return (
            <motion.div key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} className="hive-card relative overflow-hidden p-4">
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-20 blur-3xl" style={{ background: s === 'codex' ? 'oklch(72% 0.12 165)' : 'oklch(70% 0.14 40)' }} />
              <div className="relative flex items-center gap-3">
                <AgentMark provider={s} model={INFO[s].model} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{INFO[s].name}</div>
                  <div className="text-[12px] text-text-muted">{INFO[s].plan} · runs on a machine</div>
                </div>
                <Button size="sm" variant={list.length ? 'ghost' : 'primary'} onClick={() => onConnect(s)}>
                  <Plus /> {list.length ? 'Another' : 'Connect'}
                </Button>
              </div>
              <div className="relative mt-3 space-y-2">
                {list.map((k) => (
                  <SubKey key={k.id} k={k} machineName={machines.find((m) => m.id === k.machineId)?.name} online={machines.find((m) => m.id === k.machineId)?.online ?? false} />
                ))}
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

function SubKey({ k, machineName, online }: { k: HiveKey; machineName?: string; online: boolean }) {
  const plan = planOf(k)
  return (
    <div className="rounded-xl bg-text-primary/[0.035] p-3">
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className={cn('size-2 rounded-full', online ? 'bg-state-success' : 'bg-text-muted/50')} />
        <span className="truncate font-medium">{k.label}</span>
        <span className="ml-auto truncate text-text-muted">
          <Server className="mr-1 inline size-3" />
          {machineName ?? 'machine'} · {online ? 'online' : 'offline'}
        </span>
      </div>
      <div className="mt-2">
        <PlanWindows windows={plan?.windows} compact />
      </div>
    </div>
  )
}

export function SubscriptionDialog({ sub, onClose }: { sub: Sub | null; onClose: () => void }) {
  const toast = useToast()
  const { machines } = useHive()
  const [machineId, setMachineId] = useState('')
  const [token, setToken] = useState('')
  const [detect, setDetect] = useState<{ loading: boolean; status?: CliStatus; online?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const info = sub ? INFO[sub] : null
  const sorted = useMemo(() => [...machines].sort((a, b) => Number(b.online) - Number(a.online)), [machines])
  useEffect(() => {
    if (!sub) return
    setToken('')
    setMachineId(sorted.find((m) => m.online)?.id ?? sorted[0]?.id ?? '')
  }, [sub, sorted])
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
      const r = await hiveApi.addSubscription({ provider: sub, machineId, token: token.trim() || undefined })
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
                    <button key={m.id} type="button" onClick={() => setMachineId(m.id)} className={cn('flex items-center gap-2.5 rounded-xl border p-3 text-left', machineId === m.id ? 'border-accent-brand/50 bg-accent-brand/[0.06]' : 'hive-line hover:bg-text-primary/[0.03]')}>
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
                        Not logged in — run <code className="hive-kbd">{info.login}</code> on the machine{sub === 'claude_code' ? ', or paste a setup token below' : ''}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-state-warning">
                    <X className="size-3.5" /> {info.name} isn’t installed there — run the setup line from Machines, or <code className="hive-kbd">npm i -g {sub === 'codex' ? '@openai/codex' : '@anthropic-ai/claude-code'}</code>
                  </span>
                )}
              </div>
              {sub === 'claude_code' && (
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-text-secondary">Setup token (optional)</span>
                  <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="sk-ant-oat01-…" autoComplete="off" />
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
