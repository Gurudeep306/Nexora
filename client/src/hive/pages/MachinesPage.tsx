import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Apple, Check, ChevronRight, Copy, Cpu, Download, Folder, FolderGit2, GitBranch, HardDrive, KeyRound, Laptop, Loader2, MonitorSmartphone, Plus, RotateCw, Server, ShieldAlert, ShieldCheck, ShieldOff, SquareTerminal, Trash2, X, Zap } from 'lucide-react'
import { Button, ConfirmDialog, Modal, Tooltip, useToast } from '@/components/ui'
import { API_BASE } from '@/lib/api'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { useHive } from '../store'
import type { Machine } from '../types'
import { timeAgo } from '../ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')
const serverUrl = () => (API_BASE || window.location.origin).replace(/\/+$/, '')

const POLICY = {
  ask: { icon: ShieldAlert, label: 'Ask me', hint: 'Agents can edit files; every command waits for a staff member to approve it.', tone: 'var(--color-state-warning)' },
  auto: { icon: Zap, label: 'Autonomous', hint: 'Agents run commands without asking. Use on a throwaway VM or container.', tone: 'var(--color-state-success)' },
  read: { icon: ShieldOff, label: 'Read-only', hint: 'Agents can only read files. No writes, no commands.', tone: 'var(--color-text-muted)' },
} as const

export function bridgeCommands(token: string, os: 'unix' | 'windows') {
  const url = serverUrl()
  if (os === 'windows')
    return `iwr -Headers @{Authorization="Bearer ${token}"} ${url}/api/hive-bridge/script -OutFile hive-bridge.js; node hive-bridge.js --server ${url} --token ${token} --root $HOME\\code`
  return `curl -fsSL -H "Authorization: Bearer ${token}" ${url}/api/hive-bridge/script -o hive-bridge.js && node hive-bridge.js --server ${url} --token ${token} --root ~/code`
}

