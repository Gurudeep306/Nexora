#!/usr/bin/env node
// Fill a LOCAL database with a production-sized fixture for DB-usage
// measurements: 27,718 problems across six platforms (realistic tags, ratings
// and categories), 1,836 cached statements, ~60 users with progress,
// submissions, daily activity, social posts/follows and GATE attempts.
//
//   node scripts/ops/seed-fixture.js /path/to/local.db [--users alice,bob]
//
// The schema must already exist (boot the server once against DB_PATH).
// Deterministic (seeded PRNG), and refuses anything that looks remote.
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const file = process.argv[2];
if (!file || /^(libsql|https?|wss?):/i.test(file)) {
  console.error("usage: seed-fixture.js <local .db file> [--users a,b]");
  process.exit(1);
}
const ui = process.argv.indexOf("--users");
const realUsers = ui > 0 ? process.argv[ui + 1].split(",").filter(Boolean) : [];

let seed = 42;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];

const TAGS = [
  "implementation", "math", "greedy", "dp", "data structures", "brute force", "constructive algorithms",
  "graphs", "sortings", "binary search", "dfs and similar", "trees", "strings", "number theory",
  "combinatorics", "two pointers", "bitmasks", "geometry", "dsu", "shortest paths", "probabilities",
  "divide and conquer", "hashing", "games", "interactive", "flows", "matrices", "string suffix structures",
  "graph matchings", "fft", "ternary search", "expression parsing", "meet-in-the-middle", "2-sat", "chinese remainder theorem",
];
const PLATFORMS = [
  ["codeforces", 10500], ["codechef", 6200], ["atcoder", 5400], ["leetcode", 3300], ["spoj", 1400], ["euler", 918],
];
const CATS = ["Array", "Math", "Graph", "DP", "String", "Tree", "Greedy", "Search", ""];

const db = new DatabaseSync(path.resolve(file));
db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=OFF;");
db.exec("BEGIN");
const insP = db.prepare(
  "INSERT OR IGNORE INTO problems(platform,problem_id,title,url,rating,tags,category) VALUES(?,?,?,?,?,?,?)",
);
let n = 0;
for (const [platform, count] of PLATFORMS) {
  for (let i = 0; i < count; i++) {
    const k = 1 + Math.floor(rnd() * 4);
    const tags = [...new Set(Array.from({ length: k }, () => pick(TAGS)))];
    const rating = rnd() < 0.07 ? 0 : 800 + Math.round(rnd() * 27) * 100;
    const pid = platform === "codeforces" ? `${1 + Math.floor(i / 6)}${"ABCDEF"[i % 6]}` : `${platform.slice(0, 2).toUpperCase()}${i}`;
    insP.run(platform, pid, `${platform} problem ${i} ${pick(["Array", "Paths", "Queries", "Game", "Strings", "Tree"])}`,
      `https://example.invalid/${platform}/${pid}`, rating, JSON.stringify(tags), pick(CATS));
    n++;
  }
}
const ids = db.prepare("SELECT id, rating FROM problems ORDER BY id").all();
const insS = db.prepare(
  "INSERT OR IGNORE INTO problem_statements(problem_rowid,statement,input_spec,output_spec,note,time_limit,memory_limit,samples,scraped_at) VALUES(?,?,?,?,?,?,?,?,?)",
);
for (let i = 0; i < 1836; i++) {
  insS.run(ids[i * 15].id, "<p>Statement</p>".repeat(20), "<p>Input</p>", "<p>Output</p>", "", "1 second", "256 MB", "[]", new Date().toISOString());
}

const now = Date.now();
const day = (d) => new Date(now - d * 86400000).toISOString().slice(0, 10);
const users = [...realUsers];
const insU = db.prepare("INSERT OR IGNORE INTO users(username, display_name, created_at) VALUES(?,?,?)");
for (let i = 0; i < 60; i++) {
  const u = `fx_user${i}`;
  insU.run(u, `Fixture ${i}`, new Date(now - i * 3600_000).toISOString());
  users.push(u);
}
const insPr = db.prepare(
  "INSERT OR IGNORE INTO progress(username,problem_rowid,status,attempts,solved_at,xp_earned) VALUES(?,?,?,?,?,?)",
);
const insSub = db.prepare(
  "INSERT INTO submissions(username,problem_rowid,code,language,verdict,submitted_at) VALUES(?,?,?,?,?,?)",
);
const insDa = db.prepare(
  "INSERT OR IGNORE INTO daily_activity(username,date,problems_solved,problems_attempted,xp_earned) VALUES(?,?,?,?,?)",
);
const insPost = db.prepare("INSERT INTO social_posts(username, kind, body, created_at) VALUES(?, 'post', ?, ?)");
const insF = db.prepare("INSERT OR IGNORE INTO social_follows(follower, followee, created_at) VALUES(?,?,?)");
const insG = db.prepare(
  "INSERT INTO gate_attempts(username,question_id,paper,exam,year,subject,topic,type,outcome,marks,mode,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
);
const qs = require("../../src/gate/questions.json");
const qlist = (Array.isArray(qs) ? qs : qs.questions).slice(0, 800);
users.forEach((u, ui2) => {
  const solved = ui2 < realUsers.length ? 320 : 20 + Math.floor(rnd() * 200);
  for (let j = 0; j < solved; j++) {
    const p = pick(ids);
    const d = Math.floor(rnd() * 60);
    const st = rnd() < 0.8 ? "solved" : "attempted";
    insPr.run(u, p.id, st, 1 + Math.floor(rnd() * 3), st === "solved" ? `${day(d)}T12:00:00.000Z` : null, st === "solved" ? 10 + (p.rating || 800) / 100 : 0);
    if (j % 2 === 0) insSub.run(u, p.id, "int main(){}", "cpp", st === "solved" ? "AC" : "WA", `${day(d)}T12:00:00.000Z`);
  }
  for (let d = 0; d < 40; d++) if (rnd() < 0.6) insDa.run(u, day(d), Math.floor(rnd() * 6), Math.floor(rnd() * 8), Math.floor(rnd() * 200));
  for (let k = 0; k < 8; k++) insPost.run(u, `Fixture post ${k} by ${u} #dp #graphs`, now - Math.floor(rnd() * 30 * 86400000));
  for (let k = 0; k < 10; k++) insF.run(u, pick(users), now - k * 1000);
  for (let k = 0; k < 40; k++) {
    const q = pick(qlist);
    insG.run(u, q.id, q.paper, q.exam, q.year, q.subject || "", q.topic || "", q.type, rnd() < 0.6 ? "correct" : "wrong", 1, "practice", now - Math.floor(rnd() * 20 * 86400000));
  }
});
db.exec("COMMIT");
console.log(`seeded ${n} problems, 1836 statements, ${users.length} users into ${file}`);
db.close();
