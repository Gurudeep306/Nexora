export type ProviderId = string
export type Mode = 'solo' | 'team' | 'compare' | 'review'
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface RateLimit {
  tokensRemaining: number | null
  tokensLimit: number | null
  requestsRemaining: number | null
  requestsLimit: number | null
  resetAt: string | null
}

export interface HiveKey {
  id: string
  provider: ProviderId
  impl?: string
  priority?: number
  label: string
  baseUrl: string | null
  last4: string
  models: string[]
  defaultModel: string | null
  tokenLimit: number | null
  limitPeriod: 'day' | 'month' | 'total'
  maxConcurrency: number
  owner: string
  disabled: boolean
  status: 'unchecked' | 'ok' | 'invalid' | 'error'
  statusDetail: string | null
  rateLimit: RateLimit | null
  rateLimitAt: number | null
  used: number
  remaining: number | null
  active: number
  periodInput?: number
  periodOutput?: number
  periodRequests?: number
  periodCostMicros?: number
}

export interface GithubConn {
  id: string
  label: string
  login: string
  last4: string
  createdBy: string
}

export interface Project {
  id: string
  name: string
  github_id: string
  repo_owner: string
  repo_name: string
  default_branch: string
  description: string
  instructions: string
  color: string
  created_by: string
  created_at: number
  updated_at: number
  tasks?: number
  running?: number
}

export interface AgentRow {
  id: string
  task_id: string
  parent_id: string | null
  role: 'solo' | 'lead' | 'worker' | 'reviewer'
  name: string
  key_id: string | null
  provider: ProviderId
  model: string
  effort: Effort | null
  variant: string
  instructions: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'stopped' | 'interrupted'
  title?: string | null
  handoffs?: number
  steps: number
  input_tokens: number
  output_tokens: number
  cost_micros: number
  result: string | null
  error: string | null
  started_by: string
  created_at: number
  started_at: number | null
  finished_at: number | null
}

export type TaskStatus = 'queued' | 'running' | 'review' | 'committed' | 'pr_open' | 'failed' | 'stopped' | 'interrupted'

export interface Task {
  id: string
  project_id: string
  title: string
  prompt: string
  mode: Mode
  status: TaskStatus
  base_ref: string
  base_sha: string
  head_sha: string | null
  branch: string | null
  pr_url: string | null
  pr_number: number | null
  summary: string | null
  archived: number
  created_by: string
  created_at: number
  updated_at: number
  agents?: Pick<AgentRow, 'id' | 'name' | 'provider' | 'model' | 'status' | 'role' | 'input_tokens' | 'output_tokens'>[]
}

export interface HiveEvent {
  id: string
  seq: number
  task_id: string
  agent_id: string | null
  kind: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'status' | 'note' | 'steer' | 'error' | 'system' | 'human_edit' | 'commit' | 'handoff'
  data: Record<string, unknown>
  created_at: number
}

export interface Change {
  path: string
  status: 'added' | 'modified' | 'deleted'
  additions: number
  deletions: number
  author: string
  updated_at: number
}

export interface Member {
  username: string
  display_name: string
  avatar: string | null
  avatar_url: string | null
  role: string
}

export interface OnlineUser {
  username: string
  view: { projectId: string | null; taskId: string | null } | null
  since: number
}

export interface ProviderInfo {
  id: ProviderId
  label: string
  vendor: string
  impl: 'anthropic' | 'openai' | 'gemini'
  hue: number
  chroma: number | null
  suggested: string[]
  keyHint: string
  docs: string | null
  baseUrl: string | null
  baseUrlRequired: boolean
  caps: { tools: boolean; vision: boolean; pdf: boolean; images: boolean }
  imageModel: string | null
}

export interface Catalogue {
  providers: ProviderInfo[]
  prices: Record<string, [number, number]>
}

export interface LiveAgent {
  id: string
  projectId: string
  taskId: string
  taskTitle: string
  name: string
  model: string
  provider: ProviderId
  doing: string
  status: string
  files: string[]
}

export interface Plugin {
  id: string
  name: string
  category?: string
  icon?: string
  description: string
  enabled: boolean
  config: Record<string, unknown>
  scope: string
  kind?: 'instructions'
  default?: boolean
  createdBy?: string
}

export interface MemoryItem {
  id: string
  project_id: string
  title: string
  body: string
  author: string
  pinned: number
  created_at: number
}

export interface HiveFile {
  id: string
  name: string
  mime: string
  size: number
  origin?: string
}

export interface Convo {
  id: string
  title: string
  owner: string
  shared: number
  project_id: string | null
  provider: string | null
  key_id: string | null
  model: string | null
  system: string
  created_at: number
  updated_at: number
}

export interface ConvoMsg {
  id: string
  convo_id: string
  role: 'user' | 'assistant'
  content: string
  attachments: HiveFile[]
  provider?: string | null
  model?: string | null
  author?: string | null
  input_tokens?: number
  output_tokens?: number
  error?: string | null
  created_at: number
}

export interface CodeStream {
  tool: string
  path: string
  text: string
  old: string | null
  at: number
  done?: boolean
}

export interface Bootstrap {
  me: { username: string; role: string; admin: boolean }
  catalogue: Catalogue
  keys: HiveKey[]
  github: GithubConn[]
  projects: Project[]
  members: Member[]
  online: OnlineUser[]
  runningAgents: number
  live: LiveAgent[]
}

export interface AgentSpec {
  provider: ProviderId
  keyId: string // key id or 'auto'
  model: string
  effort?: Effort | null
  name?: string
}

export interface ChatMessage {
  id: string
  project_id: string
  task_id: string | null
  username: string
  body: string
  created_at: number
}
