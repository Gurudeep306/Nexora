/**
 * ExplainLab Main Application
 * Orchestrates all components and handles UI interactions
 */

(function() {
  'use strict';

  // ==================== State ====================
  let state = {
    sessionId: null,
    session: null,
    whiteboard: null,
    isRecording: false,
    recordingStartTime: null,
    recordingTimer: null,
    currentPage: 0,
    pages: [0],
    markers: [],
    isModalOpen: true
  };

  // ==================== DOM Elements ====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const elements = {
    // Toolbar
    sessionTitle: $('#sessionTitle'),
    sessionLevel: $('#sessionLevel'),
    recordingIndicator: $('#recordingIndicator'),
    recordingTimer: $('#recordingTimer'),
    btnSaveDraft: $('#btnSaveDraft'),
    btnPublish: $('#btnPublish'),

    // Tools
    toolButtons: $$('[data-tool]'),
    colorPicker: $('#colorPicker'),
    colorDots: $$('[data-color]'),
    brushSize: $('#brushSize'),
    brushSizeValue: $('#brushSizeValue'),
    btnUndo: $('#btnUndo'),
    btnRedo: $('#btnRedo'),
    btnClearPage: $('#btnClearPage'),

    // Canvas
    canvas: $('#whiteboardCanvas'),
    pageTabs: $('#pageTabs'),
    btnAddPage: $('#btnAddPage'),
    bgSelect: $('#bgSelect'),

    // Panels
    panelTabs: $$('[data-tab]'),
    panelContents: $$('.el-panel-content'),

    // Typed Notes
    typedEditor: $('#typedEditor'),
    btnSaveTypedNotes: $('#btnSaveTypedNotes'),

    // Explanation
    explanationEditor: $('#explanationEditor'),
    btnSaveExplanation: $('#btnSaveExplanation'),

    // Handwritten
    handwrittenList: $('#handwrittenList'),
    btnSaveCurrentPage: $('#btnSaveCurrentPage'),
    btnUploadHandwritten: $('#btnUploadHandwritten'),

    // Markers
    markersList: $('#markersList'),
    btnAddMarker: $('#btnAddMarker'),

    // Recording
    btnRecord: $('#btnRecord'),
    btnPauseRecord: $('#btnPauseRecord'),
    btnStopRecord: $('#btnStopRecord'),
    recordingStatus: $('#recordingStatus'),
    timeline: $('#timeline'),
    timelineProgress: $('#timelineProgress'),
    timelineMarkers: $('#timelineMarkers'),

    // Modal
    setupModal: $('#setupModal'),
    setupForm: $('#setupForm'),

    // Toast
    toastContainer: $('#toastContainer')
  };

  // ==================== Toast Notifications ====================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `el-toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
      <span>${message}</span>
    `;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==================== Initialize ====================
  async function init() {
    // Check if we're creating a new session or editing existing
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    if (sessionId) {
      // Load existing session
      await loadSession(sessionId);
    } else {
      // Show setup modal
      elements.setupModal.classList.remove('hidden');
    }

    // Initialize whiteboard
    state.whiteboard = new WhiteboardEngine(elements.canvas);

    // Setup event listeners
    setupEventListeners();

    // Setup panel tabs
    setupPanelTabs();

    // Setup tool buttons
    setupTools();

    // Setup editor toolbars
    setupEditorToolbars();
  }

  // ==================== Session Management ====================
  async function loadSession(sessionId) {
    try {
      const result = await ExplainLabAPI.getSession(sessionId);
      if (!result.ok) throw new Error(result.error);

      state.session = result.session;
      state.sessionId = sessionId;

      // Populate UI
      elements.sessionTitle.value = state.session.title || '';
      elements.sessionLevel.value = state.session.level || 'beginner';

      // Load typed notes
      if (state.session.typed_notes_html) {
        elements.typedEditor.innerHTML = state.session.typed_notes_html;
      }

      // Load full explanation
      if (state.session.full_explanation_html) {
        elements.explanationEditor.innerHTML = state.session.full_explanation_html;
      }

      // Load pages
      if (state.session.pages) {
        state.pages = state.session.pages.map(p => p.id);
        updatePageTabs();
      }

      // Load markers
      if (state.session.markers) {
        state.markers = state.session.markers;
        updateMarkersList();
      }

      // Hide modal
      elements.setupModal.classList.add('hidden');

      showToast('Session loaded successfully', 'success');
    } catch (e) {
      showToast('Failed to load session: ' + e.message, 'error');
    }
  }

  async function createSession(data) {
    try {
      const result = await ExplainLabAPI.createSession(data);
      if (!result.ok) throw new Error(result.error);

      state.session = result.session;
      state.sessionId = result.session.id;

      // Update URL
      const newUrl = `${window.location.pathname}?id=${state.sessionId}`;
      window.history.replaceState({}, '', newUrl);

      // Hide modal
      elements.setupModal.classList.add('hidden');

      showToast('Session created successfully', 'success');
    } catch (e) {
      showToast('Failed to create session: ' + e.message, 'error');
    }
  }

  async function saveSession() {
    if (!state.sessionId) return;

    try {
      await ExplainLabAPI.updateSession(state.sessionId, {
        title: elements.sessionTitle.value,
        level: elements.sessionLevel.value,
        status: 'draft'
      });

      showToast('Session saved', 'success');
    } catch (e) {
      showToast('Failed to save: ' + e.message, 'error');
    }
  }

  async function publishSession() {
    if (!state.sessionId) return;

    // Save all content first
    await saveTypedNotes();
    await saveExplanation();
    await saveSession();

    try {
      const result = await ExplainLabAPI.publishSession(state.sessionId);
      if (!result.ok) throw new Error(result.error);

      showToast('Session published! Students can now view it.', 'success');

      // Update recording indicator
      elements.recordingIndicator.style.display = 'none';
    } catch (e) {
      showToast('Failed to publish: ' + e.message, 'error');
    }
  }

  // ==================== Recording ====================
  function startRecording() {
    state.isRecording = true;
    state.recordingStartTime = Date.now();
    state.whiteboard.startRecording();

    // Update UI
    elements.recordingIndicator.style.display = 'flex';
    elements.btnRecord.classList.add('hidden');
    elements.btnPauseRecord.classList.remove('hidden');
    elements.btnStopRecord.classList.remove('hidden');
    elements.recordingStatus.textContent = 'Recording...';

    // Start timer
    state.recordingTimer = setInterval(updateTimer, 1000);

    showToast('Recording started', 'info');
  }

  function stopRecording() {
    state.isRecording = false;
    const events = state.whiteboard.stopRecording();

    // Update UI
    elements.recordingIndicator.style.display = 'none';
    elements.btnRecord.classList.remove('hidden');
    elements.btnPauseRecord.classList.add('hidden');
    elements.btnStopRecord.classList.add('hidden');
    elements.recordingStatus.textContent = 'Not recording';

    // Stop timer
    clearInterval(state.recordingTimer);
    elements.recordingTimer.textContent = '00:00';

    // Save events to server
    if (events.length > 0 && state.sessionId) {
      saveEvents(events);
    }

    showToast('Recording stopped', 'info');
  }

  function updateTimer() {
    const elapsed = Date.now() - state.recordingStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    elements.recordingTimer.textContent =
      `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async function saveEvents(events) {
    if (!state.sessionId || events.length === 0) return;

    try {
      // Send events in batches
      const BATCH_SIZE = 50;
      for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        const formattedBatch = batch.map(e => ({
          page_id: e.page,
          timestamp_ms: e.timestamp_ms,
          event_type: e.event_type,
          payload_json: e.payload
        }));
        await ExplainLabAPI.createEventsBulk(state.sessionId, formattedBatch);
      }
      console.log(`Saved ${events.length} events`);
    } catch (e) {
      console.error('Failed to save events:', e.message);
    }
  }

  // ==================== Tools ====================
  function setupTools() {
    // Tool buttons
    elements.toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        setActiveTool(tool);
      });
    });

    // Color picker
    elements.colorPicker.addEventListener('input', (e) => {
      state.whiteboard.setColor(e.target.value);
      elements.colorDots.forEach(d => d.classList.remove('active'));
    });

    // Color presets
    elements.colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const color = dot.dataset.color;
        state.whiteboard.setColor(color);
        elements.colorPicker.value = color;
        elements.colorDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });
    });

    // Brush size
    elements.brushSize.addEventListener('input', (e) => {
      state.whiteboard.setBrushSize(parseInt(e.target.value));
      elements.brushSizeValue.textContent = e.target.value;
    });

    // Undo/Redo
    elements.btnUndo.addEventListener('click', () => state.whiteboard.undo());
    elements.btnRedo.addEventListener('click', () => state.whiteboard.redo());

    // Clear page
    elements.btnClearPage.addEventListener('click', () => {
      if (confirm('Clear current page?')) {
        state.whiteboard.clearPage();
      }
    });

    // Background
    elements.bgSelect.addEventListener('change', (e) => {
      state.whiteboard.setBackground(e.target.value);
    });

    // Add page
    elements.btnAddPage.addEventListener('click', () => {
      const newIndex = state.whiteboard.addPage();
      state.pages.push(newIndex);
      updatePageTabs();
    });
  }

  function setActiveTool(tool) {
    state.whiteboard.setTool(tool);
    elements.toolButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  // ==================== Pages ====================
  function updatePageTabs() {
    // Remove old tabs (except add button)
    const oldTabs = elements.pageTabs.querySelectorAll('.el-page-tab:not(.el-add-page)');
    oldTabs.forEach(t => t.remove());

    // Add new tabs
    state.pages.forEach((pageId, index) => {
      const tab = document.createElement('button');
      tab.className = `el-page-tab ${index === state.whiteboard.currentPage ? 'active' : ''}`;
      tab.dataset.page = index;
      tab.textContent = `Page ${index + 1}`;
      tab.addEventListener('click', () => switchPage(index));
      elements.pageTabs.insertBefore(tab, elements.btnAddPage);
    });
  }

  function switchPage(index) {
    state.whiteboard.switchPage(index);
    state.currentPage = index;
    updatePageTabs();
  }

  // ==================== Panel Tabs ====================
  function setupPanelTabs() {
    elements.panelTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Update active tab
        elements.panelTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show corresponding content
        elements.panelContents.forEach(content => {
          content.classList.toggle('hidden', content.id !== `panel${capitalize(tabName)}`);
        });
      });
    });
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ==================== Editor Toolbars ====================
  function setupEditorToolbars() {
    // Typed notes toolbar
    $$('#panelTyped .el-editor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        const value = btn.dataset.value || null;
        document.execCommand(cmd, false, value);
        elements.typedEditor.focus();
      });
    });

    // Explanation toolbar
    $$('#panelExplanation .el-editor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        const value = btn.dataset.value || null;
        document.execCommand(cmd, false, value);
        elements.explanationEditor.focus();
      });
    });

    // Save buttons
    elements.btnSaveTypedNotes.addEventListener('click', saveTypedNotes);
    elements.btnSaveExplanation.addEventListener('click', saveExplanation);

    // Handwritten notes
    elements.btnSaveCurrentPage.addEventListener('click', saveCurrentPageAsHandwritten);
    elements.btnUploadHandwritten.addEventListener('change', handleHandwrittenUpload);

    // Markers
    elements.btnAddMarker.addEventListener('click', addMarker);
  }

  async function saveTypedNotes() {
    if (!state.sessionId) {
      showToast('Please create a session first', 'error');
      return;
    }

    try {
      const html = elements.typedEditor.innerHTML;
      await ExplainLabAPI.saveTypedNotes(state.sessionId, html);
      showToast('Typed notes saved', 'success');
    } catch (e) {
      showToast('Failed to save notes: ' + e.message, 'error');
    }
  }

  async function saveExplanation() {
    if (!state.sessionId) {
      showToast('Please create a session first', 'error');
      return;
    }

    try {
      const html = elements.explanationEditor.innerHTML;
      await ExplainLabAPI.saveFullExplanation(state.sessionId, html);
      showToast('Explanation saved', 'success');
    } catch (e) {
      showToast('Failed to save explanation: ' + e.message, 'error');
    }
  }

  async function saveCurrentPageAsHandwritten() {
    if (!state.sessionId) {
      showToast('Please create a session first', 'error');
      return;
    }

    try {
      // Get canvas as image
      const dataUrl = state.whiteboard.toDataURL();

      // Upload via studio upload (reuse existing system)
      const response = await fetch('/api/studio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'explainlab-handwritten',
          sessionId: state.sessionId,
          data: dataUrl
        })
      });

      const result = await response.json();
      if (result.ok) {
        await ExplainLabAPI.createHandwrittenNote(state.sessionId, {
          title: `Page ${state.currentPage + 1}`,
          file_url: result.url,
          file_type: 'image',
          source_type: 'whiteboard'
        });

        showToast('Page saved as handwritten note', 'success');
        loadHandwrittenNotes();
      }
    } catch (e) {
      showToast('Failed to save: ' + e.message, 'error');
    }
  }

  async function handleHandwrittenUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!state.sessionId) {
      showToast('Please create a session first', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'explainlab-handwritten');
      formData.append('sessionId', state.sessionId);

      const response = await fetch('/api/studio/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.ok) {
        await ExplainLabAPI.createHandwrittenNote(state.sessionId, {
          title: file.name,
          file_url: result.url,
          file_type: file.type.startsWith('application/pdf') ? 'pdf' : 'image',
          source_type: 'upload'
        });

        showToast('Handwritten note uploaded', 'success');
        loadHandwrittenNotes();
      }
    } catch (e) {
      showToast('Failed to upload: ' + e.message, 'error');
    }

    e.target.value = '';
  }

  async function loadHandwrittenNotes() {
    if (!state.sessionId) return;

    try {
      const result = await ExplainLabAPI.getHandwrittenNotes(state.sessionId);
      if (result.ok && result.notes.length > 0) {
        elements.handwrittenList.innerHTML = result.notes.map(note => `
          <div class="el-handwritten-item" data-id="${note.id}">
            <img src="${note.file_url}" class="el-handwritten-thumb" alt="${note.title}">
            <div class="el-handwritten-info">
              <div class="title">${note.title}</div>
              <div class="meta">${note.file_type} • ${note.source_type}</div>
            </div>
          </div>
        `).join('');
      } else {
        elements.handwrittenList.innerHTML = '<p class="el-empty-state">No handwritten notes yet.</p>';
      }
    } catch (e) {
      console.error('Failed to load handwritten notes:', e.message);
    }
  }

  async function addMarker() {
    if (!state.sessionId) {
      showToast('Please create a session first', 'error');
      return;
    }

    const title = prompt('Marker title:');
    if (!title) return;

    const elapsed = Date.now() - state.recordingStartTime;

    try {
      const result = await ExplainLabAPI.createMarker(state.sessionId, {
        timestamp_ms: elapsed,
        title,
        marker_type: 'chapter'
      });

      if (result.ok) {
        state.markers.push({
          id: result.markerId,
          timestamp_ms: elapsed,
          title,
          marker_type: 'chapter'
        });
        updateMarkersList();
        updateTimelineMarkers();
        showToast('Marker added', 'success');
      }
    } catch (e) {
      showToast('Failed to add marker: ' + e.message, 'error');
    }
  }

  function updateMarkersList() {
    if (state.markers.length === 0) {
      elements.markersList.innerHTML = '<p class="el-empty-state">No markers yet.</p>';
      return;
    }

    elements.markersList.innerHTML = state.markers.map(marker => {
      const time = formatTime(marker.timestamp_ms);
      return `
        <div class="el-marker-item" data-id="${marker.id}">
          <span class="el-marker-time">${time}</span>
          <span class="el-marker-title">${marker.title}</span>
          <span class="el-marker-type ${marker.marker_type}">${marker.marker_type}</span>
        </div>
      `;
    }).join('');
  }

  function updateTimelineMarkers() {
    elements.timelineMarkers.innerHTML = state.markers.map(marker => {
      const position = (marker.timestamp_ms / (Date.now() - state.recordingStartTime)) * 100;
      return `<div class="el-timeline-marker" style="left:${position}%"></div>`;
    }).join('');
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // ==================== Event Listeners ====================
  function setupEventListeners() {
    // Setup form
    elements.setupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(elements.setupForm);
      const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        explanation_type: formData.get('explanation_type'),
        level: formData.get('level'),
        problem_id: formData.get('problem_id') || null
      };
      createSession(data);
    });

    // Save/Publish
    elements.btnSaveDraft.addEventListener('click', saveSession);
    elements.btnPublish.addEventListener('click', publishSession);

    // Recording
    elements.btnRecord.addEventListener('click', startRecording);
    elements.btnPauseRecord.addEventListener('click', () => {
      showToast('Pause not yet implemented', 'info');
    });
    elements.btnStopRecord.addEventListener('click', stopRecording);

    // Timeline click
    elements.timeline.addEventListener('click', (e) => {
      const rect = elements.timeline.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      // Seek to position (for replay)
      showToast('Seek to ' + Math.round(percent * 100) + '%', 'info');
    });
  }

  // ==================== Start ====================
  document.addEventListener('DOMContentLoaded', init);
})();