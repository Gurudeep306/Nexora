import { api } from '@/lib/api'
import { API_BASE } from '@/lib/api'
import type { ArchitectReply, Cap, CatalogInfo, Checkpoint, CliStatus, ConnectedModel, DriveItem, GithubReport, HiveAlert, ImproveResult, Lifecycle, MeasuredStat, Pipeline, PipelineRun, PipelineStage, PipelineTemplate, RouteResult, Schedule, ScheduleTemplate, Spend, StewardAction, StewardPlan, StewardReport, Toolbox, Verdict, HealthKey, Dispatch, CopilotMsg, CopilotBrain, CopilotSettings, CopilotWork, GhRepo } from './types'
import type { AgentRow, AgentSpec, Approval, Bootstrap, Change, ChatMessage, Check, Convo, ConvoMsg, HiveEvent, HiveFile, Idea, LinkedRepo, LiveAgent, Machine, MarketModel, MemoryItem, Mode, Plugin, PrInfo, Project, ProjectActivity, Task } from './types'

type Ok<T> = T & { ok: boolean }

export const hiveApi = {
  bootstrap: () => api.get<Ok<Bootstrap>>('/api/hive/bootstrap'),
  stats: () =>
    api.get<Ok<{ byProvider: { provider: string; day: string; input: number; output: number; requests: number; cost: number }[]; byUser: { username: string; tokens: number; requests: number }[]; tasks: { total: number; running: number; prs: number }; runningAgents: number }>>(
      '/api/hive/stats',
    ),

  addKey: (body: Record<string, unknown>) => api.post<Ok<{ id: string; check: { ok: boolean; error?: string } }>>('/api/hive/keys', body, { timeoutMs: 60000 }),
  updateKey: (id: string, body: Record<string, unknown>) => api.patch<Ok<object>>(`/api/hive/keys/${id}`, body),
  deleteKey: (id: string) => api.delete<Ok<object>>(`/api/hive/keys/${id}`),
  checkKey: (id: string) => api.post<Ok<{ ok: boolean; error?: string }>>(`/api/hive/keys/${id}/check`, {}, { timeoutMs: 60000 }),
  keyUsage: (id: string) => api.get<Ok<{ days: { day: string; input: number; output: number; requests: number }[]; byUser: { username: string; tokens: number; requests: number }[] }>>(`/api/hive/keys/${id}/usage`),

  addGithub: (body: { token: string; label?: string }) => api.post<Ok<{ id: string; login: string }>>('/api/hive/github', body),
  deleteGithub: (id: string) => api.delete<Ok<object>>(`/api/hive/github/${id}`),
  repos: (id: string) =>
    api.get<Ok<{ repos: { owner: string; name: string; fullName: string; private: boolean; defaultBranch: string; description: string | null; pushedAt: string }[] }>>(`/api/hive/github/${id}/repos`, { timeoutMs: 45000 }),

  allRepos: (refresh = false) => api.get<Ok<{ repos: GhRepo[]; connections: number; errors: string[] }>>(`/api/hive/repos${refresh ? '?refresh=1' : ''}`, { timeoutMs: 60000 }),
  projectChat: (projectId: string, fresh = false) => api.post<Ok<{ convo: Convo }>>(`/api/hive/projects/${projectId}/chat`, { fresh }),
  openRepo: (repo: string) => api.post<Ok<{ project: Project; created: boolean }>>('/api/hive/repos/open', { repo }, { timeoutMs: 45000 }),
  importStart: (body: { name: string; private?: boolean; githubId?: string }) => api.post<Ok<{ id: string; repo: string; private: boolean; maxFile: number }>>('/api/hive/import/start', body, { timeoutMs: 60000 }),
  importFiles: (id: string, files: { file: File; path: string }[]) => {
    const fd = new FormData()
    for (const f of files) {
      fd.append('files', f.file, f.file.name)
      fd.append('paths', f.path)
    }
    return api.post<Ok<{ files: { path: string; ok?: boolean; error?: string }[]; skipped: number; total: number }>>(`/api/hive/import/${id}/files`, fd, { timeoutMs: 600000 })
  },
  importFinish: (id: string) => api.post<Ok<{ project: Project; repo: string; files: number; skipped: number }>>(`/api/hive/import/${id}/finish`, {}, { timeoutMs: 300000 }),
  writeBrief: (projectId: string) => api.post<Ok<{ instructions: string }>>(`/api/hive/projects/${projectId}/brief`, {}, { timeoutMs: 120000 }),
  createProject: (body: Record<string, unknown>) => api.post<Ok<{ project: Project }>>('/api/hive/projects', body),
  updateProject: (id: string, body: Record<string, unknown>) => api.patch<Ok<{ project: Project }>>(`/api/hive/projects/${id}`, body),
  deleteProject: (id: string) => api.delete<Ok<object>>(`/api/hive/projects/${id}`),
  branches: (id: string) => api.get<Ok<{ branches: { name: string; sha: string }[] }>>(`/api/hive/projects/${id}/branches`),
  projectTree: (projectId: string) => api.get<Ok<{ paths: string[]; sha: string }>>(`/api/hive/projects/${projectId}/tree`, { timeoutMs: 60000 }),
  tasks: (projectId: string, archived = false) => api.get<Ok<{ tasks: Task[] }>>(`/api/hive/projects/${projectId}/tasks`, { query: { archived: archived ? 1 : undefined } }),
  createTask: (projectId: string, body: { prompt: string; title?: string; mode: Mode; agents: AgentSpec[]; lead?: AgentSpec | null; baseRef?: string; attachments?: string[]; budgetTokens?: number | null; machineId?: string | null; folder?: string | null; repoId?: string | null }) =>
    api.post<Ok<{ task: Task }>>(`/api/hive/projects/${projectId}/tasks`, body, { timeoutMs: 90000 }),

  task: (id: string) => api.get<Ok<{ task: Task; project: Project; agents: AgentRow[]; events: HiveEvent[]; variants: string[] }>>(`/api/hive/tasks/${id}`),
  updateTask: (id: string, body: Record<string, unknown>) => api.patch<Ok<{ task: Task }>>(`/api/hive/tasks/${id}`, body),
  changes: (id: string, variant = 'main') => api.get<Ok<{ changes: Change[]; index: string }>>(`/api/hive/tasks/${id}/changes`, { query: { variant } }),
  tree: (id: string, variant = 'main') => api.get<Ok<{ paths: string[]; total: number; truncated: boolean; index: string }>>(`/api/hive/tasks/${id}/tree`, { query: { variant }, timeoutMs: 60000 }),
  file: (id: string, path: string, variant = 'main') =>
    api.get<Ok<{ path: string; base: string | null; current: string | null; status: string }>>(`/api/hive/tasks/${id}/file`, { query: { path, variant }, timeoutMs: 45000 }),
  saveFile: (id: string, path: string, content: string, variant = 'main') => api.put<Ok<object>>(`/api/hive/tasks/${id}/file`, { path, content, variant }),
  revertFile: (id: string, path: string, variant = 'main') => api.delete<Ok<object>>(`/api/hive/tasks/${id}/file`, { query: { path, variant } }),
  adopt: (id: string, variant: string) => api.post<Ok<object>>(`/api/hive/tasks/${id}/adopt`, { variant }),
  commit: (id: string, body: { message: string; branch?: string; openPr: boolean; prTitle?: string; prBody?: string; variant?: string }) =>
    api.post<Ok<{ sha: string; url: string; branch: string; pr: { url: string; number: number } | null; files: number }>>(`/api/hive/tasks/${id}/commit`, body, { timeoutMs: 120000 }),
  addAgent: (id: string, body: { prompt: string; agent: AgentSpec; readOnly?: boolean; variant?: string }) => api.post<Ok<{ agent: AgentRow }>>(`/api/hive/tasks/${id}/agents`, body, { timeoutMs: 60000 }),
  stopTask: (id: string) => api.post<Ok<object>>(`/api/hive/tasks/${id}/stop`, {}),
  stopAgent: (id: string) => api.post<Ok<object>>(`/api/hive/agents/${id}/stop`, {}),
  steer: (id: string, message: string) => api.post<Ok<object>>(`/api/hive/agents/${id}/steer`, { message }),

  overview: () => api.get<Ok<{ tasks: (Task & { project_name: string; project_color: string; repo_owner: string; repo_name: string })[]; live: LiveAgent[]; today: { tokens: number; requests: number; cost: number } }>>('/api/hive/overview'),
  assign: (taskId: string, body: { title?: string; instructions: string; agents: AgentSpec[]; together: boolean }) => api.post<Ok<{ agents: AgentRow[] }>>(`/api/hive/tasks/${taskId}/assign`, body, { timeoutMs: 60000 }),
  handoff: (agentId: string, agent: AgentSpec) => api.post<Ok<{ agent: AgentRow }>>(`/api/hive/agents/${agentId}/handoff`, { agent }, { timeoutMs: 60000 }),

  memory: (projectId: string) => api.get<Ok<{ memory: MemoryItem[] }>>(`/api/hive/projects/${projectId}/memory`),
  addMemory: (projectId: string, body: { title: string; body: string; pinned?: boolean }) => api.post<Ok<{ id: string }>>(`/api/hive/projects/${projectId}/memory`, body),
  updateMemory: (id: string, body: Record<string, unknown>) => api.patch<Ok<object>>(`/api/hive/memory/${id}`, body),
  deleteMemory: (id: string) => api.delete<Ok<object>>(`/api/hive/memory/${id}`),

  plugins: (projectId?: string | null) => api.get<Ok<{ builtins: Plugin[]; custom: Plugin[] }>>('/api/hive/plugins', { query: { projectId: projectId ?? undefined } }),
  setPlugin: (id: string, body: { scope: string; enabled?: boolean; config?: Record<string, unknown> }) => api.put<Ok<object>>(`/api/hive/plugins/builtin/${id}`, body),
  addCustomPlugin: (body: { scope: string; name: string; description?: string; instructions: string; appliesTo: string }) => api.post<Ok<{ id: string }>>('/api/hive/plugins/custom', body),
  updateCustomPlugin: (id: string, body: Record<string, unknown>) => api.patch<Ok<object>>(`/api/hive/plugins/custom/${id}`, body),
  deleteCustomPlugin: (id: string) => api.delete<Ok<object>>(`/api/hive/plugins/custom/${id}`),

  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<Ok<{ file: HiveFile }>>('/api/hive/files', fd, { timeoutMs: 120000 })
  },
  convos: () => api.get<Ok<{ convos: Convo[] }>>('/api/hive/convos'),
  createConvo: (body: { title?: string; projectId?: string | null; system?: string } = {}) => api.post<Ok<{ convo: Convo }>>('/api/hive/convos', body),
  convo: (id: string) => api.get<Ok<{ convo: Convo; messages: ConvoMsg[] }>>(`/api/hive/convos/${id}`),
  updateConvo: (id: string, body: Record<string, unknown>) => api.patch<Ok<object>>(`/api/hive/convos/${id}`, body),
  deleteConvo: (id: string) => api.delete<Ok<object>>(`/api/hive/convos/${id}`),
  sendMessage: (id: string, body: { text: string; refs?: ({ fileId: string } | { projectId: string; path: string })[]; agent: AgentSpec; mode?: 'text' | 'image' }) =>
    api.post<Ok<{ user: ConvoMsg; replyId: string }>>(`/api/hive/convos/${id}/messages`, body, { timeoutMs: 60000 }),
  prefer: (id: string, messageId: string) => api.post<Ok<object>>(`/api/hive/convos/${id}/prefer`, { messageId }),
  stopConvo: (id: string) => api.post<Ok<object>>(`/api/hive/convos/${id}/stop`, {}),

  /** Send and stream the reply on the same request (NDJSON). Never misses a reply. */
  streamMessage: async (
    id: string,
    body: { text: string; refs?: ({ fileId: string } | { projectId: string; path: string })[]; agent: AgentSpec; agents?: AgentSpec[]; mode?: 'text' | 'image' },
    onEvent: (type: string, data: never) => void,
    signal?: AbortSignal,
  ) => {
    const res = await fetch(`${API_BASE}/api/hive/convos/${id}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      // The project in focus (top bar): chats without a project still get its context.
      body: JSON.stringify({ ...body, stream: true, focusProjectId: (() => {
        try {
          return localStorage.getItem('hive:lastProject')
        } catch {
          return null
        }
      })() }),
      signal,
    })
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => ({}))
      throw new Error((j as { error?: string }).error || `Request failed (${res.status})`)
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim()
        buf = buf.slice(i + 1)
        if (!line) continue
        try {
          const ev = JSON.parse(line) as { type: string; data: never }
          if (ev.type !== 'ping') onEvent(ev.type, ev.data)
        } catch {
          /* partial line */
        }
      }
    }
  },

  // Machines (bridge) and approvals
  machines: () => api.get<Ok<{ machines: Machine[]; approvals: Approval[] }>>('/api/hive/machines'),
  addMachine: (name: string) => api.post<Ok<{ id: string; token: string }>>('/api/hive/machines', { name }),
  updateMachine: (id: string, body: { name?: string; policy?: string }) => api.patch<Ok<object>>(`/api/hive/machines/${id}`, body),
  rotateMachine: (id: string) => api.post<Ok<{ token: string }>>(`/api/hive/machines/${id}/token`, {}),
  deleteMachine: (id: string) => api.delete<Ok<object>>(`/api/hive/machines/${id}`),
  folders: (id: string, path?: string) => api.get<Ok<{ path: string; roots: string[]; dirs: { name: string; path: string; git: boolean }[] }>>(`/api/hive/machines/${id}/folders`, { query: { path }, timeoutMs: 30000 }),
  clone: (id: string, body: { projectId: string; parent?: string; name?: string }) => api.post<Ok<{ path: string; existed: boolean }>>(`/api/hive/machines/${id}/clone`, body, { timeoutMs: 620000 }),
  exec: (id: string, body: { folder: string; command: string; timeoutMs?: number }) =>
    api.post<Ok<{ code: number | null; signal: string | null; output: string; ms: number }>>(`/api/hive/machines/${id}/exec`, body, { timeoutMs: 620000 }),
  procs: (id: string, body: { op: string; id?: string; folder?: string; command?: string }) =>
    api.post<Ok<{ procs?: { id: string; cmd: string; cwd: string; running: boolean; started: number }[]; log?: string; running?: boolean; exit?: number | null }>>(`/api/hive/machines/${id}/procs`, body, { timeoutMs: 60000 }),
  approvals: () => api.get<Ok<{ approvals: Approval[] }>>('/api/hive/approvals'),
  answer: (id: string, approved: boolean, note?: string) => api.post<Ok<object>>(`/api/hive/approvals/${id}`, { approved, note }),

  // Linked repos, ship pipeline
  projectRepos: (id: string) => api.get<Ok<{ repos: LinkedRepo[] }>>(`/api/hive/projects/${id}/repos`),
  addProjectRepo: (id: string, body: { githubId: string; owner: string; repo: string; role?: string }) => api.post<Ok<{ id: string }>>(`/api/hive/projects/${id}/repos`, body),
  removeProjectRepo: (id: string, repoId: string) => api.delete<Ok<object>>(`/api/hive/projects/${id}/repos/${repoId}`),
  activity: (id: string) => api.get<Ok<ProjectActivity>>(`/api/hive/projects/${id}/activity`, { timeoutMs: 45000 }),
  setSite: (id: string, siteUrl: string) => api.patch<Ok<object>>(`/api/hive/projects/${id}/site`, { siteUrl }),
  pr: (taskId: string) => api.get<Ok<{ pr: PrInfo; checks: Check[]; state: string }>>(`/api/hive/tasks/${taskId}/pr`, { timeoutMs: 45000 }),
  merge: (taskId: string, method = 'squash') => api.post<Ok<{ sha: string }>>(`/api/hive/tasks/${taskId}/merge`, { method }, { timeoutMs: 60000 }),

  // Checkpoints
  checkpoints: (taskId: string) => api.get<Ok<{ checkpoints: Checkpoint[] }>>(`/api/hive/tasks/${taskId}/checkpoints`),
  saveCheckpoint: (taskId: string, label?: string, variant = 'main') => api.post<Ok<{ checkpoint: Checkpoint }>>(`/api/hive/tasks/${taskId}/checkpoints`, { label, variant }, { timeoutMs: 60000 }),
  restoreCheckpoint: (taskId: string, cpId: string, force = false) => api.post<Ok<{ variant: string; label: string }>>(`/api/hive/tasks/${taskId}/checkpoints/${cpId}/restore`, { force }, { timeoutMs: 60000 }),
  githubTest: (id: string, owner: string, repo: string) => api.post<Ok<{ report: GithubReport }>>(`/api/hive/github/${id}/test`, { owner, repo }, { timeoutMs: 30000 }),

  // Launchpad
  ideas: () => api.get<Ok<{ ideas: Idea[] }>>('/api/hive/ideas'),
  createIdea: (pitch: string, agent?: AgentSpec | null) => api.post<Ok<{ idea: Idea }>>('/api/hive/ideas', { pitch, agent }, { timeoutMs: 300000 }),
  refineIdea: (id: string, feedback: string, agent?: AgentSpec | null) => api.post<Ok<{ idea: Idea }>>(`/api/hive/ideas/${id}/refine`, { feedback, agent }, { timeoutMs: 300000 }),
  updateIdea: (id: string, plan: unknown) => api.patch<Ok<object>>(`/api/hive/ideas/${id}`, { plan }),
  deleteIdea: (id: string) => api.delete<Ok<object>>(`/api/hive/ideas/${id}`),
  launchIdea: (id: string, body: { githubId?: string; org?: string; private?: boolean; repoName?: string; machineId?: string; parent?: string; agents: AgentSpec[]; color?: string }) =>
    api.post<Ok<{ project: Project; task: Task }>>(`/api/hive/ideas/${id}/launch`, body, { timeoutMs: 180000 }),

  // Model radar
  radar: (refresh = false) => api.get<Ok<{ recent: { vendor: string; model: string; first_seen: number }[]; market: MarketModel[]; marketAt: number; marketError: string | null }>>('/api/hive/models/radar', { query: { refresh: refresh ? 1 : undefined }, timeoutMs: 30000 }),
  refreshModels: () => api.post<Ok<{ fresh: string[] }>>('/api/hive/models/refresh', {}, { timeoutMs: 120000 }),

  chat: (projectId: string) => api.get<Ok<{ messages: ChatMessage[] }>>(`/api/hive/projects/${projectId}/chat`),
  sendChat: (projectId: string, body: string, taskId?: string | null) => api.post<Ok<{ message: ChatMessage }>>(`/api/hive/projects/${projectId}/chat`, { body, taskId }),

  /* ── v4 ─────────────────────────────────────────────────────────────── */
  catalog: () => api.get<Ok<CatalogInfo>>('/api/hive/catalog'),
  connectedModels: () => api.get<Ok<{ models: ConnectedModel[] }>>('/api/hive/models/connected'),
  perf: () => api.get<Ok<{ stats: MeasuredStat[] }>>('/api/hive/perf'),
  route: (body: { prompt: string; kind?: string | null; chat?: boolean; machineId?: string | null; freeOnly?: boolean; preference?: string | null }) => api.post<Ok<RouteResult>>('/api/hive/route', body),
  improve: (body: { prompt: string; mode?: 'task' | 'chat' | 'idea'; projectId?: string | null }) => api.post<Ok<ImproveResult>>('/api/hive/improve', body, { timeoutMs: 120000 }),
  lifecycle: (projectId: string) => api.get<Ok<Lifecycle>>(`/api/hive/projects/${projectId}/lifecycle`),
  setIsolation: (projectId: string, isolate: boolean) => api.patch<Ok<object>>(`/api/hive/projects/${projectId}/isolation`, { isolate }),

  refreshPlanUsage: (keyId?: string) => api.post<Ok<{ results: { keyId: string; windows?: Record<string, unknown>; error?: string }[] }>>('/api/hive/subscriptions/usage', keyId ? { keyId } : {}, { timeoutMs: 60000 }),
  addSubscription: (body: { provider: 'claude_code' | 'codex' | 'vibe'; machineId: string; label?: string; token?: string; tokenLimit?: number | null; limitPeriod?: string }) =>
    api.post<Ok<{ id: string; check: { ok: boolean; error?: string } }>>('/api/hive/subscriptions', body, { timeoutMs: 90000 }),
  machineAgents: (id: string) => api.get<Ok<{ online: boolean; agents: { claude_code?: CliStatus; codex?: CliStatus; vibe?: CliStatus } }>>(`/api/hive/machines/${id}/agents`, { timeoutMs: 60000 }),

  caps: () => api.get<Ok<{ caps: Cap[] }>>('/api/hive/caps'),
  addCap: (body: { scopeType: Cap['scopeType']; scope?: string; tokens?: number | null; dollars?: number | null; period: Cap['period']; action: Cap['action'] }) => api.post<Ok<{ id: string }>>('/api/hive/caps', body),
  deleteCap: (id: string) => api.delete<Ok<object>>(`/api/hive/caps/${id}`),
  spend: (days = 30) => api.get<Ok<Spend>>('/api/hive/spend', { query: { days } }),
  alerts: () => api.get<Ok<{ alerts: HiveAlert[]; unread: number }>>('/api/hive/alerts'),
  readAlerts: () => api.post<Ok<object>>('/api/hive/alerts/read', {}),

  myMemory: () => api.get<Ok<{ facts: { id: string; fact: string; source: string; created_at: number }[] }>>('/api/hive/me/memory'),
  addMyMemory: (fact: string) => api.post<Ok<{ id: string }>>('/api/hive/me/memory', { fact }),
  deleteMyMemory: (id: string) => api.delete<Ok<object>>(`/api/hive/me/memory/${id}`),

  judgeChat: (convoId: string, groupId: string) => api.post<Ok<{ verdict: Verdict }>>(`/api/hive/convos/${convoId}/judge`, { groupId }, { timeoutMs: 180000 }),
  rateMessage: (convoId: string, messageId: string, good: boolean) => api.post<Ok<object>>(`/api/hive/convos/${convoId}/rate`, { messageId, good }),
  setConvoTools: (convoId: string, tools: boolean) => api.patch<Ok<object>>(`/api/hive/convos/${convoId}/tools`, { tools }),
  exportConvo: (convoId: string, body: { format: 'pdf' | 'docx' | 'html' | 'md' | 'slides'; messageId?: string }) =>
    api.post<Ok<{ file: HiveFile; drive: DriveItem | null; note: string | null }>>(`/api/hive/convos/${convoId}/export`, body, { timeoutMs: 120000 }),
  judgeTask: (taskId: string, adopt = true) => api.post<Ok<{ verdict: Verdict }>>(`/api/hive/tasks/${taskId}/judge`, { adopt }, { timeoutMs: 240000 }),

  drive: (project: string | null, folder = '/') => api.get<Ok<{ items: DriveItem[]; usage: { bytes: number; files: number; limit: number } }>>('/api/hive/drive', { query: { project: project ?? 'shared', folder } }),
  driveTree: (project: string | null) => api.get<Ok<{ items: DriveItem[] }>>('/api/hive/drive/tree', { query: { project: project ?? 'shared' } }),
  driveSearch: (project: string | null, q: string) => api.get<Ok<{ items: DriveItem[] }>>('/api/hive/drive/search', { query: { project: project ?? 'shared', q } }),
  driveUpload: (project: string | null, folder: string, files: File[]) => {
    const fd = new FormData()
    fd.append('project', project ?? 'shared')
    fd.append('folder', folder)
    for (const f of files) fd.append('files', f, (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name)
    return api.post<Ok<{ files: (DriveItem | { error: string; name: string })[] }>>('/api/hive/drive/upload', fd, { timeoutMs: 300000 })
  },
  driveMkdir: (project: string | null, path: string) => api.post<Ok<{ folder: DriveItem }>>('/api/hive/drive/folder', { project: project ?? 'shared', path }),
  driveText: (project: string | null, path: string) => api.get<Ok<{ file: DriveItem; content: string }>>('/api/hive/drive/file', { query: { project: project ?? 'shared', path, as: 'text' } }),
  driveSave: (project: string | null, path: string, content: string) => api.put<Ok<{ file: DriveItem }>>('/api/hive/drive/file', { project: project ?? 'shared', path, content }),
  driveUrl: (project: string | null, path: string, download = false) => `${API_BASE}/api/hive/drive/file?project=${encodeURIComponent(project ?? 'shared')}&path=${encodeURIComponent(path)}${download ? '&download=1' : ''}`,
  driveMove: (project: string | null, from: string, to: string) => api.post<Ok<{ item: DriveItem }>>('/api/hive/drive/move', { project: project ?? 'shared', from, to }),
  driveDelete: (project: string | null, path: string) => api.delete<Ok<{ removed: number }>>('/api/hive/drive', { query: { project: project ?? 'shared', path } }),
  driveFromFile: (project: string | null, fileId: string, path?: string) => api.post<Ok<{ file: DriveItem }>>('/api/hive/drive/from-file', { project: project ?? 'shared', fileId, path }),
  driveToGithub: (body: { projectId: string; paths: string[]; targetDir?: string; branch: string; message?: string; openPr?: boolean }) =>
    api.post<Ok<{ branch: string; sha: string; files: string[]; pr: { url: string; number: number } | null }>>('/api/hive/drive/github', body, { timeoutMs: 180000 }),
  driveImport: (body: { projectId: string; paths: string[]; folder?: string }) => api.post<Ok<{ files: DriveItem[] }>>('/api/hive/drive/import', body, { timeoutMs: 120000 }),

  pipelines: (project: string) => api.get<Ok<{ templates: PipelineTemplate[]; pipelines: Pipeline[]; runs: PipelineRun[] }>>('/api/hive/pipelines', { query: { project } }),
  savePipeline: (body: { projectId: string; name: string; description?: string; stages: PipelineStage[] }) => api.post<Ok<{ pipeline: Pipeline }>>('/api/hive/pipelines', body),
  updatePipeline: (id: string, body: { name?: string; description?: string; stages?: PipelineStage[] }) => api.patch<Ok<{ pipeline: Pipeline }>>(`/api/hive/pipelines/${id}`, body),
  deletePipeline: (id: string) => api.delete<Ok<object>>(`/api/hive/pipelines/${id}`),
  runPipeline: (id: string, body: { request: string; machineId?: string | null; folder?: string | null }) => api.post<Ok<{ run: PipelineRun }>>(`/api/hive/pipelines/${id}/run`, body, { timeoutMs: 90000 }),
  stopPipelineRun: (id: string) => api.post<Ok<object>>(`/api/hive/pipeline-runs/${id}/stop`, {}),
  architect: (body: { history: { role: 'user' | 'assistant'; text: string }[]; draft?: unknown; projectId?: string | null }) => api.post<Ok<ArchitectReply>>('/api/hive/architect', body, { timeoutMs: 300000 }),

  schedules: (project?: string | null) => api.get<Ok<{ schedules: Schedule[]; templates: ScheduleTemplate[] }>>('/api/hive/schedules', { query: { project: project ?? undefined } }),
  saveSchedule: (body: Partial<Schedule> & { projectId?: string }) => api.post<Ok<{ schedule: Schedule }>>('/api/hive/schedules', body),
  deleteSchedule: (id: string) => api.delete<Ok<object>>(`/api/hive/schedules/${id}`),
  runSchedule: (id: string) => api.post<Ok<{ schedule: Schedule }>>(`/api/hive/schedules/${id}/run`, {}, { timeoutMs: 120000 }),

  toolbox: () => api.get<Ok<Toolbox>>('/api/hive/toolbox'),
  connectTool: (body: { kind: 'mcp' | 'search'; name?: string; url?: string; token?: string; engine?: string; toolId?: string | null }) => api.post<Ok<{ id: string; tools?: number }>>('/api/hive/toolbox/connect', body, { timeoutMs: 60000 }),
  updateIntegration: (id: string, body: { enabled?: boolean; name?: string; token?: string }) => api.patch<Ok<object>>(`/api/hive/toolbox/integrations/${id}`, body),
  refreshIntegration: (id: string) => api.post<Ok<{ tools: number }>>(`/api/hive/toolbox/integrations/${id}/refresh`, {}, { timeoutMs: 60000 }),
  callIntegration: (id: string, tool: string, input: Record<string, unknown>) => api.post<{ content: string; isError?: boolean }>(`/api/hive/toolbox/integrations/${id}/call`, { tool, input }, { timeoutMs: 120000 }),
  removeIntegration: (id: string) => api.delete<Ok<object>>(`/api/hive/toolbox/integrations/${id}`),
  importSkill: (body: { url: string; projectId?: string | null; appliesTo?: 'all' | 'tasks' | 'chat' }) => api.post<Ok<{ id: string; name: string; description: string; source: string }>>('/api/hive/toolbox/skill', body, { timeoutMs: 120000 }),

  steward: (days = 30) => api.get<Ok<StewardReport>>('/api/hive/steward', { query: { days } }),
  stewardApply: (action: StewardAction) => api.post<{ ok: boolean; message: string }>('/api/hive/steward/apply', { action }),
  stewardPlan: (prompt: string, chat = false) => api.post<StewardPlan>('/api/hive/steward/plan', { prompt, chat }, { timeoutMs: 30000 }),
  stewardAsk: (question: string) => api.post<{ answer: string; model: string; provider: string }>('/api/hive/steward/ask', { question }, { timeoutMs: 180000 }),

  teamChat: (channel: string, before?: number) => api.get<Ok<{ messages: ChatMessage[] }>>('/api/hive/team/chat', { query: { channel, before } }),
  teamChannels: () => api.get<Ok<{ channels: { id: string; lastAt: number; count: number }[] }>>('/api/hive/team/channels'),
  sendTeamChat: (body: { channel: string; body: string; attach?: { type: 'task' | 'convo' | 'drive' | 'pipeline' | 'project'; id: string; title: string }; taskId?: string | null }) => api.post<Ok<{ message: ChatMessage }>>('/api/hive/team/chat', body),

  verifyModels: (body: { keyId?: string; retest?: boolean; includePaid?: boolean }) => api.post<Ok<{ started?: boolean; keys: HealthKey[] }>>('/api/hive/health/verify', body, { timeoutMs: 60000 }),
  hideModel: (keyId: string, model: string) => api.post<Ok<{ defaultModel: string | null }>>(`/api/hive/keys/${keyId}/hide-model`, { model }),
  health: () => api.get<Ok<{ keys: HealthKey[] }>>('/api/hive/health'),
  probeHealth: (body: { keyId?: string; includePaid?: boolean }) => api.post<Ok<{ results: { keyId: string; ok: boolean; model?: string; latencyMs?: number; error?: string }[]; keys: HealthKey[] }>>('/api/hive/health/probe', body, { timeoutMs: 180000 }),

  dispatches: (project?: string | null) => api.get<Ok<{ dispatches: Dispatch[] }>>('/api/hive/dispatches', { query: { project: project ?? undefined } }),
  planDispatch: (body: { projectId: string; request: string; preference?: 'savings' | 'fast' | 'balanced' | 'quality'; freeOnly?: boolean }) => api.post<Ok<{ dispatch: Dispatch }>>('/api/hive/dispatches', body, { timeoutMs: 240000 }),
  editDispatch: (id: string, body: { partId: string; spec?: { provider: string; keyId?: string; model?: string }; prompt?: string; remove?: boolean }) => api.patch<Ok<{ dispatch: Dispatch }>>(`/api/hive/dispatches/${id}`, body),
  startDispatch: (id: string) => api.post<Ok<{ dispatch: Dispatch }>>(`/api/hive/dispatches/${id}/start`, {}, { timeoutMs: 120000 }),
  stopDispatch: (id: string) => api.post<Ok<{ stopped: boolean }>>(`/api/hive/dispatches/${id}/stop`, {}),

  copilot: () => api.get<Ok<{ messages: CopilotMsg[]; settings: CopilotSettings; brain: CopilotBrain; admin: boolean; active: CopilotWork[] }>>('/api/hive/copilot'),
  copilotActive: () => api.get<Ok<{ active: CopilotWork[] }>>('/api/hive/copilot/active'),
  clearCopilot: () => api.delete<Ok<object>>('/api/hive/copilot'),
  copilotSettings: (body: Partial<CopilotSettings>) => api.put<Ok<{ settings: CopilotSettings; brain: CopilotBrain }>>('/api/hive/copilot/settings', body),
  sendCopilot: async (text: string, onEvent: (type: string, data: Record<string, unknown>) => void, signal?: AbortSignal, opts: { quick?: boolean; projectId?: string | null } = {}) => {
    const res = await fetch(`${API_BASE}/api/hive/copilot`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, quick: !!opts.quick, projectId: opts.projectId ?? null }), signal })
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => ({}))
      throw new Error((j as { error?: string }).error || `Request failed (${res.status})`)
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim()
        buf = buf.slice(i + 1)
        if (!line) continue
        try {
          const ev = JSON.parse(line) as { type: string; data: Record<string, unknown> }
          onEvent(ev.type, ev.data)
        } catch {
          /* partial line */
        }
      }
    }
  },
}
