/*
 * The Nexus across every subject.
 *
 * DSA is the original competitive-programming tree (NEXUS_NODES in
 * server.js, progress from solved problems). Every other subject is an
 * outline in content/nexus/<id>.json: zones are chapters, nodes are concepts,
 * lessons or projects, and `requires` are prerequisites. A require may point
 * into another subject as "<subject>:<id>" (DBMS "B+ trees" needs DSA
 * "Trees"); those links are surfaced as chips on both ends.
 *
 * Progress per node, from data that already exists:
 *   - GATE notes lessons the node teaches (gate_notes_progress, completed);
 *   - GATE PYQs in the node's pool answered correctly (gate_qstate). The pool
 *     is the node's lessons' PYQs, or its explicit `pyqs`, or the questions
 *     in its `pyqTopics` narrowed by `pyqTags`;
 *   - otherwise 0 (beyond-GATE tracks), unlocking by prerequisites.
 * When a node has both lessons and PYQs, mastery is the mean of the two.
 * A node unlocks when its same-subject prerequisites are mastered (or it
 * already has progress); cross-subject prerequisites are advisory chips.
 *
 * Everything static (outlines, layout, PYQ pools) is computed once; the only
 * per-user reads are two small queries, cached in ./user-cache.
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "..", "content", "nexus");
const MAX_PER_ROW = 5;
const DEFAULT_TARGET = 10;

/* Subjects whose nodes come from code instead of their file: the file then
 * carries only the metadata plus "engine". DSA's tree and its solve-count
 * progress live in ./dsa-nodes.js and server.js. */
const ENGINES = new Set(["dsa"]);

/* Brand gradient (#5b8cff → #9b6bff → #2dd4bf), sampled by depth. */
const C1 = [91, 140, 255];
const C2 = [155, 107, 255];
const C3 = [45, 212, 191];
function gradientHex(u) {
  const t = Math.max(0, Math.min(1, u));
  const [a, b, k] = t < 0.55 ? [C1, C2, t / 0.55] : [C2, C3, (t - 0.55) / 0.45];
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
}

function readOutlines(dir = DIR) {
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();
  } catch {
    return [];
  }
  return files.map((f) => {
    const doc = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    doc._file = f;
    return doc;
  });
}

/** Split "subj:id" (cross) or "id" (same subject) into a global key. */
function refKey(subject, ref) {
  return ref.includes(":") ? ref : `${subject}:${ref}`;
}

/**
 * Structural checks for the outlines (used by the validator script, the
 * test suite, and at server start). Returns a list of error strings.
 */
