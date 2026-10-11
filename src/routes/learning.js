const express = require('express');
const { errMessage } = require("../http-error");
const forgePaths = require('../dev-roadmap-data');
const { me, meSql } = require('../context');

const TOPIC_TAG_MAP = {
  complexity: ['implementation', 'math'],
  arrays: ['implementation', 'data structures', 'two pointers'],
  sorting: ['sortings', 'greedy', 'implementation'],
  'binary-search': ['binary search', 'sortings', 'math'],
  'stacks-queues': ['data structures', 'implementation', 'expression parsing'],
  hashing: ['hashing', 'data structures', 'implementation'],
  'linked-lists': ['data structures', 'implementation'],
  heaps: ['data structures', 'greedy', 'sortings'],
  'dynamic-programming': ['dp', 'math', 'combinatorics'],
  graphs: ['graphs', 'dfs and similar', 'shortest paths'],
  greedy: ['greedy', 'sortings', 'math'],
  trees: ['trees', 'dfs and similar', 'data structures'],
  'number-theory': ['number theory', 'math', 'combinatorics'],
  'bit-manipulation': ['bitmasks', 'math', 'dp'],
  'segment-trees': ['data structures', 'trees', 'dp'],
  'disjoint-set': ['dsu', 'graphs', 'data structures'],
  'string-algorithms': ['strings', 'string suffix structures', 'hashing'],
  tries: ['strings', 'data structures', 'bitmasks'],
  'game-theory': ['games', 'math', 'dp'],
  geometry: ['geometry', 'math', 'implementation'],
  'linear-algebra-ml': ['math', 'matrices', 'implementation'],
  'probability-stats': ['probabilities', 'math', 'combinatorics'],
  'data-preprocessing': ['implementation', 'math', 'sortings'],
  'supervised-learning': ['math', 'implementation', 'greedy'],
  'unsupervised-learning': ['math', 'implementation', 'data structures'],
  'ensemble-methods': ['math', 'greedy', 'implementation'],
  'deep-learning-fundamentals': ['math', 'matrices', 'implementation'],
  cnns: ['math', 'matrices', 'implementation'],
  nlp: ['strings', 'hashing', 'implementation'],
  'reinforcement-learning': ['games', 'dp', 'math'],
  'generative-ai': ['math', 'implementation', 'constructive algorithms'],
  'model-deployment': ['implementation', 'math', 'data structures'],
  'ethics-ai': ['implementation', 'math', 'constructive algorithms'],
};

