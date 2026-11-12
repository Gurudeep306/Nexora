import { api } from '@/lib/api'
import type { AgentRow, AgentSpec, Bootstrap, Change, ChatMessage, HiveEvent, Mode, Project, Task } from './types'

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
  tasks: (projectId: string, archived = false) => api.get<Ok<{ tasks: Task[] }>>(`/api/hive/projects/${projectId}/tasks`, { query: { archived: archived ? 1 : undefined } }),
  createTask: (projectId: string, body: { prompt: string; title?: string; mode: Mode; agents: AgentSpec[]; lead?: AgentSpec | null; baseRef?: string }) =>
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

  chat: (projectId: string) => api.get<Ok<{ messages: ChatMessage[] }>>(`/api/hive/projects/${projectId}/chat`),
  sendChat: (projectId: string, body: string, taskId?: string | null) => api.post<Ok<{ message: ChatMessage }>>(`/api/hive/projects/${projectId}/chat`, { body, taskId }),
}
