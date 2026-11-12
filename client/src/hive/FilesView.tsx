import { useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import '@/lib/monaco'
import { ChevronRight, File, Folder, FolderOpen, Save, Search } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { useMonacoAppTheme } from '@/theme/useMonacoAppTheme'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { languageOf } from './ChangesView'
import { useHive } from './store'

interface Node {
  name: string
  path: string
  children?: Map<string, Node>
}

function buildTree(paths: string[]): Node {
  const root: Node = { name: '', path: '', children: new Map() }
  for (const p of paths) {
    const parts = p.split('/')
    let cur = root
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      let next = cur.children!.get(part)
      if (!next) {
        next = { name: part, path: parts.slice(0, i + 1).join('/'), ...(isFile ? {} : { children: new Map() }) }
        cur.children!.set(part, next)
      }
      cur = next
    })
  }
  return root
}

const sortNodes = (a: Node, b: Node) => (a.children ? 0 : 1) - (b.children ? 0 : 1) || a.name.localeCompare(b.name)

export function FilesView({ taskId }: { taskId: string }) {
  const { changesVersion } = useHive()
  const toast = useToast()
  const [paths, setPaths] = useState<string[] | null>(null)
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [meta, setMeta] = useState({ total: 0, truncated: false })

  useEffect(() => {
    let live = true
    Promise.all([hiveApi.tree(taskId), hiveApi.changes(taskId)])
      .then(([t, c]) => {
        if (!live) return
        setPaths(t.paths)
        setMeta({ total: t.total, truncated: t.truncated })
        setChanged(new Set(c.changes.map((x) => x.path)))
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load files'))
    return () => {
      live = false
    }
  }, [taskId, changesVersion, toast])

  const tree = useMemo(() => buildTree(paths ?? []), [paths])
  const matches = useMemo(() => {
    if (!query.trim() || !paths) return null
    const q = query.toLowerCase()
    return paths.filter((p) => p.toLowerCase().includes(q)).slice(0, 300)
  }, [query, paths])

  const toggle = (p: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(p)) n.delete(p)
      else n.add(p)
      return n
    })

  const renderNode = (node: Node, depth: number): React.ReactNode =>
    [...node.children!.values()].sort(sortNodes).map((c) => {
      const isDir = !!c.children
      const isOpen = open.has(c.path)
      const dirty = isDir ? [...changed].some((p) => p.startsWith(`${c.path}/`)) : changed.has(c.path)
      return (
        <div key={c.path}>
          <button
            type="button"
            onClick={() => (isDir ? toggle(c.path) : setSelected(c.path))}
            className={cn('flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[12px]', selected === c.path ? 'bg-accent-brand/12 text-text-primary' : 'text-text-secondary hover:bg-text-primary/5')}
            style={{ paddingLeft: 6 + depth * 12 }}
          >
            {isDir ? (
              <>
                <ChevronRight className={cn('size-3 shrink-0 text-text-muted transition-transform', isOpen && 'rotate-90')} />
                {isOpen ? <FolderOpen className="size-3.5 shrink-0 text-accent-brand/80" /> : <Folder className="size-3.5 shrink-0 text-text-muted" />}
              </>
            ) : (
              <File className="ml-[18px] size-3.5 shrink-0 text-text-muted" />
            )}
            <span className="truncate">{c.name}</span>
            {dirty && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-state-warning" />}
          </button>
          {isDir && isOpen && renderNode(c, depth + 1)}
        </div>
      )
    })

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-bg-surface/70">
        <div className="border-b border-border/70 p-2">
          <label className="flex h-8 items-center gap-2 rounded-lg bg-text-primary/5 px-2">
            <Search className="size-3.5 text-text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Find in ${meta.total.toLocaleString()} files`} className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-text-muted" />
          </label>
        </div>
        <div className="hive-scroll min-h-0 flex-1 overflow-y-auto p-1">
          {!paths ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="hive-shimmer h-5 rounded" style={{ width: `${50 + ((i * 37) % 45)}%` }} />
              ))}
            </div>
          ) : matches ? (
            matches.map((p) => (
              <button key={p} type="button" onClick={() => setSelected(p)} className={cn('block w-full truncate rounded-md px-2 py-1 text-left font-mono text-[11px]', selected === p ? 'bg-accent-brand/12 text-text-primary' : 'text-text-secondary hover:bg-text-primary/5')}>
                {p}
              </button>
            ))
          ) : (
            renderNode(tree, 0)
          )}
        </div>
        {meta.truncated && <p className="border-t border-border/70 px-3 py-1.5 text-[10px] text-text-muted">Very large repository: the listing is partial.</p>}
      </aside>
      <div className="min-h-[420px] overflow-hidden rounded-xl border border-border bg-bg-surface/70">
        {selected ? <FileEditor key={selected} taskId={taskId} path={selected} /> : <div className="grid h-full place-items-center text-sm text-text-muted">Open a file to read or edit it</div>}
      </div>
    </div>
  )
}

function FileEditor({ taskId, path }: { taskId: string; path: string }) {
  const toast = useToast()
  const theme = useMonacoAppTheme()
  const [text, setText] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<Parameters<OnMount>[0] | null>(null)
  useEffect(() => {
    hiveApi
      .file(taskId, path)
      .then((r) => setText(r.current ?? ''))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Could not open'))
  }, [taskId, path])
  const save = async () => {
    const v = ref.current?.getValue()
    if (v == null) return
    setBusy(true)
    try {
      await hiveApi.saveFile(taskId, path, v)
      setDirty(false)
      toast.success('Saved to the working copy')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-primary">{path}</span>
        {dirty && <span className="text-[11px] text-state-warning">unsaved</span>}
        <Button size="sm" onClick={save} loading={busy} disabled={!dirty}>
          <Save /> Save
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {err ? (
          <div className="p-4 text-sm text-text-muted">{err}</div>
        ) : text === null ? (
          <div className="hive-shimmer h-full" />
        ) : (
          <Editor
            defaultValue={text}
            language={languageOf(path)}
            theme={theme.theme}
            beforeMount={theme.beforeMount}
            onMount={(ed) => {
              ref.current = ed
              ed.addCommand(2048 | 49 /* CtrlCmd+S */, () => save())
            }}
            onChange={() => setDirty(true)}
            options={{ minimap: { enabled: false }, fontSize: 12.5, fontFamily: theme.fontFamily, fontLigatures: theme.ligatures, scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8 } }}
          />
        )}
      </div>
    </div>
  )
}
