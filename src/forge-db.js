/**
 * Nexora ForgeBuilder Database Schema
 * Creates tables for no-code builder system
 */

const { run, get, all } = require('./db');

// Initialize ForgeBuilder tables
async function initForgeDb() {
  // Forge Pages - Store page schemas
  await run(`CREATE TABLE IF NOT EXISTS forge_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    route TEXT UNIQUE NOT NULL,
    description TEXT,
    layout_type TEXT DEFAULT 'default',
    schema_json TEXT DEFAULT '{}',
    css_json TEXT DEFAULT '{}',
    status TEXT DEFAULT 'draft',
    is_published INTEGER DEFAULT 0,
    published_at DATETIME,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Page Versions - Version history for rollback
  await run(`CREATE TABLE IF NOT EXISTS forge_page_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    schema_json TEXT DEFAULT '{}',
    css_json TEXT DEFAULT '{}',
    change_note TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES forge_pages(id) ON DELETE CASCADE
  )`);

  // Forge Components - Reusable component definitions
  await run(`CREATE TABLE IF NOT EXISTS forge_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'basic',
    description TEXT,
    props_schema TEXT DEFAULT '{}',
    default_styles TEXT DEFAULT '{}',
    template_html TEXT,
    is_custom INTEGER DEFAULT 0,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Forge Data Models - Custom database schemas
  await run(`CREATE TABLE IF NOT EXISTS forge_data_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    fields_json TEXT DEFAULT '[]',
    permissions_json TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Forge APIs - Custom API definitions
  await run(`CREATE TABLE IF NOT EXISTS forge_apis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT UNIQUE NOT NULL,
    method TEXT DEFAULT 'GET',
    model_id INTEGER,
    config_json TEXT DEFAULT '{}',
    permissions_json TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES forge_data_models(id)
  )`);

  // Forge Forms - Custom form definitions
  await run(`CREATE TABLE IF NOT EXISTS forge_forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    fields_json TEXT DEFAULT '[]',
    submit_action TEXT DEFAULT 'save',
    success_message TEXT,
    redirect_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Forge Workflows - Automation workflows
  await run(`CREATE TABLE IF NOT EXISTS forge_workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config_json TEXT DEFAULT '{}',
    conditions_json TEXT DEFAULT '[]',
    actions_json TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 0,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Forge Navigation - Custom navigation config
  await run(`CREATE TABLE IF NOT EXISTS forge_navigation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT DEFAULT 'sidebar',
    items_json TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Forge Themes - Custom theme configurations
  await run(`CREATE TABLE IF NOT EXISTS forge_themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    colors_json TEXT DEFAULT '{}',
    typography_json TEXT DEFAULT '{}',
    spacing_json TEXT DEFAULT '{}',
    components_json TEXT DEFAULT '{}',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Forge Settings - Global builder settings
  await run(`CREATE TABLE IF NOT EXISTS forge_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    type TEXT DEFAULT 'string',
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default settings
  await run(`INSERT OR IGNORE INTO forge_settings (key, value, type, description) VALUES 
    ('sidebar_style', 'modern', 'string', 'Sidebar visual style'),
    ('topbar_style', 'modern', 'string', 'Topbar visual style'),
    ('animation_level', 'normal', 'string', 'Animation intensity: none, reduced, normal, enhanced'),
    ('density', 'comfortable', 'string', 'UI density: compact, comfortable, spacious'),
    ('custom_cursor', '0', 'boolean', 'Enable custom cursor'),
    ('published_theme_id', '1', 'integer', 'Currently active theme ID')
  `);

  // Insert default theme
  await run(`INSERT OR IGNORE INTO forge_themes (id, name, is_active, colors_json, typography_json, spacing_json, components_json) VALUES 
    (1, 'Clean White', 1, 
     '{"primary":"#2563eb","secondary":"#64748b","success":"#059669","warning":"#d97706","danger":"#dc2626"}',
     '{"fontFamily":"Inter, sans-serif","fontSize":"14px","lineHeight":"1.5"}',
     '{"base":"16px","scale":"1.25"}',
     '{"borderRadius":"8px","shadow":"sm"}'
    )
  `);

  // Insert default component templates
  const defaultComponents = [
    { name: 'Text Block', type: 'text', category: 'basic', description: 'Simple text content' },
    { name: 'Heading', type: 'heading', category: 'basic', description: 'Section heading' },
    { name: 'Button', type: 'button', category: 'basic', description: 'Clickable button' },
    { name: 'Card', type: 'card', category: 'layout', description: 'Content card container' },
    { name: 'Image', type: 'image', category: 'media', description: 'Image element' },
    { name: 'Video Player', type: 'video', category: 'media', description: 'Video player component' },
    { name: 'Course Card', type: 'course-card', category: 'learning', description: 'Course preview card' },
    { name: 'Problem List', type: 'problem-list', category: 'learning', description: 'List of problems' },
    { name: 'ExplainLab Session', type: 'explainlab-session', category: 'learning', description: 'ExplainLab session player' },
    { name: 'Live Class', type: 'live-class', category: 'learning', description: 'Live class viewer' },
    { name: 'Stats Widget', type: 'stats-widget', category: 'dashboard', description: 'Statistics display' },
    { name: 'Chart', type: 'chart', category: 'dashboard', description: 'Data chart' }
  ];

  // forge_components has no UNIQUE key, so "INSERT OR IGNORE" re-added all
  // defaults on every restart. Only insert a default type that is missing.
  for (const comp of defaultComponents) {
    await run(`INSERT INTO forge_components (name, type, category, description, props_schema, default_styles)
      SELECT ?, ?, ?, ?, '{}', '{}'
      WHERE NOT EXISTS (SELECT 1 FROM forge_components WHERE type = ?)`,
      [comp.name, comp.type, comp.category, comp.description, comp.type]);
  }

  console.log('✓ ForgeBuilder database initialized');
}

// Export functions
module.exports = {
  initForgeDb,
  run,
  get,
  all
};