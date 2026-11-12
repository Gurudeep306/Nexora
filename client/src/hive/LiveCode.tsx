import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Code2, FilePen, FilePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { useHive } from './store'
import type { AgentRow, HiveEvent } from './types'

/** What the selected agent is writing, live; or the files it has touched. */
export function LiveCode({ agent, events }: { agent: AgentRow; events: HiveEvent[] }) {
  const { code, detail, changesVersion } = useHive()
  const stream = code[agent.id]
  const touched = useMemo(() => {
    const out: string[] = []
    for (const e of events) {
      const meta = e.data.meta as { write?: boolean; path?: string } | null
      if (e.kind === 'tool_result' && meta?.write && meta.path && !out.includes(meta.path)) out.push(meta.path)
    }
    return out
  }, [events])
  const [picked, setPicked] = useState<string | null>(null)
  const [file, setFile] = useState<{ path: string; text: string } | null>(null)
  const typing = !!stream && !stream.done && Date.now() - stream.at < 8000
  const showStream = !!stream && (typing || !picked)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showStream || !detail) return
    const path = picked ?? touched[touched.length - 1]
    if (!path) return setFile(null)
    let live = true
    hiveApi
      .file(detail.task.id, path, agent.variant)
      .then((r) => live && setFile({ path, text: r.current ?? '' }))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [picked, touched, showStream, detail, agent.variant, changesVersion])

  useEffect(() => {
    const el = scroller.current
    if (el && typing) el.scrollTop = el.scrollHeight
  }, [stream?.text, typing])

  const header = showStream ? (
    <>
      {stream.tool === 'edit_file' ? <FilePen className="size-3.5 text-accent-brand" /> : <FilePlus className="size-3.5 text-accent-brand" />}
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-text-primary">{stream.path}</span>
      {typing ? (
        <span className="flex items-center gap-1.5 text-[11.5px] text-accent-brand">
          <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" /> {agent.name} is typing
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[11.5px] text-state-success">
          <Check className="size-3.5" /> Saved
        </span>
      )}
    </>
  ) : file ? (
    <>
      <Code2 className="size-3.5 text-text-muted" />
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-text-primary">{file.path}</span>
    </>
  ) : null

  return (
    <div className="hive-card flex h-full min-h-0 flex-col overflow-hidden bg-[color-mix(in_oklab,var(--color-bg-app)_70%,black)]">
      <div className="flex items-center gap-2 border-b hive-line px-4 py-2.5">{header ?? <span className="text-[12px] text-text-muted">Live code</span>}</div>
      {touched.length > 0 && (
        <div className="hive-scroll flex gap-1 overflow-x-auto border-b hive-line px-3 py-1.5">
          {touched.map((p) => (
            <button key={p} type="button" onClick={() => setPicked(p)} className={cn('shrink-0 rounded-md px-2 py-1 font-mono text-[11px]', (picked ?? (showStream ? stream.path : file?.path)) === p ? 'bg-text-primary/10 text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
              {p.split('/').pop()}
            </button>
          ))}
        </div>
      )}
      <div ref={scroller} className="hive-scroll min-h-0 flex-1 overflow-auto">
        {showStream ? (
          stream.tool === 'edit_file' ? (
            <div className="hive-code p-4">
              {stream.old && <Lines text={stream.old} tone="del" />}
              <Lines text={stream.text} tone="add" caret={typing} />
            </div>
          ) : (
            <div className="hive-code p-4">
              <Lines text={stream.text} caret={typing} />
            </div>
          )
        ) : file ? (
          <div className="hive-code p-4">
            <Lines text={file.text} />
          </div>
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <Code2 className="mx-auto mb-3 size-6 text-text-muted" />
              <p className="text-[13px] text-text-muted">When {agent.name} writes code, you'll see it here as it's typed.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Lines({ text, tone, caret }: { text: string; tone?: 'add' | 'del'; caret?: boolean }) {
  const lines = text.split('\n')
  const width = String(lines.length).length
  return (
    <div className={cn(tone === 'add' && 'bg-state-success/[0.07]', tone === 'del' && 'bg-state-error/[0.07] text-text-muted line-through decoration-state-error/40', 'rounded-md')}>
      {lines.map((l, i) => (
        <div key={i} className="flex">
          <span className="w-10 shrink-0 select-none pr-3 text-right text-text-muted/50" style={{ minWidth: `${width + 2}ch` }}>
            {tone === 'add' ? '+' : tone === 'del' ? '−' : i + 1}
          </span>
          <span className={cn('whitespace-pre-wrap break-all text-text-primary/90', caret && i === lines.length - 1 && 'hive-caret')}>{l || ' '}</span>
        </div>
      ))}
    </div>
  )
}
