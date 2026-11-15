import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react'
import '@/lib/monaco'
import { Check, ExternalLink, FileDiff, GitCommitHorizontal, GitPullRequest, Pencil, RotateCcw, Save, Trophy } from 'lucide-react'
import { Button, Input, Textarea, Tooltip, useToast } from '@/components/ui'
import { useMonacoAppTheme } from '@/theme/useMonacoAppTheme'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { useHive } from './store'
import type { AgentRow, Change } from './types'
import { ProviderGlyph } from './ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export function languageOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    js: 'javascript', cjs: 'javascript', mjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', md: 'markdown', css: 'css', scss: 'scss',
    html: 'html', py: 'python', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', rb: 'ruby', php: 'php', cs: 'csharp', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp',
    sh: 'shell', yml: 'yaml', yaml: 'yaml', sql: 'sql', swift: 'swift', xml: 'xml', toml: 'ini', dockerfile: 'dockerfile',
  }
  return map[ext] ?? (path.toLowerCase().endsWith('dockerfile') ? 'dockerfile' : 'plaintext')
}

export function ChangesView({ taskId, agents }: { taskId: string; agents: AgentRow[] }) {
  const { detail, changesVersion, refreshDetail } = useHive()
  const toast = useToast()
  const compareAgents = agents.filter((a) => a.variant === a.id)
  const [variant, setVariant] = useState('main')
  const [changes, setChanges] = useState<Change[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await hiveApi.changes(taskId, variant)
      setChanges(r.changes)
      setSelected((s) => (s && r.changes.some((c) => c.path === s) ? s : (r.changes[0]?.path ?? null)))
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [taskId, variant, toast])

  useEffect(() => {
    load()
  }, [load, changesVersion])

  // In compare mode default to the first agent's copy until one is adopted.
  useEffect(() => {
    if (compareAgents.length && variant === 'main' && !changes.length && !loading) setVariant(compareAgents[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareAgents.length, loading])

  const totals = changes.reduce((a, c) => ({ add: a.add + c.additions, del: a.del + c.deletions }), { add: 0, del: 0 })
  const task = detail?.task

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {compareAgents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 hive-card p-2">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Results</span>
          {[{ id: 'main', name: 'Adopted', provider: null as AgentRow['provider'] | null, status: '' }, ...compareAgents].map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setVariant(a.id)}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium', variant === a.id ? 'bg-accent-brand/12 text-accent-brand' : 'text-text-secondary hover:bg-text-primary/5')}
            >
              {a.provider ? <ProviderGlyph provider={a.provider} size="xs" /> : <Trophy className="size-3.5" />}
              {a.name}
              {'model' in a && <span className="text-[10px] font-normal text-text-muted">{(a as AgentRow).model}</span>}
            </button>
          ))}
          {variant !== 'main' && (
            <Button
              size="sm"
              className="ml-auto"
              onClick={async () => {
                try {
                  await hiveApi.adopt(taskId, variant)
                  toast.success('Adopted — this result is now the working copy to commit')
                  setVariant('main')
                  refreshDetail()
                } catch (e) {
                  toast.error(errMsg(e))
                }
              }}
            >
              <Trophy /> Adopt this result
            </Button>
          )}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden hive-card">
          <div className="flex items-center justify-between border-b hive-line px-3 py-2 text-xs">
            <span className="font-medium text-text-primary">
              {changes.length} file{changes.length === 1 ? '' : 's'}
            </span>
            <span className="font-mono tabular-nums">
              <span className="text-state-success">+{totals.add}</span> <span className="text-state-error">−{totals.del}</span>
            </span>
          </div>
          <div className="hive-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
            {loading ? (
              <div className="p-3 text-xs text-text-muted">Loading…</div>
            ) : !changes.length ? (
              <div className="p-4 text-center text-xs text-text-muted">
                <FileDiff className="mx-auto mb-2 size-5" />
                No changes yet. Agents' edits appear here live.
              </div>
            ) : (
              changes.map((c) => (
                <button
                  key={c.path}
                  type="button"
                  onClick={() => setSelected(c.path)}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left', selected === c.path ? 'bg-accent-brand/10' : 'hover:bg-text-primary/5')}
                >
                  <span
                    className={cn(
                      'grid size-4 shrink-0 place-items-center rounded text-[9px] font-bold',
                      c.status === 'added' ? 'bg-state-success/15 text-state-success' : c.status === 'deleted' ? 'bg-state-error/15 text-state-error' : 'bg-state-warning/15 text-state-warning',
                    )}
                  >
                    {c.status[0].toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11.5px] text-text-primary">{c.path.split('/').pop()}</span>
                    <span className="block truncate text-[10px] text-text-muted">
                      {c.path.includes('/') ? c.path.slice(0, c.path.lastIndexOf('/')) : '/'} · {c.author.replace(/^agent:/, '')}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] tabular-nums">
                    <span className="text-state-success">+{c.additions}</span> <span className="text-state-error">−{c.deletions}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          {task && variant === 'main' && <CommitBox taskId={taskId} changes={changes.length} />}
        </aside>

        <div className="min-h-[420px] overflow-hidden hive-card">
          {selected ? <DiffPane key={`${variant}:${selected}`} taskId={taskId} path={selected} variant={variant} change={changes.find((c) => c.path === selected) ?? null} onSaved={load} version={changesVersion} /> : <div className="grid h-full place-items-center text-sm text-text-muted">Select a file to see its diff</div>}
        </div>
      </div>
    </div>
  )
}

function DiffPane({ taskId, path, variant, change, onSaved, version }: { taskId: string; path: string; variant: string; change: Change | null; onSaved: () => void; version: number }) {
  const toast = useToast()
  const theme = useMonacoAppTheme()
  const [file, setFile] = useState<{ base: string | null; current: string | null; status: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const editorRef = useRef<Parameters<DiffOnMount>[0] | null>(null)
  // The wrapper keeps the models (disposing them itself races the widget);
  // free them once the editor is gone.
  useEffect(
    () => () => {
      const models = editorRef.current?.getModel()
      setTimeout(() => {
        models?.original.dispose()
        models?.modified.dispose()
      }, 0)
    },
    [],
  )

  useEffect(() => {
    if (dirty) return
    let live = true
    hiveApi
      .file(taskId, path, variant)
      .then((r) => live && setFile({ base: r.base, current: r.current, status: r.status }))
      .catch((e) => toast.error(errMsg(e)))
    return () => {
      live = false
    }
  }, [taskId, path, variant, version, dirty, toast])

  const save = async () => {
    const text = editorRef.current?.getModifiedEditor().getValue()
    if (text == null) return
    setBusy(true)
    try {
      await hiveApi.saveFile(taskId, path, text, variant)
      setDirty(false)
      setEditing(false)
      toast.success('Saved to the working copy')
      onSaved()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const options = useMemo(
    () => ({
      readOnly: !editing,
      originalEditable: false,
      ariaLabel: 'Changed file: new version',
      // Monaco's newer edit-context input ignores aria labels; the textarea keeps them.
      editContext: false,
      originalAriaLabel: 'Changed file: original version',
      renderSideBySide: typeof window !== 'undefined' && window.innerWidth > 1100,
      minimap: { enabled: false },
      fontSize: 12.5,
      fontFamily: theme.fontFamily,
      fontLigatures: theme.ligatures,
      scrollBeyondLastLine: false,
      renderOverviewRuler: false,
      automaticLayout: true,
      hideUnchangedRegions: { enabled: !editing },
      padding: { top: 8 },
    }),
    [editing, theme.fontFamily, theme.ligatures],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b hive-line px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-primary">{path}</span>
        {file && <span className="text-[11px] capitalize text-text-muted">{file.status}</span>}
        {change && (
          <span className="font-mono text-[11px] tabular-nums">
            <span className="text-state-success">+{change.additions}</span> <span className="text-state-error">−{change.deletions}</span>
          </span>
        )}
        {editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => (setEditing(false), setDirty(false))}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={busy} disabled={!dirty}>
              <Save /> Save
            </Button>
          </>
        ) : (
          <>
            {file?.status !== 'deleted' && (
              <Tooltip label="Edit the result by hand — your change joins the working copy">
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
              </Tooltip>
            )}
            <Tooltip label="Discard this file's changes">
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await hiveApi.revertFile(taskId, path, variant)
                    onSaved()
                  } catch (e) {
                    toast.error(errMsg(e))
                  }
                }}
              >
                <RotateCcw /> Revert
              </Button>
            </Tooltip>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {file ? (
          <DiffEditor
            original={file.base ?? ''}
            modified={file.current ?? ''}
            language={languageOf(path)}
            theme={theme.theme}
            beforeMount={theme.beforeMount}
            options={options}
            keepCurrentOriginalModel
            keepCurrentModifiedModel
            onMount={(ed) => {
              editorRef.current = ed
              // Both sides need a name for screen readers (the option alone misses the original side).
              ed.getOriginalEditor().updateOptions({ ariaLabel: 'Changed file: original version' })
              ed.getModifiedEditor().updateOptions({ ariaLabel: 'Changed file: new version' })
              ed.getModifiedEditor().onDidChangeModelContent(() => setDirty(true))
            }}
          />
        ) : (
          <div className="hive-shimmer h-full" />
        )}
      </div>
    </div>
  )
}

function CommitBox({ taskId, changes }: { taskId: string; changes: number }) {
  const { detail, refreshDetail } = useHive()
  const toast = useToast()
  const task = detail?.task
  const [message, setMessage] = useState('')
  const [branch, setBranch] = useState(task?.branch ?? '')
  const [openPr, setOpenPr] = useState(true)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (task) {
      setBranch(task.branch ?? '')
      setMessage((m) => m || task.title)
    }
  }, [task])
  if (!task) return null

  const commit = async () => {
    setBusy(true)
    try {
      const summary = task.summary ? `\n\n${task.summary}` : ''
      const r = await hiveApi.commit(taskId, {
        message,
        branch,
        openPr: openPr && !task.pr_url,
        prTitle: message.split('\n')[0],
        prBody: `${task.prompt}${summary}\n\n---\nBuilt with Nexora Hive (${task.mode} mode).`,
      })
      toast.success(r.pr ? `Pull request #${r.pr.number} opened` : `Committed ${r.files} files to ${r.branch}`)
      refreshDetail()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 border-t hive-line p-2.5">
      {task.pr_url && (
        <a href={task.pr_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-state-success/10 px-2.5 py-2 text-xs font-medium text-state-success hover:bg-state-success/15">
          <GitPullRequest className="size-3.5" /> PR #{task.pr_number} open <ExternalLink className="ml-auto size-3" />
        </a>
      )}
      {task.head_sha && !task.pr_url && (
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <Check className="size-3 text-state-success" /> Committed {task.head_sha.slice(0, 7)} to {task.branch}
        </div>
      )}
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Commit message" className="min-h-[4.5rem] resize-y text-xs leading-relaxed" />
      <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch" className="h-8 font-mono text-[11px]" />
      {!task.pr_url && (
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-text-secondary">
          <input type="checkbox" checked={openPr} onChange={(e) => setOpenPr(e.target.checked)} className="accent-[var(--color-accent-brand)]" />
          Open a pull request
        </label>
      )}
      <Button className="w-full" size="sm" onClick={commit} loading={busy} disabled={!changes || !message.trim() || !branch.trim() || task.status === 'running'}>
        {task.pr_url ? <GitCommitHorizontal /> : openPr ? <GitPullRequest /> : <GitCommitHorizontal />}
        {task.pr_url ? 'Push update to PR' : openPr ? 'Commit & open PR' : 'Commit'}
      </Button>
      {task.status === 'running' && <p className="text-center text-[10px] text-text-muted">Agents are still working — commit when they finish.</p>}
    </div>
  )
}
