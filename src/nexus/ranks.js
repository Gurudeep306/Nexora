/*
 * Nexus ranks — fair and reachable (see content/nexus/README.md, "Ranks").
 *
 * Web rank (the main one): its own ladder of web XP, with the Rift's names
 * and badges. The web holds ~1,380 concepts; nobody should need most of
 * them. The top rank sits at 34,000 web XP — about 330 mastered concepts at
 * ~100 XP each, i.e. one whole stream plus solid breadth (~25% of the web).
 * The curve is roughly x1.6 a level, so the first rank-up comes after two
 * or three concepts (a study session) and every later one stays in sight.
 *
 *   web XP  = concept XP, in proportion to mastery (a 60-XP concept at 50%
 *             gives 30; projects carry their larger xpReward)
 *           + 15 per GATE notes lesson finished
 *           + 5 per GATE PYQ answered correctly (within a concept's target)
 *           + a quarter of the DSA problem XP (a solve is worth ~5-25 web
 *             XP), plus the DSA skill nodes' own concept XP
 * No rank drops: the level shown is never below the best one stored for the
 * user (nexus_scores.web_level), whatever the ladder or formula did before.
 *
 * Subject rank: a tier from the subject's mastery (mean node mastery) —
 * Novice 0-15%, Apprentice 15-35%, Adept 35-60%, Expert 60-80%, Master
 * 80%+ — and Master as soon as every core node is mastered (optional nodes,
 * projects by default, may be skipped). Every threshold is at or below the
 * old 20/40/60/80% one, so no subject tier drops either.
 *
 * Leaderboards read `nexus_scores`, one row per user that is written only when
 * the user's numbers change (on their own Nexus visits), so nothing scans
 * progress or attempts per request.
 */

const TIERS = ["Novice", "Apprentice", "Adept", "Expert", "Master"];
const TIER_AT = [0, 15, 35, 60, 80];

/** Web XP needed for each web level (index = level - 1). */
const WEB_XP = [0, 150, 400, 900, 1800, 3300, 5600, 9000, 14000, 22000, 34000];
/** What one mastered concept is worth on average (for "about N concepts"). */
const CONCEPT_XP = 100;
const XP_PER_LESSON = 15;
const XP_PER_PYQ = 5;
const DSA_XP_SHARE = 0.25;

function tierFor(progress) {
  const p = Math.max(0, Math.min(100, Number(progress) || 0));
  let i = 0;
  for (let k = 1; k < TIER_AT.length; k++) if (p >= TIER_AT[k]) i = k;
  return i;
}

/** A node is core unless the data marks it optional (projects are optional by default). */
function isCore(n) {
  if (n.optional === true) return false;
  if (n.optional === false) return true;
  return (n.kind || "concept") !== "project";
}

const done = (n) => !!n.completed || (n.progress || 0) >= 100;

/**
 * The rank inside one subject. `nodes` (optional) gives the core rule and
 * "next rank in N concepts".
 */
function subjectRank(meta, progress, nodes = null) {
  const p = Math.round(Number(progress) || 0);
  const core = nodes ? nodes.filter(isCore) : [];
  const coreDone = !!nodes && core.length > 0 && core.every(done);
  const i = coreDone ? TIERS.length - 1 : tierFor(p);
  const nextAt = i < TIERS.length - 1 ? TIER_AT[i + 1] : null;
  // Mastering one concept from scratch adds 100 / count points of mastery.
  const count = nodes ? nodes.length : 0;
  const concepts = nextAt !== null && count ? Math.max(1, Math.ceil(((nextAt - p) * count) / 100)) : null;
  return {
    tier: TIERS[i],
    tierIndex: i,
    title: meta.rankTitle || `${meta.short || meta.name} Pathfinder`,
    progress: p,
    next: nextAt !== null ? `${TIERS[i + 1]} at ${nextAt}%` : null,
    toNext: nextAt !== null ? { tier: TIERS[i + 1], at: nextAt, concepts } : null,
    coreDone,
    coreLeft: nodes ? core.filter((n) => !done(n)).length : null,
  };
}

/** Mean node mastery of a subject's nodes (0-100). */
function subjectProgress(nodes) {
  return nodes.length ? Math.round(nodes.reduce((a, n) => a + (n.progress || 0), 0) / nodes.length) : 0;
}

