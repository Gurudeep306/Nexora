/* ────────────────────────────────────────────────────────────────────────
   Upload a folder → a project agents can work on. The folder goes into a new
   private GitHub repository (no database size limits, full history), opens as
   a Hive project, and Hive writes a brief from its code. Folders that are
   rebuilt from the code (node_modules, .git, build output…) and secrets
   (.env) are skipped before anything is sent.
   ──────────────────────────────────────────────────────────────────────── */
import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FolderUp, Loader2, Lock } from 'lucide-react'
import { useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { errMsg } from './Improve'
import { useHive } from './store'

const SKIP_DIR = /(^|\/)(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|\.turbo|\.cache|\.parcel-cache|dist|build|out|coverage|\.venv|venv|env|__pycache__|\.pytest_cache|\.mypy_cache|\.gradle|\.idea|target|Pods|DerivedData)(\/|$)/
const SKIP_FILE = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|\.env|\.env\.[^/]*local)$/
const MAX_FILE = 95 * 1024 * 1024
const BATCH_BYTES = 24 * 1024 * 1024
const BATCH_FILES = 40

const relPath = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
const fmt = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

type Phase = { step: 'idle' } | { step: 'ready'; name: string; files: File[]; skipped: number; tooBig: File[]; bytes: number } | { step: 'uploading'; name: string; done: number; total: number; bytes: number; sent: number } | { step: 'finishing'; name: string }

export function FolderImport({ compact = false }: { compact?: boolean }) {
  const { boot, refresh, select } = useHive()
  const toast = useToast()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })
  const [isPrivate, setPrivate] = useState(true)
  const connected = (boot?.github.length ?? 0) > 0

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const all = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!all.length) return
    const keep = all.filter((f) => !SKIP_DIR.test(relPath(f)) && !SKIP_FILE.test(relPath(f)))
    const tooBig = keep.filter((f) => f.size > MAX_FILE)
    const files = keep.filter((f) => f.size <= MAX_FILE)
    const top = relPath(all[0]).split('/')[0] || 'project'
    setPhase({ step: 'ready', name: top, files, skipped: all.length - keep.length, tooBig, bytes: files.reduce((s, f) => s + f.size, 0) })
  }

  const go = async () => {
    if (phase.step !== 'ready') return
    const { name, files, bytes } = phase
    try {
      const st = await hiveApi.importStart({ name, private: isPrivate })
      let done = 0
      let sent = 0
      let failed = 0
      setPhase({ step: 'uploading', name, done, total: files.length, bytes, sent })
      // Batches by size and count; two at a time.
      const batches: File[][] = []
      let cur: File[] = []
      let size = 0
      for (const f of files) {
        if (cur.length && (cur.length >= BATCH_FILES || size + f.size > BATCH_BYTES)) {
          batches.push(cur)
          cur = []
          size = 0
        }
        cur.push(f)
        size += f.size
      }
      if (cur.length) batches.push(cur)
      let next = 0
      const worker = async () => {
        while (next < batches.length) {
          const b = batches[next++]
          const r = await hiveApi.importFiles(
            st.id,
            b.map((f) => ({ file: f, path: relPath(f) })),
          )
          failed += r.files.filter((x) => x.error).length
          done += b.length
          sent += b.reduce((s, f) => s + f.size, 0)
          setPhase({ step: 'uploading', name, done, total: files.length, bytes, sent })
        }
      }
      await Promise.all([worker(), worker()])
      setPhase({ step: 'finishing', name })
      const fin = await hiveApi.importFinish(st.id)
      await refresh()
      select(fin.project.id)
      toast.success(`${fin.files} files are in ${fin.repo}${failed ? ` (${failed} couldn't be added)` : ''} — Hive is writing a brief for the agents`)
      setPhase({ step: 'idle' })
      navigate(`/hive/p/${fin.project.id}`)
    } catch (e) {
      toast.error(errMsg(e))
      setPhase({ step: 'idle' })
    }
  }

  return (
    <section className={cn('hive-card relative overflow-hidden', compact ? 'p-4' : 'p-5')}>
      <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full opacity-[0.18] blur-3xl" style={{ background: 'oklch(72% 0.14 160)' }} />
      <input ref={input} type="file" multiple hidden onChange={pick} {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} />
      <div className="relative flex flex-wrap items-center gap-3">
        <span className="hive-hex-tile grid size-11 shrink-0 place-items-center" style={{ background: 'linear-gradient(140deg, oklch(72% 0.14 160), oklch(58% 0.15 190))' }}>
          <FolderUp className="size-5 text-white" />
        </span>
        <div className="min-w-[220px] flex-1">
          <div className="text-[14.5px] font-semibold">Upload a folder and work on it</div>
          <div className="text-[12.5px] text-text-muted">Any size of code folder. It goes into a new {isPrivate ? 'private ' : ''}GitHub repository and opens as a project the agents can work on. node_modules, build output and .env files are left out.</div>
        </div>
        {phase.step === 'idle' && (
          <button type="button" disabled={!connected} onClick={() => input.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-brand px-3.5 text-[13px] font-medium text-on-accent-brand disabled:opacity-50" title={connected ? undefined : 'Connect GitHub first'}>
            <FolderUp className="size-4" /> Choose a folder
          </button>
        )}
      </div>
      {!connected && phase.step === 'idle' && <p className="relative mt-2 text-[12px] text-state-warning">Connect GitHub first (Your GitHub) — the folder is kept in a private repository there.</p>}
      {phase.step === 'ready' && (
        <div className="relative mt-4 rounded-xl bg-text-primary/[0.035] p-3 text-[12.5px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium">{phase.name}</span>
            <span className="text-text-muted">
              {phase.files.length} files · {fmt(phase.bytes)}
            </span>
            {phase.skipped > 0 && <span className="text-text-muted">{phase.skipped} left out (dependencies, build output, secrets)</span>}
            {phase.tooBig.length > 0 && <span className="text-state-warning">{phase.tooBig.length} over 95 MB can’t go into a repository: {phase.tooBig.slice(0, 3).map((f) => f.name).join(', ')}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-text-secondary">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} className="accent-[var(--color-accent-brand)]" />
              <Lock className="size-3.5" /> Private repository
            </label>
            <span className="ml-auto flex gap-2">
              <button type="button" onClick={() => setPhase({ step: 'idle' })} className="h-8 rounded-lg px-3 text-text-muted hover:bg-text-primary/[0.06]">
                Cancel
              </button>
              <button type="button" disabled={!phase.files.length} onClick={go} className="h-8 rounded-lg bg-accent-brand px-3 font-medium text-on-accent-brand disabled:opacity-50">
                Upload {phase.files.length} files
              </button>
            </span>
          </div>
        </div>
      )}
      {phase.step === 'uploading' && (
        <div className="relative mt-4">
          <div className="flex justify-between text-[12px] text-text-muted">
            <span>
              Uploading {phase.name}… {phase.done}/{phase.total} files
            </span>
            <span className="tabular-nums">
              {fmt(phase.sent)} / {fmt(phase.bytes)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-text-primary/[0.07]">
            <motion.div className="h-full rounded-full bg-accent-brand" animate={{ width: `${phase.bytes ? (phase.sent / phase.bytes) * 100 : 0}%` }} />
          </div>
        </div>
      )}
      {phase.step === 'finishing' && (
        <div className="relative mt-4 inline-flex items-center gap-2 text-[12.5px] text-text-secondary">
          <Loader2 className="size-4 animate-spin" /> Saving {phase.name} to GitHub and opening it as a project…
        </div>
      )}
    </section>
  )
}
