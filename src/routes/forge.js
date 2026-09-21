/**
 * Nexora ForgeBuilder API Routes
 * No-code admin builder for Nexora platform
 */

const express = require('express');
const { run, get, all } = require('../db');
const { initForgeDb } = require('../forge-db');
const { requireAdmin } = require('../middleware/auth');

function createForgeRouter(deps = {}) {
  const router = express.Router();
  const { requireAdmin: adminCheck } = deps;

  // Middleware to check admin role
  const isAdmin = (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    if (req.session.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin only' });
    next();
  };

  // ========== OVERVIEW ==========
  router.get('/overview', isAdmin, async (req, res) => {
    try {
      const pages = await get('SELECT COUNT(*) as count FROM forge_pages');
      const components = await get('SELECT COUNT(*) as count FROM forge_components');
      const models = await get('SELECT COUNT(*) as count FROM forge_data_models');
      const apis = await get('SELECT COUNT(*) as count FROM forge_apis');
      const forms = await get('SELECT COUNT(*) as count FROM forge_forms');
      const workflows = await get('SELECT COUNT(*) as count FROM forge_workflows');
      const publishedPages = await get("SELECT COUNT(*) as count FROM forge_pages WHERE is_published = 1");
      const draftPages = await get("SELECT COUNT(*) as count FROM forge_pages WHERE is_published = 0");

      res.json({
        ok: true,
        stats: {
          pages: pages.count,
          components: components.count,
          models: models.count,
          apis: apis.count,
          forms: forms.count,
          workflows: workflows.count,
          publishedPages: publishedPages.count,
          draftPages: draftPages.count,
        }
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== PAGES ==========
  router.get('/pages', isAdmin, async (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      let where = '1=1';
      let params = [];
      if (status) {
        where = status === 'published' ? 'is_published = 1' : 'is_published = 0';
      }
      const pages = await all(`SELECT * FROM forge_pages WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, +limit, +offset]);
      const total = await get(`SELECT COUNT(*) as count FROM forge_pages WHERE ${where}`);
      res.json({ ok: true, pages, total: total.count });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/pages/:id', isAdmin, async (req, res) => {
    try {
      const page = await get('SELECT * FROM forge_pages WHERE id = ?', [req.params.id]);
      if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
      const versions = await all('SELECT * FROM forge_page_versions WHERE page_id = ? ORDER BY version_number DESC LIMIT 10', [req.params.id]);
      res.json({ ok: true, page: { ...page, schema_json: JSON.parse(page.schema_json || '{}'), css_json: JSON.parse(page.css_json || '{}') }, versions });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/pages', isAdmin, async (req, res) => {
    try {
      const { title, route, description, layout_type, schema_json, css_json } = req.body;
      if (!title || !route) return res.status(400).json({ ok: false, error: 'Title and route are required' });

      const result = await run(
        'INSERT INTO forge_pages (title, route, description, layout_type, schema_json, css_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, route, description || '', layout_type || 'default', JSON.stringify(schema_json || {}), JSON.stringify(css_json || {}), req.session.user.username]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ ok: false, error: 'Route already exists' });
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/api/forge/pages/:id', isAdmin, async (req, res) => {
    try {
      const { title, route, description, layout_type, schema_json, css_json, change_note } = req.body;
      const existing = await get('SELECT * FROM forge_pages WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ ok: false, error: 'Page not found' });

      // Save version before update
      await run(
        'INSERT INTO forge_page_versions (page_id, version_number, schema_json, css_json, change_note, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.id, (await all('SELECT MAX(version_number) as v FROM forge_page_versions WHERE page_id = ?', [req.params.id]))[0]?.v + 1 || 1,
         existing.schema_json, existing.css_json, change_note || 'Before update', req.session.user.username]
      );

      await run(
        'UPDATE forge_pages SET title = ?, route = ?, description = ?, layout_type = ?, schema_json = ?, css_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, route, description || '', layout_type || 'default', JSON.stringify(schema_json || {}), JSON.stringify(css_json || {}), req.params.id]
      );

      res.json({ ok: true });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ ok: false, error: 'Route already exists' });
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/pages/:id/publish', isAdmin, async (req, res) => {
    try {
      await run('UPDATE forge_pages SET is_published = 1, published_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/pages/:id/unpublish', isAdmin, async (req, res) => {
    try {
      await run('UPDATE forge_pages SET is_published = 0 WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/api/forge/pages/:id', isAdmin, async (req, res) => {
    try {
      await run('DELETE FROM forge_pages WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/pages/:id/versions', isAdmin, async (req, res) => {
    try {
      const versions = await all('SELECT * FROM forge_page_versions WHERE page_id = ? ORDER BY version_number DESC', [req.params.id]);
      res.json({ ok: true, versions });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/pages/:id/rollback/:versionId', isAdmin, async (req, res) => {
    try {
      const version = await get('SELECT * FROM forge_page_versions WHERE id = ?', [req.params.versionId]);
      if (!version || version.page_id !== +req.params.id) return res.status(404).json({ ok: false, error: 'Version not found' });

      await run(
        'UPDATE forge_pages SET schema_json = ?, css_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [version.schema_json, version.css_json, req.params.id]
      );

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== COMPONENTS ==========
  router.get('/components', async (req, res) => {
    try {
      const components = await all('SELECT * FROM forge_components ORDER BY category, name');
      res.json({ ok: true, components });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/components', isAdmin, async (req, res) => {
    try {
      const { name, type, category, description, props_schema, default_styles } = req.body;
      const result = await run(
        'INSERT INTO forge_components (name, type, category, description, props_schema, default_styles, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, type, category || 'custom', description || '', JSON.stringify(props_schema || {}), JSON.stringify(default_styles || {}), req.session.user.username]
      );
      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== DATA MODELS ==========
  router.get('/models', isAdmin, async (req, res) => {
    try {
      const models = await all('SELECT * FROM forge_data_models ORDER BY created_at DESC');
      res.json({ ok: true, models });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/models', isAdmin, async (req, res) => {
    try {
      const { name, slug, description, fields_json, permissions_json } = req.body;
      if (!name || !slug) return res.status(400).json({ ok: false, error: 'Name and slug are required' });

      const result = await run(
        'INSERT INTO forge_data_models (name, slug, description, fields_json, permissions_json, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [name, slug, description || '', JSON.stringify(fields_json || []), JSON.stringify(permissions_json || {}), req.session.user.username]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ ok: false, error: 'Slug already exists' });
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== FORMS ==========
  router.get('/forms', isAdmin, async (req, res) => {
    try {
      const forms = await all('SELECT * FROM forge_forms ORDER BY created_at DESC');
      res.json({ ok: true, forms });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/forms', isAdmin, async (req, res) => {
    try {
      const { name, slug, fields_json, submit_action, success_message, redirect_url } = req.body;
      if (!name || !slug) return res.status(400).json({ ok: false, error: 'Name and slug are required' });

      const result = await run(
        'INSERT INTO forge_forms (name, slug, fields_json, submit_action, success_message, redirect_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, slug, JSON.stringify(fields_json || []), submit_action || 'save', success_message || 'Form submitted successfully!', redirect_url || '', req.session.user.username]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ ok: false, error: 'Slug already exists' });
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== WORKFLOWS ==========
  router.get('/workflows', isAdmin, async (req, res) => {
    try {
      const workflows = await all('SELECT * FROM forge_workflows ORDER BY created_at DESC');
      res.json({ ok: true, workflows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/workflows', isAdmin, async (req, res) => {
    try {
      const { name, description, trigger_type, trigger_config_json, conditions_json, actions_json } = req.body;
      if (!name || !trigger_type) return res.status(400).json({ ok: false, error: 'Name and trigger_type are required' });

      const result = await run(
        'INSERT INTO forge_workflows (name, description, trigger_type, trigger_config_json, conditions_json, actions_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, description || '', trigger_type, JSON.stringify(trigger_config_json || {}), JSON.stringify(conditions_json || []), JSON.stringify(actions_json || []), req.session.user.username]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/workflows/:id/enable', isAdmin, async (req, res) => {
    try {
      await run('UPDATE forge_workflows SET is_active = 1 WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/workflows/:id/disable', isAdmin, async (req, res) => {
    try {
      await run('UPDATE forge_workflows SET is_active = 0 WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== NAVIGATION ==========
  router.get('/navigation', async (req, res) => {
    try {
      const navigation = await all('SELECT * FROM forge_navigation WHERE is_active = 1');
      res.json({ ok: true, navigation });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/navigation', isAdmin, async (req, res) => {
    try {
      const { name, location, items_json } = req.body;
      if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });

      const result = await run(
        'INSERT INTO forge_navigation (name, location, items_json, created_by) VALUES (?, ?, ?, ?)',
        [name, location || 'sidebar', JSON.stringify(items_json || []), req.session.user.username]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== THEMES ==========
  router.get('/themes', async (req, res) => {
    try {
      const themes = await all('SELECT * FROM forge_themes ORDER BY is_active DESC, created_at DESC');
      res.json({ ok: true, themes });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/themes', isAdmin, async (req, res) => {
    try {
      const { name, colors_json, typography_json, spacing_json, components_json } = req.body;
      if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });

      const result = await run(
        'INSERT INTO forge_themes (name, colors_json, typography_json, spacing_json, components_json, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [name, JSON.stringify(colors_json || {}), JSON.stringify(typography_json || {}), JSON.stringify(spacing_json || {}), JSON.stringify(components_json || {}), req.session.user.username]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/themes/:id/activate', isAdmin, async (req, res) => {
    try {
      await run('UPDATE forge_themes SET is_active = 0');
      await run('UPDATE forge_themes SET is_active = 1 WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== SETTINGS ==========
  router.get('/settings', async (req, res) => {
    try {
      const settings = await all('SELECT * FROM forge_settings');
      const result = {};
      for (const s of settings) {
        result[s.key] = s.type === 'boolean' ? s.value === '1' : s.value;
      }
      res.json({ ok: true, settings: result });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/settings', isAdmin, async (req, res) => {
    try {
      for (const [key, value] of Object.entries(req.body)) {
        await run(
          'INSERT OR REPLACE INTO forge_settings (key, value, type, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          [key, String(value), typeof value === 'boolean' ? 'boolean' : 'string']
        );
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ========== HEALTH CHECK ==========
  router.post('/health/check', isAdmin, async (req, res) => {
    try {
      const issues = [];
      const warnings = [];

      // Check for pages with missing routes
      const pages = await all('SELECT id, title, route FROM forge_pages');
      for (const page of pages) {
        if (!page.route || page.route.trim() === '') {
          issues.push({ type: 'error', message: `Page "${page.title}" has no route` });
        }
      }

      // Check for duplicate routes
      const routeCounts = {};
      for (const page of pages) {
        routeCounts[page.route] = (routeCounts[page.route] || 0) + 1;
      }
      for (const [route, count] of Object.entries(routeCounts)) {
        if (count > 1 && route) {
          issues.push({ type: 'error', message: `Duplicate route: "${route}"` });
        }
      }

      // Check for published pages without schema
      const publishedPages = await all('SELECT id, title, schema_json FROM forge_pages WHERE is_published = 1');
      for (const page of publishedPages) {
        try {
          const schema = JSON.parse(page.schema_json || '{}');
          if (Object.keys(schema).length === 0) {
            warnings.push({ type: 'warning', message: `Published page "${page.title}" has empty schema` });
          }
        } catch {
          issues.push({ type: 'error', message: `Published page "${page.title}" has invalid schema JSON` });
        }
      }

      const isHealthy = issues.filter(i => i.type === 'error').length === 0;

      res.json({
        ok: true,
        healthy: isHealthy,
        issues,
        warnings,
        summary: {
          totalIssues: issues.length,
          totalWarnings: warnings.length,
          errorCount: issues.filter(i => i.type === 'error').length,
        }
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}

module.exports = { createForgeRouter };