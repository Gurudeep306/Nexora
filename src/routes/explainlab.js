/**
 * ExplainLab API Routes
 * Handles all REST API endpoints for the ExplainLab feature
 */

const express = require('express');
const { errMessage } = require("../http-error");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const eldb = require('../explainlab-db');

function createExplainLabRouter(deps) {
  const { get, all, run, fetch, fs, getSessionUser, requireAuthenticatedUser, _groqChat } = deps;
  const router = express.Router();

  // Upload configuration for ExplainLab media
  const explainlabUploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'explainlab');
  if (!fs.existsSync(explainlabUploadDir)) fs.mkdirSync(explainlabUploadDir, { recursive: true });
  
  const explainlabStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, explainlabUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `explainlab-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
  
  const explainlabUpload = multer({
    storage: explainlabStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for video/audio
    fileFilter: (_req, file, cb) => {
      const ok = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|pdf|svg|mp3|wav|ogg|m4a)$/i.test(file.originalname);
      cb(ok ? null : new Error('Unsupported file type'), ok);
    },
  });

  // ==================== Pages ====================

  // Serve ExplainLab teacher page
  router.get('/explainlab', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'explainlab.html'));
  });

  // Serve ExplainLab student viewer page
  router.get('/explainlab/view/:id', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'explainlab-viewer.html'));
  });

  // ==================== Session APIs ====================

  // Create new explanation session
  router.post('/api/explainlab/sessions', requireAuthenticatedUser, async (req, res) => {
    try {
      const {
        course_id, chapter_id, lesson_id, problem_id, custom_problem_id,
        title, description, explanation_type, level, language
      } = req.body;

      if (!title) return res.status(400).json({ ok: false, error: 'Title is required' });

      const sessionId = await eldb.createSession({
        teacher_id: req.sessionUser.username,
        course_id,
        chapter_id,
        lesson_id,
        problem_id,
        custom_problem_id,
        title,
        description,
        explanation_type,
        level,
        language
      });

      // Create initial blank page
      const pageId = await eldb.createPage({
        session_id: sessionId,
        page_index: 0,
        title: 'Page 1',
        background_type: 'white'
      });

      const session = await eldb.getSession(sessionId);
      res.json({ ok: true, session, initialPageId: pageId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // Get session by ID
  router.get('/api/explainlab/sessions/:id', async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      // Check permissions - draft sessions only visible to creator/admin
      if (session.status === 'draft') {
        const user = getSessionUser(req);
        if (!user || user.username !== session.teacher_id || user.role !== 'admin') {
          return res.status(403).json({ ok: false, error: 'Unauthorized' });
        }
      }

      // Enrich with related data
      session.pages = await eldb.getPagesBySession(session.id);
      session.markers = await eldb.getMarkersBySession(session.id);
      session.clips = await eldb.getClipsBySession(session.id);

      res.json({ ok: true, session });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // Get sessions by filters
  router.get('/api/explainlab/sessions', async (req, res) => {
    try {
      const {
        teacher_id, course_id, chapter_id, lesson_id, problem_id,
        status, search, limit, offset
      } = req.query;

      if (search) {
        const result = await eldb.searchSessions(search, {
          status: status || 'published',
          limit: parseInt(limit) || 20,
          offset: parseInt(offset) || 0
        });
        return res.json({ ok: true, ...result });
      }

      const result = await eldb.getSessionsByFilters({
        teacher_id, course_id, chapter_id, lesson_id, problem_id,
        status: status || 'published',
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // Update session
  router.put('/api/explainlab/sessions/:id', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      // Check ownership
      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      await eldb.updateSession(req.params.id, req.body);
      const updated = await eldb.getSession(req.params.id);
      res.json({ ok: true, session: updated });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // Publish session
  router.post('/api/explainlab/sessions/:id/publish', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      await eldb.publishSession(req.params.id);
      const updated = await eldb.getSession(req.params.id);
      res.json({ ok: true, session: updated });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // Delete session
  router.delete('/api/explainlab/sessions/:id', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      await eldb.deleteSession(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Typed Notes APIs ====================

  router.get('/api/explainlab/sessions/:id/typed-notes', async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      // Check permissions
      if (session.status === 'draft') {
        const user = getSessionUser(req);
        if (!user || user.username !== session.teacher_id || user.role !== 'admin') {
          return res.status(403).json({ ok: false, error: 'Unauthorized' });
        }
      }

      res.json({ ok: true, html: session.typed_notes_html || '' });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.put('/api/explainlab/sessions/:id/typed-notes', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const { html } = req.body;
      await eldb.updateSession(req.params.id, { typed_notes_html: html });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Full Explanation APIs ====================

  router.get('/api/explainlab/sessions/:id/full-explanation', async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (session.status === 'draft') {
        const user = getSessionUser(req);
        if (!user || user.username !== session.teacher_id || user.role !== 'admin') {
          return res.status(403).json({ ok: false, error: 'Unauthorized' });
        }
      }

      res.json({ ok: true, html: session.full_explanation_html || '' });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.put('/api/explainlab/sessions/:id/full-explanation', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const { html } = req.body;
      await eldb.updateSession(req.params.id, { full_explanation_html: html });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Pages APIs ====================

  router.get('/api/explainlab/sessions/:id/pages', async (req, res) => {
    try {
      const pages = await eldb.getPagesBySession(req.params.id);
      res.json({ ok: true, pages });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/pages', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const pages = await eldb.getPagesBySession(req.params.id);
      const nextPageIndex = pages.length;

      const { title, background_type, background_data, is_handwritten_note } = req.body;
      const pageId = await eldb.createPage({
        session_id: req.params.id,
        page_index: nextPageIndex,
        title: title || `Page ${nextPageIndex + 1}`,
        background_type: background_type || 'white',
        background_data: background_data || null,
        is_handwritten_note: is_handwritten_note || 0
      });

      res.json({ ok: true, pageId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.put('/api/explainlab/pages/:pageId', requireAuthenticatedUser, async (req, res) => {
    try {
      const page = await eldb.getPage(req.params.pageId);
      if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });

      const session = await eldb.getSession(page.session_id);
      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      await eldb.updatePage(req.params.pageId, req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.delete('/api/explainlab/pages/:pageId', requireAuthenticatedUser, async (req, res) => {
    try {
      const page = await eldb.getPage(req.params.pageId);
      if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });

      const session = await eldb.getSession(page.session_id);
      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      await eldb.deletePage(req.params.pageId);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Events APIs (Whiteboard Recording) ====================

  router.post('/api/explainlab/sessions/:id/events', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const { page_id, timestamp_ms, event_type, payload_json } = req.body;
      if (!event_type || timestamp_ms === undefined) {
        return res.status(400).json({ ok: false, error: 'event_type and timestamp_ms required' });
      }

      const eventId = await eldb.createEvent({
        session_id: req.params.id,
        page_id,
        timestamp_ms,
        event_type,
        payload_json: JSON.stringify(payload_json || {})
      });

      res.json({ ok: true, eventId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/events/bulk', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const { events } = req.body;
      if (!Array.isArray(events)) {
        return res.status(400).json({ ok: false, error: 'events array required' });
      }

      await eldb.createEventsBulk(req.params.id, events);
      res.json({ ok: true, count: events.length });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/explainlab/sessions/:id/events', async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      // Check permissions
      if (session.status === 'draft') {
        const user = getSessionUser(req);
        if (!user || user.username !== session.teacher_id || user.role !== 'admin') {
          return res.status(403).json({ ok: false, error: 'Unauthorized' });
        }
      }

      const { start_time, end_time, page_id } = req.query;
      const events = await eldb.getEventsBySession(
        req.params.id,
        parseInt(start_time) || 0,
        end_time ? parseInt(end_time) : null
      );

      // Parse payload JSON
      events.forEach(e => {
        try { e.payload = JSON.parse(e.payload_json); } catch { e.payload = {}; }
        delete e.payload_json;
      });

      res.json({ ok: true, events });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Code Events APIs ====================

  router.post('/api/explainlab/sessions/:id/code-events', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const { timestamp_ms, language, event_type, payload_json } = req.body;
      if (!event_type || timestamp_ms === undefined) {
        return res.status(400).json({ ok: false, error: 'event_type and timestamp_ms required' });
      }

      const eventId = await eldb.createCodeEvent({
        session_id: req.params.id,
        timestamp_ms,
        language: language || 'cpp',
        event_type,
        payload_json: JSON.stringify(payload_json || {})
      });

      res.json({ ok: true, eventId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get('/api/explainlab/sessions/:id/code-events', async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (session.status === 'draft') {
        const user = getSessionUser(req);
        if (!user || user.username !== session.teacher_id || user.role !== 'admin') {
          return res.status(403).json({ ok: false, error: 'Unauthorized' });
        }
      }

      const { start_time, end_time } = req.query;
      const events = await eldb.getCodeEventsBySession(
        req.params.id,
        parseInt(start_time) || 0,
        end_time ? parseInt(end_time) : null
      );

      // Parse payload JSON
      events.forEach(e => {
        try { e.payload = JSON.parse(e.payload_json); } catch { e.payload = {}; }
        delete e.payload_json;
      });

      res.json({ ok: true, events });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Handwritten Notes APIs ====================

  router.get('/api/explainlab/sessions/:id/handwritten-notes', async (req, res) => {
    try {
      const notes = await eldb.getHandwrittenNotesBySession(req.params.id);
      res.json({ ok: true, notes });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/handwritten-notes', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const notes = await eldb.getHandwrittenNotesBySession(req.params.id);
      const nextPageIndex = notes.length;

      const { title, file_url, file_type, source_type } = req.body;
      const noteId = await eldb.createHandwrittenNote({
        session_id: req.params.id,
        page_index: nextPageIndex,
        title: title || `Note ${nextPageIndex + 1}`,
        file_url,
        file_type: file_type || 'image',
        source_type: source_type || 'upload'
      });

      res.json({ ok: true, noteId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.delete('/api/explainlab/handwritten-notes/:noteId', requireAuthenticatedUser, async (req, res) => {
    try {
      await eldb.deleteHandwrittenNote(req.params.noteId);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Markers APIs ====================

  router.get('/api/explainlab/sessions/:id/markers', async (req, res) => {
    try {
      const markers = await eldb.getMarkersBySession(req.params.id);
      res.json({ ok: true, markers });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/markers', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const { timestamp_ms, title, description, marker_type } = req.body;
      if (!timestamp_ms || !title) {
        return res.status(400).json({ ok: false, error: 'timestamp_ms and title required' });
      }

      const markerId = await eldb.createMarker({
        session_id: req.params.id,
        timestamp_ms,
        title,
        description,
        marker_type: marker_type || 'chapter'
      });

      res.json({ ok: true, markerId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.delete('/api/explainlab/markers/:markerId', requireAuthenticatedUser, async (req, res) => {
    try {
      await eldb.deleteMarker(req.params.markerId);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Clips APIs ====================

  router.get('/api/explainlab/sessions/:id/clips', async (req, res) => {
    try {
      const clips = await eldb.getClipsBySession(req.params.id);
      res.json({ ok: true, clips });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/clips', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const { title, start_ms, end_ms, description } = req.body;
      if (!title || start_ms === undefined || end_ms === undefined) {
        return res.status(400).json({ ok: false, error: 'title, start_ms, end_ms required' });
      }

      const clipId = await eldb.createClip({
        session_id: req.params.id,
        title,
        start_ms,
        end_ms,
        description
      });

      res.json({ ok: true, clipId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.delete('/api/explainlab/clips/:clipId', requireAuthenticatedUser, async (req, res) => {
    try {
      await eldb.deleteClip(req.params.clipId);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Student Notes APIs ====================

  router.get('/api/explainlab/sessions/:id/notes', requireAuthenticatedUser, async (req, res) => {
    try {
      const notes = await eldb.getStudentNotesBySession(req.params.id, req.sessionUser.username);
      res.json({ ok: true, notes });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/notes', requireAuthenticatedUser, async (req, res) => {
    try {
      const { timestamp_ms, page_id, note_text, visibility } = req.body;
      if (!note_text) {
        return res.status(400).json({ ok: false, error: 'note_text required' });
      }

      const noteId = await eldb.createStudentNote({
        session_id: req.params.id,
        user_id: req.sessionUser.username,
        timestamp_ms: timestamp_ms || 0,
        page_id,
        note_text,
        visibility: visibility || 'private'
      });

      res.json({ ok: true, noteId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.delete('/api/explainlab/notes/:noteId', requireAuthenticatedUser, async (req, res) => {
    try {
      await eldb.deleteStudentNote(req.params.noteId, req.sessionUser.username);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Bookmarks APIs ====================

  router.get('/api/explainlab/sessions/:id/bookmarks', requireAuthenticatedUser, async (req, res) => {
    try {
      const bookmarks = await eldb.getBookmarksBySession(req.params.id, req.sessionUser.username);
      res.json({ ok: true, bookmarks });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/bookmarks', requireAuthenticatedUser, async (req, res) => {
    try {
      const { timestamp_ms, label } = req.body;
      if (timestamp_ms === undefined) {
        return res.status(400).json({ ok: false, error: 'timestamp_ms required' });
      }

      const bookmarkId = await eldb.createBookmark({
        session_id: req.params.id,
        user_id: req.sessionUser.username,
        timestamp_ms,
        label: label || ''
      });

      res.json({ ok: true, bookmarkId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.delete('/api/explainlab/bookmarks/:bookmarkId', requireAuthenticatedUser, async (req, res) => {
    try {
      await eldb.deleteBookmark(req.params.bookmarkId, req.sessionUser.username);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Doubts APIs ====================

  router.get('/api/explainlab/sessions/:id/doubts', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      // Students see their own doubts, teachers see all
      let doubts;
      if (req.sessionUser.username === session.teacher_id || req.sessionUser.role === 'admin') {
        doubts = await eldb.getDoubtsBySession(req.params.id);
        // Include replies
        for (const doubt of doubts) {
          doubt.replies = await eldb.getDoubtReplies(doubt.id);
        }
      } else {
        doubts = await eldb.getDoubtsByStudent(req.sessionUser.username);
        doubts = doubts.filter(d => d.session_id == req.params.id);
      }

      res.json({ ok: true, doubts });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/doubts', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (!session.allow_public_doubts && req.sessionUser.username !== session.teacher_id) {
        return res.status(403).json({ ok: false, error: 'Doubts are not allowed on this session' });
      }

      const { page_id, timestamp_ms, x, y, doubt_text } = req.body;
      if (!doubt_text) {
        return res.status(400).json({ ok: false, error: 'doubt_text required' });
      }

      const doubtId = await eldb.createDoubt({
        session_id: req.params.id,
        student_id: req.sessionUser.username,
        page_id,
        timestamp_ms: timestamp_ms || 0,
        x,
        y,
        doubt_text
      });

      res.json({ ok: true, doubtId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/doubts/:doubtId/reply', requireAuthenticatedUser, async (req, res) => {
    try {
      const { reply_text, reply_type, payload_json } = req.body;
      if (!reply_text) {
        return res.status(400).json({ ok: false, error: 'reply_text required' });
      }

      const replyId = await eldb.createDoubtReply({
        doubt_id: parseInt(req.params.doubtId),
        teacher_id: req.sessionUser.username,
        reply_text,
        reply_type: reply_type || 'text',
        payload_json: payload_json ? JSON.stringify(payload_json) : null
      });

      res.json({ ok: true, replyId });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.put('/api/explainlab/doubts/:doubtId/resolve', requireAuthenticatedUser, async (req, res) => {
    try {
      await eldb.resolveDoubt(parseInt(req.params.doubtId), req.sessionUser.username);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Progress APIs ====================

  router.get('/api/explainlab/sessions/:id/progress', requireAuthenticatedUser, async (req, res) => {
    try {
      const progress = await eldb.getProgress(req.params.id, req.sessionUser.username);
      res.json({ ok: true, progress: progress || null });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/progress', requireAuthenticatedUser, async (req, res) => {
    try {
      await eldb.updateProgress({
        session_id: req.params.id,
        user_id: req.sessionUser.username,
        ...req.body
      });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Analytics APIs ====================

  router.get('/api/explainlab/sessions/:id/analytics', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      // Only teacher/admin can view analytics
      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const analytics = await eldb.getSessionAnalytics(req.params.id);
      res.json({ ok: true, analytics });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/analytics', async (req, res) => {
    try {
      await eldb.logAnalyticsEvent({
        session_id: req.params.id,
        user_id: req.sessionUser?.username || null,
        ...req.body
      });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Media Upload APIs ====================

  router.post('/api/explainlab/sessions/:id/upload-media', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      if (req.sessionUser.username !== session.teacher_id && req.sessionUser.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      // Handle file upload via multer
      // For now, return placeholder - actual upload handled by existing studio upload
      res.json({ ok: false, error: 'Use /api/studio/upload for media uploads' });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== AI Assistant APIs ====================

  router.post('/api/explainlab/sessions/:id/ai/summary', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      const apiKey = process.env.GROQ_API_KEY || 'kronos-sovereign';

      // Get events for context
      const events = await eldb.getEventsBySession(req.params.id);
      const markers = await eldb.getMarkersBySession(req.params.id);

      const prompt = `Create a concise summary of this teaching session. Title: "${session.title}". 
      Description: ${session.description || 'No description'}. 
      Key moments: ${markers.map(m => `${m.title} at ${m.timestamp_ms}ms`).join(', ')}.
      Return a short paragraph summary (3-5 sentences).`;

      const result = await _groqChat(apiKey, [
        { role: 'system', content: 'You are an educational content summarizer. Create clear, helpful summaries of teaching sessions.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 500, temperature: 0.3 });

      if (!result.ok) return res.json({ ok: false, error: result.error });

      // Save AI output
      await eldb.saveAIOutput({
        session_id: req.params.id,
        output_type: 'summary',
        content_json: JSON.stringify({ summary: result.content }),
        created_by: req.sessionUser.username
      });

      res.json({ ok: true, summary: result.content });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/ai/notes', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      const apiKey = process.env.GROQ_API_KEY || 'kronos-sovereign';

      const prompt = `Based on this teaching session titled "${session.title}", generate structured typed notes in HTML format.
      Include: key concepts, important formulas, examples, and common mistakes.
      Use proper HTML tags (<h2>, <h3>, <p>, <ul>, <li>, <code>, <strong>).
      Description: ${session.description || 'No description'}.`;

      const result = await _groqChat(apiKey, [
        { role: 'system', content: 'You are an expert educational note-taker. Create well-structured HTML notes from teaching content.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 3000, temperature: 0.2 });

      if (!result.ok) return res.json({ ok: false, error: result.error });

      await eldb.saveAIOutput({
        session_id: req.params.id,
        output_type: 'notes',
        content_json: JSON.stringify({ notes_html: result.content }),
        created_by: req.sessionUser.username
      });

      res.json({ ok: true, notes_html: result.content });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/ai/full-explanation', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      const apiKey = process.env.GROQ_API_KEY || 'kronos-sovereign';

      const prompt = `Create a comprehensive full explanation for this teaching session titled "${session.title}".
      
      Structure the explanation with these sections:
      1. Introduction - What is this topic?
      2. Prerequisites - What should students know before?
      3. Main Concept - Detailed explanation
      4. Step-by-step breakdown
      5. Examples and applications
      6. Common mistakes to avoid
      7. Summary and key takeaways
      8. Practice suggestions

      Use proper HTML formatting with headings, paragraphs, lists, and code blocks where appropriate.
      Description: ${session.description || 'No description'}.`;

      const result = await _groqChat(apiKey, [
        { role: 'system', content: 'You are an expert educator. Create comprehensive, well-structured explanations for students.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 4000, temperature: 0.2 });

      if (!result.ok) return res.json({ ok: false, error: result.error });

      await eldb.saveAIOutput({
        session_id: req.params.id,
        output_type: 'full_explanation',
        content_json: JSON.stringify({ explanation_html: result.content }),
        created_by: req.sessionUser.username
      });

      res.json({ ok: true, explanation_html: result.content });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/ai/quiz', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      const apiKey = process.env.GROQ_API_KEY || 'kronos-sovereign';

      const prompt = `Generate 5 multiple-choice quiz questions based on this teaching session titled "${session.title}".
      Return ONLY a valid JSON array in this format:
      [
        {
          "question": "Question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Why this answer is correct"
        }
      ]
      Description: ${session.description || 'No description'}.`;

      const result = await _groqChat(apiKey, [
        { role: 'system', content: 'You are an expert quiz creator. Generate valid JSON quiz questions.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 2000, temperature: 0.3 });

      if (!result.ok) return res.json({ ok: false, error: result.error });

      let quiz;
      try {
        quiz = JSON.parse(result.content);
      } catch {
        return res.json({ ok: false, error: 'Failed to parse quiz JSON' });
      }

      await eldb.saveAIOutput({
        session_id: req.params.id,
        output_type: 'quiz',
        content_json: JSON.stringify({ questions: quiz }),
        created_by: req.sessionUser.username
      });

      res.json({ ok: true, quiz });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post('/api/explainlab/sessions/:id/ai/flashcards', requireAuthenticatedUser, async (req, res) => {
    try {
      const session = await eldb.getSession(req.params.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      const apiKey = process.env.GROQ_API_KEY || 'kronos-sovereign';

      const prompt = `Generate 10 flashcards for quick revision based on this teaching session titled "${session.title}".
      Return ONLY a valid JSON array in this format:
      [
        {"front": "Term or question", "back": "Definition or answer"}
      ]
      Description: ${session.description || 'No description'}.`;

      const result = await _groqChat(apiKey, [
        { role: 'system', content: 'You are an expert at creating flashcards for students. Generate valid JSON.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 2000, temperature: 0.3 });

      if (!result.ok) return res.json({ ok: false, error: result.error });

      let flashcards;
      try {
        flashcards = JSON.parse(result.content);
      } catch {
        return res.json({ ok: false, error: 'Failed to parse flashcards JSON' });
      }

      await eldb.saveAIOutput({
        session_id: req.params.id,
        output_type: 'flashcards',
        content_json: JSON.stringify({ cards: flashcards }),
        created_by: req.sessionUser.username
      });

      res.json({ ok: true, flashcards });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // ==================== Teacher Dashboard APIs ====================

  router.get('/api/explainlab/teacher/sessions', requireAuthenticatedUser, async (req, res) => {
    try {
      const { status } = req.query;
      const result = await eldb.getSessionsByFilters({
        teacher_id: req.sessionUser.username,
        status: status || 'all',
        limit: 50,
        offset: 0
      });
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // Serve teacher dashboard page
  // The dashboard page was never built — this pointed at a file that has never
  // existed, so every visit returned an ENOENT. Send people to the ExplainLab
  // page that does exist instead of to a broken response.
  router.get('/explainlab/dashboard', requireAuthenticatedUser, (_req, res) => {
    const built = path.join(__dirname, '..', '..', 'public', 'explainlab.html');
    if (fs.existsSync(built)) return res.sendFile(built);
    res.redirect('/explainlab');
  });

  return router;
}

module.exports = { createExplainLabRouter };