/* ────────────────────────────────────────────────────────────────────────
   Hive Drive — the team's shared file manager. One Drive for everyone
   ("Shared") plus one per project. Agents and chats can read what lives
   here; project files can be sent to the repository as a pull request.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownUp,
  Check,
  ChevronRight,
  CircleAlert,
  CloudUpload,
  Code,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  File as FileIcon,
  FileArchive,
  FileBraces,
  FileCode,
  FileImage,
  FileMusic,
  FileSpreadsheet,
  FileText,
  FileUp,
  FileVideoCamera,
  Folder,
  FolderGit2,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderUp,
  GitBranch,
  GitPullRequest,
  HardDrive,
  House,
  LayoutGrid,
  List,
  Loader2,
  MessageSquarePlus,
  Minus,
  Pencil,
  Presentation,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { Button, ConfirmDialog, Input, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Modal, Textarea, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { errMsg } from '../Improve'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { DriveItem, Project } from '../types'
import { Meter, Toggle, UserDot, timeAgo } from '../ui'

const EASE = [0.2, 0.8, 0.2, 1] as const
const MAX_FILE = 20 * 1024 * 1024
const VIEW_KEY = 'hive.drive.view'
const SORT_KEY = 'hive.drive.sort'

type View = 'list' | 'grid'
type SortKey = 'name' | 'updated' | 'size'
type Usage = { bytes: number; files: number; limit: number }

/* ── small helpers ────────────────────────────────────────────────────── */
const join = (folder: string, name: string) => (folder === '/' ? `/${name}` : `${folder}/${name}`)
const parentOf = (p: string) => (p.lastIndexOf('/') <= 0 ? '/' : p.slice(0, p.lastIndexOf('/')))
const hasRepo = (p: Project | null | undefined): p is Project => !!p && !!p.github_id && !!p.repo_owner && !!p.repo_name
const today = () => new Date().toISOString().slice(0, 10)

