import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { API_BASE } from '@/lib/api'
import { hiveApi } from './api'
import type { AgentRow, Approval, Bootstrap, ChatMessage, CodeStream, HiveEvent, LiveAgent, Machine, OnlineUser, Project, Task } from './types'

export interface TaskDetail {
  task: Task
  project: Project
  agents: AgentRow[]
  events: HiveEvent[]
  variants: string[]
}

interface HiveValue {
  boot: Bootstrap | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  connected: boolean
  online: OnlineUser[]
  typing: Record<string, number>
  projectId: string | null
  taskId: string | null
  project: Project | null
  tasks: Task[]
  tasksLoading: boolean
  refreshTasks: () => Promise<void>
  detail: TaskDetail | null
  detailLoading: boolean
  refreshDetail: () => Promise<void>
  /** Live text being streamed per agent (cleared when the turn's text lands). */
  streaming: Record<string, string>
  thinking: Record<string, string>
  /** Bumps whenever the task's working copy changes. */
  changesVersion: number
  chat: ChatMessage[]
  emitTyping: () => void
  select: (projectId: string | null, taskId?: string | null, opts?: { viewTransition?: boolean }) => void
  /** Agents running anywhere in the hive right now. */
  live: LiveAgent[]
  /** What each agent is typing into a file right now. */
  code: Record<string, CodeStream>
  /** Every task we've heard about, across projects (tabs, home). */
  taskIndex: Record<string, Task & { project_name?: string }>
  noteTasks: (tasks: (Task & { project_name?: string })[]) => void
  memoryVersion: number
  pluginsVersion: number
  convosVersion: number
  on: (event: string, fn: (...args: never[]) => void) => () => void
  emit: (event: string, payload: unknown) => void
  /** Connected computers/servers running the bridge. */
  machines: Machine[]
  refreshMachines: () => Promise<void>
  /** Commands waiting for a human's yes/no. */
  approvals: Approval[]
  answerApproval: (id: string, approved: boolean) => Promise<void>
  ideasVersion: number
  modelsVersion: number
  /** Ask everything that lists chats to reload. */
  touchConvos: () => void
}

const HiveContext = createContext<HiveValue | null>(null)

export function useHive(): HiveValue {
  const ctx = useContext(HiveContext)
  if (!ctx) throw new Error('useHive must be used inside HiveProvider')
  return ctx
}

