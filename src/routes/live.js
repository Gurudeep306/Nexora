/**
 * Nexora LiveClass API Routes
 * Live streaming and recording system
 */

const express = require('express');
const { errMessage } = require("../http-error");
const { run, get, all } = require('../db');
const { initLiveDb } = require('../live-db');

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
    if (role !== 'admin' && role !== 'teacher') return res.status(403).json({ ok: false, error: 'Teacher or Admin only' });
    next();
  };

  // ========== LIVE CLASSES LIST ==========
  router.get('/classes', isAuthenticated, async (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      let where = ['1=1'];
      let params = [];

      if (status) {
        where.push('status = ?');
        params.push(status);
      }

      // Only show public classes or classes user is invited to (for students)
      if (req.session.user.role === 'student') {
        where.push('(is_public = 1 OR EXISTS(SELECT 1 FROM live_class_invites WHERE live_class_id = live_classes.id AND user_id = ? AND invite_status = ?))');
        params.push(req.session.user.username, 'accepted');
      }

      const whereClause = where.join(' AND ');
      const classes = await all(
        `SELECT * FROM live_classes WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, +limit, +offset]
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
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });

      // Check access
      if (!cls.is_public && req.session.user.role === 'student') {
        const invite = await get('SELECT * FROM live_class_invites WHERE live_class_id = ? AND user_id = ? AND invite_status = ?',
          [cls.id, req.session.user.username, 'accepted']);
        if (!invite && cls.teacher_id !== req.session.user.username) {
          return res.status(403).json({ ok: false, error: 'Not authorized' });
        }
      }

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
        isTeacher: req.session.user.username === cls.teacher_id || req.session.user.role === 'admin',
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
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });
      if (cls.teacher_id !== req.session.user.username && req.session.user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Not authorized' });
      }

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
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });
      if (cls.teacher_id !== req.session.user.username && req.session.user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Not authorized' });
      }

      await run('DELETE FROM live_classes WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== START CLASS ==========
  router.post('/classes/:id/start', isTeacher, async (req, res) => {
    try {
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });
      if (cls.teacher_id !== req.session.user.username && req.session.user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Not authorized' });
      }

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
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });
      if (cls.teacher_id !== req.session.user.username && req.session.user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Not authorized' });
      }

      await updateLiveClass(req.params.id, {
        status: 'ended',
        ended_at: new Date().toISOString(),
      });

      // Calculate attendance for all participants
      await run(`
        UPDATE live_class_participants 
        SET left_at = COALESCE(left_at, CURRENT_TIMESTAMP),
            attendance_seconds = CASE 
              WHEN left_at IS NULL THEN 
                (strftime('%s', 'now') - strftime('%s', joined_at))
              ELSE attendance_seconds 
            END
        WHERE live_class_id = ? AND left_at IS NULL
      `, [req.params.id]);

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== JOIN CLASS ==========
  router.post('/classes/:id/join', isAuthenticated, async (req, res) => {
    try {
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });
      if (cls.status !== 'live') return res.status(400).json({ ok: false, error: 'Class is not live' });

      // Check access
      if (!cls.is_public && req.session.user.role === 'student') {
        const invite = await get('SELECT * FROM live_class_invites WHERE live_class_id = ? AND user_id = ? AND invite_status = ?',
          [cls.id, req.session.user.username, 'accepted']);
        if (!invite && cls.teacher_id !== req.session.user.username) {
          return res.status(403).json({ ok: false, error: 'Not authorized' });
        }
      }

      const role = cls.teacher_id === req.session.user.username ? 'teacher' : 'student';
      const participant = await joinLiveClass(req.params.id, req.session.user.username,
        req.session.user.display_name || req.session.user.username, role);

      res.json({ ok: true, participant });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
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
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });

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
      const { limit = 100, offset = 0 } = req.query;
      const messages = await all(
        'SELECT * FROM live_class_messages WHERE live_class_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
        [req.params.id, +limit, +offset]
      );
      res.json({ ok: true, messages });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/classes/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const { message, message_type } = req.body;
      if (!message) return res.status(400).json({ ok: false, error: 'Message is required' });

      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });
      if (cls.status !== 'live') return res.status(400).json({ ok: false, error: 'Class is not live' });

      const msg = await addLiveClassMessage(
        req.params.id,
        req.session.user.username,
        req.session.user.display_name || req.session.user.username,
        message.substring(0, 2000),
        message_type || 'chat'
      );

      res.json({ ok: true, message: msg });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== RECORDINGS ==========
  router.get('/classes/:id/recordings', isAuthenticated, async (req, res) => {
    try {
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
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });

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
      const { recording_id, explain_session_id } = req.body;
      const cls = await get('SELECT * FROM live_classes WHERE id = ?', [req.params.id]);
      if (!cls) return res.status(404).json({ ok: false, error: 'Class not found' });

      const recording = await get('SELECT * FROM live_class_recordings WHERE id = ? AND live_class_id = ?',
        [recording_id, req.params.id]);
      if (!recording) return res.status(404).json({ ok: false, error: 'Recording not found' });

      await updateLiveClass(req.params.id, {
        recording_url: recording.file_url,
        explain_session_id: explain_session_id || null,
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

      const result = await run(
        'INSERT INTO live_class_invites (live_class_id, user_id, email, invite_status, invite_token) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, user_id || null, email || null, 'pending', Math.random().toString(36).slice(2, 12)]
      );

      res.json({ ok: true, id: result.lastID });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ========== ATTENDANCE ==========
  router.get('/classes/:id/attendance', isTeacher, async (req, res) => {
    try {
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