function validateOutlines(docs, dsaNodes, opts = {}) {
  const errors = [];
  const ids = new Set();
  const keys = new Map(); // global key → requires (global keys)
  // Engine subjects (DSA) bring their nodes from code; a test may pass
  // outlines without the dsa file, so its nodes are always known.
  for (const n of dsaNodes) keys.set(`dsa:${n.id}`, n.requires.map((r) => `dsa:${r}`));
  for (const d of docs) {
    const where = d._file || d.id;
    if (!d.id || !/^[a-z][a-z0-9-]*$/.test(d.id)) errors.push(`${where}: bad subject id`);
    if (ids.has(d.id)) errors.push(`${where}: duplicate subject id ${d.id}`);
    if (d._file && d._file !== `${d.id}.json`) errors.push(`${where}: file name must be ${d.id}.json`);
    ids.add(d.id);
    for (const k of ["name", "short", "group", "icon", "color"]) if (!d[k]) errors.push(`${where}: missing ${k}`);
    if (opts.strict && !d.domain) errors.push(`${where}: missing domain`);
    if (d.engine) {
      if (!ENGINES.has(d.engine) || d.engine !== d.id) errors.push(`${where}: unknown engine ${d.engine}`);
      continue;
    }
    const zones = Array.isArray(d.zones) ? d.zones : [];
    const nodes = Array.isArray(d.nodes) ? d.nodes : [];
    if (zones.length < 3 || zones.length > 8) errors.push(`${where}: ${zones.length} zones (want 4–7)`);
    if (nodes.length < 12 || nodes.length > 45) errors.push(`${where}: ${nodes.length} nodes (want 12–40)`);
    zones.forEach((z, i) => {
      if (z.level !== i + 1) errors.push(`${where}: zone levels must be 1..N in order`);
    });
    const seen = new Set();
    for (const n of nodes) {
      if (!n.id || !/^[a-z0-9][a-z0-9-]*$/.test(n.id)) errors.push(`${where}: bad node id ${n.id}`);
      if (seen.has(n.id)) errors.push(`${where}: duplicate node ${n.id}`);
      seen.add(n.id);
      if (!zones.some((z) => z.level === n.zone)) errors.push(`${where}: ${n.id} is in unknown zone ${n.zone}`);
      if (!n.name) errors.push(`${where}: ${n.id} has no name`);
      if (!Array.isArray(n.requires)) errors.push(`${where}: ${n.id} requires must be an array`);
      keys.set(`${d.id}:${n.id}`, (n.requires || []).map((r) => refKey(d.id, r)));
    }
    for (const z of zones) {
      const count = nodes.filter((n) => n.zone === z.level).length;
      if (count === 0) errors.push(`${where}: zone ${z.level} is empty`);
      if (count > 10) errors.push(`${where}: zone ${z.level} has ${count} nodes (max 10)`);
    }
  }
  // Dangling requires.
  for (const [k, reqs] of keys) {
    for (const r of reqs) {
      if (!keys.has(r)) errors.push(`${k} requires unknown ${r}`);
      if (r === k) errors.push(`${k} requires itself`);
    }
  }
  // Cycles across the whole web (iterative DFS, colours).
  const colour = new Map();
  for (const start of keys.keys()) {
    if (colour.get(start)) continue;
    const stack = [[start, 0]];
    colour.set(start, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const reqs = (keys.get(top[0]) || []).filter((r) => keys.has(r));
      if (top[1] < reqs.length) {
        const next = reqs[top[1]++];
        const c = colour.get(next);
        if (c === 1) {
          errors.push(`cycle through ${next} ← ${top[0]}`);
        } else if (!c) {
          colour.set(next, 1);
          stack.push([next, 0]);
        }
      } else {
        colour.set(top[0], 2);
        stack.pop();
      }
    }
  }
  // GATE topic keys exist in the bank.
  if (opts.bank) {
    const topics = new Set(opts.bank.questions.map((q) => `${q.subject}/${q.topic}`));
    for (const d of docs) {
      for (const n of d.nodes || []) {
        for (const t of n.pyqTopics || []) if (!topics.has(t)) errors.push(`${d.id}:${n.id} unknown pyqTopic ${t}`);
        for (const q of n.pyqs || []) if (!opts.bank.byId.has(q)) errors.push(`${d.id}:${n.id} unknown PYQ ${q}`);
      }
    }
  }
  return errors;
}

/**
 * Lay a subject's nodes out in its zone tiers: rows of at most MAX_PER_ROW,
 * each node placed near the mean x of its parents so links stay short and
 * rarely cross. Returns Map(id → { x (0–100), row }).
 */
