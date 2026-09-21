/**
 * ExplainLab Student Viewer
 * Handles all student-side viewing and interaction
 */

(function() {
  'use strict';

  // ==================== State ====================
  let state = {
    sessionId: null,
    session: null,
    replayEngine: null,
    currentMode: 'video',
    events: [],
    markers: [],
    handwrittenNotes: [],
    currentHandwrittenIndex: 0,
    zoomLevel: 100,
    isReplaying: false,
    replayProgress: 0,
    videoProgress: 0,
    audioProgress: 0,
    lastWatchedMs: 0,
    isCompleted: false
  };

  // ==================== DOM Elements ====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const elements = {
    // Header
    sessionTitle: $('#sessionTitle'),
    teacherName: $('#teacherName'),
    levelBadge: $('#levelBadge'),

    // Mode tabs
    modeTabs: $$('[data-mode]'),
    modeContents: $$('.ev-mode-content'),

    // Video
    videoPlayer: $('#videoPlayer'),
    videoPlaceholder: $('#videoPlaceholder'),

    // Audio
    audioPlayer: $('#audioPlayer'),
    audioPlaceholder: $('#audioPlaceholder'),
    audioWave: $('#audioWave'),

    // Replay
    replayCanvas: $('#replayCanvas'),
    btnReplayPlay: $('#btnReplayPlay'),
    btnReplayPause: $('#btnReplayPause'),
    replaySeek: $('#replaySeek'),
    replayTime: $('#replayTime'),
    replaySpeed: $('#replaySpeed'),

    // Typed Notes
    typedNotesContent: $('#typedNotesContent'),
    btnCopyNotes: $('#btnCopyNotes'),
    btnDownloadNotes: $('#btnDownloadNotes'),

    // Handwritten
    handwrittenThumbs: $('#handwrittenThumbs'),
    handwrittenViewer: $('#handwrittenViewer'),
    handwrittenImage: $('#handwrittenImage'),
    btnZoomIn: $('#btnZoomIn'),
    btnZoomOut: $('#btnZoomOut'),
    zoomLevel: $('#zoomLevel'),
    btnPrevPage: $('#btnPrevPage'),
    btnNextPage: $('#btnNextPage'),
    pageIndicator: $('#pageIndicator'),

    // Explanation
    explanationContent: $('#explanationContent'),

    // Sidebar
    chaptersList: $('#chaptersList'),
    myNotesList: $('#myNotesList'),
    doubtsList: $('#doubtsList'),
    aiSummary: $('#aiSummary'),
    btnGenerateSummary: $('#btnGenerateSummary'),

    // Student actions
    btnBookmark: $('#btnBookmark'),
    btnAddNote: $('#btnAddNote'),
    btnAskDoubt: $('#btnAskDoubt'),

    // Modals
    doubtModal: $('#doubtModal'),
    doubtForm: $('#doubtForm'),
    noteModal: $('#noteModal'),
    noteForm: $('#noteForm'),

    // Bottom bar
    progressPercent: $('#progressPercent'),
    lastWatched: $('#lastWatched'),
    completionStatus: $('#completionStatus'),
    statusText: $('#statusText'),

    // Toast
    toastContainer: $('#toastContainer')
  };

  // ==================== Toast ====================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `el-toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span><span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==================== Initialize ====================
  async function init() {
    // Get session ID from URL
    const pathParts = window.location.pathname.split('/');
    state.sessionId = pathParts[pathParts.length - 1];

    if (!state.sessionId) {
      showToast('No session ID found', 'error');
      return;
    }

    // Load session data
    await loadSession(state.sessionId);

    // Setup event listeners
    setupEventListeners();

    // Setup mode tabs
    setupModeTabs();

    // Start progress tracking
    startProgressTracking();
  }

  // ==================== Load Session ====================
  async function loadSession(sessionId) {
    try {
      const result = await ExplainLabAPI.getSession(sessionId);
      if (!result.ok) throw new Error(result.error);

      state.session = result.session;

      // Update header
      elements.sessionTitle.textContent = state.session.title || 'Untitled Session';
      elements.teacherName.textContent = `By ${state.session.teacher_id}`;
      elements.levelBadge.textContent = state.session.level || 'All Levels';

      // Load events for replay
      const eventsResult = await ExplainLabAPI.getEvents(sessionId);
      if (eventsResult.ok) {
        state.events = eventsResult.events;
        initReplay();
      }

      // Load markers/chapters
      const markersResult = await ExplainLabAPI.getMarkers(sessionId);
      if (markersResult.ok) {
        state.markers = markersResult.markers;
        updateChaptersList();
      }

      // Load typed notes
      const notesResult = await ExplainLabAPI.getTypedNotes(sessionId);
      if (notesResult.ok && notesResult.html) {
        elements.typedNotesContent.innerHTML = notesResult.html;
      }

      // Load full explanation
      const explResult = await ExplainLabAPI.getFullExplanation(sessionId);
      if (explResult.ok && explResult.html) {
        elements.explanationContent.innerHTML = explResult.html;
      }

      // Load handwritten notes
      const hwResult = await ExplainLabAPI.getHandwrittenNotes(sessionId);
      if (hwResult.ok && hwResult.notes.length > 0) {
        state.handwrittenNotes = hwResult.notes;
        updateHandwrittenThumbs();
      }

      // Load progress
      const progressResult = await ExplainLabAPI.getProgress(sessionId);
      if (progressResult.ok && progressResult.progress) {
        state.lastWatchedMs = progressResult.progress.last_position_ms || 0;
        updateProgressUI(progressResult.progress);
      }

      // Load student notes
      try {
        const myNotesResult = await ExplainLabAPI.getStudentNotes(sessionId);
        if (myNotesResult.ok && myNotesResult.notes.length > 0) {
          updateMyNotesList(myNotesResult.notes);
        }
      } catch(e) {}

      // Load doubts
      try {
        const doubtsResult = await ExplainLabAPI.getDoubts(sessionId);
        if (doubtsResult.ok && doubtsResult.doubts.length > 0) {
          updateDoubtsList(doubtsResult.doubts);
        }
      } catch(e) {}

      // Check if video exists
      if (state.session.video_url) {
        elements.videoPlayer.querySelector('source').src = state.session.video_url;
        elements.videoPlayer.style.display = 'block';
        elements.videoPlaceholder.style.display = 'none';
      }

      // Check if audio exists
      if (state.session.audio_url) {
        elements.audioPlayer.querySelector('source').src = state.session.audio_url;
        elements.audioPlayer.style.display = 'block';
        elements.audioPlaceholder.style.display = 'none';
      }

    } catch (e) {
      showToast('Failed to load session: ' + e.message, 'error');
    }
  }

  // ==================== Mode Tabs ====================
  function setupModeTabs() {
    elements.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        switchMode(mode);
      });
    });
  }

  function switchMode(mode) {
    state.currentMode = mode;

    // Update tabs
    elements.modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

    // Update content
    elements.modeContents.forEach(c => {
      c.classList.toggle('active', c.id === `mode${capitalize(mode)}`);
    });

    // Log analytics
    ExplainLabAPI.logAnalytics(state.sessionId, {
      event_type: 'view_mode',
      payload_json: { mode }
    }).catch(() => {});
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ==================== Replay ====================
  function initReplay() {
    if (state.events.length === 0) return;

    state.replayEngine = new WhiteboardEngine(elements.replayCanvas);

    // Calculate total duration
    const maxTime = Math.max(...state.events.map(e => e.timestamp_ms));
    state.totalDuration = maxTime;

    // Update time display
    elements.replayTime.textContent = `0:00 / ${formatTime(maxTime)}`;

    // Setup controls
    elements.btnReplayPlay.addEventListener('click', startReplay);
    elements.btnReplayPause.addEventListener('click', pauseReplay);
    elements.replaySeek.addEventListener('input', seekReplay);
    elements.replaySpeed.addEventListener('change', changeSpeed);
  }

  function startReplay() {
    if (state.isReplaying) return;
    state.isReplaying = true;

    elements.btnReplayPlay.style.display = 'none';
    elements.btnReplayPause.style.display = 'block';

    const speed = parseFloat(elements.replaySpeed.value);
    const startTime = Date.now() - (state.replayProgress * state.totalDuration / 100 / speed);

    const animate = () => {
      if (!state.isReplaying) return;

      const speed = parseFloat(elements.replaySpeed.value);
      const elapsed = (Date.now() - startTime) * speed;
      const progress = Math.min(elapsed / state.totalDuration, 1);

      state.replayProgress = progress * 100;
      elements.replaySeek.value = state.replayProgress;
      elements.replayTime.textContent = `${formatTime(elapsed)} / ${formatTime(state.totalDuration)}`;

      // Replay events up to current time
      state.replayEngine.clearCanvas();
      const eventsToApply = state.events.filter(e => e.timestamp_ms <= elapsed);
      state.replayEngine.replayEvents(eventsToApply, true);

      // Update progress
      updateProgressMs(elapsed);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pauseReplay();
        showToast('Replay completed', 'success');
      }
    };

    animate();
  }

  function pauseReplay() {
    state.isReplaying = false;
    elements.btnReplayPlay.style.display = 'block';
    elements.btnReplayPause.style.display = 'none';
  }

  function seekReplay() {
    const progress = parseFloat(elements.replaySeek.value);
    state.replayProgress = progress;
    const timeMs = (progress / 100) * state.totalDuration;

    elements.replayTime.textContent = `${formatTime(timeMs)} / ${formatTime(state.totalDuration)}`;

    // Apply events up to this point
    if (state.replayEngine) {
      state.replayEngine.clearCanvas();
      const eventsToApply = state.events.filter(e => e.timestamp_ms <= timeMs);
      state.replayEngine.replayEvents(eventsToApply, true);
    }

    updateProgressMs(timeMs);
  }

  function changeSpeed() {
    // Speed change takes effect on next play
    const speed = elements.replaySpeed.value;
    showToast(`Speed: ${speed}x`, 'info');
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // ==================== Chapters ====================
  function updateChaptersList() {
    if (state.markers.length === 0) {
      elements.chaptersList.innerHTML = '<p class="ev-empty-state">No chapters marked.</p>';
      return;
    }

    elements.chaptersList.innerHTML = state.markers.map(marker => `
      <div class="ev-chapter-item" data-time="${marker.timestamp_ms}">
        <span class="ev-chapter-time">${formatTime(marker.timestamp_ms)}</span>
        <span>${marker.title}</span>
      </div>
    `).join('');

    // Add click handlers
    elements.chaptersList.querySelectorAll('.ev-chapter-item').forEach(item => {
      item.addEventListener('click', () => {
        const time = parseInt(item.dataset.time);
        seekToTime(time);
      });
    });
  }

  function seekToTime(timeMs) {
    // Seek video
    if (elements.videoPlayer.src && elements.videoPlayer.readyState >= 1) {
      elements.videoPlayer.currentTime = timeMs / 1000;
    }

    // Seek audio
    if (elements.audioPlayer.src && elements.audioPlayer.readyState >= 1) {
      elements.audioPlayer.currentTime = timeMs / 1000;
    }

    // Seek replay
    if (state.events.length > 0) {
      const progress = (timeMs / state.totalDuration) * 100;
      state.replayProgress = progress;
      elements.replaySeek.value = progress;
      seekReplay();
    }

    updateProgressMs(timeMs);
  }

  // ==================== Handwritten Notes ====================
  function updateHandwrittenThumbs() {
    if (state.handwrittenNotes.length === 0) {
      elements.handwrittenThumbs.innerHTML = '<p class="ev-empty-state">No notes.</p>';
      return;
    }

    elements.handwrittenThumbs.innerHTML = state.handwrittenNotes.map((note, i) => `
      <div class="ev-thumb-item ${i === 0 ? 'active' : ''}" data-index="${i}">
        <img src="${note.file_url}" alt="${note.title}">
      </div>
    `).join('');

    // Show first page
    showHandwrittenPage(0);

    // Add click handlers
    elements.handwrittenThumbs.querySelectorAll('.ev-thumb-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        showHandwrittenPage(index);
      });
    });

    // Zoom controls
    elements.btnZoomIn.addEventListener('click', () => {
      state.zoomLevel = Math.min(200, state.zoomLevel + 25);
      applyZoom();
    });

    elements.btnZoomOut.addEventListener('click', () => {
      state.zoomLevel = Math.max(50, state.zoomLevel - 25);
      applyZoom();
    });

    elements.btnPrevPage.addEventListener('click', () => {
      if (state.currentHandwrittenIndex > 0) {
        showHandwrittenPage(state.currentHandwrittenIndex - 1);
      }
    });

    elements.btnNextPage.addEventListener('click', () => {
      if (state.currentHandwrittenIndex < state.handwrittenNotes.length - 1) {
        showHandwrittenPage(state.currentHandwrittenIndex + 1);
      }
    });
  }

  function showHandwrittenPage(index) {
    state.currentHandwrittenIndex = index;
    const note = state.handwrittenNotes[index];
    elements.handwrittenImage.src = note.file_url;

    // Update active thumb
    elements.handwrittenThumbs.querySelectorAll('.ev-thumb-item').forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });

    // Update indicator
    elements.pageIndicator.textContent = `${index + 1}/${state.handwrittenNotes.length}`;

    // Reset zoom
    state.zoomLevel = 100;
    applyZoom();
  }

  function applyZoom() {
    elements.handwrittenImage.style.transform = `scale(${state.zoomLevel / 100})`;
    elements.zoomLevel.textContent = `${state.zoomLevel}%`;
  }

  // ==================== Student Actions ====================
  function updateMyNotesList(notes) {
    elements.myNotesList.innerHTML = notes.map(note => `
      <div class="ev-note-item">
        ${note.timestamp_ms ? `<div class="time">${formatTime(note.timestamp_ms)}</div>` : ''}
        <div>${note.note_text}</div>
      </div>
    `).join('');
  }

  function updateDoubtsList(doubts) {
    elements.doubtsList.innerHTML = doubts.map(doubt => `
      <div class="ev-doubt-item">
        <span class="status ${doubt.status}">${doubt.status}</span>
        <div>${doubt.doubt_text}</div>
        ${doubt.timestamp_ms ? `<div class="time">${formatTime(doubt.timestamp_ms)}</div>` : ''}
      </div>
    `).join('');
  }

  // ==================== Progress Tracking ====================
  function startProgressTracking() {
    // Track video progress
    elements.videoPlayer.addEventListener('timeupdate', () => {
      const timeMs = elements.videoPlayer.currentTime * 1000;
      updateProgressMs(timeMs);

      // Check completion (90%)
      if (elements.videoPlayer.duration && elements.videoPlayer.currentTime / elements.videoPlayer.duration >= 0.9) {
        markCompleted();
      }
    });

    // Track audio progress
    elements.audioPlayer.addEventListener('timeupdate', () => {
      const timeMs = elements.audioPlayer.currentTime * 1000;
      updateProgressMs(timeMs);
    });

    // Save progress periodically
    setInterval(saveProgress, 5000);
  }

  function updateProgressMs(timeMs) {
    state.lastWatchedMs = Math.max(state.lastWatchedMs, timeMs);

    // Update UI
    if (state.totalDuration) {
      const percent = Math.round((state.lastWatchedMs / state.totalDuration) * 100);
      elements.progressPercent.textContent = `${percent}%`;
    }

    const date = new Date();
    elements.lastWatched.textContent = `Last watched: ${date.toLocaleTimeString()}`;
  }

  function updateProgressUI(progress) {
    if (progress.completed) {
      markCompleted();
    }
  }

  function markCompleted() {
    state.isCompleted = true;
    elements.completionStatus.classList.add('completed');
    elements.statusText.textContent = 'Completed';
    showToast('🎉 Session completed!', 'success');
  }

  async function saveProgress() {
    if (!state.sessionId || state.lastWatchedMs === 0) return;

    try {
      await ExplainLabAPI.updateProgress(state.sessionId, {
        last_position_ms: state.lastWatchedMs,
        completed: state.isCompleted ? 1 : 0
      });
    } catch(e) {}
  }

  // ==================== Event Listeners ====================
  function setupEventListeners() {
    // Bookmark
    elements.btnBookmark.addEventListener('click', async () => {
      try {
        await ExplainLabAPI.createBookmark(state.sessionId, {
          timestamp_ms: state.lastWatchedMs,
          label: `Bookmark at ${formatTime(state.lastWatchedMs)}`
        });
        showToast('Bookmarked!', 'success');
      } catch(e) {
        showToast('Failed to bookmark', 'error');
      }
    });

    // Add note
    elements.btnAddNote.addEventListener('click', () => {
      document.getElementById('noteTimestamp').value = formatTime(state.lastWatchedMs);
      elements.noteModal.classList.remove('hidden');
    });

    elements.noteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(elements.noteForm);
      const text = formData.get('note_text');
      const timestamp = formData.get('timestamp');

      try {
        await ExplainLabAPI.createStudentNote(state.sessionId, {
          note_text: text,
          timestamp_ms: parseTime(timestamp) || state.lastWatchedMs,
          visibility: 'private'
        });
        showToast('Note saved!', 'success');
        elements.noteModal.classList.add('hidden');
        elements.noteForm.reset();
      } catch(e) {
        showToast('Failed to save note', 'error');
      }
    });

    // Ask doubt
    elements.btnAskDoubt.addEventListener('click', () => {
      document.getElementById('doubtTimestamp').value = formatTime(state.lastWatchedMs);
      elements.doubtModal.classList.remove('hidden');
    });

    elements.doubtForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(elements.doubtForm);
      const text = formData.get('doubt_text');
      const timestamp = formData.get('timestamp');

      try {
        await ExplainLabAPI.createDoubt(state.sessionId, {
          doubt_text: text,
          timestamp_ms: parseTime(timestamp) || state.lastWatchedMs
        });
        showToast('Doubt submitted!', 'success');
        elements.doubtModal.classList.add('hidden');
        elements.doubtForm.reset();
      } catch(e) {
        showToast('Failed to submit doubt', 'error');
      }
    });

    // Copy notes
    elements.btnCopyNotes.addEventListener('click', () => {
      const content = elements.typedNotesContent.innerText;
      navigator.clipboard.writeText(content).then(() => {
        showToast('Notes copied!', 'success');
      }).catch(() => {
        showToast('Failed to copy', 'error');
      });
    });

    // Download notes
    elements.btnDownloadNotes.addEventListener('click', () => {
      showToast('PDF download not yet implemented', 'info');
    });

    // AI Summary
    elements.btnGenerateSummary.addEventListener('click', async () => {
      showToast('Generating AI summary...', 'info');
      try {
        const result = await ExplainLabAPI.aiSummary(state.sessionId);
        if (result.ok) {
          elements.aiSummary.innerHTML = `<p>${result.summary}</p>`;
        } else {
          elements.aiSummary.innerHTML = '<p class="ev-empty-state">Failed to generate summary.</p>';
        }
      } catch(e) {
        elements.aiSummary.innerHTML = '<p class="ev-empty-state">AI not available.</p>';
      }
    });
  }

  function parseTime(str) {
    if (!str) return 0;
    const parts = str.split(':');
    if (parts.length === 2) {
      return (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 1000;
    }
    return parseInt(str) * 1000;
  }

  // ==================== Start ====================
  document.addEventListener('DOMContentLoaded', init);
})();