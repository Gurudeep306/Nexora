#!/usr/bin/env node
// Builds content/problem-sets/library.json: the famous series and company
// sets shown in Problems → Problem sets, from public sources only.
//
//   node scripts/problem-sets/build-library.mjs
//
// Sources (each set keeps its own link, shown on its page):
//   - NeetCode (Blind 75, NeetCode 150, NeetCode All): the MIT-licensed list in
//     github.com/neetcode-gh/leetcode (.problemSiteData.json). Premium-only
//     problems are left out.
//   - LeetCode's free study plans (LeetCode 75, Top Interview 150, …): the plan
//     pages on leetcode.com. Paid-only questions and paid plans are left out.
//   - AtCoder practice series (Educational DP, Typical DP, Typical 90, …) and
//     company sets: the contests' public problem lists (kenkoooo AtCoder
//     Problems, which mirrors atcoder.jp).
//   - Codeforces company sets: the public Codeforces API (contest names and
//     the problem set).
//   - Project Euler 1–100: the problems' public pages.
//
// Company sets are the programming contests a company ran or sponsored (the
// company is in the contest's own name). They are NOT "asked in interviews"
// lists: those (LeetCode Premium company tags and copies of them) can't be
// republished. People's own "asked at" reports are added by the server.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const OUT = path.join(ROOT, "content", "problem-sets", "library.json");
const UA = { "User-Agent": "NexoraGuru problem-set builder" };

async function getJson(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...UA, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

const lc = (frontendId, title, slug) => ({ platform: "leetcode", problemId: `LC${Number(frontendId)}`, title, url: `https://leetcode.com/problems/${slug}/` });

/* ── NeetCode ───────────────────────────────────────────────────────────── */
async function neetcode() {
  const data = await getJson("https://raw.githubusercontent.com/neetcode-gh/leetcode/main/.problemSiteData.json");
  const free = data.filter((p) => !p.premium && /^\d+-/.test(p.code || ""));
  const item = (p) => lc(p.code.split("-")[0], p.problem, p.link.replace(/\/$/, ""));
  const bySection = (list) => {
    const sections = [];
    for (const p of list) {
      let s = sections.find((x) => x.name === p.pattern);
      if (!s) sections.push((s = { name: p.pattern, items: [] }));
      s.items.push(item(p));
    }
    return sections;
  };
  const source = "https://neetcode.io/practice";
  return [
    { id: "blind-75", title: "Blind 75", description: "The original 75 must-do interview questions, grouped by pattern (the list as published by NeetCode).", sourceUrl: source, sections: bySection(free.filter((p) => p.blind75)) },
    { id: "neetcode-150", title: "NeetCode 150", description: "Blind 75 plus 75 more, grouped by pattern, as published by NeetCode.", sourceUrl: source, sections: bySection(free.filter((p) => p.neetcode150)) },
    { id: "neetcode-all", title: "NeetCode All", description: "Every problem on NeetCode's practice list (free ones), grouped by pattern.", sourceUrl: source, sections: bySection(free) },
  ];
}

/* ── LeetCode study plans (free) ────────────────────────────────────────── */
const PLANS = [
  ["leetcode-75", "Ace coding interviews with 75 essential questions, topic by topic."],
  ["top-interview-150", "LeetCode's 150 classic interview questions, topic by topic."],
  ["top-100-liked", "LeetCode's 100 most-liked problems, topic by topic."],
  ["top-sql-50", "50 SQL questions, from select to advanced joins."],
  ["programming-skills", "Warm-up problems for programming basics."],
  ["binary-search", "Binary search in every shape, step by step."],
  ["dynamic-programming", "Dynamic programming from 1D to 2D and beyond."],
  ["graph-theory", "Graph traversal, shortest paths, MST and more."],
];
async function studyPlans() {
  const out = [];
  for (const [slug, blurb] of PLANS) {
    const d = await getJson("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/studyplan/" },
      body: JSON.stringify({
        query: "query s($slug:String!){studyPlanV2Detail(planSlug:$slug){name premiumOnly planSubGroups{name questions{titleSlug title questionFrontendId paidOnly}}}}",
        variables: { slug },
      }),
    });
    const p = d?.data?.studyPlanV2Detail;
    if (!p || p.premiumOnly) continue;
    out.push({
      id: `lc-${slug}`,
      title: p.name,
      description: `${blurb} LeetCode's free study plan.`,
      sourceUrl: `https://leetcode.com/studyplan/${slug}/`,
      sections: p.planSubGroups.map((g) => ({ name: g.name, items: g.questions.filter((q) => !q.paidOnly).map((q) => lc(q.questionFrontendId, q.title, q.titleSlug)) })).filter((s) => s.items.length),
    });
  }
  return out;
}