export function fmtBytes(n: number): string {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  const v = n / 1024 ** i
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`
}

function lsGet<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null
    return v && allowed.includes(v) ? v : fallback
  } catch {
    return fallback
  }
}
function lsSet(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* private mode — fine */
  }
}

function useIsPhone() {
  const q = '(max-width: 639px)'
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const fn = () => setPhone(m.matches)
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])
  return phone
}

/* ── file types ───────────────────────────────────────────────────────── */
type Kind = 'folder' | 'pdf' | 'image' | 'code' | 'data' | 'doc' | 'sheet' | 'slides' | 'archive' | 'audio' | 'video' | 'markdown' | 'other'
const EXT: Record<string, Kind> = {
  pdf: 'pdf',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', avif: 'image', heic: 'image', bmp: 'image', ico: 'image', fig: 'image', sketch: 'image', psd: 'image',
  js: 'code', jsx: 'code', ts: 'code', tsx: 'code', py: 'code', go: 'code', rs: 'code', java: 'code', rb: 'code', php: 'code', cs: 'code', c: 'code', h: 'code', cpp: 'code', css: 'code', html: 'code', sh: 'code', sql: 'code', swift: 'code', kt: 'code', vue: 'code', svelte: 'code',
  json: 'data', yaml: 'data', yml: 'data', toml: 'data', xml: 'data', env: 'data', ini: 'data',
  md: 'markdown', mdx: 'markdown',
  txt: 'doc', doc: 'doc', docx: 'doc', rtf: 'doc', odt: 'doc', pages: 'doc',
  csv: 'sheet', tsv: 'sheet', xls: 'sheet', xlsx: 'sheet', ods: 'sheet', numbers: 'sheet',
  ppt: 'slides', pptx: 'slides', key: 'slides', odp: 'slides',
  zip: 'archive', gz: 'archive', tar: 'archive', rar: 'archive', '7z': 'archive', tgz: 'archive',
  mp3: 'audio', wav: 'audio', m4a: 'audio', ogg: 'audio', flac: 'audio',
  mp4: 'video', mov: 'video', webm: 'video', mkv: 'video', avi: 'video',
}
const KIND: Record<Kind, { icon: typeof FileIcon; color: string; label: string }> = {
  folder: { icon: Folder, color: 'var(--color-accent-brand)', label: 'Folder' },
  pdf: { icon: FileText, color: 'oklch(64% 0.17 25)', label: 'PDF' },
  image: { icon: FileImage, color: 'oklch(66% 0.16 295)', label: 'Image' },
  code: { icon: FileCode, color: 'oklch(70% 0.11 185)', label: 'Code' },
  data: { icon: FileBraces, color: 'oklch(70% 0.11 200)', label: 'Data' },
  markdown: { icon: FileText, color: 'oklch(66% 0.14 250)', label: 'Markdown' },
  doc: { icon: FileText, color: 'oklch(66% 0.14 255)', label: 'Document' },
  sheet: { icon: FileSpreadsheet, color: 'oklch(68% 0.14 152)', label: 'Spreadsheet' },
  slides: { icon: Presentation, color: 'oklch(74% 0.14 65)', label: 'Slides' },
  archive: { icon: FileArchive, color: 'oklch(68% 0.06 60)', label: 'Archive' },
  audio: { icon: FileMusic, color: 'oklch(68% 0.15 340)', label: 'Audio' },
  video: { icon: FileVideoCamera, color: 'oklch(66% 0.15 10)', label: 'Video' },
  other: { icon: FileIcon, color: 'var(--color-text-muted)', label: 'File' },
}
function kindOf(it: Pick<DriveItem, 'kind' | 'name' | 'mime'>): Kind {
  if (it.kind === 'folder') return 'folder'
  const ext = it.name.includes('.') ? it.name.split('.').pop()!.toLowerCase() : ''
  if (EXT[ext]) return EXT[ext]
  const m = it.mime ?? ''
  if (m === 'application/pdf') return 'pdf'
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('audio/')) return 'audio'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('text/')) return 'doc'
  return 'other'
}
const isInlineImage = (it: DriveItem) => /^image\/(png|jpeg|gif|webp)$/.test(it.mime ?? '')
const isPdf = (it: DriveItem) => it.mime === 'application/pdf'
const isMarkdown = (it: DriveItem) => /\.(md|mdx|markdown)$/i.test(it.name) || it.mime === 'text/markdown'

function TypeIcon({ item, size = 'md', open }: { item: Pick<DriveItem, 'kind' | 'name' | 'mime'>; size?: 'sm' | 'md' | 'lg'; open?: boolean }) {
  const k = KIND[kindOf(item)]
  const Icon = item.kind === 'folder' && open ? FolderOpen : k.icon
  const dims = { sm: 'size-7 rounded-[9px] [&_svg]:size-3.5', md: 'size-9 rounded-[11px] [&_svg]:size-4', lg: 'size-14 rounded-2xl [&_svg]:size-6' }[size]
  return (
    <span className={cn('hive-tile shrink-0', dims)} style={{ ['--tile' as string]: k.color }} aria-hidden>
      <Icon />
    </span>
  )
}

/* ── upload plumbing ──────────────────────────────────────────────────── */
type QueueItem = { id: string; name: string; size: number; status: 'waiting' | 'uploading' | 'done' | 'error'; error?: string }

/** Turn a drop into files with their relative paths (folders included). */
async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items ?? [])
    .map((i) => (i.kind === 'file' ? (i.webkitGetAsEntry?.() ?? null) : null))
    .filter((e): e is FileSystemEntry => !!e)
  if (!entries.length) return Array.from(dt.files)
  const out: File[] = []
  const walk = async (e: FileSystemEntry, prefix: string): Promise<void> => {
    if (e.isFile) {
      const f = await new Promise<File>((res, rej) => (e as FileSystemFileEntry).file(res, rej))
      out.push(prefix ? new File([f], `${prefix}${f.name}`, { type: f.type, lastModified: f.lastModified }) : f)
    } else if (e.isDirectory) {
      const reader = (e as FileSystemDirectoryEntry).createReader()
      // readEntries returns batches; keep reading until empty.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej))
        if (!batch.length) break
        for (const c of batch) await walk(c, `${prefix}${e.name}/`)
      }
    }
  }
  for (const e of entries) await walk(e, '')
  return out
}
const relName = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name

/* ════════════════════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════════════════════ */
export default function DrivePage() {
  const { boot, on } = useHive()
  const toast = useToast()
  const navigate = useNavigate()
  const phone = useIsPhone()
  const [params, setParams] = useSearchParams()
  const projects = useMemo(() => boot?.projects ?? [], [boot])
  const rawProject = params.get('project')
  const projectId = rawProject && projects.some((p) => p.id === rawProject) ? rawProject : null
  const project = projects.find((p) => p.id === projectId) ?? null
  const folder = params.get('folder') || '/'

  const [items, setItems] = useState<DriveItem[] | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [view, setViewState] = useState<View>(() => lsGet(VIEW_KEY, ['list', 'grid'] as const, 'list'))
  const [sort, setSortState] = useState<SortKey>(() => lsGet(SORT_KEY, ['name', 'updated', 'size'] as const, 'name'))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DriveItem[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<DriveItem | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [mkdirOpen, setMkdirOpen] = useState(false)
  const [moving, setMoving] = useState<DriveItem[] | null>(null)
  const [deleting, setDeleting] = useState<DriveItem[] | null>(null)
  const [delBusy, setDelBusy] = useState(false)
  const [ghOpen, setGhOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const dirInput = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const setView = (v: View) => {
    setViewState(v)
    lsSet(VIEW_KEY, v)
  }
  const setSort = (s: SortKey) => {
    setSortState(s)
    lsSet(SORT_KEY, s)
  }

  const go = useCallback(
    (next: { project?: string | null; folder?: string }) => {
      const p = new URLSearchParams(params)
      if (next.project !== undefined) {
        if (next.project) p.set('project', next.project)
        else p.delete('project')
        p.delete('folder')
      }
      if (next.folder !== undefined) {
        if (next.folder && next.folder !== '/') p.set('folder', next.folder)
        else p.delete('folder')
      }
      setParams(p)
    },
    [params, setParams],
  )

  /* data */
  const load = useCallback(async () => {
    try {
      const r = await hiveApi.drive(projectId, folder)
      setItems(r.items)
      setUsage(r.usage)
    } catch (e) {
      setItems((cur) => cur ?? [])
      toast.error('Couldn’t open this folder', errMsg(e))
    }
  }, [projectId, folder, toast])

  useEffect(() => {
    setItems(null)
    setSelected(new Set())
    setRenaming(null)
    void load()
  }, [load])

  // Reset search and preview when the scope changes.
  useEffect(() => {
    setQuery('')
    setResults(null)
    setPreview(null)
  }, [projectId])

  // Live: anyone (or any agent) changing this Drive refreshes it.
  useEffect(
    () =>
      on('drive', (e: { projectId?: string | null } | undefined) => {
        if (!e || (e.projectId ?? null) === projectId) void load()
      }),
    [on, load, projectId],
  )

  // Server search (debounced) once the filter is two characters or more.
  const q = query.trim()
  useEffect(() => {
    if (q.length < 2) {
      setResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    const t = window.setTimeout(() => {
      hiveApi
        .driveSearch(projectId, q)
        .then((r) => setResults(r.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 220)
    return () => window.clearTimeout(t)
  }, [q, projectId])

  const sortFn = useCallback(
    (a: DriveItem, b: DriveItem) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      if (sort === 'updated') return b.updatedAt - a.updatedAt
      if (sort === 'size') return b.size - a.size || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    },
    [sort],
  )

  const shown = useMemo(() => {
    if (!items) return null
    const ql = q.toLowerCase()
    const here = ql ? items.filter((i) => i.name.toLowerCase().includes(ql)) : items
    if (!results) return [...here].sort(sortFn)
    // Instant local matches first, then everything else the server found.
    const seen = new Set(here.map((i) => i.path))
    return [...here.sort(sortFn), ...results.filter((r) => !seen.has(r.path)).sort(sortFn)]
  }, [items, results, q, sortFn])

  const searchMode = q.length > 0
  const pathOf = useMemo(() => new Map((shown ?? []).map((i) => [i.path, i])), [shown])
  const selItems = useMemo(() => [...selected].map((p) => pathOf.get(p)).filter((x): x is DriveItem => !!x), [selected, pathOf])

  const toggleSel = (p: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(p)) n.delete(p)
      else n.add(p)
      return n
    })
  const allSelected = !!shown?.length && shown.every((i) => selected.has(i.path))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set((shown ?? []).map((i) => i.path)))

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected.size && !preview && !document.querySelector('[role="dialog"]')) setSelected(new Set())
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [selected.size, preview])

  /* actions */
  const open = (it: DriveItem) => {
    if (it.kind === 'folder') {
      setQuery('')
      go({ folder: it.path })
    } else setPreview(it)
  }

  const download = (it: DriveItem) => {
    const a = document.createElement('a')
    a.href = hiveApi.driveUrl(projectId, it.path, true)
    a.download = it.name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const openInChat = (it: DriveItem) => navigate(`/hive/chat?drive=${encodeURIComponent(it.fileId ?? it.id)}`)

  const rename = async (it: DriveItem, name: string) => {
    const n = name.trim()
    setRenaming(null)
    if (!n || n === it.name) return
    if (/[/\\]/.test(n)) return toast.error('Names can’t contain slashes')
    try {
      const r = await hiveApi.driveMove(projectId, it.path, join(parentOf(it.path), n))
      if (preview?.id === it.id) setPreview(r.item)
      void load()
    } catch (e) {
      toast.error('Couldn’t rename', errMsg(e))
    }
  }

  const doDelete = async () => {
    if (!deleting) return
    setDelBusy(true)
    let failed = 0
    for (const it of deleting) await hiveApi.driveDelete(projectId, it.path).catch(() => failed++)
    setDelBusy(false)
    const n = deleting.length - failed
    if (n) toast.success(n === 1 ? `Deleted ${deleting[0].name}` : `Deleted ${n} items`)
    if (failed) toast.error(`${failed} item${failed === 1 ? '' : 's'} couldn’t be deleted`)
    if (preview && deleting.some((d) => d.id === preview.id || preview.path.startsWith(`${d.path}/`))) setPreview(null)
    setDeleting(null)
    setSelected(new Set())
    void load()
  }

  const upload = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      const target = folder
      const batch: (QueueItem & { file: File })[] = files.map((f, i) => ({
        id: `${Date.now()}-${i}-${f.name}`,
        name: relName(f),
        size: f.size,
        file: f,
        status: f.size > MAX_FILE ? 'error' : 'waiting',
        error: f.size > MAX_FILE ? 'Too large (20 MB max)' : undefined,
      }))
      setQueue((q0) => [...q0.filter((x) => x.status === 'uploading' || x.status === 'waiting'), ...batch.map(({ file: _f, ...rest }) => rest)])
      const patch = (id: string, p: Partial<QueueItem>) => setQueue((q0) => q0.map((x) => (x.id === id ? { ...x, ...p } : x)))
      const todo = batch.filter((b) => b.status === 'waiting')
      let next = 0
      let ok = 0
      const worker = async () => {
        while (next < todo.length) {
          const b = todo[next++]
          patch(b.id, { status: 'uploading' })
          try {
            const r = await hiveApi.driveUpload(projectId, target, [b.file])
            const f = r.files[0]
            if (f && 'error' in f) patch(b.id, { status: 'error', error: f.error })
            else {
              ok++
              patch(b.id, { status: 'done' })
            }
          } catch (e) {
            patch(b.id, { status: 'error', error: errMsg(e) })
          }
        }
      }
      await Promise.all([worker(), worker(), worker()])
      if (ok) toast.success(ok === 1 ? 'Uploaded 1 file' : `Uploaded ${ok} files`)
      void load()
    },
    [folder, projectId, load, toast],
  )

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    void upload(files)
  }

  // Drag & drop anywhere on the page.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current++
      setDragging(true)
    }
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (!dragDepth.current) setDragging(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e) || !e.dataTransfer) return
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      const dt = e.dataTransfer
      filesFromDrop(dt)
        .then((f) => upload(f))
        .catch(() => upload(Array.from(dt.files)))
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [upload])

  if (!boot) return null

  const crumbs = folder === '/' ? [] : folder.slice(1).split('/')
  const scopeName = project?.name ?? 'Shared'
  const empty = !!items && items.length === 0 && !searchMode
  const repoReady = hasRepo(project)
  const itemProps = {
    projectId,
    selected,
    renaming,
    searchMode,
    onOpen: open,
    onToggle: toggleSel,
    onRename: rename,
    onCancelRename: () => setRenaming(null),
    menu: (it: DriveItem) => (
      <ItemMenu
        item={it}
        onOpen={() => open(it)}
        onDownload={() => download(it)}
        onChat={() => openInChat(it)}
        onRename={() => setRenaming(it.id)}
        onMove={() => setMoving([it])}
        onDelete={() => setDeleting([it])}
      />
    ),
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-40 pt-6 sm:px-6 lg:px-8">
      <input ref={fileInput} type="file" multiple hidden onChange={onPick} />
      <input ref={dirInput} type="file" multiple hidden onChange={onPick} {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} />

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-text-primary">Drive</h1>
          <p className="mt-1 text-[14px] text-text-muted">Files the whole team and every agent can use — PDFs, designs, docs and data.</p>
        </div>
        {usage && <UsageMeter usage={usage} />}
      </div>

      {/* Scope switcher */}
      <div className="hive-scroll -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Which Drive">
        <ScopeChip active={!projectId} onClick={() => go({ project: null })} color="var(--color-accent-brand)" icon={<HardDrive className="size-3.5" />}>
          Shared
        </ScopeChip>
        {projects.map((p) => (
          <ScopeChip key={p.id} active={p.id === projectId} onClick={() => go({ project: p.id })} color={projectColor(p.color)}>
            {p.name}
          </ScopeChip>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <nav aria-label="Folder path" className="flex min-w-0 flex-1 basis-full items-center gap-0.5 text-[13.5px] sm:basis-auto">
          <button
            type="button"
            onClick={() => go({ folder: '/' })}
            className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-text-primary/6', crumbs.length ? 'text-text-muted hover:text-text-primary' : 'font-medium text-text-primary')}
          >
            <House className="size-3.5" />
            {scopeName}
          </button>
          {crumbs.map((c, i) => {
            const p = `/${crumbs.slice(0, i + 1).join('/')}`
            const last = i === crumbs.length - 1
            return (
              <span key={p} className={cn('flex min-w-0 items-center gap-0.5', !last && 'shrink')}>
                <ChevronRight className="size-3.5 shrink-0 text-text-muted/60" />
                <button
                  type="button"
                  onClick={() => go({ folder: p })}
                  aria-current={last ? 'page' : undefined}
                  className={cn('h-8 min-w-0 truncate rounded-lg px-2 transition-colors hover:bg-text-primary/6', last ? 'font-medium text-text-primary' : 'text-text-muted hover:text-text-primary')}
                >
                  {c}
                </button>
              </span>
            )
          })}
        </nav>

        <div className="relative min-w-0 flex-1 sm:w-60 sm:flex-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${scopeName}`} aria-label="Search files" className="h-9 pl-9 pr-8 text-[13px]" />
          {searching ? (
            <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-text-muted" />
          ) : (
            query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-text-muted hover:bg-text-primary/8 hover:text-text-primary">
                <X className="size-3.5" />
              </button>
            )
          )}
        </div>

        <Menu>
          <Tooltip label="Sort">
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Sort files">
                <ArrowDownUp />
              </Button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent className="min-w-44">
            <MenuLabel>Sort by</MenuLabel>
            {(
              [
                ['name', 'Name'],
                ['updated', 'Last updated'],
                ['size', 'Size'],
              ] as const
            ).map(([k, l]) => (
              <MenuItem key={k} onSelect={() => setSort(k)} icon={<Check className={cn(sort === k ? 'opacity-100' : 'opacity-0')} />}>
                {l}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>

        <div className="flex rounded-[10px] bg-text-primary/[0.05] p-0.5" role="radiogroup" aria-label="View">
          {(
            [
              ['list', List, 'List view'],
              ['grid', LayoutGrid, 'Grid view'],
            ] as const
          ).map(([v, Icon, label]) => (
            <Tooltip key={v} label={label}>
              <button
                type="button"
                role="radio"
                aria-checked={view === v}
                aria-label={label}
                onClick={() => setView(v)}
                className={cn('grid size-8 place-items-center rounded-lg transition-colors', view === v ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary')}
              >
                <Icon className="size-4" />
              </button>
            </Tooltip>
          ))}
        </div>

        <Tooltip label="New folder">
          <Button variant="secondary" size="icon" aria-label="New folder" onClick={() => setMkdirOpen(true)}>
            <FolderPlus />
          </Button>
        </Tooltip>

        {repoReady && (
          <Tooltip label={`Bring files from ${project.repo_owner}/${project.repo_name}`}>
            <Button variant="secondary" size="icon" aria-label="Import from repository" onClick={() => setImportOpen(true)}>
              <FolderGit2 />
            </Button>
          </Tooltip>
        )}

        <Menu>
          <MenuTrigger asChild>
            <Button>
              <Upload /> Upload
            </Button>
          </MenuTrigger>
          <MenuContent className="min-w-48">
            <MenuItem icon={<FileUp />} onSelect={() => fileInput.current?.click()}>
              Files
            </MenuItem>
            <MenuItem icon={<FolderUp />} onSelect={() => dirInput.current?.click()}>
              A whole folder
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<FolderUp />} onSelect={() => navigate('/hive/projects')}>
              A code folder to work on (any size)
            </MenuItem>
            <MenuSeparator />
            <div className="px-2.5 pb-1 pt-0.5 text-[11.5px] text-text-muted">Drive holds documents (up to 20 MB each). Big code folders become a project instead. Or drop files anywhere on this page.</div>
          </MenuContent>
        </Menu>
      </div>

      {searchMode && (
        <div className="mb-3 text-[12px] text-text-muted">
          {searching && !results ? 'Searching…' : `${shown?.length ?? 0} result${shown?.length === 1 ? '' : 's'} for “${q}” in ${scopeName}`}
        </div>
      )}

      {/* Body */}
      {!shown ? (
        <Skeletons view={view} />
      ) : empty && folder === '/' ? (
        <DriveEmpty scope={scopeName} onUpload={() => fileInput.current?.click()} onFolder={() => setMkdirOpen(true)} onImport={repoReady ? () => setImportOpen(true) : undefined} />
      ) : empty ? (
        <div className="hive-card flex flex-col items-center gap-2 border-dashed px-6 py-14 text-center">
          <span className="hive-tile size-11">
            <FolderOpen className="size-5" />
          </span>
          <div className="mt-1 text-[14px] font-medium">This folder is empty</div>
          <div className="max-w-sm text-[12.5px] text-text-muted">Drop files here, or upload them with the button above.</div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => fileInput.current?.click()}>
              <Upload /> Upload files
            </Button>
            <Button size="sm" variant="ghost" onClick={() => go({ folder: parentOf(folder) })}>
              Back to {parentOf(folder) === '/' ? scopeName : parentOf(folder).split('/').pop()}
            </Button>
          </div>
        </div>
      ) : !shown.length ? (
        <div className="hive-card flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Search className="size-5 text-text-muted" />
          <div className="text-[14px] font-medium">Nothing matches “{q}”</div>
          <div className="text-[12.5px] text-text-muted">Try part of the name or folder.</div>
        </div>
      ) : view === 'list' ? (
        <ListView items={shown} allSelected={allSelected} someSelected={selected.size > 0} onToggleAll={toggleAll} {...itemProps} />
      ) : (
        <GridView items={shown} {...itemProps} />
      )}

      {/* Bottom action bar for multi-select */}
      <AnimatePresence>
        {selItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3"
          >
            <div className="pop-surface pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl p-1.5 shadow-xl">
              <span className="flex shrink-0 items-center gap-2 pl-2 pr-2 text-[13px] font-medium tabular-nums">
                <span className="grid size-6 place-items-center rounded-full bg-accent-brand text-[11.5px] text-on-accent-brand">{selItems.length}</span>
                <span className="hidden sm:inline">selected</span>
              </span>
              {repoReady && (
                <Button size="sm" onClick={() => setGhOpen(true)} className="shrink-0">
                  <GitPullRequest /> Send to GitHub
                </Button>
              )}
              {selItems.every((i) => i.kind === 'file') && (
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => selItems.forEach((it, i) => window.setTimeout(() => download(it), i * 250))}>
                  <Download /> <span className="hidden sm:inline">Download</span>
                </Button>
              )}
              <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setMoving(selItems)}>
                <FolderInput /> <span className="hidden sm:inline">Move</span>
              </Button>
              <Button size="sm" variant="ghost" className="shrink-0 text-state-error hover:text-state-error" onClick={() => setDeleting(selItems)}>
                <Trash2 /> <span className="hidden sm:inline">Delete</span>
              </Button>
              <Tooltip label="Clear selection (Esc)">
                <Button size="icon-sm" variant="ghost" aria-label="Clear selection" onClick={() => setSelected(new Set())}>
                  <X />
                </Button>
              </Tooltip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UploadQueue queue={queue} onClear={() => setQueue([])} lifted={selItems.length > 0} />

      <DropOverlay show={dragging} target={folder === '/' ? scopeName : `${scopeName} / ${crumbs.join(' / ')}`} />

      <PreviewPanel
        item={preview}
        projectId={projectId}
        phone={phone}
        onClose={() => setPreview(null)}
        onDownload={download}
        onChat={openInChat}
        onDelete={(it) => setDeleting([it])}
        onSaved={(it) => {
          setPreview(it)
          void load()
        }}
      />

      <NewFolderDialog
        open={mkdirOpen}
        onClose={() => setMkdirOpen(false)}
        folder={folder}
        existing={items?.map((i) => i.name) ?? []}
        onCreate={async (name) => {
          try {
            await hiveApi.driveMkdir(projectId, join(folder, name))
            setMkdirOpen(false)
            void load()
          } catch (e) {
            toast.error('Couldn’t create the folder', errMsg(e))
          }
        }}
      />

      <MoveDialog
        items={moving}
        projectId={projectId}
        scope={scopeName}
        onClose={() => setMoving(null)}
        onDone={(n) => {
          setMoving(null)
          setSelected(new Set())
          if (n) toast.success(n === 1 ? 'Moved 1 item' : `Moved ${n} items`)
          void load()
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => !delBusy && setDeleting(null)}
        onConfirm={() => void doDelete()}
        loading={delBusy}
        danger
        title={deleting?.length === 1 ? `Delete ${deleting[0].kind === 'folder' ? 'folder' : 'file'}?` : `Delete ${deleting?.length ?? 0} items?`}
        confirmLabel="Delete"
        message={
          deleting?.length === 1 ? (
            <>
              <b className="text-text-primary">{deleting[0].name}</b>
              {deleting[0].kind === 'folder' ? ' and everything inside it will be removed for everyone.' : ' will be removed for everyone.'} This can’t be undone.
            </>
          ) : (
            <>These {deleting?.length} items (and anything inside folders) will be removed for everyone. This can’t be undone.</>
          )
        }
      />

      {repoReady && (
        <>
          <GithubDialog open={ghOpen} onClose={() => setGhOpen(false)} project={project} items={selItems} onSent={() => setSelected(new Set())} />
          <ImportDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            project={project}
            folder={folder}
            onDone={(n, dest) => {
              setImportOpen(false)
              toast.success(`Imported ${n} file${n === 1 ? '' : 's'}`)
              if (dest !== folder) go({ folder: dest })
              else void load()
            }}
          />
        </>
      )}
    </div>
  )
}

/* ── header bits ──────────────────────────────────────────────────────── */
function UsageMeter({ usage }: { usage: Usage }) {
  const share = usage.limit ? usage.bytes / usage.limit : 0
  const tone = share > 0.9 ? 'var(--color-state-error)' : share > 0.75 ? 'var(--color-state-warning)' : 'var(--color-accent-brand)'
  return (
    <Tooltip label={`${usage.files} file${usage.files === 1 ? '' : 's'} across every Drive. Each file can be up to 20 MB.`}>
      <div className="w-full min-w-48 sm:w-56">
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12px] tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <HardDrive className="size-3.5" /> Storage
          </span>
          <span className="text-text-muted">
            <b className="font-medium text-text-primary">{fmtBytes(usage.bytes)}</b> of {fmtBytes(usage.limit)}
          </span>
        </div>
        <Meter value={share} color={tone} className="h-1.5" />
      </div>
    </Tooltip>
  )
}

