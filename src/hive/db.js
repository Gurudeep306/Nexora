// Hive schema + small query helpers. Everything is keyed by text ids so the
// same code runs on local SQLite and Turso without relying on lastID.
const crypto = require("crypto");
const { run, get, all } = require("../db");

const newId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
const now = () => Date.now();
const json = (v, fallback) => {
  if (v == null || v === "") return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS hive_keys (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    label TEXT NOT NULL,
    base_url TEXT,
    secret_enc TEXT NOT NULL,
    last4 TEXT NOT NULL DEFAULT '',
    models_json TEXT NOT NULL DEFAULT '[]',
    default_model TEXT,
    token_limit INTEGER,
    limit_period TEXT NOT NULL DEFAULT 'month',
    max_concurrency INTEGER NOT NULL DEFAULT 4,
    owner TEXT NOT NULL,
    disabled INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unchecked',
    status_detail TEXT,
    rl_json TEXT,
    rl_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hive_usage (
    key_id TEXT NOT NULL,
    day TEXT NOT NULL,
    username TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    requests INTEGER NOT NULL DEFAULT 0,
    cost_micros INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (key_id, day, username)
  )`,
  `CREATE TABLE IF NOT EXISTS hive_github (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    login TEXT,
    token_enc TEXT NOT NULL,
    last4 TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hive_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    github_id TEXT NOT NULL,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    description TEXT NOT NULL DEFAULT '',
    instructions TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'violet',
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hive_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'solo',
    status TEXT NOT NULL DEFAULT 'queued',
    base_ref TEXT NOT NULL,
    base_sha TEXT NOT NULL,
    head_sha TEXT,
    branch TEXT,
    pr_url TEXT,
    pr_number INTEGER,
    summary TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_tasks_project ON hive_tasks(project_id, updated_at)",
  `CREATE TABLE IF NOT EXISTS hive_agents (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    parent_id TEXT,
    role TEXT NOT NULL DEFAULT 'solo',
    name TEXT NOT NULL,
    key_id TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    effort TEXT,
    variant TEXT NOT NULL DEFAULT 'main',
    instructions TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    steps INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_micros INTEGER NOT NULL DEFAULT 0,
    result TEXT,
    error TEXT,
    started_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    finished_at INTEGER
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_agents_task ON hive_agents(task_id)",
  `CREATE TABLE IF NOT EXISTS hive_events (
    id TEXT PRIMARY KEY,
    seq INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    agent_id TEXT,
    kind TEXT NOT NULL,
    data_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_events_task ON hive_events(task_id, seq)",
  `CREATE TABLE IF NOT EXISTS hive_changes (
    task_id TEXT NOT NULL,
    variant TEXT NOT NULL DEFAULT 'main',
    path TEXT NOT NULL,
    content TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (task_id, variant, path)
  )`,
  `CREATE TABLE IF NOT EXISTS hive_chat (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT,
    username TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_chat_project ON hive_chat(project_id, created_at)",
  // Shared project memory: facts every agent on the project sees.
  `CREATE TABLE IF NOT EXISTS hive_memory (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_memory_project ON hive_memory(project_id, created_at)",
  // Plugins: built-ins switched on/configured per scope ('*' = everywhere,
  // or a project id), plus custom instruction plugins staff write.
  `CREATE TABLE IF NOT EXISTS hive_plugins (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT '*',
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  // Claude-style conversations with any model.
  `CREATE TABLE IF NOT EXISTS hive_convos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    owner TEXT NOT NULL,
    shared INTEGER NOT NULL DEFAULT 0,
    project_id TEXT,
    provider TEXT,
    key_id TEXT,
    model TEXT,
    system TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_convos_owner ON hive_convos(owner, updated_at)",
  `CREATE TABLE IF NOT EXISTS hive_convo_msgs (
    id TEXT PRIMARY KEY,
    convo_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    attachments_json TEXT NOT NULL DEFAULT '[]',
    provider TEXT,
    model TEXT,
    author TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_convo_msgs ON hive_convo_msgs(convo_id, created_at)",
  // Uploaded and generated files (base64), referenced by chats and tasks.
  `CREATE TABLE IF NOT EXISTS hive_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data_b64 TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'upload',
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  // Model radar: every model id each vendor has offered, and when it appeared.
  `CREATE TABLE IF NOT EXISTS hive_models (
    vendor TEXT NOT NULL,
    model TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    PRIMARY KEY (vendor, model)
  )`,
  // Extra repositories linked to a project (the primary one lives on hive_projects).
  `CREATE TABLE IF NOT EXISTS hive_project_repos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    github_id TEXT NOT NULL,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    role TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_project_repos ON hive_project_repos(project_id)",
  // Idea → project launchpad.
  `CREATE TABLE IF NOT EXISTS hive_ideas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    pitch TEXT NOT NULL,
    plan_json TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    project_id TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  // Checkpoints: saved states of a task's working copy (restore any result).
  `CREATE TABLE IF NOT EXISTS hive_checkpoints (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    variant TEXT NOT NULL DEFAULT 'main',
    label TEXT NOT NULL,
    agent_id TEXT,
    overlay_json TEXT,
    git_sha TEXT,
    files INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    auto INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_checkpoints_task ON hive_checkpoints(task_id, created_at)",
  // Measured performance: how each model actually does on this team's work.
  `CREATE TABLE IF NOT EXISTS hive_model_stats (
    vendor TEXT NOT NULL,
    model TEXT NOT NULL,
    kind TEXT NOT NULL,
    runs INTEGER NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    accepted INTEGER NOT NULL DEFAULT 0,
    rejected INTEGER NOT NULL DEFAULT 0,
    tokens INTEGER NOT NULL DEFAULT 0,
    steps INTEGER NOT NULL DEFAULT 0,
    ms INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (vendor, model, kind)
  )`,
  // Detailed usage (per project / vendor / model / user) for budgets and reports.
  `CREATE TABLE IF NOT EXISTS hive_usage_detail (
    day TEXT NOT NULL,
    project_id TEXT NOT NULL DEFAULT '',
    vendor TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    requests INTEGER NOT NULL DEFAULT 0,
    cost_micros INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, project_id, vendor, model, username)
  )`,
  // Spending caps: per project, provider, model or person, per day or month.
  `CREATE TABLE IF NOT EXISTS hive_caps (
    id TEXT PRIMARY KEY,
    scope_type TEXT NOT NULL,
    scope TEXT NOT NULL,
    tokens INTEGER,
    dollars REAL,
    period TEXT NOT NULL DEFAULT 'month',
    action TEXT NOT NULL DEFAULT 'block',
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hive_alerts (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    ref TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_alerts ON hive_alerts(created_at)",
  // Things each person wants every chat to know about them.
  `CREATE TABLE IF NOT EXISTS hive_user_memory (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    fact TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_user_memory ON hive_user_memory(username, created_at)",
  // Automations: recurring tasks and autopilots.
  `CREATE TABLE IF NOT EXISTS hive_schedules (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    every TEXT NOT NULL DEFAULT 'daily',
    hour INTEGER NOT NULL DEFAULT 2,
    weekday INTEGER NOT NULL DEFAULT 1,
    agents_json TEXT NOT NULL DEFAULT '[]',
    mode TEXT NOT NULL DEFAULT 'solo',
    enabled INTEGER NOT NULL DEFAULT 1,
    template TEXT,
    last_run INTEGER,
    last_task TEXT,
    next_run INTEGER,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  // Pipelines: a chain of stages, each with its own agents (or a race judged
  // by another model), review gates that loop back to fixing, and shipping.
  `CREATE TABLE IF NOT EXISTS hive_pipelines (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    stages_json TEXT NOT NULL DEFAULT '[]',
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hive_pipeline_runs (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    task_id TEXT,
    request TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    stage_index INTEGER NOT NULL DEFAULT 0,
    loops INTEGER NOT NULL DEFAULT 0,
    log_json TEXT NOT NULL DEFAULT '[]',
    error TEXT,
    started_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_hive_pipeline_runs ON hive_pipeline_runs(project_id, created_at)",
  // Machines: computers/servers running the Hive bridge (local folders, commands).
  `CREATE TABLE IF NOT EXISTS hive_machines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    created_by TEXT NOT NULL,
    info_json TEXT NOT NULL DEFAULT '{}',
    policy TEXT NOT NULL DEFAULT 'ask',
    last_seen INTEGER,
    created_at INTEGER NOT NULL
  )`,
];

// Columns added after the first release (ALTER fails harmlessly if present).
const COLUMNS = [
  ["hive_keys", "preset TEXT"],
  ["hive_keys", "priority INTEGER NOT NULL DEFAULT 0"],
  ["hive_tasks", "budget_tokens INTEGER"],
  ["hive_tasks", "attachments_json TEXT"],
  ["hive_agents", "title TEXT"],
  ["hive_agents", "handoffs INTEGER NOT NULL DEFAULT 0"],
  ["hive_keys", "default_pinned INTEGER NOT NULL DEFAULT 0"],
  ["hive_usage", "cached_tokens INTEGER NOT NULL DEFAULT 0"],
  ["hive_convo_msgs", "group_id TEXT"],
  ["hive_convo_msgs", "preferred INTEGER NOT NULL DEFAULT 0"],
  ["hive_tasks", "repo_id TEXT"],
  ["hive_tasks", "machine_id TEXT"],
  ["hive_tasks", "folder TEXT"],
  ["hive_convos", "pinned INTEGER NOT NULL DEFAULT 0"],
  ["hive_projects", "idea_id TEXT"],
  ["hive_projects", "machine_id TEXT"],
  ["hive_projects", "folder TEXT"],
  ["hive_projects", "site_url TEXT"],
  // v4: subscription agents, free tiers, routing, sandboxes, measured performance.
  ["hive_keys", "machine_id TEXT"],
  ["hive_keys", "free_tier INTEGER NOT NULL DEFAULT 0"],
  ["hive_agents", "routed_kind TEXT"],
  ["hive_agents", "route_note TEXT"],
  ["hive_agents", "escalations INTEGER NOT NULL DEFAULT 0"],
  ["hive_agents", "cli_session TEXT"],
  ["hive_tasks", "kind TEXT"],
  ["hive_tasks", "worktree TEXT"],
  ["hive_tasks", "schedule_id TEXT"],
  ["hive_projects", "isolate INTEGER NOT NULL DEFAULT 1"],
  ["hive_convo_msgs", "rating INTEGER"],
  ["hive_convo_msgs", "tools_json TEXT"],
  ["hive_convos", "tools INTEGER NOT NULL DEFAULT 1"],
  ["hive_tasks", "pipeline_run TEXT"],
  ["hive_schedules", "pipeline_id TEXT"],
];

let ready = null;
function initHiveDb() {
  ready ||= (async () => {
    for (const sql of SCHEMA) await run(sql);
    for (const [table, col] of COLUMNS) await run(`ALTER TABLE ${table} ADD COLUMN ${col}`).catch(() => {});
    // Agents that were running when the process stopped will never finish.
    await run(
      "UPDATE hive_agents SET status='interrupted', error='The server restarted while this agent was running', finished_at=? WHERE status IN ('queued','running')",
      [now()],
    );
    await run("UPDATE hive_tasks SET status='interrupted' WHERE status='running'");
  })();
  return ready;
}

module.exports = { initHiveDb, newId, now, json, run, get, all };
