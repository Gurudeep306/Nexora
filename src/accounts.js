// Linked judge accounts: prove a Codeforces / AtCoder / LeetCode handle is
// yours, then import what you solved there.
//
// What the judges make public (and so what Nexora can honestly import):
//   Codeforces  every submission (official API: user.status, user.info)
//   AtCoder     every submission (AtCoder Problems' API) + rating history
//   LeetCode    solved counts per difficulty + the last 20 accepted problems
// None of them publish another person's source code, so code is never
// imported — only which problems were solved, counts and ratings.
//
// Ownership, the standard way for each judge:
//   Codeforces  submit a compilation error to a named problem within 15 min
//               (no profile edits; the API shows it within seconds)
//   AtCoder     put a short code in the profile's Affiliation field
//   LeetCode    put the same code in the profile's About me
// A verified handle belongs to one Nexora account only.
const crypto = require("crypto");
const { run, get, all } = require("./db");

const UA = "NexoraGuru/1.0 (+https://nexoraguru.in)";
const CHALLENGE_MS = 15 * 60_000;
/** The Codeforces problem to submit a compilation error to (anything that doesn't compile). */
const CF_VERIFY = { contestId: 4, index: "A", url: "https://codeforces.com/problemset/problem/4/A" };

let fetchImpl = (...a) => fetch(...a);
/** Tests swap the network for recorded answers. */
function setFetch(fn) {
  fetchImpl = fn || ((...a) => fetch(...a));
}