/* ── AtCoder (series and companies) ─────────────────────────────────────── */
async function atcoderData() {
  const [contests, cp, problems] = await Promise.all([
    getJson("https://kenkoooo.com/atcoder/resources/contests.json"),
    getJson("https://kenkoooo.com/atcoder/resources/contest-problem.json"),
    getJson("https://kenkoooo.com/atcoder/resources/problems.json"),
  ]);
  const title = new Map(problems.map((p) => [p.id, p.name || p.title]));
  const byContest = new Map();
  for (const r of cp) {
    if (!byContest.has(r.contest_id)) byContest.set(r.contest_id, []);
    byContest.get(r.contest_id).push(r.problem_id);
  }
  for (const list of byContest.values()) list.sort();
  return { contests, byContest, title };
}
const acItem = (ac, contest, pid) => ({ platform: "atcoder", problemId: pid, title: ac.title.get(pid) || pid, url: `https://atcoder.jp/contests/${contest}/tasks/${pid}` });

const AC_SERIES = [
  ["dp", "atcoder-dp", "AtCoder Educational DP Contest", "26 classic dynamic programming problems, A to Z."],
  ["tdpc", "atcoder-typical-dp", "AtCoder Typical DP Contest", "20 typical dynamic programming problems."],
  ["typical90", "atcoder-typical-90", "Typical 90 (AtCoder)", "90 typical competitive programming problems, one a day."],
  ["practice2", "atcoder-library-practice", "AtCoder Library Practice Contest", "One problem for each part of the AtCoder Library."],
  ["abs", "atcoder-beginners-selection", "AtCoder Beginners Selection", "The first problems to try on AtCoder."],
];
function atcoderSeries(ac) {
  return AC_SERIES.filter(([c]) => ac.byContest.has(c)).map(([c, id, title, description]) => ({
    id,
    title,
    description,
    sourceUrl: `https://atcoder.jp/contests/${c}`,
    sections: [{ name: "", items: ac.byContest.get(c).map((p) => acItem(ac, c, p)) }],
  }));
}

/* ── Project Euler 1–100 ────────────────────────────────────────────────── */
function euler() {
  const items = [];
  for (let i = 1; i <= 100; i++) items.push({ platform: "euler", problemId: `PE${i}`, title: `Problem ${i}`, url: `https://projecteuler.net/problem=${i}` });
  return [{ id: "project-euler-100", title: "Project Euler 1–100", description: "The first hundred Project Euler problems: maths and programming together.", sourceUrl: "https://projecteuler.net/archives", sections: [{ name: "", items }] }];
}

/* ── Companies: contests they ran or sponsored (their name is in the contest's) ── */
const AC_COMPANIES = [
  ["KEYENCE", /キーエンス|KEYENCE|Keyence/],
  ["Toyota", /トヨタ自動車|Toyota Programming Contest|TOYOTA MOTOR/i],
  ["Toyota Systems", /トヨタシステムズ|Toyota Systems/i],
  ["Panasonic", /パナソニック|Panasonic/i],
  ["Tokio Marine & Nichido", /東京海上日動|Tokio Marine/i],
  ["NEC", /\bNEC\b|NECプログラミング/],
  ["Kyocera", /京セラ|KYOCERA/i],
  ["Nomura", /NOMURA|野村/i],
  ["Daiwa Securities", /大和証券|Daiwa/i],
  ["DENSO Create", /デンソークリエイト|DENSO Create/i],
  ["Unique Vision", /ユニークビジョン|UNIQUE VISION/i],
  ["Monoxer", /モノグサ|Monoxer/i],
  ["AISing", /エイシング|AISing/i],
  ["UNICORN", /UNICORN/],
  ["freee", /freee/],
  ["Sky", /Ｓｋｙ株式会社|SKY Inc/i],
  ["Kajima", /鹿島建設|Kajima/i],
  ["OMRON", /オムロン|OMRON/i],
  ["Suntory", /サントリー|Suntory/i],
  ["JPRS", /日本レジストリサービス|JPRS/],
  ["Hitachi", /日立|Hitachi/i],
  ["Huawei", /HUAWEI|Huawei/],
  ["SOMPO", /SOMPO/],
  ["CADDi", /キャディ|CADDi/i],
  ["Mynavi", /マイナビ|Mynavi/i],
  ["NS Solutions", /日鉄ソリューションズ|NS Solutions/i],
  ["LINE", /\bLINE\b/],
  ["Game Freak", /ゲームフリーク|GAME FREAK/i],
  ["SMBC", /SMBC/],
  ["M-SOLUTIONS", /M-SOLUTIONS/i],
  ["Sumitomo Mitsui Trust Bank", /三井住友信託|Sumitomo Mitsui Trust/i],
  ["Yahoo! JAPAN", /Yahoo/i],
  ["Nikkei", /NIKKEI|日経/i],
  ["DISCO", /DISCO|ディスコ/],
  ["Recruit", /CODE FESTIVAL|リクルート|Recruit/i],
  ["ExaWizards", /エクサウィザーズ|ExaWizards/i],
  ["Mirrativ", /ミラティブ|Mirrativ/i],
  ["Polaris.AI", /Polaris\.AI/i],
  ["Keysight", /キーサイト|Keysight/i],
  ["Sciseed", /サイシード|Sciseed/i],
  ["SoundHound", /SoundHound/i],
  ["Dwango", /ドワンゴ|dwango/i],
  ["diverta", /diverta/i],
  ["Mitsubishi Electric", /三菱電機|Mitsubishi Electric/i],
];
const CF_COMPANIES = [
  ["VK", /VK Cup|Mail\.Ru|Technocup/i],
  ["JetBrains", /Kotlin Heroes|JetBrains/i],
  ["Microsoft", /Microsoft|Bubble Cup/i],
  ["Huawei", /Huawei/i],
  ["Deltix", /Deltix/i],
  ["Pinely", /Pinely/i],
  ["TON", /CodeTON|MaraTON/i],
  ["Nebius", /Nebius/i],
  ["Squarepoint", /Squarepoint/i],
  ["Atto", /Atto Round/i],
  ["Teza", /Teza Round/i],
  ["think-cell", /think-cell/i],
  ["Refact.ai", /Refact\.ai/i],
  ["Lyft", /Lyft/i],
  ["Tinkoff", /Tinkoff/i],
  ["Yandex", /Yandex/i],
  ["Forethought", /Forethought/i],
  ["NEAR", /\bNEAR\b/],
  ["Codenation", /Codenation/i],
  ["Avito", /Avito/i],
  ["Ozon", /Ozon/i],
  ["Grakn", /Grakn/i],
];

