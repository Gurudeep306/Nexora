export type ProviderId = string
export type Mode = 'solo' | 'team' | 'compare' | 'review' | 'pipeline'
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
  periodCached?: number
  todayTokens?: number
  todayRequests?: number
  periodStart?: string
  periodEnds?: number | null
  machineId?: string | null
  freeTier?: boolean
  subscription?: boolean
  verified?: ModelVerification | null
  untestedModels?: string[]
  /** A limit the provider reported: until when (ms) and its message. */
  limitUntil?: number | null
  limitNote?: string | null
  /** Measured reply time per model (ms), from real calls and tests. */
  speed?: Record<string, number>
  /** A free connection's typical allowance (shown when the provider sends no live numbers). */
  freeLimit?: FreeLimit | null
  /** Pace set on this key (requests a minute / a day); null = the provider's usual free allowance. */
  rpmLimit?: number | null
  rpdLimit?: number | null
}

export interface FreeLimit {
  rpd?: number
  rpm?: number
  tpd?: number
  tpm?: number
  note?: string
  custom?: boolean
}

/** The last "test every model" run on a key: which models really answered. */
export interface ModelVerification {
  at: number
  ok: string[]
  failed: { model: string; error: string }[]
  untested: number
  stoppedBy: string | null
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
  machine_id?: string | null
  folder?: string | null
  site_url?: string | null
  idea_id?: string | null
}

export interface Machine {
  id: string
  name: string
  createdBy: string
  policy: 'ask' | 'auto' | 'read'
  info: { hostname?: string; platform?: string; node?: string; roots?: string[]; user?: string; cpus?: number; memGb?: number; version?: string }
  lastSeen: number | null
  online: boolean
  createdAt: number
}

export interface Approval {
  id: string
  taskId?: string
  agentId?: string
  agent?: string
  projectId?: string
  command: string
  kind: 'command' | 'server'
  machine: string
  folder: string
  at: number
}

export interface LinkedRepo {
  id: string
  project_id: string
  github_id: string
  repo_owner: string
  repo_name: string
  default_branch: string
  role: string
}

export interface Check {
  name: string
  status: string
  conclusion: string | null
  url: string | null
  startedAt?: string | null
  completedAt?: string | null
}

export interface PrInfo {
  number: number
  title: string
  state: string
  merged: boolean
  mergeable: boolean | null
  mergeableState: string
  url: string
  head: string
  base: string
  sha: string
  additions: number
  deletions: number
  changedFiles: number
  commits: number
  draft: boolean
}

export interface ProjectActivity {
  commits: { sha: string; message: string; author: string; avatar: string | null; at: string; url: string }[]
  headChecks: { checks: Check[]; state: string } | null
  pulls: { number: number; title: string; author: string; url: string; head: string; draft: boolean; updatedAt: string }[]
  deployments: { id: number; environment: string; sha: string; ref: string; createdAt: string; state: string; url: string | null }[]
  site: { url: string; up: boolean; status?: number; ms: number; version?: string | null; error?: string } | null
}

export interface IdeaPlan {
  name: string
  tagline?: string
  summary?: string
  audience?: string
  features?: { title: string; detail?: string; priority?: string }[]
  stack?: Record<string, string>
  architecture?: string
  milestones?: { title: string; goal?: string; tasks?: { title: string; detail?: string }[] }[]
  risks?: string[]
  repoName?: string
  conventions?: string[]
  firstTask?: string
  error?: string
  _model?: string
}

export interface Idea {
  id: string
  title: string
  pitch: string
  plan: IdeaPlan | null
  status: 'draft' | 'planning' | 'planned' | 'failed' | 'launched'
  project_id: string | null
  created_by: string
  created_at: number
  updated_at: number
}