function layoutSubject(doc) {
  const out = new Map();
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  for (const z of doc.zones) {
    const zn = doc.nodes.filter((n) => n.zone === z.level);
    // Depth inside the zone, so a node sits below a same-zone prerequisite.
    const depth = new Map();
    const dz = (n, guard = 0) => {
      if (depth.has(n.id)) return depth.get(n.id);
      if (guard > 50) return 0;
      let d = 0;
      for (const r of n.requires || []) {
        const p = byId.get(r);
        if (p && p.zone === z.level) d = Math.max(d, dz(p, guard + 1) + 1);
      }
      depth.set(n.id, d);
      return d;
    };
    const bary = (n, i) => {
      const xs = (n.requires || []).map((r) => out.get(r)?.x).filter((x) => x != null);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 50 + (i - zn.length / 2) * 0.01;
    };
    // One row per in-zone depth (a prerequisite always sits above what it
    // unlocks), each split into balanced rows of at most MAX_PER_ROW.
    // Nodes are placed in depth order so barycentres see their parents.
    const entries = zn.map((n, i) => ({ n, d: dz(n), i }));
    const depths = [...new Set(entries.map((e) => e.d))].sort((a, b) => a - b);
    let r = 0;
    let pending = null; // a lone node waiting to share its row with its lone child
    const place = (row, rowIndex) => {
      if (row.length === 1) {
        // A lone node sits under its parents (clamped to the frame).
        out.set(row[0].n.id, { x: Math.round(Math.max(10, Math.min(90, row[0].b)) * 10) / 10, row: rowIndex });
        return;
      }
      // Even spread in [8, 92]; odd rows shift a quarter step so the web
      // staggers instead of stacking in columns.
      const step = 84 / row.length;
      const shift = rowIndex % 2 === 1 && row.length < MAX_PER_ROW ? step / 4 : 0;
      row.forEach((e, i) => out.set(e.n.id, { x: Math.round((8 + step * (i + 0.5) + shift) * 10) / 10, row: rowIndex }));
    };
    for (const d of depths) {
      const group = entries.filter((e) => e.d === d);
      for (const e of group) e.b = bary(e.n, e.i);
      group.sort((a, b) => a.b - b.b || a.i - b.i);
      // Two lone links of a chain share a row, side by side (a short
      // horizontal strand), instead of stacking a tall ladder.
      if (pending && group.length === 1) {
        const [a, b] = [pending, group[0]];
        const left = a.b <= 50;
        const ax = Math.max(14, Math.min(86, a.b));
        const bx = left ? Math.min(90, ax + 34) : Math.max(10, ax - 34);
        out.set(a.n.id, { x: Math.round(ax * 10) / 10, row: r });
        out.set(b.n.id, { x: Math.round(bx * 10) / 10, row: r });
        r++;
        pending = null;
        continue;
      }
      if (pending) {
        place([pending], r++);
        pending = null;
      }
      if (group.length === 1) {
        pending = group[0];
        continue;
      }
      const parts = Math.ceil(group.length / MAX_PER_ROW);
      const base = Math.floor(group.length / parts);
      let extra = group.length % parts;
      let k = 0;
      for (let p = 0; p < parts; p++) {
        const size = base + (extra-- > 0 ? 1 : 0);
        place(group.slice(k, k + size), r++);
        k += size;
      }
    }
    if (pending) place([pending], r++);
  }
  return out;
}

let registry = null;

/**
 * Load (once) every outline and derive the static parts: layout, global
 * index, reverse cross-subject links. `dsaNodes` is NEXUS_NODES.
 */
function loadRegistry(dsaNodes) {
  if (registry && registry.dsaNodes === dsaNodes) return registry;
  const docs = readOutlines();
  const errors = validateOutlines(docs, dsaNodes);
  if (errors.length) console.error(`[nexus] outline problems:\n  ${errors.slice(0, 20).join("\n  ")}`);
  const subjects = new Map();
  for (const d of docs.sort((a, b) => (a.order || 99) - (b.order || 99) || a.id.localeCompare(b.id))) {
    const meta = {
      id: d.id,
      name: d.name,
      short: d.short,
      group: d.group,
      domain: d.domain || d.group || "other",
      order: d.order,
      icon: d.icon,
      color: d.color,
      description: d.description || "",
      pyqSubject: d.gate?.pyqSubject || null,
      notesSubject: d.gate?.notesSubject || null,
    };
    if (d.engine === "dsa") {
      // Nodes from code; their x is already 0–100, one row per Rift zone.
      const zonesUsed = [...new Set(dsaNodes.map((n) => n.zone))].sort((x, y) => x - y);
      subjects.set(d.id, {
        meta,
        doc: null,
        engine: "dsa",
        shape: { zones: zonesUsed.map((level) => ({ level })), nodes: dsaNodes.map((n) => ({ id: n.id, zone: n.zone, requires: n.requires })) },
        layout: new Map(dsaNodes.map((n) => [n.id, { x: n.x, row: 0 }])),
      });
      continue;
    }
    if (d.engine) continue;
    const layout = layoutSubject(d);
    const zc = d.zones.length;
    subjects.set(d.id, {
      meta,
      doc: d,
      shape: d,
      zoneColor: new Map(d.zones.map((z, i) => [z.level, gradientHex(zc > 1 ? i / (zc - 1) : 0)])),
      layout,
    });
  }
  // Global name index (for chips) and reverse links ("unlocks" in other subjects).
  const names = new Map();
  for (const n of dsaNodes) names.set(`dsa:${n.id}`, { subject: "dsa", id: n.id, name: n.name });
  for (const [sid, s] of subjects) {
    if (!s.doc) continue;
    for (const n of s.doc.nodes) names.set(`${sid}:${n.id}`, { subject: sid, id: n.id, name: n.name });
  }
  const crossUnlocks = new Map(); // global key → [global key of dependant in another subject]
  for (const [sid, s] of subjects) {
    if (!s.doc) continue;
    for (const n of s.doc.nodes) {
      for (const r of n.requires || []) {
        if (!r.includes(":") || !names.has(r)) continue;
        if (!crossUnlocks.has(r)) crossUnlocks.set(r, []);
        crossUnlocks.get(r).push(`${sid}:${n.id}`);
      }
    }
  }
  registry = { dsaNodes, subjects, names, crossUnlocks, errors, pools: null, poolsBank: null };
  return registry;
}