function ScopeChip({ active, onClick, color, icon, children }: { active: boolean; onClick: () => void; color: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] transition-colors',
        active ? 'text-text-primary' : 'text-text-muted hover:bg-text-primary/[0.05] hover:text-text-primary',
      )}
    >
      {active && <motion.span layoutId="drive-scope" className="absolute inset-0 rounded-full border hive-line-strong bg-bg-surface shadow-sm" transition={{ duration: 0.24, ease: EASE }} />}
      <span className="relative inline-flex items-center gap-2">
        {icon ? <span style={{ color }}>{icon}</span> : <span className="size-2 rounded-full" style={{ background: color }} />}
        <span className="max-w-[12rem] truncate">{children}</span>
      </span>
    </button>
  )
}

/* ── list & grid ──────────────────────────────────────────────────────── */
type ItemProps = {
  projectId: string | null
  selected: Set<string>
  renaming: string | null
  searchMode: boolean
  onOpen: (it: DriveItem) => void
  onToggle: (path: string) => void
  onRename: (it: DriveItem, name: string) => void
  onCancelRename: () => void
  menu: (it: DriveItem) => ReactNode
}

function Check3({ on, some, onClick, label, className }: { on: boolean; some?: boolean; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on ? true : some ? 'mixed' : false}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn('grid size-9 shrink-0 place-items-center rounded-lg', className)}
    >
      <span
        className={cn(
          'grid size-[18px] place-items-center rounded-[6px] border transition-colors',
          on || some ? 'border-accent-brand bg-accent-brand text-on-accent-brand' : 'hive-line-strong bg-bg-surface/60 hover:border-text-muted',
        )}
      >
        {on ? <Check className="size-3" strokeWidth={3} /> : some ? <Minus className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  )
}

