/* ===== API Client ===== */
const API = {
  base: '',

  async _fetch(url, opts = {}) {
    const res = await fetch(this.base + url, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    });
    return res.json();
  },

  // Sync
  sync(platform = 'all') { return this._fetch('/api/sync', { method: 'POST', body: JSON.stringify({ platform }) }); },
  syncSolved() { return this._fetch('/api/sync-solved', { method: 'POST' }); },

  // Problems
  getProblems(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/api/problems?${qs}`);
  },
  getProblem(id) { return this._fetch(`/api/problems/${id}`); },

  // Tags
  getTags() { return this._fetch('/api/tags'); },

  // Testcases
  addTestcase(data) { return this._fetch('/api/testcases', { method: 'POST', body: JSON.stringify(data) }); },
  updateTestcase(id, data) { return this._fetch(`/api/testcases/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteTestcase(id) { return this._fetch(`/api/testcases/${id}`, { method: 'DELETE' }); },

  // Judge
  judge(data) { return this._fetch('/api/judge', { method: 'POST', body: JSON.stringify(data) }); },
  run(code, input, language) { return this._fetch('/api/run', { method: 'POST', body: JSON.stringify({ code, input, language }) }); },
  getLanguages() { return this._fetch('/api/languages'); },

  // Stats
  getStats(username) { 
    const params = username ? `?username=${encodeURIComponent(username)}` : '';
    return this._fetch(`/api/stats${params}`); 
  },
  getPerformance() { return this._fetch('/api/performance'); },
  getScrapeStats() { return this._fetch('/api/scrape-stats'); },
  getDateActivity(date) { return this._fetch(`/api/activity/${encodeURIComponent(date)}`); },

  // Roadmap / Nexus
  getRoadmap() { return this._fetch('/api/roadmap'); },
  getNexus() { return this._fetch('/api/nexus'); },
  getLevelRoadmap() { return this._fetch('/api/level-roadmap'); },

  // Contests
  getContests() { return this._fetch('/api/contests'); },

  // Settings
  getSettings() { return this._fetch('/api/settings'); },
  saveSettings(data) { return this._fetch('/api/settings', { method: 'POST', body: JSON.stringify(data) }); },

  // Problem Statement (scraper)
  getStatement(id) { return this._fetch(`/api/problem-statement/${id}`); },
  translate(html, targetLang) { return this._fetch('/api/translate', { method: 'POST', body: JSON.stringify({ html, targetLang }) }); },

  // AI Battle
  startAiBattle(problem_id) { return this._fetch('/api/ai-battle/start', { method: 'POST', body: JSON.stringify({ problem_id }) }); },
  completeAiBattle(battleId, playerTimeMs, won) { return this._fetch('/api/ai-battle/complete', { method: 'POST', body: JSON.stringify({ battleId, playerTimeMs, won }) }); },
  getAiBattles(problemId) { return this._fetch(`/api/ai-battles/${problemId}`); },

  // Decomposition
  getDecomposition(problemId) { return this._fetch(`/api/decomposition/${problemId}`); },
  saveDecomposition(data) { return this._fetch('/api/decomposition', { method: 'POST', body: JSON.stringify(data) }); },

  // Code Replay
  saveCodeReplay(data) { return this._fetch('/api/code-replay', { method: 'POST', body: JSON.stringify(data) }); },
  getCodeReplay(submissionId) { return this._fetch(`/api/code-replay/${submissionId}`); },

  // Weakness Analysis
  getWeaknessAnalysis() { return this._fetch('/api/weakness-analysis'); },

  // Custom Problems
  getCustomProblems() { return this._fetch('/api/custom-problems'); },
  getCustomProblem(id) { return this._fetch(`/api/custom-problems/${id}`); },
  createCustomProblem(data) { return this._fetch('/api/custom-problems', { method: 'POST', body: JSON.stringify(data) }); },
  updateCustomProblem(id, data) { return this._fetch(`/api/custom-problems/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteCustomProblem(id) { return this._fetch(`/api/custom-problems/${id}`, { method: 'DELETE' }); },

  // Skill Tree
  getSkillTree() { return this._fetch('/api/skill-tree'); },
  getSkillNodeProblems(nodeId) { return this._fetch(`/api/skill-tree/${nodeId}/problems`); },

  // AI Chat
  aiChat(statement, question, history) { return this._fetch('/api/ai-chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ statement, question, history }) }); },

  // AI Code Helper
  aiComplete(prefix, suffix, language) { return this._fetch('/api/ai-complete', { method: 'POST', body: JSON.stringify({ prefix, suffix, language }) }); },
  aiFix(code, language, error) { return this._fetch('/api/ai-fix', { method: 'POST', body: JSON.stringify({ code, language, error }) }); },

  // Social: User
  registerUser(data) { return this._fetch('/api/user/register', { method: 'POST', body: JSON.stringify(data) }); },
  loginUser(data) { return this._fetch('/api/user/login', { method: 'POST', body: JSON.stringify(data) }); },
  updateProfile(data) { return this._fetch('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) }); },
  uploadAvatar(data) { return this._fetch('/api/user/avatar', { method: 'POST', body: JSON.stringify(data) }); },
  getUserProfile(username, viewer) { return this._fetch(`/api/user/profile/${encodeURIComponent(username)}${viewer ? '?viewer=' + encodeURIComponent(viewer) : ''}`); },
  searchUsers(q) { return this._fetch(`/api/user/search?q=${encodeURIComponent(q)}`); },
  checkUsername(username) { return this._fetch(`/api/user/check-username?username=${encodeURIComponent(username)}`); },

  // Auth
  getAuthStatus() { return this._fetch('/api/auth/status'); },
  getAuthProviders() { return this._fetch('/api/auth/providers'); },
  authLogout() { return this._fetch('/api/auth/logout', { method: 'POST' }); },

  // Social: Friends
  getFriends(username) { return this._fetch(`/api/friends/${encodeURIComponent(username)}`); },
  getFriendRequests(username) { return this._fetch(`/api/friends/${encodeURIComponent(username)}/requests`); },
  sendFriendRequest(from, to) { return this._fetch('/api/friends/request', { method: 'POST', body: JSON.stringify({ from, to }) }); },
  acceptFriendRequest(id) { return this._fetch('/api/friends/accept', { method: 'POST', body: JSON.stringify({ id }) }); },
  rejectFriendRequest(id) { return this._fetch('/api/friends/reject', { method: 'POST', body: JSON.stringify({ id }) }); },
  removeFriend(id) { return this._fetch(`/api/friends/${id}`, { method: 'DELETE' }); },

  // Social: Messages
  getMessages(user1, user2) { return this._fetch(`/api/messages/${encodeURIComponent(user1)}/${encodeURIComponent(user2)}`); },
  sendMessage(from, to, content) { return this._fetch('/api/messages', { method: 'POST', body: JSON.stringify({ from, to, content }) }); },
  getUnreadMessages(username) { return this._fetch(`/api/messages/unread/${encodeURIComponent(username)}`); },

  // Social: Rooms
  getRooms() { return this._fetch('/api/rooms'); },
  createRoom(data) { return this._fetch('/api/rooms', { method: 'POST', body: JSON.stringify(data) }); },
  getRoom(id) { return this._fetch(`/api/rooms/${id}`); },
  deleteRoom(id) { return this._fetch(`/api/rooms/${id}`, { method: 'DELETE' }); },
  getRoomMessages(id) { return this._fetch(`/api/rooms/${id}/messages`); },

  // Social: Feed
  getFeed(username) { return this._fetch(`/api/feed/${encodeURIComponent(username)}`); },

  // Leaderboard
  getLeaderboard(type, limit) { return this._fetch(`/api/leaderboard?type=${type||'xp'}&limit=${limit||25}`); },

  // Workshop Stats
  getWorkshopStats(username) { return this._fetch(`/api/workshop/stats?username=${encodeURIComponent(username)}`); },

  // Message Reactions
  reactToMessage(msgId, username, emoji) { return this._fetch(`/api/messages/${msgId}/react`, { method: 'POST', body: JSON.stringify({ username, emoji }) }); },
  getMessageReactions(msgId) { return this._fetch(`/api/messages/${msgId}/reactions`); },

  // AI Lab
  getAiProblems(category) { return this._fetch(`/api/ai-problems?category=${encodeURIComponent(category || 'all')}`); },
  getAiProblem(id) { return this._fetch(`/api/ai-problems/${id}`); },
  updateAiProgress(id, data) { return this._fetch(`/api/ai-problems/${id}/progress`, { method: 'POST', body: JSON.stringify(data) }); },
  getAiStats() { return this._fetch('/api/ai-stats'); },

  // Tutorials
  getTutorials(category) { return this._fetch(`/api/tutorials?category=${encodeURIComponent(category || 'all')}`); },
  getTutorial(id) { return this._fetch(`/api/tutorials/${id}`); },
  completeTutorial(id) { return this._fetch(`/api/tutorials/${id}/complete`, { method: 'POST' }); },
  getTutorialStats() { return this._fetch('/api/tutorial-stats'); },
  getTutorialProblems(topic) { return this._fetch(`/api/tutorial-problems/${encodeURIComponent(topic)}`); },

  // Forge (Dev Roadmap)
  getForgePaths() { return this._fetch('/api/forge/paths'); },
  getForgePath(id) { return this._fetch(`/api/forge/path/${encodeURIComponent(id)}`); },
  setForgeTopicStatus(topicId, status, pathId) { return this._fetch(`/api/forge/topic/${encodeURIComponent(topicId)}/status`, { method: 'POST', body: JSON.stringify({ status, pathId }) }); },
  getForgeStats() { return this._fetch('/api/forge/stats'); },

  // Dashboard Layout
  getDashboardLayout() { return this._fetch('/api/dashboard-layout'); },
  saveDashboardLayout(layout) { return this._fetch('/api/dashboard-layout', { method: 'POST', body: JSON.stringify({ layout }) }); },

  // Contests & Quizzes
  createContest(data) { return this._fetch('/api/contests/create', { method: 'POST', body: JSON.stringify(data) }); },
  getMyContests(username) { return this._fetch(`/api/contests/mine?username=${encodeURIComponent(username)}`); },
  joinContest(username, contest_code, password) { return this._fetch('/api/contests/join', { method: 'POST', body: JSON.stringify({ username, contest_code, password }) }); },
  getContestDetails(id, username) { return this._fetch(`/api/contests/${id}?username=${encodeURIComponent(username || '')}`); },
  deleteContest(id, username) { return this._fetch(`/api/contests/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) }); },
};
