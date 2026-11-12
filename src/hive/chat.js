// Hive chat: Claude-style conversations with any connected model. Messages
// can carry files (images, PDFs, text/code, or files straight from a project
// repository), image-capable providers can generate images, and replies
// stream live. Chats are private unless shared with the team.
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");
const keys = require("./keys");
const vault = require("./vault");
const gh = require("./github");
const { providerOf } = require("./providers");
const { resolvePlugins } = require("./plugins");
const { getSnapshot, readBase } = require("./snapshot");
const { fileToAttachment } = require("./runner");
const { pickDefault } = require("./models");

const MAX_FILE = 20 * 1024 * 1024;
const active = new Map(); // convoId -> AbortController

async function canSee(convo, username) {
  return !!convo && (convo.owner === username || !!convo.shared);
}

async function convoFor(id, username) {
  const c = await get("SELECT * FROM hive_convos WHERE id=?", [id]);
  if (!(await canSee(c, username))) throw Object.assign(new Error("Chat not found"), { status: 404 });
  return c;
}

async function listConvos(username) {
  return all("SELECT * FROM hive_convos WHERE owner=? OR shared=1 ORDER BY updated_at DESC LIMIT 200", [username]);
}

async function createConvo(username, { title, projectId, provider, keyId, model, system }) {
  const id = newId("cv");
  const t = now();
  await run(
    "INSERT INTO hive_convos(id, title, owner, shared, project_id, provider, key_id, model, system, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    [id, title || "New chat", username, 0, projectId || null, provider || null, keyId || null, model || null, system || "", t, t],
  );
  return get("SELECT * FROM hive_convos WHERE id=?", [id]);
}

async function messagesOf(convoId) {
  const rows = await all("SELECT * FROM hive_convo_msgs WHERE convo_id=? ORDER BY created_at, id", [convoId]);
  return rows.map((r) => ({ ...r, attachments: json(r.attachments_json, []), attachments_json: undefined }));
}

async function saveFile({ name, mime, buffer, origin = "upload", username }) {
  if (buffer.length > MAX_FILE) throw Object.assign(new Error("File too large (20 MB max)"), { status: 400 });
  const id = newId("file");
  await run("INSERT INTO hive_files(id, name, mime, size, data_b64, origin, created_by, created_at) VALUES(?,?,?,?,?,?,?,?)", [
    id,
    String(name || "file").slice(0, 200),
    String(mime || "application/octet-stream").slice(0, 100),
    buffer.length,
    buffer.toString("base64"),
    origin,
    username,
    now(),
  ]);
  return { id, name, mime, size: buffer.length, origin };
}

/** Resolve attachment refs ({fileId} or {projectId, path}) into stored files. */
async function resolveRefs(refs, username) {
  const out = [];
  for (const r of (Array.isArray(refs) ? refs : []).slice(0, 12)) {
    if (r?.fileId) {
      const f = await get("SELECT id, name, mime, size, origin FROM hive_files WHERE id=?", [String(r.fileId)]);
      if (f) out.push(f);
    } else if (r?.projectId && r?.path) {
      const p = await get("SELECT * FROM hive_projects WHERE id=?", [String(r.projectId)]);
      const cred = p && (await get("SELECT * FROM hive_github WHERE id=?", [p.github_id]));
      if (!cred) continue;
      const token = vault.open(cred.token_enc);
      const head = await gh.commit(token, p.repo_owner, p.repo_name, p.default_branch);
      const snap = await getSnapshot(token, p.repo_owner, p.repo_name, head.sha);
      const text = await readBase(snap, String(r.path)).catch(() => null);
      if (text == null) continue;
      out.push(await saveFile({ name: `${p.repo_name}/${r.path}`, mime: "text/plain", buffer: Buffer.from(text, "utf8"), origin: "repo", username }));
    }
  }
  return out;
}

