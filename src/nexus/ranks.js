/*
 * Nexus ranks.
 *
 * Web rank (the main one): one score across the whole web, on the existing
 * Rift ladder (levels, names, badges, XP and solve gates).
 *   web XP     = DSA XP (problems, unchanged)
 *              + every other subject's concept XP, earned in proportion to
 *                mastery (a concept worth 80 XP at 50% mastery gives 40)
 *   web solves = DSA solves + GATE PYQs answered correctly + lessons finished
 * Both only ever add to the DSA numbers, so nobody's rank can drop when the
 * web rank replaces the DSA-only one (the DSA XP is the floor).
 *
 * Subject rank (simple): a tier from the subject's mastery % (Novice →
 * Apprentice → Adept → Expert → Master, every 20%) plus the subject's own
 * title from its data file (`rankTitle`, with a default).
 *
 * Leaderboards read `nexus_scores`, one row per user that is written only when
 * the user's numbers change (on their own Nexus visits), so nothing scans
 * progress or attempts per request.
 */

const TIERS = ["Novice", "Apprentice", "Adept", "Expert", "Master"];

function tierFor(progress) {
  const p = Math.max(0, Math.min(100, Number(progress) || 0));
  return Math.min(TIERS.length - 1, Math.floor(p / 20));
}

/** The rank inside one subject. */
function subjectRank(meta, progress) {
  const i = tierFor(progress);
  return {
    tier: TIERS[i],
    tierIndex: i,
    title: meta.rankTitle || `${meta.short || meta.name} Pathfinder`,
    progress: Math.round(Number(progress) || 0),
    next: i < TIERS.length - 1 ? `${TIERS[i + 1]} at ${(i + 1) * 20}%` : null,
  };
}

/** Mean node mastery of a subject's nodes (0–100). */
function subjectProgress(nodes) {
  return nodes.length ? Math.round(nodes.reduce((a, n) => a + (n.progress || 0), 0) / nodes.length) : 0;
}

/**
 * The unified web score.
 * @param totals   myTotals(): { xp, solved } (DSA, with admin overrides)
 * @param computed computeSubjects() output (every non-DSA subject)
 */
function webScore(totals, computed) {
  let xp = totals.xp || 0;
  let solved = totals.solved || 0;
  const subjects = {};
  for (const [sid, data] of computed) {
    for (const n of data.nodes) {
      xp += Math.round(((n.xpReward || 0) * (n.progress || 0)) / 100);
      solved += Math.min(n.metric?.pyq?.correct || 0, n.metric?.pyq?.target || 0) + (n.metric?.lessons?.done || 0);
    }
    subjects[sid] = subjectProgress(data.nodes);
  }
  return { xp, solved, subjects };
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

module.exports = { TIERS, tierFor, subjectRank, subjectProgress, webScore, weekKey, saveScore, leaderboard };
