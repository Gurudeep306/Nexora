#!/usr/bin/env node
/*
 * GATE Notes content pipeline: content/gate-notes → src/gate/notes.
 *
 *   npm run notes:build                     production build (published lessons only)
 *   node scripts/build-gate-notes.js --drafts   dev build: draft / review / needs_review allowed
 *   node scripts/build-gate-notes.js --check    verify only: exit 1 if anything is invalid or
 *                                               the committed JSON is out of date
 *
 * Source layout:
 *
 *   content/gate-notes/<subject>/_meta.json             title, order, icon, color, description, hidden
 *   content/gate-notes/<subject>/NN-chapter/_meta.json  optional { title, summary }
 *   content/gate-notes/<subject>/NN-chapter/NN-lesson.md   YAML frontmatter + Markdown + KaTeX + :::blocks
 *   content/gate-notes/<subject>/NN-chapter/practice.json  our own questions for that chapter
 *   content/gate-notes/<subject>/NN-chapter/pyq-map.json   PYQ → lesson blocks it tests (optional;
 *                                                       :::pyq{id tests="a,b"} embeds count too)
 *   content/gate-notes/<subject>/viz/<name>.json        Nexora Viz scene specs
 *   content/gate-notes/<subject>/[NN-chapter/]_name.md  internal planning notes (_outline.md, _plan.md): skipped
 *
 * Output: src/gate/notes/<subject>.json (lesson tree, pre-parsed AST per
 * lesson, practice questions, viz specs), src/gate/notes/_search.json and
 * the PYQ coverage map src/gate/notes/_coverage.json (with a readable
 * content/gate-notes/<subject>/_coverage.md). A subject whose _meta.json
 * says "status": "published" fails the build unless every PYQ in its scope
 * maps to blocks that exist; draft subjects only warn.
 * Lesson `sources` are validated but never written out.
 *
 * Every problem is reported as file:line: message, and any error exits 1.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { createRequire } = require("module");

const ROOT = path.join(__dirname, "..");
const CLIENT = path.join(ROOT, "client");
const DEFAULTS = {
  content: path.join(ROOT, "content", "gate-notes"),
  out: path.join(ROOT, "src", "gate", "notes"),
  questions: path.join(ROOT, "src", "gate", "questions.json"),
};

/* ── The block vocabulary ─────────────────────────────────────────────── */

// Live Labs the reader can render (keep in step with client/src/gate/notes/labs/index.ts).
const LABS = ["gate-bench"];
// Attribute kinds: 'text' (any short string), 'ref' (an id resolved later), or a list of allowed values.
const BLOCKS = {
  intuition: { attrs: { title: "text" } },
  definition: { attrs: { term: "text" } },
  theorem: { attrs: { name: "text" } },
  proof: { attrs: { of: "text", open: ["true", "false"] } },
  derivation: { attrs: { of: "text" } },
  example: { attrs: { level: ["easy", "medium", "gate"], title: "text" } },
  check: { attrs: { title: "text" } },
  // Worked-example steps: :::step{why="…"} inside :::example, then a final :::answer.
  step: { attrs: { why: "long" } },
  answer: { attrs: {} },
  trick: { attrs: { title: "text" } },
  trap: { attrs: { title: "text" } },
  pyq: { attrs: { id: "ref", tests: "long" }, required: ["id"], leaf: true },
  practice: { attrs: { id: "ref" }, required: ["id"], leaf: true },
  viz: { attrs: { spec: "ref", mode: ["animate", "static"], caption: "text" }, required: ["spec"], leaf: true },
  // Interactive Live Labs (client/src/gate/notes/labs): :::lab{#id lab="gate-bench" tab="bench"}.
  lab: { attrs: { lab: LABS, tab: ["bench", "challenge", "sets"], title: "text" }, required: ["lab"], leaf: true },
  table: { attrs: { title: "text" } },
  summary: { attrs: { title: "text" } },
  note: { attrs: { title: "text" } },
  aside: { attrs: { title: "text" } },
};
const DEPTHS = ["quick", "standard", "deep"];
// Inline :name[text] directives.
const INLINE = { key: { attrs: {} } };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_RE = /^[a-z][a-z0-9-]{0,47}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Internal planning files (_outline.md, _plan.md) may sit beside the content; the build skips them.
const PLANNING_FILE_RE = /^_[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const STATUSES = ["draft", "review", "published"];
const DIFFICULTIES = ["basic", "core", "advanced"];
const COLOR_TOKENS = ["accent", "info", "success", "warning", "danger", "syntax-keyword", "syntax-function", "syntax-type", "syntax-string", "syntax-number"];

/* ── Small helpers ────────────────────────────────────────────────────── */

const splitList = (v) =>
  String(v || "")
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
const rel = (f) => {
  const r = path.relative(ROOT, f);
  return (r.startsWith("..") ? f : r).split(path.sep).join("/");
};
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v, max = 200) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const strList = (v, maxItems = 50, maxLen = 200) => Array.isArray(v) && v.length <= maxItems && v.every((s) => isStr(s, maxLen));
const titleCase = (slug) => slug.replace(/-/g, " ").replace(/\b\w/, (c) => c.toUpperCase());

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "section"
  );
}

/** Line (1-based) of the first match of `re` in `text`, or 1. */
function lineOf(text, re) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => re.test(l));
  return i >= 0 ? i + 1 : 1;
}

function readJson(file, report) {
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (e) {
    report.error(file, 1, `cannot read: ${e.message}`);
    return null;
  }
  try {
    return { raw, value: JSON.parse(raw) };
  } catch (e) {
    const m = /position (\d+)/.exec(e.message);
    const line = m ? raw.slice(0, Number(m[1])).split("\n").length : 1;
    report.error(file, line, `invalid JSON: ${e.message}`);
    return null;
  }
}

function makeReport() {
  const errors = [];
  const warnings = [];
  const fmt = (file, line, msg) => `${rel(file)}:${line || 1}: ${msg}`;
  return {
    errors,
    warnings,
    error: (file, line, msg) => errors.push(fmt(file, line, msg)),
    warn: (file, line, msg) => warnings.push(fmt(file, line, msg)),
  };
}

/* ── Directive fences: balanced, and nested ones use shorter fences ───── */

/**
 * remark-directive silently runs an unclosed ::: container to the end of the
 * file, and a same-length fence inside a container closes the wrong block.
 * Scan the raw lines (outside code fences and $$ maths) and report both.
 */
function checkFences(src, file, report) {
  const lines = src.split("\n");
  const stack = [];
  let code = null;
  let math = false;
  lines.forEach((line, i) => {
    const n = i + 1;
    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (code) {
      if (fence && fence[1][0] === code[0] && fence[1].length >= code.length && !line.trim().slice(fence[1].length).trim()) code = null;
      return;
    }
    if (fence) {
      code = fence[1];
      return;
    }
    if (/^\s{0,3}\$\$/.test(line)) {
      const rest = line.trim().slice(2);
      if (!math && rest.includes("$$")) return; // one-line $$…$$
      math = !math;
      return;
    }
    if (math) return;
    const open = /^\s{0,3}(:{3,})([a-zA-Z][\w-]*)/.exec(line);
    if (open) {
      const parent = stack[stack.length - 1];
      if (parent && open[1].length >= parent.len) {
        report.error(
          file,
          n,
          `:::${open[2]} is nested inside ${":".repeat(parent.len)}${parent.name} (line ${parent.line}) with a fence of the same length — give the outer block more colons (${":".repeat(open[1].length + 1)}${parent.name})`,
        );
      }
      stack.push({ len: open[1].length, name: open[2], line: n });
      return;
    }
    const close = /^\s{0,3}(:{3,})\s*$/.exec(line);
    if (close) {
      const top = stack[stack.length - 1];
      if (!top) return report.error(file, n, "closing ::: without an open block");
      if (close[1].length < top.len) return report.error(file, n, `closing fence ${close[1]} is shorter than ${":".repeat(top.len)}${top.name} (line ${top.line})`);
      stack.pop();
    }
  });
  if (code) report.error(file, lines.length, "unclosed code fence");
  if (math) report.error(file, lines.length, "unclosed $$ maths block");
  for (const b of stack) report.error(file, b.line, `:::${b.name} is never closed`);
}

