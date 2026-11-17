#!/usr/bin/env node
/**
 * Seed the built-in Problem sets (Famous series) from content/problem-sets/seed.json.
 *
 *   npm run seed:problem-sets            # local tracker.db
 *   npm run seed:problem-sets -- --cloud # live site (Turso, uses .env)
 *
 * Every set cites its public source (seed.json only lists verified public lists;
 * no paid, private or leaked data). Items are matched to our catalog by LeetCode
 * id ("lc") and added as real problems; anything we don't have is not invented —
 * the set links the original list instead. Idempotent: existing sets are reused
 * and only missing items are appended.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true });
const fs = require("fs");
const path = require("path");

const SEED_FILE = path.join(__dirname, "..", "content", "problem-sets", "seed.json");

const text = (v, max) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const httpUrl = (v) => {
  try {
    const u = new URL(text(v, 400));
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
};

/**
 * Upsert the seed's series sets. `db` = { all, get, run } (src/db), `data` = parsed
 * seed.json, `owner` = username the seeded sets belong to. Returns a summary.
 */
async function seedProblemSets({ all, get, run }, data, owner) {
  const summary = { sets: [], skippedItems: 0 };
  if (!data || !Array.isArray(data.series)) throw new Error("seed.json has no series array");
  // LeetCode ids in our catalog are "LC<frontend id>" (src/sources/leetcode.js).
  const lcRows = await all("SELECT id, problem_id FROM problems WHERE platform='leetcode'");
  const byLc = new Map(lcRows.map((r) => [r.problem_id, r.id]));
  for (const s of data.series) {
    const title = text(s.title, 100);
    const source = httpUrl(s.sourceUrl);
    if (title.length < 2 || !source) throw new Error(`seed entry needs a title and a public source URL: ${title || "(no title)"}`);
    let row = await get("SELECT * FROM problem_sets WHERE kind='series' AND title=?", [title]);
    if (!row) {
      const t = now();
      const r = await run(
        "INSERT INTO problem_sets(owner, title, description, kind, visibility, company, source_url, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        [owner, title, text(s.description, 500), "series", "public", null, source, t, t],
      );
      row = await get("SELECT * FROM problem_sets WHERE id=?", [r.lastID]);
      summary.sets.push({ title, created: true, added: 0 });
    } else {
      summary.sets.push({ title, created: false, added: 0 });
    }
    const have = new Set((await all("SELECT problem_rowid, title FROM problem_set_items WHERE set_id=?", [row.id])).map((r) => (r.problem_rowid ? `p${r.problem_rowid}` : `l${r.title}`)));
    let pos = (await get("SELECT MAX(position) AS p FROM problem_set_items WHERE set_id=?", [row.id]))?.p;
    pos = pos == null ? 0 : Number(pos) + 1;
    let added = 0;
    for (const it of s.items || []) {
      const key = it.lc != null ? `p${byLc.get(`LC${Number(it.lc)}`) ?? ""}` : `l${text(it.title, 120)}`;
      if (it.lc != null && !byLc.get(`LC${Number(it.lc)}`)) {
        summary.skippedItems++; // not in our catalog: the set links the original instead
        continue;
      }
      if (have.has(key)) continue;
      if (it.lc != null) {
        await run("INSERT INTO problem_set_items(set_id, position, problem_rowid, section) VALUES(?,?,?,?)", [row.id, pos++, byLc.get(`LC${Number(it.lc)}`), text(it.section, 60)]);
      } else if (httpUrl(it.url) && text(it.title, 120)) {
        await run("INSERT INTO problem_set_items(set_id, position, title, url, section) VALUES(?,?,?,?,?)", [row.id, pos++, text(it.title, 120), httpUrl(it.url), text(it.section, 60)]);
      } else {
        continue;
      }
      have.add(key);
      added++;
    }
    if (added) await run("UPDATE problem_sets SET updated_at=? WHERE id=?", [now(), row.id]);
    summary.sets[summary.sets.length - 1].added = added;
  }
  return summary;
}

async function main() {
  if (process.argv.includes("--cloud")) {
    if (!process.env.TURSO_DATABASE_URL) {
      console.error("✗ TURSO_DATABASE_URL is not set in .env");
      process.exit(1);
    }
    process.env.USE_CLOUD_DB = "1";
  }
  const data = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const { all, get, run, initDb } = require("../src/db");
  const { init } = require("../src/routes/problem-sets");
  await initDb();
  await init();
  const owner = process.env.OWNER_USERNAME || "owner";
  const summary = await seedProblemSets({ all, get, run }, data, owner);
  for (const s of summary.sets) console.log(`${s.created ? "created" : "kept   "}  ${s.title}  (+${s.added} problems)`);
  if (summary.skippedItems) console.log(`skipped ${summary.skippedItems} list entries we don't have in the catalog (the set links the original)`);
  console.log("done.");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { seedProblemSets, SEED_FILE };