/** Static PYQ pools per node, recomputed only when the bank or notes change. */
function nodePools(reg, bank, notes) {
  if (reg.pools && reg.poolsBank === bank && reg.poolsNotes === notes) return reg.pools;
  const byTopic = new Map();
  for (const q of bank?.questions || []) {
    const k = `${q.subject}/${q.topic}`;
    if (!byTopic.has(k)) byTopic.set(k, []);
    byTopic.get(k).push(q);
  }
  const pools = new Map(); // global key → string[] question ids
  for (const [sid, s] of reg.subjects) {
    if (!s.doc) continue;
    const notesSubj = s.meta.notesSubject ? notes?.subjects?.get(s.meta.notesSubject) : null;
    for (const n of s.doc.nodes) {
      const ids = new Set();
      for (const l of n.lessons || []) {
        for (const q of notesSubj?.lessons.get(l)?.lesson?.pyqs || []) ids.add(q);
      }
      for (const q of n.pyqs || []) ids.add(q);
      if (!ids.size) {
        const subs = (n.pyqTags || []).map((t) => t.toLowerCase());
        for (const t of n.pyqTopics || []) {
          for (const q of byTopic.get(t) || []) {
            if (!subs.length || (q.tags || []).some((tag) => subs.some((s2) => String(tag).toLowerCase().includes(s2)))) ids.add(q.id);
          }
        }
        // Tags too narrow for this bank: fall back to the whole topic.
        if (!ids.size && subs.length) for (const t of n.pyqTopics || []) for (const q of byTopic.get(t) || []) ids.add(q.id);
      }
      pools.set(`${sid}:${n.id}`, [...ids].filter((id) => !bank || bank.byId.has(id)));
    }
  }
  reg.pools = pools;
  reg.poolsBank = bank;
  reg.poolsNotes = notes;
  return pools;
}

/**
 * Progress for every non-DSA subject.
 * @param reg      loadRegistry()
 * @param dsaNodes the computed DSA nodes (with progress / completed)
 * @param state    { qstate: Map(qid → { attempts, correct }), lessons: Set("subject/lesson"),
 *                   notesVisible?: Set(notes subject ids this reader may open) }
 * @param bank     loadGateBank()
 * @param notes    loadGateNotes()
 * @returns Map(subjectId → { nodes, zones })
 */