export default function MachinesPage() {
  const { machines, approvals, answerApproval, refreshMachines } = useHive()
  const [adding, setAdding] = useState(false)
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-8 sm:px-8">
      <div className="hive-card relative overflow-hidden p-6 sm:p-7">
        <div className="hive-comb pointer-events-none absolute inset-0" />
        <div className="relative flex flex-wrap items-start gap-5">
          <span className="hive-tile size-12" style={{ ['--tile' as string]: 'var(--color-state-success)' }}>
            <Server className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Machines</h1>
            <p className="mt-1 max-w-2xl text-[13.5px] text-text-muted">
              Give agents a real computer: your laptop, a home server or a free cloud VM. They read and write real folders, install packages, run tests and dev servers — and you watch and approve from any browser. The bridge is one file, needs Node 18+, and opens no ports.
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <Plus /> Connect a machine
          </Button>
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Laptop, t: 'Your computer', s: 'Work on local folders while you’re at the desk.' },
            { icon: Server, t: 'Always-on server', s: 'Oracle/AWS/GCP free tier — agents keep working when your laptop sleeps.' },
            { icon: MonitorSmartphone, t: 'From anywhere', s: 'Phone or any browser: watch, steer and approve commands.' },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border hive-line bg-bg-app/40 p-3.5">
              <x.icon className="size-4 text-accent-brand" />
              <div className="mt-1.5 text-[13px] font-medium">{x.t}</div>
              <div className="text-[12px] text-text-muted">{x.s}</div>
            </div>
          ))}
        </div>
      </div>

      {approvals.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
            <ShieldAlert className="size-4 text-state-warning" /> Waiting for approval · {approvals.length}
          </h2>
          <div className="space-y-2">
            {approvals.map((a) => (
              <div key={a.id} className="hive-card flex flex-wrap items-center gap-3 p-4 ring-1 ring-state-warning/30">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-text-muted">
                    <b className="text-text-primary">{a.agent}</b> on {a.machine} · <span className="font-mono">{a.folder}</span> · {timeAgo(a.at)}
                  </div>
                  <pre className="hive-term mt-1.5 overflow-x-auto rounded-lg px-3 py-2">$ {a.command}</pre>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" onClick={() => answerApproval(a.id, true)}>
                    <Check /> Run it
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => answerApproval(a.id, false)}>
                    <X /> Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {machines.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <MachineCard m={m} onChanged={refreshMachines} />
          </motion.div>
        ))}
        {!machines.length && (
          <button type="button" onClick={() => setAdding(true)} className="hive-card hive-card-hover col-span-full flex flex-col items-center gap-2 border-dashed p-10 text-center">
            <Server className="size-6 text-text-muted" />
            <span className="text-[14px] font-medium">No machines yet</span>
            <span className="text-[12.5px] text-text-muted">Connect one in under a minute.</span>
          </button>
        )}
      </section>

      <AddMachine open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

function MachineCard({ m, onChanged }: { m: Machine; onChanged: () => void }) {
  const { boot } = useHive()
  const toast = useToast()
  const navigate = useNavigate()
  const [del, setDel] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [browse, setBrowse] = useState(false)
  const P = POLICY[m.policy]
  const canManage = !!boot && (boot.me.admin || boot.me.username === m.createdBy)
  return (
    <div className={cn('hive-card overflow-hidden', m.online && 'ring-1 ring-state-success/25')}>
      <div className="flex items-start gap-3 p-5">
        <span className="relative">
          <span className="hive-tile size-11" style={{ ['--tile' as string]: m.online ? 'var(--color-state-success)' : 'var(--color-text-muted)' }}>
            {m.info.platform?.startsWith('darwin') ? <Apple className="size-5" /> : m.info.platform?.startsWith('win') ? <Laptop className="size-5" /> : <Server className="size-5" />}
          </span>
          <span className={cn('absolute -right-0.5 -top-0.5 size-3 rounded-full ring-2 ring-[var(--color-bg-surface)]', m.online ? 'hive-ping bg-state-success' : 'bg-text-muted/50')} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{m.name}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-medium', m.online ? 'bg-state-success/15 text-state-success' : 'bg-text-primary/[0.07] text-text-muted')}>{m.online ? 'online' : m.lastSeen ? `seen ${timeAgo(m.lastSeen)} ago` : 'never connected'}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-text-muted">
            {m.info.hostname && <span>{m.info.hostname}</span>}
            {m.info.platform && <span>{m.info.platform}</span>}
            {m.info.cpus && (
              <span className="inline-flex items-center gap-1">
                <Cpu className="size-3" /> {m.info.cpus} cores
              </span>
            )}
            {m.info.memGb && (
              <span className="inline-flex items-center gap-1">
                <HardDrive className="size-3" /> {m.info.memGb} GB
              </span>
            )}
            {m.info.node && <span>node {m.info.node}</span>}
          </div>
          {m.info.roots?.length ? <div className="mt-1 truncate font-mono text-[11px] text-text-muted">{m.info.roots.join(' · ')}</div> : null}
        </div>
      </div>
      <div className="border-t hive-line px-5 py-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-medium text-text-muted">
          <P.icon className="size-3.5" style={{ color: P.tone }} /> Agent permissions
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-text-primary/[0.05] p-1">
          {(Object.keys(POLICY) as (keyof typeof POLICY)[]).map((k) => (
            <Tooltip key={k} label={POLICY[k].hint}>
              <button
                type="button"
                disabled={!canManage}
                onClick={() =>
                  hiveApi
                    .updateMachine(m.id, { policy: k })
                    .then(() => (onChanged(), toast.success(`${m.name}: ${POLICY[k].label}`)))
                    .catch((e) => toast.error(errMsg(e)))
                }
                className={cn('h-8 rounded-lg text-[12px] transition-colors disabled:opacity-60', m.policy === k ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
              >
                {POLICY[k].label}
              </button>
            </Tooltip>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-text-muted">{P.hint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t hive-line px-4 py-2.5">
        <Button size="sm" variant="ghost" disabled={!m.online} onClick={() => setBrowse(true)}>
          <Folder /> Folders & clone
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate('/hive/p/new')}>
          <FolderGit2 /> New project here
        </Button>
        {canManage && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() =>
                hiveApi
                  .rotateMachine(m.id)
                  .then((r) => setToken(r.token))
                  .catch((e) => toast.error(errMsg(e)))
              }
            >
              <RotateCw /> New token
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setDel(true)} aria-label="Remove">
              <Trash2 />
            </Button>
          </>
        )}
      </div>
      {token && (
        <div className="border-t hive-line p-4">
          <TokenCommands token={token} />
        </div>
      )}
      <FolderBrowser m={m} open={browse} onClose={() => setBrowse(false)} />
      <ConfirmDialog open={del} onClose={() => setDel(false)} onConfirm={() => hiveApi.deleteMachine(m.id).then(() => (setDel(false), onChanged()))} title={`Remove ${m.name}?`} message="Its token stops working immediately. Files on the machine are untouched." confirmLabel="Remove" danger />
    </div>
  )
}

function TokenCommands({ token }: { token: string }) {
  const [os, setOs] = useState<'unix' | 'windows'>(navigator.platform?.toLowerCase().includes('win') ? 'windows' : 'unix')
  const [copied, setCopied] = useState(false)
  const cmd = bridgeCommands(token, os)
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[12px] font-medium">Run this on the machine</span>
        <div className="ml-auto grid grid-cols-2 gap-0.5 rounded-lg bg-text-primary/[0.06] p-0.5">
          {(['unix', 'windows'] as const).map((o) => (
            <button key={o} type="button" onClick={() => setOs(o)} className={cn('h-6 rounded-md px-2.5 text-[11.5px]', os === o ? 'bg-bg-surface shadow-sm' : 'text-text-muted')}>
              {o === 'unix' ? 'macOS / Linux' : 'Windows'}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <pre className="hive-term overflow-x-auto rounded-xl p-3 pr-12 text-[11.5px]">{cmd}</pre>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(cmd)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          aria-label="Copy"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-text-muted">
        <KeyRound className="mt-0.5 size-3 shrink-0" /> The token is shown once. Change <span className="font-mono">--root</span> to the folder agents may use (repeat it for several). Keep it running with <span className="font-mono">pm2 start hive-bridge.js -- …</span> or a systemd service on servers.
      </p>
    </div>
  )
}

function AddMachine({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const { machines, refreshMachines } = useHive()
  const [name, setName] = useState('')
  const [created, setCreated] = useState<{ id: string; token: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) {
      setName('')
      setCreated(null)
    }
  }, [open])
  // Wait for the bridge to say hello.
  useEffect(() => {
    if (!created) return
    const t = setInterval(refreshMachines, 3000)
    return () => clearInterval(t)
  }, [created, refreshMachines])
  const live = created ? machines.find((m) => m.id === created.id)?.online : false
  return (
    <Modal open={open} onClose={onClose} title="Connect a machine" description="Name it, run one command on it, done." size="lg">
      {!created ? (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            try {
              setCreated(await hiveApi.addMachine(name.trim()))
              refreshMachines()
            } catch (err) {
              toast.error(errMsg(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My laptop, Oracle VM" className="h-10 w-full rounded-lg border hive-line bg-transparent px-3 text-[14px] outline-none focus:border-accent-brand/50" />
          <div className="flex justify-end">
            <Button type="submit" loading={busy} disabled={!name.trim()}>
              Create token
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <ol className="space-y-3 text-[13px]">
            <li className="flex gap-3">
              <Step n={1} done /> Machine created
            </li>
            <li className="flex gap-3">
              <Step n={2} done={!!live} />
              <div className="min-w-0 flex-1">
                <div className="mb-2">Run the bridge on it (Node 18+)</div>
                <TokenCommands token={created.token} />
              </div>
            </li>
            <li className="flex items-center gap-3">
              <Step n={3} done={!!live} />
              {live ? (
                <span className="font-medium text-state-success">Connected — agents can use it now.</span>
              ) : (
                <span className="inline-flex items-center gap-2 text-text-muted">
                  <Loader2 className="size-4 animate-spin" /> Waiting for the bridge to connect…
                </span>
              )}
            </li>
          </ol>
          <div className="flex justify-end">
            <Button onClick={onClose} variant={live ? 'primary' : 'secondary'}>
              {live ? 'Done' : 'Close — finish later'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Step({ n, done }: { n: number; done?: boolean }) {
  return <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold', done ? 'bg-state-success text-white' : 'bg-text-primary/[0.08] text-text-muted')}>{done ? <Check className="size-3.5" /> : n}</span>
}

function FolderBrowser({ m, open, onClose }: { m: Machine; open: boolean; onClose: () => void }) {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [data, setData] = useState<{ path: string; roots: string[]; dirs: { name: string; path: string; git: boolean }[] } | null>(null)
  const [path, setPath] = useState<string | undefined>(undefined)
  const [cloning, setCloning] = useState<string | null>(null)
  const [term, setTerm] = useState<{ folder: string; out: string } | null>(null)
  const [cmd, setCmd] = useState('')
  useEffect(() => {
    if (!open) return
    setData(null)
    hiveApi
      .folders(m.id, path)
      .then(setData)
      .catch((e) => toast.error(errMsg(e)))
  }, [open, path, m.id, toast])
  const gh = (boot?.projects ?? []).filter((p) => p.repo_owner)
  return (
    <Modal open={open} onClose={onClose} title={`${m.name} — folders`} description="Browse the bridge’s allowed folders, clone a project’s repo here, or run a quick command." size="xl">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1 text-[12px]">
            {data?.roots.map((r) => (
              <button key={r} type="button" onClick={() => setPath(r)} className="hive-chip font-mono">
                {r}
              </button>
            ))}
          </div>
          <div className="mb-2 truncate font-mono text-[12px] text-text-muted">{data?.path ?? '…'}</div>
          <div className="hive-card hive-scroll max-h-80 overflow-y-auto p-1">
            {!data && <div className="hive-shimmer m-2 h-24 rounded-lg" />}
            {data?.dirs.map((d) => (
              <div key={d.path} className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-text-primary/[0.04]">
                <button type="button" onClick={() => setPath(d.path)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px]">
                  {d.git ? <GitBranch className="size-3.5 text-state-success" /> : <Folder className="size-3.5 text-text-muted" />}
                  <span className="truncate">{d.name}</span>
                  <ChevronRight className="size-3.5 text-text-muted opacity-0 group-hover:opacity-100" />
                </button>
                <button type="button" onClick={() => setTerm({ folder: d.path, out: '' })} className="rounded-md px-2 py-0.5 text-[11px] text-text-muted opacity-0 hover:bg-text-primary/[0.07] hover:text-text-primary group-hover:opacity-100">
                  <SquareTerminal className="inline size-3" /> terminal
                </button>
              </div>
            ))}
            {data && !data.dirs.length && <p className="p-3 text-[12.5px] text-text-muted">Empty.</p>}
          </div>
          {term && (
            <div className="mt-3">
              <div className="mb-1 truncate font-mono text-[11.5px] text-text-muted">{term.folder}</div>
              <pre className="hive-term max-h-60 overflow-auto rounded-t-xl p-3">{term.out || 'Ready.'}</pre>
              <form
                className="hive-term flex gap-2 rounded-b-xl border-t border-white/10 px-3 py-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const c = cmd
                  setCmd('')
                  try {
                    const r = await hiveApi.exec(m.id, { folder: term.folder, command: c })
                    setTerm((t) => t && { ...t, out: `${t.out}❯ ${c}\n${r.output}\n` })
                  } catch (err) {
                    setTerm((t) => t && { ...t, out: `${t.out}❯ ${c}\n${errMsg(err)}\n` })
                  }
                }}
              >
                <span className="text-state-success">❯</span>
                <input autoFocus value={cmd} onChange={(e) => setCmd(e.target.value)} className="flex-1 bg-transparent outline-none" placeholder="git status" />
              </form>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="text-[12.5px] font-semibold">Clone a project here</div>
          <p className="text-[11.5px] text-text-muted">Clones the repo into {data?.path ?? 'this folder'} using the project’s GitHub token (passed for this one command, never stored) and links it, so new sessions can run commands and tests.</p>
          {gh.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!!cloning}
              onClick={async () => {
                setCloning(p.id)
                try {
                  const r = await hiveApi.clone(m.id, { projectId: p.id, parent: data?.path })
                  toast.success(r.existed ? 'Already there — linked' : 'Cloned and linked', r.path)
                  await refresh()
                } catch (e) {
                  toast.error(errMsg(e))
                } finally {
                  setCloning(null)
                }
              }}
              className="hive-card hive-card-hover flex w-full items-center gap-2 p-3 text-left disabled:opacity-50"
            >
              {cloning === p.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4 text-accent-brand" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{p.name}</span>
                <span className="block truncate font-mono text-[11px] text-text-muted">
                  {p.repo_owner}/{p.repo_name}
                </span>
              </span>
              {p.machine_id === m.id && <ShieldCheck className="size-4 text-state-success" aria-label="Linked" />}
            </button>
          ))}
          {!gh.length && <p className="text-[12px] text-text-muted">Create a GitHub project first.</p>}
        </div>
      </div>
    </Modal>
  )
}