async function loadAttachments(list) {
  if (!list?.length) return [];
  const ids = list.map((a) => a.id);
  const rows = await all(`SELECT id, name, mime, data_b64 FROM hive_files WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  return rows.map(fileToAttachment);
}

async function pickChatKey(spec, exclude = []) {
  const k = await keys.pickKey(spec.provider, { prefer: spec.keyId || "auto", exclude });
  if (k && (await keys.hasBudget(k)) && !exclude.includes(k.id)) return { key: k, provider: spec.provider };
  const same = await keys.pickKey(spec.provider, { exclude: [...exclude, k?.id].filter(Boolean) });
  if (same) return { key: same, provider: spec.provider };
  const plugins = (await resolvePlugins(null)).builtins;
  if (!plugins.never_stop?.enabled) return null;
  const other = await keys.pickHandoffKey({ exclude, order: plugins.never_stop.config.order || [], skipVendor: spec.provider });
  return other ? { key: other, provider: keys.keyVendor(other) } : null;
}

/**
 * Send a message and stream the reply. spec: { provider, keyId, model, effort }.
 * mode 'image' generates an image instead of text.
 */
async function send(convoId, { text, refs, spec, specs, mode = "text", username, sink }) {
  // Several models at once: one user message, one reply per model (side by side).
  const list = Array.isArray(specs) && specs.length ? specs.slice(0, 4) : [spec];
  const convo = await convoFor(convoId, username);
  const files = await resolveRefs(refs, username);
  const userMsg = { id: newId("m"), convo_id: convoId, role: "user", content: String(text || ""), attachments: files, author: username, created_at: now() };
  await run("INSERT INTO hive_convo_msgs(id, convo_id, role, content, attachments_json, author, created_at) VALUES(?,?,?,?,?,?,?)", [
    userMsg.id,
    convoId,
    "user",
    userMsg.content,
    JSON.stringify(files),
    username,
    userMsg.created_at,
  ]);
  hub.emitConvo(convoId, "convo:msg", userMsg);
  sink?.("msg", userMsg);
  const fields = { updated_at: now(), provider: spec.provider, key_id: spec.keyId || null, model: spec.model || null };
  if (convo.title === "New chat" && userMsg.content) fields.title = userMsg.content.replace(/\s+/g, " ").slice(0, 70);
  await run(`UPDATE hive_convos SET ${Object.keys(fields).map((k) => `${k}=?`).join(", ")} WHERE id=?`, [...Object.values(fields), convoId]);
  hub.emitConvo(convoId, "convo:meta", { id: convoId, ...fields });

  const runs = list.map((sp, i) => {
    const reply = { id: newId("m"), convo_id: convoId, role: "assistant", content: "", attachments: [], author: null, created_at: now() + 1 + i, group_id: list.length > 1 ? userMsg.id : null };
    hub.emitConvo(convoId, "convo:start", { id: reply.id, convoId, provider: sp.provider, model: sp.model || null, group: reply.group_id });
    sink?.("start", { id: reply.id, convoId, provider: sp.provider, model: sp.model || null, group: reply.group_id });
    return { reply, done: generate(convo, reply, { spec: sp, mode, prompt: userMsg.content, username, sink }).catch((e) => {
      console.error("[hive chat]", e.message);
      sink?.("done", { ...reply, error: e.message });
    }) };
  });
  return { user: userMsg, replyId: runs[0].reply.id, replyIds: runs.map((r) => r.reply.id), done: Promise.all(runs.map((r) => r.done)) };
}

async function generate(convo, reply, { spec: spec0, mode, prompt, username, sink }) {
  let spec = spec0;
  let modelRetried = false;
  // Every event goes to the room (other viewers) and to the sender's own
  // HTTP stream, so the person who sent the message always sees the reply.
  const out = (event, payload) => {
    hub.emitConvo(convo.id, `convo:${event}`, payload);
    sink?.(event, payload);
  };
  const controller = new AbortController();
  // Several replies may stream at once: stop() aborts them all.
  const set = active.get(convo.id) || new Set();
  set.add(controller);
  active.set(convo.id, set);
  const tried = [];
  let lastErr = null; // the provider's own error, shown if every key fails
  let error = null;
  let usage = { input: 0, output: 0 };
  let served = { provider: spec.provider, model: spec.model };
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const pick = await pickChatKey(spec, tried);
      if (!pick) {
        if (lastErr) throw lastErr;
        throw new Error(await keys.explainNoKey(spec.provider));
      }
      const { key, provider } = pick;
      const v = providerOf(provider);
      const model = provider === spec.provider && spec.model ? spec.model : key.default_model || pickDefault(json(key.models_json, []), v.suggested);
      served = { provider, model };
      if (provider !== spec.provider || attempt > 0) out("note", { id: reply.id, text: `Continuing with ${v.label} (${key.label})` });
      try {
        if (mode === "image") {
          if (!v.caps.images || !v.impl.generateImage) throw Object.assign(new Error(`${v.label} can't generate images — pick GPT, Gemini, Grok or Together`), { kind: "bad_request" });
          const r = await v.impl.generateImage({ secret: keys.secretOf(key), baseUrl: key.base_url || v.baseUrl, model: v.imageModel, prompt });
          const saved = [];
          for (const [i, img] of r.images.entries()) {
            saved.push(await saveFile({ name: `image-${i + 1}.${img.mime.split("/")[1] || "png"}`, mime: img.mime, buffer: Buffer.from(img.data, "base64"), origin: "generated", username }));
          }
          reply.attachments = saved;
          reply.content = r.text || "";
          served.model = v.imageModel;
          await keys.recordUsage(key.id, username, { input: 0, output: 0 }, null);
          break;
        }
        const history = await messagesOf(convo.id);
        const messages = [];
        for (const m of history) {
          if (m.role === "user") messages.push({ role: "user", text: m.content, attachments: await loadAttachments(m.attachments) });
          else if (m.role === "assistant" && m.content) {
            // Side-by-side answers: keep one per turn (the one marked preferred, else the first).
            const last = messages[messages.length - 1];
            if (last?.role === "assistant") {
              if (m.preferred) last.text = m.content;
              continue;
            }
            messages.push({ role: "assistant", text: m.content });
          }
        }
        const plugins = await resolvePlugins(convo.project_id);
        const extras = plugins.custom.filter((c) => c.enabled && (c.config.appliesTo || "all") !== "tasks").map((c) => c.config.instructions);
        if (plugins.builtins.terse?.enabled) extras.push("Be concise.");
        const system = [convo.system || "You are a helpful, precise assistant for a software team. Use Markdown. Put code in fenced blocks with a language.", ...extras].filter(Boolean).join("\n\n");
        let flushTimer = null;
        let buf = "";
        let think = "";
        const flush = () => {
          flushTimer = null;
          if (buf) out("delta", { id: reply.id, text: buf }), (buf = "");
          if (think) out("thinking", { id: reply.id, text: think }), (think = "");
        };
        const res = await v.impl.turn({
          secret: keys.secretOf(key),
          baseUrl: key.base_url || v.baseUrl,
          official: !!v.official,
          vision: !!v.caps.vision,
          model,
          effort: spec.effort || (provider === "anthropic" ? "medium" : null),
          system,
          messages,
          tools: [],
          signal: controller.signal,
          cache: plugins.builtins.prompt_cache?.enabled !== false,
          onText: (d) => ((buf += d), (flushTimer ||= setTimeout(flush, 60))),
          onThinking: (d) => ((think += d), (flushTimer ||= setTimeout(flush, 60))),
        });
        clearTimeout(flushTimer);
        flush();
        reply.content = res.text;
        served.model = res.servedModel || model;
        usage = res.usage;
        await keys.recordUsage(key.id, username, { input: res.usage.input, output: res.usage.output, cacheRead: res.usage.cacheRead || 0, costMicros: res.costMicros || 0 }, res.rateLimit);
        hub.emit("usage", { keyId: key.id });
        if (res.stop === "refusal") error = "The model declined this request";
        break;
      } catch (e) {
        if (e.kind === "aborted" || controller.signal.aborted) {
          error = "Stopped";
          break;
        }
        if (["auth", "quota", "rate"].includes(e.kind)) {
          lastErr = e;
          tried.push(key.id);
          if (e.kind === "auth") keys.checkKey(key.id).catch(() => {});
          continue;
        }
        // The chosen model is gone or not offered by this key: refresh the
        // key's model list and continue on its (new) default.
        if (e.kind === "model" && !modelRetried) {
          modelRetried = true;
          const c = await keys.checkKey(key.id).catch(() => null);
          const next = c?.defaultModel;
          if (next && next !== model) {
            spec = { ...spec, model: next };
            out("note", { id: reply.id, text: `${model} isn't available on this key — using ${next}` });
            continue;
          }
        }
        throw e;
      }
    }
  } catch (e) {
    error = friendlyError(e, served);
  } finally {
    set.delete(controller);
    if (!set.size) active.delete(convo.id);
  }
  await run(
    "INSERT INTO hive_convo_msgs(id, convo_id, role, content, attachments_json, provider, model, input_tokens, output_tokens, error, created_at, group_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    [reply.id, convo.id, "assistant", reply.content, JSON.stringify(reply.attachments), served.provider, served.model, usage.input, usage.output, error, reply.created_at, reply.group_id || null],
  );
  out("done", { ...reply, provider: served.provider, model: served.model, input_tokens: usage.input, output_tokens: usage.output, error });
}

const HINTS = {
  auth: "The provider rejected the API key — check it in Keys (it may be wrong, revoked or missing permissions).",
  quota: "This key is out of credit or quota — top it up or add another key.",
  rate: "Rate-limited — wait a moment, lower concurrency, or add another key.",
  model: "That model isn't available on this key — pick another in the model menu.",
  network: "Couldn't reach the provider — check the base URL or try again.",
};

/** One readable line: who failed, why, and what to do about it. */
function friendlyError(e, served) {
  let label = served?.provider || "";
  try {
    label = providerOf(served.provider).label;
  } catch {}
  const where = [label, served?.model].filter(Boolean).join(" · ");
  const hint = HINTS[e.kind];
  return `${where ? `${where}: ` : ""}${String(e.message || "Something went wrong").slice(0, 400)}${hint ? `\n${hint}` : ""}`;
}

function stop(convoId) {
  const set = active.get(convoId);
  if (set) for (const c of set) c.abort();
  return !!set;
}

module.exports = { listConvos, createConvo, convoFor, canSee, messagesOf, send, stop, saveFile, MAX_FILE };
