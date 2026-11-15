/* ────────────────────────────────────────────────────────────────────────
   Improve: one click turns a rough prompt into an excellent brief — goal,
   context, requirements, acceptance criteria — shown next to the original
   so you can use it, tweak it, or keep your own words. Lives in every
   composer (chat, sessions, pipelines, launchpad, automations).
   ──────────────────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, HelpCircle, Loader2, Undo2, Wand2 } from 'lucide-react'
import { Button, Modal, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import type { ImproveResult } from './types'

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export function ImproveButton({
  value,
  onApply,
  mode = 'task',
  projectId = null,
  className,
  label,
}: {
  value: string
  onApply: (prompt: string, r: ImproveResult) => void
  mode?: 'task' | 'chat' | 'idea'
  projectId?: string | null
  className?: string
  /** Show a text label next to the wand. */
  label?: boolean
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<ImproveResult | null>(null)
  const [draft, setDraft] = useState('')
  const disabled = !value.trim() || busy
  const run = async () => {
    if (disabled) return
    setBusy(true)
    try {
      const r = await hiveApi.improve({ prompt: value, mode, projectId })
      setRes(r)
      setDraft(r.prompt)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Tooltip label={value.trim() ? 'Improve this prompt — clearer goal, context and acceptance criteria' : 'Write something, then let Hive improve it'}>
        <button
          type="button"
          onClick={run}
          disabled={disabled}
          className={cn(
            'group/imp relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-full px-2.5 text-[12px] font-medium transition-all disabled:opacity-40',
            busy ? 'text-accent-brand' : 'text-text-secondary hover:text-text-primary',
            'bg-accent-brand/10 hover:ring-1 hover:ring-inset hover:ring-accent-brand/30',
            className,
          )}
          aria-label="Improve prompt"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5 transition-transform group-hover/imp:-rotate-12" />}
          {(label || busy) && <span>{busy ? 'Improving…' : 'Improve'}</span>}
        </button>
      </Tooltip>
      <Modal open={!!res} onClose={() => setRes(null)} size="xl" title={<span className="inline-flex items-center gap-2"><Wand2 className="size-4 text-accent-brand" /> Improved prompt</span>} description={res ? `By ${res.model}${res.kindLabel ? ` · looks like: ${res.kindLabel.toLowerCase()}` : ''}` : undefined}>
        {res && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1.35fr]">
              <div className="min-w-0">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Yours</div>
                <div className="hive-scroll max-h-[46vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-text-primary/[0.04] p-3 text-[13px] leading-relaxed text-text-secondary">{res.original}</div>
              </div>
              <div className="hidden items-center md:flex">
                <ArrowRight className="size-4 text-text-muted" />
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-accent-brand">
                  <span>Improved — edit freely</span>
                  {draft !== res.prompt && (
                    <button type="button" onClick={() => setDraft(res.prompt)} className="inline-flex items-center gap-1 normal-case tracking-normal text-text-muted hover:text-text-primary">
                      <Undo2 className="size-3" /> reset
                    </button>
                  )}
                </div>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="hive-scroll h-[46vh] w-full resize-none rounded-xl border border-accent-brand/30 bg-bg-surface p-3 font-mono text-[12.5px] leading-relaxed outline-none focus:border-accent-brand/60" />
              </div>
            </div>
            <AnimatePresence>
              {(res.changes.length > 0 || res.questions.length > 0) && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 md:grid-cols-2">
                  {res.changes.length > 0 && (
                    <div className="rounded-xl bg-state-success/[0.07] p-3">
                      <div className="mb-1.5 text-[11.5px] font-semibold text-state-success">What changed</div>
                      <ul className="space-y-1 text-[12.5px] text-text-secondary">
                        {res.changes.map((c) => (
                          <li key={c} className="flex gap-2">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-state-success" /> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {res.questions.length > 0 && (
                    <div className="rounded-xl bg-state-warning/[0.08] p-3">
                      <div className="mb-1.5 text-[11.5px] font-semibold text-state-warning">Worth answering in the prompt</div>
                      <ul className="space-y-1 text-[12.5px] text-text-secondary">
                        {res.questions.map((q) => (
                          <li key={q} className="flex gap-2">
                            <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-state-warning" /> {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setRes(null)}>
                Keep mine
              </Button>
              <Button
                onClick={() => {
                  onApply(draft, res)
                  setRes(null)
                }}
              >
                <Wand2 /> Use improved
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
