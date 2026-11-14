// The Dispatcher: one request in, a team of the right agents out.
//
// 1. plan()  — a planning model splits the request into parts (each with a
//    kind of work: mechanical, reading, coding, review, hard…), dependencies
//    and a size. Every part is then matched by the router to the CHEAPEST
//    model that clears the quality bar for that kind of work (free and
//    subscription first, healthy models only), with an estimated cost. A
//    "one strong model for everything" baseline shows what that saves.
// 2. run()   — parts run in waves: parts whose dependencies are done run in
//    parallel on the shared working copy; each part gets the results of the
//    parts it depends on; a cross-vendor reviewer checks the whole at the end.
//    Failing agents escalate or hand off (health + router), so work continues.
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");
const { KINDS, cardFor, priceOf } = require("./catalog");

const SIZE = { s: { input: 12000, output: 1500 }, m: { input: 40000, output: 5000 }, l: { input: 110000, output: 12000 } };

const active = new Map(); // dispatchId → { stop }

function pub(r) {
  if (!r) return null;
  return {
    id: r.id,
    projectId: r.project_id,
    taskId: r.task_id || null,
    request: r.request,
    status: r.status,
    plan: json(r.plan_json, null),
    progress: json(r.progress_json, {}),
    error: r.error || null,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function setRow(id, fields) {
  const keys = Object.keys(fields);
  await run(`UPDATE hive_dispatches SET ${keys.map((k) => `${k}=?`).join(", ")}, updated_at=? WHERE id=?`, [...Object.values(fields), now(), id]);
  const r = pub(await get("SELECT * FROM hive_dispatches WHERE id=?", [id]));
  hub.emit("dispatch", r);
  return r;
}

function estimate(pick, size) {
  const sz = SIZE[size] || SIZE.m;
  if (!pick) return { ...sz, dollars: null };
  if (pick.cost === "free" || pick.cost === "sub") return { ...sz, dollars: 0 };
  const card = cardFor(pick.model, pick.provider);
  return { ...sz, dollars: card?.price ? priceOf(card, sz.input, sz.output) : null };
}

function topo(parts) {
  const ids = new Set(parts.map((p) => p.id));
  for (const p of parts) p.dependsOn = (p.dependsOn || []).filter((d) => ids.has(d) && d !== p.id);
  // Break cycles: drop a dependency on a later part.
  const order = parts.map((p) => p.id);
  for (const p of parts) p.dependsOn = p.dependsOn.filter((d) => order.indexOf(d) < order.indexOf(p.id));
  return parts;
}

const cleanKind = (k) => (KINDS[k] ? k : "coding");

/** Split a request into parts and assign each to the cheapest capable model. */
async function plan({ request, project, username, preference = "savings", freeOnly = false, maxParts = 8 }) {
  const llm = require("./llm");
  const router = require("./router");
  const kinds = Object.entries(KINDS)
    .map(([k, v]) => `${k}: ${v.hint}`)
    .join("\n");
  const r = await llm.ask({
    kind: "hard",
    preference: "balanced",
    json: true,
    username,
    projectId: project.id,
    system:
      "You are the dispatcher of a team of AI coding agents. Split work so that each part can be done by the cheapest capable model: keep mechanical and reading work separate from hard engineering, and only mark a part 'hard' when it truly needs top-tier reasoning. Parts that don't depend on each other run in parallel on the same working copy, so make parallel parts touch different files. Each prompt must be fully self-contained (the agent sees only its prompt, the repo, and results of parts it depends on). Reply with JSON only.",
    prompt: `Project: ${project.name}${project.description ? ` — ${project.description}` : ""}
Request:
${String(request).slice(0, 12000)}

Kinds of work:
${kinds}

Reply as:
{"summary": "one line", "parts": [{"id": "p1", "title": "short title", "kind": "one of the kinds", "size": "s|m|l", "files": ["paths or areas it touches"], "dependsOn": ["ids"], "prompt": "precise, self-contained instructions with acceptance criteria"}], "review": true}
Use 1 part for a small request and at most ${maxParts} parts. Order parts so dependencies come first.`,
  });
  const data = r.data || {};
  let parts = (Array.isArray(data.parts) ? data.parts : []).slice(0, maxParts).map((p, i) => ({
    id: String(p.id || `p${i + 1}`).slice(0, 12),
    title: String(p.title || `Part ${i + 1}`).slice(0, 80),
    kind: cleanKind(String(p.kind || "")),
    size: ["s", "m", "l"].includes(p.size) ? p.size : "m",
    files: (Array.isArray(p.files) ? p.files : []).map(String).slice(0, 12),
    dependsOn: (Array.isArray(p.dependsOn) ? p.dependsOn : []).map(String),
    prompt: String(p.prompt || p.title || request).slice(0, 8000),
  }));
  if (!parts.length) parts = [{ id: "p1", title: String(request).split("\n")[0].slice(0, 80), kind: router.classify(request, { byPerson: false }).kind, size: "m", files: [], dependsOn: [], prompt: String(request) }];
  parts = topo(parts);

  const machineId = project.machine_id || null;
  const routeOf = (kind, pref, extra = {}) => router.route({ prompt: "", kind, needTools: true, machineId, preference: pref, freeOnly, ...extra }).catch(() => null);
  let total = 0;
  let known = true;
  for (const p of parts) {
    const rr = await routeOf(p.kind, preference);
    p.pick = rr ? { ...rr.pick, note: rr.note } : null;
    p.alternatives = rr ? rr.alternatives.slice(0, 3) : [];
    p.estimate = estimate(p.pick, p.size);
    if (p.estimate.dollars == null) known = false;
    else total += p.estimate.dollars;
  }
  // Baseline: the strongest available model doing everything.
  const strong = await routeOf("hard", "quality");
  let baseline = null;
  if (strong) {
    const sum = parts.reduce((n, p) => {
      const e = estimate(strong.pick, p.size);
      return e.dollars == null ? null : n == null ? null : n + e.dollars;
    }, 0);
    baseline = { name: strong.pick.name, provider: strong.pick.provider, model: strong.pick.model, cost: strong.pick.cost, dollars: sum };
  }
  const reviewRoute = data.review === false ? null : await routeOf("review", "quality");
  return {
    summary: String(data.summary || parts[0].title).slice(0, 200),
    parts,
    review: reviewRoute ? { ...reviewRoute.pick, note: reviewRoute.note } : null,
    totals: { dollars: known ? total : null, baseline, plannedBy: r.model, preference, freeOnly },
  };
}

async function create({ project, request, username, preference, freeOnly }) {
  const p = await plan({ request, project, username, preference, freeOnly });
  const id = newId("dsp");
  const t = now();
  await run("INSERT INTO hive_dispatches(id, project_id, request, status, plan_json, progress_json, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)", [id, project.id, String(request).slice(0, 20000), "planned", JSON.stringify(p), "{}", username, t, t]);
  return pub(await get("SELECT * FROM hive_dispatches WHERE id=?", [id]));
}

/** Change a part's model (or prompt) before running. */
async function edit(id, { partId, spec, prompt, remove }) {
  const r = await get("SELECT * FROM hive_dispatches WHERE id=?", [id]);
  if (!r) throw Object.assign(new Error("Dispatch not found"), { status: 404 });
  if (r.status !== "planned") throw Object.assign(new Error("Already running"), { status: 409 });
  const p = json(r.plan_json, { parts: [] });
  if (remove) {
    p.parts = p.parts.filter((x) => x.id !== partId);
    for (const x of p.parts) x.dependsOn = (x.dependsOn || []).filter((d) => d !== partId);
  }
  const part = p.parts.find((x) => x.id === partId);
  if (part && spec?.provider) {
    const card = cardFor(spec.model || "", spec.provider);
    part.pick = { provider: spec.provider, keyId: spec.keyId || "auto", model: spec.model || "", name: card?.name || spec.model || spec.provider, quality: null, cost: card?.tier || "mid", chosen: true };
    part.estimate = estimate(part.pick, part.size);
  }
  if (part && typeof prompt === "string" && prompt.trim()) part.prompt = prompt.slice(0, 8000);
  const known = p.parts.every((x) => x.estimate?.dollars != null);
  p.totals.dollars = known ? p.parts.reduce((n, x) => n + x.estimate.dollars, 0) : null;
  return setRow(id, { plan_json: JSON.stringify(p) });
}

/** Start the team. createTask(project, {title, prompt}) makes the task row. */
async function start(id, { username, createTask }) {
  const r = await get("SELECT * FROM hive_dispatches WHERE id=?", [id]);
  if (!r) throw Object.assign(new Error("Dispatch not found"), { status: 404 });
  if (r.status !== "planned") throw Object.assign(new Error("Already started"), { status: 409 });
  const project = await get("SELECT * FROM hive_projects WHERE id=?", [r.project_id]);
  const p = json(r.plan_json, {});
  const task = await createTask(project, { title: `Team: ${p.summary || String(r.request).split("\n")[0]}`.slice(0, 120), prompt: r.request });
  await run("UPDATE hive_tasks SET mode='pipeline', status='running' WHERE id=?", [task.id]);
  await setRow(id, { status: "running", task_id: task.id, started_by: username });
  drive(id).catch((e) => console.error("[hive dispatch]", e.message));
  return pub(await get("SELECT * FROM hive_dispatches WHERE id=?", [id]));
}

function stop(id) {
  const a = active.get(id);
  if (a) a.stop = true;
  return !!a;
}

const specOf = (pick, part) =>
  pick && pick.provider && pick.provider !== "auto" ? { provider: pick.provider, keyId: pick.keyId || "auto", model: pick.model || undefined } : { provider: "auto", kind: part.kind, preference: "savings" };

async function drive(id) {
  if (active.has(id)) return;
  const ctl = { stop: false };
  active.set(id, ctl);
  const runner = require("./runner");
  let row = await get("SELECT * FROM hive_dispatches WHERE id=?", [id]);
  const p = json(row.plan_json, {});
  const progress = json(row.progress_json, {});
  const parts = p.parts || [];
  const total = parts.length + (p.review ? 1 : 0);
  const note = async (part, status, message) => {
    progress[part.id] = { ...(progress[part.id] || {}), status, message: message || null, at: now() };
    await setRow(id, { progress_json: JSON.stringify(progress) });
    await runner.event(row.task_id, null, "pipeline", { dispatchId: id, stage: part.title, kind: part.kind, status, message: message || undefined, index: parts.indexOf(part), total });
  };
  try {
    const done = new Set(Object.entries(progress).filter(([, v]) => v.status === "done").map(([k]) => k));
    while (done.size < parts.length) {
      if (ctl.stop) throw Object.assign(new Error("Stopped"), { stopped: true });
      const wave = parts.filter((x) => !done.has(x.id) && x.dependsOn.every((d) => done.has(d)));
      if (!wave.length) throw new Error("The plan's dependencies can't be satisfied");
      await Promise.all(
        wave.map(async (part) => {
          await note(part, "running", `${part.pick?.name || "Auto"} is on it`);
          const inputs = part.dependsOn
            .map((d) => parts.find((x) => x.id === d))
            .filter(Boolean)
            .map((d) => `### ${d.title}\n${String(progress[d.id]?.result || "(done)").slice(0, 3000)}`)
            .join("\n\n");
          const prompt = `You are one agent on a team. Your part: **${part.title}** (${KINDS[part.kind]?.label || part.kind}).${part.files?.length ? `\nFocus on: ${part.files.join(", ")}` : ""}\nOther agents work on other parts of the same working copy at the same time — stay inside your part.\n\n${part.prompt}${inputs ? `\n\n## Results from the parts you depend on\n${inputs}` : ""}`;
          const a = await runner.spawnAndWait(row.task_id, { spec: specOf(part.pick, part), prompt, username: row.started_by || row.created_by, title: part.title, kind: part.kind });
          progress[part.id] = { ...(progress[part.id] || {}), agentId: a.id, result: String(a.result || "").slice(0, 4000), provider: a.provider, model: a.model };
          if (a.status === "done") {
            done.add(part.id);
            await note(part, "done", `${a.model || ""}`.trim() || undefined);
          } else {
            await note(part, "failed", a.error || a.status);
            throw new Error(`“${part.title}” failed: ${a.error || a.status}`);
          }
        }),
      );
    }
    if (p.review) {
      const rv = { id: "review", title: "Team review", kind: "review" };
      await note(rv, "running", `${p.review.name || "Reviewer"} is checking the whole change`);
      const summary = parts.map((x) => `- ${x.title}: ${String(progress[x.id]?.result || "").slice(0, 600)}`).join("\n");
      const a = await runner.spawnAndWait(row.task_id, {
        spec: specOf(p.review, rv),
        prompt: `Review the combined change made by the team for this request:\n${row.request}\n\nWhat each agent reported:\n${summary}\n\nRead the changes (view_changes), check they fit together, fix small integration issues directly, and finish with a short verdict.`,
        username: row.started_by || row.created_by,
        title: "Team review",
        kind: "review",
      });
      await note(rv, a.status === "done" ? "done" : "failed", a.error || undefined);
    }
    await runner.setTask(row.task_id, { status: "review", summary: parts.map((x) => `${x.title}: ${String(progress[x.id]?.result || "").split("\n")[0].slice(0, 200)}`).join("\n") });
    await setRow(id, { status: "done" });
    await require("./caps").alert({ kind: "dispatch", level: "info", title: `Team finished: ${p.summary || "dispatch"}`, body: `${parts.length} parts done`, ref: `/hive/p/${row.project_id}/t/${row.task_id}` }).catch(() => {});
  } catch (e) {
    await setRow(id, { status: e.stopped ? "stopped" : "failed", error: String(e.message).slice(0, 500) });
    if (row.task_id) await runner.setTask(row.task_id, { status: e.stopped ? "stopped" : "failed" }).catch(() => {});
  } finally {
    active.delete(id);
  }
}

async function list(projectId, limit = 30) {
  const rows = projectId ? await all("SELECT * FROM hive_dispatches WHERE project_id=? ORDER BY created_at DESC LIMIT ?", [projectId, limit]) : await all("SELECT * FROM hive_dispatches ORDER BY created_at DESC LIMIT ?", [limit]);
  return rows.map(pub);
}

async function resumeAll() {
  for (const r of await all("SELECT id FROM hive_dispatches WHERE status='running'")) drive(r.id).catch(() => {});
}

module.exports = { plan, create, edit, start, stop, list, resumeAll, drive, pub };