function RenameInput({ item, onDone, onCancel, className }: { item: DriveItem; onDone: (name: string) => void; onCancel: () => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    const dot = item.kind === 'file' ? item.name.lastIndexOf('.') : -1
    el.setSelectionRange(0, dot > 0 ? dot : item.name.length)
  }, [item])
  return (
    <input
      ref={ref}
      defaultValue={item.name}
      aria-label={`Rename ${item.name}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') onDone(e.currentTarget.value)
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={(e) => onDone(e.currentTarget.value)}
      className={cn('h-8 w-full min-w-0 rounded-lg border border-accent-brand/60 bg-bg-surface px-2 text-[13.5px] text-text-primary outline-none ring-4 ring-accent-brand/12', className)}
    />
  )
}

function ListView({ items, allSelected, someSelected, onToggleAll, ...p }: ItemProps & { items: DriveItem[]; allSelected: boolean; someSelected: boolean; onToggleAll: () => void }) {
  return (
    <div className="hive-card overflow-hidden">
      <div className="flex items-center gap-2 border-b hive-line px-2 py-1 text-[11.5px] font-medium text-text-muted">
        <Check3 on={allSelected} some={someSelected && !allSelected} onClick={onToggleAll} label={allSelected ? 'Clear selection' : 'Select all'} />
        <span className="flex-1 pl-1">Name</span>
        <span className="hidden w-20 text-right sm:block">Size</span>
        <span className="hidden w-36 pl-4 md:block">Updated</span>
        <span className="w-9" />
      </div>
      <motion.ul layout className="hive-divide">
        <AnimatePresence initial={false}>
          {items.map((it, i) => {
            const sel = p.selected.has(it.path)
            return (
              <motion.li
                key={it.id}
                layout="position"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: EASE, delay: Math.min(i, 12) * 0.015 } }}
                exit={{ opacity: 0, transition: { duration: 0.14 } }}
                className={cn('group flex items-center gap-2 px-2 py-1.5 transition-colors', sel ? 'bg-accent-brand/[0.07]' : 'hover:bg-text-primary/[0.03]')}
              >
                <Check3 on={sel} onClick={() => p.onToggle(it.path)} label={`Select ${it.name}`} className={cn(!sel && 'sm:opacity-40 sm:group-hover:opacity-100 sm:focus-visible:opacity-100')} />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => p.renaming !== it.id && p.onOpen(it)}
                  onKeyDown={(e) => e.key === 'Enter' && p.renaming !== it.id && p.onOpen(it)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/40"
                >
                  <TypeIcon item={it} />
                  <div className="min-w-0 flex-1">
                    {p.renaming === it.id ? (
                      <RenameInput item={it} onDone={(n) => p.onRename(it, n)} onCancel={p.onCancelRename} />
                    ) : (
                      <div className="truncate text-[13.5px] font-medium text-text-primary">{it.name}</div>
                    )}
                    <div className="truncate text-[11.5px] text-text-muted">
                      {p.searchMode && parentOf(it.path) !== '/' ? <span className="font-mono">{parentOf(it.path)}</span> : it.kind === 'folder' ? 'Folder' : KIND[kindOf(it)].label}
                      <span className="sm:hidden">
                        {it.kind === 'file' && ` · ${fmtBytes(it.size)}`} · {timeAgo(it.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="hidden w-20 text-right text-[12.5px] tabular-nums text-text-muted sm:block">{it.kind === 'file' ? fmtBytes(it.size) : '—'}</span>
                <span className="hidden w-36 items-center gap-2 pl-4 text-[12.5px] text-text-muted md:flex">
                  <UserDot username={it.updatedBy} size={5} />
                  <span className="tabular-nums">{timeAgo(it.updatedAt) === 'now' ? 'just now' : `${timeAgo(it.updatedAt)} ago`}</span>
                </span>
                {p.menu(it)}
              </motion.li>
            )
          })}
        </AnimatePresence>
      </motion.ul>
    </div>
  )
}

function GridView({ items, ...p }: ItemProps & { items: DriveItem[] }) {
  return (
    <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <AnimatePresence initial={false}>
        {items.map((it, i) => {
          const sel = p.selected.has(it.path)
          const k = KIND[kindOf(it)]
          return (
            <motion.div
              key={it.id}
              layout="position"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: EASE, delay: Math.min(i, 15) * 0.015 } }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }}
              className={cn('hive-card hive-card-hover group relative overflow-hidden', sel && 'ring-2 ring-accent-brand/60')}
            >
              <div
                role="button"
                tabIndex={0}
                aria-label={`Open ${it.name}`}
                onClick={() => p.renaming !== it.id && p.onOpen(it)}
                onKeyDown={(e) => e.key === 'Enter' && p.renaming !== it.id && p.onOpen(it)}
                className="block w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-brand/40"
              >
                <div className="relative grid aspect-[4/3] place-items-center overflow-hidden" style={{ background: `color-mix(in oklab, ${k.color} 7%, transparent)` }}>
                  {isInlineImage(it) ? (
                    <img src={hiveApi.driveUrl(p.projectId, it.path)} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <TypeIcon item={it} size="lg" />
                  )}
                </div>
                <div className="px-3 pb-3 pt-2.5">
                  {p.renaming === it.id ? (
                    <RenameInput item={it} onDone={(n) => p.onRename(it, n)} onCancel={p.onCancelRename} />
                  ) : (
                    <div className="truncate text-[13px] font-medium text-text-primary" title={it.name}>
                      {it.name}
                    </div>
                  )}
                  <div className="mt-0.5 truncate text-[11.5px] tabular-nums text-text-muted">
                    {p.searchMode && parentOf(it.path) !== '/' ? <span className="font-mono">{parentOf(it.path)} · </span> : null}
                    {it.kind === 'file' ? fmtBytes(it.size) : 'Folder'} · {timeAgo(it.updatedAt)}
                  </div>
                </div>
              </div>
              <Check3
                on={sel}
                onClick={() => p.onToggle(it.path)}
                label={`Select ${it.name}`}
                className={cn('absolute left-1 top-1 transition-opacity', !sel && 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100')}
              />
              <div className="absolute right-1 top-1 rounded-lg bg-bg-surface/80 opacity-100 backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:has-[[data-state=open]]:opacity-100 sm:focus-within:opacity-100">{p.menu(it)}</div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}

function ItemMenu({ item, onOpen, onDownload, onChat, onRename, onMove, onDelete }: { item: DriveItem; onOpen: () => void; onDownload: () => void; onChat: () => void; onRename: () => void; onMove: () => void; onDelete: () => void }) {
  const file = item.kind === 'file'
  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" aria-label={`Actions for ${item.name}`} className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-text-primary/8 hover:text-text-primary data-[state=open]:bg-text-primary/8 data-[state=open]:text-text-primary">
          <Ellipsis className="size-4" />
        </button>
      </MenuTrigger>
      <MenuContent className="min-w-52">
        <MenuItem icon={file ? <Eye /> : <FolderOpen />} onSelect={onOpen}>
          {file ? 'Preview' : 'Open'}
        </MenuItem>
        {file && (
          <MenuItem icon={<MessageSquarePlus />} onSelect={onChat}>
            Use in chat
          </MenuItem>
        )}
        {file && (
          <MenuItem icon={<Download />} onSelect={onDownload}>
            Download
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem icon={<Pencil />} onSelect={onRename}>
          Rename
        </MenuItem>
        <MenuItem icon={<FolderInput />} onSelect={onMove}>
          Move to…
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Trash2 />} danger onSelect={onDelete}>
          Delete
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

function Skeletons({ view }: { view: View }) {
  if (view === 'grid')
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="hive-card overflow-hidden">
            <div className="hive-shimmer aspect-[4/3] bg-text-primary/[0.03]" />
            <div className="space-y-2 p-3">
              <div className="hive-shimmer h-3 w-3/4 rounded bg-text-primary/[0.05]" />
              <div className="hive-shimmer h-2.5 w-1/2 rounded bg-text-primary/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    )
  return (
    <div className="hive-card hive-divide overflow-hidden">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="hive-shimmer size-9 rounded-[11px] bg-text-primary/[0.05]" />
          <div className="flex-1 space-y-2">
            <div className="hive-shimmer h-3 rounded bg-text-primary/[0.05]" style={{ width: `${40 + ((i * 17) % 35)}%` }} />
            <div className="hive-shimmer h-2.5 w-24 rounded bg-text-primary/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DriveEmpty({ scope, onUpload, onFolder, onImport }: { scope: string; onUpload: () => void; onFolder: () => void; onImport?: () => void }) {
  const tiles = [
    { item: { kind: 'file', name: 'brief.pdf', mime: 'application/pdf' }, r: -8, x: -64, y: 8 },
    { item: { kind: 'file', name: 'mock.png', mime: 'image/png' }, r: 0, x: 0, y: -6 },
    { item: { kind: 'file', name: 'data.csv', mime: 'text/csv' }, r: 8, x: 64, y: 8 },
  ] as const
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: EASE }} className="hive-card relative overflow-hidden border-dashed px-6 py-14 text-center">
      <div className="relative mx-auto mb-6 h-20 w-56">
        {tiles.map((t, i) => (
          <motion.div
            key={t.item.name}
            className="absolute left-1/2 top-1/2"
            initial={{ opacity: 0, x: '-50%', y: '-30%', rotate: 0 }}
            animate={{ opacity: 1, x: `calc(-50% + ${t.x}px)`, y: `calc(-50% + ${t.y}px)`, rotate: t.r }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.08 + i * 0.06 }}
          >
            <TypeIcon item={t.item} size="lg" />
          </motion.div>
        ))}
      </div>
      <h2 className="relative text-[17px] font-semibold tracking-[-0.01em]">{scope === 'Shared' ? 'Your team’s Drive is empty' : `No files in ${scope} yet`}</h2>
      <p className="relative mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-text-muted">Keep PDFs, designs, docs and data here. Agents and chats can read them; send them to GitHub when ready.</p>
      <div className="relative mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onUpload}>
          <Upload /> Upload files
        </Button>
        <Button variant="secondary" onClick={onFolder}>
          <FolderPlus /> New folder
        </Button>
        {onImport && (
          <Button variant="ghost" onClick={onImport}>
            <FolderGit2 /> Import from repo
          </Button>
        )}
      </div>
      <div className="relative mt-4 text-[12px] text-text-muted">
        Tip: drag files or whole folders onto this page. Up to 20 MB each.
      </div>
    </motion.div>
  )
}

/* ── upload feedback ──────────────────────────────────────────────────── */
function DropOverlay({ show, target }: { show: boolean; target: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="pointer-events-none fixed inset-0 z-[900] grid place-items-center bg-bg-app/70 p-6 backdrop-blur-[3px]"
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="relative flex w-full max-w-lg flex-col items-center gap-3 rounded-[28px] border-2 border-dashed border-accent-brand/60 px-8 py-14 text-center"
            style={{ background: 'color-mix(in oklab, var(--color-accent-brand) 8%, var(--color-bg-surface))', boxShadow: '0 0 0 8px color-mix(in oklab, var(--color-accent-brand) 8%, transparent), 0 40px 80px -40px color-mix(in oklab, var(--color-accent-brand) 50%, transparent)' }}
          >
            <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="hive-tile size-16 rounded-2xl">
              <CloudUpload className="size-7" />
            </motion.span>
            <div className="text-[18px] font-semibold tracking-[-0.01em] text-text-primary">Drop to upload</div>
            <div className="max-w-full truncate text-[13px] text-text-muted">
              into <span className="font-medium text-text-secondary">{target}</span>
            </div>
            <div className="text-[11.5px] text-text-muted">Files and whole folders · up to 20 MB each</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function UploadQueue({ queue, onClear, lifted }: { queue: QueueItem[]; onClear: () => void; lifted: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const active = queue.filter((q) => q.status === 'waiting' || q.status === 'uploading').length
  const done = queue.filter((q) => q.status === 'done').length
  const failed = queue.filter((q) => q.status === 'error').length
  const total = queue.length
  // Clear a fully successful batch on its own after a moment.
  useEffect(() => {
    if (!total || active || failed) return
    const t = window.setTimeout(onClear, 4000)
    return () => window.clearTimeout(t)
  }, [total, active, failed, onClear])
  return (
    <AnimatePresence>
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: EASE }}
          className={cn('pop-surface fixed right-3 z-40 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl shadow-xl transition-[bottom] duration-200 sm:right-6', lifted ? 'bottom-20' : 'bottom-4')}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            {active ? <Loader2 className="size-4 animate-spin text-accent-brand" /> : failed ? <CircleAlert className="size-4 text-state-error" /> : <Check className="size-4 text-state-success" />}
            <button type="button" onClick={() => setCollapsed((c) => !c)} className="min-w-0 flex-1 text-left text-[13px] font-medium" aria-expanded={!collapsed}>
              {active ? `Uploading ${done + failed + 1 > total ? total : done + failed + 1} of ${total}` : failed ? `${done} uploaded · ${failed} failed` : `${done} file${done === 1 ? '' : 's'} uploaded`}
            </button>
            {!active && (
              <button type="button" aria-label="Dismiss" onClick={onClear} className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-text-primary/8 hover:text-text-primary">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Meter value={total ? (done + failed) / total : 0} color={failed && !active ? 'var(--color-state-error)' : undefined} className="mx-3.5 mb-2 h-1" />
          {!collapsed && (
            <ul className="hive-scroll max-h-56 overflow-y-auto px-1.5 pb-1.5">
              {queue.map((f) => (
                <li key={f.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                  <TypeIcon item={{ kind: 'file', name: f.name, mime: null }} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] text-text-primary">{f.name}</div>
                    <div className={cn('truncate text-[11px] tabular-nums', f.status === 'error' ? 'text-state-error' : 'text-text-muted')}>
                      {f.status === 'error' ? f.error : f.status === 'uploading' ? `Uploading · ${fmtBytes(f.size)}` : f.status === 'waiting' ? `Waiting · ${fmtBytes(f.size)}` : fmtBytes(f.size)}
                    </div>
                    {f.status === 'uploading' && <div className="hive-shimmer mt-1 h-0.5 rounded-full bg-accent-brand/30" />}
                  </div>
                  {f.status === 'done' && <Check className="size-3.5 text-state-success" />}
                  {f.status === 'error' && <CircleAlert className="size-3.5 text-state-error" />}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── preview ──────────────────────────────────────────────────────────── */
function PreviewPanel({
  item,
  projectId,
  phone,
  onClose,
  onDownload,
  onChat,
  onDelete,
  onSaved,
}: {
  item: DriveItem | null
  projectId: string | null
  phone: boolean
  onClose: () => void
  onDownload: (it: DriveItem) => void
  onChat: (it: DriveItem) => void
  onDelete: (it: DriveItem) => void
  onSaved: (it: DriveItem) => void
}) {
  useEffect(() => {
    if (!item) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) onClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [item, onClose])

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[950] bg-bg-app/50 backdrop-blur-[1px] lg:bg-bg-app/25"
            aria-hidden
          />
          <motion.aside
            key="panel"
            role="complementary"
            aria-label={`Preview of ${item.name}`}
            initial={phone ? { y: '100%' } : { x: 48, opacity: 0 }}
            animate={phone ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={phone ? { y: '100%' } : { x: 48, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className={cn(
              'pop-surface fixed z-[960] flex flex-col overflow-hidden shadow-2xl',
              phone ? 'inset-x-0 bottom-0 top-8 !rounded-b-none !rounded-t-[22px]' : 'bottom-3 right-3 top-3 w-[min(600px,calc(100vw-24px))] !rounded-[20px]',
            )}
          >
            <PreviewBody key={item.id + item.updatedAt} item={item} projectId={projectId} onClose={onClose} onDownload={onDownload} onChat={onChat} onDelete={onDelete} onSaved={onSaved} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function PreviewBody({
  item,
  projectId,
  onClose,
  onDownload,
  onChat,
  onDelete,
  onSaved,
}: {
  item: DriveItem
  projectId: string | null
  onClose: () => void
  onDownload: (it: DriveItem) => void
  onChat: (it: DriveItem) => void
  onDelete: (it: DriveItem) => void
  onSaved: (it: DriveItem) => void
}) {
  const toast = useToast()
  const [text, setText] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const md = isMarkdown(item)
  const [mode, setMode] = useState<'view' | 'edit'>(md ? 'view' : 'edit')
  const dirty = text != null && draft !== text
  const k = KIND[kindOf(item)]

  useEffect(() => {
    if (!item.text) return
    let live = true
    hiveApi
      .driveText(projectId, item.path)
      .then((r) => {
        if (!live) return
        setText(r.content)
        setDraft(r.content)
      })
      .catch((e) => live && setLoadErr(errMsg(e)))
    return () => {
      live = false
    }
  }, [item.text, item.path, projectId])

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const r = await hiveApi.driveSave(projectId, item.path, draft)
      setText(draft)
      toast.success('Saved', item.name)
      onSaved(r.file)
    } catch (e) {
      toast.error('Couldn’t save', errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return
    onClose()
  }

  return (
    <>
      <div className="flex items-start gap-3 border-b hive-line px-4 py-3.5">
        <TypeIcon item={item} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold text-text-primary" title={item.name}>
            {item.name}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-text-muted">
            <span>{k.label}</span>
            <span>·</span>
            <span className="tabular-nums">{fmtBytes(item.size)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <UserDot username={item.updatedBy} size={4} />@{item.updatedBy} · {timeAgo(item.updatedAt) === 'now' ? 'just now' : `${timeAgo(item.updatedAt)} ago`}
            </span>
          </div>
        </div>
        <Tooltip label="Close (Esc)">
          <Button variant="ghost" size="icon-sm" aria-label="Close preview" onClick={close}>
            <X />
          </Button>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b hive-line px-3 py-2">
        <Button size="sm" variant="secondary" onClick={() => onChat(item)}>
          <MessageSquarePlus /> Use in chat
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDownload(item)}>
          <Download /> Download
        </Button>
        {(isPdf(item) || isInlineImage(item)) && (
          <Tooltip label="Open in a new tab">
            <a href={hiveApi.driveUrl(projectId, item.path)} target="_blank" rel="noreferrer" aria-label="Open in a new tab" className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/8 hover:text-text-primary">
              <ExternalLink className="size-3.5" />
            </a>
          </Tooltip>
        )}
        <div className="flex-1" />
        {item.text && md && (
          <div className="flex rounded-lg bg-text-primary/[0.05] p-0.5" role="radiogroup" aria-label="Markdown view">
            {(
              [
                ['view', Eye, 'Preview'],
                ['edit', Code, 'Edit'],
              ] as const
            ).map(([m, Icon, l]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn('inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors', mode === m ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary')}
              >
                <Icon className="size-3.5" /> {l}
              </button>
            ))}
          </div>
        )}
        {item.text && (
          <Button size="sm" onClick={() => void save()} disabled={!dirty} loading={saving}>
            <Save /> {dirty ? 'Save' : 'Saved'}
          </Button>
        )}
        <Tooltip label="Delete">
          <Button size="icon-sm" variant="ghost" aria-label="Delete file" className="text-text-muted hover:text-state-error" onClick={() => onDelete(item)}>
            <Trash2 />
          </Button>
        </Tooltip>
      </div>

      <div className="hive-scroll relative min-h-0 flex-1 overflow-auto">
        {isInlineImage(item) ? (
          <div className="hive-sunken grid min-h-full place-items-center p-4">
            <img src={hiveApi.driveUrl(projectId, item.path)} alt={item.name} className="max-h-full max-w-full rounded-lg object-contain shadow-lg" />
          </div>
        ) : isPdf(item) ? (
          <iframe src={hiveApi.driveUrl(projectId, item.path)} title={item.name} className="size-full min-h-[60vh] border-0 bg-bg-app" />
        ) : item.text ? (
          loadErr ? (
            <div className="p-6 text-[13px] text-state-error">Couldn’t open this file: {loadErr}</div>
          ) : text == null ? (
            <div className="space-y-2.5 p-5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="hive-shimmer h-3 rounded bg-text-primary/[0.05]" style={{ width: `${30 + ((i * 23) % 60)}%` }} />
              ))}
            </div>
          ) : md && mode === 'view' ? (
            <div className="px-5 py-4">{draft.trim() ? <AiMarkdown text={draft} /> : <div className="text-[13px] text-text-muted">This file is empty. Switch to Edit to write something.</div>}</div>
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                  e.preventDefault()
                  void save()
                }
                if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault()
                  const el = e.currentTarget
                  const s = el.selectionStart
                  const v = el.value
                  setDraft(`${v.slice(0, s)}  ${v.slice(el.selectionEnd)}`)
                  requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2))
                }
              }}
              spellCheck={md}
              aria-label={`Edit ${item.name}`}
              className="hive-code hive-sunken block size-full min-h-[60vh] resize-none border-0 px-5 py-4 text-text-primary outline-none"
            />
          )
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <TypeIcon item={item} size="lg" />
            <div className="mt-4 text-[14px] font-medium">No preview for this kind of file</div>
            <div className="mt-1 max-w-xs text-[12.5px] text-text-muted">Download it to open it on your device. Agents and chats can still use it.</div>
            <Button className="mt-5" onClick={() => onDownload(item)}>
              <Download /> Download {fmtBytes(item.size)}
            </Button>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t hive-line px-4 py-3 text-[11.5px]">
        <dt className="text-text-muted">Location</dt>
        <dd className="truncate font-mono text-text-secondary">{item.path}</dd>
        <dt className="text-text-muted">Added</dt>
        <dd className="text-text-secondary">
          @{item.createdBy} · {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </dd>
        <dt className="text-text-muted">Updated</dt>
        <dd className="text-text-secondary">
          @{item.updatedBy} · {new Date(item.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </dd>
        {item.note && (
          <>
            <dt className="text-text-muted">Note</dt>
            <dd className="text-text-secondary">{item.note}</dd>
          </>
        )}
      </dl>
    </>
  )
}

/* ── dialogs ──────────────────────────────────────────────────────────── */
function NewFolderDialog({ open, onClose, folder, existing, onCreate }: { open: boolean; onClose: () => void; folder: string; existing: string[]; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setName('')
  }, [open])
  const n = name.trim()
  const taken = existing.some((e) => e.toLowerCase() === n.toLowerCase())
  const bad = /[/\\<>:"|?*]/.test(n)
  const submit = async () => {
    if (!n || taken || bad) return
    setBusy(true)
    await onCreate(n)
    setBusy(false)
  }
  return (
    <Modal open={open} onClose={onClose} title="New folder" description={folder === '/' ? 'Created at the top of this Drive.' : `Created inside ${folder}`} size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4"
      >
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Designs" aria-label="Folder name" />
        {(taken || bad) && <div className="-mt-2 text-[12px] text-state-error">{taken ? 'Something here already has that name.' : 'Folder names can’t contain / \\ < > : " | ? *'}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!n || taken || bad} loading={busy}>
            <FolderPlus /> Create
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function MoveDialog({ items, projectId, scope, onClose, onDone }: { items: DriveItem[] | null; projectId: string | null; scope: string; onClose: () => void; onDone: (n: number) => void }) {
  const toast = useToast()
  const [folders, setFolders] = useState<DriveItem[] | null>(null)
  const [dest, setDest] = useState('/')
  const [busy, setBusy] = useState(false)
  const open = !!items
  useEffect(() => {
    if (!open) return
    setFolders(null)
    setDest('/')
    hiveApi
      .driveTree(projectId)
      .then((r) => setFolders(r.items.filter((i) => i.kind === 'folder').sort((a, b) => a.path.localeCompare(b.path))))
      .catch((e) => {
        setFolders([])
        toast.error('Couldn’t load folders', errMsg(e))
      })
  }, [open, projectId, toast])

  const blocked = (p: string) => !!items?.some((it) => it.kind === 'folder' && (p === it.path || p.startsWith(`${it.path}/`)))
  const noop = !!items?.every((it) => parentOf(it.path) === dest)
  const list = [{ path: '/', name: scope, depth: 0 }, ...(folders ?? []).map((f) => ({ path: f.path, name: f.name, depth: f.path.split('/').length - 1 }))]

  const submit = async () => {
    if (!items) return
    setBusy(true)
    let n = 0
    for (const it of items) {
      if (parentOf(it.path) === dest) continue
      try {
        await hiveApi.driveMove(projectId, it.path, join(dest, it.name))
        n++
      } catch (e) {
        toast.error(`Couldn’t move ${it.name}`, errMsg(e))
      }
    }
    setBusy(false)
    onDone(n)
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={items?.length === 1 ? `Move “${items[0].name}”` : `Move ${items?.length ?? 0} items`} description="Pick the folder they should go into." size="sm">
      <div className="hive-sunken hive-scroll -mx-1 max-h-[45vh] overflow-y-auto rounded-xl p-1.5">
        {!folders ? (
          <div className="space-y-1.5 p-1">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="hive-shimmer h-8 rounded-lg bg-text-primary/[0.04]" />
            ))}
          </div>
        ) : (
          list.map((f) => {
            const dis = blocked(f.path)
            const on = dest === f.path
            return (
              <button
                key={f.path}
                type="button"
                disabled={dis}
                onClick={() => setDest(f.path)}
                className={cn('flex h-9 w-full items-center gap-2 rounded-lg pr-2 text-left text-[13px] transition-colors disabled:opacity-35', on ? 'bg-accent-brand/12 text-text-primary' : 'text-text-secondary hover:bg-text-primary/[0.05]')}
                style={{ paddingLeft: 8 + f.depth * 16 }}
              >
                {f.path === '/' ? <House className="size-4 shrink-0 text-accent-brand" /> : on ? <FolderOpen className="size-4 shrink-0 text-accent-brand" /> : <Folder className="size-4 shrink-0 text-accent-brand/80" />}
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                {on && <Check className="size-4 shrink-0 text-accent-brand" />}
              </button>
            )
          })
        )}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="mr-auto min-w-0 truncate font-mono text-[11.5px] text-text-muted">{dest}</span>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={noop || !folders} loading={busy}>
          <FolderInput /> Move here
        </Button>
      </div>
    </Modal>
  )
}

function GithubDialog({ open, onClose, project, items, onSent }: { open: boolean; onClose: () => void; project: Project; items: DriveItem[]; onSent: () => void }) {
  const toast = useToast()
  const [targetDir, setTargetDir] = useState('')
  const [branch, setBranch] = useState('')
  const [message, setMessage] = useState('')
  const [openPr, setOpenPr] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ branch: string; files: string[]; pr: { url: string; number: number } | null } | null>(null)
  const [frozen, setFrozen] = useState<DriveItem[]>([])
  useEffect(() => {
    if (!open) return
    setTargetDir('')
    setBranch(`hive/drive-${today()}`)
    setMessage('')
    setOpenPr(true)
    setResult(null)
    setFrozen(items)
    // Only reset when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const repo = `${project.repo_owner}/${project.repo_name}`
  const branchOk = /^(?!\/)(?!.*\/\/)(?!.*\.\.)(?!.*@\{)[A-Za-z0-9._/-]{1,120}(?<![./])$/.test(branch) && branch !== project.default_branch
  const dir = targetDir.trim().replace(/^\/+|\/+$/g, '')

  const send = async () => {
    setBusy(true)
    try {
      const r = await hiveApi.driveToGithub({ projectId: project.id, paths: frozen.map((i) => i.path), targetDir: dir, branch: branch.trim(), message: message.trim() || undefined, openPr })
      setResult(r)
      onSent()
    } catch (e) {
      toast.error('Couldn’t send to GitHub', errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={result ? 'Sent to GitHub' : 'Send to GitHub'} description={result ? undefined : `Commit ${frozen.length} item${frozen.length === 1 ? '' : 's'} to a new branch of ${repo}.`} size="md">
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: EASE }} className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-3 text-center">
              <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: EASE }} className="hive-tile size-14 rounded-2xl" style={{ ['--tile' as string]: 'var(--color-state-success)' }}>
                {result.pr ? <GitPullRequest className="size-6" /> : <GitBranch className="size-6" />}
              </motion.span>
              <div className="mt-1 text-[15px] font-semibold">{result.pr ? `Pull request #${result.pr.number} is open` : 'Committed to a new branch'}</div>
              <div className="text-[12.5px] text-text-muted">
                {result.files.length} file{result.files.length === 1 ? '' : 's'} on <span className="font-mono text-text-secondary">{result.branch}</span>
              </div>
            </div>
            <ul className="hive-sunken hive-scroll max-h-40 overflow-y-auto rounded-xl px-3 py-2 font-mono text-[11.5px] text-text-secondary">
              {result.files.map((f) => (
                <li key={f} className="truncate py-0.5">
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Done
              </Button>
              {result.pr ? (
                <a href={result.pr.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-brand px-3.5 text-[13px] font-medium text-white shadow-sm transition hover:opacity-90 [&_svg]:size-4">
                  <ExternalLink /> Open pull request
                </a>
              ) : (
                <a href={`https://github.com/${repo}/tree/${encodeURIComponent(result.branch)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-brand px-3.5 text-[13px] font-medium text-white shadow-sm transition hover:opacity-90 [&_svg]:size-4">
                  <ExternalLink /> View branch
                </a>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={(e) => {
              e.preventDefault()
              if (branchOk && frozen.length) void send()
            }}
            className="space-y-4"
          >
            <div className="hive-sunken hive-scroll flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-xl p-2">
              {frozen.map((i) => (
                <span key={i.path} className="hive-chip max-w-full">
                  {i.kind === 'folder' ? <Folder className="size-3.5 text-accent-brand" /> : <FileIcon className="size-3.5" style={{ color: KIND[kindOf(i)].color }} />}
                  <span className="truncate">{i.name}</span>
                </span>
              ))}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-text-secondary">Folder in the repository</span>
              <Input value={targetDir} onChange={(e) => setTargetDir(e.target.value)} placeholder="Leave empty for the top level, e.g. docs/specs" className="font-mono text-[13px]" />
              <span className="mt-1 block text-[11.5px] text-text-muted">
                Lands at <span className="font-mono">{dir ? `${dir}/` : ''}{frozen[0]?.name ?? '…'}</span>
                {frozen.length > 1 ? ' and so on' : ''}. Folders keep their structure.
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-text-secondary">New branch</span>
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} className="font-mono text-[13px]" aria-invalid={!branchOk} />
              {!branchOk && <span className="mt-1 block text-[11.5px] text-state-error">Use letters, numbers, dashes and slashes — and not {project.default_branch}.</span>}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-text-secondary">Commit message</span>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Add ${frozen.length} file${frozen.length === 1 ? '' : 's'} from Hive Drive`} />
            </label>
            <div className="flex items-center justify-between gap-4 rounded-xl border hive-line px-3.5 py-3">
              <div>
                <div className="text-[13px] font-medium">Open a pull request</div>
                <div className="text-[11.5px] text-text-muted">Into {project.default_branch}, so the team can review it.</div>
              </div>
              <Toggle on={openPr} onChange={setOpenPr} label="Open a pull request" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={!branchOk || !frozen.length} loading={busy}>
                <GitPullRequest /> {openPr ? 'Send & open PR' : 'Send'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  )
}

function ImportDialog({ open, onClose, project, folder, onDone }: { open: boolean; onClose: () => void; project: Project; folder: string; onDone: (n: number, dest: string) => void }) {
  const toast = useToast()
  const [paths, setPaths] = useState('')
  const [dest, setDest] = useState('/repo')
  const [busy, setBusy] = useState(false)
  const [tree, setTree] = useState<string[] | null>(null)
  const [find, setFind] = useState('')
  useEffect(() => {
    if (!open) return
    setPaths('')
    setFind('')
    setDest(folder === '/' ? '/repo' : folder)
    if (tree) return
    hiveApi
      .projectTree(project.id)
      .then((r) => setTree(r.paths))
      .catch(() => setTree([]))
    // Load the repository's file list once per project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => setTree(null), [project.id])

  const list = paths
    .split('\n')
    .map((s) => s.trim().replace(/^\/+/, ''))
    .filter(Boolean)
  const picked = new Set(list)
  const f = find.trim().toLowerCase()
  const matches = f && tree ? tree.filter((p) => p.toLowerCase().includes(f) && !picked.has(p)).slice(0, 40) : []
  const add = (p: string) => setPaths((cur) => (cur.trim() ? `${cur.replace(/\n+$/, '')}\n${p}` : p))

  const submit = async () => {
    if (!list.length) return
    setBusy(true)
    try {
      const d = dest.trim() || '/repo'
      const r = await hiveApi.driveImport({ projectId: project.id, paths: list, folder: d })
      onDone(r.files.length, d.startsWith('/') ? d : `/${d}`)
    } catch (e) {
      toast.error('Couldn’t import', errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Import from repository" description={`Copy files from ${project.repo_owner}/${project.repo_name} (${project.default_branch}) into this Drive.`} size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4"
      >
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-text-secondary">Find files in the repo</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder={tree === null ? 'Loading the file list…' : 'Type part of a path, e.g. README'} className="pl-9 text-[13px]" disabled={tree === null} />
          </div>
          {matches.length > 0 && (
            <ul className="hive-sunken hive-scroll mt-1.5 max-h-40 overflow-y-auto rounded-xl p-1">
              {matches.map((p) => (
                <li key={p}>
                  <button type="button" onClick={() => add(p)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left font-mono text-[12px] text-text-secondary hover:bg-text-primary/[0.05] hover:text-text-primary">
                    <FileIcon className="size-3.5 shrink-0" style={{ color: KIND[kindOf({ kind: 'file', name: p, mime: null })].color }} />
                    <span className="truncate">{p}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-text-secondary">Paths to import (one per line)</span>
          <Textarea value={paths} onChange={(e) => setPaths(e.target.value)} placeholder={'README.md\ndocs/architecture.pdf'} className="hive-code min-h-[110px]" spellCheck={false} />
          <span className="mt-1 block text-[11.5px] text-text-muted">{list.length ? `${list.length} file${list.length === 1 ? '' : 's'} · up to 50 at a time` : 'Files only, up to 50 at a time.'}</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-text-secondary">Put them in</span>
          <Input value={dest} onChange={(e) => setDest(e.target.value)} className="font-mono text-[13px]" />
          <span className="mt-1 block text-[11.5px] text-text-muted">Repo folders are kept below this one. Existing files with the same path are replaced.</span>
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={!list.length} loading={busy}>
            <FolderGit2 /> Import {list.length || ''}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
