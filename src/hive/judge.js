// The Judge: several agents attempt the same work (compare mode, or
// side-by-side chat answers); a strong model from a different lab reads every
// attempt, ranks them with reasons and picks the winner — which is adopted as
// the task's result automatically (staff can always pick another).
const { run, get, all } = require("./db");
const hub = require("./hub");
const llm = require("./llm");
const { unifiedDiff } = require("./diff");
const { readBase } = require("./snapshot");

const LETTERS = "ABCDEFGH";
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}\n… [${s.length - n} more characters cut]` : s);

const SYSTEM = `You are the Judge in Nexora Hive. Several AI agents attempted the same task independently. Compare their results on correctness first, then completeness, code quality and fit with the codebase, then simplicity. Be specific and fair; do not favour longer answers. Reply with JSON only:
{"winner":"A","ranking":[{"candidate":"A","score":0-10,"strengths":"…","weaknesses":"…"}],"reason":"two or three sentences on why the winner is best"}`;

async function judgeTask(taskId, { by = "auto", adopt = true, agentIds = null } = {}) {
  const runner = require("./runner");
  const { adoptVariant } = require("./workspace");
  const ctx = await runner.taskContext(taskId);
  const { task } = ctx;
  const agents = (await all("SELECT * FROM hive_agents WHERE task_id=? AND variant=id AND status='done' ORDER BY created_at", [taskId])).filter((a) => !agentIds || agentIds.includes(a.id)).slice(0, LETTERS.length);
  if (!agents.length) return null;
  const candidates = [];
  for (const [i, a] of agents.entries()) {
    const ws = runner.workspaceOf(ctx, a.variant);
    const changes = await ws.changes().catch(() => []);
    let diff = "";
    for (const c of changes.slice(0, 25)) {
      const base = c.status === "added" ? "" : (await (ws.readBase ? ws.readBase(c.path) : readBase(ctx.snap, c.path)).catch(() => "")) || "";
      const cur = c.status === "deleted" ? "" : (await ws.read(c.path).catch(() => "")) || "";
      diff += `\n${unifiedDiff(base, cur, c.path)}`;
      if (diff.length > 24_000) break;
    }
    candidates.push({ letter: LETTERS[i], agent: a, files: changes.length, diff: clip(diff, 24_000), report: clip(String(a.result || ""), 3000) });
  }
  if (candidates.length === 1) {
    const only = candidates[0];
    if (adopt) await adoptVariant(taskId, only.agent.variant, "main");
    await runner.event(taskId, null, "verdict", { winner: only.agent.id, name: only.agent.name, model: only.agent.model, reason: "Only one attempt finished — adopted it.", ranking: [], judge: null, by });
    return { winner: only.agent.id };
  }
  const prompt = [
    `Task: ${task.title}\n\nRequest:\n${clip(task.prompt, 6000)}`,
    ...candidates.map((c) => `\n\n=== Candidate ${c.letter} (${c.files} file${c.files === 1 ? "" : "s"} changed) ===\nAgent report:\n${c.report || "(none)"}\n\nChanges:\n${c.diff || "(no changes)"}`),
  ].join("");
  const authors = [...new Set(agents.map((a) => a.provider))];
  await runner.event(taskId, null, "system", { message: `The Judge is comparing ${candidates.length} attempts…` });
  // Ask a judge from another lab first; a reply that names no valid winner gets
  // one more judge. Without a clear verdict nothing is adopted (never "A by default").
  const ask = (extra) => llm.ask({ kind: "review", prompt, system: SYSTEM, json: true, preference: "quality", username: by, projectId: task.project_id, ...extra });
  const pick = (r) => candidates.find((c) => c.letter === String(r?.data?.winner || "").trim().toUpperCase());
  let res = null;
  let firstError = null;
  for (const extra of [{ excludeVendors: authors }, {}]) {
    try {
      const r = await ask({ ...extra, excludeModels: res ? [`${res.provider}|${res.model}`] : [] });
      res = r;
      if (pick(r)) break;
    } catch (e) {
      firstError = firstError || e;
    }
  }
  const winner = pick(res);
  if (!winner) {
    const why = res ? "the judges' replies didn't name a valid winner" : `no judge answered (${firstError?.message || "no model available"})`;
    await runner.event(taskId, null, "verdict", { winner: null, noVerdict: true, reason: `No verdict: ${why}. Nothing was adopted — compare the attempts yourself, or ask the Copilot to judge again.`, ranking: [], judge: res ? { model: res.model } : null, by });
    return { winner: null, noVerdict: true };
  }
  const v = res.data || {};
  const ranking = (Array.isArray(v.ranking) ? v.ranking : []).map((r) => {
    const c = candidates.find((x) => x.letter === String(r.candidate || "").trim().toUpperCase());
    return c ? { agentId: c.agent.id, name: c.agent.name, model: c.agent.model, provider: c.agent.provider, score: Number(r.score) || 0, strengths: String(r.strengths || "").slice(0, 600), weaknesses: String(r.weaknesses || "").slice(0, 600) } : null;
  }).filter(Boolean);
  if (adopt) await adoptVariant(taskId, winner.agent.variant, "main");
  await runner.setTask(taskId, { summary: winner.agent.result || task.summary });
  await runner.event(taskId, null, "verdict", {
    winner: winner.agent.id,
    name: winner.agent.name,
    model: winner.agent.model,
    provider: winner.agent.provider,
    reason: String(v.reason || "").slice(0, 1500),
    ranking,
    judge: { model: res.model, provider: res.provider },
    adopted: !!adopt,
    by,
  });
  hub.emitTask(taskId, "changes", { variant: "main" });
  return { winner: winner.agent.id, ranking, reason: v.reason, judge: res.model };
}

/** Pick the best of several side-by-side chat answers. */
async function judgeAnswers(convoId, groupId, username) {
  const user = await get("SELECT * FROM hive_convo_msgs WHERE id=? AND convo_id=?", [groupId, convoId]);
  const answers = (await all("SELECT * FROM hive_convo_msgs WHERE convo_id=? AND group_id=? AND role='assistant' AND error IS NULL ORDER BY created_at", [convoId, groupId])).slice(0, LETTERS.length);
  if (answers.length < 2) throw Object.assign(new Error("Need at least two answers to compare"), { status: 400 });
  const prompt = `Question:\n${clip(String(user?.content || ""), 6000)}\n${answers.map((a, i) => `\n=== Answer ${LETTERS[i]} (${a.model}) ===\n${clip(String(a.content || ""), 8000)}`).join("\n")}`;
  const authors = [...new Set(answers.map((a) => a.provider))];
  const system = `You compare answers to the same question. Judge accuracy first, then usefulness, clarity and completeness; don't favour length. Reply with JSON only: {"winner":"A","ranking":[{"candidate":"A","score":0-10,"why":"…"}],"reason":"one or two sentences"}`;
  let res;
  try {
    res = await llm.ask({ kind: "review", prompt, system, json: true, preference: "quality", excludeVendors: authors, username });
  } catch {
    res = await llm.ask({ kind: "review", prompt, system, json: true, preference: "quality", username });
  }
  const v = res.data || {};
  const idx = Math.max(0, LETTERS.indexOf(String(v.winner || "A").trim().toUpperCase()));
  const win = answers[Math.min(idx, answers.length - 1)];
  await run("UPDATE hive_convo_msgs SET preferred=CASE WHEN id=? THEN 1 ELSE 0 END WHERE convo_id=? AND group_id=?", [win.id, convoId, groupId]);
  const verdict = {
    winner: win.id,
    reason: String(v.reason || "").slice(0, 800),
    ranking: (v.ranking || []).map((r) => ({ id: answers[LETTERS.indexOf(String(r.candidate || "").toUpperCase())]?.id, score: Number(r.score) || 0, why: String(r.why || "").slice(0, 400) })).filter((r) => r.id),
    judge: res.model,
  };
  hub.emitConvo(convoId, "convo:verdict", { groupId, ...verdict });
  return verdict;
}

module.exports = { judgeTask, judgeAnswers };
