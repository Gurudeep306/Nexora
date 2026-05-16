const express = require('express');
const multer = require('multer');
const forgePaths = require('../dev-roadmap-data');

function createStudioRouter(deps) {
  const { get, all, run, fetch, path, fs, studioAuth, _groqChat } = deps;
  const router = express.Router();

  const studioUploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'studio');
  if (!fs.existsSync(studioUploadDir)) fs.mkdirSync(studioUploadDir, { recursive: true });
  const studioStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, studioUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
  const studioUpload = multer({
    storage: studioStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|pdf|svg)$/i.test(file.originalname);
      cb(ok ? null : new Error('Unsupported file type'), ok);
    },
  });

  router.get('/studio', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'studio.html'));
  });

  router.post('/api/studio/upload', studioAuth, studioUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file' });
    const url = `/uploads/studio/${req.file.filename}`;
    res.json({ ok: true, url, name: req.file.originalname, size: req.file.size });
  });

  router.get('/api/studio/courses', studioAuth, async (_req, res) => {
    try {
      const courses = await all('SELECT * FROM cms_courses ORDER BY order_idx, id');
      for (const c of courses) {
        c.chapters = await all('SELECT * FROM cms_chapters WHERE course_id=? ORDER BY order_idx, id', [c.id]);
        for (const ch of c.chapters) {
          ch.lessons = await all(
            'SELECT id, title, slug, order_idx, published, duration_min FROM cms_lessons WHERE chapter_id=? ORDER BY order_idx, id',
            [ch.id]
          );
        }
      }
      res.json({ ok: true, courses });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/courses', studioAuth, async (req, res) => {
    try {
      const { title, description = '', icon = '📚', color = '#6c63ff', section = 'learn', order_idx = 0 } = req.body;
      if (!title) return res.status(400).json({ ok: false, error: 'title required' });
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const r = await run('INSERT INTO cms_courses(slug,title,description,icon,color,section,order_idx) VALUES(?,?,?,?,?,?,?)', [
        slug,
        title,
        description,
        icon,
        color,
        section,
        order_idx,
      ]);
      res.json({ ok: true, id: r.lastID, slug });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/studio/courses/:id', studioAuth, async (req, res) => {
    try {
      const { title, description, icon, color, section, order_idx, published } = req.body;
      await run(
        `UPDATE cms_courses SET title=COALESCE(?,title), description=COALESCE(?,description),
          icon=COALESCE(?,icon), color=COALESCE(?,color), section=COALESCE(?,section),
          order_idx=COALESCE(?,order_idx), published=COALESCE(?,published),
          updated_at=datetime('now') WHERE id=?`,
        [title, description, icon, color, section, order_idx, published, req.params.id]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/api/studio/courses/:id', studioAuth, async (req, res) => {
    try {
      await run('DELETE FROM cms_courses WHERE id=?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/chapters', studioAuth, async (req, res) => {
    try {
      const { course_id, title, description = '', order_idx = 0 } = req.body;
      if (!course_id || !title) return res.status(400).json({ ok: false, error: 'course_id + title required' });
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const r = await run('INSERT INTO cms_chapters(course_id,slug,title,description,order_idx) VALUES(?,?,?,?,?)', [
        course_id,
        slug,
        title,
        description,
        order_idx,
      ]);
      res.json({ ok: true, id: r.lastID, slug });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/studio/chapters/:id', studioAuth, async (req, res) => {
    try {
      const { title, description, order_idx, published } = req.body;
      await run(
        `UPDATE cms_chapters SET title=COALESCE(?,title), description=COALESCE(?,description),
          order_idx=COALESCE(?,order_idx), published=COALESCE(?,published) WHERE id=?`,
        [title, description, order_idx, published, req.params.id]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/api/studio/chapters/:id', studioAuth, async (req, res) => {
    try {
      await run('DELETE FROM cms_chapters WHERE id=?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/lessons/:id', studioAuth, async (req, res) => {
    try {
      const lesson = await get('SELECT * FROM cms_lessons WHERE id=?', [req.params.id]);
      if (!lesson) return res.status(404).json({ ok: false, error: 'Not found' });
      lesson.linked_problems = await all(
        `SELECT lp.id, lp.order_idx, p.id as problem_id, p.title, p.rating, p.platform, p.tags,
                cp.id as custom_problem_id, cp.title as cp_title, cp.difficulty as cp_rating
         FROM cms_lesson_problems lp
         LEFT JOIN problems p ON lp.problem_id = p.id
         LEFT JOIN custom_problems cp ON lp.custom_problem_id = cp.id
         WHERE lp.lesson_id=? ORDER BY lp.order_idx`,
        [lesson.id]
      );
      res.json({ ok: true, lesson });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/lessons', studioAuth, async (req, res) => {
    try {
      const { chapter_id, title, content = '', duration_min = 10, order_idx = 0 } = req.body;
      if (!chapter_id || !title) return res.status(400).json({ ok: false, error: 'chapter_id + title required' });
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
      const r = await run('INSERT INTO cms_lessons(chapter_id,slug,title,content,duration_min,order_idx) VALUES(?,?,?,?,?,?)', [
        chapter_id,
        slug,
        title,
        content,
        duration_min,
        order_idx,
      ]);
      res.json({ ok: true, id: r.lastID, slug });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/studio/lessons/:id', studioAuth, async (req, res) => {
    try {
      const { title, content, duration_min, order_idx, published } = req.body;
      await run(
        `UPDATE cms_lessons SET title=COALESCE(?,title), content=COALESCE(?,content),
          duration_min=COALESCE(?,duration_min), order_idx=COALESCE(?,order_idx),
          published=COALESCE(?,published), updated_at=datetime('now') WHERE id=?`,
        [title, content, duration_min, order_idx, published, req.params.id]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/api/studio/lessons/:id', studioAuth, async (req, res) => {
    try {
      await run('DELETE FROM cms_lessons WHERE id=?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/lessons/:id/problems', studioAuth, async (req, res) => {
    try {
      const { problem_id, custom_problem_id, order_idx = 0 } = req.body;
      if (!problem_id && !custom_problem_id) {
        return res.status(400).json({ ok: false, error: 'problem_id or custom_problem_id required' });
      }
      const r = await run('INSERT INTO cms_lesson_problems(lesson_id,problem_id,custom_problem_id,order_idx) VALUES(?,?,?,?)', [
        req.params.id,
        problem_id || null,
        custom_problem_id || null,
        order_idx,
      ]);
      res.json({ ok: true, id: r.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/api/studio/lessons/:lessonId/problems/:linkId', studioAuth, async (req, res) => {
    try {
      await run('DELETE FROM cms_lesson_problems WHERE id=? AND lesson_id=?', [req.params.linkId, req.params.lessonId]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/create-problem', studioAuth, async (req, res) => {
    try {
      const {
        title,
        statement,
        input_spec = '',
        output_spec = '',
        difficulty = 1200,
        tags = '[]',
        time_limit = '2 seconds',
        memory_limit = '256 MB',
        samples = '[]',
        testcases = '[]',
      } = req.body;
      if (!title) return res.status(400).json({ ok: false, error: 'title required' });

      const r = await run(
        `INSERT INTO custom_problems(title,statement,input_spec,output_spec,difficulty,tags,samples,testcases,time_limit,memory_limit,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
        [
          title,
          statement,
          input_spec,
          output_spec,
          difficulty,
          typeof tags === 'string' ? tags : JSON.stringify(tags),
          typeof samples === 'string' ? samples : JSON.stringify(samples),
          typeof testcases === 'string' ? testcases : JSON.stringify(testcases),
          time_limit,
          memory_limit,
        ]
      );
      res.json({ ok: true, id: r.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/cms/courses', async (req, res) => {
    try {
      const section = req.query.section || null;
      const courses = await all(
        `SELECT * FROM cms_courses WHERE published=1 ${section ? 'AND section=?' : ''} ORDER BY order_idx, id`,
        section ? [section] : []
      );
      for (const c of courses) {
        c.chapters = await all('SELECT * FROM cms_chapters WHERE course_id=? AND published=1 ORDER BY order_idx, id', [c.id]);
        for (const ch of c.chapters) {
          ch.lessons = await all(
            'SELECT id, title, slug, order_idx, duration_min FROM cms_lessons WHERE chapter_id=? AND published=1 ORDER BY order_idx, id',
            [ch.id]
          );
        }
      }
      res.json({ ok: true, courses });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/cms/lessons/:id', async (req, res) => {
    try {
      const lesson = await get('SELECT * FROM cms_lessons WHERE id=? AND published=1', [req.params.id]);
      if (!lesson) return res.status(404).json({ ok: false, error: 'Not found' });
      lesson.linked_problems = await all(
        `SELECT lp.order_idx, p.id as problem_id, p.title, p.rating, p.platform, p.tags, p.url,
                cp.id as custom_problem_id, cp.title as cp_title, cp.difficulty as cp_rating
         FROM cms_lesson_problems lp
         LEFT JOIN problems p ON lp.problem_id = p.id
         LEFT JOIN custom_problems cp ON lp.custom_problem_id = cp.id
         WHERE lp.lesson_id=? ORDER BY lp.order_idx`,
        [lesson.id]
      );
      res.json({ ok: true, lesson });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/reorder', studioAuth, async (req, res) => {
    try {
      const { type, items } = req.body;
      const table = { course: 'cms_courses', chapter: 'cms_chapters', lesson: 'cms_lessons' }[type];
      if (!table) return res.status(400).json({ ok: false, error: 'invalid type' });
      for (const { id, order_idx } of items) {
        await run(`UPDATE ${table} SET order_idx=? WHERE id=?`, [order_idx, id]);
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/search-problems', studioAuth, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const type = req.query.type || 'all';
      let results = [];
      if (type !== 'custom') {
        results = await all(`SELECT id, title, rating, platform, tags FROM problems WHERE title LIKE ? ORDER BY rating DESC LIMIT 20`, [
          `%${q}%`,
        ]);
      }
      if (type !== 'platform') {
        const custom = await all(
          `SELECT id, title, difficulty as rating, 'custom' as platform, tags
           FROM custom_problems WHERE title LIKE ? ORDER BY difficulty LIMIT 20`,
          [`%${q}%`]
        );
        results = [...results, ...custom];
      }
      res.json({ ok: true, results });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/media-list', studioAuth, (_req, res) => {
    try {
      if (!fs.existsSync(studioUploadDir)) return res.json({ ok: true, files: [] });
      const files = fs.readdirSync(studioUploadDir).filter(f => !f.startsWith('.')).map(name => ({ name, url: `/uploads/studio/${name}` }));
      res.json({ ok: true, files });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/tutorials', studioAuth, async (_req, res) => {
    try {
      const rows = await all('SELECT id,category,topic,title,description,difficulty,order_index,estimated_time FROM tutorials ORDER BY category,order_index');
      const grouped = {};
      for (const r of rows) {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push(r);
      }
      res.json({ ok: true, grouped, total: rows.length });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/tutorials/:id', studioAuth, async (req, res) => {
    try {
      const row = await get('SELECT * FROM tutorials WHERE id=?', [req.params.id]);
      if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
      res.json({ ok: true, tutorial: row });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/studio/tutorials/:id', studioAuth, async (req, res) => {
    try {
      const { title, description, content, difficulty, estimated_time, category, topic, order_index } = req.body;
      await run(
        `UPDATE tutorials SET title=COALESCE(?,title),description=COALESCE(?,description),content=COALESCE(?,content),difficulty=COALESCE(?,difficulty),estimated_time=COALESCE(?,estimated_time),category=COALESCE(?,category),topic=COALESCE(?,topic),order_index=COALESCE(?,order_index) WHERE id=?`,
        [title || null, description || null, content || null, difficulty || null, estimated_time || null, category || null, topic || null, order_index != null ? order_index : null, req.params.id]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/tutorials', studioAuth, async (req, res) => {
    try {
      const { title, description, content, difficulty, estimated_time, category, topic, order_index } = req.body;
      if (!title || !category || !topic) return res.status(400).json({ ok: false, error: 'title, category, topic required' });
      const r = await run('INSERT INTO tutorials(category,topic,title,description,content,difficulty,order_index,estimated_time) VALUES(?,?,?,?,?,?,?,?)', [
        category,
        topic,
        title,
        description || '',
        content || '',
        difficulty || 'beginner',
        order_index || 0,
        estimated_time || '15 min',
      ]);
      res.json({ ok: true, id: r.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/api/studio/tutorials/:id', studioAuth, async (req, res) => {
    try {
      await run('DELETE FROM tutorials WHERE id=?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/ai-problems-list', studioAuth, async (_req, res) => {
    try {
      const rows = await all('SELECT id,category,title,difficulty,tags FROM ai_problems ORDER BY category,id');
      const grouped = {};
      for (const r of rows) {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push(r);
      }
      res.json({ ok: true, grouped, total: rows.length });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/ai-problems/:id', studioAuth, async (req, res) => {
    try {
      const row = await get('SELECT * FROM ai_problems WHERE id=?', [req.params.id]);
      if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
      res.json({ ok: true, problem: row });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/studio/ai-problems/:id', studioAuth, async (req, res) => {
    try {
      const fields = ['title', 'description', 'difficulty', 'tags', 'starter_code', 'solution_approach', 'hints', 'resources', 'input_format', 'output_format', 'constraints', 'samples', 'category'];
      const sets = [];
      const vals = [];
      for (const f of fields) {
        if (req.body[f] != null) {
          sets.push(`${f}=?`);
          vals.push(req.body[f]);
        }
      }
      if (sets.length) await run(`UPDATE ai_problems SET ${sets.join(',')} WHERE id=?`, [...vals, req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/ai-problems-new', studioAuth, async (req, res) => {
    try {
      const { category, title, description, difficulty, tags, starter_code, solution_approach, hints, resources, input_format, output_format, constraints, samples } = req.body;
      if (!title || !category) return res.status(400).json({ ok: false, error: 'title and category required' });
      const r = await run(
        'INSERT INTO ai_problems(category,title,description,difficulty,tags,starter_code,solution_approach,hints,resources,input_format,output_format,constraints,samples) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [category, title, description || '', difficulty || 'beginner', tags || '[]', starter_code || '', solution_approach || '', hints || '[]', resources || '[]', input_format || '', output_format || '', constraints || '', samples || '[]']
      );
      res.json({ ok: true, id: r.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/api/studio/ai-problems/:id', studioAuth, async (req, res) => {
    try {
      await run('DELETE FROM ai_problems WHERE id=?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/forge', studioAuth, async (_req, res) => {
    try {
      const overrides = await all('SELECT * FROM forge_content');
      const overrideMap = {};
      for (const o of overrides) overrideMap[o.topic_id] = o;
      const paths = forgePaths.map(p => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
        color: p.color,
        description: p.description,
        milestones: p.milestones.map(m => ({
          id: m.id,
          title: m.title,
          topics: m.topics.map(t => {
            const ov = overrideMap[t.id] || {};
            return {
              id: t.id,
              path_id: p.id,
              milestone_id: m.id,
              title: ov.title || t.title,
              description: ov.description || t.desc,
              content_html: ov.content_html || '',
              difficulty: ov.difficulty || t.difficulty,
              time_estimate: ov.time_estimate || t.time,
              has_override: !!overrideMap[t.id],
            };
          }),
        })),
      }));
      res.json({ ok: true, paths });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/forge/:topicId', studioAuth, async (req, res) => {
    try {
      const ov = await get('SELECT * FROM forge_content WHERE topic_id=?', [req.params.topicId]);
      let staticTopic = null;
      for (const p of forgePaths) {
        for (const m of p.milestones) {
          const t = m.topics.find(topic => topic.id === req.params.topicId);
          if (t) {
            staticTopic = { ...t, path_id: p.id };
            break;
          }
        }
        if (staticTopic) break;
      }
      res.json({ ok: true, override: ov || null, static: staticTopic });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/studio/forge/:topicId', studioAuth, async (req, res) => {
    try {
      const { path_id, title, description, content_html, difficulty, time_estimate } = req.body;
      await run(
        `INSERT INTO forge_content(topic_id,path_id,title,description,content_html,difficulty,time_estimate,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
         ON CONFLICT(topic_id) DO UPDATE SET title=COALESCE(excluded.title,title),description=COALESCE(excluded.description,description),content_html=COALESCE(excluded.content_html,content_html),difficulty=COALESCE(excluded.difficulty,difficulty),time_estimate=COALESCE(excluded.time_estimate,time_estimate),updated_at=CURRENT_TIMESTAMP`,
        [req.params.topicId, path_id || '', title || null, description || null, content_html || null, difficulty || null, time_estimate || null]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/all-problems', studioAuth, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const limit = Math.min(+(req.query.limit || 60), 200);
      const offset = +(req.query.offset || 0);
      const where = q ? 'WHERE p.title LIKE ?' : '';
      const params = q ? [`%${q}%`, limit, offset] : [limit, offset];
      const rows = await all(
        `SELECT p.id,p.title,p.platform,p.rating,p.tags,p.category,ps.statement,ps.input_spec,ps.output_spec,ps.samples
         FROM problems p LEFT JOIN problem_statements ps ON ps.problem_rowid=p.id ${where} ORDER BY p.rating DESC LIMIT ? OFFSET ?`,
        params
      );
      const tot = await get(`SELECT COUNT(*) as c FROM problems ${where}`, q ? [`%${q}%`] : []);
      res.json({ ok: true, problems: rows, total: tot.c });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/studio/platform-problems/:id', studioAuth, async (req, res) => {
    try {
      const { title, rating, tags, category, statement, input_spec, output_spec, samples } = req.body;
      const metaFields = [['title', title], ['rating', rating != null ? +rating : null], ['tags', tags], ['category', category]].filter(([, v]) => v != null);
      if (metaFields.length) {
        const sets = metaFields.map(([f]) => `${f}=?`).join(',');
        await run(`UPDATE problems SET ${sets} WHERE id=?`, [...metaFields.map(([, v]) => v), req.params.id]);
      }
      if (statement != null || input_spec != null || output_spec != null || samples != null) {
        const ex = await get('SELECT problem_rowid FROM problem_statements WHERE problem_rowid=?', [req.params.id]);
        if (ex) {
          const sf = [['statement', statement], ['input_spec', input_spec], ['output_spec', output_spec], ['samples', samples]].filter(([, v]) => v != null);
          if (sf.length) {
            await run(`UPDATE problem_statements SET ${sf.map(([f]) => `${f}=?`).join(',')} WHERE problem_rowid=?`, [...sf.map(([, v]) => v), req.params.id]);
          }
        } else {
          await run("INSERT INTO problem_statements(problem_rowid,statement,input_spec,output_spec,samples,scraped_at) VALUES(?,?,?,?,?,datetime('now'))", [
            req.params.id,
            statement || '',
            input_spec || '',
            output_spec || '',
            samples || '[]',
          ]);
        }
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/custom-problems-list', studioAuth, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const rows = q
        ? await all('SELECT id,title,difficulty,tags,created_at FROM custom_problems WHERE title LIKE ? ORDER BY id DESC LIMIT 100', [`%${q}%`])
        : await all('SELECT id,title,difficulty,tags,created_at FROM custom_problems ORDER BY id DESC LIMIT 100');
      res.json({ ok: true, problems: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/api/studio/custom-problems/:id', studioAuth, async (req, res) => {
    try {
      const row = await get('SELECT * FROM custom_problems WHERE id=?', [req.params.id]);
      if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
      res.json({ ok: true, problem: row });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/studio/custom-problems/:id', studioAuth, async (req, res) => {
    try {
      const fields = ['title', 'statement', 'input_spec', 'output_spec', 'difficulty', 'tags', 'samples', 'testcases', 'time_limit', 'memory_limit'];
      const sf = fields.filter(f => req.body[f] != null).map(f => [f, req.body[f]]);
      if (!sf.length) return res.json({ ok: true });
      await run(`UPDATE custom_problems SET ${sf.map(([f]) => `${f}=?`).join(',')},updated_at=datetime('now') WHERE id=?`, [...sf.map(([, v]) => v), req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/run-code', studioAuth, async (req, res) => {
    try {
      const { language, code, stdin } = req.body;
      if (!language || !code) return res.status(400).json({ ok: false, error: 'language and code required' });
      const langMap = {
        python: { language: 'python', version: '3.10.0' },
        javascript: { language: 'javascript', version: '18.15.0' },
        typescript: { language: 'typescript', version: '5.0.3' },
        cpp: { language: 'c++', version: '10.2.0' },
        c: { language: 'c', version: '10.2.0' },
        java: { language: 'java', version: '15.0.2' },
        go: { language: 'go', version: '1.16.2' },
        rust: { language: 'rust', version: '1.68.2' },
        bash: { language: 'bash', version: '5.2.0' },
        ruby: { language: 'ruby', version: '3.0.1' },
        php: { language: 'php', version: '8.2.3' },
        csharp: { language: 'csharp.net', version: '5.0.201' },
        kotlin: { language: 'kotlin', version: '1.6.0' },
        swift: { language: 'swift', version: '5.3.3' },
        scala: { language: 'scala', version: '3.0.2' },
        perl: { language: 'perl', version: '5.36.0' },
        r: { language: 'r', version: '4.1.1' },
        lua: { language: 'lua', version: '5.4.4' },
        dart: { language: 'dart', version: '2.19.6' },
        haskell: { language: 'haskell', version: '9.0.1' },
        elixir: { language: 'elixir', version: '1.11.3' },
        sql: { language: 'sqlite3', version: '3.36.0' },
      };
      const lang = langMap[language];
      if (!lang) return res.status(400).json({ ok: false, error: `Unsupported language: ${language}` });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const r = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang.language, version: lang.version, files: [{ content: code }], stdin: stdin || '' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const d = await r.json();
      if (d.run) {
        return res.json({ ok: true, output: d.run.stdout || '', stderr: d.run.stderr || '', exitCode: d.run.code || 0 });
      }
      res.json({ ok: false, error: d.message || 'Execution failed' });
    } catch (e) {
      if (e.name === 'AbortError') return res.json({ ok: false, error: 'Execution timed out (15s)' });
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/api/studio/ai-assist', studioAuth, async (req, res) => {
    try {
      const { prompt, type } = req.body;
      if (!prompt) return res.status(400).json({ ok: false, error: 'prompt required' });
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.json({ ok: false, error: 'GROQ_API_KEY not configured' });
      const systems = {
        problem: 'You are an expert competitive programming problem setter. Write a clear, detailed problem description in HTML (use <p>, <ul>, <li>, <strong>, <code>, <pre> tags). Include: problem statement, constraints, examples with explanations. No markdown.',
        tutorial: 'You are an expert technical educator. Write a comprehensive tutorial section in HTML using <h2>, <h3>, <p>, <ul>, <li>, <code>, <pre> tags. Include explanations, examples and code snippets. No markdown.',
        hints: 'You are a helpful competitive programming mentor. Provide 3-5 progressive hints as a JSON array of strings. Return ONLY valid JSON: ["hint1", "hint2", ...]',
        description: 'You are a technical content writer. Write a clear, concise HTML description using <p> and <ul> tags. No markdown.',
        improve: 'You are a senior technical editor. Improve the given content: fix grammar, enhance clarity, add better examples, improve structure. Return improved HTML content only.',
      };
      const system = systems[type] || systems.description;
      const result = await _groqChat(
        apiKey,
        [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        { maxTokens: 2000, model: 'llama-3.3-70b-versatile', temperature: 0.15 }
      );
      if (!result.ok) return res.json({ ok: false, error: result.error });
      res.json({ ok: true, text: result.content });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}

module.exports = { createStudioRouter };
