import { api } from '@/lib/api'
import type { AgentRow, AgentSpec, Bootstrap, Change, ChatMessage, Convo, ConvoMsg, HiveEvent, HiveFile, LiveAgent, MemoryItem, Mode, Plugin, Project, Task } from './types'

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

  createProject: (body: Record<string, unknown>) => api.post<Ok<{ project: Project }>>('/api/hive/projects', body),
  updateProject: (id: string, body: Record<string, unknown>) => api.patch<Ok<{ project: Project }>>(`/api/hive/projects/${id}`, body),
  deleteProject: (id: string) => api.delete<Ok<object>>(`/api/hive/projects/${id}`),
  branches: (id: string) => api.get<Ok<{ branches: { name: string; sha: string }[] }>>(`/api/hive/projects/${id}/branches`),
  projectTree: (projectId: string) => api.get<Ok<{ paths: string[]; sha: string }>>(`/api/hive/projects/${projectId}/tree`, { timeoutMs: 60000 }),
  tasks: (projectId: string, archived = false) => api.get<Ok<{ tasks: Task[] }>>(`/api/hive/projects/${projectId}/tasks`, { query: { archived: archived ? 1 : undefined } }),
  createTask: (projectId: string, body: { prompt: string; title?: string; mode: Mode; agents: AgentSpec[]; lead?: AgentSpec | null; baseRef?: string; attachments?: string[]; budgetTokens?: number | null }) =>
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
  stopConvo: (id: string) => api.post<Ok<object>>(`/api/hive/convos/${id}/stop`, {}),

  chat: (projectId: string) => api.get<Ok<{ messages: ChatMessage[] }>>(`/api/hive/projects/${projectId}/chat`),
  sendChat: (projectId: string, body: string, taskId?: string | null) => api.post<Ok<{ message: ChatMessage }>>(`/api/hive/projects/${projectId}/chat`, { body, taskId }),
}
