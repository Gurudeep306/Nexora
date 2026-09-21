/**
 * Nexora LiveClass Database Schema
 * Creates tables for live streaming and recording system
 */

const { run, get, all } = require('./db');

// Initialize Live Class tables
async function initLiveDb() {
  // Live Classes - Main class sessions
  await run(`CREATE TABLE IF NOT EXISTS live_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    course_id INTEGER,
    chapter_id INTEGER,
    lesson_id INTEGER,
    problem_id INTEGER,
    status TEXT DEFAULT 'scheduled',
    scheduled_at DATETIME,
    started_at DATETIME,
    ended_at DATETIME,
    recording_url TEXT,
    audio_url TEXT,
    screen_recording_url TEXT,
    explain_session_id INTEGER,
    settings_json TEXT DEFAULT '{}',
    is_public INTEGER DEFAULT 0,
    max_participants INTEGER DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Live Class Participants - Track who joined
  await run(`CREATE TABLE IF NOT EXISTS live_class_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    live_class_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME,
    attendance_seconds INTEGER DEFAULT 0,
    mic_enabled INTEGER DEFAULT 0,
    camera_enabled INTEGER DEFAULT 0,
    hand_raised INTEGER DEFAULT 0,
    FOREIGN KEY (live_class_id) REFERENCES live_classes(id) ON DELETE CASCADE
  )`);

  // Live Class Messages - Chat messages during class
  await run(`CREATE TABLE IF NOT EXISTS live_class_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    live_class_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'chat',
    timestamp_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (live_class_id) REFERENCES live_classes(id) ON DELETE CASCADE
  )`);

  // Live Class Recordings - Recording metadata
  await run(`CREATE TABLE IF NOT EXISTS live_class_recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    live_class_id INTEGER NOT NULL,
    recording_type TEXT DEFAULT 'video',
    file_url TEXT,
    duration_ms INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing',
    metadata_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (live_class_id) REFERENCES live_classes(id) ON DELETE CASCADE
  )`);

  // Live Class Events - Timeline of events during class
  await run(`CREATE TABLE IF NOT EXISTS live_class_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    live_class_id INTEGER NOT NULL,
    user_id TEXT,
    event_type TEXT NOT NULL,
    timestamp_ms INTEGER DEFAULT 0,
    payload_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (live_class_id) REFERENCES live_classes(id) ON DELETE CASCADE
  )`);

  // Live Class Invites - Invitations to private classes
  await run(`CREATE TABLE IF NOT EXISTS live_class_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    live_class_id INTEGER NOT NULL,
    user_id TEXT,
    email TEXT,
    invite_status TEXT DEFAULT 'pending',
    invite_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (live_class_id) REFERENCES live_classes(id) ON DELETE CASCADE
  )`);

  // Create indexes for better query performance
  await run(`CREATE INDEX IF NOT EXISTS idx_live_classes_status ON live_classes(status)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_live_classes_teacher ON live_classes(teacher_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled ON live_classes(scheduled_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_live_participants_class ON live_class_participants(live_class_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_live_participants_user ON live_class_participants(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_live_messages_class ON live_class_messages(live_class_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_live_events_class ON live_class_events(live_class_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_live_recordings_class ON live_class_recordings(live_class_id)`);

  console.log('✓ LiveClass database initialized');
}

// Helper functions
async function createLiveClass(data) {
  const {
    teacher_id, teacher_name, title, description,
    course_id, chapter_id, lesson_id, problem_id,
    scheduled_at, is_public, max_participants, settings
  } = data;

  const result = await run(`
    INSERT INTO live_classes 
    (teacher_id, teacher_name, title, description, course_id, chapter_id, lesson_id, problem_id,
     scheduled_at, is_public, max_participants, settings_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
  `, [
    teacher_id, teacher_name, title, description || '',
    course_id || null, chapter_id || null, lesson_id || null, problem_id || null,
    scheduled_at || null, is_public ? 1 : 0, max_participants || 100,
    JSON.stringify(settings || {})
  ]);

  return get('SELECT * FROM live_classes WHERE id = ?', [result.lastID]);
}

async function updateLiveClass(id, data) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === 'settings') {
      fields.push('settings_json = ?');
      values.push(JSON.stringify(value));
    } else if (key !== 'id') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  values.push(id);
  await run(`UPDATE live_classes SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
  return get('SELECT * FROM live_classes WHERE id = ?', [id]);
}

async function getLiveClass(id) {
  return get('SELECT * FROM live_classes WHERE id = ?', [id]);
}

async function getLiveClasses(filters = {}) {
  const { status, teacher_id, course_id, is_public, limit = 50, offset = 0 } = filters;
  const where = [];
  const params = [];

  if (status) { where.push('status = ?'); params.push(status); }
  if (teacher_id) { where.push('teacher_id = ?'); params.push(teacher_id); }
  if (course_id) { where.push('course_id = ?'); params.push(course_id); }
  if (is_public !== undefined) { where.push('is_public = ?'); params.push(is_public ? 1 : 0); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = await get(`SELECT COUNT(*) as count FROM live_classes ${whereClause}`);
  const classes = await all(`
    SELECT * FROM live_classes ${whereClause} 
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return { classes, total: total.count };
}

async function joinLiveClass(classId, userId, userName, role = 'student') {
  // Check if already joined
  const existing = await get(
    'SELECT * FROM live_class_participants WHERE live_class_id = ? AND user_id = ?',
    [classId, userId]
  );

  if (existing) {
    await run('UPDATE live_class_participants SET joined_at = CURRENT_TIMESTAMP, left_at = NULL WHERE id = ?', [existing.id]);
    return existing;
  }

  const result = await run(`
    INSERT INTO live_class_participants (live_class_id, user_id, user_name, role)
    VALUES (?, ?, ?, ?)
  `, [classId, userId, userName, role]);

  return get('SELECT * FROM live_class_participants WHERE id = ?', [result.lastID]);
}

async function leaveLiveClass(classId, userId) {
  const participant = await get(
    'SELECT * FROM live_class_participants WHERE live_class_id = ? AND user_id = ? AND left_at IS NULL',
    [classId, userId]
  );

  if (participant) {
    const attendanceSeconds = Math.floor((Date.now() - new Date(participant.joined_at).getTime()) / 1000);
    await run(`
      UPDATE live_class_participants 
      SET left_at = CURRENT_TIMESTAMP, attendance_seconds = ? 
      WHERE id = ?
    `, [attendanceSeconds, participant.id]);
  }
}

async function addLiveClassMessage(classId, userId, userName, message, messageType = 'chat') {
  const result = await run(`
    INSERT INTO live_class_messages (live_class_id, user_id, user_name, message, message_type, timestamp_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [classId, userId, userName, message, messageType, Date.now()]);

  return get('SELECT * FROM live_class_messages WHERE id = ?', [result.lastID]);
}

async function addLiveClassEvent(classId, eventType, payload, userId = null) {
  await run(`
    INSERT INTO live_class_events (live_class_id, user_id, event_type, timestamp_ms, payload_json)
    VALUES (?, ?, ?, ?, ?)
  `, [classId, userId, eventType, Date.now(), JSON.stringify(payload)]);
}

// Export functions
module.exports = {
  initLiveDb,
  createLiveClass,
  updateLiveClass,
  getLiveClass,
  getLiveClasses,
  joinLiveClass,
  leaveLiveClass,
  addLiveClassMessage,
  addLiveClassEvent,
  run,
  get,
  all
};