async function companies(ac) {
  const map = new Map(); // name → { sources:Set, sections:[] }
  const add = (name, section, items, source) => {
    if (!items.length) return;
    if (!map.has(name)) map.set(name, { sections: [], sources: new Set() });
    const c = map.get(name);
    c.sections.push({ name: section, items });
    c.sources.add(source);
  };
  // AtCoder: rated contests whose own title names the company.
  for (const c of ac.contests) {
    if (!ac.byContest.has(c.id) || c.rate_change === "-") continue;
    for (const [name, re] of AC_COMPANIES) {
      if (re.test(c.title)) add(name, c.title, ac.byContest.get(c.id).map((p) => acItem(ac, c.id, p)), "AtCoder");
    }
  }
  // Codeforces: finished contests whose name names the company; problems from the problem set.
  const [cfContests, cfProblems] = await Promise.all([
    getJson("https://codeforces.com/api/contest.list?gym=false"),
    getJson("https://codeforces.com/api/problemset.problems"),
  ]);
  const byContest = new Map();
  for (const p of cfProblems.result.problems) {
    if (!byContest.has(p.contestId)) byContest.set(p.contestId, []);
    byContest.get(p.contestId).push(p);
  }
  for (const c of cfContests.result.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)) {
    if (c.phase !== "FINISHED") continue;
    for (const [name, re] of CF_COMPANIES) {
      if (!re.test(c.name)) continue;
      const items = (byContest.get(c.id) || [])
        .sort((a, b) => a.index.localeCompare(b.index, "en", { numeric: true }))
        .map((p) => ({ platform: "codeforces", problemId: `${p.contestId}${p.index}`, title: p.name, url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}` }));
      add(name, c.name, items, "Codeforces");
    }
  }
  const out = [];
  for (const [name, c] of [...map].sort((a, b) => a[0].localeCompare(b[0]))) {
    const count = c.sections.reduce((n, s) => n + s.items.length, 0);
    const where = [...c.sources].join(" and ");
    out.push({
      id: `company-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      company: name,
      title: name,
      description: `Problems from the programming contests ${name} ran or sponsored on ${where} (the contest names are below). ${count} problems.`,
      sourceUrl: c.sources.has("AtCoder") ? "https://atcoder.jp/contests/archive" : "https://codeforces.com/contests",
      sections: c.sections,
    });
  }
  return out;
}

const ac = await atcoderData();
const series = [...(await neetcode()), ...(await studyPlans()), ...atcoderSeries(ac), ...euler()];
const company = await companies(ac);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), series, companies: company }, null, 1) + "\n");
const count = (s) => s.sections.reduce((n, x) => n + x.items.length, 0);
console.log(`series: ${series.length}`);
for (const s of series) console.log(`  ${s.title}: ${count(s)}`);
console.log(`companies: ${company.length}`);
for (const c of company) console.log(`  ${c.title}: ${count(c)} (${c.sections.length} contests)`);
console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