/**
 * The unified web score.
 * @param totals   myTotals(): { xp, solved } (DSA, with admin overrides)
 * @param computed computeSubjects() output (every non-DSA subject)
 * @param dsaNodes the DSA skill nodes with progress (optional)
 */
function webScore(totals, computed, dsaNodes = []) {
  let xp = Math.round((totals.xp || 0) * DSA_XP_SHARE);
  let solved = totals.solved || 0;
  const subjects = {};
  for (const n of dsaNodes) xp += Math.round(((n.xpReward || 0) * Math.min(100, n.progress || 0)) / 100);
  for (const [sid, data] of computed) {
    for (const n of data.nodes) {
      const pyq = Math.min(n.metric?.pyq?.correct || 0, n.metric?.pyq?.target || 0);
      const lessons = n.metric?.lessons?.done || 0;
      xp += Math.round(((n.xpReward || 0) * (n.progress || 0)) / 100) + pyq * XP_PER_PYQ + lessons * XP_PER_LESSON;
      solved += pyq + lessons;
    }
    subjects[sid] = subjectProgress(data.nodes);
  }
  return { xp, solved, subjects };
}

/**
 * The web level for an amount of web XP, never below `floor` (the best
 * level the user ever had). `names` gives each level's name, badge and
 * colour (the Rift ladder's).
 */
function webLevel(xp, names, floor = 1) {
  let lvl = 1;
  for (let i = 1; i < WEB_XP.length; i++) if (xp >= WEB_XP[i]) lvl = i + 1;
  const earned = lvl;
  lvl = Math.max(lvl, Math.min(WEB_XP.length, Number(floor) || 1));
  const curr = names[lvl - 1] || {};
  const next = lvl < WEB_XP.length ? WEB_XP[lvl] : null;
  const base = WEB_XP[lvl - 1];
  const xpToNext = next === null ? 0 : Math.max(0, next - xp);
  return {
    level: lvl,
    xp,
    name: curr.name,
    badge: curr.badge,
    color: curr.color,
    glow: curr.glow,
    xpInLevel: Math.max(0, xp - base),
    xpForNext: next === null ? base : next - base,
    xpToNext,
    conceptsToNext: next === null ? 0 : Math.max(1, Math.ceil(xpToNext / CONCEPT_XP)),
    probsInLevel: 0,
    probsForNext: 0,
    xpGated: next !== null && xp < next,
    probGated: false,
    kept: lvl > earned,
  };
}

