// Linked judge accounts: a handle is linked only after its owner proves it
// (Codeforces compilation error, AtCoder Affiliation, LeetCode About me);
// a verified handle belongs to one Nexora account; imports need a verified
// account and match the judge's solved list against Nexora's catalogue.
// The judges' answers below follow their documented API shapes.
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const accounts = require("../src/accounts");
const { run } = require("../src/db");

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
const html = (body) => ({ ok: true, status: 200, text: async () => body, json: async () => ({}) });

/** A tiny fake internet: route by URL prefix. */
function net(routes) {
  const calls = [];
  accounts.setFetch(async (url, init) => {
    calls.push({ url: String(url), init });
    for (const [prefix, fn] of routes) if (String(url).startsWith(prefix)) return fn(String(url), init);
    throw new Error(`unexpected fetch ${url}`);
  });
  return calls;
}

test.before(async () => {
  await accounts.init();
});
test.after(() => accounts.setFetch(null));

test("Codeforces: a compilation error on 4A after the challenge proves the account; anything else doesn't", async () => {
  let subs = [];
  net([
    ["https://codeforces.com/api/user.info", () => json({ status: "OK", result: [{ handle: "tourist", rating: 3700, maxRating: 4000, rank: "legendary grandmaster" }] })],
    ["https://codeforces.com/api/user.status", () => json({ status: "OK", result: subs })],
  ]);
  const a = await accounts.start("asha", "codeforces", "tourist");
  assert.equal(a.verified, false);
  assert.match(a.pending.token, /^nexora-[0-9a-f]{8}$/);
  assert.match(a.pending.howTo, /4A/);
  assert.equal(a.rating, 3700);

  // An old compilation error (before the challenge) and a fresh accepted one don't count.
  const now = Math.floor(Date.now() / 1000);
  subs = [
    { problem: { contestId: 4, index: "A" }, verdict: "COMPILATION_ERROR", creationTimeSeconds: now - 3600 },
    { problem: { contestId: 4, index: "A" }, verdict: "OK", creationTimeSeconds: now },
  ];
  assert.equal((await accounts.check("asha", "codeforces")).verified, false);
  subs.push({ problem: { contestId: 4, index: "A" }, verdict: "COMPILATION_ERROR", creationTimeSeconds: now });
  const ok = await accounts.check("asha", "codeforces");
  assert.equal(ok.verified, true);
  assert.equal(ok.account.pending, null, "the code is forgotten once used");
});

test("a verified handle belongs to one Nexora account", async () => {
  await assert.rejects(accounts.start("bilal", "codeforces", "TOURIST"), (e) => e.status === 409 && /already linked/.test(e.message));
});

test("imports need a verified account and match the solved list against the catalogue", async () => {
  net([
    ["https://codeforces.com/api/user.info", () => json({ status: "OK", result: [{ handle: "tourist", rating: 3710, maxRating: 4000 }] })],
    [
      "https://codeforces.com/api/user.status",
      () =>
        json({
          status: "OK",
          result: [
            { problem: { contestId: 1850, index: "G", rating: 1500 }, verdict: "OK", creationTimeSeconds: 200 },
            { problem: { contestId: 1850, index: "G", rating: 1500 }, verdict: "OK", creationTimeSeconds: 100 },
            { problem: { contestId: 1, index: "A", rating: 1000 }, verdict: "OK", creationTimeSeconds: 50 },
            { problem: { contestId: 2, index: "B", rating: 2000 }, verdict: "WRONG_ANSWER", creationTimeSeconds: 60 },
            { problem: { contestId: 999, index: "C" }, verdict: "OK", creationTimeSeconds: 70 },
          ],
        }),
    ],
  ]);
  const catalog = [
    { id: 11, platform: "codeforces", problem_id: "1850G" },
    { id: 12, platform: "codeforces", problem_id: "1A" },
    { id: 13, platform: "codeforces", problem_id: "2B" },
    { id: 14, platform: "atcoder", problem_id: "1850G" },
  ];
  let marked = null;
  const r = await accounts.importSolved("asha", "codeforces", { catalog, markSolved: async (m) => ((marked = m), m.length) });
  assert.deepEqual(marked.map((m) => m.rowId).sort(), [11, 12], "only accepted problems that Nexora has");
  assert.equal(marked.find((m) => m.rowId === 11).at, 100_000, "the first accepted time is kept");
  assert.equal(r.total, 3, "three distinct problems solved on Codeforces (one isn't in Nexora)");
  assert.equal(r.account.solved, 3);
  assert.equal(r.account.rating, 3710);
  assert.deepEqual(r.account.stats.byRating, { 1000: 1, 1500: 1 });

  await run("INSERT INTO linked_accounts(username, platform, handle, token, token_at) VALUES('chen','codeforces','someone','nexora-00000000',?)", [Date.now()]);
  await assert.rejects(accounts.importSolved("chen", "codeforces", { catalog, markSolved: async () => 0 }), (e) => e.status === 403);
});