export interface MarketModel {
  id: string
  name: string
  lab: string
  created: number
  context: number | null
  input: number | null
  output: number | null
  modalities: string[] | null
  description: string
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
  status: 'queued' | 'running' | 'done' | 'failed' | 'stopped' | 'interrupted' | 'incomplete'
  title?: string | null
  handoffs?: number
  routed_kind?: TaskKind | null
  route_note?: string | null
  escalations?: number
  cli_session?: string | null
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

export type TaskStatus = 'queued' | 'running' | 'review' | 'committed' | 'pr_open' | 'merged' | 'failed' | 'stopped' | 'interrupted'

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
  machine_id?: string | null
  folder?: string | null
  worktree?: string | null
  repo_id?: string | null
  kind?: TaskKind | null
  pipeline_run?: string | null
  schedule_id?: string | null
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
  kind: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'status' | 'note' | 'steer' | 'error' | 'system' | 'human_edit' | 'commit' | 'handoff' | 'approval' | 'approval_result' | 'merge' | 'review' | 'route' | 'verdict' | 'pipeline' | 'ci_fix'
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
  impl: 'anthropic' | 'openai' | 'gemini' | 'cli'
  hue: number
  chroma: number | null
  suggested: string[]
  keyHint: string
  docs: string | null
  baseUrl: string | null
  baseUrlRequired: boolean
  caps: { tools: boolean; vision: boolean; pdf: boolean; images: boolean }
  imageModel: string | null
  freeTier?: boolean
  subscription?: boolean
  needsMachine?: boolean
  baseUrlHint?: string | null
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
  pinned?: number
  project_id: string | null
  provider: string | null
  key_id: string | null
  model: string | null
  system: string
  tools?: number
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
  group_id?: string | null
  preferred?: number
  rating?: number | null
  tools?: ChatToolStep[]
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
  /** A vendor id, or 'auto' to let the smart router choose. */
  provider: ProviderId
  keyId: string // key id or 'auto'
  model: string
  effort?: Effort | null
  name?: string
  freeOnly?: boolean
  preference?: 'balanced' | 'quality' | 'savings' | 'fast'
  kind?: TaskKind
}

export interface ChatMessage {
  id: string
  project_id: string
  task_id: string | null
  username: string
  body: string
  created_at: number
}

export interface Checkpoint {
  id: string
  task_id: string
  variant: string
  label: string
  agent_id: string | null
  git_sha: string | null
  files: number
  created_by: string | null
  auto: number
  created_at: number
}

export interface GithubReport {
  kind: 'fine-grained' | 'classic' | 'app' | 'unknown'
  login: string | null
  scopes: string[] | null
  status: number
  ok: boolean
  private: boolean | null
  canPush: boolean | null
  defaultBranch: string | null
  contents: boolean | null
  fullName?: string
  steps: string[]
}

/* ── v4: model intelligence, routing, subscriptions ───────────────────── */
export type TaskKind = 'chat' | 'mechanical' | 'reading' | 'search' | 'writing' | 'coding' | 'review' | 'hard'
export type CostClass = 'free' | 'sub' | 'low' | 'mid' | 'high'

export interface ModelCard {
  id: string
  name: string
  lab: string
  intelligence: number
  coding: number
  reasoning: number
  writing: number
  speed: number
  context: number
  price: [number, number] | null
  tier: CostClass
  tools: boolean
  vision: boolean
  open: boolean
  guessed?: boolean
  strengths: string[]
  weaknesses: string[]
  scores: Record<TaskKind, number>
  bestFor: TaskKind[]
  vendor?: string
}

export interface MeasuredStat {
  vendor: string
  model: string
  kind: TaskKind
  runs: number
  ok: number
  failed: number
  accepted: number
  rejected: number
  successRate: number | null
  acceptRate: number | null
  avgTokens: number | null
  avgSteps: number | null
  avgSeconds: number | null
  updatedAt: number
}

/** A model's latest score on Hive's golden coding tasks (0–100). */
export interface BenchResult {
  provider: string
  model: string
  score: number | null
  ranAt?: number
  details: { task: string; passed: number; total: number; error?: string }[]
}

export interface ConnectedModel {
  vendor: string
  vendorLabel: string
  keyId: string
  keyLabel: string
  model: string
  isDefault: boolean
  cost: CostClass
  online: boolean
  card: ModelCard
  measured: MeasuredStat[]
}

