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
];

let ready = null;
function initHiveDb() {
  ready ||= (async () => {
    for (const sql of SCHEMA) await run(sql);
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
