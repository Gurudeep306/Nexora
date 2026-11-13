// Guide mode: help people get the best out of the agents.
//  • improve(): turn a rough prompt into a clear brief (goal, context,
//    requirements, acceptance criteria, out-of-scope) — shown next to the
//    original so the person can accept, edit or keep their own words.
//  • lifecycle(): where a project is (idea → plan → build → review → ship →
//    live) and the next sensible steps, from what Hive already knows.
const { get, all } = require("./db");
const llm = require("./llm");
const router = require("./router");
const { KINDS } = require("./catalog");

const IMPROVE = {
  task: `You turn a person's rough request into an excellent brief for AI coding agents. Keep their intent exactly; never invent requirements they would not want. Make it specific and testable. Use the project context if given. Reply with JSON only:
{"title": "short imperative title", "prompt": "the improved brief in Markdown: ## Goal, ## Context (what exists / where to look), ## Requirements (bullets), ## Acceptance criteria (checkable bullets), ## Out of scope (only if useful)", "changes": ["what you clarified or added, 2-5 short bullets"], "questions": ["up to 3 questions only if something essential is ambiguous"], "kind": one of ${Object.keys(KINDS).join("|")}}`,
  chat: `You improve a message someone is about to send to an AI assistant so it gets a much better answer: add the missing context, the desired output format, constraints and success criteria — in their voice, without changing what they want. Keep it concise. Reply with JSON only:
{"prompt": "the improved message", "changes": ["what you improved, 2-4 short bullets"], "questions": ["up to 2 questions only if essential"]}`,
  idea: `You sharpen a product idea before it is planned: who it is for, the core problem, the must-have features, constraints and what success looks like — in the person's voice, without changing the idea. Reply with JSON only:
{"prompt": "the improved idea in a few short paragraphs", "changes": ["what you sharpened"], "questions": ["up to 3 questions"]}`,
};

/**
 * Improve a prompt. mode: task | chat | idea. Uses a strong-but-cheap model
 * (writing kind, balanced) — this runs often.
 */
async function improve({ prompt, mode = "task", projectId = null, username }) {
  const text = String(prompt || "").trim();
  if (!text) throw Object.assign(new Error("Write something first"), { status: 400 });
  let context = "";
  if (projectId) {
    const p = await get("SELECT name, description, instructions, repo_owner, repo_name FROM hive_projects WHERE id=?", [projectId]);
    const mem = await all("SELECT title, body FROM hive_memory WHERE project_id=? ORDER BY pinned DESC, created_at DESC LIMIT 15", [projectId]);
    if (p) context = `Project: ${p.name}${p.repo_owner ? ` (${p.repo_owner}/${p.repo_name})` : ""}${p.description ? ` — ${p.description}` : ""}\n${p.instructions ? `Team instructions: ${String(p.instructions).slice(0, 2000)}\n` : ""}${mem.length ? `Project memory:\n${mem.map((m) => `- ${m.title}: ${String(m.body).slice(0, 300)}`).join("\n")}` : ""}`;
  }
  const res = await llm.ask({
    kind: "writing",
    preference: "balanced",
    system: IMPROVE[mode] || IMPROVE.task,
    prompt: `${context ? `${context}\n\n` : ""}Original:\n${text.slice(0, 12000)}`,
    json: true,
    username,
    projectId: projectId || "",
  });
  const d = res.data || {};
  const kind = KINDS[d.kind] ? d.kind : mode === "task" ? router.classify(text).kind : null;
  return {
    original: text,
    prompt: String(d.prompt || text).slice(0, 30000),
    title: d.title ? String(d.title).slice(0, 120) : null,
    changes: (d.changes || []).slice(0, 6).map((x) => String(x).slice(0, 300)),
    questions: (d.questions || []).slice(0, 3).map((x) => String(x).slice(0, 300)),
    kind,
    kindLabel: kind ? KINDS[kind].label : null,
    model: res.model,
  };
}