async function getJson(url, init = {}) {
  const r = await fetchImpl(url, { ...init, headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers || {}) }, signal: init.signal || AbortSignal.timeout(20000) });
  if (r.status === 429) throw Object.assign(new Error("The judge is rate-limiting us — try again in a minute"), { status: 503 });
  if (!r.ok) throw Object.assign(new Error(`The judge answered ${r.status}`), { status: r.status === 404 ? 404 : 502 });
  return r.json();
}
async function getText(url) {
  const r = await fetchImpl(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw Object.assign(new Error(`The judge answered ${r.status}`), { status: r.status === 404 ? 404 : 502 });
  return r.text();
}

const HANDLE_RE = {
  codeforces: /^[A-Za-z0-9_.-]{3,24}$/,
  atcoder: /^[A-Za-z0-9_]{3,16}$/,
  leetcode: /^[A-Za-z0-9_-]{2,30}$/,
};

/* ── Codeforces ──────────────────────────────────────────────────────────── */
const codeforces = {
  id: "codeforces",
  name: "Codeforces",
  profileUrl: (h) => `https://codeforces.com/profile/${encodeURIComponent(h)}`,
  howToVerify: (c) =>
    `Submit any code that does not compile to problem 4A (Watermelon) on Codeforces — ${CF_VERIFY.url} — within 15 minutes, then press Check. The compilation error proves the account is yours; it doesn't affect your rating.`,
  async verify(handle, challenge) {
    const d = await getJson(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=30`);
    if (d.status !== "OK") throw Object.assign(new Error(d.comment || "Codeforces didn't recognise that handle"), { status: 404 });
    const since = Math.floor(challenge.createdAt / 1000) - 60;
    return (d.result || []).some((s) => s.problem?.contestId === CF_VERIFY.contestId && s.problem?.index === CF_VERIFY.index && s.verdict === "COMPILATION_ERROR" && s.creationTimeSeconds >= since);
  },
  async profile(handle) {
    const d = await getJson(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
    const u = d.result?.[0];
    if (d.status !== "OK" || !u) throw Object.assign(new Error("Codeforces didn't recognise that handle"), { status: 404 });
    return { handle: u.handle, rating: u.rating ?? null, maxRating: u.maxRating ?? null, rank: u.rank || null, maxRank: u.maxRank || null };
  },
  /** Every accepted problem: ids like "1850G", with the problem's rating when known. */
  async solved(handle) {
    const d = await getJson(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`, { signal: AbortSignal.timeout(60000) });
    if (d.status !== "OK") throw new Error(d.comment || "Codeforces API error");
    const out = new Map();
    for (const s of d.result || []) {
      if (s.verdict !== "OK" || !s.problem?.contestId || !s.problem?.index) continue;
      const id = `${s.problem.contestId}${s.problem.index}`;
      const prev = out.get(id);
      const at = (s.creationTimeSeconds || 0) * 1000;
      if (!prev || at < prev.at) out.set(id, { id, at, rating: s.problem.rating || null });
    }
    return { complete: true, problems: [...out.values()] };
  },
};

/* ── AtCoder ─────────────────────────────────────────────────────────────── */
/** The Affiliation cell of an AtCoder profile page. */
function atcoderAffiliation(html) {
  const m = /<th[^>]*>\s*Affiliation\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i.exec(String(html || ""));
  return m ? m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim() : null;
}
const atcoder = {
  id: "atcoder",
  name: "AtCoder",
  profileUrl: (h) => `https://atcoder.jp/users/${encodeURIComponent(h)}`,
  howToVerify: (c) => `On AtCoder open Settings → General settings, put ${c.token} in Affiliation, save, then press Check. You can remove it afterwards.`,
  async verify(handle, challenge) {
    const html = await getText(`https://atcoder.jp/users/${encodeURIComponent(handle)}?lang=en`);
    return (atcoderAffiliation(html) || "").includes(challenge.token);
  },
  async profile(handle) {
    const hist = await getJson(`https://atcoder.jp/users/${encodeURIComponent(handle)}/history/json`).catch(() => []);
    const rated = (Array.isArray(hist) ? hist : []).filter((h) => h.IsRated);
    const last = rated[rated.length - 1];
    return { handle, rating: last ? last.NewRating : null, maxRating: rated.length ? Math.max(...rated.map((h) => h.NewRating)) : null, rank: null, maxRank: null };
  },
  /** AtCoder Problems serves submissions 500 at a time, oldest first. */
  async solved(handle) {
    const out = new Map();
    let from = 0;
    for (let page = 0; page < 200; page++) {
      const list = await getJson(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=${from}`);
      if (!Array.isArray(list) || !list.length) break;
      for (const s of list) {
        if (s.result !== "AC" || !s.problem_id) continue;
        const at = (s.epoch_second || 0) * 1000;
        if (!out.has(s.problem_id) || at < out.get(s.problem_id).at) out.set(s.problem_id, { id: s.problem_id, at, rating: null });
      }
      if (list.length < 500) break;
      from = Math.max(...list.map((s) => s.epoch_second || 0)) + 1;
      await new Promise((r) => setTimeout(r, 1100)); // the API asks for at most one call a second
    }
    return { complete: true, problems: [...out.values()] };
  },
};

/* ── LeetCode ────────────────────────────────────────────────────────────── */
const LC_GQL = "https://leetcode.com/graphql";
async function lcQuery(query, variables) {
  const d = await getJson(LC_GQL, { method: "POST", headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/" }, body: JSON.stringify({ query, variables }) });
  if (d.errors?.length) throw Object.assign(new Error(d.errors[0].message || "LeetCode error"), { status: 404 });
  return d.data;
}
const leetcode = {
  id: "leetcode",
  name: "LeetCode",
  profileUrl: (h) => `https://leetcode.com/u/${encodeURIComponent(h)}/`,
  howToVerify: (c) => `On LeetCode open your profile → Edit profile, put ${c.token} in the README / About me, save, then press Check. You can remove it afterwards.`,
  async verify(handle, challenge) {
    const d = await lcQuery("query($u: String!) { matchedUser(username: $u) { profile { aboutMe } } }", { u: handle });
    if (!d?.matchedUser) throw Object.assign(new Error("LeetCode didn't recognise that username"), { status: 404 });
    return String(d.matchedUser.profile?.aboutMe || "").includes(challenge.token);
  },
  async profile(handle) {
    const d = await lcQuery("query($u: String!) { userContestRanking(username: $u) { rating } matchedUser(username: $u) { username } }", { u: handle });
    if (!d?.matchedUser) throw Object.assign(new Error("LeetCode didn't recognise that username"), { status: 404 });
    const r = d.userContestRanking?.rating;
    return { handle: d.matchedUser.username, rating: r ? Math.round(r) : null, maxRating: null, rank: null, maxRank: null };
  },
  /**
   * LeetCode publishes totals per difficulty and only the last 20 accepted
   * problems, so the import is partial: counts are exact, the list is recent.
   */
  async solved(handle) {
    const d = await lcQuery(
      "query($u: String!) { matchedUser(username: $u) { submitStatsGlobal { acSubmissionNum { difficulty count } } } recentAcSubmissionList(username: $u, limit: 20) { titleSlug timestamp } }",
      { u: handle },
    );
    if (!d?.matchedUser) throw Object.assign(new Error("LeetCode didn't recognise that username"), { status: 404 });
    const nums = d.matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const total = nums.find((n) => n.difficulty === "All")?.count ?? nums.reduce((s, n) => s + (n.count || 0), 0);
    const problems = (d.recentAcSubmissionList || []).map((s) => ({ slug: s.titleSlug, at: Number(s.timestamp) * 1000, rating: null }));
    return { complete: false, total, byDifficulty: Object.fromEntries(nums.filter((n) => n.difficulty !== "All").map((n) => [n.difficulty.toLowerCase(), n.count])), problems };
  },
};

const PLATFORMS = { codeforces, atcoder, leetcode };

/* ── Storage ─────────────────────────────────────────────────────────────── */
let ready = null;
function init() {
  ready ||= (async () => {
    await run(`CREATE TABLE IF NOT EXISTS linked_accounts (
      username TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      token TEXT,
      token_at INTEGER,
      verified_at INTEGER,
      rating INTEGER,
      max_rating INTEGER,
      rank TEXT,
      solved INTEGER,
      imported INTEGER,
      last_import INTEGER,
      last_error TEXT,
      stats_json TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (username, platform)
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_linked_handle ON linked_accounts(platform, handle)");
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const pub = (r) =>
  r && {
    platform: r.platform,
    name: PLATFORMS[r.platform]?.name || r.platform,
    handle: r.handle,
    profileUrl: PLATFORMS[r.platform]?.profileUrl(r.handle),
    verified: !!r.verified_at,
    verifiedAt: r.verified_at,
    rating: r.rating,
    maxRating: r.max_rating,
    rank: r.rank,
    solved: r.solved,
    imported: r.imported,
    lastImport: r.last_import,
    lastError: r.last_error,
    stats: (() => {
      try {
        return JSON.parse(r.stats_json || "{}");
      } catch {
        return {};
      }
    })(),
    pending: !r.verified_at && r.token ? { token: r.token, expiresAt: r.token_at + CHALLENGE_MS, howTo: PLATFORMS[r.platform]?.howToVerify({ token: r.token }) } : null,
  };

async function list(username) {
  await init();
  return (await all("SELECT * FROM linked_accounts WHERE username=? ORDER BY platform", [username])).map(pub);
}

function bad(msg, status = 400) {
  return Object.assign(new Error(msg), { status });
}

/** Start linking: checks the handle exists, returns what to do to prove it's yours. */
async function start(username, platform, rawHandle) {
  await init();
  const p = PLATFORMS[platform];
  if (!p) throw bad("Unknown judge");
  const handle = String(rawHandle || "").trim();
  if (!HANDLE_RE[platform].test(handle)) throw bad(`That doesn't look like a ${p.name} handle`);
  const taken = await get("SELECT username FROM linked_accounts WHERE platform=? AND LOWER(handle)=LOWER(?) AND verified_at IS NOT NULL AND username<>?", [platform, handle, username]);
  if (taken) throw bad(`That ${p.name} account is already linked to another Nexora account`, 409);
  const prof = await p.profile(handle); // also proves the handle exists
  const token = `nexora-${crypto.randomBytes(4).toString("hex")}`;
  const now = Date.now();
  await run(
    `INSERT INTO linked_accounts(username, platform, handle, token, token_at, verified_at, rating, max_rating, rank) VALUES(?,?,?,?,?,NULL,?,?,?)
     ON CONFLICT(username, platform) DO UPDATE SET handle=excluded.handle, token=excluded.token, token_at=excluded.token_at, verified_at=NULL, rating=excluded.rating, max_rating=excluded.max_rating, rank=excluded.rank, last_error=NULL`,
    [username, platform, prof.handle || handle, token, now, prof.rating, prof.maxRating, prof.rank],
  );
  return pub(await get("SELECT * FROM linked_accounts WHERE username=? AND platform=?", [username, platform]));
}

/** Check the proof. On success the handle is verified (and the old token forgotten). */
async function check(username, platform) {
  await init();
  const p = PLATFORMS[platform];
  const row = await get("SELECT * FROM linked_accounts WHERE username=? AND platform=?", [username, platform]);
  if (!p || !row) throw bad("Start linking first", 404);
  if (row.verified_at) return { verified: true, account: pub(row) };
  if (!row.token || Date.now() - row.token_at > CHALLENGE_MS) throw bad("That code expired — start again for a new one", 410);
  const taken = await get("SELECT username FROM linked_accounts WHERE platform=? AND LOWER(handle)=LOWER(?) AND verified_at IS NOT NULL AND username<>?", [platform, row.handle, username]);
  if (taken) throw bad(`That ${p.name} account is already linked to another Nexora account`, 409);
  const ok = await p.verify(row.handle, { token: row.token, createdAt: row.token_at });
  if (!ok) return { verified: false, account: pub(row) };
  await run("UPDATE linked_accounts SET verified_at=?, token=NULL, token_at=NULL WHERE username=? AND platform=?", [Date.now(), username, platform]);
  return { verified: true, account: pub(await get("SELECT * FROM linked_accounts WHERE username=? AND platform=?", [username, platform])) };
}

async function unlink(username, platform) {
  await init();
  await run("DELETE FROM linked_accounts WHERE username=? AND platform=?", [username, platform]);
}

/**
 * Import solved problems for a verified account. `markSolved(rowIds)` is the
 * server's progress writer (XP, streak-safe); returns how many were new.
 * Problems that aren't in Nexora's catalogue still count toward the badges.
 */
async function importSolved(username, platform, { catalog, markSolved }) {
  await init();
  const p = PLATFORMS[platform];
  const row = await get("SELECT * FROM linked_accounts WHERE username=? AND platform=?", [username, platform]);
  if (!p || !row) throw bad("Link the account first", 404);
  if (!row.verified_at) throw bad("Verify the account first — imports only come from accounts you've proved are yours", 403);
  try {
    const [prof, res] = await Promise.all([p.profile(row.handle).catch(() => null), p.solved(row.handle)]);
    // Match against Nexora's catalogue for this platform.
    const ids = new Map();
    for (const c of catalog) {
      if (c.platform !== platform) continue;
      ids.set(String(c.problem_id).toLowerCase(), c.id);
      if (platform === "leetcode" && c.url) {
        const slug = /\/problems\/([^/]+)/.exec(c.url)?.[1];
        if (slug) ids.set(slug.toLowerCase(), c.id);
      }
    }
    const matched = [];
    for (const s of res.problems) {
      const id = ids.get(String(s.id || s.slug || "").toLowerCase());
      if (id != null) matched.push({ rowId: id, at: s.at });
    }
    const added = matched.length ? await markSolved(matched) : 0;
    const total = res.complete ? res.problems.length : res.total;
    const byRating = {};
    for (const s of res.problems) if (s.rating) byRating[s.rating] = (byRating[s.rating] || 0) + 1;
    const stats = { complete: res.complete, byDifficulty: res.byDifficulty || null, byRating: Object.keys(byRating).length ? byRating : null, matched: matched.length };
    await run(
      `UPDATE linked_accounts SET solved=?, imported=?, last_import=?, last_error=NULL, stats_json=?, rating=COALESCE(?, rating), max_rating=COALESCE(?, max_rating), rank=COALESCE(?, rank) WHERE username=? AND platform=?`,
      [total, matched.length, Date.now(), JSON.stringify(stats), prof?.rating ?? null, prof?.maxRating ?? null, prof?.rank ?? null, username, platform],
    );
    return { added, matched: matched.length, total, account: pub(await get("SELECT * FROM linked_accounts WHERE username=? AND platform=?", [username, platform])) };
  } catch (e) {
    await run("UPDATE linked_accounts SET last_error=? WHERE username=? AND platform=?", [String(e.message).slice(0, 300), username, platform]).catch(() => {});
    throw e;
  }
}

/* ── Badges ──────────────────────────────────────────────────────────────── */
const TIERS = [
  [10, "Starter"],
  [50, "Regular"],
  [100, "Centurion"],
  [250, "Veteran"],
  [500, "Master"],
  [1000, "Legend"],
];
/** Achievement rows for the platform badges (seeded at start-up). */
function badgeDefs() {
  const out = [];
  for (const p of Object.values(PLATFORMS)) {
    for (const [n, label] of TIERS) {
      out.push([`${p.id}_solved_${n}`, `${p.name} ${label}`, `Solve ${n} problems on ${p.name} (linked account)`, "trophy", "platforms", n, Math.round(n * 1.5)]);
    }
  }
  out.push(["codeforces_rated_1400", "Codeforces Specialist", "Reach a 1400 rating on Codeforces", "medal_blue", "platforms", 1, 200]);
  out.push(["codeforces_rated_1900", "Codeforces Candidate Master", "Reach a 1900 rating on Codeforces", "medal_purple", "platforms", 1, 400]);
  out.push(["atcoder_rated_1200", "AtCoder Cyan", "Reach a 1200 rating on AtCoder", "medal_green", "platforms", 1, 300]);
  out.push(["multi_judge", "Multi-judge", "Link and verify accounts on three judges", "globe", "platforms", 3, 150]);
  return out;
}
/** [achievementId, progress, target] for one user's verified accounts. */
function badgeProgress(accounts) {
  const out = [];
  const verified = accounts.filter((a) => a.verified);
  for (const a of verified) {
    for (const [n] of TIERS) out.push([`${a.platform}_solved_${n}`, Number(a.solved) || 0, n]);
    const best = Math.max(Number(a.maxRating) || 0, Number(a.rating) || 0);
    if (a.platform === "codeforces") {
      out.push(["codeforces_rated_1400", best >= 1400 ? 1 : 0, 1]);
      out.push(["codeforces_rated_1900", best >= 1900 ? 1 : 0, 1]);
    }
    if (a.platform === "atcoder") out.push(["atcoder_rated_1200", best >= 1200 ? 1 : 0, 1]);
  }
  out.push(["multi_judge", verified.length, 3]);
  return out;
}

module.exports = { PLATFORMS, CF_VERIFY, CHALLENGE_MS, setFetch, list, start, check, unlink, importSolved, badgeDefs, badgeProgress, atcoderAffiliation, init };