test("AtCoder: the code in Affiliation proves it; solved problems come from AtCoder Problems, page by page", async () => {
  assert.equal(accounts.atcoderAffiliation('<table><tr><th class="no-break">Affiliation</th><td class="break-all">IIT &amp; nexora-1a2b3c4d</td></tr></table>'), "IIT & nexora-1a2b3c4d");
  let token = "";
  net([
    ["https://atcoder.jp/users/chokudai/history/json", () => json([{ IsRated: true, NewRating: 1000 }, { IsRated: true, NewRating: 1300 }, { IsRated: false, NewRating: 0 }])],
    ["https://atcoder.jp/users/chokudai", () => html(`<table><tr><th>Affiliation</th><td>${token}</td></tr></table>`)],
    ["https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions", () => json([{ problem_id: "abc300_a", result: "AC", epoch_second: 10 }, { problem_id: "abc300_b", result: "WA", epoch_second: 11 }])],
  ]);
  const a = await accounts.start("dina", "atcoder", "chokudai");
  assert.equal(a.maxRating, 1300);
  assert.equal((await accounts.check("dina", "atcoder")).verified, false);
  token = a.pending.token;
  assert.equal((await accounts.check("dina", "atcoder")).verified, true);
  let marked = [];
  const r = await accounts.importSolved("dina", "atcoder", { catalog: [{ id: 21, platform: "atcoder", problem_id: "abc300_a" }], markSolved: async (m) => ((marked = m), m.length) });
  assert.deepEqual(marked.map((m) => m.rowId), [21]);
  assert.equal(r.total, 1);
});

test("LeetCode: About me proves it; counts are exact, the list is the recent 20 (matched by slug)", async () => {
  let about = "";
  net([
    [
      "https://leetcode.com/graphql",
      async (_u, init) => {
        const q = JSON.parse(init.body).query;
        if (q.includes("aboutMe")) return json({ data: { matchedUser: { profile: { aboutMe: about } } } });
        if (q.includes("userContestRanking")) return json({ data: { userContestRanking: { rating: 1834.6 }, matchedUser: { username: "neal" } } });
        return json({
          data: {
            matchedUser: { submitStatsGlobal: { acSubmissionNum: [{ difficulty: "All", count: 412 }, { difficulty: "Easy", count: 200 }, { difficulty: "Medium", count: 180 }, { difficulty: "Hard", count: 32 }] } },
            recentAcSubmissionList: [{ titleSlug: "two-sum", timestamp: "1700000000" }],
          },
        });
      },
    ],
  ]);
  const a = await accounts.start("eva", "leetcode", "neal");
  assert.equal(a.rating, 1835);
  about = `hi ${a.pending.token}`;
  assert.equal((await accounts.check("eva", "leetcode")).verified, true);
  let marked = [];
  const r = await accounts.importSolved("eva", "leetcode", { catalog: [{ id: 31, platform: "leetcode", problem_id: "LC1", url: "https://leetcode.com/problems/two-sum/" }], markSolved: async (m) => ((marked = m), m.length) });
  assert.deepEqual(marked.map((m) => m.rowId), [31]);
  assert.equal(r.total, 412);
  assert.equal(r.account.stats.complete, false);
  assert.deepEqual(r.account.stats.byDifficulty, { easy: 200, medium: 180, hard: 32 });
});

