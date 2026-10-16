/**
 * NexoraGuru LiveClass API Routes
 * Live streaming and recording system
 */

const express = require('express');
const { errMessage } = require("../http-error");
const { run, get, all } = require('../db');
const { can } = require('../authz/permissions');
const crypto = require('crypto');
const {
  createLiveClass,
  updateLiveClass,
  joinLiveClass,
  leaveLiveClass,
  closeLiveClassAttendance,
  addLiveClassMessage,
  clampInt,
} = require('../live-db');

// Staff with contests.manage (admins and the owner by default) manage any class.
const isAdmin = (user) => can(user, 'contests.manage');
const notFound = (res) => res.status(404).json({ ok: false, error: 'Class not found' });
const forbidden = (res) => res.status(403).json({ ok: false, error: 'Not authorized' });

// The class's own teacher or an admin may manage it.
const canManageClass = (cls, user) => cls.teacher_id === user.username || isAdmin(user);

// Public classes are open to everyone signed in; private ones only to their
// teacher, admins, and users with a (pending or accepted) invite.
const INVITE_MATCH = `invite_status IN ('pending', 'accepted') AND (user_id = ? OR (email IS NOT NULL AND email = ?))`;

async function canAccessClass(cls, user) {
  if (cls.is_public || canManageClass(cls, user)) return true;
  const invite = await get(
    `SELECT 1 FROM live_class_invites WHERE live_class_id = ? AND ${INVITE_MATCH}`,
    [cls.id, user.username, user.email || null]
  );
  return !!invite;
}