function computeSubjects(reg, dsaNodes, state, bank, notes) {
  const pools = nodePools(reg, bank, notes);
  const status = new Map(); // global key → { completed, progress, name }
  for (const n of dsaNodes) status.set(`dsa:${n.id}`, n);
  const raw = new Map();
  // Pass 1: progress (independent of unlocks).
  for (const [sid, s] of reg.subjects) {
    if (!s.doc) continue;
    const list = [];
    for (const n of s.doc.nodes) {
      const key = `${sid}:${n.id}`;
      const pool = pools.get(key) || [];
      let correct = 0;
      let attempted = 0;
      let attempts = 0;
      let rights = 0;
      for (const q of pool) {
        const st = state.qstate.get(q);
        if (!st || !st.attempts) continue;
        attempted++;
        attempts += st.attempts;
        rights += st.correct;
        if (st.correct > 0) correct++;
      }
      const target = pool.length ? Math.min(pool.length, n.target || DEFAULT_TARGET) : 0;
      // Lessons count only where the reader can open them (a notes subject
      // still in staff preview is hidden from members).
      const notesOk = s.meta.notesSubject && (!state.notesVisible || state.notesVisible.has(s.meta.notesSubject));
      const lessons = notesOk ? n.lessons || [] : [];
      const lessonsDone = lessons.filter((l) => state.lessons.has(`${s.meta.notesSubject}/${l}`)).length;
      const parts = [];
      if (target) parts.push(Math.min(1, correct / target));
      if (lessons.length) parts.push(lessonsDone / lessons.length);
      const progress = parts.length ? Math.min(100, Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)) : 0;
      const pos = s.layout.get(n.id) || { x: 50, row: 0 };
      const node = {
        id: n.id,
        subject: sid,
        zone: n.zone,
        name: n.name,
        icon: n.icon || "target",
        desc: n.desc || "",
        kind: n.kind || "concept",
        tags: n.pyqTopics || [],
        requires: (n.requires || []).filter((r) => !r.includes(":")),
        target: target || (lessons.length ? lessons.length : 0),
        x: pos.x,
        row: pos.row,
        difficulty: [0, 0],
        xpReward: n.xpReward || 50,
        resources: n.resources || [],
        solved: target ? Math.min(correct, target) : lessonsDone,
        progress,
        metric: {
          pyq: target ? { pool: pool.length, target, correct, attempted, accuracy: attempts ? Math.round((rights / attempts) * 100) : null } : null,
          lessons: lessons.length ? { done: lessonsDone, total: lessons.length, subject: s.meta.notesSubject, ids: lessons } : null,
        },
        completed: progress >= 100,
        _cross: (n.requires || []).filter((r) => r.includes(":")),
      };
      status.set(key, node);
      list.push(node);
    }
    raw.set(sid, list);
  }
  // Pass 2: unlocks and chips.
  const chip = (k) => {
    const nm = reg.names.get(k);
    const st = status.get(k);
    const sm = subjectMeta(reg, nm.subject);
    return { subject: nm.subject, subjectShort: sm.short, subjectName: sm.name, id: nm.id, name: nm.name, completed: !!st?.completed, progress: st?.progress || 0 };
  };
  const out = new Map();
  for (const [sid, s] of reg.subjects) {
    if (!s.doc) continue;
    const list = raw.get(sid);
    for (const node of list) {
      // Same-subject prerequisites gate the unlock, so every subject can be
      // started on its own; cross-subject ones are shown as "Needs" chips
      // (crossReady says whether they are all mastered).
      const reqs = node.requires.map((r) => `${sid}:${r}`).filter((k) => status.has(k));
      node.unlocked = reqs.length === 0 || reqs.every((k) => status.get(k).completed) || node.progress > 0;
      node.crossReady = node._cross.every((k) => status.get(k)?.completed);
      node.crossRequires = node._cross.filter((k) => reg.names.has(k)).map(chip);
      node.crossUnlocks = (reg.crossUnlocks.get(`${sid}:${node.id}`) || []).map(chip);
      delete node._cross;
    }
    const zones = s.doc.zones.map((z) => {
      const zn = list.filter((n) => n.zone === z.level);
      const done = zn.filter((n) => n.completed).length;
      return {
        level: z.level,
        name: z.name,
        color: s.zoneColor.get(z.level),
        glow: "none",
        xpRequired: 0,
        probsRequired: 0,
        minR: 0,
        maxR: 0,
        unlocked: true,
        locked: !zn.some((n) => n.unlocked),
        completed: zn.length > 0 && done === zn.length,
        current: false,
        nodeCount: zn.length,
        nodesCompleted: done,
        zoneProgress: zn.length ? Math.round((done / zn.length) * 100) : 0,
        rows: Math.max(1, ...zn.map((n) => n.row + 1)),
      };
    });
    const cur = zones.find((z) => !z.locked && !z.completed) || zones[0];
    if (cur) cur.current = true;
    out.set(sid, { nodes: list, zones });
  }
  return out;
}

/** A subject's metadata (DSA works even without its file). */
function subjectMeta(reg, id) {
  return reg.subjects.get(id)?.meta || { id, name: id.toUpperCase(), short: id.toUpperCase() };
}

/** Cross-subject chips for DSA nodes (DSA itself has no cross requires). */
function dsaCrossUnlocks(reg, dsaNodeId, computed) {
  return (reg.crossUnlocks.get(`dsa:${dsaNodeId}`) || []).map((k) => {
    const nm = reg.names.get(k);
    const sm = subjectMeta(reg, nm.subject);
    const st = computed.get(nm.subject)?.nodes.find((n) => n.id === nm.id);
    return { subject: nm.subject, subjectShort: sm.short, subjectName: sm.name, id: nm.id, name: nm.name, completed: !!st?.completed, progress: st?.progress || 0 };
  });
}

