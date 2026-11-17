// "For you today" on Home: a few real things to do, picked from what the site
// actually has and what this person has not done yet. The set changes every
// day (and on Shuffle), seeded by the person and the date, so it is stable
// within a day but never stale. Nothing is invented: every pick is a real
// problem, GATE question or notes lesson.
const express = require("express");
const { me } = require("../context");
const { getOpenCatalog: getCatalog } = require("../problem-catalog"); // sources that are off stay out
const { loadGateBank } = require("./gate");
const { loadGateNotes } = require("./gate-notes");
const { hasAnyAdminPerm } = require("../authz/permissions");

/** A small seeded random generator (mulberry32) from a string. */
function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rand) => (arr.length ? arr[Math.floor(rand() * arr.length)] : null);

function parseTags(t) {
  try {
    const v = JSON.parse(t || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * The level to aim at: a little above the median rating of the last problems
 * solved, or an easy start for a newcomer.
 */
function targetRating(solvedRatings) {
  const r = solvedRatings.filter((x) => x > 0).slice(-15).sort((a, b) => a - b);
  if (!r.length) return 900;
  return r[Math.floor(r.length / 2)] + 100;
}

function createTodayRouter({ all }) {
  const router = express.Router();

  router.get("/api/today/picks", async (req, res) => {
    try {
      const user = me();
      const day = new Date().toISOString().slice(0, 10);
      const shuffle = Math.max(0, Math.min(999, Number(req.query.shuffle) || 0));
      const rand = rng(`${user}|${day}|${shuffle}`);
      const out = { day, problem: null, gate: null, notes: [] };

      // A problem near this person's level they have not solved.
      const catalog = await getCatalog();
      const progress = await all("SELECT problem_rowid, status, solved_at FROM progress WHERE username=?", [user]);
      const done = new Set(progress.filter((p) => p.status === "solved").map((p) => p.problem_rowid));
      const tried = new Set(progress.filter((p) => p.status === "attempted").map((p) => p.problem_rowid));
      const byIdx = catalog.byId;
      const solvedRatings = progress
        .filter((p) => p.status === "solved")
        .sort((a, b) => String(a.solved_at || "").localeCompare(String(b.solved_at || "")))
        .map((p) => catalog.rows[byIdx.get(p.problem_rowid)]?.rating || 0);
      const target = targetRating(solvedRatings);
      const near = catalog.rows.filter((p) => !done.has(p.id) && p.rating >= target - 200 && p.rating <= target + 300);
      const pool = near.length ? near : catalog.rows.filter((p) => !done.has(p.id));
      // An attempted-but-unsolved problem comes back now and then.
      const retry = catalog.rows.filter((p) => tried.has(p.id));
      const p = retry.length && rand() < 0.3 ? pick(retry, rand) : pick(pool, rand);
      if (p) {
        out.problem = {
          id: p.id,
          title: p.title,
          platform: p.platform,
          rating: p.rating || 0,
          tags: parseTags(p.tags).slice(0, 3),
          retry: tried.has(p.id),
          target,
        };
      }

      // A GATE past question from the subject this person finds hardest,
      // one they have not attempted, with a checked answer.
      const bank = loadGateBank();
      const attempts = await all("SELECT question_id, subject, outcome FROM gate_attempts WHERE username=?", [user]);
      const seen = new Set(attempts.map((a) => a.question_id));
      const bySubject = new Map();
      for (const a of attempts) {
        if (!a.subject) continue;
        const s = bySubject.get(a.subject) || { n: 0, right: 0 };
        s.n += 1;
        if (a.outcome === "correct") s.right += 1;
        bySubject.set(a.subject, s);
      }
      const weak = [...bySubject.entries()].filter(([, s]) => s.n >= 3).sort((x, y) => x[1].right / x[1].n - y[1].right / y[1].n)[0]?.[0];
      const ready = bank.questions.filter((q) => q.exam !== "DA" && q.answer != null && !q.needsReview && !seen.has(q.id));
      const fromWeak = weak ? ready.filter((q) => q.subject === weak) : [];
      const q = pick(fromWeak.length ? fromWeak : ready, rand);
      if (q) {
        // A readable one-line preview: maths kept as plain text, markup removed.
        const text = String(q.text || "")
          .replace(/\$\$?([^$]*)\$\$?/g, "$1")
          .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
          .replace(/\\[a-zA-Z]+/g, "")
          .replace(/[{}]/g, "")
          .replace(/<[^>]+>/g, "")
          .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
          .replace(/[*_`#>]+/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const subj = (bank.subjects?.[q.exam || "CSE"] || bank.subjects?.CSE || {})[q.subject] || {};
        out.gate = {
          id: q.id,
          year: q.year,
          subject: q.subject,
          subjectName: subj.name || q.subject,
          topicName: (q.topic && subj.topics?.[q.topic]) || null,
          topic: q.topic || null,
          marks: q.marks,
          type: q.type,
          preview: text.length < 30 ? "" : text.length > 140 ? `${text.slice(0, 137)}…` : text,
          weak: !!(weak && q.subject === weak),
        };
      }

      // Notes lessons the visitor can open, in today's order; the client
      // skips the ones this person has finished.
      const staff = hasAnyAdminPerm(req);
      const lessons = [];
      for (const [sid, s] of loadGateNotes().subjects) {
        if (s.card.hidden && !staff) continue;
        for (const [lid, l] of s.lessons) {
          lessons.push({ subject: sid, subjectTitle: s.card.title, id: lid, title: l.lesson.title, minutes: l.lesson.est_minutes || 0, chapter: l.chapter.title });
        }
      }
      for (let i = lessons.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [lessons[i], lessons[j]] = [lessons[j], lessons[i]];
      }
      out.notes = lessons.slice(0, 8);

      res.json({ ok: true, ...out });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

module.exports = { createTodayRouter, targetRating, rng };
