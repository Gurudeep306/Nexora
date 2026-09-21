/**
 * ExplainLab API Client
 * Handles all communication with the ExplainLab backend
 */

const ExplainLabAPI = {
  // ==================== Sessions ====================

  async createSession(data) {
    const res = await fetch('/api/explainlab/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getSession(id) {
    const res = await fetch(`/api/explainlab/sessions/${id}`);
    return res.json();
  },

  async getSessions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, v);
    });
    const res = await fetch(`/api/explainlab/sessions?${params}`);
    return res.json();
  },

  async updateSession(id, data) {
    const res = await fetch(`/api/explainlab/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async publishSession(id) {
    const res = await fetch(`/api/explainlab/sessions/${id}/publish`, {
      method: 'POST'
    });
    return res.json();
  },

  async deleteSession(id) {
    const res = await fetch(`/api/explainlab/sessions/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // ==================== Typed Notes ====================

  async getTypedNotes(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/typed-notes`);
    return res.json();
  },

  async saveTypedNotes(sessionId, html) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/typed-notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html })
    });
    return res.json();
  },

  // ==================== Full Explanation ====================

  async getFullExplanation(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/full-explanation`);
    return res.json();
  },

  async saveFullExplanation(sessionId, html) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/full-explanation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html })
    });
    return res.json();
  },

  // ==================== Pages ====================

  async getPages(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/pages`);
    return res.json();
  },

  async createPage(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updatePage(pageId, data) {
    const res = await fetch(`/api/explainlab/pages/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deletePage(pageId) {
    const res = await fetch(`/api/explainlab/pages/${pageId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // ==================== Events (Whiteboard Recording) ====================

  async createEvent(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async createEventsBulk(sessionId, events) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/events/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    });
    return res.json();
  },

  async getEvents(sessionId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/events?${query}`);
    return res.json();
  },

  // ==================== Code Events ====================

  async createCodeEvent(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/code-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getCodeEvents(sessionId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/code-events?${query}`);
    return res.json();
  },

  // ==================== Handwritten Notes ====================

  async getHandwrittenNotes(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/handwritten-notes`);
    return res.json();
  },

  async createHandwrittenNote(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/handwritten-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteHandwrittenNote(noteId) {
    const res = await fetch(`/api/explainlab/handwritten-notes/${noteId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // ==================== Markers ====================

  async getMarkers(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/markers`);
    return res.json();
  },

  async createMarker(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/markers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteMarker(markerId) {
    const res = await fetch(`/api/explainlab/markers/${markerId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // ==================== Clips ====================

  async getClips(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/clips`);
    return res.json();
  },

  async createClip(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteClip(clipId) {
    const res = await fetch(`/api/explainlab/clips/${clipId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // ==================== Student Notes ====================

  async getStudentNotes(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/notes`);
    return res.json();
  },

  async createStudentNote(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteStudentNote(noteId) {
    const res = await fetch(`/api/explainlab/notes/${noteId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // ==================== Bookmarks ====================

  async getBookmarks(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/bookmarks`);
    return res.json();
  },

  async createBookmark(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteBookmark(bookmarkId) {
    const res = await fetch(`/api/explainlab/bookmarks/${bookmarkId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // ==================== Doubts ====================

  async getDoubts(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/doubts`);
    return res.json();
  },

  async createDoubt(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/doubts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async replyToDoubt(doubtId, data) {
    const res = await fetch(`/api/explainlab/doubts/${doubtId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async resolveDoubt(doubtId) {
    const res = await fetch(`/api/explainlab/doubts/${doubtId}/resolve`, {
      method: 'PUT'
    });
    return res.json();
  },

  // ==================== Progress ====================

  async getProgress(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/progress`);
    return res.json();
  },

  async updateProgress(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ==================== Analytics ====================

  async getAnalytics(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/analytics`);
    return res.json();
  },

  async logAnalytics(sessionId, data) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ==================== AI Assistant ====================

  async aiSummary(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/ai/summary`, {
      method: 'POST'
    });
    return res.json();
  },

  async aiNotes(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/ai/notes`, {
      method: 'POST'
    });
    return res.json();
  },

  async aiFullExplanation(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/ai/full-explanation`, {
      method: 'POST'
    });
    return res.json();
  },

  async aiQuiz(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/ai/quiz`, {
      method: 'POST'
    });
    return res.json();
  },

  async aiFlashcards(sessionId) {
    const res = await fetch(`/api/explainlab/sessions/${sessionId}/ai/flashcards`, {
      method: 'POST'
    });
    return res.json();
  },

  // ==================== Teacher Dashboard ====================

  async getTeacherSessions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, v);
    });
    const res = await fetch(`/api/explainlab/teacher/sessions?${params}`);
    return res.json();
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExplainLabAPI;
}