/* ── Markdown (mdast) → compact, render-ready AST ─────────────────────── */
/*
  Block nodes:  { t: 'h', d, id, c } | { t: 'p', c } | { t: 'ul'|'ol', start?, tight, c: li[] }
                { t: 'li', checked?, c } | { t: 'quote', c } | { t: 'hr' } | { t: 'pre', lang, v }
                { t: 'math', v } | { t: 'table', align, c: tr[] } | { t: 'tr', c: td[] } | { t: 'td', c }
                { t: 'block', name, id, depth, attrs, label?, c, line }
  Inline nodes: "text" | { t: 'em'|'strong'|'del'|'key', c } | { t: 'code', v } | { t: 'im', v }
                { t: 'a', href, c } | { t: 'img', src, alt } | { t: 'br' }
*/

class Compiler {
  constructor({ file, src, report, katex, allowBlocks = true }) {
    this.file = file;
    this.src = src;
    this.report = report;
    this.katex = katex;
    this.allowBlocks = allowBlocks;
    this.headings = [];
    this.blocks = [];
    this.ids = new Map(); // id → line
    this.counters = {};
    this.links = []; // { node, href, line } resolved after every lesson is parsed
    this.pyqs = [];
    this.practice = [];
    this.viz = [];
    this.text = [];
  }

  err(node, msg) {
    this.report.error(this.file, node?.position?.start?.line, msg);
  }

  claimId(id, node) {
    if (this.ids.has(id)) {
      this.err(node, `duplicate id "${id}" (first used on line ${this.ids.get(id)})`);
      return false;
    }
    this.ids.set(id, node?.position?.start?.line || 1);
    return true;
  }

  tex(node, display) {
    const v = node.value;
    if (!v || !v.trim()) return this.err(node, "empty maths");
    if (!this.katex) return;
    try {
      this.katex.renderToString(v, { displayMode: display, throwOnError: true, strict: "ignore" });
    } catch (e) {
      this.err(node, `KaTeX cannot parse ${display ? "$$…$$" : "$…$"}: ${String(e.message).replace(/^KaTeX parse error: /, "")}`);
    }
  }

  blocksOf(children) {
    const out = [];
    for (const n of children || []) {
      const x = this.block(n);
      if (x) out.push(x);
    }
    return out;
  }

  inlineOf(children) {
    const out = [];
    for (const n of children || []) {
      const x = this.inline(n);
      if (x === null || x === undefined) continue;
      // Merge adjacent strings (restored text directives split them).
      if (typeof x === "string" && typeof out[out.length - 1] === "string") out[out.length - 1] += x;
      else out.push(x);
    }
    return out;
  }

  plain(nodes) {
    return (nodes || [])
      .map((n) => (typeof n === "string" ? n : n.v !== undefined ? n.v : this.plain(n.c)))
      .join("");
  }

  block(n) {
    switch (n.type) {
      case "heading": {
        if (n.depth === 1) this.err(n, "use ## for sections — the lesson title comes from the frontmatter");
        if (n.depth > 4) this.err(n, "headings go down to #### at most");
        const c = this.inlineOf(n.children);
        const text = this.plain(c).trim();
        let id = slugify(text);
        for (let k = 2; this.ids.has(id); k++) id = `${slugify(text)}-${k}`;
        this.claimId(id, n);
        if (n.depth <= 3) this.headings.push({ id, text, level: n.depth });
        this.text.push(text);
        return { t: "h", d: n.depth, id, c };
      }
      case "paragraph": {
        const c = this.inlineOf(n.children);
        this.text.push(this.plain(c));
        return { t: "p", c };
      }
      case "list":
        return {
          t: n.ordered ? "ol" : "ul",
          ...(n.ordered && n.start != null && n.start !== 1 ? { start: n.start } : {}),
          tight: !n.spread && !(n.children || []).some((li) => li.spread),
          c: (n.children || []).map((li) => ({ t: "li", ...(typeof li.checked === "boolean" ? { checked: li.checked } : {}), c: this.blocksOf(li.children) })),
        };
      case "blockquote":
        return { t: "quote", c: this.blocksOf(n.children) };
      case "thematicBreak":
        return { t: "hr" };
      case "code":
        if (n.lang === "math") {
          this.tex(n, true);
          return { t: "math", v: n.value };
        }
        return { t: "pre", ...(n.lang ? { lang: n.lang } : {}), v: n.value };
      case "math":
        this.tex(n, true);
        this.text.push(n.value);
        return { t: "math", v: n.value };
      case "table":
        return {
          t: "table",
          align: n.align || [],
          c: (n.children || []).map((row) => ({ t: "tr", c: (row.children || []).map((cell) => ({ t: "td", c: this.inlineOf(cell.children) })) })),
        };
      case "containerDirective":
      case "leafDirective":
        return this.directive(n);
      case "html":
        this.err(n, "raw HTML is not allowed in lessons — use Markdown or a :::block");
        return null;
      case "definition":
        this.err(n, "reference-style link definitions are not supported — write links inline");
        return null;
      case "footnoteDefinition":
        this.err(n, "footnotes are not supported — use :::aside for side remarks");
        return null;
      case "yaml":
      case "toml":
        this.err(n, "frontmatter must be the first thing in the file");
        return null;
      default:
        this.err(n, `unsupported Markdown element: ${n.type}`);
        return null;
    }
  }

  inline(n) {
    switch (n.type) {
      case "text":
        return n.value;
      case "emphasis":
        return { t: "em", c: this.inlineOf(n.children) };
      case "strong":
        return { t: "strong", c: this.inlineOf(n.children) };
      case "delete":
        return { t: "del", c: this.inlineOf(n.children) };
      case "inlineCode":
        return { t: "code", v: n.value };
      case "inlineMath":
        this.tex(n, false);
        return { t: "im", v: n.value };
      case "break":
        return { t: "br" };
      case "link": {
        const node = { t: "a", href: n.url, c: this.inlineOf(n.children) };
        this.linkTarget(node, n);
        return node;
      }
      case "image":
        if (!/^\/[\w\-./]+$/.test(n.url || "")) {
          this.err(n, "images must be site paths (/gate-fig/…); draw diagrams with :::viz");
          return null;
        }
        if (!n.alt || !n.alt.trim()) this.err(n, "images need alt text");
        return { t: "img", src: n.url, alt: n.alt || "" };
      case "textDirective":
        return this.textDirective(n);
      case "html":
        this.err(n, "raw HTML is not allowed in lessons");
        return null;
      case "footnoteReference":
        this.err(n, "footnotes are not supported");
        return null;
      case "linkReference":
      case "imageReference":
        // "[x]" with no definition: plain text, as the author wrote it.
        return this.src.slice(n.position.start.offset, n.position.end.offset);
      default:
        this.err(n, `unsupported inline element: ${n.type}`);
        return null;
    }
  }