export function HiveProvider({
  projectId,
  taskId,
  onSelect,
  children,
}: {
  projectId: string | null
  taskId: string | null
  onSelect: (projectId: string | null, taskId?: string | null, opts?: { viewTransition?: boolean }) => void
  children: ReactNode
}) {
  const [boot, setBoot] = useState<Bootstrap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [online, setOnline] = useState<OnlineUser[]>([])
  const [typing, setTyping] = useState<Record<string, number>>({})
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [detail, setDetail] = useState<TaskDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [streaming, setStreaming] = useState<Record<string, string>>({})
  const [thinking, setThinking] = useState<Record<string, string>>({})
  const [changesVersion, setChangesVersion] = useState(0)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [live, setLive] = useState<LiveAgent[]>([])
  const [code, setCode] = useState<Record<string, CodeStream>>({})
  const [taskIndex, setTaskIndex] = useState<Record<string, Task & { project_name?: string }>>({})
  const [memoryVersion, setMemoryVersion] = useState(0)
  const [pluginsVersion, setPluginsVersion] = useState(0)
  const [convosVersion, setConvosVersion] = useState(0)
  const [ideasVersion, setIdeasVersion] = useState(0)
  const [modelsVersion, setModelsVersion] = useState(0)
  const [machines, setMachines] = useState<Machine[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const refreshMachines = useCallback(async () => {
    try {
      const r = await hiveApi.machines()
      setMachines(r.machines)
      setApprovals(r.approvals)
    } catch {
      /* not fatal */
    }
  }, [])
  const answerApproval = useCallback(async (id: string, approved: boolean) => {
    setApprovals((a) => a.filter((x) => x.id !== id))
    await hiveApi.answer(id, approved).catch(() => {})
  }, [])
  const socketRef = useRef<Socket | null>(null)
  const [sock, setSock] = useState<Socket | null>(null)
  const noteTasks = useCallback((list: (Task & { project_name?: string })[]) => {
    setTaskIndex((m) => {
      const n = { ...m }
      for (const t of list) n[t.id] = { ...n[t.id], ...t }
      return n
    })
  }, [])
  const ids = useRef({ projectId, taskId })
  ids.current = { projectId, taskId }

  const refresh = useCallback(async () => {
    try {
      const b = await hiveApi.bootstrap()
      setBoot(b)
      setOnline((o) => (o.length ? o : b.online))
      setLive(b.live ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Hive')
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced bootstrap refresh for key/usage churn while agents run.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const softRefresh = useCallback(() => {
    if (refreshTimer.current) return
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      refresh()
    }, 1500)
  }, [refresh])

  const refreshTasks = useCallback(async () => {
    const pid = ids.current.projectId
    if (!pid) return setTasks([])
    setTasksLoading(true)
    try {
      const r = await hiveApi.tasks(pid)
      if (ids.current.projectId === pid) setTasks(r.tasks)
      noteTasks(r.tasks)
    } finally {
      setTasksLoading(false)
    }
  }, [noteTasks])

  const refreshDetail = useCallback(async () => {
    const tid = ids.current.taskId
    if (!tid) return setDetail(null)
    setDetailLoading(true)
    try {
      const r = await hiveApi.task(tid)
      if (ids.current.taskId === tid) setDetail({ task: r.task, project: r.project, agents: r.agents, events: r.events, variants: r.variants })
    } catch {
      if (ids.current.taskId === tid) setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    refreshMachines()
    // Machines' online state is time-based: re-read it now and then.
    const t = setInterval(refreshMachines, 30000)
    return () => clearInterval(t)
  }, [refresh, refreshMachines])

  // Socket: one connection to the staff-only /hive namespace.
  useEffect(() => {
    const opts = { transports: ['websocket', 'polling'], withCredentials: true }
    const s = io(`${API_BASE}/hive`, opts)
    socketRef.current = s
    setSock(s)
    s.on('connect', () => {
      setConnected(true)
      s.emit('view', ids.current)
      // Rooms are per connection: catch up on anything missed while away.
      refreshMachines()
      if (ids.current.taskId) refreshDetail()
    })
    s.on('disconnect', () => setConnected(false))
    s.on('presence', (r: OnlineUser[]) => setOnline(r))
    s.on('typing', ({ username, projectId: pid }: { username: string; projectId: string }) => {
      if (pid !== ids.current.projectId) return
      setTyping((t) => ({ ...t, [username]: Date.now() }))
    })
    s.on('keys', softRefresh)
    s.on('usage', softRefresh)
    s.on('github', softRefresh)
    s.on('project', (p: Project) =>
      setBoot((b) => (b ? { ...b, projects: [p, ...b.projects.filter((x) => x.id !== p.id)].sort((a, c) => c.updated_at - a.updated_at) } : b)),
    )
    s.on('project_deleted', ({ id }: { id: string }) => {
      setBoot((b) => (b ? { ...b, projects: b.projects.filter((x) => x.id !== id) } : b))
      if (ids.current.projectId === id) onSelect(null)
    })
    s.on('radar', (r: LiveAgent[]) => setLive(r))
    s.on('memory', () => setMemoryVersion((v) => v + 1))
    s.on('plugins', () => setPluginsVersion((v) => v + 1))
    s.on('convos', () => setConvosVersion((v) => v + 1))
    s.on('ideas', () => setIdeasVersion((v) => v + 1))
    s.on('models', () => setModelsVersion((v) => v + 1))
    s.on('machines', () => refreshMachines())
    s.on('approval', (a: Approval) => setApprovals((l) => (l.some((x) => x.id === a.id) ? l : [...l, a])))
    s.on('approval_done', ({ id }: { id: string }) => setApprovals((l) => l.filter((x) => x.id !== id)))
    s.on('code', (c: Omit<CodeStream, 'at'> & { agentId: string }) => setCode((m) => ({ ...m, [c.agentId]: { tool: c.tool, path: c.path, text: c.text, old: c.old, at: Date.now() } })))
    s.on('code_done', ({ agentId }: { agentId: string }) => setCode((m) => (m[agentId] ? { ...m, [agentId]: { ...m[agentId], done: true } } : m)))
    s.on('task', (t: Task) => {
      setTaskIndex((m) => ({ ...m, [t.id]: { ...m[t.id], ...t } }))
      if (t.archived) {
        setTasks((list) => list.filter((x) => x.id !== t.id))
        if (t.id === ids.current.taskId) onSelect(t.project_id)
        return
      }
      if (t.project_id === ids.current.projectId) {
        setTasks((list) => {
          const prev = list.find((x) => x.id === t.id)
          const next = { ...prev, ...t, agents: prev?.agents ?? [] }
          return [next, ...list.filter((x) => x.id !== t.id)].sort((a, c) => c.updated_at - a.updated_at)
        })
      }
      if (t.id === ids.current.taskId) setDetail((d) => (d ? { ...d, task: { ...d.task, ...t } } : d))
      softRefresh()
    })
    s.on('agent', (a: Partial<AgentRow> & { id: string; task_id: string }) => {
      setTasks((list) =>
        list.map((t) => {
          if (t.id !== a.task_id) return t
          const agents = t.agents ?? []
          const i = agents.findIndex((x) => x.id === a.id)
          const merged = { ...(agents[i] ?? {}), ...a } as NonNullable<Task['agents']>[number]
          return { ...t, agents: i >= 0 ? agents.map((x, j) => (j === i ? merged : x)) : [...agents, merged] }
        }),
      )
      if (a.task_id === ids.current.taskId && 'instructions' in a) {
        setDetail((d) => {
          if (!d) return d
          const i = d.agents.findIndex((x) => x.id === a.id)
          const agents = i >= 0 ? d.agents.map((x) => (x.id === a.id ? (a as AgentRow) : x)) : [...d.agents, a as AgentRow]
          return { ...d, agents }
        })
      }
    })
    s.on('event', (ev: HiveEvent) => {
      if (ev.task_id !== ids.current.taskId) return
      setDetail((d) => (d && !d.events.some((x) => x.id === ev.id) ? { ...d, events: [...d.events, ev] } : d))
      if (ev.agent_id && (ev.kind === 'text' || ev.kind === 'status' || ev.kind === 'error')) {
        setStreaming((m) => ({ ...m, [ev.agent_id!]: '' }))
        setThinking((m) => ({ ...m, [ev.agent_id!]: '' }))
      }
      if (ev.kind === 'commit' || ev.kind === 'human_edit') setChangesVersion((v) => v + 1)
    })
    s.on('delta', ({ agentId, text }: { agentId: string; text: string }) => setStreaming((m) => ({ ...m, [agentId]: (m[agentId] ?? '') + text })))
    s.on('thinking', ({ agentId, text }: { agentId: string; text: string }) => setThinking((m) => ({ ...m, [agentId]: ((m[agentId] ?? '') + text).slice(-6000) })))
    s.on('turn', ({ agentId }: { agentId: string }) => {
      setStreaming((m) => ({ ...m, [agentId]: '' }))
      setThinking((m) => ({ ...m, [agentId]: '' }))
    })
    s.on('changes', () => setChangesVersion((v) => v + 1))
    s.on('chat', (m: ChatMessage) => {
      if (m.project_id === ids.current.projectId) setChat((c) => (c.some((x) => x.id === m.id) ? c : [...c, m]))
      setTyping((t) => {
        const n = { ...t }
        delete n[m.username]
        return n
      })
    })
    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [softRefresh, onSelect, refreshMachines, refreshDetail])

  // Tell the namespace what we're looking at (presence + task room).
  useEffect(() => {
    socketRef.current?.emit('view', { projectId, taskId })
  }, [projectId, taskId])

  useEffect(() => {
    setTasks([])
    setChat([])
    refreshTasks()
    if (projectId) hiveApi.chat(projectId).then((r) => setChat(r.messages)).catch(() => {})
  }, [projectId, refreshTasks])

  useEffect(() => {
    setDetail(null)
    setStreaming({})
    setThinking({})
    refreshDetail()
  }, [taskId, refreshDetail])

  // Typing indicators fade after a few seconds.
  useEffect(() => {
    const t = setInterval(() => setTyping((m) => Object.fromEntries(Object.entries(m).filter(([, at]) => Date.now() - at < 4000))), 2000)
    return () => clearInterval(t)
  }, [])

  const lastTyping = useRef(0)
  const emitTyping = useCallback(() => {
    if (Date.now() - lastTyping.current < 1500) return
    lastTyping.current = Date.now()
    socketRef.current?.emit('typing', { projectId: ids.current.projectId })
  }, [])

  const project = useMemo(() => boot?.projects.find((p) => p.id === projectId) ?? null, [boot, projectId])

  const on = useCallback(
    (event: string, fn: (...args: never[]) => void) => {
      sock?.on(event, fn as never)
      return () => {
        sock?.off(event, fn as never)
      }
    },
    [sock],
  )
  const emit = useCallback((event: string, payload: unknown) => {
    socketRef.current?.emit(event, payload)
  }, [])

  const value: HiveValue = {
    boot,
    loading,
    error,
    refresh,
    connected,
    online,
    typing,
    projectId,
    taskId,
    project,
    tasks,
    tasksLoading,
    refreshTasks,
    detail,
    detailLoading,
    refreshDetail,
    streaming,
    thinking,
    changesVersion,
    chat,
    emitTyping,
    select: onSelect,
    live,
    code,
    taskIndex,
    noteTasks,
    memoryVersion,
    pluginsVersion,
    convosVersion,
    on,
    emit,
    machines,
    refreshMachines,
    approvals,
    answerApproval,
    ideasVersion,
    modelsVersion,
    touchConvos: () => setConvosVersion((v) => v + 1),
  }
  return <HiveContext.Provider value={value}>{children}</HiveContext.Provider>
}