export interface FreeSource {
  vendor: string
  name: string
  url: string
  how: string
  free: string
  limits: string
  models: string[]
  bestFor: TaskKind[]
  score: number
}

export interface CatalogInfo {
  kinds: Record<TaskKind, { label: string; hint: string }>
  minQuality: Record<TaskKind, number>
  costLabels: Record<CostClass, string>
  cards: ModelCard[]
  subscriptions: ModelCard[]
  freeSources: FreeSource[]
}

export interface RoutePick {
  provider: string
  keyId: string
  keyLabel?: string
  model: string
  quality: number
  cost: CostClass
  name: string
  lab?: string
}

export interface RouteResult {
  classified: { kind: TaskKind; label: string; confidence: 'high' | 'medium' | 'low' }
  kind?: TaskKind
  pick?: RoutePick
  alternatives?: { provider: string; keyId: string; model: string; name: string; quality: number; cost: CostClass }[]
  note?: string
  error?: string
}

export interface PlanUsage {
  plan: true
  status: string | null
  type: string | null
  resetsAt: number | null
  windows: Record<string, { utilization: number; resetsAt: number | null; status: string | null }>
}

export interface CliStatus {
  installed?: boolean
  version?: string | null
  loggedIn?: boolean
  detail?: string
  error?: string
}

/* ── guide ─────────────────────────────────────────────────────────────── */
export interface ImproveResult {
  original: string
  prompt: string
  title: string | null
  changes: string[]
  questions: string[]
  kind: TaskKind | null
  kindLabel: string | null
  model: string
}

export interface Lifecycle {
  stages: { id: string; label: string; done: boolean; active?: boolean; detail: string }[]
  next: { id: string; title: string; body: string; to: string }[]
  counts: Record<string, number>
}

/* ── budgets ───────────────────────────────────────────────────────────── */
export interface Cap {
  id: string
  scopeType: 'project' | 'vendor' | 'model' | 'user' | 'all'
  scope: string
  tokens: number | null
  dollars: number | null
  period: 'day' | 'month'
  action: 'block' | 'warn'
  createdBy: string
  createdAt: number
  usedTokens: number
  usedDollars: number
  pct: number
}

export interface SpendRow {
  key: string
  input: number
  output: number
  cached: number
  requests: number
  dollars: number
}

export interface Spend {
  since: string
  byDay: SpendRow[]
  byVendor: SpendRow[]
  byModel: SpendRow[]
  byProject: SpendRow[]
  byUser: SpendRow[]
}

export interface HiveAlert {
  id: string
  kind: string
  level: 'info' | 'warn' | 'error'
  title: string
  body: string
  ref: string | null
  read: number
  created_at: number
}

/* ── Drive ─────────────────────────────────────────────────────────────── */
export interface DriveItem {
  id: string
  projectId: string | null
  path: string
  name: string
  kind: 'file' | 'folder'
  fileId: string | null
  mime: string | null
  size: number
  note: string | null
  createdBy: string
  updatedBy: string
  createdAt: number
  updatedAt: number
  text: boolean
}

/* ── pipelines & automations ───────────────────────────────────────────── */
export interface StageAgent {
  mode: 'auto' | 'free' | 'specific'
  provider?: string
  model?: string
  keyId?: string
  preference?: 'balanced' | 'quality' | 'savings' | 'fast'
}

export interface PipelineStage {
  name: string
  kind: TaskKind
  instructions: string
  agents: StageAgent[]
  readOnly?: boolean
  race?: boolean
  crossVendor?: boolean
  gate?: { fixStage: string; maxLoops: number } | null
  onlyOnGate?: boolean
  optional?: boolean
  machineOnly?: boolean
  ship?: boolean
}

