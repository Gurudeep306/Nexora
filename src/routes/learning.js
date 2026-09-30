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
  const {
    aiLimiter,
    get,
    all,
    run,
    fetch,
    _groqChat,
    _geminiComplete,
    _aiCache,
    AI_CACHE_MAX,
    AI_CACHE_TTL,
    _aiCacheKey,
    _buildGeminiPrompt,
  } = deps;

  const router = express.Router();

  router.post('/api/ai-chat', aiLimiter, async (req, res) => {
    try {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.status(500).json({ ok: false, error: 'GROQ_API_KEY not configured in .env' });

      const { statement, question, history } = req.body;
      if (!question || !question.trim()) return res.status(400).json({ ok: false, error: 'Question is required' });

      const systemPrompt = `You are an expert, encouraging competitive-programming tutor inside a problem-solving IDE. The student is working on one specific problem and wants conceptual help — not the answer handed to them.

How you respond:
- Lead with the direct answer to what they asked, then add only the detail that builds understanding.
- Plain, warm, precise sentences. Short. One idea per sentence. No filler, no "great question", no emojis.
- Use clean GitHub markdown: **bold** for key ideas, \`code\` for identifiers/values/complexities, - bullets and 1. steps for structure. Never dump a wall of unformatted text.
- Be specific to THIS problem. Refer to its actual constraints, examples and quantities. Avoid generic advice.
- Typically 80-180 words. Go longer only when the student asks for a full walkthrough.

Hard rules:
1. NEVER give a complete solution, working code, or pseudo-code that translates directly to code.
2. DO explain the approach, algorithm, data structure, key observation, invariants, and time/space complexity.
3. DO give hints, explain why a wrong approach fails, and walk through the provided examples step by step to build intuition.
4. You may NAME a well-known algorithm and explain how it works conceptually — but do not implement it.
5. If asked for code, decline briefly and offer the conceptual explanation instead.
6. If you are unsure, say so rather than inventing facts.

The student is working on this problem:
---
${(statement || 'No problem statement available').substring(0, 4000)}
---`;

      const messages = [{ role: 'system', content: systemPrompt }];
      if (Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: String(msg.content).substring(0, 1000) });
          }
        }
      }
      messages.push({ role: 'user', content: String(question).substring(0, 2000) });

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
          messages,
          max_tokens: 1024,
          temperature: 0.6,
        }),
      });

      if (!groqRes.ok) {
        const err = await groqRes.text();
        return res.status(groqRes.status).json({ ok: false, error: `Groq API error: ${err.substring(0, 200)}` });
      }

      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content || 'No response generated.';
      res.json({ ok: true, reply });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/ai-complete', aiLimiter, async (req, res) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      const groqKey = process.env.GROQ_API_KEY;
      if (!geminiKey && !groqKey) return res.json({ ok: false, text: '' });

      const { prefix, suffix, language } = req.body;
      if (!prefix || !language) return res.json({ ok: true, text: '' });

      const cacheKey = _aiCacheKey(prefix, suffix, language);
      const cached = _aiCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < AI_CACHE_TTL) {
        return res.json({ ok: true, text: cached.text });
      }

      const prefixCtx = prefix.split('\n').slice(-40).join('\n');
      const suffixCtx = (suffix || '').split('\n').slice(0, 10).join('\n');
      const lastLine = prefixCtx.split('\n').pop() || '';
      if (!lastLine.trim() && prefixCtx.trim().split('\n').length < 2) {
        return res.json({ ok: true, text: '' });
      }

      let rawText = '';
      if (geminiKey) {
        const prompt = _buildGeminiPrompt(language, prefixCtx, suffixCtx);
        const result = await _geminiComplete(geminiKey, prompt);
        if (result.ok) rawText = result.content;
      }

      if (!rawText && groqKey) {
        const systemPrompt = `You are an expert inline code completion engine for a competitive programming IDE. Language: ${language}.

YOUR ROLE: Predict exactly what the programmer is about to type next. Output ONLY the raw completion — no markdown, no fences, no explanations.

RULES:
1. Output at most 1-3 lines. Single-line is preferred.
2. Match the user's indentation, style, and variable naming exactly.
3. Complete: variable declarations, loop headers, I/O statements, function signatures, common data structure operations, return statements, include lines.
4. You MAY complete short algorithmic patterns if the user has clearly started writing one.
5. Do NOT output code that already appears before the cursor.
6. If no confident completion exists, output nothing.`;

        const userMsg = suffixCtx
          ? `[BEFORE CURSOR]\n${prefixCtx}\n[CURSOR]\n[AFTER CURSOR]\n${suffixCtx}`
          : `[BEFORE CURSOR]\n${prefixCtx}\n[CURSOR]`;

        const groqResult = await _groqChat(
          groqKey,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg },
          ],
          { maxTokens: 150, temperature: 0.05, stop: ['\n\n\n', '```'] }
        );

        if (groqResult.ok) rawText = groqResult.content;
      }

      let text = rawText.replace(/^```[\w]*\n?/, '').replace(/```$/, '').replace(/^Completion:\s*/i, '').trimEnd();
      const lines = text.split('\n');
      if (lines.length > 5) text = lines.slice(0, 3).join('\n');

      if (_aiCache.size >= AI_CACHE_MAX) _aiCache.delete(_aiCache.keys().next().value);
      _aiCache.set(cacheKey, { text, ts: Date.now() });

      res.json({ ok: true, text });
    } catch (e) {
      res.json({ ok: false, text: '' });
    }
  });

  router.post('/api/ai-fix', aiLimiter, async (req, res) => {
    try {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.status(500).json({ ok: false, error: 'GROQ_API_KEY not configured' });

      const { code, language, error } = req.body;
      if (!code || !language) return res.status(400).json({ ok: false, error: 'code and language required' });

      const systemPrompt = `You are a code syntax fixer for competitive programming. The user has a ${language} program with a compile or runtime error.

STRICT RULES:
1. ONLY fix syntax errors, typos, missing semicolons, wrong brackets, missing includes/imports, type mismatches, and similar small mistakes.
2. NEVER change the algorithm or logic. NEVER add new algorithmic code.
3. NEVER restructure or refactor the code.
4. If the code has logic errors (wrong algorithm), say "NO_FIX" — you cannot fix those.
5. Return ONLY the corrected full code. No explanations, no markdown, no code fences.
6. Preserve the user's style, variable names, and structure exactly.
7. If you cannot determine a fix, return "NO_FIX".`;

      const userMsg = `[CODE]\n${code.substring(0, 4000)}\n\n[ERROR]\n${(error || 'Compilation error').substring(0, 500)}`;
      const groqResult = await _groqChat(apiKey, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], {
        maxTokens: 2048,
        temperature: 0.0,
      });

      if (!groqResult.ok) {
        return res.status(groqResult.status || 500).json({ ok: false, error: `AI error: ${(groqResult.error || '').substring(0, 200)}` });
      }

      let fixedCode = groqResult.content.trim();
      fixedCode = fixedCode.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
      if (fixedCode === 'NO_FIX') return res.json({ ok: false, error: 'AI could not safely fix this code' });
      res.json({ ok: true, code: fixedCode });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

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