test("an expired code has to be renewed", async () => {
  await run("INSERT INTO linked_accounts(username, platform, handle, token, token_at) VALUES('fay','leetcode','fayx','nexora-11111111',?)", [Date.now() - accounts.CHALLENGE_MS - 1]);
  await assert.rejects(accounts.check("fay", "leetcode"), (e) => e.status === 410);
});

test("badges: solve tiers per judge, rating milestones, multi-judge", async () => {
  const defs = accounts.badgeDefs();
  assert.ok(defs.some((d) => d[0] === "codeforces_solved_100" && d[4] === "platforms"));
  const prog = new Map(accounts.badgeProgress([
    { platform: "codeforces", verified: true, solved: 120, rating: 1500, maxRating: 1950 },
    { platform: "atcoder", verified: true, solved: 5, maxRating: 900 },
    { platform: "leetcode", verified: false, solved: 999 },
  ]).map(([id, p, t]) => [id, { p, t }]));
  assert.equal(prog.get("codeforces_solved_100").p, 120);
  assert.equal(prog.get("codeforces_rated_1900").p, 1);
  assert.equal(prog.get("atcoder_rated_1200").p, 0);
  assert.equal(prog.has("leetcode_solved_10"), false, "unverified accounts earn nothing");
  assert.deepEqual(prog.get("multi_judge"), { p: 2, t: 3 });
});

const fixture = (f) => require("fs").readFileSync(require("path").join(__dirname, "fixtures", "accounts", f), "utf8");

test("DMOJ: the code in Self-description proves it; every solved problem comes from DMOJ's API (real answer, trimmed)", async () => {
  const real = JSON.parse(fixture("dmoj-user.json"));
  let about = real.data.object.about;
  net([["https://dmoj.ca/api/v2/user/", () => json({ data: { object: { ...real.data.object, about } } })]]);
  const a = await accounts.start("dina", "dmoj", "Xyene");
  assert.equal(a.rating, 2039);
  assert.match(a.pending.howTo, /Self-description/);
  assert.equal((await accounts.check("dina", "dmoj")).verified, false);
  about = `${about}\n${a.pending.token}`;
  assert.equal((await accounts.check("dina", "dmoj")).verified, true);
  const catalog = [{ id: 21, platform: "dmoj", problem_id: "aplusb" }, { id: 22, platform: "dmoj", problem_id: "nothere" }];
  let marked = null;
  const r = await accounts.importSolved("dina", "dmoj", { catalog, markSolved: async (m) => ((marked = m), m.length) });
  assert.deepEqual(marked.map((m) => m.rowId), [21]);
  assert.equal(r.total, real.data.object.solved_problems.length);
  // DMOJ's site roles (admin) are not shown as a rank.
  assert.equal(r.account.rank, null);
  net([["https://dmoj.ca/api/v2/user/", () => json({ error: { code: 404, message: "user not found" } }, 404)]]);
  await assert.rejects(accounts.start("dina2", "dmoj", "nobody_here"), (e) => e.status === 404 && /DMOJ/.test(e.message));
});

test("CodeChef: the code in the profile name proves it; the solved count and rating come from the public profile (real page, trimmed)", async () => {
  const page = fixture("codechef-profile.html");
  assert.deepEqual(accounts.codechefProfile(page), { name: "Gennady Korotkevich", rating: 3355, maxRating: 3445, stars: 7, solved: 632 });
  let name = "Gennady Korotkevich";
  net([["https://www.codechef.com/users/", () => html(page.replace("Gennady Korotkevich</h1>", `${name}</h1>`))]]);
  const a = await accounts.start("eli", "codechef", "gennady.korotkevich");
  assert.equal(a.rank, "7★");
  assert.match(a.pending.howTo, /Name/);
  name = `Gennady Korotkevich ${a.pending.token}`;
  assert.equal((await accounts.check("eli", "codechef")).verified, true);
  let calls = 0;
  const r = await accounts.importSolved("eli", "codechef", { catalog: [{ id: 31, platform: "codechef", problem_id: "START01" }], markSolved: async () => (calls++, 0) });
  assert.equal(r.total, 632, "the exact count");
  assert.equal(r.matched, 0, "no list is public, so nothing is marked solved here");
  assert.equal(calls, 0);
  assert.equal(r.account.stats.complete, false);
  // A page that isn't a profile (CodeChef answers 200 with another page for unknown users).
  net([["https://www.codechef.com/users/", () => html("<html><body>Not found</body></html>")]]);
  await assert.rejects(accounts.start("eli2", "codechef", "nobody.here"), (e) => e.status === 404);
});