/** Where a project is and what to do next. */
async function lifecycle(projectId) {
  const p = await get("SELECT * FROM hive_projects WHERE id=?", [projectId]);
  if (!p) throw Object.assign(new Error("Project not found"), { status: 404 });
  const tasks = await all("SELECT status, pr_url, created_at FROM hive_tasks WHERE project_id=? AND archived=0", [projectId]);
  const memory = Number((await get("SELECT COUNT(*) AS n FROM hive_memory WHERE project_id=?", [projectId]))?.n || 0);
  const idea = p.idea_id ? await get("SELECT status FROM hive_ideas WHERE id=?", [p.idea_id]) : null;
  const pipelines = Number((await get("SELECT COUNT(*) AS n FROM hive_pipelines WHERE project_id=?", [projectId]))?.n || 0);
  const schedules = Number((await get("SELECT COUNT(*) AS n FROM hive_schedules WHERE project_id=? AND enabled=1", [projectId]))?.n || 0);
  const keys = await all("SELECT preset, free_tier, machine_id FROM hive_keys WHERE disabled=0");
  const count = (fn) => tasks.filter(fn).length;
  const running = count((t) => t.status === "running" || t.status === "queued");
  const review = count((t) => t.status === "review");
  const prs = count((t) => t.status === "pr_open");
  const shipped = count((t) => ["merged", "committed"].includes(t.status) || (t.pr_url && t.status === "merged"));
  const stages = [
    { id: "plan", label: "Plan", done: !!idea || memory >= 3, detail: idea ? "Planned in the Launchpad" : memory ? `${memory} facts in project memory` : "No plan or project memory yet" },
    { id: "build", label: "Build", done: tasks.length > 0, active: running > 0, detail: running ? `${running} session${running === 1 ? "" : "s"} running` : `${tasks.length} session${tasks.length === 1 ? "" : "s"}` },
    { id: "review", label: "Review", done: review === 0 && tasks.length > 0, active: review > 0, detail: review ? `${review} waiting for your review` : "Nothing waiting" },
    { id: "ship", label: "Ship", done: shipped > 0 || prs > 0, active: prs > 0, detail: prs ? `${prs} PR${prs === 1 ? "" : "s"} open` : shipped ? `${shipped} shipped` : "Nothing shipped yet" },
    { id: "automate", label: "Automate", done: pipelines > 0 || schedules > 0, detail: `${pipelines} pipeline${pipelines === 1 ? "" : "s"} · ${schedules} schedule${schedules === 1 ? "" : "s"}` },
  ];
  const next = [];
  if (!keys.length) next.push({ id: "keys", title: "Connect a model", body: "Add a free key (Gemini, Groq, GitHub Models…) or your Claude Code / Codex subscription.", to: "/hive/keys" });
  if (!keys.some((k) => k.free_tier)) next.push({ id: "free", title: "Add free models", body: "Free tiers take the routine work so paid and subscription models are saved for what needs them.", to: "/hive/keys?tab=free" });
  if (memory < 3) next.push({ id: "memory", title: "Teach the agents this project", body: "Pin the stack, conventions and how to run tests, so every agent starts informed.", to: `/hive/p/${projectId}?tab=memory` });
  if (review) next.push({ id: "review", title: `Review ${review} finished session${review === 1 ? "" : "s"}`, body: "Check the changes and ship them as a pull request.", to: `/hive/p/${projectId}` });
  if (!pipelines) next.push({ id: "pipeline", title: "Design a pipeline", body: "Talk to the Architect: describe how work should flow and it builds an automated agent pipeline.", to: `/hive/pipelines?project=${projectId}` });
  if (!schedules) next.push({ id: "schedule", title: "Put work on autopilot", body: "Nightly test fixing, weekly dependency updates and security reviews — on free models.", to: `/hive/automations?project=${projectId}` });
  if (!p.machine_id && !keys.some((k) => k.machine_id)) next.push({ id: "machine", title: "Connect a machine", body: "Agents can then run tests and use Claude Code / Codex on your plans — around the clock on a free VM.", to: "/hive/machines" });
  return { stages, next: next.slice(0, 4), counts: { tasks: tasks.length, running, review, prs, shipped, memory, pipelines, schedules } };
}

module.exports = { improve, lifecycle };
