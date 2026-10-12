#!/usr/bin/env node
/*
 * Audit the GATE question figures (read-only; changes nothing).
 *
 *   node scripts/gate/audit_figures.js            summary
 *   node scripts/gate/audit_figures.js --json     one record per figure
 *
 * For every figure referenced by src/gate/questions.json it reports:
 *   - whether the official PNG exists and its pixel size,
 *   - the SVG status: "draft" (template output of generate_all_gate_svgs.py,
 *     carrying its navy backdrop — not trusted, hidden by the UI),
 *     "redrawn" (anything else — preferred by the UI), or "missing",
 *   - SVG structural problems: no viewBox, fixed pixel width/height,
 *     a baked-in opaque backdrop.
 *
 * The output is deterministic (sorted by question id) so it can be diffed
 * between redraw passes.
 */
const fs = require("fs");
const path = require("path");
const { FIG_DIR, svgStatus } = require("../../src/gate/figures");

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "src", "gate", "questions.json"), "utf8"));
const questions = Array.isArray(raw) ? raw : raw.questions || [];

function pngSize(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.toString("ascii", 1, 4) !== "PNG") return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), alpha: [4, 6].includes(buf[25]) || buf.includes("tRNS") };
  } catch (_) {
    return null;
  }
}

function svgIssues(file) {
  let src = "";
  try {
    src = fs.readFileSync(file, "utf8");
  } catch (_) {
    return ["unreadable"];
  }
  const root = /<svg\b[^>]*>/i.exec(src);
  if (!root) return ["no <svg> root"];
  const tag = root[0];
  const issues = [];
  if (!/viewBox=/.test(tag)) issues.push("no viewBox");
  if (/\swidth="\d+(px)?"/.test(tag) || /\sheight="\d+(px)?"/.test(tag)) issues.push("fixed pixel size");
  if (/<rect[^>]*width="100%"[^>]*height="100%"[^>]*fill="#(?!fff\b|ffffff\b)[0-9a-f]{3,6}"/i.test(src)) issues.push("opaque coloured backdrop");
  if (/fill="#fff(fff)?"/i.test(src) && !/currentColor/.test(src)) issues.push("hard-coded white");
  return issues;
}

const rows = [];
for (const q of questions.slice().sort((a, b) => (a.id < b.id ? -1 : 1))) {
  for (const f of q.figures || []) {
    const png = pngSize(path.join(FIG_DIR, f.f));
    rows.push({
      question: q.id,
      png: f.f,
      pngSize: png ? `${png.w}x${png.h}` : null,
      pngAlpha: png ? png.alpha : null,
      svg: f.svg || null,
      svgStatus: svgStatus(f.svg),
      svgIssues: f.svg ? svgIssues(path.join(FIG_DIR, f.svg)) : [],
    });
  }
}

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
} else {
  const count = (pred) => rows.filter(pred).length;
  const widths = rows.filter((r) => r.pngSize).map((r) => Number(r.pngSize.split("x")[0])).sort((a, b) => a - b);
  const issueCounts = {};
  for (const r of rows) for (const i of r.svgIssues) issueCounts[i] = (issueCounts[i] || 0) + 1;
  console.log(`figures referenced     ${rows.length} (in ${new Set(rows.map((r) => r.question)).size} questions)`);
  console.log(`official PNG present   ${count((r) => r.pngSize)}  (width min/median/max ${widths[0]}/${widths[widths.length >> 1]}/${widths[widths.length - 1]} px, ${count((r) => r.pngAlpha)} with alpha)`);
  console.log(`SVG draft (template)   ${count((r) => r.svgStatus === "draft")}`);
  console.log(`SVG redrawn            ${count((r) => r.svgStatus === "redrawn")}`);
  console.log(`SVG missing            ${count((r) => r.svgStatus === "missing")}`);
  console.log(`SVG issues             ${JSON.stringify(issueCounts)}`);
}