function createLiveRouter(deps = {}) {
  const router = express.Router();

  // Middleware to check authentication
  const isAuthenticated = (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    next();
  };

  // Middleware to check admin/teacher role
  const isTeacher = (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const role = req.session.user.role;
    if (role !== 'teacher' && !can(req, 'contests.manage')) return res.status(403).json({ ok: false, error: 'Teacher or Admin only' });
    next();
  };

  // Loads :id and checks the caller may see it (or manage it). On failure the
  // 404/403 is sent here and null is returned.
  async function loadClass(req, res, { manage = false } = {}) {
    const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
    if (!cls) { notFound(res); return null; }
    const user = req.session.user;
    const ok = manage ? canManageClass(cls, user) : await canAccessClass(cls, user);
    if (!ok) { forbidden(res); return null; }
    return cls;
  }

  // ========== LIVE CLASSES LIST ==========
  router.get('/classes', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const user = req.session.user;
      let where = ['1=1'];
      let params = [];

      if (status) {
        where.push('status = ?');
        params.push(status);
      }

      // Non-admins see public classes, their own, and ones they're invited to
      if (!isAdmin(user)) {
        where.push(`(is_public = 1 OR teacher_id = ? OR EXISTS(SELECT 1 FROM live_class_invites WHERE live_class_id = live_classes.id AND ${INVITE_MATCH}))`);
        params.push(user.username, user.username, user.email || null);
      }

      const whereClause = where.join(' AND ');
      const classes = await all(
        `SELECT * FROM live_classes WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, clampInt(req.query.limit, 50, 200), clampInt(req.query.offset, 0, 1e6)]
      );

      const total = await get(`SELECT COUNT(*) as count FROM live_classes WHERE ${whereClause}`, params);

      // Add participant count to each class
      for (const cls of classes) {
        const count = await get('SELECT COUNT(*) as c FROM live_class_participants WHERE live_class_id = ? AND left_at IS NULL', [cls.id]);
        cls.participant_count = count.c;
      }

      res.json({ ok: true, classes, total: total.count });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== GET SINGLE CLASS ==========
  router.get('/classes/:id', isAuthenticated, async (req, res) => {
    try {
      const cls = await loadClass(req, res);
      if (!cls) return;

      const participants = await all(
        'SELECT * FROM live_class_participants WHERE live_class_id = ? AND left_at IS NULL ORDER BY joined_at DESC',
        [cls.id]
      );

      const recordings = await all(
        'SELECT * FROM live_class_recordings WHERE live_class_id = ? AND status = ?',
        [cls.id, 'ready']
      );

      res.json({
        ok: true,
        class: cls,
        participants,
        recordings,
        isTeacher: canManageClass(cls, req.session.user),
        isParticipant: participants.some(p => p.user_id === req.session.user.username),
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== CREATE CLASS ==========
  router.post('/classes', isTeacher, async (req, res) => {
    try {
      const { title, description, course_id, chapter_id, lesson_id, problem_id, scheduled_at, is_public, max_participants, settings } = req.body;
      if (!title) return res.status(400).json({ ok: false, error: 'Title is required' });

      const cls = await createLiveClass({
        teacher_id: req.session.user.username,
        teacher_name: req.session.user.display_name || req.session.user.username,
        title,
        description: description || '',
        course_id,
        chapter_id,
        lesson_id,
        problem_id,
        scheduled_at,
        is_public: is_public !== false,
        max_participants: max_participants || 100,
        settings: settings || {},
      });

      res.json({ ok: true, class: cls });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== UPDATE CLASS ==========
  router.put('/classes/:id', isTeacher, async (req, res) => {
    try {
      const cls = await loadClass(req, res, { manage: true });
      if (!cls) return;

      const { title, description, is_public, settings } = req.body;
      await updateLiveClass(req.params.id, {
        title: title || cls.title,
        description: description !== undefined ? description : cls.description,
        is_public: is_public !== undefined ? (is_public ? 1 : 0) : cls.is_public,
        settings: settings || JSON.parse(cls.settings_json || '{}'),
      });

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== DELETE CLASS ==========
  router.delete('/classes/:id', isTeacher, async (req, res) => {
    try {
      const cls = await loadClass(req, res, { manage: true });
      if (!cls) return;

      await run('DELETE FROM live_classes WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== START CLASS ==========
  router.post('/classes/:id/start', isTeacher, async (req, res) => {
    try {
      const cls = await loadClass(req, res, { manage: true });
      if (!cls) return;

      await updateLiveClass(req.params.id, {
        status: 'live',
        started_at: new Date().toISOString(),
      });

      res.json({ ok: true, class: await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]) });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== END CLASS ==========
  router.post('/classes/:id/end', isTeacher, async (req, res) => {
    try {
      const cls = await loadClass(req, res, { manage: true });
      if (!cls) return;

      await updateLiveClass(req.params.id, {
        status: 'ended',
        ended_at: new Date().toISOString(),
      });

      // Close every open attendance interval (adds to earlier visits)
      await closeLiveClassAttendance(req.params.id);

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== JOIN CLASS ==========
  router.post('/classes/:id/join', isAuthenticated, async (req, res) => {
    try {
      const cls = await loadClass(req, res);
      if (!cls) return;
      if (cls.status !== 'live') return res.status(400).json({ ok: false, error: 'Class is not live' });

      const role = cls.teacher_id === req.session.user.username ? 'teacher' : 'student';
      const participant = await joinLiveClass(req.params.id, req.session.user.username,
        req.session.user.display_name || req.session.user.username, role);

      res.json({ ok: true, participant });
    } catch (e) {
      res.status(e.status || 500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== LEAVE CLASS ==========
  router.post('/classes/:id/leave', isAuthenticated, async (req, res) => {
    try {
      await leaveLiveClass(req.params.id, req.session.user.username);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== GET PARTICIPANTS ==========
  router.get('/classes/:id/participants', isAuthenticated, async (req, res) => {
    try {
      if (!(await loadClass(req, res))) return;

      const participants = await all(
        'SELECT * FROM live_class_participants WHERE live_class_id = ? ORDER BY role DESC, joined_at ASC',
        [req.params.id]
      );

      res.json({ ok: true, participants });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== MESSAGES ==========
  router.get('/classes/:id/messages', isAuthenticated, async (req, res) => {
    try {
      if (!(await loadClass(req, res))) return;
      const messages = await all(
        'SELECT * FROM live_class_messages WHERE live_class_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
        [req.params.id, clampInt(req.query.limit, 100, 500), clampInt(req.query.offset, 0, 1e6)]
      );
      res.json({ ok: true, messages });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/classes/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const { message, message_type } = req.body;
      if (!message || typeof message !== 'string') return res.status(400).json({ ok: false, error: 'Message is required' });

      const cls = await loadClass(req, res);
      if (!cls) return;
      if (cls.status !== 'live') return res.status(400).json({ ok: false, error: 'Class is not live' });

      const msg = await addLiveClassMessage(
        req.params.id,
        req.session.user.username,
        req.session.user.display_name || req.session.user.username,
        message.substring(0, 2000),
        String(message_type || 'chat').slice(0, 32)
      );

      res.json({ ok: true, message: msg });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== RECORDINGS ==========
  router.get('/classes/:id/recordings', isAuthenticated, async (req, res) => {
    try {
      if (!(await loadClass(req, res))) return;
      const recordings = await all(
        'SELECT * FROM live_class_recordings WHERE live_class_id = ? ORDER BY created_at DESC',
        [req.params.id]
      );
      res.json({ ok: true, recordings });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/classes/:id/recordings', isTeacher, async (req, res) => {
    try {
      const { recording_type, file_url, duration_ms, metadata } = req.body;
      if (!(await loadClass(req, res, { manage: true }))) return;

      const result = await run(
        'INSERT INTO live_class_recordings (live_class_id, recording_type, file_url, duration_ms, status, metadata_json) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.id, recording_type || 'video', file_url || '', duration_ms || 0, 'ready', JSON.stringify(metadata || {})]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/classes/:id/publish-recording', isTeacher, async (req, res) => {
    try {
      const { recording_id } = req.body;
      const cls = await loadClass(req, res, { manage: true });
      if (!cls) return;

      const recording = await get('SELECT * FROM live_class_recordings WHERE id = ? AND live_class_id = ?',
        [recording_id, req.params.id]);
      if (!recording) return res.status(404).json({ ok: false, error: 'Recording not found' });

      await updateLiveClass(req.params.id, {
        recording_url: recording.file_url,
        status: cls.status === 'ended' ? 'ended' : 'recording_published',
      });

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== INVITES ==========
  router.post('/classes/:id/invite', isTeacher, async (req, res) => {
    try {
      const { user_id, email } = req.body;
      if (!user_id && !email) return res.status(400).json({ ok: false, error: 'User ID or email required' });
      if (!(await loadClass(req, res, { manage: true }))) return;

      const result = await run(
        'INSERT INTO live_class_invites (live_class_id, user_id, email, invite_status, invite_token) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, user_id || null, email || null, 'pending', crypto.randomBytes(12).toString('hex')]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== ATTENDANCE ==========
  router.get('/classes/:id/attendance', isTeacher, async (req, res) => {
    try {
      if (!(await loadClass(req, res, { manage: true }))) return;
      const attendance = await all(
        `SELECT p.user_id, p.user_name, p.role, p.joined_at, p.left_at, p.attendance_seconds,
          p.mic_enabled, p.camera_enabled, p.hand_raised
         FROM live_class_participants p
         WHERE p.live_class_id = ?
         ORDER BY p.attendance_seconds DESC`,
        [req.params.id]
      );

      const totalAttendance = attendance.reduce((sum, p) => sum + (p.attendance_seconds || 0), 0);
      const avgAttendance = attendance.length ? Math.round(totalAttendance / attendance.length) : 0;

      res.json({
        ok: true,
        attendance,
        summary: {
          totalParticipants: attendance.length,
          totalAttendanceSeconds: totalAttendance,
          avgAttendanceSeconds: avgAttendance,
        }
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  return router;
}

module.exports = { createLiveRouter };