test("GitHub: connected through OAuth only; the token is used once and revoked; public numbers refresh without it", async () => {
  await assert.rejects(accounts.start("gus", "github", "octocat"), (e) => /Connect with GitHub/.test(e.message));
  const url = new URL(accounts.githubAuthorizeUrl({ clientId: "cid", redirectUri: "https://api.example/auth/github/callback/link", state: "s1" }));
  assert.equal(url.origin + url.pathname, "https://github.com/login/oauth/authorize");
  assert.equal(url.searchParams.get("scope"), "read:user");
  assert.equal(url.searchParams.get("state"), "s1");
  const calls = net([
    ["https://github.com/login/oauth/access_token", () => json({ access_token: "gho_test", token_type: "bearer" })],
    ["https://api.github.com/users/octocat", () => json({ login: "octocat", id: 1, public_repos: 13, followers: 31 })],
    ["https://api.github.com/user", () => json({ login: "octocat", id: 1, public_repos: 12, followers: 30, created_at: "2011-01-25T18:44:36Z" })],
    ["https://api.github.com/graphql", () => json({ data: { viewer: { contributionsCollection: { contributionCalendar: { totalContributions: 140 } } } } })],
    ["https://api.github.com/applications/cid/token", () => json({}, 204)],
  ]);
  const a = await accounts.githubLink("gus", { code: "c0de", clientId: "cid", clientSecret: "secret", redirectUri: "https://api.example/auth/github/callback/link" });
  assert.equal(a.verified, true);
  assert.equal(a.handle, "octocat");
  assert.deepEqual([a.stats.repos, a.stats.followers, a.stats.contributions], [12, 30, 140]);
  await new Promise((r) => setTimeout(r, 10));
  const revoke = calls.find((c) => c.url.includes("/applications/cid/token"));
  assert.equal(revoke.init.method, "DELETE", "the token is revoked");
  assert.equal(JSON.parse(revoke.init.body).access_token, "gho_test");
  const stored = await require("../src/db").get("SELECT token, stats_json FROM linked_accounts WHERE username='gus' AND platform='github'");
  assert.equal(stored.token, null);
  assert.ok(!stored.stats_json.includes("gho_test"), "the token is never stored");
  const r = await accounts.importSolved("gus", "github", { catalog: [], markSolved: async () => 0 });
  assert.deepEqual([r.account.stats.repos, r.account.stats.followers, r.account.stats.contributions], [13, 31, 140], "refresh updates public numbers, keeps contributions");
  // One GitHub account, one Nexora account.
  await assert.rejects(accounts.githubLink("hal", { code: "x", clientId: "cid", clientSecret: "secret", redirectUri: "r" }), (e) => e.status === 409);
  // A refused code.
  net([["https://github.com/login/oauth/access_token", () => json({ error: "bad_verification_code", error_description: "The code passed is incorrect or expired." })]]);
  await assert.rejects(accounts.githubLink("ivy", { code: "x", clientId: "cid", clientSecret: "secret", redirectUri: "r" }), /incorrect or expired/);
  const prog = new Map(accounts.badgeProgress([{ platform: "github", verified: true, stats: { repos: 12, contributions: 140 } }, { platform: "codechef", verified: true, solved: 632, maxRating: 3445 }]).map(([id, p, t]) => [id, { p, t }]));
  assert.deepEqual(prog.get("github_repos_10"), { p: 12, t: 10 });
  assert.deepEqual(prog.get("github_contrib_100"), { p: 140, t: 100 });
  assert.equal(prog.get("codechef_rated_1800").p, 1);
  assert.equal(prog.has("github_solved_10"), false, "GitHub has no solve tiers");
  assert.deepEqual(prog.get("multi_judge"), { p: 1, t: 3 }, "GitHub isn't a judge");
});
