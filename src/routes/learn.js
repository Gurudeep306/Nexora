const express = require('express');
const { errMessage } = require("../http-error");
const fs = require('fs');
const path = require('path');
const { me } = require('../context');

/*
 * Nexora Learn — the coding questions of the course and each learner's
 * progress through lessons and the question bank.
 *


 * shape as Workshop problems, so the Solve page runs them unchanged.
 */

/*
 * Problems are stored one file per topic (src/learn/problems/<topic>.json) and
 * loaded on demand: the full set is large (tests, editorials, five-language
 * solutions), and a free server has little memory. The first request builds a
 * light index (slug → topic, plus list metadata); topic files are then parsed
 * when a problem in them is opened and kept in a small LRU cache.
 */
const PROBLEMS_DIR = path.join(__dirname, '..', 'learn', 'problems');
const CACHE_TOPICS = 6;
let index = null; // Map slug → summary
const topicCache = new Map(); // topic → Map slug → problem (insertion order = LRU)

function readTopic(topic) {
  const file = path.join(PROBLEMS_DIR, `${topic}.json`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map(raw.problems.map((p) => [p.slug, p]));
}

function problemIndex() {
  if (!index) {
    index = new Map();
    let files = [];
    try {
      files = fs.readdirSync(PROBLEMS_DIR).filter((f) => f.endsWith('.json'));
    } catch {
      files = [];
    }
    for (const f of files.sort()) {
      for (const p of readTopic(f.slice(0, -5)).values()) {
        index.set(p.slug, { slug: p.slug, title: p.title, topic: p.topic, page: p.page, difficulty: p.difficulty, tags: p.tags });
      }
    }
  }
  return index;
}

function findProblem(slug) {
  const meta = problemIndex().get(slug);
  if (!meta) return null;
  let probs = topicCache.get(meta.topic);
  if (probs) topicCache.delete(meta.topic);
  else probs = readTopic(meta.topic);
  topicCache.set(meta.topic, probs);
  while (topicCache.size > CACHE_TOPICS) topicCache.delete(topicCache.keys().next().value);
  return probs.get(slug) || null;
}

const ITEM_RE = /^(q|code|page):[a-z0-9_./-]{1,100}$/i;
const STATUSES = new Set(['correct', 'wrong', 'solved', 'attempted', 'read']);
const DONE = new Set(['correct', 'solved', 'read']);

function createLearnRouter({ get, all, run }) {
  const router = express.Router();

  const ready = run(`CREATE TABLE IF NOT EXISTS learn_progress (
    username TEXT NOT NULL,
    item TEXT NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    first_done_at TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (username, item)
  )`).catch((e) => console.error('[learn] table:', e.message));

  /* A coding problem, in the Workshop problem shape the Solve page adapts. */
  router.get('/api/learn/problems/:slug', (req, res) => {
    let p;
    try {
      p = findProblem(req.params.slug);
    } catch (e) {
      return res.status(500).json({ ok: false, error: errMessage(e) });
    }
    if (!p) return res.status(404).json({ ok: false, error: 'Unknown problem' });
    res.json({
      ok: true,
      problem: {
        id: p.slug,
        title: p.title,
        statement: p.statement,
        input_spec: p.input_spec,
        output_spec: p.output_spec,
        difficulty: p.difficulty,
        tags: JSON.stringify(p.tags),
        samples: JSON.stringify(p.samples),
        testcases: JSON.stringify(p.tests.map((t) => ({ input: t.input, expected_output: t.output }))),
        time_limit: p.time_limit,
        memory_limit: p.memory_limit,
        creator: '',
        learn: {
          topic: p.topic,
          page: p.page,
          editorial: p.editorial || null,
          solutions: p.solutions || {},
        },
      },
    });
  });

  /* Titles and difficulty of every coding problem (for the question bank). */
  router.get('/api/learn/problems', (_req, res) => {
    try {
      res.json({ ok: true, problems: [...problemIndex().values()] });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/learn/progress', async (_req, res) => {
    const u = me();
    if (!u) return res.status(401).json({ ok: false, error: 'Sign in to track progress' });
    try {
      await ready;
      const rows = await all('SELECT item, status, attempts, first_done_at, updated_at FROM learn_progress WHERE username=?', [u]);
      const items = {};
      for (const r of rows) items[r.item] = { status: r.status, attempts: r.attempts, doneAt: r.first_done_at, updatedAt: r.updated_at };
      res.json({ ok: true, items });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/learn/progress', async (req, res) => {
    const u = me();
    if (!u) return res.status(401).json({ ok: false, error: 'Sign in to track progress' });
    const { item, status } = req.body || {};
    if (typeof item !== 'string' || !ITEM_RE.test(item) || !STATUSES.has(status)) {
      return res.status(400).json({ ok: false, error: 'Bad progress item' });
    }
    try {
      await ready;
      const now = new Date().toISOString();
      const prev = await get('SELECT status, attempts, first_done_at FROM learn_progress WHERE username=? AND item=?', [u, item]);
      // Once done, an item stays done; later wrong attempts only add to the count.
      const nextStatus = prev && DONE.has(prev.status) ? prev.status : status;
      const firstDone = prev?.first_done_at || (DONE.has(status) ? now : null);
      const attempts = (prev?.attempts || 0) + (status === 'read' ? 0 : 1);
      if (prev) {
        await run('UPDATE learn_progress SET status=?, attempts=?, first_done_at=?, updated_at=? WHERE username=? AND item=?', [nextStatus, attempts, firstDone, now, u, item]);
      } else {
        await run('INSERT INTO learn_progress(username, item, status, attempts, first_done_at, updated_at) VALUES(?,?,?,?,?,?)', [u, item, nextStatus, attempts, firstDone, now]);
      }
      res.json({ ok: true, item, status: nextStatus, attempts });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  return router;
}

module.exports = { createLearnRouter };