/** One card per subject for the switcher and the "All subjects" overview. */
function subjectSummaries(reg, dsa, computed) {
  const rows = [];
  for (const [sid, s] of reg.subjects) {
    const data = s.engine === "dsa" ? dsa : computed.get(sid);
    if (!data) continue;
    const nodes = data.nodes;
    const done = nodes.filter((n) => n.completed).length;
    // Which subjects this one builds on, and how many skills link them.
    const needs = {};
    if (!s.engine) for (const n of nodes) for (const c of n.crossRequires) needs[c.subject] = (needs[c.subject] || 0) + 1;
    rows.push({
      needs,
      ...s.meta,
      nodeCount: nodes.length,
      zoneCount: data.zones.length,
      completed: done,
      unlocked: nodes.filter((n) => n.unlocked && !n.completed).length,
      progress: nodes.length ? Math.round(nodes.reduce((a, n) => a + n.progress, 0) / nodes.length) : 0,
      xpEarned: nodes.filter((n) => n.completed).reduce((a, n) => a + (n.xpReward || 0), 0),
      xpTotal: nodes.reduce((a, n) => a + (n.xpReward || 0), 0),
      crossLinks: s.engine ? 0 : nodes.reduce((a, n) => a + n.crossRequires.length, 0),
    });
  }
  return rows.sort((a, b) => a.order - b.order);
}

/**
 * The whole Nexus as one web, light enough to send in one response: every
 * subject (with its domain, so the client can group them) and per node only
 * what the web draws: name, zone, state, progress and prerequisite links.
 * Where things sit is computed by the client (the lattice is deterministic);
 * descriptions, PYQ pools and the rest load per node from
 * /api/nexus/node/:subject/:id.
 *
 * Node state `s`: 0 locked, 1 open, 2 mastered.
 */
function webPayload(reg, dsa, computed) {
  const clusters = [];
  for (const [sid, s] of reg.subjects) {
    const data = s.engine === "dsa" ? dsa : computed.get(sid);
    if (!data) continue;
    const crossOf = new Map((s.doc?.nodes || []).map((d) => [d.id, (d.requires || []).filter((r) => r.includes(":") && reg.names.has(r))]));
    clusters.push({
      id: sid,
      name: s.meta.name,
      short: s.meta.short,
      domain: s.meta.domain,
      order: s.meta.order ?? 99,
      engine: s.engine || null,
      zones: data.zones.map((z) => ({
        level: z.level,
        name: z.name,
        color: z.color,
        locked: z.locked,
        current: z.current,
        completed: z.completed,
        nodeCount: z.nodeCount,
        nodesCompleted: z.nodesCompleted,
        zoneProgress: z.zoneProgress,
      })),
      nodes: data.nodes.map((n) => {
        const out = {
          id: n.id,
          n: n.name,
          z: n.zone,
          p: n.progress,
          s: n.completed ? 2 : n.unlocked ? 1 : 0,
          req: n.requires,
          xp: n.xpReward,
          c: s.engine === "dsa" ? `${n.solved}/${n.target}` : countLabel(n),
        };
        const cross = crossOf.get(n.id) || [];
        if (cross.length) out.cx = cross;
        if (n.kind && n.kind !== "concept") out.k = n.kind;
        return out;
      }),
    });
  }
  return { clusters };
}

/** The short count under a node (mirrors the client's nodeCountLabel). */
function countLabel(n) {
  const m = n.metric;
  if (m?.pyq) return `${Math.min(m.pyq.correct, m.pyq.target)}/${m.pyq.target} PYQs`;
  if (m?.lessons) return `${m.lessons.done}/${m.lessons.total} lesson${m.lessons.total === 1 ? "" : "s"}`;
  return n.kind === "project" ? "project" : `${n.progress}%`;
}

module.exports = {
  webPayload,
  subjectMeta,
  readOutlines,
  validateOutlines,
  layoutSubject,
  loadRegistry,
  nodePools,
  computeSubjects,
  dsaCrossUnlocks,
  subjectSummaries,
  gradientHex,
};