export interface Pipeline {
  id: string
  projectId: string
  name: string
  description: string
  stages: PipelineStage[]
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface PipelineTemplate {
  id: string
  name: string
  description: string
  stages: PipelineStage[]
}

export interface PipelineRun {
  id: string
  pipelineId: string
  projectId: string
  taskId: string | null
  request: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'stopped'
  stageIndex: number
  loops: number
  log: { stage: string; status: string; message?: string; at: number; pr?: { url: string; number: number } | null }[]
  error: string | null
  startedBy: string
  createdAt: number
  updatedAt: number
}

export interface ArchitectReply {
  message: string
  questions: string[]
  pipeline: { name: string; description: string; stages: PipelineStage[] } | null
  model: string
}

export interface Schedule {
  id: string
  projectId: string
  title: string
  prompt: string
  every: 'hourly' | 'daily' | 'weekly' | 'weekdays'
  hour: number
  weekday: number
  agents: { provider: string; keyId?: string; model?: string; freeOnly?: boolean }[]
  mode: Mode
  enabled: boolean
  template: string | null
  pipelineId: string | null
  lastRun: number | null
  lastTask: string | null
  nextRun: number | null
  createdBy: string
  createdAt: number
}

export interface ScheduleTemplate {
  id: string
  title: string
  every: Schedule['every']
  hour: number
  weekday?: number
  mode?: Mode
  prompt: string
  agents: Schedule['agents']
}

export interface Verdict {
  winner: string
  reason?: string
  ranking?: { agentId?: string; id?: string; name?: string; model?: string; provider?: string; score: number; strengths?: string; weaknesses?: string; why?: string }[]
  judge?: string | { model: string; provider: string } | null
}

export interface ChatToolStep {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'running' | 'done' | 'error'
  preview?: string
  meta?: Record<string, unknown> | null
}

/* ── Toolbox (open-source ecosystem) & Token Steward ────────────────── */
export type ToolUse =
  | { how: 'provider'; vendor: string }
  | { how: 'search'; engine: string }
  | { how: 'builtin'; plugin: string }
  | { how: 'subscription'; vendor: string }
  | { how: 'mcp' | 'skill' | 'machine' | 'reference' }
export type ToolHow = ToolUse['how']
export interface EcoTool {
  id: string
  name: string
  cat: string
  what: string
  iface: string
  status: string
  license: 'oss' | 'mixed' | 'hosted'
  url: string
  use: ToolUse
  connected: boolean
  integrationId: string | null
}
export interface McpToolInfo {
  name: string
  description: string
  schema: { type: 'object'; properties?: Record<string, { type?: string; description?: string; enum?: string[] }>; required?: string[] }
  readOnly: boolean
}
export interface Integration {
  id: string
  kind: 'mcp' | 'search'
  toolId: string | null
  name: string
  url: string
  engine: string | null
  hasSecret: boolean
  enabled: boolean
  tools: McpToolInfo[]
  status: 'ok' | 'error' | 'new'
  error: string | null
  createdBy: string
  createdAt: number
  checkedAt: number | null
}
export interface SearchEngineInfo {
  label: string
  needs: 'key' | 'url' | 'key-optional'
  docs: string
  does: ('search' | 'read')[]
}
export interface Toolbox {
  snapshot: string
  categories: Record<string, { label: string; hint: string }>
  engines: Record<string, SearchEngineInfo>
  directories: { name: string; what: string; url: string | null }[]
  tools: EcoTool[]
  integrations: Integration[]
}
export type StewardAction =
  | { type: 'plugin'; plugin: string; enabled?: boolean; config?: Record<string, unknown> }
  | { type: 'cap'; suggest: number; dollars?: number }
  | { type: 'connect'; vendors: string[] }
  | { type: 'open'; to: string }
export interface StewardTip {
  id: string
  impact: 'high' | 'medium' | 'low'
  title: string
  detail: string
  action?: StewardAction
}
export interface StewardModelRow {
  vendor: string
  model: string
  name: string
  tier: CostClass
  input: number
  output: number
  cached: number
  requests: number
  dollars: number
}
export interface StewardReport {
  days: number
  since: string
  score: number
  totals: { dollars: number; monthly: number; input: number; output: number; cached: number; tokens: number; freeShare: number; cacheShare: number }
  tiers: Record<CostClass, number>
  models: StewardModelRow[]
  savers: { id: string; name: string; enabled: boolean }[]
  tips: StewardTip[]
}
export interface StewardPick {
  provider: string
  keyId: string
  keyLabel?: string
  model: string
  quality: number
  cost: CostClass
  name: string
  lab?: string
  dollars: number | null
  note?: string
}
export interface StewardPlan {
  kind: TaskKind
  kindLabel: string
  tokensIn: number
  tokensOut: number
  cheapest: StewardPick | null
  best: StewardPick | null
  same: boolean
}

/* ── Agent health & the Dispatcher ─────────────────────────────────── */
export type HealthState = 'healthy' | 'flaky' | 'cooling' | 'down' | 'paused' | 'unknown'
export interface HealthModel {
  model: string
  state: HealthState
  ok: number
  fail: number
  successRate: number | null
  latencyMs: number | null
  lastOk: number | null
  lastFail: number | null
  lastError: string | null
  lastKind: string | null
  cooldownUntil: number | null
}
export interface HealthKey {
  keyId: string
  label: string
  vendor: string
  vendorLabel: string
  free: boolean
  subscription: boolean
  defaultModel: string | null
  state: HealthState
  detail: string | null
  cooldownUntil: number | null
  models: HealthModel[]
  verified: ModelVerification | null
  verifying: { done: number; total: number } | null
}
export interface DispatchPick {
  provider: string
  keyId: string
  keyLabel?: string
  model: string
  quality: number | null
  cost: CostClass
  name: string
  lab?: string
  note?: string
  chosen?: boolean
}
export interface DispatchPart {
  id: string
  title: string
  kind: TaskKind
  size: 's' | 'm' | 'l'
  files: string[]
  dependsOn: string[]
  prompt: string
  pick: DispatchPick | null
  alternatives?: { provider: string; keyId: string; model: string; name: string; quality: number; cost: CostClass }[]
  estimate: { input: number; output: number; dollars: number | null }
}
export interface DispatchPlan {
  summary: string
  parts: DispatchPart[]
  review: DispatchPick | null
  totals: { dollars: number | null; baseline: { name: string; provider: string; model: string; cost: CostClass; dollars: number | null } | null; plannedBy: string; preference: string; freeOnly: boolean }
}
export interface Dispatch {
  id: string
  projectId: string
  taskId: string | null
  request: string
  status: 'planned' | 'running' | 'done' | 'failed' | 'stopped'
  plan: DispatchPlan | null
  progress: Record<string, { status: string; message?: string | null; at?: number; agentId?: string; result?: string; provider?: string; model?: string }>
  error: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
}

/* ── Hive Copilot ───────────────────────────────────────────────────── */
export interface CopilotStep {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'running' | 'done' | 'error'
  preview?: string
}
export interface CopilotMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools: CopilotStep[]
  provider: string | null
  model: string | null
  auto: boolean
  error: string | null
  createdAt: number
}
export interface CopilotBrain {
  provider?: string
  model?: string
  kind?: 'cli' | 'api'
  name?: string | null
  error?: string
  /** Which Claude account is leading right now. */
  keyId?: string | null
  keyLabel?: string | null
  parent?: boolean
}
export interface CopilotSettings {
  brain: 'auto' | 'claude_code' | 'api'
  model: string
  autonomy?: 'autopilot' | 'assist'
  canMerge?: boolean
  /** Claude leads and checks; your GPU farm and free models do the work. */
  saveTokens?: boolean
  /** Work that always goes to Claude. */
  claudeOnly?: string[]
  /** The parent Claude account (leads); the other Claude accounts are workers. */
  brainKey?: string | null
}

export interface CopilotWork {
  id: string
  projectId: string
  title: string
  status: string
  prUrl: string | null
  reviewed: boolean
  updatedAt: number
  agents: { provider: string; model: string; status: string }[]
}

/** A GitHub repository any connected GitHub account can reach. */
export interface GhRepo {
  owner: string
  name: string
  fullName: string
  private: boolean
  defaultBranch: string
  description: string
  language: string | null
  pushedAt: string
  stars: number
  githubId: string
  connection: string
  canPush: boolean
  projectId: string | null
}