  linkTarget(node, n) {
    const href = node.href || "";
    const line = n.position?.start?.line;
    if (/^https?:\/\//.test(href)) return;
    if (/^(lesson:|#|\/gate\/notes\/)/.test(href)) {
      this.links.push({ node, href, line });
      return;
    }
    if (/^\/[\w\-./?=&%,]*$/.test(href)) return; // another page of the site
    this.err(n, `link "${href}" must be https://…, a site path, #anchor or lesson:<lesson-id>`);
  }

  textDirective(n) {
    const def = INLINE[n.name];
    const hasLabel = (n.children || []).length > 0;
    const hasAttrs = n.attributes && Object.keys(n.attributes).length > 0;
    const raw = this.src.slice(n.position.start.offset, n.position.end.offset);
    // "10:30" or "a:b" in prose parse as directives; give them back as text.
    if (!def && !hasLabel && !hasAttrs && !/\[|\{/.test(raw.slice(1 + n.name.length))) return raw;
    if (!def) {
      this.err(n, `unknown inline directive :${n.name} (known: ${Object.keys(INLINE).map((k) => `:${k}[…]`).join(", ")}; write \\: for a literal colon)`);
      return raw;
    }
    if (hasAttrs) this.err(n, `:${n.name} takes no attributes`);
    if (!hasLabel) this.err(n, `:${n.name} needs text: :${n.name}[term]`);
    return { t: n.name, c: this.inlineOf(n.children) };
  }

  directive(n, parent = null) {
    const name = n.name;
    const def = BLOCKS[name];
    if (!this.allowBlocks) {
      this.err(n, `:::${name} blocks are not allowed here`);
      return null;
    }
    if (!def) {
      this.err(n, `unknown block :::${name} (known: ${Object.keys(BLOCKS).join(", ")})`);
      return null;
    }
    const attrs = { ...(n.attributes || {}) };
    const line = n.position?.start?.line || 1;
    if ("class" in attrs) {
      this.err(n, `:::${name}: classes (.name) are not supported`);
      delete attrs.class;
    }
    // On :::pyq / :::practice, id names the question; the block's own id is derived from it.
    const idIsRef = def.attrs.id === "ref";
    let id = idIsRef ? undefined : attrs.id;
    if (!idIsRef) delete attrs.id;
    const depth = attrs.depth ?? "standard";
    delete attrs.depth;
    if (!DEPTHS.includes(depth)) this.err(n, `:::${name}: depth must be ${DEPTHS.join(" | ")}`);
    for (const [k, v] of Object.entries(attrs)) {
      const kind = def.attrs[k];
      if (!kind) {
        this.err(n, `:::${name}: unknown attribute "${k}" (allowed: ${["id", "depth", ...Object.keys(def.attrs)].join(", ")})`);
        continue;
      }
      if (Array.isArray(kind) && !kind.includes(v)) this.err(n, `:::${name}: ${k} must be ${kind.join(" | ")} (got "${v}")`);
      if (kind !== "text" && !Array.isArray(kind) && !String(v).trim()) this.err(n, `:::${name}: ${k} needs a value`);
      if (kind === "text" && String(v).length > 120) this.err(n, `:::${name}: ${k} is too long`);
      if (kind === "long" && String(v).length > 400) this.err(n, `:::${name}: ${k} is too long (≤ 400 characters)`);
      if (kind === "long" && !String(v).trim()) this.err(n, `:::${name}: ${k} needs text`);
    }
    for (const k of def.required || []) if (!attrs[k]) this.err(n, `:::${name} needs ${k}="…"`);

    if (id !== undefined) {
      if (!ID_RE.test(id)) this.err(n, `:::${name}: id "${id}" must be lower-case letters, digits and dashes`);
      this.claimId(id, n);
    } else if (idIsRef && attrs.id && ID_RE.test(`${name}-${attrs.id}`.toLowerCase())) {
      id = `${name}-${attrs.id}`.toLowerCase();
      while (this.ids.has(id)) id += "x";
      this.ids.set(id, line);
    } else {
      this.counters[name] = (this.counters[name] || 0) + 1;
      id = `${name}-${this.counters[name]}`;
      while (this.ids.has(id)) id += "x";
      this.ids.set(id, line);
    }

    let children = n.children || [];
    let label;
    if (children[0]?.type === "paragraph" && children[0].data?.directiveLabel) {
      label = this.inlineOf(children[0].children);
      children = children.slice(1);
    }

    if (name === "answer" && parent !== "check" && parent !== "example") this.err(n, ":::answer belongs inside a :::check or :::example block");
    if (name === "step" && parent !== "example") this.err(n, ":::step belongs inside an :::example block");
    if (def.leaf && children.length) this.err(n, `:::${name} takes no content — write ::${name}{…} or close it straight away`);

    const c = [];
    for (const child of children) {
      if (child.type === "containerDirective" || child.type === "leafDirective") {
        const x = this.directive(child, name);
        if (x) c.push(x);
      } else {
        const x = this.block(child);
        if (x) c.push(x);
      }
    }
    if (name === "check") {
      const answers = c.filter((x) => x.t === "block" && x.name === "answer");
      if (answers.length !== 1) this.err(n, `:::check needs exactly one nested :::answer (found ${answers.length})`);
      else if (c[c.length - 1] !== answers[0]) this.err(n, ":::answer must be the last thing in its :::check");
    }

    if (name === "example") {
      const steps = c.filter((x) => x.t === "block" && x.name === "step");
      const answers = c.filter((x) => x.t === "block" && x.name === "answer");
      if (answers.length > 1) this.err(n, `:::example has ${answers.length} :::answer blocks (at most one)`);
      if (steps.length && answers.length !== 1) this.err(n, ":::example with steps needs a final :::answer");
      if (answers.length && c[c.length - 1] !== answers[0]) this.err(n, ":::answer must be the last thing in its :::example");
      const firstStep = c.findIndex((x) => x.t === "block" && x.name === "step");
      if (firstStep >= 0 && c.slice(firstStep).some((x) => !(x.t === "block" && (x.name === "step" || x.name === "answer"))))
        this.err(n, "in an :::example, put the problem first, then only :::step blocks and the :::answer");
      if (steps.length && firstStep === 0) this.err(n, ":::example needs the problem statement before its first :::step");
    }

    const node = { t: "block", name, id, depth, attrs, ...(label ? { label } : {}), c, line };
    const blockTitle = label ? this.plain(label) : attrs.term || attrs.name || attrs.title || attrs.of || "";
    this.blocks.push({ id, name, depth, line, title: String(blockTitle).trim() });
    if (name === "pyq" && attrs.id) this.pyqs.push({ id: attrs.id, line, tests: splitList(attrs.tests) });
    if (name === "practice" && attrs.id) this.practice.push({ id: attrs.id, line });
    if (name === "viz" && attrs.spec) this.viz.push({ spec: attrs.spec, line, node });
    if (label) this.text.push(this.plain(label));
    return node;
  }
}

/* ── Frontmatter ─────────────────────────────────────────────────────── */

const FRONTMATTER = {
  id: (v) => (typeof v === "string" && SLUG_RE.test(v) ? null : "must be a slug (lower-case words joined by -)"),
  subject: (v) => (isStr(v, 40) ? null : "must be the subject id"),
  chapter: (v) => (isStr(v, 60) ? null : "must be the chapter slug"),
  title: (v) => (isStr(v, 120) ? null : "must be a title (≤ 120 characters)"),
  order: (v) => (Number.isInteger(v) && v >= 1 && v <= 99 ? null : "must be an integer 1–99"),
  prerequisites: (v) => (strList(v, 20, 100) || (Array.isArray(v) && v.length === 0) ? null : "must be a list of lesson ids"),
  pyq_topics: (v) => (strList(v, 20, 60) || (Array.isArray(v) && v.length === 0) ? null : "must be a list of subject/topic keys"),
  est_minutes: (v) => (Number.isInteger(v) && v >= 1 && v <= 240 ? null : "must be minutes, 1–240"),
  difficulty: (v) => (DIFFICULTIES.includes(v) ? null : `must be ${DIFFICULTIES.join(" | ")}`),
  status: (v) => (STATUSES.includes(v) ? null : `must be ${STATUSES.join(" | ")}`),
  needs_review: (v) => (typeof v === "boolean" ? null : "must be true or false"),
  sources: (v) => (strList(v, 50, 300) || (Array.isArray(v) && v.length === 0) ? null : "must be a list of strings"),
  updated: (v) => (typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(v)) ? null : "must be a date YYYY-MM-DD (quote it)"),
};

function splitFrontmatter(src) {
  if (!src.startsWith("---\n") && !src.startsWith("---\r\n")) return null;
  const lines = src.split("\n");
  const end = lines.findIndex((l, i) => i > 0 && /^---\s*$/.test(l));
  if (end < 0) return { yaml: null, body: src, end: 0 };
  const yaml = lines.slice(1, end).join("\n");
  // Blank the frontmatter so Markdown positions are file lines.
  const body = lines.map((l, i) => (i <= end ? "" : l)).join("\n");
  return { yaml, body, end };
}

/* ── Practice questions ──────────────────────────────────────────────── */

const PRACTICE_KEYS = new Set(["id", "type", "text", "options", "answer", "solution", "concept", "common_wrong", "blocks", "source", "marks"]);

function compilePractice(file, raw, list, ctx) {
  const { report, katex, subject, chapterNum } = ctx;
  const out = [];
  const seen = new Set();
  if (!Array.isArray(list)) {
    report.error(file, 1, "practice.json must be a list of questions");
    return out;
  }
  list.forEach((q, i) => {
    const line = isObj(q) && typeof q.id === "string" ? lineOf(raw, new RegExp(`"id"\\s*:\\s*"${q.id.replace(/[-]/g, "\\-")}"`)) : 1;
    const err = (msg) => report.error(file, line, `${isObj(q) && q.id ? q.id : `question ${i + 1}`}: ${msg}`);
    if (!isObj(q)) return err("must be an object");
    for (const k of Object.keys(q)) if (!PRACTICE_KEYS.has(k)) err(`unknown field "${k}"`);
    const m = new RegExp(`^nx-${subject}-(\\d{2})-(\\d{2})-q(\\d{2})$`).exec(q.id || "");
    if (!m) return err(`id must look like nx-${subject}-${chapterNum}-<lesson NN>-q<NN>`);
    if (m[1] !== chapterNum) err(`id names chapter ${m[1]} but lives in chapter ${chapterNum}`);
    if (seen.has(q.id)) err("duplicate id");
    seen.add(q.id);
    if (!["MCQ", "MSQ", "NAT"].includes(q.type)) err("type must be MCQ | MSQ | NAT");
    if (q.source !== "nexora") err('source must be "nexora"');
    if (!isStr(q.text, 4000)) err("text is required");
    if (!isStr(q.concept, 200)) err("concept is required (the idea this question tests)");
    if (q.marks !== undefined && ![1, 2].includes(q.marks)) err("marks must be 1 or 2");

    const md = (s, what) => {
      const c = new Compiler({ file, src: s, report: { error: (_f, _l, msg) => err(`${what}: ${msg}`), warn() {} }, katex, allowBlocks: false });
      const tree = ctx.parse(s);
      const body = c.blocksOf(tree.children);
      for (const l of c.links) if (!/^\/gate\//.test(l.href)) err(`${what}: lesson links are not supported in practice questions`);
      return body;
    };

    const letters = [];
    let options;
    if (q.type === "MCQ" || q.type === "MSQ") {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) err("options must list 2–6 choices");
      else {
        options = q.options.map((o, k) => {
          const l = String.fromCharCode(65 + k);
          if (!isObj(o) || o.l !== l || !isStr(o.t, 500)) err(`options[${k}] must be { "l": "${l}", "t": "…" }`);
          letters.push(l);
          return { l, c: md(String(o?.t ?? ""), `option ${l}`) };
        });
      }
    } else if (q.options !== undefined) err("NAT questions have no options");

    const isNum = (v) => typeof v === "number" && Number.isFinite(v);
    if (q.type === "MCQ" && !letters.includes(q.answer)) err("answer must be one option letter");
    if (q.type === "MSQ" && !(Array.isArray(q.answer) && q.answer.length >= 1 && q.answer.every((a) => letters.includes(a)) && new Set(q.answer).size === q.answer.length))
      err("answer must be a list of distinct option letters");
    if (q.type === "NAT" && !(isNum(q.answer) || (Array.isArray(q.answer) && q.answer.length === 2 && q.answer.every(isNum) && q.answer[0] <= q.answer[1])))
      err("answer must be a number or a [min, max] range");

    if (!Array.isArray(q.solution) || q.solution.length < 1 || !q.solution.every((s) => isStr(s, 3000))) err("solution must be a list of step strings");
    if (!Array.isArray(q.common_wrong)) err("common_wrong must be a list (may be empty)");
    const wrong = (Array.isArray(q.common_wrong) ? q.common_wrong : []).map((w, k) => {
      if (!isObj(w) || w.answer === undefined || !isStr(w.why, 1000)) err(`common_wrong[${k}] must be { answer, why }`);
      else if (q.type !== "NAT" && ![w.answer].flat().every((a) => letters.includes(a))) err(`common_wrong[${k}].answer must be option letter(s)`);
      return { answer: w?.answer, why: md(String(w?.why ?? ""), `common_wrong[${k}].why`) };
    });
    if (!strList(q.blocks, 20, 48) && !(Array.isArray(q.blocks) && q.blocks.length === 0)) err("blocks must be a list of lesson block ids");

    out.push({
      id: q.id,
      lessonNum: m[2],
      line,
      blocks: Array.isArray(q.blocks) ? q.blocks : [],
      compiled: {
        id: q.id,
        type: q.type,
        ...(q.marks ? { marks: q.marks } : {}),
        text: md(String(q.text ?? ""), "text"),
        ...(options ? { options } : {}),
        answer: q.answer,
        solution: (Array.isArray(q.solution) ? q.solution : []).map((s, k) => md(String(s), `solution[${k}]`)),
        concept: q.concept,
        common_wrong: wrong,
        blocks: Array.isArray(q.blocks) ? q.blocks : [],
        source: "nexora",
      },
    });
  });
  return out;
}

/* ── The build ───────────────────────────────────────────────────────── */

async function loadTools() {
  let parse, parseYaml, validateVizSpec, katex, iconNames;
  try {
    ({ parseMarkdown: parse, parseYaml } = await import(pathToFileURL(path.join(CLIENT, "scripts", "notes-parse.mjs")).href));
    ({ validateVizSpec } = await import(pathToFileURL(path.join(CLIENT, "src", "viz", "schema.ts")).href));
    iconNames = new Set((await import(pathToFileURL(path.join(CLIENT, "src", "components", "icon", "names.ts")).href)).ICON_NAMES);
  } catch (e) {
    throw new Error(`cannot load the Markdown tooling (run npm ci --prefix client): ${e.message}`);
  }
  try {
    katex = createRequire(path.join(CLIENT, "package.json"))("katex");
  } catch {
    katex = null;
  }
  return { parse, parseYaml, validateVizSpec, katex, iconNames };
}

function loadBank(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const qs = Array.isArray(raw) ? raw : raw.questions || [];
  return {
    ids: new Set(qs.map((q) => q.id)),
    byId: new Map(qs.map((q) => [q.id, q])),
    questions: qs,
    subjects: new Set(qs.map((q) => q.subject).filter(Boolean)),
    topics: new Set(qs.filter((q) => q.subject && q.topic).map((q) => `${q.subject}/${q.topic}`)),
  };
}

const listDir = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
};

/**
 * Validate and compile everything. Returns { errors, warnings, outputs }
 * where outputs maps file names (relative to `out`) to their JSON text.
 */
async function build(opts = {}) {
  const o = { ...DEFAULTS, drafts: false, ...opts };
  const report = makeReport();
  const tools = await loadTools();
  if (!tools.katex) report.warnings.push("KaTeX not found (run npm ci --prefix client) — formulas were not checked");
  const bank = loadBank(o.questions);

  const subjects = [];
  for (const ent of listDir(o.content)) {
    if (!ent.isDirectory() || ent.name.startsWith("_") || ent.name.startsWith(".")) continue;
    const s = loadSubject(path.join(o.content, ent.name), ent.name, { ...tools, report, bank, drafts: o.drafts });
    if (s) subjects.push(s);
  }

  // Every lesson of every subject, for links and prerequisites.
  const lessonIndex = new Map(); // "subject/lesson" → lesson
  for (const s of subjects) for (const l of s.lessons) lessonIndex.set(`${s.id}/${l.fm.id}`, l);
  const practiceIndex = new Map(); // question id → { subject, q }
  for (const s of subjects) for (const q of s.practice) practiceIndex.set(q.id, { subject: s, q });

  const resolveLesson = (ref, fromSubject) => {
    const [a, b] = String(ref).split("/");
    const key = b === undefined ? `${fromSubject}/${a}` : `${a}/${b}`;
    return lessonIndex.get(key) || null;
  };

  for (const s of subjects) {
    for (const l of s.lessons) {
      const { file, fm, c } = l;
      // Links.
      for (const link of c.links) {
        let target = link.href;
        let anchor = "";
        const hash = target.indexOf("#");
        if (hash >= 0) {
          anchor = target.slice(hash + 1);
          target = target.slice(0, hash);
        }
        let dest = l;
        if (target.startsWith("lesson:")) dest = resolveLesson(target.slice(7), s.id);
        else if (target.startsWith("/gate/notes/")) {
          const parts = target.slice("/gate/notes/".length).split("/").filter(Boolean);
          if (parts.length === 1) {
            if (!subjects.some((x) => x.id === parts[0])) report.error(file, link.line, `link to unknown subject "${parts[0]}"`);
            continue;
          }
          dest = parts.length === 2 ? resolveLesson(`${parts[0]}/${parts[1]}`, s.id) : null;
        }
        if (!dest) {
          report.error(file, link.line, `link "${link.href}" points at no lesson`);
          continue;
        }
        if (anchor && !dest.c.ids.has(anchor)) report.error(file, link.line, `link "${link.href}": no heading or block "${anchor}" in ${dest.subject}/${dest.fm.id}`);
        link.node.href = `/gate/notes/${dest.subject}/${dest.fm.id}${anchor ? `#${anchor}` : ""}`;
      }
      // Prerequisites.
      l.prereqs = [];
      for (const ref of Array.isArray(fm.prerequisites) ? fm.prerequisites : []) {
        const dest = resolveLesson(ref, s.id);
        if (!dest) report.error(file, l.fmLine("prerequisites"), `prerequisite "${ref}" is not a lesson`);
        else if (dest === l) report.error(file, l.fmLine("prerequisites"), "a lesson cannot be its own prerequisite");
        else l.prereqs.push(dest);
      }
      // Embeds.
      for (const p of c.pyqs) if (!bank.ids.has(p.id)) report.error(file, p.line, `:::pyq id "${p.id}" is not in src/gate/questions.json`);
      for (const p of c.practice) if (!practiceIndex.has(p.id)) report.error(file, p.line, `:::practice id "${p.id}" is not in any practice.json`);
      for (const v of c.viz) {
        if (!s.viz.has(v.spec)) {
          report.error(file, v.line, `:::viz spec "${v.spec}" — no file content/gate-notes/${s.id}/viz/${v.spec}.json`);
          continue;
        }
        s.vizUsed.add(v.spec);
        if (!v.node.attrs.mode) v.node.attrs.mode = "animate";
      }
    }
    // Practice questions point at blocks of their own lesson.
    for (const q of s.practice) {
      const lesson = s.lessons.find((l) => l.chapterNum === q.chapterNum && l.lessonNum === q.lessonNum);
      if (!lesson) {
        report.error(q.file, q.line, `${q.id}: chapter ${q.chapterNum} has no lesson ${q.lessonNum}`);
        continue;
      }
      for (const b of q.blocks) if (!lesson.c.ids.has(b)) report.error(q.file, q.line, `${q.id}: block "${b}" is not in ${lesson.fm.id}`);
    }
    for (const name of s.viz.keys()) if (!s.vizUsed.has(name)) report.warn(path.join(s.dir, "viz", `${name}.json`), 1, "viz spec is not used by any lesson");
  }

  // PYQ coverage: every PYQ in a subject's scope → the lesson blocks that teach it.
  const coverage = {};
  const reports = new Map(); // absolute path → text (content/gate-notes/<subject>/_coverage.md)
  for (const s of subjects) {
    const strict = s.meta.status === "published";
    const flag = (file, line, msg) => (strict ? report.error(file, line, msg) : report.warn(file, line, msg));
    const links = new Map(); // pyq id → [{ lesson, tests, missing }]
    const add = (pyq, lesson, tests, file, line) => {
      const missing = tests.filter((b) => !lesson.c.ids.has(b));
      for (const b of missing) flag(file, line, `PYQ ${pyq}: block "${b}" is not in ${lesson.fm.id}`);
      if (!tests.length) flag(file, line, `PYQ ${pyq} is embedded but names no concept blocks — add tests="block-id,…" or a pyq-map.json entry`);
      const list = links.get(pyq) ?? [];
      const prev = list.find((x) => x.lesson === lesson);
      if (prev) {
        prev.tests = [...new Set([...prev.tests, ...tests])];
        prev.missing = [...new Set([...prev.missing, ...missing])];
      } else list.push({ lesson, tests: [...tests], missing });
      links.set(pyq, list);
    };
    for (const l of s.lessons) for (const p of l.c.pyqs) if (bank.ids.has(p.id)) add(p.id, l, p.tests, l.file, p.line);
    for (const e of s.pyqMap) {
      if (!bank.ids.has(e.id)) {
        report.error(e.file, e.line, `PYQ "${e.id}" is not in src/gate/questions.json`);
        continue;
      }
      const lesson = s.lessons.find((l) => l.fm.id === e.lesson && l.chapterId === e.chapterId);
      if (!lesson) {
        report.error(e.file, e.line, `PYQ ${e.id}: no lesson "${e.lesson}" in ${e.chapterId}`);
        continue;
      }
      add(e.id, lesson, e.tests, e.file, e.line);
    }

    const inScope = (q) => s.pyqScope.some((k) => (k.includes("/") ? `${q.subject}/${q.topic}` === k : q.subject === k));
    const scope = bank.questions.filter(inScope).map((q) => q.id).sort();
    const good = (id) => (links.get(id) ?? []).some((x) => x.tests.length > x.missing.length);
    const covered = scope.filter(good);
    const uncovered = scope.filter((id) => !good(id));
    const missingBlocks = [...links.entries()]
      .flatMap(([id, list]) => list.filter((x) => !x.tests.length || x.missing.length).map((x) => ({ id, lesson: x.lesson.fm.id, missing: x.missing, ...(x.tests.length ? {} : { none: true }) })))
      .sort((a, b) => a.id.localeCompare(b.id));
    const lessonsWithout = s.lessons.filter((l) => ![...links.values()].some((list) => list.some((x) => x.lesson === l))).map((l) => l.fm.id);
    if (uncovered.length) {
      const msg = `${uncovered.length} of ${scope.length} PYQs in scope (${s.pyqScope.join(", ") || "none"}) are not mapped to any lesson block — see content/gate-notes/${s.id}/_coverage.md`;
      flag(path.join(s.dir, "_meta.json"), 1, msg);
    }
    for (const l of s.lessons) {
      l.pyqLinks = [...links.entries()]
        .filter(([, list]) => list.some((x) => x.lesson === l))
        .map(([id, list]) => {
          const x = list.find((y) => y.lesson === l);
          const q = bank.byId.get(id);
          return { id, year: q.year, marks: q.marks ?? null, type: q.type, paper: q.paper, embedded: l.c.pyqs.some((p) => p.id === id), tests: x.tests.filter((b) => !x.missing.includes(b)) };
        })
        .sort((a, b) => (b.year || 0) - (a.year || 0) || a.id.localeCompare(b.id));
    }
    const byPyq = {};
    for (const [id, list] of [...links.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      byPyq[id] = list.map((x) => ({
        lesson: x.lesson.fm.id,
        title: x.lesson.fm.title,
        blocks: x.tests.filter((b) => !x.missing.includes(b)).map((b) => {
          const blk = x.lesson.c.blocks.find((y) => y.id === b);
          const h = x.lesson.c.headings.find((y) => y.id === b);
          return { id: b, name: blk ? blk.name : "heading", title: blk ? blk.title : h ? h.text : "" };
        }),
      }));
    }
    coverage[s.id] = {
      status: s.meta.status,
      hidden: s.meta.hidden,
      scope: s.pyqScope,
      total: scope.length,
      covered: covered.length,
      uncovered,
      missingBlocks,
      lessonsWithoutPyqs: lessonsWithout,
      byPyq,
    };
    reports.set(path.join(s.dir, "_coverage.md"), coverageMarkdown(s, coverage[s.id], bank));
  }

  // Prerequisite cycles.
  const state = new Map();
  const visit = (l, trail) => {
    if (state.get(l) === 2) return;
    if (state.get(l) === 1) {
      report.error(l.file, l.fmLine("prerequisites"), `prerequisite cycle: ${[...trail, l].map((x) => x.fm.id).join(" → ")}`);
      return;
    }
    state.set(l, 1);
    for (const p of l.prereqs || []) visit(p, [...trail, l]);
    state.set(l, 2);
  };
  for (const l of lessonIndex.values()) visit(l, []);

  // Output.
  const outputs = new Map();
  const search = [];
  for (const s of subjects.sort((a, b) => a.meta.order - b.meta.order || a.id.localeCompare(b.id))) {
    const practiceUsed = new Set();
    const lessons = {};
    for (const l of s.lessons) {
      for (const p of l.c.practice) practiceUsed.add(p.id);
      lessons[l.fm.id] = {
        id: l.fm.id,
        subject: s.id,
        chapter: l.chapterId,
        title: l.fm.title,
        order: l.fm.order,
        est_minutes: l.fm.est_minutes,
        difficulty: l.fm.difficulty,
        status: l.fm.status,
        ...(l.fm.needs_review ? { needs_review: true } : {}),
        updated: l.fm.updated,
        prerequisites: (l.prereqs || []).map((p) => ({ subject: p.subject, id: p.fm.id, title: p.fm.title })),
        pyq_topics: l.fm.pyq_topics || [],
        outline: l.c.headings,
        blocks: l.c.blocks.map((b) => ({ id: b.id, name: b.name, depth: b.depth, ...(b.title ? { title: b.title } : {}) })),
        pyqLinks: l.pyqLinks || [],
        pyqs: [...new Set(l.c.pyqs.map((p) => p.id))],
        practice: [...new Set(l.c.practice.map((p) => p.id))],
        viz: [...new Set(l.c.viz.map((v) => v.spec))],
        body: l.body,
      };
      search.push({
        s: s.id,
        l: l.fm.id,
        title: l.fm.title,
        chapter: s.chapters.find((ch) => ch.id === l.chapterId)?.title || "",
        headings: l.c.headings.map((h) => h.text),
        text: l.c.text.join(" ").replace(/\s+/g, " ").trim().slice(0, 6000),
        ...(s.meta.hidden ? { hidden: true } : {}),
      });
    }
    const practice = {};
    for (const q of s.practice) practice[q.id] = q.compiled;
    const viz = {};
    for (const name of [...s.vizUsed].sort()) viz[name] = s.viz.get(name);
    const doc = {
      version: 1,
      subject: { id: s.id, ...s.meta, coverage: { total: coverage[s.id].total, covered: coverage[s.id].covered } },
      chapters: s.chapters.map((ch) => ({
        id: ch.id,
        n: ch.n,
        title: ch.title,
        ...(ch.summary ? { summary: ch.summary } : {}),
        lessons: s.lessons.filter((l) => l.chapterId === ch.id).map((l) => l.fm.id),
      })),
      lessons,
      practice,
      viz,
    };
    outputs.set(`${s.id}.json`, `${JSON.stringify(doc)}\n`);
  }
  outputs.set("_search.json", `${JSON.stringify({ version: 1, entries: search })}\n`);
  outputs.set("_coverage.json", `${JSON.stringify({ version: 1, subjects: coverage })}\n`);
  return { errors: report.errors, warnings: report.warnings, outputs, reports };
}

function coverageMarkdown(s, cov, bank) {
  const label = (id) => {
    const q = bank.byId.get(id);
    return q ? `\`${id}\` (${q.year}, ${q.marks ?? "?"} mark${q.marks === 1 ? "" : "s"}, ${q.type}, ${q.topic || "no topic"})` : `\`${id}\``;
  };
  const lines = [
    `# PYQ coverage: ${s.meta.title}`,
    "",
    "Generated by `npm run notes:build` — do not edit.",
    "",
    `- Status: **${cov.status}**${cov.status === "published" ? " (the build fails on any gap)" : " (gaps are warnings until the subject is published)"}`,
    `- Scope: ${cov.scope.length ? cov.scope.map((k) => `\`${k}\``).join(", ") : "none"}`,
    `- Covered: **${cov.covered} / ${cov.total}** PYQs`,
    "",
    `## Covered (${cov.covered})`,
    "",
  ];
  const coveredIds = Object.keys(cov.byPyq).filter((id) => cov.byPyq[id].some((x) => x.blocks.length));
  for (const id of coveredIds) lines.push(`- ${label(id)} → ${cov.byPyq[id].filter((x) => x.blocks.length).map((x) => `${x.lesson}: ${x.blocks.map((b) => `#${b.id}`).join(", ")}`).join("; ")}`);
  if (!coveredIds.length) lines.push("_None yet._");
  lines.push("", `## Not mapped to any lesson block (${cov.uncovered.length})`, "");
  for (const id of cov.uncovered) lines.push(`- ${label(id)}`);
  if (!cov.uncovered.length) lines.push("_None._");
  lines.push("", `## Mapped, but concept blocks missing (${cov.missingBlocks.length})`, "");
  for (const m of cov.missingBlocks) lines.push(`- ${label(m.id)} in ${m.lesson}: ${m.none ? "no blocks named" : m.missing.map((b) => `#${b}`).join(", ")}`);
  if (!cov.missingBlocks.length) lines.push("_None._");
  lines.push("", `## Lessons with no PYQs (${cov.lessonsWithoutPyqs.length})`, "");
  for (const l of cov.lessonsWithoutPyqs) lines.push(`- ${l}`);
  if (!cov.lessonsWithoutPyqs.length) lines.push("_None._");
  return `${lines.join("\n")}\n`;
}

function loadSubject(dir, id, ctx) {
  const { report } = ctx;
  if (!SLUG_RE.test(id)) {
    report.error(dir, 1, `subject directory "${id}" must be a slug`);
    return null;
  }
  const metaFile = path.join(dir, "_meta.json");
  const metaJson = readJson(metaFile, report);
  if (!metaJson) return null;
  const m = metaJson.value;
  const mErr = (key, msg) => report.error(metaFile, lineOf(metaJson.raw, new RegExp(`"${key}"`)), `${key} ${msg}`);
  const allowedMeta = new Set(["title", "order", "icon", "color", "description", "hidden", "exam", "status", "pyq_scope"]);
  for (const k of Object.keys(m || {})) if (!allowedMeta.has(k)) mErr(k, "is not a known field");
  if (!isStr(m.title, 80)) mErr("title", "is required");
  if (!Number.isInteger(m.order) || m.order < 0 || m.order > 999) mErr("order", "must be an integer 0–999");
  if (!ctx.iconNames.has(m.icon)) mErr("icon", "must be an icon name from client/src/components/icon/names.ts");
  if (!COLOR_TOKENS.includes(m.color)) mErr("color", `must be a theme colour token: ${COLOR_TOKENS.join(" | ")}`);
  if (!isStr(m.description, 400)) mErr("description", "is required (≤ 400 characters)");
  if (m.hidden !== undefined && typeof m.hidden !== "boolean") mErr("hidden", "must be true or false");
  if (m.status !== undefined && !["draft", "published"].includes(m.status)) mErr("status", 'must be "draft" or "published"');
  if (m.pyq_scope !== undefined && !(strList(m.pyq_scope, 60, 60) || (Array.isArray(m.pyq_scope) && !m.pyq_scope.length))) mErr("pyq_scope", "must be a list of bank subject or subject/topic keys");
  for (const k of Array.isArray(m.pyq_scope) ? m.pyq_scope : []) {
    if (!(k.includes("/") ? ctx.bank.topics.has(k) : ctx.bank.subjects.has(k))) mErr("pyq_scope", `"${k}" is not a subject or subject/topic in the question bank`);
  }
  if (m.exam !== undefined && !(Array.isArray(m.exam) && m.exam.every((e) => ["CSE", "DA"].includes(e)))) mErr("exam", 'must be a list of "CSE" | "DA"');
  const meta = {
    title: m.title,
    order: m.order,
    icon: m.icon,
    color: m.color,
    description: m.description,
    hidden: !!m.hidden,
    exam: m.exam || ["CSE"],
    status: m.status === "published" ? "published" : "draft",
  };
  // Which bank PYQs this subject must teach: explicit, else the bank subject with the same id.
  const pyqScope = Array.isArray(m.pyq_scope) ? m.pyq_scope : ctx.bank.subjects.has(id) ? [id] : [];

  const subject = { id, dir, meta, pyqScope, chapters: [], lessons: [], practice: [], pyqMap: [], viz: new Map(), vizUsed: new Set() };

  // Viz specs.
  for (const ent of listDir(path.join(dir, "viz"))) {
    const file = path.join(dir, "viz", ent.name);
    const vm = /^([a-z0-9-]+)\.json$/.exec(ent.name);
    if (!ent.isFile() || !vm) {
      report.error(file, 1, "viz/ holds only <name>.json scene specs (lower-case, dashes)");
      continue;
    }
    const j = readJson(file, report);
    if (!j) continue;
    const problems = ctx.validateVizSpec(j.value);
    for (const p of problems) {
      const key = /(\w+)(?:\[\d+\])?:/.exec(p.split(":")[0].split(".").pop() + ":")?.[1];
      report.error(file, key ? lineOf(j.raw, new RegExp(`"${key}"`)) : 1, `viz: ${p}`);
    }
    if (!problems.length) {
      const { $schema, ...spec } = j.value;
      subject.viz.set(vm[1], spec);
    }
  }

  for (const ent of listDir(dir)) {
    if (ent.name === "_meta.json" || ent.name === "_coverage.md" || ent.name === "viz" || ent.name.startsWith(".")) continue;
    if (ent.isFile() && PLANNING_FILE_RE.test(ent.name)) continue; // internal planning notes (_outline.md …): never built
    const cm = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(ent.name);
    if (!ent.isDirectory() || !cm) {
      report.error(path.join(dir, ent.name), 1, "expected _meta.json, viz/ or NN-chapter-slug/ directories only");
      continue;
    }
    const chDir = path.join(dir, ent.name);
    const chapter = { id: ent.name, n: Number(cm[1]), slug: cm[2], title: titleCase(cm[2]), summary: undefined };
    const chMetaFile = path.join(chDir, "_meta.json");
    if (fs.existsSync(chMetaFile)) {
      const j = readJson(chMetaFile, report);
      if (j) {
        for (const k of Object.keys(j.value || {})) if (!["title", "summary"].includes(k)) report.error(chMetaFile, lineOf(j.raw, new RegExp(`"${k}"`)), `${k} is not a known field (title, summary)`);
        if (j.value.title !== undefined) {
          if (isStr(j.value.title, 80)) chapter.title = j.value.title;
          else report.error(chMetaFile, lineOf(j.raw, /"title"/), "title must be a string");
        }
        if (j.value.summary !== undefined) {
          if (isStr(j.value.summary, 400)) chapter.summary = j.value.summary;
          else report.error(chMetaFile, lineOf(j.raw, /"summary"/), "summary must be a string ≤ 400 characters");
        }
      }
    }
    subject.chapters.push(chapter);

    for (const f of listDir(chDir)) {
      const file = path.join(chDir, f.name);
      if (f.name === "_meta.json") continue;
      if (f.isFile() && PLANNING_FILE_RE.test(f.name)) continue; // internal planning notes (_plan.md …): never built
      if (f.name === "pyq-map.json") {
        const j = readJson(file, report);
        if (!j) continue;
        const list = Array.isArray(j.value) ? j.value : j.value?.map;
        if (!Array.isArray(list)) {
          report.error(file, 1, 'pyq-map.json is a list of { "id": "<pyq id>", "lesson": "<lesson id>", "tests": ["<block id>", …] }');
          continue;
        }
        list.forEach((e, i) => {
          const line = isObj(e) && typeof e.id === "string" ? lineOf(j.raw, new RegExp(`"${e.id.replace(/[-]/g, "\\-")}"`)) : 1;
          if (!isObj(e) || !isStr(e.id, 80) || !isStr(e.lesson, 60) || !strList(e.tests, 20, 48) || Object.keys(e).some((k) => !["id", "lesson", "tests"].includes(k)))
            return report.error(file, line, `entry ${i + 1} must be { "id", "lesson", "tests": [block ids] }`);
          subject.pyqMap.push({ id: e.id, lesson: e.lesson, tests: e.tests, chapterId: ent.name, file, line });
        });
        continue;
      }
      if (f.name === "practice.json") {
        const j = readJson(file, report);
        if (!j) continue;
        const list = Array.isArray(j.value) ? j.value : j.value?.questions;
        for (const q of compilePractice(file, j.raw, list, { ...ctx, subject: id, chapterNum: cm[1] })) {
          subject.practice.push({ ...q, file, chapterNum: cm[1] });
        }
        continue;
      }
      const lm = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.exec(f.name);
      if (!f.isFile() || !lm) {
        report.error(file, 1, "chapters hold NN-lesson-slug.md lessons, practice.json, pyq-map.json and _meta.json only");
        continue;
      }
      const lesson = loadLesson(file, { ...ctx, subject: id, chapter, lessonNum: lm[1], lessonSlug: lm[2] });
      if (lesson) subject.lessons.push(lesson);
    }
  }

  // Unique lesson ids, sorted by chapter then order.
  const seen = new Map();
  for (const l of subject.lessons) {
    if (seen.has(l.fm.id)) report.error(l.file, l.fmLine("id"), `lesson id "${l.fm.id}" is also used by ${rel(seen.get(l.fm.id))}`);
    seen.set(l.fm.id, l.file);
  }
  subject.lessons.sort((a, b) => a.chapterN - b.chapterN || a.fm.order - b.fm.order);
  if (!subject.lessons.length) report.warn(metaFile, 1, "subject has no lessons yet");
  return subject;
}

function loadLesson(file, ctx) {
  const { report, subject, chapter, lessonNum, lessonSlug } = ctx;
  const src = fs.readFileSync(file, "utf8");
  const split = splitFrontmatter(src);
  if (!split || split.yaml === null) {
    report.error(file, 1, "a lesson starts with YAML frontmatter between --- lines");
    return null;
  }
  const yamlLines = split.yaml.split("\n");
  const fmLine = (key) => {
    const i = yamlLines.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
    return i >= 0 ? i + 2 : 1;
  };
  const parsed = ctx.parseYaml(split.yaml);
  for (const e of parsed.errors) report.error(file, e.line + 1, `frontmatter: ${e.message}`);
  if (!parsed.value) return null;
  const fm = parsed.value;
  if (!isObj(fm)) {
    report.error(file, 2, "frontmatter must be a mapping of fields");
    return null;
  }
  for (const k of Object.keys(fm)) if (!FRONTMATTER[k]) report.error(file, fmLine(k), `frontmatter: unknown field "${k}"`);
  for (const [k, check] of Object.entries(FRONTMATTER)) {
    if (fm[k] === undefined) {
      report.error(file, 1, `frontmatter: ${k} is required`);
      continue;
    }
    const e = check(fm[k]);
    if (e) report.error(file, fmLine(k), `frontmatter: ${k} ${e}`);
  }
  if (fm.subject !== undefined && fm.subject !== subject) report.error(file, fmLine("subject"), `frontmatter: subject is "${fm.subject}" but the file is under ${subject}/`);
  if (fm.chapter !== undefined && fm.chapter !== chapter.slug) report.error(file, fmLine("chapter"), `frontmatter: chapter is "${fm.chapter}" but the file is under ${chapter.id}/ (use "${chapter.slug}")`);
  if (fm.id !== undefined && fm.id !== lessonSlug) report.error(file, fmLine("id"), `frontmatter: id "${fm.id}" must match the file name (${lessonSlug})`);
  if (fm.order !== undefined && fm.order !== Number(lessonNum)) report.error(file, fmLine("order"), `frontmatter: order ${fm.order} must match the file number (${Number(lessonNum)})`);
  for (const t of Array.isArray(fm.pyq_topics) ? fm.pyq_topics : []) {
    if (!ctx.bank.topics.has(t)) report.error(file, fmLine("pyq_topics"), `frontmatter: pyq topic "${t}" is not a subject/topic in the question bank`);
  }
  if (!ctx.drafts) {
    if (fm.status !== undefined && fm.status !== "published") report.error(file, fmLine("status"), `status is "${fm.status}" — only published lessons ship (use --drafts to preview)`);
    if (fm.needs_review === true) report.error(file, fmLine("needs_review"), "needs_review is true — clear it before shipping (use --drafts to preview)");
  }

  checkFences(split.body, file, report);
  const c = new Compiler({ file, src: split.body, report, katex: ctx.katex });
  let tree;
  try {
    tree = ctx.parse(split.body);
  } catch (e) {
    report.error(file, 1, `cannot parse Markdown: ${e.message}`);
    return null;
  }
  const body = c.blocksOf(tree.children);
  if (!body.length) report.error(file, split.end + 2, "lesson body is empty");
  return { file, fm, fmLine, c, body, subject, chapterId: chapter.id, chapterN: chapter.n, chapterNum: chapter.id.slice(0, 2), lessonNum };
}

/* ── CLI ─────────────────────────────────────────────────────────────── */

async function main(argv) {
  const args = new Set(argv);
  const check = args.has("--check");
  const drafts = args.has("--drafts");
  const quiet = args.has("--quiet");
  let result;
  try {
    result = await build({ drafts });
  } catch (e) {
    console.error(`✗ ${e.message}`);
    return 1;
  }
  const { errors, warnings, outputs, reports } = result;
  for (const w of warnings) console.warn(`! ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    console.error(`\n${errors.length} error${errors.length === 1 ? "" : "s"} — nothing was written.`);
    return 1;
  }
  const out = DEFAULTS.out;
  const existing = listDir(out).filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name);
  if (check) {
    const stale = [];
    for (const [name, text] of outputs) {
      let cur = null;
      try {
        cur = fs.readFileSync(path.join(out, name), "utf8");
      } catch {}
      if (cur !== text) stale.push(cur === null ? `${name} (missing)` : name);
    }
    let staleReports = 0;
    for (const name of existing) if (!outputs.has(name)) stale.push(`${name} (no longer built)`);
    for (const [file, text] of reports) {
      let cur = null;
      try {
        cur = fs.readFileSync(file, "utf8");
      } catch {}
      if (cur !== text) {
        console.error(`✗ ${rel(file)}: out of date — run npm run notes:build`);
        staleReports++;
      }
    }
    if (stale.length) {
      for (const s of stale) console.error(`✗ ${rel(path.join(out, s.split(" ")[0]))}: out of date — run npm run notes:build${s.includes("(") ? ` ${s.slice(s.indexOf("("))}` : ""}`);
      return 1;
    }
    if (staleReports) return 1;
    const n = [...outputs.keys()].filter((k) => !k.startsWith("_")).length;
    if (!quiet) console.log(`✓ GATE notes valid and up to date (${n} subject${n === 1 ? "" : "s"})`);
    return 0;
  }
  fs.mkdirSync(out, { recursive: true });
  for (const [name, text] of outputs) fs.writeFileSync(path.join(out, name), text);
  for (const name of existing) if (!outputs.has(name)) fs.unlinkSync(path.join(out, name));
  for (const [file, text] of reports) fs.writeFileSync(file, text);
  if (!quiet) {
    for (const [name, text] of outputs) console.log(`  ${rel(path.join(out, name))}  ${(text.length / 1024).toFixed(1)} KB`);
    console.log(`✓ GATE notes built${drafts ? " (drafts included)" : ""}`);
  }
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}

module.exports = { build, main, checkFences, BLOCKS, DEPTHS };
