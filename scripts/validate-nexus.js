#!/usr/bin/env node
/*
 * Validate the Nexus subject outlines (content/nexus/*.json):
 * no dangling requires (same- or cross-subject), no cycles anywhere in the
 * web, sane zone/node counts, and every PYQ topic / id present in the bank.
 *
 *   node scripts/validate-nexus.js        exit 1 on any problem
 */
const { readOutlines, validateOutlines, layoutSubject } = require("../src/nexus/subjects");
const { NEXUS_NODES } = require("../src/nexus/dsa-nodes");
const { loadGateBank } = require("../src/routes/gate");

const docs = readOutlines();
const errors = validateOutlines(docs, NEXUS_NODES, { bank: loadGateBank() });
for (const d of docs) {
  const rows = layoutSubject(d);
  const cross = d.nodes.reduce((n, x) => n + (x.requires || []).filter((r) => r.includes(":")).length, 0);
  console.log(
    `${d.id.padEnd(5)} ${String(d.nodes.length).padStart(3)} nodes  ${d.zones.length} zones  ${String(cross).padStart(2)} cross links  rows ${
      d.zones.map((z) => Math.max(...d.nodes.filter((n) => n.zone === z.level).map((n) => rows.get(n.id).row + 1))).join("/")
    }`,
  );
}
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nOK: ${docs.length} subjects + DSA, ${docs.reduce((n, d) => n + d.nodes.length, 0)} nodes.`);