function createLearningRouter(deps) {
  // AI chat / completion / fix moved to the Groq agent (src/routes/agent.js).
  const { get, all, run } = deps;

  const router = express.Router();

  router.get('/api/ai-problems', async (req, res) => {
    try {
      const category = req.query.category || 'all';
      const problems =
        category === 'all'
          ? await all('SELECT * FROM ai_problems ORDER BY category, id')
          : await all('SELECT * FROM ai_problems WHERE category = ? ORDER BY id', [category]);
      // One query for all progress rows instead of one per problem (N+1).
      const progRows = await all('SELECT problem_id, status FROM ai_progress WHERE username = ?', [me()]);
      const statusById = new Map(progRows.map((r) => [r.problem_id, r.status]));
      for (const p of problems) p.status = statusById.get(p.id) || 'unsolved';
      res.json({ ok: true, problems });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/ai-problems/:id', async (req, res) => {
    try {
      const problem = await get('SELECT * FROM ai_problems WHERE id = ?', [req.params.id]);
      if (!problem) return res.status(404).json({ ok: false, error: 'Not found' });
      const prog = await get('SELECT * FROM ai_progress WHERE username = ? AND problem_id = ?', [me(), problem.id]);
      problem.progress = prog || null;
      res.json({ ok: true, problem });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/ai-problems/:id/progress', async (req, res) => {
    try {
      const { status, notes } = req.body;
      const existing = await get('SELECT * FROM ai_progress WHERE username = ? AND problem_id = ?', [me(), req.params.id]);
      if (existing) {
        await run('UPDATE ai_progress SET status = ?, notes = ?, completed_at = ? WHERE username = ? AND problem_id = ?', [
          status || existing.status,
          notes !== undefined ? notes : existing.notes,
          status === 'solved' ? new Date().toISOString() : existing.completed_at,
          me(),
          req.params.id,
        ]);
      } else {
        await run('INSERT INTO ai_progress(username, problem_id, status, notes, completed_at) VALUES(?, ?, ?, ?, ?)', [
          me(),
          req.params.id,
          status || 'in-progress',
          notes || '',
          status === 'solved' ? new Date().toISOString() : null,
        ]);
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/ai-stats', async (_req, res) => {
    try {
      const total = await get('SELECT COUNT(*) as c FROM ai_problems');
      const solved = await get("SELECT COUNT(*) as c FROM ai_progress WHERE username = ? AND status = 'solved'", [me()]);
      const inProgress = await get("SELECT COUNT(*) as c FROM ai_progress WHERE username = ? AND status = 'in-progress'", [me()]);
      const byCategory = await all(`SELECT ap.category, COUNT(*) as total,
        SUM(CASE WHEN pr.status = 'solved' THEN 1 ELSE 0 END) as solved
        FROM ai_problems ap LEFT JOIN ai_progress pr ON ap.id = pr.problem_id AND pr.username = ${meSql()}
        GROUP BY ap.category`);
      res.json({ ok: true, total: total.c, solved: solved.c, inProgress: inProgress.c, byCategory });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/tutorial-problems/:topic', async (req, res) => {
    try {
      const topic = req.params.topic;
      const tags = TOPIC_TAG_MAP[topic] || ['implementation'];
      const placeholders = tags.map(() => 'p.tags LIKE ?').join(' OR ');
      const params = tags.map(t => `%${t}%`);
      const problems = await all(
        `SELECT p.*, COALESCE(pr.status,'unsolved') as solve_status
         FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
         WHERE (${placeholders})
         ORDER BY p.rating ASC
         LIMIT 30`,
        params
      );
      res.json({ ok: true, problems });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/tutorials', async (req, res) => {
    try {
      const { category } = req.query;
      const tutorials =
        category && category !== 'all'
          ? await all('SELECT * FROM tutorials WHERE category = ? ORDER BY order_index', [category])
          : await all('SELECT * FROM tutorials ORDER BY category, order_index');
      // One query for all progress rows instead of one per tutorial (N+1).
      const progRows = await all('SELECT tutorial_id, completed FROM tutorial_progress WHERE username = ?', [me()]);
      const doneById = new Map(progRows.map((r) => [r.tutorial_id, r.completed]));
      for (const t of tutorials) t.completed = doneById.get(t.id) || 0;
      res.json({ ok: true, tutorials });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/tutorials/:id', async (req, res) => {
    try {
      const tutorial = await get('SELECT * FROM tutorials WHERE id = ?', [req.params.id]);
      if (!tutorial) return res.status(404).json({ ok: false, error: 'Not found' });
      const prog = await get('SELECT * FROM tutorial_progress WHERE username = ? AND tutorial_id = ?', [me(), tutorial.id]);
      tutorial.completed = prog ? prog.completed : 0;
      res.json({ ok: true, tutorial });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/tutorials/:id/complete', async (req, res) => {
    try {
      const existing = await get('SELECT * FROM tutorial_progress WHERE username = ? AND tutorial_id = ?', [me(), req.params.id]);
      if (existing) {
        await run('UPDATE tutorial_progress SET completed = 1, completed_at = ? WHERE username = ? AND tutorial_id = ?', [
          new Date().toISOString(),
          me(),
          req.params.id,
        ]);
      } else {
        await run('INSERT INTO tutorial_progress(username, tutorial_id, completed, completed_at) VALUES(?, ?, 1, ?)', [
          me(),
          req.params.id,
          new Date().toISOString(),
        ]);
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/tutorial-stats', async (_req, res) => {
    try {
      const total = await get('SELECT COUNT(*) as c FROM tutorials');
      const completed = await get('SELECT COUNT(*) as c FROM tutorial_progress WHERE username = ? AND completed = 1', [me()]);
      const byCategory = await all(`SELECT t.category, COUNT(*) as total,
        SUM(CASE WHEN tp.completed = 1 THEN 1 ELSE 0 END) as completed
        FROM tutorials t LEFT JOIN tutorial_progress tp ON t.id = tp.tutorial_id AND tp.username = ${meSql()}
        GROUP BY t.category`);
      res.json({ ok: true, total: total.c, completed: completed.c, byCategory });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/forge/paths', async (_req, res) => {
    try {
      const progress = await all('SELECT * FROM forge_progress WHERE username = ?', [me()]);
      const progressMap = {};
      for (const p of progress) progressMap[p.topic_id] = p;

      const paths = forgePaths.map(path => {
        let totalTopics = 0;
        let completedTopics = 0;
        let inProgressTopics = 0;
        const milestones = path.milestones.map(ms => {
          const topics = ms.topics.map(t => {
            totalTopics++;
            const prog = progressMap[t.id];
            const status = prog ? prog.status : 'not-started';
            if (status === 'completed') completedTopics++;
            else if (status === 'in-progress') inProgressTopics++;
            return { ...t, status };
          });
          return { ...ms, topics };
        });
        const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
        return { ...path, milestones, totalTopics, completedTopics, inProgressTopics, progress: pct };
      });
      res.json({ ok: true, paths });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/forge/path/:id', async (req, res) => {
    try {
      const path = forgePaths.find(p => p.id === req.params.id);
      if (!path) return res.status(404).json({ ok: false, error: 'Path not found' });
      const progress = await all('SELECT * FROM forge_progress WHERE username = ? AND path_id = ?', [me(), path.id]);
      const progressMap = {};
      for (const p of progress) progressMap[p.topic_id] = p;
      let totalTopics = 0;
      let completedTopics = 0;
      const milestones = path.milestones.map(ms => {
        const topics = ms.topics.map(t => {
          totalTopics++;
          const prog = progressMap[t.id];
          const status = prog ? prog.status : 'not-started';
          if (status === 'completed') completedTopics++;
          return { ...t, status };
        });
        return { ...ms, topics };
      });
      const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
      res.json({ ok: true, path: { ...path, milestones, totalTopics, completedTopics, progress: pct } });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/forge/topic/:id/status', async (req, res) => {
    try {
      const { status, pathId } = req.body;
      if (!['not-started', 'in-progress', 'completed'].includes(status)) {
        return res.status(400).json({ ok: false, error: 'Invalid status' });
      }
      const existing = await get('SELECT * FROM forge_progress WHERE username = ? AND topic_id = ?', [me(), req.params.id]);
      if (existing) {
        await run('UPDATE forge_progress SET status = ?, completed_at = ? WHERE username = ? AND topic_id = ?', [
          status,
          status === 'completed' ? new Date().toISOString() : null,
          me(),
          req.params.id,
        ]);
      } else {
        await run('INSERT INTO forge_progress(username, topic_id, path_id, status, completed_at) VALUES(?, ?, ?, ?, ?)', [
          me(),
          req.params.id,
          pathId || '',
          status,
          status === 'completed' ? new Date().toISOString() : null,
        ]);
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/forge/stats', async (_req, res) => {
    try {
      const total = forgePaths.reduce((sum, p) => sum + p.milestones.reduce((s, m) => s + m.topics.length, 0), 0);
      const completed = await get('SELECT COUNT(*) as c FROM forge_progress WHERE username = ? AND status = ?', [me(), 'completed']);
      const inProgress = await get('SELECT COUNT(*) as c FROM forge_progress WHERE username = ? AND status = ?', [me(), 'in-progress']);
      res.json({ ok: true, total, completed: completed.c, inProgress: inProgress.c });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/dashboard-layout', async (_req, res) => {
    try {
      const row = await get("SELECT value FROM settings WHERE username = ? AND key = 'dashboard_layout'", [me()]);
      const layout = row ? JSON.parse(row.value) : {};
      res.json({ ok: true, layout });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/dashboard-layout', async (req, res) => {
    try {
      const { layout } = req.body;
      await run("INSERT OR REPLACE INTO settings(username, key, value) VALUES(?, 'dashboard_layout', ?)", [me(), JSON.stringify(layout)]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  return router;
}

module.exports = { createLearningRouter };
