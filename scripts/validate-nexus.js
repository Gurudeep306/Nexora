#!/usr/bin/env node
/*
 * Validate the Nexus subject files (content/nexus/*.json, every file found):
 * no dangling requires (same- or cross-subject), no cycles anywhere in the
 * web, sane zone/node counts, a domain on every subject, and every PYQ
 * topic / id present in the GATE bank.
 *
 *   node scripts/validate-nexus.js        exit 1 on any problem
 */
const { readOutlines, validateOutlines } = require("../src/nexus/subjects");
const { NEXUS_NODES } = require("../src/nexus/dsa-nodes");
const { loadGateBank } = require("../src/routes/gate");

const docs = readOutlines();
const errors = validateOutlines(docs, NEXUS_NODES, { bank: loadGateBank(), strict: true });
let nodes = 0;
for (const d of docs) {
  if (d.engine) {
    console.log(`${d.id.padEnd(24)} engine "${d.engine}" (${d.engine === "dsa" ? NEXUS_NODES.length : 0} nodes from code)`);
    nodes += d.engine === "dsa" ? NEXUS_NODES.length : 0;
    continue;
  }
  const cross = d.nodes.reduce((n, x) => n + (x.requires || []).filter((r) => r.includes(":")).length, 0);
  nodes += d.nodes.length;
  console.log(`${d.id.padEnd(24)} ${String(d.nodes.length).padStart(3)} nodes  ${d.zones.length} zones  ${String(cross).padStart(2)} cross links  [${d.domain}]`);
}
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nOK: ${docs.length} subjects, ${nodes} nodes.`);
