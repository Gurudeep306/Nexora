/**
 * ExplainLab Database Schema and Service
 * Handles all database operations for the ExplainLab feature
 */

const { run, get, all } = require('./db');

/**
 * Initialize ExplainLab database tables
 * Called during server startup
 */
async function initExplainLabDb() {
  // Main explanation sessions table
  await run(`CREATE TABLE IF NOT EXISTS explain_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id TEXT NOT NULL,
    course_id INTEGER,
    chapter_id INTEGER,
    lesson_id INTEGER,
    problem_id INTEGER,
    custom_problem_id INTEGER,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    explanation_type TEXT DEFAULT 'general',
    level TEXT DEFAULT 'beginner',
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'draft',
    duration_ms INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    video_url TEXT,
    audio_url TEXT,
    final_board_snapshot_url TEXT,
    typed_notes_html TEXT,
    full_explanation_html TEXT,
    allow_downloads INTEGER DEFAULT 0,
    allow_public_doubts INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    FOREIGN KEY (course_id) REFERENCES cms_courses(id),
    FOREIGN KEY (chapter_id) REFERENCES cms_chapters(id),
    FOREIGN KEY (lesson_id) REFERENCES cms_lessons(id),
    FOREIGN KEY (problem_id) REFERENCES problems(id),
    FOREIGN KEY (custom_problem_id) REFERENCES custom_problems(id)
  )`);

  // Whiteboard pages table
  await run(`CREATE TABLE IF NOT EXISTS explain_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    page_index INTEGER NOT NULL,
    title TEXT DEFAULT '',
    background_type TEXT DEFAULT 'white',
    background_data TEXT,
    is_handwritten_note INTEGER DEFAULT 0,
    snapshot_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Whiteboard events table (for replay)
  await run(`CREATE TABLE IF NOT EXISTS explain_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    page_id INTEGER,
    timestamp_ms INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (page_id) REFERENCES explain_pages(id) ON DELETE CASCADE
  )`);

  // Code editor events table
  await run(`CREATE TABLE IF NOT EXISTS explain_code_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    language TEXT DEFAULT 'cpp',
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Handwritten notes table
  await run(`CREATE TABLE IF NOT EXISTS explain_handwritten_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    page_index INTEGER NOT NULL,
    title TEXT DEFAULT '',
    file_url TEXT NOT NULL,
    file_type TEXT DEFAULT 'image',
    source_type TEXT DEFAULT 'upload',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Session markers/chapters table
  await run(`CREATE TABLE IF NOT EXISTS explain_markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    marker_type TEXT DEFAULT 'chapter',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Clips table (short clips from full session)
  await run(`CREATE TABLE IF NOT EXISTS explain_clips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Student notes table
  await run(`CREATE TABLE IF NOT EXISTS explain_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    timestamp_ms INTEGER DEFAULT 0,
    page_id INTEGER,
    note_text TEXT NOT NULL,
    visibility TEXT DEFAULT 'private',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Bookmarks table
  await run(`CREATE TABLE IF NOT EXISTS explain_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    label TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Doubts table
  await run(`CREATE TABLE IF NOT EXISTS explain_doubts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    student_id TEXT NOT NULL,
    page_id INTEGER,
    timestamp_ms INTEGER DEFAULT 0,
    x INTEGER,
    y INTEGER,
    doubt_text TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Doubt replies table
  await run(`CREATE TABLE IF NOT EXISTS explain_doubt_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doubt_id INTEGER NOT NULL,
    teacher_id TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    reply_type TEXT DEFAULT 'text',
    payload_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doubt_id) REFERENCES explain_doubts(id) ON DELETE CASCADE
  )`);

  // User progress table
  await run(`CREATE TABLE IF NOT EXISTS explain_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    last_position_ms INTEGER DEFAULT 0,
    last_audio_position_ms INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    watch_time_ms INTEGER DEFAULT 0,
    audio_listen_time_ms INTEGER DEFAULT 0,
    typed_notes_viewed INTEGER DEFAULT 0,
    handwritten_notes_viewed INTEGER DEFAULT 0,
    full_explanation_viewed INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE,
    UNIQUE(session_id, user_id)
  )`);

  // Analytics events table
  await run(`CREATE TABLE IF NOT EXISTS explain_analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id TEXT,
    event_type TEXT NOT NULL,
    timestamp_ms INTEGER DEFAULT 0,
    payload_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // AI outputs table
  await run(`CREATE TABLE IF NOT EXISTS explain_ai_outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    output_type TEXT NOT NULL,
    content_json TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explain_sessions(id) ON DELETE CASCADE
  )`);

  // Create indexes for performance
  await run('CREATE INDEX IF NOT EXISTS idx_explain_sessions_teacher ON explain_sessions(teacher_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_sessions_status ON explain_sessions(status)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_sessions_lesson ON explain_sessions(lesson_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_sessions_problem ON explain_sessions(problem_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_pages_session ON explain_pages(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_events_session ON explain_events(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_events_page ON explain_events(page_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_code_events_session ON explain_code_events(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_handwritten_session ON explain_handwritten_notes(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_markers_session ON explain_markers(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_notes_session ON explain_notes(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_bookmarks_session ON explain_bookmarks(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_doubts_session ON explain_doubts(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_progress_session ON explain_progress(session_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_explain_analytics_session ON explain_analytics_events(session_id)');

  console.log('✓ ExplainLab database tables initialized');
}

// ==================== Session CRUD Operations ====================

async function createSession(data) {
  const {
    teacher_id, course_id, chapter_id, lesson_id, problem_id, custom_problem_id,
    title, description, explanation_type, level, language
  } = data;
  const r = await run(`
    INSERT INTO explain_sessions(teacher_id, course_id, chapter_id, lesson_id, problem_id, custom_problem_id,
      title, description, explanation_type, level, language)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [teacher_id, course_id || null, chapter_id || null, lesson_id || null, problem_id || null, custom_problem_id || null,
      title, description || '', explanation_type || 'general', level || 'beginner', language || 'en']
  );
  return r.lastID;
}

async function getSession(id, userId = null) {
  return await get('SELECT * FROM explain_sessions WHERE id=?', [id]);
}

async function getSessionsByFilters(filters) {
  const { teacher_id, course_id, chapter_id, lesson_id, problem_id, status, limit = 50, offset = 0 } = filters;
  const where = [];
  const params = [];

  if (teacher_id) { where.push('teacher_id=?'); params.push(teacher_id); }
  if (course_id) { where.push('course_id=?'); params.push(course_id); }
  if (chapter_id) { where.push('chapter_id=?'); params.push(chapter_id); }
  if (lesson_id) { where.push('lesson_id=?'); params.push(lesson_id); }
  if (problem_id) { where.push('problem_id=?'); params.push(problem_id); }
  if (status) { where.push('status=?'); params.push(status); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sessions = await all(
    `SELECT * FROM explain_sessions ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const total = await get(`SELECT COUNT(*) as c FROM explain_sessions ${whereClause}`, params);
  return { sessions, total: total.c };
}

async function updateSession(id, data) {
  const allowedFields = ['title', 'description', 'explanation_type', 'level', 'language', 'status',
    'duration_ms', 'thumbnail_url', 'video_url', 'audio_url', 'final_board_snapshot_url',
    'typed_notes_html', 'full_explanation_html', 'allow_downloads', 'allow_public_doubts'];
  
  const sets = [];
  const vals = [];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field}=?`);
      vals.push(data[field]);
    }
  }
  if (sets.length === 0) return;
  
  vals.push(id);
  await run(`UPDATE explain_sessions SET ${sets.join(',')}, updated_at=datetime('now') WHERE id=?`, vals);
}

async function publishSession(id) {
  await run(`UPDATE explain_sessions SET status='published', published_at=datetime('now'), updated_at=datetime('now') WHERE id=?`, [id]);
}

async function deleteSession(id) {
  await run('DELETE FROM explain_sessions WHERE id=?', [id]);
}

// ==================== Pages Operations ====================

async function createPage(data) {
  const { session_id, page_index, title, background_type, background_data, is_handwritten_note } = data;
  const r = await run(`
    INSERT INTO explain_pages(session_id, page_index, title, background_type, background_data, is_handwritten_note)
    VALUES(?,?,?,?,?,?)`,
    [session_id, page_index, title || '', background_type || 'white', background_data || null, is_handwritten_note || 0]
  );
  return r.lastID;
}

async function getPage(id) {
  return await get('SELECT * FROM explain_pages WHERE id=?', [id]);
}

async function getPagesBySession(sessionId) {
  return await all('SELECT * FROM explain_pages WHERE session_id=? ORDER BY page_index', [sessionId]);
}

async function updatePage(id, data) {
  const allowedFields = ['title', 'background_type', 'background_data', 'is_handwritten_note', 'snapshot_url'];
  const sets = [];
  const vals = [];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field}=?`);
      vals.push(data[field]);
    }
  }
  if (sets.length === 0) return;
  vals.push(id);
  await run(`UPDATE explain_pages SET ${sets.join(',')} WHERE id=?`, vals);
}

async function deletePage(id) {
  await run('DELETE FROM explain_pages WHERE id=?', [id]);
}

// ==================== Events Operations ====================

async function createEvent(data) {
  const { session_id, page_id, timestamp_ms, event_type, payload_json } = data;
  const r = await run(`
    INSERT INTO explain_events(session_id, page_id, timestamp_ms, event_type, payload_json)
    VALUES(?,?,?,?,?)`,
    [session_id, page_id || null, timestamp_ms, event_type, payload_json]
  );
  return r.lastID;
}

async function createEventsBulk(sessionId, events) {
  for (const event of events) {
    await createEvent({ ...event, session_id: sessionId });
  }
}

async function getEventsBySession(sessionId, startTime = 0, endTime = null) {
  let sql = 'SELECT * FROM explain_events WHERE session_id=?';
  const params = [sessionId];
  if (startTime > 0) {
    sql += ' AND timestamp_ms >= ?';
    params.push(startTime);
  }
  if (endTime !== null) {
    sql += ' AND timestamp_ms <= ?';
    params.push(endTime);
  }
  sql += ' ORDER BY timestamp_ms, id';
  return await all(sql, params);
}

async function getEventsByPage(pageId) {
  return await all('SELECT * FROM explain_events WHERE page_id=? ORDER BY timestamp_ms, id', [pageId]);
}

// ==================== Code Events Operations ====================

async function createCodeEvent(data) {
  const { session_id, timestamp_ms, language, event_type, payload_json } = data;
  const r = await run(`
    INSERT INTO explain_code_events(session_id, timestamp_ms, language, event_type, payload_json)
    VALUES(?,?,?,?,?)`,
    [session_id, timestamp_ms, language || 'cpp', event_type, payload_json]
  );
  return r.lastID;
}

async function getCodeEventsBySession(sessionId, startTime = 0, endTime = null) {
  let sql = 'SELECT * FROM explain_code_events WHERE session_id=?';
  const params = [sessionId];
  if (startTime > 0) {
    sql += ' AND timestamp_ms >= ?';
    params.push(startTime);
  }
  if (endTime !== null) {
    sql += ' AND timestamp_ms <= ?';
    params.push(endTime);
  }
  sql += ' ORDER BY timestamp_ms, id';
  return await all(sql, params);
}

// ==================== Handwritten Notes Operations ====================

async function createHandwrittenNote(data) {
  const { session_id, page_index, title, file_url, file_type, source_type } = data;
  const r = await run(`
    INSERT INTO explain_handwritten_notes(session_id, page_index, title, file_url, file_type, source_type)
    VALUES(?,?,?,?,?,?)`,
    [session_id, page_index, title || '', file_url, file_type || 'image', source_type || 'upload']
  );
  return r.lastID;
}

async function getHandwrittenNotesBySession(sessionId) {
  return await all('SELECT * FROM explain_handwritten_notes WHERE session_id=? ORDER BY page_index', [sessionId]);
}

async function deleteHandwrittenNote(id) {
  await run('DELETE FROM explain_handwritten_notes WHERE id=?', [id]);
}

// ==================== Markers Operations ====================

async function createMarker(data) {
  const { session_id, timestamp_ms, title, description, marker_type } = data;
  const r = await run(`
    INSERT INTO explain_markers(session_id, timestamp_ms, title, description, marker_type)
    VALUES(?,?,?,?,?)`,
    [session_id, timestamp_ms, title, description || '', marker_type || 'chapter']
  );
  return r.lastID;
}

async function getMarkersBySession(sessionId) {
  return await all('SELECT * FROM explain_markers WHERE session_id=? ORDER BY timestamp_ms', [sessionId]);
}

async function deleteMarker(id) {
  await run('DELETE FROM explain_markers WHERE id=?', [id]);
}

// ==================== Clips Operations ====================

async function createClip(data) {
  const { session_id, title, start_ms, end_ms, description } = data;
  const r = await run(`
    INSERT INTO explain_clips(session_id, title, start_ms, end_ms, description)
    VALUES(?,?,?,?,?)`,
    [session_id, title, start_ms, end_ms, description || '']
  );
  return r.lastID;
}

async function getClipsBySession(sessionId) {
  return await all('SELECT * FROM explain_clips WHERE session_id=? ORDER BY start_ms', [sessionId]);
}

async function deleteClip(id) {
  await run('DELETE FROM explain_clips WHERE id=?', [id]);
}

// ==================== Student Notes Operations ====================

async function createStudentNote(data) {
  const { session_id, user_id, timestamp_ms, page_id, note_text, visibility } = data;
  const r = await run(`
    INSERT INTO explain_notes(session_id, user_id, timestamp_ms, page_id, note_text, visibility)
    VALUES(?,?,?,?,?,?)`,
    [session_id, user_id, timestamp_ms || 0, page_id || null, note_text, visibility || 'private']
  );
  return r.lastID;
}

async function getStudentNotesBySession(sessionId, userId = null) {
  let sql = 'SELECT * FROM explain_notes WHERE session_id=?';
  const params = [sessionId];
  if (userId) {
    sql += ' AND user_id=?';
    params.push(userId);
  }
  sql += ' ORDER BY created_at DESC';
  return await all(sql, params);
}

async function deleteStudentNote(id, userId = null) {
  let sql = 'DELETE FROM explain_notes WHERE id=?';
  const params = [id];
  if (userId) {
    sql += ' AND user_id=?';
    params.push(userId);
  }
  await run(sql, params);
}

// ==================== Bookmarks Operations ====================

async function createBookmark(data) {
  const { session_id, user_id, timestamp_ms, label } = data;
  const r = await run(`
    INSERT INTO explain_bookmarks(session_id, user_id, timestamp_ms, label)
    VALUES(?,?,?,?,?)`,
    [session_id, user_id, timestamp_ms, label || '']
  );
  return r.lastID;
}

async function getBookmarksBySession(sessionId, userId = null) {
  let sql = 'SELECT * FROM explain_bookmarks WHERE session_id=?';
  const params = [sessionId];
  if (userId) {
    sql += ' AND user_id=?';
    params.push(userId);
  }
  sql += ' ORDER BY timestamp_ms';
  return await all(sql, params);
}

async function deleteBookmark(id, userId = null) {
  let sql = 'DELETE FROM explain_bookmarks WHERE id=?';
  const params = [id];
  if (userId) {
    sql += ' AND user_id=?';
    params.push(userId);
  }
  await run(sql, params);
}

// ==================== Doubts Operations ====================

async function createDoubt(data) {
  const { session_id, student_id, page_id, timestamp_ms, x, y, doubt_text } = data;
  const r = await run(`
    INSERT INTO explain_doubts(session_id, student_id, page_id, timestamp_ms, x, y, doubt_text)
    VALUES(?,?,?,?,?,?,?)`,
    [session_id, student_id, page_id || null, timestamp_ms || 0, x || null, y || null, doubt_text]
  );
  return r.lastID;
}

async function getDoubtsBySession(sessionId, status = null) {
  let sql = 'SELECT * FROM explain_doubts WHERE session_id=?';
  const params = [sessionId];
  if (status) {
    sql += ' AND status=?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  return await all(sql, params);
}

async function getDoubtsByStudent(studentId) {
  return await all('SELECT * FROM explain_doubts WHERE student_id=? ORDER BY created_at DESC', [studentId]);
}

async function resolveDoubt(id, teacherId) {
  await run(`UPDATE explain_doubts SET status='resolved', resolved_at=datetime('now') WHERE id=?`, [id]);
}

async function createDoubtReply(data) {
  const { doubt_id, teacher_id, reply_text, reply_type, payload_json } = data;
  const r = await run(`
    INSERT INTO explain_doubt_replies(doubt_id, teacher_id, reply_text, reply_type, payload_json)
    VALUES(?,?,?,?,?)`,
    [doubt_id, teacher_id, reply_text, reply_type || 'text', payload_json || null]
  );
  return r.lastID;
}

async function getDoubtReplies(doubtId) {
  return await all('SELECT * FROM explain_doubt_replies WHERE doubt_id=? ORDER BY created_at', [doubtId]);
}

// ==================== Progress Operations ====================

async function updateProgress(data) {
  const { session_id, user_id, last_position_ms, last_audio_position_ms, completed,
          watch_time_ms, audio_listen_time_ms, typed_notes_viewed,
          handwritten_notes_viewed, full_explanation_viewed } = data;
  
  const sets = [];
  const vals = [];
  
  if (last_position_ms !== undefined) { sets.push('last_position_ms=?'); vals.push(last_position_ms); }
  if (last_audio_position_ms !== undefined) { sets.push('last_audio_position_ms=?'); vals.push(last_audio_position_ms); }
  if (completed !== undefined) { sets.push('completed=?'); vals.push(completed); }
  if (completed === true) { sets.push('completed_at=datetime(\'now\')'); }
  if (watch_time_ms !== undefined) { sets.push('watch_time_ms=watch_time_ms+?'); vals.push(watch_time_ms); }
  if (audio_listen_time_ms !== undefined) { sets.push('audio_listen_time_ms=audio_listen_time_ms+?'); vals.push(audio_listen_time_ms); }
  if (typed_notes_viewed !== undefined) { sets.push('typed_notes_viewed=?'); vals.push(typed_notes_viewed); }
  if (handwritten_notes_viewed !== undefined) { sets.push('handwritten_notes_viewed=?'); vals.push(handwritten_notes_viewed); }
  if (full_explanation_viewed !== undefined) { sets.push('full_explanation_viewed=?'); vals.push(full_explanation_viewed); }
  
  if (sets.length === 0) return;
  
  vals.push(session_id, user_id);
  await run(`INSERT INTO explain_progress(session_id, user_id) VALUES(?,?)
    ON CONFLICT(session_id, user_id) DO UPDATE SET ${sets.join(',')}, updated_at=datetime('now')`, vals);
}

async function getProgress(sessionId, userId) {
  return await get('SELECT * FROM explain_progress WHERE session_id=? AND user_id=?', [sessionId, userId]);
}

// ==================== Analytics Operations ====================

async function logAnalyticsEvent(data) {
  const { session_id, user_id, event_type, timestamp_ms, payload_json } = data;
  await run(`
    INSERT INTO explain_analytics_events(session_id, user_id, event_type, timestamp_ms, payload_json)
    VALUES(?,?,?,?,?)`,
    [session_id, user_id || null, event_type, timestamp_ms || 0, payload_json || null]
  );
}

async function getSessionAnalytics(sessionId) {
  const events = await all('SELECT * FROM explain_analytics_events WHERE session_id=? ORDER BY created_at DESC', [sessionId]);
  
  // Aggregate analytics
  const totalViews = events.filter(e => e.event_type === 'session_start').length;
  const completions = events.filter(e => e.event_type === 'session_completed').length;
  const uniqueUsers = new Set(events.filter(e => e.user_id).map(e => e.user_id)).size;
  
  // Watch time stats
  const watchTimeEvents = events.filter(e => e.event_type === 'watch_time_update');
  const totalWatchTimeMs = watchTimeEvents.reduce((sum, e) => {
    try { return sum + (JSON.parse(e.payload_json)?.watch_time_ms || 0); } catch { return sum; }
  }, 0);
  
  return {
    totalViews,
    completions,
    uniqueUsers,
    totalWatchTimeMs,
    avgWatchTimeMs: totalViews > 0 ? Math.round(totalWatchTimeMs / totalViews) : 0,
    completionRate: totalViews > 0 ? Math.round((completions / totalViews) * 100) : 0,
    recentEvents: events.slice(0, 100)
  };
}

// ==================== AI Outputs Operations ====================

async function saveAIOutput(data) {
  const { session_id, output_type, content_json, created_by } = data;
  const r = await run(`
    INSERT INTO explain_ai_outputs(session_id, output_type, content_json, created_by)
    VALUES(?,?,?,?,?)`,
    [session_id, output_type, content_json, created_by]
  );
  return r.lastID;
}

async function getAIOutputsBySession(sessionId, outputType = null) {
  let sql = 'SELECT * FROM explain_ai_outputs WHERE session_id=?';
  const params = [sessionId];
  if (outputType) {
    sql += ' AND output_type=?';
    params.push(outputType);
  }
  sql += ' ORDER BY created_at DESC';
  return await all(sql, params);
}

// ==================== Search Operations ====================

async function searchSessions(query, filters = {}) {
  const { status = 'published', limit = 20, offset = 0 } = filters;
  const where = ['status=?'];
  const params = [status];
  
  if (query) {
    where.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${query}%`, `%${query}%`);
  }
  
  const sessions = await all(
    `SELECT * FROM explain_sessions WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const total = await get(`SELECT COUNT(*) as c FROM explain_sessions WHERE ${where.join(' AND ')}`, params);
  
  return { sessions, total: total.c };
}

// Export all functions
module.exports = {
  initExplainLabDb,
  // Sessions
  createSession,
  getSession,
  getSessionsByFilters,
  updateSession,
  publishSession,
  deleteSession,
  searchSessions,
  // Pages
  createPage,
  getPage,
  getPagesBySession,
  updatePage,
  deletePage,
  // Events
  createEvent,
  createEventsBulk,
  getEventsBySession,
  getEventsByPage,
  // Code Events
  createCodeEvent,
  getCodeEventsBySession,
  // Handwritten Notes
  createHandwrittenNote,
  getHandwrittenNotesBySession,
  deleteHandwrittenNote,
  // Markers
  createMarker,
  getMarkersBySession,
  deleteMarker,
  // Clips
  createClip,
  getClipsBySession,
  deleteClip,
  // Student Notes
  createStudentNote,
  getStudentNotesBySession,
  deleteStudentNote,
  // Bookmarks
  createBookmark,
  getBookmarksBySession,
  deleteBookmark,
  // Doubts
  createDoubt,
  getDoubtsBySession,
  getDoubtsByStudent,
  resolveDoubt,
  createDoubtReply,
  getDoubtReplies,
  // Progress
  updateProgress,
  getProgress,
  // Analytics
  logAnalyticsEvent,
  getSessionAnalytics,
  // AI Outputs
  saveAIOutput,
  getAIOutputsBySession
};