/** Monday 00:00 UTC of the week holding `ms`. */
function weekStart(ms = Date.now()) {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

/**
 * This week so far: web XP gained (from the stored week baseline) and the
 * concepts mastered (completed and last studied since Monday).
 */
function weekSummary(row, score, nodes, now = Date.now()) {
  const start = weekStart(now);
  const xp = row && row.week === weekKey(now) ? Math.max(0, score.xp - (row.week_base_xp || 0)) : 0;
  const concepts = nodes.filter((n) => n.completed && (n.touchedAt || 0) >= start).length;
  return { xp, concepts, since: start };
}

/** The web ladder in the shape the ranks UI reads (RiftLevel-like). */
function webLevels(names) {
  return WEB_XP.map((xp, i) => ({ ...(names[i] || {}), level: i + 1, xp, minProblems: 0 }));
}

/** ISO week key, e.g. "2026-W43" (weeks start Monday, UTC). */
function weekKey(ms = Date.now()) {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3));
  // The week holding a year's first Thursday is its week 1.
  const week = 1 + Math.floor((thursday - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / (7 * 86400000));
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Store the user's score when it changed. `last` is an in-memory map of what
 * was last written per user (so unchanged visits cost nothing); returns true
 * when a row was written.
 */
async function saveScore({ get, run }, last, username, score, level, now = Date.now()) {
  if (!username) return false;
  const week = weekKey(now);
  const subjectsJson = JSON.stringify(score.subjects);
  const sig = `${score.xp}|${score.solved}|${level}|${week}|${subjectsJson}`;
  if (last.get(username) === sig) return false;
  const prev = await get("SELECT web_xp, week, week_base_xp FROM nexus_scores WHERE username=?", [username]);
  // A new week starts from where the last one ended.
  const base = !prev ? score.xp : prev.week === week ? prev.week_base_xp : prev.web_xp;
  await run(
    `INSERT INTO nexus_scores(username, web_xp, web_solved, web_level, subjects, week, week_base_xp, updated_at)
     VALUES(?,?,?,?,?,?,?,?)
     ON CONFLICT(username) DO UPDATE SET web_xp=excluded.web_xp, web_solved=excluded.web_solved,
       web_level=excluded.web_level, subjects=excluded.subjects, week=excluded.week,
       week_base_xp=excluded.week_base_xp, updated_at=excluded.updated_at`,
    [username, score.xp, score.solved, level, subjectsJson, week, Math.min(base, score.xp), now],
  );
  if (last.size > 5000) last.clear();
  last.set(username, sig);
  return true;
}

/**
 * Leaderboard rows. scope: "all" (web XP), "week" (web XP gained this week),
 * "friends" (web XP among the viewer and their accepted friends), or
 * "subject" (mastery of one subject). Banned and suspended users are left out.
 */
async function leaderboard({ all }, { scope, subject, viewer, limit = 50, now = Date.now() }) {
  const notBanned = `NOT EXISTS (SELECT 1 FROM user_bans b WHERE b.username = s.username AND b.lifted_at IS NULL AND (b.expires_at IS NULL OR b.expires_at > ${Number(now)}))`;
  let rows;
  if (scope === "subject") {
    rows = await all(
      `SELECT s.username, s.web_level, CAST(json_extract(s.subjects, ?) AS INTEGER) AS score, u.display_name, u.avatar, u.avatar_url
       FROM nexus_scores s LEFT JOIN users u ON u.username = s.username
       WHERE ${notBanned} AND CAST(json_extract(s.subjects, ?) AS INTEGER) > 0
       ORDER BY score DESC, s.web_xp DESC, s.username ASC LIMIT ?`,
      [`$."${subject}"`, `$."${subject}"`, limit],
    );
  } else if (scope === "week") {
    const week = weekKey(now);
    rows = await all(
      `SELECT s.username, s.web_level, (s.web_xp - s.week_base_xp) AS score, u.display_name, u.avatar, u.avatar_url
       FROM nexus_scores s LEFT JOIN users u ON u.username = s.username
       WHERE ${notBanned} AND s.week = ? AND s.web_xp > s.week_base_xp
       ORDER BY score DESC, s.username ASC LIMIT ?`,
      [week, limit],
    );
  } else if (scope === "friends") {
    if (!viewer) return [];
    rows = await all(
      `SELECT s.username, s.web_level, s.web_xp AS score, u.display_name, u.avatar, u.avatar_url
       FROM nexus_scores s LEFT JOIN users u ON u.username = s.username
       WHERE ${notBanned} AND (s.username = ? OR s.username IN (
         SELECT CASE WHEN f.from_user = ? THEN f.to_user ELSE f.from_user END
         FROM friendships f WHERE (f.from_user = ? OR f.to_user = ?) AND f.status = 'accepted'))
       ORDER BY score DESC, s.username ASC LIMIT ?`,
      [viewer, viewer, viewer, viewer, limit],
    );
  } else {
    rows = await all(
      `SELECT s.username, s.web_level, s.web_xp AS score, u.display_name, u.avatar, u.avatar_url
       FROM nexus_scores s LEFT JOIN users u ON u.username = s.username
       WHERE ${notBanned}
       ORDER BY score DESC, s.web_solved DESC, s.username ASC LIMIT ?`,
      [limit],
    );
  }
  return (rows || []).map((r, i) => ({
    rank: i + 1,
    username: r.username,
    displayName: r.display_name || r.username,
    avatar: r.avatar_url || r.avatar || null,
    level: Number(r.web_level) || 1,
    score: Number(r.score) || 0,
  }));
}

module.exports = { TIERS, TIER_AT, WEB_XP, CONCEPT_XP, XP_PER_LESSON, XP_PER_PYQ, DSA_XP_SHARE, tierFor, isCore, subjectRank, subjectProgress, webScore, webLevel, webLevels, weekKey, weekStart, weekSummary, saveScore, leaderboard };
